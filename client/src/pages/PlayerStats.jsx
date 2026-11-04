import React, { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import Leaderboard from '../components/Leaderboard'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import SeasonSelect from '../components/SeasonSelect'
import SimpleLineChart from '../components/charts/SimpleLineChart'
import SimpleBarChart from '../components/charts/SimpleBarChart'
import ShotChart from '../components/charts/ShotChart'
import { StatTile, MetricRow, Tabs, TableWrap } from '../components/Stats'
import { usePlayerProfile, usePlayerCareer, usePlayerGameLog, usePlayerShots, usePlayerClutch } from '../hooks/usePlayers'
import { currentSeason, seasonLabel } from '../utils/season'
import { fixed, pct, signed, shortDate } from '../utils/format'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'games', label: 'Game Log' },
  { key: 'career', label: 'Career' },
  { key: 'shooting', label: 'Shot Chart' },
  { key: 'clutch', label: 'Clutch' },
]

// Advanced metrics shown with league rank and percentile. `hint` explains each one.
const ADVANCED = [
  { key: 'per', label: 'PER', fmt: fixed, hint: 'Player Efficiency Rating: per-minute production, league average is 15. Calculated from NBA.com totals.' },
  { key: 'ts_pct', label: 'True Shooting %', fmt: pct, hint: 'Shooting efficiency counting 3-pointers and free throws.' },
  { key: 'efg_pct', label: 'Effective FG %', fmt: pct, hint: 'FG% with 3-pointers weighted 1.5×.' },
  { key: 'usg_pct', label: 'Usage %', fmt: pct, hint: 'Share of team plays used by the player while on the floor.' },
  { key: 'off_rating', label: 'Offensive Rating', fmt: fixed, hint: 'Team points scored per 100 possessions with the player on the floor.' },
  { key: 'def_rating', label: 'Defensive Rating', fmt: fixed, hint: 'Points allowed per 100 possessions with the player on the floor (lower is better).' },
  { key: 'net_rating', label: 'Net Rating', fmt: signed, hint: 'Offensive rating minus defensive rating.' },
  { key: 'pie', label: 'PIE', fmt: pct, hint: "Player Impact Estimate: NBA.com's share of game events the player was involved in." },
]
const EXTRA = [
  { key: 'ast_pct', label: 'Assist %', fmt: pct },
  { key: 'ast_to', label: 'AST/TO', fmt: v => fixed(v, 2) },
  { key: 'reb_pct', label: 'Rebound %', fmt: pct },
  { key: 'tov_pct', label: 'Turnover %', fmt: pct },
  { key: 'pace', label: 'Pace', fmt: fixed },
  { key: 'plus_minus', label: '+/- per game', fmt: signed },
]

export default function PlayerStats(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const season = Number(params.get('season')) || currentSeason()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'overview'

  const setParam = (key, value, def) => setParams(prev => {
    const next = new URLSearchParams(prev)
    if (value === def) next.delete(key); else next.set(key, value)
    return next
  }, { replace: true })

  const openPlayer = p => navigate(`/players/${p.id}`)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Player Statistics</h1>
        <PlayerSearch onSelect={openPlayer} />
      </div>

      {!id ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><Leaderboard limit={15} /></Card>
          <Card>
            <h3 className="font-semibold mb-2">Find a player</h3>
            <p className="text-sm text-white/60">Search any NBA player from 1996-97 to today for their profile, season and career stats, advanced metrics, game logs, shot chart and clutch numbers.</p>
          </Card>
        </div>
      ) : (
        <PlayerView
          id={id}
          season={season}
          tab={tab}
          onSeason={y => setParam('season', String(y), String(currentSeason()))}
          onTab={t => setParam('tab', t, 'overview')}
        />
      )}
    </div>
  )
}

function PlayerView({ id, season, tab, onSeason, onTab }){
  const profile = usePlayerProfile(id, season)
  const p = profile.data?.player

  if (profile.loading && !p) return <LoadingSkeleton className="h-64" />
  if (profile.error) return <Card><ErrorState error={profile.error} onRetry={profile.reload} /></Card>
  if (!p) return null

  const firstSeason = Math.max(1996, Number(p.from_year) || 1996)
  return (
    <>
      <ProfileHeader player={p} season={season} onSeason={onSeason} firstSeason={firstSeason} />
      <Tabs tabs={TABS} value={tab} onChange={onTab} />
      {tab === 'overview' && <Overview profile={profile} id={id} season={season} />}
      {tab === 'games' && <GameLog id={id} season={season} />}
      {tab === 'career' && <Career id={id} />}
      {tab === 'shooting' && <Shooting id={id} season={season} />}
      {tab === 'clutch' && <Clutch id={id} season={season} />}
    </>
  )
}

function ProfileHeader({ player: p, season, onSeason, firstSeason }){
  const age = p.birthdate ? Math.floor((Date.now() - new Date(p.birthdate)) / (365.25 * 864e5)) : null
  const draft = p.draft_year && p.draft_year !== 'Undrafted' ? `${p.draft_year} · Round ${p.draft_round} · Pick ${p.draft_number}` : 'Undrafted'
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 md:items-end">
        <img src={p.headshot} alt={p.full_name} className="w-48 md:w-56 -mb-4 md:-mb-5 self-center md:self-end object-contain" onError={e => { e.currentTarget.style.display = 'none' }} />
        <div className="flex-1 pb-1">
          <div className="flex items-center gap-2 text-sm text-white/60">
            {p.team ? (
              <Link to={`/teams/${p.team.id}`} className="flex items-center gap-2 hover:text-accent transition-colors">
                <img src={p.team.logo} alt="" className="w-6 h-6" />{p.team.name}
              </Link>
            ) : <span>{p.is_active ? 'Free agent' : 'Former player'}</span>}
            {p.jersey && <span>· #{p.jersey}</span>}
            {p.position && <span>· {p.position}</span>}
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-1">{p.full_name}</h2>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 text-sm">
            <Info label="Height" value={p.height} />
            <Info label="Weight" value={p.weight && `${p.weight} lb`} />
            <Info label="Age" value={age} />
            <Info label="Experience" value={p.experience != null ? `${p.experience} yr${p.experience === 1 ? '' : 's'}` : null} />
            <Info label={p.school ? 'College' : 'Country'} value={p.school || p.country} />
            <Info label="Draft" value={draft} />
          </dl>
        </div>
        <div className="md:self-start">
          <SeasonSelect value={season} onChange={onSeason} first={firstSeason} />
          <Link to={`/compare?a=${p.id}`} className="block mt-3 text-sm text-accent hover:underline md:text-right">Compare →</Link>
        </div>
      </div>
    </Card>
  )
}

function Info({ label, value }){
  return (
    <div>
      <dt className="text-xs text-white/40">{label}</dt>
      <dd className="truncate">{value || '—'}</dd>
    </div>
  )
}

function Overview({ profile, id, season }){
  const s = profile.data?.stats
  const games = usePlayerGameLog(id, season, !!s)
  const last10 = (games.data?.games || []).slice(0, 10).reverse()

  if (!s) {
    return <Card><div className="text-white/60">{profile.data?.stats_error || `No ${seasonLabel(season)} stats — this player didn't play this season.`}</div></Card>
  }
  const ranks = s.ranks || {}
  const pcts = s.percentiles || {}
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-semibold">Season Averages <span className="text-white/50 font-normal">{seasonLabel(season)}</span></h3>
          <span className="text-xs text-white/40">{s.gp} games · {s.team} · {s.w}-{s.l}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-y-5 gap-x-4">
          <StatTile label="PPG" value={fixed(s.pts)} />
          <StatTile label="RPG" value={fixed(s.reb)} />
          <StatTile label="APG" value={fixed(s.ast)} />
          <StatTile label="SPG" value={fixed(s.stl)} />
          <StatTile label="BPG" value={fixed(s.blk)} />
          <StatTile label="MPG" value={fixed(s.min)} />
          <StatTile label="FG%" value={pct(s.fg_pct)} sub={`${fixed(s.fgm)}-${fixed(s.fga)}`} />
          <StatTile label="3P%" value={pct(s.fg3_pct)} sub={`${fixed(s.fg3m)}-${fixed(s.fg3a)}`} />
          <StatTile label="FT%" value={pct(s.ft_pct)} sub={`${fixed(s.ftm)}-${fixed(s.fta)}`} />
          <StatTile label="TOV" value={fixed(s.tov)} />
        </div>

        <h3 className="font-semibold mt-8 mb-1">Last 10 Games</h3>
        {games.loading && <LoadingSkeleton className="h-60" />}
        {games.error && <ErrorState error={games.error} onRetry={games.reload} />}
        {games.data && last10.length > 0 && (
          <SimpleLineChart data={last10.map(g => ({ name: shortDate(g.date), value: g.pts }))} label="PTS" />
        )}
        {games.data && last10.length === 0 && <div className="text-sm text-white/60">No games yet.</div>}
      </Card>

      <Card>
        <h3 className="font-semibold">Advanced</h3>
        <p className="text-xs text-white/40 mb-2">
          {s.qualified ? 'League rank and percentile among qualified players.' : 'Not enough games or minutes to qualify for league ranks yet.'}
        </p>
        {ADVANCED.map(m => (
          <MetricRow key={m.key} label={m.label} hint={m.hint} value={m.fmt(s[m.key])}
            rank={s.qualified ? ranks[m.key] : null} percentile={s.qualified ? pcts[m.key] : null} />
        ))}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-3 border-t border-white/10 text-sm">
          {EXTRA.map(m => (
            <div key={m.key} className="flex justify-between"><span className="text-white/50">{m.label}</span><span className="tabular-nums">{m.fmt(s[m.key])}</span></div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function GameLog({ id, season }){
  const { data, loading, error, reload } = usePlayerGameLog(id, season)
  const games = data?.games || []
  if (loading) return <LoadingSkeleton className="h-96" />
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>
  if (!games.length) return <Card><div className="text-white/60">No games in {seasonLabel(season)}.</div></Card>
  return (
    <Card>
      <h3 className="font-semibold mb-1">Points by game</h3>
      <SimpleLineChart data={games.slice().reverse().map(g => ({ name: shortDate(g.date), value: g.pts }))} label="PTS" />
      <h3 className="font-semibold mt-6 mb-3">{games.length} games</h3>
      <TableWrap minWidth={860}>
        <thead>
          <tr className="text-xs text-white/50 text-left">
            {['Date', 'Opp', 'Result', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV', 'FG', '3PT', 'FT', 'TS%', '+/-'].map(h => <th key={h} className="font-normal pb-2 px-1.5">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.game_id} className="border-t border-white/5">
              <td className="py-1.5 px-1.5 whitespace-nowrap">{shortDate(g.date)}</td>
              <td className="px-1.5 whitespace-nowrap">
                {g.home ? 'vs' : '@'}{' '}
                {g.opponent_team ? <Link to={`/teams/${g.opponent_team.id}`} className="hover:text-accent">{g.opponent}</Link> : g.opponent}
              </td>
              <td className={`px-1.5 ${g.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{g.result}</td>
              <td className="px-1.5">{g.min}</td>
              <td className="px-1.5 font-semibold">{g.pts}</td>
              <td className="px-1.5">{g.reb}</td>
              <td className="px-1.5">{g.ast}</td>
              <td className="px-1.5">{g.stl}</td>
              <td className="px-1.5">{g.blk}</td>
              <td className="px-1.5">{g.tov}</td>
              <td className="px-1.5 whitespace-nowrap">{g.fgm}-{g.fga}</td>
              <td className="px-1.5 whitespace-nowrap">{g.fg3m}-{g.fg3a}</td>
              <td className="px-1.5 whitespace-nowrap">{g.ftm}-{g.fta}</td>
              <td className="px-1.5">{pct(g.ts_pct)}</td>
              <td className={`px-1.5 ${g.plus_minus > 0 ? 'text-emerald-400' : g.plus_minus < 0 ? 'text-red-400' : ''}`}>{signed(g.plus_minus, 0)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  )
}

function Career({ id }){
  const { data, loading, error, reload } = usePlayerCareer(id)
  const [type, setType] = useState('regular')
  if (loading) return <LoadingSkeleton className="h-96" />
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>
  const rows = (type === 'regular' ? data.regular_season : data.playoffs) || []
  const total = type === 'regular' ? data.career : data.career_playoffs
  const hasTotal = season => rows.some(o => o.season === season && o.team === 'TOT')
  // In seasons with a trade NBA.com lists each team plus a "TOT" row; the chart uses the totals.
  const chartRows = rows.filter(r => r.team === 'TOT' || !hasTotal(r.season))
  return (
    <Card>
      <div className="flex gap-1 mb-4 text-xs">
        {[['regular', 'Regular season'], ['playoffs', 'Playoffs']].map(([k, label]) => (
          <button key={k} onClick={() => setType(k)}
            className={`px-3 py-1 rounded-md transition-colors ${type === k ? 'bg-accent/80 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>
      {!rows.length ? <div className="text-white/60">No {type === 'playoffs' ? 'playoff ' : ''}games.</div> : (
        <>
          <h3 className="font-semibold mb-1">Points per game by season</h3>
          <SimpleBarChart data={chartRows.map(r => ({ name: r.season.slice(2), value: r.pts }))} label="PPG" />
          {total && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 my-6">
              <StatTile label="Games" value={total.gp} />
              <StatTile label="Career PPG" value={fixed(total.pts)} sub={`${total.totals.pts?.toLocaleString()} total`} />
              <StatTile label="Career RPG" value={fixed(total.reb)} sub={`${total.totals.reb?.toLocaleString()} total`} />
              <StatTile label="Career APG" value={fixed(total.ast)} sub={`${total.totals.ast?.toLocaleString()} total`} />
              <StatTile label="FG%" value={pct(total.fg_pct)} />
              <StatTile label="TS%" value={pct(total.ts_pct)} />
            </div>
          )}
          <TableWrap minWidth={820}>
            <thead>
              <tr className="text-xs text-white/50 text-left">
                {['Season', 'Team', 'Age', 'GP', 'GS', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV', 'FG%', '3P%', 'FT%', 'TS%'].map(h => <th key={h} className="font-normal pb-2 px-1.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.season}-${r.team}-${i}`} className={`border-t border-white/5 ${r.team === 'TOT' ? 'font-medium' : hasTotal(r.season) ? 'text-white/50' : ''}`}>
                  <td className="py-1.5 px-1.5 whitespace-nowrap">{r.season}</td>
                  <td className="px-1.5">{r.team_id ? <Link to={`/teams/${r.team_id}`} className="hover:text-accent">{r.team}</Link> : r.team}</td>
                  <td className="px-1.5">{r.age ?? '—'}</td>
                  <td className="px-1.5">{r.gp}</td>
                  <td className="px-1.5">{r.gs ?? '—'}</td>
                  <td className="px-1.5">{fixed(r.min)}</td>
                  <td className="px-1.5 font-semibold">{fixed(r.pts)}</td>
                  <td className="px-1.5">{fixed(r.reb)}</td>
                  <td className="px-1.5">{fixed(r.ast)}</td>
                  <td className="px-1.5">{fixed(r.stl)}</td>
                  <td className="px-1.5">{fixed(r.blk)}</td>
                  <td className="px-1.5">{fixed(r.tov)}</td>
                  <td className="px-1.5">{pct(r.fg_pct)}</td>
                  <td className="px-1.5">{pct(r.fg3_pct)}</td>
                  <td className="px-1.5">{pct(r.ft_pct)}</td>
                  <td className="px-1.5">{pct(r.ts_pct)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="text-xs text-white/40 mt-3">Per-game averages. In seasons with a trade, "TOT" is the season total across teams.</p>
        </>
      )}
    </Card>
  )
}

function Shooting({ id, season }){
  const { data, loading, error, reload } = usePlayerShots(id, season)
  if (loading) return <LoadingSkeleton className="h-96" />
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>
  if (!data.total) return <Card><div className="text-white/60">No shots recorded in {seasonLabel(season)}.</div></Card>
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold">Shot Chart <span className="text-white/50 font-normal">{seasonLabel(season)}</span></h3>
          <span className="text-sm text-white/60 tabular-nums">{data.made}/{data.total} · {pct(data.made / data.total)}</span>
        </div>
        <ShotChart shots={data.shots} />
      </Card>
      <Card className="lg:col-span-2">
        <h3 className="font-semibold mb-3">By Zone</h3>
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-white/50 text-left">
              <th className="font-normal pb-2">Zone</th>
              <th className="font-normal pb-2 text-right">FGM-A</th>
              <th className="font-normal pb-2 text-right">FG%</th>
              <th className="font-normal pb-2 text-right">vs Lg</th>
            </tr>
          </thead>
          <tbody>
            {data.zones.map(z => {
              const diff = z.league_fg_pct != null && z.fg_pct != null ? z.fg_pct - z.league_fg_pct : null
              return (
                <tr key={z.zone} className="border-t border-white/5">
                  <td className="py-2">{z.zone}<div className="text-[11px] text-white/40">{pct(z.share, 0)} of shots</div></td>
                  <td className="text-right">{z.fgm}-{z.fga}</td>
                  <td className="text-right font-semibold">{pct(z.fg_pct)}</td>
                  <td className={`text-right ${diff == null ? '' : diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {diff == null ? '—' : `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-white/40 mt-3">"vs Lg" is the difference from the league-average FG% in that zone, in percentage points.</p>
      </Card>
    </div>
  )
}

function Clutch({ id, season }){
  const { data, loading, error, reload } = usePlayerClutch(id, season)
  if (loading) return <LoadingSkeleton className="h-48" />
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>
  const s = data.stats
  return (
    <Card>
      <h3 className="font-semibold">Clutch Performance <span className="text-white/50 font-normal">{seasonLabel(season)}</span></h3>
      <p className="text-xs text-white/40 mb-5">{data.definition}</p>
      {!s ? <div className="text-white/60">No clutch minutes this season.</div> : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-5">
            <StatTile label="Clutch games" value={s.gp} sub={`${s.w}-${s.l} record`} />
            <StatTile label="Total clutch PTS" value={s.total_pts} sub={data.total_pts_rank ? `#${data.total_pts_rank} of ${data.players_with_clutch_minutes} in NBA` : null} />
            <StatTile label="PTS / game" value={fixed(s.pts)} />
            <StatTile label="FG" value={`${s.fgm}-${s.fga}`} sub={pct(s.fg_pct)} />
            <StatTile label="3PT" value={`${s.fg3m}-${s.fg3a}`} sub={pct(s.fg3_pct)} />
            <StatTile label="FT" value={`${s.ftm}-${s.fta}`} sub={pct(s.ft_pct)} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-5 mt-5">
            <StatTile label="TS%" value={pct(s.ts_pct)} />
            <StatTile label="MIN / game" value={fixed(s.min)} />
            <StatTile label="AST / game" value={fixed(s.ast)} />
            <StatTile label="REB / game" value={fixed(s.reb)} />
            <StatTile label="TOV / game" value={fixed(s.tov)} />
            <StatTile label="+/- / game" value={signed(s.plus_minus)} />
          </div>
        </>
      )}
    </Card>
  )
}
