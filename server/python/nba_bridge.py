"""
NBA data service built on nba_api (https://github.com/swar/nba_api).

The Node server starts this as a child process and talks to it over stdin/stdout,
one JSON object per line:
  request:  {"id": 1, "method": "player_profile", "params": {"player_id": 201939}}
  response: {"id": 1, "ok": true, "data": {...}, "stale": false}

This is the only code that contacts NBA.com. It:
  - throttles requests (one at a time, with a pause between them) to avoid being blocked
  - caches responses in memory and on disk (server/.cache/nba), with a lifetime per data type
  - retries failed requests, then falls back to the last cached copy if there is one
"""
import hashlib
import json
import math
import os
import random
import sys
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo

from nba_api.stats.static import players as static_players
from nba_api.stats.static import teams as static_teams
from nba_api.stats import endpoints as ep
from nba_api.live.nba.endpoints import scoreboard as live_scoreboard

# ---------------------------------------------------------------------------
# Config

CACHE_DIR = os.environ.get('NBA_CACHE_DIR') or os.path.join(os.path.dirname(__file__), '..', '.cache', 'nba')
REQUEST_TIMEOUT = float(os.environ.get('NBA_REQUEST_TIMEOUT', 30))  # seconds per NBA.com request
MIN_INTERVAL = 0.8            # minimum seconds between NBA.com requests
JITTER = 0.4                  # extra random delay, so requests aren't perfectly regular
RETRY_DELAYS = [2, 5]         # waits before retry attempts
OUTAGE_COOLDOWN = 60          # after NBA.com fails, treat it as down for this many seconds

MIN, HOUR, DAY = 60, 3600, 86400
ET = ZoneInfo('America/New_York')

os.makedirs(CACHE_DIR, exist_ok=True)


def log(*args):
    print('[nba_bridge]', *args, file=sys.stderr, flush=True)


class BridgeError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------------------
# Seasons

def current_season_year(now=None):
    """NBA seasons are named by their start year: Oct 2026 - Jun 2027 is 2026."""
    now = now or datetime.now(ET)
    return now.year if now.month >= 9 else now.year - 1


def season_str(year):
    """2026 -> '2026-27'"""
    year = int(year)
    return f"{year}-{str(year + 1)[-2:]}"


def parse_season(value):
    if value in (None, ''):
        return current_season_year()
    try:
        year = int(str(value)[:4])
    except ValueError:
        raise BridgeError(400, 'Invalid season.')
    if year < 1996 or year > current_season_year():
        # NBA.com's detailed stats start in 1996-97.
        raise BridgeError(400, 'Detailed stats are available from the 1996-97 season onward.')
    return year


def is_current(year):
    return int(year) == current_season_year()


# ---------------------------------------------------------------------------
# JSON helpers

def clean(v):
    """Make pandas/numpy values JSON safe (NaN -> None, numpy -> python)."""
    if v is None:
        return None
    if hasattr(v, 'item'):
        v = v.item()
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def records(df):
    return [{k: clean(v) for k, v in row.items()} for row in df.to_dict('records')]


def num(v, default=0.0):
    v = clean(v)
    return default if v is None else v


def ratio(a, b, digits=3):
    return round(a / b, digits) if b else None


def pct100(v):
    """NBA.com sends turnover % on a 0-100 scale while other percentages are 0-1."""
    v = clean(v)
    return round(v / 100, 4) if v is not None else None


def per_game(total, gp, digits=1):
    return round(total / gp, digits) if gp else None


def ts_pct(pts, fga, fta):
    denom = 2 * (fga + 0.44 * fta)
    return round(pts / denom, 3) if denom else None


def logo_url(team_id):
    return f"https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg" if team_id else None


def headshot_url(player_id):
    return f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"


# ---------------------------------------------------------------------------
# Throttled, cached NBA.com access

_throttle_lock = threading.Lock()
_last_request_at = 0.0
_mem_cache = {}
_key_locks = {}
_key_locks_guard = threading.Lock()


def _throttled(fn):
    """Run fn() so that NBA.com requests happen one at a time with a gap between them."""
    global _last_request_at
    with _throttle_lock:
        wait = _last_request_at + MIN_INTERVAL + random.uniform(0, JITTER) - time.time()
        if wait > 0:
            time.sleep(wait)
        try:
            return fn()
        finally:
            _last_request_at = time.time()


def _cache_path(key):
    return os.path.join(CACHE_DIR, hashlib.sha1(key.encode()).hexdigest() + '.json')


def _read_cache(key):
    if key in _mem_cache:
        return _mem_cache[key]
    try:
        with open(_cache_path(key)) as f:
            entry = json.load(f)
        _mem_cache[key] = entry
        return entry
    except (OSError, ValueError):
        return None


def _write_cache(key, data):
    entry = {'saved_at': time.time(), 'data': data}
    _mem_cache[key] = entry
    tmp = _cache_path(key) + '.tmp'
    try:
        with open(tmp, 'w') as f:
            json.dump(entry, f)
        os.replace(tmp, _cache_path(key))
    except OSError as e:
        log('cache write failed', e)


# Set per request so the response can say whether stale data was used.
_ctx = threading.local()

# Circuit breaker: while NBA.com looks down, serve cached copies right away instead of
# retrying every request, and try uncached requests only once.
_outage_until = 0.0


def fetch(key, ttl, fn, missing_status=502, missing_message='NBA.com returned no data for this request.'):
    """Return cached data for `key` if fresh, otherwise call fn() (throttled, with retries).
    If NBA.com fails, fall back to an expired cached copy and mark the response stale.
    A reply without the expected data (KeyError/IndexError, e.g. an unknown player id) is not
    retried; it becomes `missing_status` (404 for lookups by id)."""
    with _key_locks_guard:
        lock = _key_locks.setdefault(key, threading.Lock())
    global _outage_until
    with lock:  # concurrent callers for the same key share one request
        entry = _read_cache(key)
        if entry and time.time() - entry['saved_at'] < ttl:
            return entry['data']
        outage = time.time() < _outage_until
        if outage and entry:
            _ctx.stale = True
            return entry['data']
        last_err = None
        attempts = 1 if outage else len(RETRY_DELAYS) + 1
        for attempt in range(attempts):
            try:
                data = _throttled(fn)
                _outage_until = 0.0
                _write_cache(key, data)
                return data
            except (KeyError, IndexError) as e:
                log(f'{key}: unexpected reply from NBA.com ({type(e).__name__}: {e})')
                if entry:
                    _ctx.stale = True
                    return entry['data']
                raise BridgeError(missing_status, missing_message) from e
            except Exception as e:  # network errors, timeouts, bad JSON from NBA.com
                last_err = e
                log(f'{key} failed (attempt {attempt + 1}): {type(e).__name__}: {str(e)[:160]}')
                if attempt < attempts - 1:
                    time.sleep(RETRY_DELAYS[attempt])
        _outage_until = time.time() + OUTAGE_COOLDOWN
        log(f'NBA.com unreachable; serving cached data for {OUTAGE_COOLDOWN}s')
        if entry:
            _ctx.stale = True
            return entry['data']
        raise BridgeError(502, 'NBA.com did not respond. Please try again in a minute.') from last_err


def nba_frames(endpoint_cls, **kwargs):
    """Call an nba_api stats endpoint and return its data sets as lists of records."""
    def run():
        r = endpoint_cls(**kwargs, timeout=REQUEST_TIMEOUT)
        return [records(df) for df in r.get_data_frames()]
    return run


def season_ttl(year, current_ttl, past_ttl=30 * DAY):
    return current_ttl if is_current(year) else past_ttl


# ---------------------------------------------------------------------------
# Static data (bundled with nba_api, no network)

ALL_PLAYERS = static_players.get_players()
ALL_TEAMS = static_teams.get_teams()
TEAMS_BY_ID = {t['id']: t for t in ALL_TEAMS}
TEAMS_BY_ABBR = {t['abbreviation']: t for t in ALL_TEAMS}


def team_brief(team_id):
    t = TEAMS_BY_ID.get(int(team_id)) if team_id else None
    if not t:
        return None
    return {'id': t['id'], 'abbreviation': t['abbreviation'], 'name': t['full_name'],
            'city': t['city'], 'nickname': t['nickname'], 'logo': logo_url(t['id'])}


# ---------------------------------------------------------------------------
# League-wide data sets (one request each, shared by many features)

def _league_player_totals(year):
    return fetch(f'lg_player_totals:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashPlayerStats, season=season_str(year), per_mode_detailed='Totals'))[0]


def _league_player_adv(year):
    return fetch(f'lg_player_adv:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashPlayerStats, season=season_str(year), measure_type_detailed_defense='Advanced',
        per_mode_detailed='PerGame'))[0]


def _league_team_totals(year):
    return fetch(f'lg_team_totals:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashTeamStats, season=season_str(year), per_mode_detailed='Totals'))[0]


def _league_team_adv(year):
    return fetch(f'lg_team_adv:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashTeamStats, season=season_str(year), measure_type_detailed_defense='Advanced',
        per_mode_detailed='PerGame'))[0]


def _standings_rows(year):
    return fetch(f'standings:{year}', season_ttl(year, 30 * MIN), nba_frames(
        ep.LeagueStandingsV3, season=season_str(year)))[0]


def _league_game_log(year):
    return fetch(f'lg_gamelog:{year}', season_ttl(year, 15 * MIN), nba_frames(
        ep.LeagueGameLog, season=season_str(year)))[0]


def _schedule(year):
    def run():
        df = ep.ScheduleLeagueV2(season=season_str(year), timeout=REQUEST_TIMEOUT).get_data_frames()[0]
        keep = ['gameId', 'gameStatus', 'gameStatusText', 'gameDateEst', 'gameDateTimeUTC', 'arenaName',
                'arenaCity', 'homeTeam_teamId', 'homeTeam_teamTricode', 'homeTeam_score',
                'awayTeam_teamId', 'awayTeam_teamTricode', 'awayTeam_score']
        return records(df[[c for c in keep if c in df.columns]])
    return fetch(f'schedule:{year}', season_ttl(year, 6 * HOUR), run)


def _player_clutch(year):
    return fetch(f'lg_player_clutch:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashPlayerClutch, season=season_str(year), per_mode_detailed='Totals'))[0]


def _team_clutch(year):
    return fetch(f'lg_team_clutch:{year}', season_ttl(year, HOUR), nba_frames(
        ep.LeagueDashTeamClutch, season=season_str(year), per_mode_detailed='Totals'))[0]


# ---------------------------------------------------------------------------
# PER (Player Efficiency Rating)
# NBA.com does not publish PER, so it is calculated here from real league, team and player
# totals using John Hollinger's formula (as documented by Basketball-Reference).
# It is normalised so the league average is 15.0.

def compute_per(player_rows, team_totals, team_adv):
    lg = {k: sum(num(t[k]) for t in team_totals) for k in
          ['PTS', 'FGM', 'FGA', 'FTM', 'FTA', 'OREB', 'REB', 'AST', 'TOV', 'PF']}
    if not lg['FGM'] or not lg['FTM'] or not lg['PF'] or not lg['REB']:
        return {}
    factor = (2 / 3) - (0.5 * (lg['AST'] / lg['FGM'])) / (2 * (lg['FGM'] / lg['FTM']))
    vop = lg['PTS'] / (lg['FGA'] - lg['OREB'] + lg['TOV'] + 0.44 * lg['FTA'])
    drbp = (lg['REB'] - lg['OREB']) / lg['REB']
    paces = [num(t['PACE']) for t in team_adv if num(t['PACE'])]
    lg_pace = sum(paces) / len(paces) if paces else None
    team_by_id = {t['TEAM_ID']: t for t in team_totals}
    pace_by_id = {t['TEAM_ID']: num(t['PACE']) for t in team_adv}

    aper, minutes = {}, {}
    for p in player_rows:
        mp = num(p['MIN'])
        tm = team_by_id.get(p['TEAM_ID'])
        if mp <= 0 or not tm or not num(tm['FGM']):
            continue
        tm_ast_fg = num(tm['AST']) / num(tm['FGM'])
        uper = (1 / mp) * (
            num(p['FG3M'])
            + (2 / 3) * num(p['AST'])
            + (2 - factor * tm_ast_fg) * num(p['FGM'])
            + num(p['FTM']) * 0.5 * (1 + (1 - tm_ast_fg) + (2 / 3) * tm_ast_fg)
            - vop * num(p['TOV'])
            - vop * drbp * (num(p['FGA']) - num(p['FGM']))
            - vop * 0.44 * (0.44 + 0.56 * drbp) * (num(p['FTA']) - num(p['FTM']))
            + vop * (1 - drbp) * (num(p['REB']) - num(p['OREB']))
            + vop * drbp * num(p['OREB'])
            + vop * num(p['STL'])
            + vop * drbp * num(p['BLK'])
            - num(p['PF']) * ((lg['FTM'] / lg['PF']) - 0.44 * (lg['FTA'] / lg['PF']) * vop)
        )
        tm_pace = pace_by_id.get(p['TEAM_ID'])
        aper[p['PLAYER_ID']] = uper * (lg_pace / tm_pace) if lg_pace and tm_pace else uper
        minutes[p['PLAYER_ID']] = mp
    total_min = sum(minutes.values())
    if not total_min:
        return {}
    lg_aper = sum(aper[k] * minutes[k] for k in aper) / total_min
    if not lg_aper:
        return {}
    return {pid: round(v * 15 / lg_aper, 1) for pid, v in aper.items()}


# ---------------------------------------------------------------------------
# League players: one merged row per player with per-game, shooting and advanced stats

PLAYER_RANK_STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'ts_pct', 'efg_pct', 'usg_pct',
                     'off_rating', 'def_rating', 'net_rating', 'per', 'pie', 'min']
LOWER_IS_BETTER = {'def_rating', 'tov'}


def qualified(p, max_gp):
    """Leaderboard qualification: played at least half the max games and 15+ minutes a game."""
    return p['gp'] >= max(1, math.ceil(max_gp * 0.5)) and (p['min'] or 0) >= 15


def league_players(year):
    def build():
        totals = _league_player_totals(year)
        adv = {r['PLAYER_ID']: r for r in _league_player_adv(year)}
        team_totals = _league_team_totals(year)
        team_adv = _league_team_adv(year)
        try:
            per = compute_per(totals, team_totals, team_adv)
        except Exception as e:
            log('PER calculation failed', e)
            per = {}
        out = []
        for t in totals:
            gp = num(t['GP'])
            a = adv.get(t['PLAYER_ID'], {})
            out.append({
                'player_id': t['PLAYER_ID'], 'name': t['PLAYER_NAME'],
                'team_id': t['TEAM_ID'], 'team': t['TEAM_ABBREVIATION'], 'age': clean(t['AGE']),
                'gp': gp, 'w': t['W'], 'l': t['L'],
                'min': per_game(num(t['MIN']), gp), 'pts': per_game(num(t['PTS']), gp),
                'reb': per_game(num(t['REB']), gp), 'oreb': per_game(num(t['OREB']), gp),
                'dreb': per_game(num(t['DREB']), gp), 'ast': per_game(num(t['AST']), gp),
                'stl': per_game(num(t['STL']), gp), 'blk': per_game(num(t['BLK']), gp),
                'tov': per_game(num(t['TOV']), gp), 'pf': per_game(num(t['PF']), gp),
                'fgm': per_game(num(t['FGM']), gp), 'fga': per_game(num(t['FGA']), gp),
                'fg3m': per_game(num(t['FG3M']), gp), 'fg3a': per_game(num(t['FG3A']), gp),
                'ftm': per_game(num(t['FTM']), gp), 'fta': per_game(num(t['FTA']), gp),
                'fg_pct': clean(t['FG_PCT']), 'fg3_pct': clean(t['FG3_PCT']), 'ft_pct': clean(t['FT_PCT']),
                'plus_minus': per_game(num(t['PLUS_MINUS']), gp), 'dd2': t['DD2'], 'td3': t['TD3'],
                'ts_pct': clean(a.get('TS_PCT')) if a else ts_pct(num(t['PTS']), num(t['FGA']), num(t['FTA'])),
                'efg_pct': clean(a.get('EFG_PCT')), 'usg_pct': clean(a.get('USG_PCT')),
                'off_rating': clean(a.get('OFF_RATING')), 'def_rating': clean(a.get('DEF_RATING')),
                'net_rating': clean(a.get('NET_RATING')), 'pace': clean(a.get('PACE')),
                'pie': clean(a.get('PIE')), 'ast_pct': clean(a.get('AST_PCT')),
                'ast_to': clean(a.get('AST_TO')), 'reb_pct': clean(a.get('REB_PCT')),
                'oreb_pct': clean(a.get('OREB_PCT')), 'dreb_pct': clean(a.get('DREB_PCT')),
                'tov_pct': pct100(a.get('TM_TOV_PCT')), 'poss': clean(a.get('POSS')),
                'per': per.get(t['PLAYER_ID']),
            })
        # League ranks and percentiles among qualified players.
        max_gp = max((p['gp'] for p in out), default=0)
        pool = [p for p in out if qualified(p, max_gp)]
        for stat in PLAYER_RANK_STATS:
            vals = sorted((p[stat] for p in pool if p[stat] is not None), reverse=stat not in LOWER_IS_BETTER)
            n = len(vals)
            for p in out:
                v = p[stat]
                p.setdefault('ranks', {})
                p.setdefault('percentiles', {})
                if v is None or not n:
                    continue
                better = sum(1 for x in vals if (x < v if stat in LOWER_IS_BETTER else x > v))
                p['ranks'][stat] = better + 1
                p['percentiles'][stat] = round(100 * (n - better - 1) / (n - 1)) if n > 1 else 100
        for p in out:
            p['qualified'] = qualified(p, max_gp)
        return {'players': out, 'max_gp': max_gp, 'qualified_count': len(pool)}
    # Built from cached pieces, so it's cheap to rebuild; cache the merged result briefly in memory.
    key = f'league_players:{year}'
    entry = _mem_cache.get(key)
    if entry and time.time() - entry['saved_at'] < 5 * MIN:
        return entry['data']
    data = build()
    _mem_cache[key] = {'saved_at': time.time(), 'data': data}
    return data


def _player_row(year, player_id):
    for p in league_players(year)['players']:
        if p['player_id'] == int(player_id):
            return p
    return None


def _try(fn, *args):
    """Run an optional part of a response; a failure becomes an error message instead of
    breaking the whole response."""
    try:
        return fn(*args), None
    except BridgeError as e:
        return None, str(e)
    except Exception as e:
        log('optional section failed', type(e).__name__, e)
        return None, 'This section is unavailable right now.'


# ---------------------------------------------------------------------------
# Players

def m_search_players(q='', limit=12, season=None):
    q = (q or '').strip().lower()
    if len(q) < 2:
        return []
    year = parse_season(season)
    stats = {}
    try:
        stats = {r['player_id']: r for r in league_players(year)['players']}
    except BridgeError:
        pass
    known = {p['id'] for p in ALL_PLAYERS}
    extra = []
    for r in stats.values():
        if r['player_id'] not in known:
            first, _, last = r['name'].partition(' ')
            extra.append({'id': r['player_id'], 'full_name': r['name'], 'first_name': first,
                          'last_name': last, 'is_active': True})
    matches = []
    for p in ALL_PLAYERS + extra:
        name = p['full_name'].lower()
        if q not in name:
            continue
        starts = name.startswith(q) or p['last_name'].lower().startswith(q)
        matches.append((0 if p['is_active'] else 1, 0 if starts else 1, p['full_name'], p))
    matches.sort(key=lambda m: m[:3])
    top = [m[3] for m in matches[:int(limit)]]
    out = []
    for p in top:
        s = stats.get(p['id'])
        out.append({
            'id': p['id'], 'first_name': p['first_name'], 'last_name': p['last_name'],
            'full_name': p['full_name'], 'is_active': p['is_active'], 'headshot': headshot_url(p['id']),
            'team': team_brief(s['team_id']) if s else None,
            'season_avg': {k: s[k] for k in ('gp', 'pts', 'reb', 'ast')} if s else None,
        })
    return out


def _player_info(player_id):
    frames = fetch(f'player_info:{player_id}', DAY, nba_frames(ep.CommonPlayerInfo, player_id=player_id),
                   missing_status=404, missing_message='Player not found.')
    if not frames or not frames[0]:
        raise BridgeError(404, 'Player not found.')
    i = frames[0][0]
    return {
        'id': i['PERSON_ID'], 'first_name': i['FIRST_NAME'], 'last_name': i['LAST_NAME'],
        'full_name': i['DISPLAY_FIRST_LAST'], 'birthdate': (i['BIRTHDATE'] or '')[:10] or None,
        'school': i['SCHOOL'], 'country': i['COUNTRY'], 'height': i['HEIGHT'] or None,
        'weight': i['WEIGHT'] or None, 'experience': i['SEASON_EXP'], 'jersey': i['JERSEY'] or None,
        'position': i['POSITION'] or None, 'is_active': i['ROSTERSTATUS'] == 'Active',
        'from_year': i['FROM_YEAR'], 'to_year': i['TO_YEAR'],
        'draft_year': i['DRAFT_YEAR'], 'draft_round': i['DRAFT_ROUND'], 'draft_number': i['DRAFT_NUMBER'],
        'greatest_75': i.get('GREATEST_75_FLAG') == 'Y',
        'team': team_brief(i['TEAM_ID']), 'headshot': headshot_url(i['PERSON_ID']),
    }


def m_player_profile(player_id, season=None):
    player_id = int(player_id)
    year = parse_season(season)
    info = _player_info(player_id)
    row, err = _try(_player_row, year, player_id)
    return {'player': info, 'season': year, 'stats': row, 'stats_error': err}


def m_player_career(player_id):
    player_id = int(player_id)
    frames = fetch(f'player_career:{player_id}', 12 * HOUR,
                   nba_frames(ep.PlayerCareerStats, player_id=player_id, per_mode36='Totals'))

    def shape(rows):
        out = []
        for r in rows:
            gp = num(r.get('GP'))
            out.append({
                'season': r.get('SEASON_ID'), 'team': r.get('TEAM_ABBREVIATION'), 'team_id': r.get('TEAM_ID'),
                'age': clean(r.get('PLAYER_AGE')), 'gp': gp, 'gs': clean(r.get('GS')),
                'min': per_game(num(r.get('MIN')), gp), 'pts': per_game(num(r.get('PTS')), gp),
                'reb': per_game(num(r.get('REB')), gp), 'ast': per_game(num(r.get('AST')), gp),
                'stl': per_game(num(r.get('STL')), gp), 'blk': per_game(num(r.get('BLK')), gp),
                'tov': per_game(num(r.get('TOV')), gp),
                'fg_pct': clean(r.get('FG_PCT')), 'fg3_pct': clean(r.get('FG3_PCT')), 'ft_pct': clean(r.get('FT_PCT')),
                'ts_pct': ts_pct(num(r.get('PTS')), num(r.get('FGA')), num(r.get('FTA'))),
                'totals': {k.lower(): clean(r.get(k)) for k in ('PTS', 'REB', 'AST', 'STL', 'BLK', 'FGM', 'FG3M')},
            })
        return out

    # Data sets: 0 regular season by season, 1 career regular season, 2 playoffs by season, 3 career playoffs
    get = lambda i: frames[i] if len(frames) > i else []
    return {
        'regular_season': shape(get(0)), 'career': (shape(get(1)) or [None])[0],
        'playoffs': shape(get(2)), 'career_playoffs': (shape(get(3)) or [None])[0],
    }


def m_player_gamelog(player_id, season=None):
    player_id = int(player_id)
    year = parse_season(season)
    rows = fetch(f'player_gamelog:{player_id}:{year}', season_ttl(year, 30 * MIN), nba_frames(
        ep.PlayerGameLog, player_id=player_id, season=season_str(year)))[0]
    games = []
    for r in rows:
        matchup = r['MATCHUP'] or ''
        opp = matchup.split(' ')[-1]
        games.append({
            'game_id': r['Game_ID'], 'date': r['GAME_DATE'], 'matchup': matchup,
            'home': 'vs.' in matchup, 'opponent': opp, 'opponent_team': team_brief(TEAMS_BY_ABBR.get(opp, {}).get('id')),
            'result': r['WL'], 'min': r['MIN'], 'pts': r['PTS'], 'reb': r['REB'], 'ast': r['AST'],
            'stl': r['STL'], 'blk': r['BLK'], 'tov': r['TOV'], 'pf': r['PF'],
            'fgm': r['FGM'], 'fga': r['FGA'], 'fg3m': r['FG3M'], 'fg3a': r['FG3A'],
            'ftm': r['FTM'], 'fta': r['FTA'], 'plus_minus': r['PLUS_MINUS'],
            'ts_pct': ts_pct(num(r['PTS']), num(r['FGA']), num(r['FTA'])),
        })
    return {'season': year, 'games': games}  # newest first, as NBA.com returns them


def m_player_shots(player_id, season=None):
    player_id = int(player_id)
    year = parse_season(season)
    frames = fetch(f'player_shots:{player_id}:{year}', season_ttl(year, 2 * HOUR), nba_frames(
        ep.ShotChartDetail, player_id=player_id, team_id=0, season_nullable=season_str(year),
        context_measure_simple='FGA'))
    shots = [{
        'x': s['LOC_X'], 'y': s['LOC_Y'], 'made': bool(s['SHOT_MADE_FLAG']), 'zone': s['SHOT_ZONE_BASIC'],
        'area': s['SHOT_ZONE_AREA'], 'distance': s['SHOT_DISTANCE'], 'type': s['SHOT_TYPE'],
        'action': s['ACTION_TYPE'], 'date': s['GAME_DATE'], 'period': s['PERIOD'],
    } for s in frames[0]]
    # Zone summary vs. league average for the same zones.
    league = {}
    for r in (frames[1] if len(frames) > 1 else []):
        z = league.setdefault(r['SHOT_ZONE_BASIC'], {'fga': 0, 'fgm': 0})
        z['fga'] += num(r['FGA'])
        z['fgm'] += num(r['FGM'])
    zones = {}
    for s in shots:
        z = zones.setdefault(s['zone'], {'zone': s['zone'], 'fga': 0, 'fgm': 0})
        z['fga'] += 1
        z['fgm'] += 1 if s['made'] else 0
    zone_list = []
    for z in zones.values():
        lg = league.get(z['zone'])
        z['fg_pct'] = ratio(z['fgm'], z['fga'])
        z['league_fg_pct'] = ratio(lg['fgm'], lg['fga']) if lg else None
        z['share'] = ratio(z['fga'], len(shots))
        zone_list.append(z)
    zone_list.sort(key=lambda z: -z['fga'])
    return {'season': year, 'shots': shots, 'zones': zone_list, 'total': len(shots),
            'made': sum(1 for s in shots if s['made'])}


def _clutch_row(r, gp_key='GP'):
    gp = num(r[gp_key])
    return {
        'gp': gp, 'w': r['W'], 'l': r['L'], 'min': per_game(num(r['MIN']), gp),
        'pts': per_game(num(r['PTS']), gp), 'reb': per_game(num(r['REB']), gp),
        'ast': per_game(num(r['AST']), gp), 'tov': per_game(num(r['TOV']), gp),
        'plus_minus': per_game(num(r['PLUS_MINUS']), gp),
        'fgm': r['FGM'], 'fga': r['FGA'], 'fg_pct': clean(r['FG_PCT']),
        'fg3m': r['FG3M'], 'fg3a': r['FG3A'], 'fg3_pct': clean(r['FG3_PCT']),
        'ftm': r['FTM'], 'fta': r['FTA'], 'ft_pct': clean(r['FT_PCT']),
        'total_pts': r['PTS'], 'ts_pct': ts_pct(num(r['PTS']), num(r['FGA']), num(r['FTA'])),
    }


CLUTCH_DEFINITION = 'Last 5 minutes of the 4th quarter or overtime, score within 5 points.'


def m_player_clutch(player_id, season=None):
    player_id = int(player_id)
    year = parse_season(season)
    rows = _player_clutch(year)
    ranked = sorted(rows, key=lambda r: -num(r['PTS']))
    for i, r in enumerate(ranked):
        if r['PLAYER_ID'] == player_id:
            return {'season': year, 'definition': CLUTCH_DEFINITION, 'stats': _clutch_row(r),
                    'total_pts_rank': i + 1, 'players_with_clutch_minutes': len(rows)}
    return {'season': year, 'definition': CLUTCH_DEFINITION, 'stats': None,
            'players_with_clutch_minutes': len(rows)}


def m_compare_players(ids, season=None):
    year = parse_season(season)
    ids = [int(i) for i in str(ids).split(',') if i.strip()][:4]
    data = league_players(year)
    by_id = {p['player_id']: p for p in data['players']}
    out = []
    for pid in ids:
        static = next((p for p in ALL_PLAYERS if p['id'] == pid), None)
        out.append({'id': pid, 'name': static['full_name'] if static else None,
                    'headshot': headshot_url(pid), 'stats': by_id.get(pid)})
    return {'season': year, 'players': out, 'qualified_count': data['qualified_count']}


LEADER_STATS = {
    'pts': 'Points', 'reb': 'Rebounds', 'ast': 'Assists', 'stl': 'Steals', 'blk': 'Blocks',
    'fg3m': '3-pointers made', 'ts_pct': 'True shooting %', 'per': 'PER', 'usg_pct': 'Usage %',
    'net_rating': 'Net rating', 'pie': 'PIE', 'def_rating': 'Defensive rating',
}


def m_leaders(stat='pts', season=None, limit=10):
    if stat not in LEADER_STATS:
        raise BridgeError(400, 'Unknown stat.')
    year = parse_season(season)
    data = league_players(year)
    pool = [p for p in data['players'] if p['qualified'] and p[stat] is not None]
    pool.sort(key=lambda p: p[stat], reverse=stat not in LOWER_IS_BETTER)
    leaders = [{
        'rank': i + 1, 'player_id': p['player_id'], 'name': p['name'], 'team': team_brief(p['team_id']),
        'headshot': headshot_url(p['player_id']), 'value': p[stat], 'gp': p['gp'],
    } for i, p in enumerate(pool[:int(limit)])]
    return {'season': year, 'stat': stat, 'label': LEADER_STATS[stat], 'leaders': leaders,
            'qualification': f"At least {math.ceil(data['max_gp'] * 0.5)} games and 15 minutes per game"}


# ---------------------------------------------------------------------------
# Teams

TEAM_RANK_STATS = ['win_pct', 'pts', 'opp_pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg_pct', 'fg3_pct',
                   'ts_pct', 'efg_pct', 'off_rating', 'def_rating', 'net_rating', 'pace']
TEAM_LOWER_IS_BETTER = {'opp_pts', 'tov', 'def_rating'}


def _standings(year):
    rows = _standings_rows(year)
    by_team = {}
    for r in rows:
        by_team[r['TeamID']] = {
            'seed': r['PlayoffRank'], 'conference': r['Conference'], 'division': r['Division'],
            'wins': r['WINS'], 'losses': r['LOSSES'], 'win_pct': clean(r['WinPCT']),
            'games_behind': r['ConferenceGamesBack'], 'streak': (r['strCurrentStreak'] or '').replace(' ', ''),
            'last10': r['L10'], 'home': r['HOME'], 'road': r['ROAD'], 'league_rank': r['LeagueRank'],
            'clinch': (r['ClinchIndicator'] or '').strip(' -') or None,
            'pts': clean(r['PointsPG']), 'opp_pts': clean(r['OppPointsPG']),
        }
    return by_team


def league_teams(year):
    totals = {t['TEAM_ID']: t for t in _league_team_totals(year)}
    adv = {t['TEAM_ID']: t for t in _league_team_adv(year)}
    standings, _ = _try(_standings, year)
    standings = standings or {}
    out = []
    for tid, t in totals.items():
        gp = num(t['GP'])
        a = adv.get(tid, {})
        s = standings.get(tid, {})
        out.append({
            **team_brief(tid), 'gp': gp, 'wins': t['W'], 'losses': t['L'], 'win_pct': clean(t['W_PCT']),
            'conference': s.get('conference'), 'seed': s.get('seed'), 'streak': s.get('streak'),
            'last10': s.get('last10'), 'home': s.get('home'), 'road': s.get('road'),
            'pts': per_game(num(t['PTS']), gp), 'opp_pts': s.get('opp_pts'),
            'reb': per_game(num(t['REB']), gp), 'ast': per_game(num(t['AST']), gp),
            'stl': per_game(num(t['STL']), gp), 'blk': per_game(num(t['BLK']), gp),
            'tov': per_game(num(t['TOV']), gp), 'fg_pct': clean(t['FG_PCT']),
            'fg3_pct': clean(t['FG3_PCT']), 'ft_pct': clean(t['FT_PCT']),
            'fg3a': per_game(num(t['FG3A']), gp), 'plus_minus': per_game(num(t['PLUS_MINUS']), gp),
            'ts_pct': clean(a.get('TS_PCT')), 'efg_pct': clean(a.get('EFG_PCT')),
            'off_rating': clean(a.get('OFF_RATING')), 'def_rating': clean(a.get('DEF_RATING')),
            'net_rating': clean(a.get('NET_RATING')), 'pace': clean(a.get('PACE')),
            'ast_pct': clean(a.get('AST_PCT')), 'reb_pct': clean(a.get('REB_PCT')),
            'tov_pct': pct100(a.get('TM_TOV_PCT')), 'pie': clean(a.get('PIE')),
        })
    for stat in TEAM_RANK_STATS:
        lower = stat in TEAM_LOWER_IS_BETTER
        for t in out:
            t.setdefault('ranks', {})
            v = t[stat]
            if v is None:
                continue
            t['ranks'][stat] = 1 + sum(1 for o in out if o[stat] is not None and (o[stat] < v if lower else o[stat] > v))
    out.sort(key=lambda t: (-(t['win_pct'] or 0), -(t['net_rating'] or 0)))
    return out


def m_teams(season=None):
    year = parse_season(season)
    return {'season': year, 'teams': league_teams(year)}


def m_standings(season=None):
    year = parse_season(season)
    by_team = _standings(year)
    confs = {}
    for tid, s in by_team.items():
        confs.setdefault(s['conference'], []).append({**team_brief(tid), **s})
    out = []
    for name in ('East', 'West'):
        teams = sorted(confs.get(name, []), key=lambda t: t['seed'] or 99)
        out.append({'name': f'{name}ern Conference', 'abbreviation': name, 'teams': teams})
    return {'season': year, 'conferences': out}


def _games_from_log(year):
    """Pair up the two team rows of each game in the league game log."""
    games = {}
    for r in _league_game_log(year):
        g = games.setdefault(r['GAME_ID'], {'game_id': r['GAME_ID'], 'date': r['GAME_DATE']})
        side = 'home' if 'vs.' in (r['MATCHUP'] or '') else 'away'
        g[side] = {**team_brief(r['TEAM_ID']), 'score': r['PTS'], 'won': r['WL'] == 'W'}
    return [g for g in games.values() if 'home' in g and 'away' in g]


def m_recent_games(limit=10, season=None):
    year = parse_season(season)
    games = sorted(_games_from_log(year), key=lambda g: (g['date'], g['game_id']), reverse=True)
    return {'season': year, 'games': games[:int(limit)]}


def _schedule_game(r):
    return {
        'game_id': r['gameId'], 'status': r['gameStatus'], 'status_text': r['gameStatusText'],
        'date': (r['gameDateEst'] or '')[:10], 'start_utc': r['gameDateTimeUTC'], 'arena': r.get('arenaName'),
        'home': {**(team_brief(r['homeTeam_teamId']) or {}), 'score': r['homeTeam_score']},
        'away': {**(team_brief(r['awayTeam_teamId']) or {}), 'score': r['awayTeam_score']},
    }


def m_team_profile(team_id, season=None):
    team_id = int(team_id)
    if team_id not in TEAMS_BY_ID:
        raise BridgeError(404, 'Team not found.')
    year = parse_season(season)
    teams = league_teams(year)
    team = next((t for t in teams if t['id'] == team_id), None) or team_brief(team_id)

    def roster():
        frames = fetch(f'team_roster:{team_id}:{year}', season_ttl(year, 6 * HOUR),
                       nba_frames(ep.CommonTeamRoster, team_id=team_id, season=season_str(year)))
        stats, _ = _try(lambda: {p['player_id']: p for p in league_players(year)['players']})
        stats = stats or {}
        players = [{
            'player_id': r['PLAYER_ID'], 'name': r['PLAYER'], 'number': r['NUM'], 'position': r['POSITION'],
            'height': r['HEIGHT'], 'weight': r['WEIGHT'], 'age': clean(r['AGE']), 'exp': r['EXP'],
            'school': r['SCHOOL'], 'headshot': headshot_url(r['PLAYER_ID']),
            'stats': stats.get(r['PLAYER_ID']) if stats.get(r['PLAYER_ID'], {}).get('team_id') == team_id else None,
        } for r in frames[0]]
        players.sort(key=lambda p: -((p['stats'] or {}).get('pts') or -1))
        coaches = [{'name': c['COACH_NAME'], 'type': c['COACH_TYPE']} for c in (frames[1] if len(frames) > 1 else [])]
        return {'players': players, 'coaches': coaches}

    def results():
        games = [g for g in _games_from_log(year) if g['home']['id'] == team_id or g['away']['id'] == team_id]
        games.sort(key=lambda g: g['date'], reverse=True)
        return games

    def upcoming():
        today = datetime.now(ET).strftime('%Y-%m-%d')
        rows = [_schedule_game(r) for r in _schedule(year)
                if team_id in (r['homeTeam_teamId'], r['awayTeam_teamId']) and r['gameStatus'] == 1]
        return sorted([g for g in rows if g['date'] >= today], key=lambda g: g['start_utc'] or '')[:5]

    def clutch():
        rows = _team_clutch(year)
        r = next((r for r in rows if r['TEAM_ID'] == team_id), None)
        return {'definition': CLUTCH_DEFINITION, 'stats': _clutch_row(r) if r else None}

    roster_data, roster_err = _try(roster)
    results_data, results_err = _try(results)
    upcoming_data, upcoming_err = _try(upcoming) if is_current(year) else ([], None)
    clutch_data, clutch_err = _try(clutch)
    return {
        'season': year, 'team': team, 'team_count': len(teams),
        'roster': roster_data, 'roster_error': roster_err,
        'results': results_data, 'results_error': results_err,
        'upcoming': upcoming_data, 'upcoming_error': upcoming_err,
        'clutch': clutch_data, 'clutch_error': clutch_err,
    }


def m_team_history(team_id):
    team_id = int(team_id)
    rows = fetch(f'team_history:{team_id}', DAY, nba_frames(ep.TeamYearByYearStats, team_id=team_id))[0]
    return {'history': [{
        'season': r['YEAR'], 'gp': r['GP'], 'wins': r['WINS'], 'losses': r['LOSSES'],
        'win_pct': clean(r['WIN_PCT']), 'conf_rank': r['CONF_RANK'], 'po_wins': r['PO_WINS'],
        'po_losses': r['PO_LOSSES'], 'finals': r['NBA_FINALS_APPEARANCE'],
        'pts': per_game(num(r['PTS']), num(r['GP'])),
    } for r in rows]}


def m_compare_teams(ids, season=None):
    year = parse_season(season)
    ids = [int(i) for i in str(ids).split(',') if i.strip()][:4]
    teams = {t['id']: t for t in league_teams(year)}
    return {'season': year, 'teams': [teams.get(i) or team_brief(i) for i in ids], 'team_count': len(teams)}


def m_team_list():
    return sorted((team_brief(t['id']) for t in ALL_TEAMS), key=lambda t: t['name'])


# ---------------------------------------------------------------------------
# Today's games

def m_scoreboard():
    today = datetime.now(ET).strftime('%Y-%m-%d')

    def live():
        board = live_scoreboard.ScoreBoard(timeout=REQUEST_TIMEOUT).get_dict()['scoreboard']
        return board

    games = []
    board, _ = _try(lambda: fetch('live_scoreboard', 20, live))
    if board and board.get('gameDate') == today and board.get('games'):
        for g in board['games']:
            state = {1: 'pre', 2: 'in', 3: 'post'}.get(g['gameStatus'], 'pre')
            games.append({
                'id': g['gameId'], 'start': g['gameTimeUTC'], 'state': state,
                'status': (g['gameStatusText'] or '').strip(),
                'home': {**(team_brief(g['homeTeam']['teamId']) or {}), 'score': g['homeTeam']['score']},
                'away': {**(team_brief(g['awayTeam']['teamId']) or {}), 'score': g['awayTeam']['score']},
            })
    else:
        # NBA's live feed switches to the new day mid-morning ET; use the schedule until then.
        for r in _schedule(current_season_year()):
            if (r['gameDateEst'] or '')[:10] != today:
                continue
            g = _schedule_game(r)
            state = {1: 'pre', 2: 'in', 3: 'post'}.get(r['gameStatus'], 'pre')
            games.append({'id': g['game_id'], 'start': g['start_utc'], 'state': state,
                          'status': g['status_text'], 'home': g['home'], 'away': g['away']})
    games.sort(key=lambda g: g['start'] or '')
    if games:
        return {'date': today, 'is_today': True, 'games': games}
    # No games today (e.g. All-Star break, Election Day): show the next day with games.
    upcoming, _ = _try(lambda: sorted(
        (r for r in _schedule(current_season_year()) if (r['gameDateEst'] or '')[:10] > today),
        key=lambda r: r['gameDateTimeUTC'] or ''))
    if upcoming:
        next_day = upcoming[0]['gameDateEst'][:10]
        for r in upcoming:
            if r['gameDateEst'][:10] != next_day:
                break
            g = _schedule_game(r)
            games.append({'id': g['game_id'], 'start': g['start_utc'], 'state': 'pre',
                          'status': g['status_text'], 'home': g['home'], 'away': g['away']})
        return {'date': next_day, 'is_today': False, 'games': games}
    return {'date': today, 'is_today': True, 'games': []}


def m_meta():
    return {'season': current_season_year(), 'first_season': 1996}


METHODS = {
    'meta': m_meta,
    'search_players': m_search_players,
    'player_profile': m_player_profile,
    'player_career': m_player_career,
    'player_gamelog': m_player_gamelog,
    'player_shots': m_player_shots,
    'player_clutch': m_player_clutch,
    'compare_players': m_compare_players,
    'leaders': m_leaders,
    'teams': m_teams,
    'team_list': m_team_list,
    'team_profile': m_team_profile,
    'team_history': m_team_history,
    'compare_teams': m_compare_teams,
    'standings': m_standings,
    'recent_games': m_recent_games,
    'scoreboard': m_scoreboard,
}


# ---------------------------------------------------------------------------
# stdin/stdout loop

_out_lock = threading.Lock()


def sanitize(v):
    if isinstance(v, dict):
        return {k: sanitize(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [sanitize(x) for x in v]
    return clean(v)


def respond(msg):
    line = json.dumps(sanitize(msg), allow_nan=False)
    with _out_lock:
        sys.stdout.write(line + '\n')
        sys.stdout.flush()


def handle(req):
    _ctx.stale = False
    rid = req.get('id')
    method = METHODS.get(req.get('method'))
    if not method:
        return respond({'id': rid, 'ok': False, 'status': 404, 'error': 'Unknown method.'})
    try:
        data = method(**(req.get('params') or {}))
        respond({'id': rid, 'ok': True, 'data': data, 'stale': bool(getattr(_ctx, 'stale', False))})
    except BridgeError as e:
        respond({'id': rid, 'ok': False, 'status': e.status, 'error': str(e)})
    except (TypeError, ValueError) as e:
        log('bad request', req.get('method'), e)
        respond({'id': rid, 'ok': False, 'status': 400, 'error': 'Invalid request.'})
    except Exception as e:
        log('unexpected error in', req.get('method'), traceback.format_exc())
        respond({'id': rid, 'ok': False, 'status': 500, 'error': 'Something went wrong loading NBA data.'})


def main():
    pool = ThreadPoolExecutor(max_workers=6)
    respond({'id': None, 'ready': True})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except ValueError:
            continue
        pool.submit(handle, req)


if __name__ == '__main__':
    main()
