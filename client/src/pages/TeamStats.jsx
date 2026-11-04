import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorState from '../components/ErrorState'
import SeasonSelect from '../components/SeasonSelect'
import { Tabs, TableWrap, SortTh } from '../components/Stats'
import { useTeams } from '../hooks/useTeams'
import { currentSeason, seasonLabel } from '../utils/season'
import { fixed, pct, signed } from '../utils/format'

// Columns for the rankings table. `low` = lower is better (sorts ascending first).
const COLUMNS = [
  { key: 'win_pct', label: 'W-L', fmt: (v, t) => `${t.wins}-${t.losses}`, title: 'Record' },
  { key: 'net_rating', label: 'NET', fmt: v => signed(v), title: 'Net rating: points per 100 possessions, scored minus allowed' },
  { key: 'off_rating', label: 'ORTG', fmt: v => fixed(v), title: 'Offensive rating: points scored per 100 possessions' },
  { key: 'def_rating', label: 'DRTG', fmt: v => fixed(v), low: true, title: 'Defensive rating: points allowed per 100 possessions' },
  { key: 'pace', label: 'PACE', fmt: v => fixed(v), title: 'Possessions per 48 minutes' },
  { key: 'pts', label: 'PTS', fmt: v => fixed(v), title: 'Points per game' },
  { key: 'opp_pts', label: 'OPP', fmt: v => fixed(v), low: true, title: 'Opponent points per game' },
  { key: 'ts_pct', label: 'TS%', fmt: v => pct(v), title: 'True shooting %' },
  { key: 'efg_pct', label: 'eFG%', fmt: v => pct(v), title: 'Effective field goal %' },
  { key: 'fg3_pct', label: '3P%', fmt: v => pct(v), title: '3-point %' },
  { key: 'reb', label: 'REB', fmt: v => fixed(v), title: 'Rebounds per game' },
  { key: 'ast', label: 'AST', fmt: v => fixed(v), title: 'Assists per game' },
  { key: 'tov', label: 'TOV', fmt: v => fixed(v), low: true, title: 'Turnovers per game' },
]

export default function TeamStats(){
  const [params, setParams] = useSearchParams()
  const season = Number(params.get('season')) || currentSeason()
  const view = params.get('view') === 'rankings' ? 'rankings' : 'teams'
  const { data, loading, error, reload } = useTeams(season)
  const teams = data?.teams || []
  const [filter, setFilter] = useState('')

  const set = (key, value, def) => setParams(prev => {
    const next = new URLSearchParams(prev)
    if (String(value) === String(def)) next.delete(key); else next.set(key, value)
    return next
  }, { replace: true })

  const filtered = teams.filter(t => `${t.name} ${t.abbreviation}`.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Teams</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SeasonSelect value={season} onChange={y => set('season', y, currentSeason())} />
          <input placeholder="Filter teams" value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 text-sm rounded-md bg-white/5 border border-white/10 outline-none focus:border-accent/60 placeholder:text-white/40" />
        </div>
      </div>

      <Tabs tabs={[{ key: 'teams', label: 'All Teams' }, { key: 'rankings', label: 'Rankings' }]} value={view} onChange={v => set('view', v, 'teams')} />

      {loading && <LoadingSkeleton className="h-96" />}
      {error && <Card><ErrorState error={error} onRetry={reload} /></Card>}
      {data && teams.length === 0 && <Card><div className="text-white/60">No team stats for {seasonLabel(season)} yet.</div></Card>}
      {teams.length > 0 && view === 'teams' && <TeamGrid teams={filtered} season={season} />}
      {teams.length > 0 && view === 'rankings' && <Rankings teams={filtered} season={season} />}
    </div>
  )
}

function TeamGrid({ teams, season }){
  const q = season === currentSeason() ? '' : `?season=${season}`
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map(t => (
        <Link key={t.id} to={`/teams/${t.id}${q}`} className="block">
          <Card interactive className="h-full">
            <div className="flex items-center gap-4">
              <img src={t.logo} alt="" className="w-12 h-12" loading="lazy" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-xs text-white/50">
                  {t.wins}-{t.losses}{t.seed ? ` · ${t.seed}${t.seed === 1 ? 'st' : t.seed === 2 ? 'nd' : t.seed === 3 ? 'rd' : 'th'} in ${t.conference}` : ''}
                  {t.streak ? ` · ${t.streak}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold tabular-nums ${t.net_rating > 0 ? 'text-emerald-400' : t.net_rating < 0 ? 'text-red-400' : ''}`}>{signed(t.net_rating)}</div>
                <div className="text-[11px] text-white/40">Net rating</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 text-center text-xs">
              <Mini label="ORTG" value={fixed(t.off_rating)} rank={t.ranks?.off_rating} />
              <Mini label="DRTG" value={fixed(t.def_rating)} rank={t.ranks?.def_rating} />
              <Mini label="PACE" value={fixed(t.pace)} rank={t.ranks?.pace} />
              <Mini label="PTS" value={fixed(t.pts)} rank={t.ranks?.pts} />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function Mini({ label, value, rank }){
  return (
    <div className="rounded-md bg-white/5 py-1.5">
      <div className="font-semibold tabular-nums text-sm">{value}</div>
      <div className="text-white/40">{label}{rank ? ` · ${rank}` : ''}</div>
    </div>
  )
}

function Rankings({ teams, season }){
  const [sort, setSort] = useState({ key: 'net_rating', dir: 'desc' })
  const onSort = key => setSort(s => {
    const col = COLUMNS.find(c => c.key === key)
    if (s.key === key) return { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
    return { key, dir: col?.low ? 'asc' : 'desc' }
  })
  const rows = useMemo(() => [...teams].sort((a, b) => {
    const va = a[sort.key] ?? -Infinity, vb = b[sort.key] ?? -Infinity
    return sort.dir === 'desc' ? vb - va : va - vb
  }), [teams, sort])
  const q = season === currentSeason() ? '' : `?season=${season}`

  return (
    <Card>
      <TableWrap minWidth={960}>
        <thead>
          <tr className="text-xs text-white/50 text-left">
            <th className="font-normal pb-2 px-1.5 w-6">#</th>
            <th className="font-normal pb-2 px-1.5">Team</th>
            {COLUMNS.map(c => <SortTh key={c.key} label={c.label} k={c.key} sort={sort} onSort={onSort} title={c.title} className="text-right" />)}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.03]">
              <td className="py-2 px-1.5 text-white/40">{i + 1}</td>
              <td className="px-1.5">
                <Link to={`/teams/${t.id}${q}`} className="flex items-center gap-2 hover:text-accent transition-colors whitespace-nowrap">
                  <img src={t.logo} alt="" className="w-5 h-5" loading="lazy" />{t.abbreviation}
                </Link>
              </td>
              {COLUMNS.map(c => (
                <td key={c.key} className={`px-1.5 text-right ${sort.key === c.key ? 'text-white font-semibold' : 'text-white/80'}`}>{c.fmt(t[c.key], t)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="text-xs text-white/40 mt-3">Click a column to sort. Ratings are per 100 possessions, from NBA.com. Hover a column name for its meaning.</p>
    </Card>
  )
}
