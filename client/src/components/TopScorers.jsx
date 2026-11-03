import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTopScorers, errorMessage } from '../services/api'
import { currentSeason } from '../utils/season'
import LoadingSkeleton from './LoadingSkeleton'
import SimpleBarChart from './charts/SimpleBarChart'

// Top 7 scorers this season. Uses the same server data as the Leaderboard,
// so the dashboard makes one stats request instead of eight.
export default function TopScorers({ limit = 7, season = currentSeason() }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getTopScorers(limit, season)
      .then(res => { if (!cancelled) setData(res.data || []) })
      .catch(e => { if (!cancelled) setError(errorMessage(e, 'Failed to load top scorers.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [limit, season])

  return (
    <div>
      <h3 className="font-semibold mb-3">Top Scorers</h3>
      {loading && <LoadingSkeleton className="h-48" />}
      {!loading && error && <div className="text-sm text-white/60">{error}</div>}
      {!loading && !error && data && data.length === 0 && <div className="text-sm text-white/60">No scoring data for this season yet.</div>}
      {!loading && !error && data && data.length > 0 && (
        <>
          <SimpleBarChart data={data.map(p => ({ name: p.player?.last_name || '', value: p.pts || 0 }))} dataKey="value" />
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {data.map(p => (
              <li key={p.player_id} className="flex justify-between items-center">
                <div className="font-medium">{p.player ? <Link to={`/players/${p.player.id}`} className="hover:text-accent transition-colors">{p.player.first_name} {p.player.last_name}</Link> : `Player ${p.player_id}`}</div>
                <div className="text-lg font-semibold">{p.pts != null ? p.pts.toFixed(1) : '—'}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
