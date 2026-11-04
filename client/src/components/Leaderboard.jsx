import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeaders } from '../hooks/usePlayers'
import LoadingSkeleton from './LoadingSkeleton'
import ErrorState from './ErrorState'
import { fixed, pct, signed } from '../utils/format'

const STATS = [
  { key: 'pts', label: 'PTS', fmt: fixed },
  { key: 'reb', label: 'REB', fmt: fixed },
  { key: 'ast', label: 'AST', fmt: fixed },
  { key: 'stl', label: 'STL', fmt: fixed },
  { key: 'blk', label: 'BLK', fmt: fixed },
  { key: 'fg3m', label: '3PM', fmt: fixed },
  { key: 'per', label: 'PER', fmt: fixed },
  { key: 'ts_pct', label: 'TS%', fmt: pct },
  { key: 'usg_pct', label: 'USG%', fmt: pct },
  { key: 'net_rating', label: 'NET', fmt: signed },
]

// League leaders for any stat, qualified players only.
export default function Leaderboard({ limit = 10, season }){
  const [stat, setStat] = useState('per')
  const { data, loading, error, reload } = useLeaders(stat, limit, season)
  const current = STATS.find(s => s.key === stat)
  const leaders = data?.leaders || []

  return (
    <div>
      <h3 className="font-semibold mb-3">League Leaders</h3>
      <div className="flex flex-wrap gap-1 mb-3">
        {STATS.map(s => (
          <button
            key={s.key}
            onClick={() => setStat(s.key)}
            className={`px-2 py-1 rounded-md text-xs transition-colors ${s.key === stat ? 'bg-accent/80 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {loading && <LoadingSkeleton className="h-64" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && leaders.length === 0 && <div className="text-sm text-white/60">No qualified players yet this season.</div>}
      {leaders.length > 0 && (
        <>
          <ol className="space-y-1.5 text-sm">
            {leaders.map(p => (
              <li key={p.player_id} className="flex items-center gap-3">
                <span className="w-5 text-white/40 tabular-nums">{p.rank}</span>
                <img src={p.headshot} alt="" loading="lazy" className="w-9 h-7 object-cover object-top rounded bg-white/5" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                <Link to={`/players/${p.player_id}`} className="flex-1 min-w-0 truncate hover:text-accent transition-colors">
                  {p.name} <span className="text-white/40">{p.team?.abbreviation}</span>
                </Link>
                <span className="font-semibold tabular-nums">{current.fmt(p.value)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 text-xs text-white/40">{data.label}. Qualified: {data.qualification.toLowerCase()}.{stat === 'per' && ' PER is calculated from NBA.com totals (league average = 15).'}</div>
        </>
      )}
    </div>
  )
}
