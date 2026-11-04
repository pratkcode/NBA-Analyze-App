import React, { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import SeasonSelect from '../components/SeasonSelect'
import SimpleBarChart from '../components/charts/SimpleBarChart'
import { StatTile, MetricRow, Tabs, TableWrap, SortTh } from '../components/Stats'
import { useTeamProfile, useTeamHistory } from '../hooks/useTeams'
import { currentSeason, seasonLabel } from '../utils/season'
import { fixed, pct, signed, shortDate, ordinal, tipoff } from '../utils/format'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'roster', label: 'Roster' },
  { key: 'games', label: 'Games' },
  { key: 'history', label: 'History' },
]

// Shown with a league rank out of 30 and a percentile bar.
const RATINGS = [
  { key: 'net_rating', label: 'Net Rating', fmt: signed, hint: 'Points per 100 possessions, scored minus allowed.' },
  { key: 'off_rating', label: 'Offensive Rating', fmt: fixed, hint: 'Points scored per 100 possessions.' },
  { key: 'def_rating', label: 'Defensive Rating', fmt: fixed, hint: 'Points allowed per 100 possessions (lower is better).' },
  { key: 'pace', label: 'Pace', fmt: fixed, hint: 'Possessions per 48 minutes.' },
  { key: 'ts_pct', label: 'True Shooting %', fmt: pct },
  { key: 'efg_pct', label: 'Effective FG %', fmt: pct },
  { key: 'fg3_pct', label: '3-Point %', fmt: pct },
  { key: 'tov', label: 'Turnovers / game', fmt: fixed },
]

export default function TeamProfile(){
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const season = Number(params.get('season')) || currentSeason()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'overview'
  const set = (key, value, def) => setParams(prev => {
    const next = new URLSearchParams(prev)
    if (String(value) === String(def)) next.delete(key); else next.set(key, value)
    return next
  }, { replace: true })

  const { data, loading, error, reload } = useTeamProfile(id, season)

  if (loading) return <div className="max-w-7xl mx-auto"><LoadingSkeleton className="h-64" /></div>
  if (error) return <div className="max-w-7xl mx-auto"><Card><ErrorState error={error} onRetry={reload} /></Card></div>
  if (!data) return null
  const t = data.team

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <img src={t.logo} alt="" className="w-24 h-24 self-center" />
          <div className="flex-1">
            <div className="text-sm text-white/50">{t.conference ? `${t.conference}ern Conference` : ''}</div>
            <h1 className="text-3xl md:text-4xl font-extrabold">{t.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <StatTile label="Record" value={t.wins != null ? `${t.wins}-${t.losses}` : '—'} />
              <StatTile label="Conference seed" value={t.seed ? ordinal(t.seed) : '—'} />
              <StatTile label="Streak" value={t.streak || '—'} />
              <StatTile label="Last 10" value={t.last10 || '—'} />
              <StatTile label="Home / Road" value={t.home ? `${t.home} / ${t.road}` : '—'} />
            </div>
          </div>
          <div className="md:self-start flex flex-col gap-3 md:items-end">
            <SeasonSelect value={season} onChange={y => set('season', y, currentSeason())} />
            <Link to={`/compare?type=teams&a=${t.id}`} className="text-sm text-accent hover:underline">Compare →</Link>
          </div>
        </div>
      </Card>

      <Tabs tabs={TABS} value={tab} onChange={v => set('tab', v, 'overview')} />
      {tab === 'overview' && <Overview data={data} season={season} />}
      {tab === 'roster' && <Roster data={data} season={season} />}
      {tab === 'games' && <Games data={data} teamId={t.id} season={season} />}
      {tab === 'history' && <History id={t.id} />}
    </div>
  )
}

function Overview({ data, season }){
  const t = data.team
  const roster = data.roster?.players || []
  const leaders = ['pts', 'reb', 'ast'].map(k => {
    const best = roster.filter(p => p.stats).sort((a, b) => (b.stats[k] || 0) - (a.stats[k] || 0))[0]
    return { k, label: { pts: 'Points', reb: 'Rebounds', ast: 'Assists' }[k], p: best }
  })
  const n = data.team_count || 30
  const pctile = rank => (rank ? Math.round(100 * (n - rank) / (n - 1)) : null)
  const clutch = data.clutch?.stats

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card>
        <h3 className="font-semibold">Team Ratings</h3>
        <p className="text-xs text-white/40 mb-2">Rank among {n} teams, {seasonLabel(season)}.</p>
        {RATINGS.map(r => (
          <MetricRow key={r.key} label={r.label} hint={r.hint} value={r.fmt(t[r.key])} rank={t.ranks?.[r.key]} total={n} percentile={pctile(t.ranks?.[r.key])} />
        ))}
      </Card>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <h3 className="font-semibold mb-4">Per Game</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <StatTile label="PTS" value={fixed(t.pts)} sub={t.ranks?.pts && `${ordinal(t.ranks.pts)} in NBA`} />
            <StatTile label="OPP PTS" value={fixed(t.opp_pts)} sub={t.ranks?.opp_pts && `${ordinal(t.ranks.opp_pts)} in NBA`} />
            <StatTile label="REB" value={fixed(t.reb)} sub={t.ranks?.reb && `${ordinal(t.ranks.reb)} in NBA`} />
            <StatTile label="AST" value={fixed(t.ast)} sub={t.ranks?.ast && `${ordinal(t.ranks.ast)} in NBA`} />
            <StatTile label="STL" value={fixed(t.stl)} sub={t.ranks?.stl && `${ordinal(t.ranks.stl)} in NBA`} />
            <StatTile label="BLK" value={fixed(t.blk)} sub={t.ranks?.blk && `${ordinal(t.ranks.blk)} in NBA`} />
          </div>
        </Card>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold mb-3">Team Leaders</h3>
            {data.roster_error && <div className="text-sm text-white/60">{data.roster_error}</div>}
            <ul className="space-y-3">
              {leaders.filter(l => l.p).map(({ k, label, p }) => (
                <li key={k} className="flex items-center gap-3">
                  <img src={p.headshot} alt="" className="w-12 h-9 object-cover object-top rounded bg-white/5" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/50">{label}</div>
                    <Link to={`/players/${p.player_id}`} className="font-medium hover:text-accent truncate block">{p.name}</Link>
                  </div>
                  <div className="text-xl font-bold tabular-nums">{fixed(p.stats[k])}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">Clutch</h3>
            <p className="text-xs text-white/40 mb-3">{data.clutch?.definition}</p>
            {data.clutch_error && <div className="text-sm text-white/60">{data.clutch_error}</div>}
            {!data.clutch_error && !clutch && <div className="text-sm text-white/60">No clutch games yet.</div>}
            {clutch && (
              <div className="grid grid-cols-3 gap-4">
                <StatTile label="Clutch record" value={`${clutch.w}-${clutch.l}`} />
                <StatTile label="+/- per game" value={signed(clutch.plus_minus)} />
                <StatTile label="FG%" value={pct(clutch.fg_pct)} sub={`${clutch.fgm}-${clutch.fga}`} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

const ROSTER_COLS = [
  { key: 'gp', label: 'GP', fmt: v => v ?? '—' },
  { key: 'min', label: 'MIN', fmt: fixed },
  { key: 'pts', label: 'PTS', fmt: fixed },
  { key: 'reb', label: 'REB', fmt: fixed },
  { key: 'ast', label: 'AST', fmt: fixed },
  { key: 'stl', label: 'STL', fmt: fixed },
  { key: 'blk', label: 'BLK', fmt: fixed },
  { key: 'ts_pct', label: 'TS%', fmt: pct },
  { key: 'usg_pct', label: 'USG%', fmt: pct },
  { key: 'per', label: 'PER', fmt: fixed },
  { key: 'net_rating', label: 'NET', fmt: signed },
]

function Roster({ data, season }){
  const [sort, setSort] = useState({ key: 'pts', dir: 'desc' })
  const players = data.roster?.players || []
  const rows = useMemo(() => [...players].sort((a, b) => {
    const va = a.stats?.[sort.key] ?? -Infinity, vb = b.stats?.[sort.key] ?? -Infinity
    return sort.dir === 'desc' ? vb - va : va - vb
  }), [players, sort])
  const onSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  if (data.roster_error) return <Card><div className="text-white/60">{data.roster_error}</div></Card>
  const coaches = data.roster?.coaches || []
  const head = coaches.find(c => c.type === 'Head Coach')
  return (
    <Card>
      <div className="flex flex-wrap justify-between gap-2 mb-3">
        <h3 className="font-semibold">{seasonLabel(season)} Roster <span className="text-white/50 font-normal">· {players.length} players</span></h3>
        {head && <span className="text-sm text-white/60">Head coach: {head.name}</span>}
      </div>
      <TableWrap minWidth={1000}>
        <thead>
          <tr className="text-xs text-white/50 text-left">
            <th className="font-normal pb-2 px-1.5">Player</th>
            <th className="font-normal pb-2 px-1.5">#</th>
            <th className="font-normal pb-2 px-1.5">Pos</th>
            <th className="font-normal pb-2 px-1.5">Ht</th>
            <th className="font-normal pb-2 px-1.5">Age</th>
            {ROSTER_COLS.map(c => <SortTh key={c.key} label={c.label} k={c.key} sort={sort} onSort={onSort} className="text-right" />)}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.player_id} className="border-t border-white/5 hover:bg-white/[0.03]">
              <td className="py-1.5 px-1.5">
                <Link to={`/players/${p.player_id}${season === currentSeason() ? '' : `?season=${season}`}`} className="flex items-center gap-2 hover:text-accent whitespace-nowrap">
                  <img src={p.headshot} alt="" loading="lazy" className="w-9 h-7 object-cover object-top rounded bg-white/5" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                  {p.name}
                </Link>
              </td>
              <td className="px-1.5 text-white/60">{p.number || '—'}</td>
              <td className="px-1.5 text-white/60">{p.position || '—'}</td>
              <td className="px-1.5 text-white/60 whitespace-nowrap">{p.height || '—'}</td>
              <td className="px-1.5 text-white/60">{p.age != null ? Math.floor(p.age) : '—'}</td>
              {ROSTER_COLS.map(c => (
                <td key={c.key} className={`px-1.5 text-right ${sort.key === c.key ? 'font-semibold' : 'text-white/80'}`}>{p.stats ? c.fmt(p.stats[c.key]) : '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="text-xs text-white/40 mt-3">Per-game stats with this team. "—" means the player hasn't played for them this season.</p>
    </Card>
  )
}

function Games({ data, teamId, season }){
  const results = data.results || []
  const upcoming = data.upcoming || []
  const margins = results.slice(0, 15).reverse().map(g => {
    const us = g.home.id === teamId ? g.home : g.away
    const them = g.home.id === teamId ? g.away : g.home
    return { name: `${shortDate(g.date)}`, value: us.score - them.score, opp: them.abbreviation }
  })
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <h3 className="font-semibold mb-1">Point differential, last {margins.length} games</h3>
        {margins.length > 0 && <SimpleBarChart data={margins} label="Margin" />}
        <h3 className="font-semibold mt-6 mb-3">Results</h3>
        {data.results_error && <div className="text-sm text-white/60">{data.results_error}</div>}
        {!data.results_error && !results.length && <div className="text-sm text-white/60">No games played in {seasonLabel(season)} yet.</div>}
        <ul className="text-sm divide-y divide-white/5">
          {results.map(g => {
            const home = g.home.id === teamId
            const us = home ? g.home : g.away
            const them = home ? g.away : g.home
            return (
              <li key={g.game_id} className="flex items-center gap-3 py-2">
                <span className="w-14 text-xs text-white/50">{shortDate(g.date)}</span>
                <span className={`w-5 font-semibold ${us.won ? 'text-emerald-400' : 'text-red-400'}`}>{us.won ? 'W' : 'L'}</span>
                <span className="flex-1 flex items-center gap-2">
                  <span className="text-white/40">{home ? 'vs' : '@'}</span>
                  <img src={them.logo} alt="" className="w-5 h-5" loading="lazy" />
                  <Link to={`/teams/${them.id}`} className="hover:text-accent">{them.name}</Link>
                </span>
                <span className="tabular-nums">{us.score}-{them.score}</span>
              </li>
            )
          })}
        </ul>
      </Card>
      <Card>
        <h3 className="font-semibold mb-3">Upcoming</h3>
        {data.upcoming_error && <div className="text-sm text-white/60">{data.upcoming_error}</div>}
        {!data.upcoming_error && !upcoming.length && <div className="text-sm text-white/60">{season === currentSeason() ? 'No upcoming games scheduled.' : 'Season complete.'}</div>}
        <ul className="space-y-3 text-sm">
          {upcoming.map(g => {
            const home = g.home.id === teamId
            const them = home ? g.away : g.home
            return (
              <li key={g.game_id} className="flex items-center gap-3">
                <div className="w-20 text-xs text-white/50">{shortDate(g.date)}<div>{tipoff(g.start_utc)}</div></div>
                <span className="text-white/40">{home ? 'vs' : '@'}</span>
                <img src={them.logo} alt="" className="w-5 h-5" loading="lazy" />
                <Link to={`/teams/${them.id}`} className="hover:text-accent truncate">{them.name}</Link>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function History({ id }){
  const { data, loading, error, reload } = useTeamHistory(id)
  if (loading) return <LoadingSkeleton className="h-96" />
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>
  const rows = [...(data.history || [])].reverse()
  const recent = rows.slice(0, 25).reverse()
  const titles = rows.filter(r => r.finals === 'LEAGUE CHAMPION').length
  return (
    <Card>
      <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
        <StatTile label="Seasons" value={rows.length} />
        <StatTile label="Championships" value={titles} />
        <StatTile label="Finals appearances" value={rows.filter(r => r.finals && r.finals !== 'N/A').length} />
        <StatTile label="Playoff seasons" value={rows.filter(r => r.po_wins + r.po_losses > 0).length} />
      </div>
      <h3 className="font-semibold mb-1">Wins per season (last {recent.length})</h3>
      <SimpleBarChart data={recent.map(r => ({ name: r.season.slice(2), value: r.wins }))} label="Wins" />
      <TableWrap minWidth={560}>
        <thead>
          <tr className="text-xs text-white/50 text-left">
            {['Season', 'W-L', 'Win %', 'Conf rank', 'Playoffs', 'PTS'].map(h => <th key={h} className="font-normal pb-2 px-1.5">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.season} className="border-t border-white/5">
              <td className="py-1.5 px-1.5">{r.season}</td>
              <td className="px-1.5">{r.wins}-{r.losses}</td>
              <td className="px-1.5">{pct(r.win_pct)}</td>
              <td className="px-1.5">{r.conf_rank || '—'}</td>
              <td className={`px-1.5 ${r.finals === 'LEAGUE CHAMPION' ? 'text-amber-300 font-semibold' : ''}`}>
                {r.finals === 'LEAGUE CHAMPION' ? 'Champions' : r.finals && r.finals !== 'N/A' ? 'Lost Finals' : r.po_wins + r.po_losses > 0 ? `${r.po_wins}-${r.po_losses}` : '—'}
              </td>
              <td className="px-1.5">{fixed(r.pts)}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  )
}
