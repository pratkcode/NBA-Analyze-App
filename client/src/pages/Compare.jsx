import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import RadarCompare from '../components/charts/RadarCompare'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import SeasonSelect from '../components/SeasonSelect'
import { Tabs } from '../components/Stats'
import { useComparePlayers } from '../hooks/usePlayers'
import { useCompareTeams, useTeamList } from '../hooks/useTeams'
import { currentSeason, seasonLabel } from '../utils/season'
import { fixed, pct, signed } from '../utils/format'

const COLORS = ['#7c5cff', '#00d8ff']

// Rows for the side-by-side table. `low` = lower is better. `radar` = shown on the radar.
const PLAYER_ROWS = [
  { group: 'Per game' },
  { key: 'gp', label: 'Games', fmt: v => v ?? '—', neutral: true },
  { key: 'min', label: 'Minutes', fmt: v => fixed(v), neutral: true },
  { key: 'pts', label: 'Points', fmt: v => fixed(v), radar: 'PTS' },
  { key: 'reb', label: 'Rebounds', fmt: v => fixed(v), radar: 'REB' },
  { key: 'ast', label: 'Assists', fmt: v => fixed(v), radar: 'AST' },
  { key: 'stl', label: 'Steals', fmt: v => fixed(v), radar: 'STL' },
  { key: 'blk', label: 'Blocks', fmt: v => fixed(v), radar: 'BLK' },
  { key: 'tov', label: 'Turnovers', fmt: v => fixed(v), low: true },
  { group: 'Shooting' },
  { key: 'fg_pct', label: 'FG%', fmt: v => pct(v) },
  { key: 'fg3_pct', label: '3P%', fmt: v => pct(v) },
  { key: 'ft_pct', label: 'FT%', fmt: v => pct(v) },
  { key: 'ts_pct', label: 'True Shooting %', fmt: v => pct(v), radar: 'TS%' },
  { key: 'efg_pct', label: 'Effective FG %', fmt: v => pct(v) },
  { group: 'Advanced' },
  { key: 'per', label: 'PER', fmt: v => fixed(v), radar: 'PER' },
  { key: 'usg_pct', label: 'Usage %', fmt: v => pct(v), neutral: true, radar: 'USG%' },
  { key: 'off_rating', label: 'Offensive Rating', fmt: v => fixed(v) },
  { key: 'def_rating', label: 'Defensive Rating', fmt: v => fixed(v), low: true },
  { key: 'net_rating', label: 'Net Rating', fmt: v => signed(v), radar: 'NET' },
  { key: 'pie', label: 'PIE', fmt: v => pct(v) },
  { key: 'ast_pct', label: 'Assist %', fmt: v => pct(v) },
  { key: 'reb_pct', label: 'Rebound %', fmt: v => pct(v) },
]

const TEAM_ROWS = [
  { group: 'Results' },
  { key: 'win_pct', label: 'Record', fmt: (v, t) => `${t.wins}-${t.losses}` },
  { key: 'net_rating', label: 'Net Rating', fmt: v => signed(v), radar: 'NET' },
  { key: 'off_rating', label: 'Offensive Rating', fmt: v => fixed(v), radar: 'OFF' },
  { key: 'def_rating', label: 'Defensive Rating', fmt: v => fixed(v), low: true, radar: 'DEF' },
  { key: 'pace', label: 'Pace', fmt: v => fixed(v), neutral: true, radar: 'PACE' },
  { group: 'Per game' },
  { key: 'pts', label: 'Points', fmt: v => fixed(v) },
  { key: 'opp_pts', label: 'Opponent points', fmt: v => fixed(v), low: true },
  { key: 'reb', label: 'Rebounds', fmt: v => fixed(v), radar: 'REB' },
  { key: 'ast', label: 'Assists', fmt: v => fixed(v), radar: 'AST' },
  { key: 'stl', label: 'Steals', fmt: v => fixed(v) },
  { key: 'blk', label: 'Blocks', fmt: v => fixed(v) },
  { key: 'tov', label: 'Turnovers', fmt: v => fixed(v), low: true },
  { group: 'Shooting' },
  { key: 'ts_pct', label: 'True Shooting %', fmt: v => pct(v), radar: 'TS%' },
  { key: 'efg_pct', label: 'Effective FG %', fmt: v => pct(v) },
  { key: 'fg3_pct', label: '3P%', fmt: v => pct(v) },
  { key: 'fg3a', label: '3PA per game', fmt: v => fixed(v), neutral: true },
]

export default function Compare(){
  // Everything lives in the URL (?type=teams&a=ID&b=ID&season=YEAR) so comparisons can be shared.
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'teams' ? 'teams' : 'players'
  const season = Number(params.get('season')) || currentSeason()
  const a = params.get('a'), b = params.get('b')

  const set = updates => setParams(prev => {
    const next = new URLSearchParams(prev)
    Object.entries(updates).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, v)))
    return next
  }, { replace: true })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold">Compare</h1>
          <p className="text-white/60">{seasonLabel(season)} regular season</p>
        </div>
        <SeasonSelect value={season} onChange={y => set({ season: y === currentSeason() ? null : y })} />
      </div>
      <Tabs tabs={[{ key: 'players', label: 'Players' }, { key: 'teams', label: 'Teams' }]} value={type}
        onChange={t => set({ type: t === 'players' ? null : t, a: null, b: null })} />
      {type === 'players'
        ? <PlayerCompare a={a} b={b} season={season} onPick={(slot, id) => set({ [slot]: id })} />
        : <TeamCompare a={a} b={b} season={season} onPick={(slot, id) => set({ [slot]: id })} />}
    </div>
  )
}

function PlayerCompare({ a, b, season, onPick }){
  const ids = [a, b].filter(Boolean)
  // Fetch even with one pick, so the chosen player's name shows straight away.
  const { data, loading, error, reload } = useComparePlayers(ids.length === 2 ? ids : ids.concat(ids), season)
  const byId = Object.fromEntries((data?.players || []).map(p => [String(p.id), p]))
  const pa = a ? byId[a] : null, pb = b ? byId[b] : null

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {[['a', pa, a], ['b', pb, b]].map(([slot, p, id], i) => (
          <Card key={slot}>
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70"><span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />Player {slot.toUpperCase()}</div>
            <PlayerSearch onSelect={pl => onPick(slot, pl.id)} placeholder="Search a player" />
            {id && (
              <div className="mt-4 flex items-center gap-3">
                {p && <img src={p.headshot} alt="" className="w-16 h-12 object-cover object-top rounded bg-white/5" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />}
                <div>
                  <Link to={`/players/${id}`} className="text-lg font-semibold hover:underline">{p?.name || (loading ? 'Loading…' : `Player ${id}`)}</Link>
                  <div className="text-xs text-white/50">{p?.stats ? `${p.stats.team} · ${p.stats.gp} games` : !loading && p ? `Did not play in ${seasonLabel(season)}` : ''}</div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        {ids.length < 2 ? <div className="text-white/60">Pick two players to compare.</div>
          : loading ? <LoadingSkeleton className="h-80" />
          : error ? <ErrorState error={error} onRetry={reload} />
          : !pa?.stats || !pb?.stats ? <div className="text-white/60">Both players need {seasonLabel(season)} stats to compare. Try another season.</div>
          : (
            <CompareBody
              rows={PLAYER_ROWS} statsA={pa.stats} statsB={pb.stats} nameA={pa.name} nameB={pb.name}
              radar={PLAYER_ROWS.filter(r => r.radar).map(r => ({ label: r.radar, a: pa.stats.percentiles?.[r.key] ?? 0, b: pb.stats.percentiles?.[r.key] ?? 0 }))}
              note={`Radar shows each player's league percentile (100 = best) among ${data.qualified_count} qualified players. PER is calculated from NBA.com totals.`}
            />
          )}
      </Card>
    </>
  )
}

function TeamCompare({ a, b, season, onPick }){
  const list = useTeamList()
  const ids = [a, b].filter(Boolean)
  const { data, loading, error, reload } = useCompareTeams(ids, season)
  const [ta, tb] = data?.teams || []
  const n = data?.team_count || 30
  const pctile = rank => (rank ? Math.round(100 * (n - rank) / (n - 1)) : 0)

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {[['a', a], ['b', b]].map(([slot, id], i) => {
          const t = list.data?.find(x => String(x.id) === id)
          return (
            <Card key={slot}>
              <div className="mb-3 flex items-center gap-2 text-sm text-white/70"><span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />Team {slot.toUpperCase()}</div>
              <div className="flex items-center gap-3">
                {t && <img src={t.logo} alt="" className="w-12 h-12" />}
                <select value={id || ''} onChange={e => onPick(slot, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 outline-none focus:border-accent/60 [&>option]:bg-[#141418]">
                  <option value="">Choose a team…</option>
                  {(list.data || []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              {list.error && <ErrorState error={list.error} onRetry={list.reload} className="mt-2" />}
            </Card>
          )
        })}
      </div>
      <Card className="mt-6">
        {ids.length < 2 ? <div className="text-white/60">Pick two teams to compare.</div>
          : loading ? <LoadingSkeleton className="h-80" />
          : error ? <ErrorState error={error} onRetry={reload} />
          : !ta?.gp || !tb?.gp ? <div className="text-white/60">No {seasonLabel(season)} stats for one of these teams yet.</div>
          : (
            <CompareBody
              rows={TEAM_ROWS} statsA={ta} statsB={tb} nameA={ta.name} nameB={tb.name}
              radar={TEAM_ROWS.filter(r => r.radar).map(r => ({ label: r.radar, a: pctile(ta.ranks?.[r.key]), b: pctile(tb.ranks?.[r.key]) }))}
              note={`Radar shows each team's percentile among ${n} teams (100 = best; for DEF, best defense).`}
            />
          )}
      </Card>
    </>
  )
}

function CompareBody({ rows, statsA, statsB, nameA, nameB, radar, note }){
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <RadarCompare keys={radar.map(r => r.label)} dataA={radar.map(r => r.a)} dataB={radar.map(r => r.b)} nameA={nameA} nameB={nameB} />
        <p className="text-xs text-white/40 text-center mt-1">{note}</p>
      </div>
      <table className="w-full text-sm tabular-nums">
        <tbody>
          {rows.map((r, i) => r.group ? (
            <tr key={`g${i}`}><td colSpan={3} className="pt-4 pb-1 text-xs uppercase tracking-wide text-white/40 text-center">{r.group}</td></tr>
          ) : (
            <CompareRow key={r.key} row={r} a={statsA} b={statsB} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompareRow({ row, a, b }){
  const va = a[row.key], vb = b[row.key]
  const comparable = !row.neutral && va != null && vb != null && va !== vb
  const aBetter = comparable && (row.low ? va < vb : va > vb)
  const bBetter = comparable && !aBetter
  return (
    <tr className="border-t border-white/5">
      <td className={`py-1.5 text-right w-[38%] ${aBetter ? 'font-semibold text-[#a08cff]' : ''}`}>{row.fmt(va, a)}</td>
      <td className="py-1.5 text-center text-xs text-white/50 px-2">{row.label}</td>
      <td className={`py-1.5 w-[38%] ${bBetter ? 'font-semibold text-[#00d8ff]' : ''}`}>{row.fmt(vb, b)}</td>
    </tr>
  )
}
