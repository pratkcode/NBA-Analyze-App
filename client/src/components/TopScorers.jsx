import React from 'react'
import { Link } from 'react-router-dom'
import { useLeaders } from '../hooks/usePlayers'
import LoadingSkeleton from './LoadingSkeleton'
import ErrorState from './ErrorState'
import SimpleBarChart from './charts/SimpleBarChart'

// Top scorers this season (points per game, qualified players only).
export default function TopScorers({ limit = 7, season }){
  const { data, loading, error, reload } = useLeaders('pts', limit, season)
  const leaders = data?.leaders || []

  return (
    <div>
      <h3 className="font-semibold mb-3">Top Scorers</h3>
      {loading && <LoadingSkeleton className="h-48" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && leaders.length === 0 && <div className="text-sm text-white/60">No scoring data for this season yet.</div>}
      {leaders.length > 0 && (
        <>
          <SimpleBarChart data={leaders.map(p => ({ name: p.name.split(' ').slice(-1)[0], value: p.value }))} />
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {leaders.map(p => (
              <li key={p.player_id} className="flex justify-between items-center">
                <Link to={`/players/${p.player_id}`} className="font-medium hover:text-accent transition-colors">
                  {p.name} <span className="text-white/50 font-normal">{p.team?.abbreviation}</span>
                </Link>
                <div className="text-lg font-semibold tabular-nums">{p.value.toFixed(1)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
