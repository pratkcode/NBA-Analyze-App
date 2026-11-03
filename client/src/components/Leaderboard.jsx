import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTopScorers, errorMessage } from '../services/api'
import { currentSeason } from '../utils/season'
import LoadingSkeleton from './LoadingSkeleton'
import SimpleBarChart from './charts/SimpleBarChart'

export default function Leaderboard({ limit = 20, season = currentSeason() }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getTopScorers(limit, season)
      .then(res => { if (!cancelled) setData(res.data || []) })
      .catch(e => { if (!cancelled) setError(errorMessage(e, 'Failed to load leaderboard.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [limit, season])

  return (
    <div>
      <h3 className="font-semibold mb-3">Leaderboard — Top Scorers</h3>
      {loading && <LoadingSkeleton className="h-48" />}
      {!loading && error && <div className="text-sm text-white/60">{error}</div>}
      {!loading && !error && data && data.length === 0 && <div className="text-sm text-white/60">No leaderboard data for this season yet.</div>}
      {!loading && !error && data && data.length > 0 && (
        <>
          <SimpleBarChart data={data.slice(0, 10).map(d => ({ name: d.player?.last_name || '', value: d.pts || 0 }))} />
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {data.map((p, idx) => (
              <li key={p.player_id || idx} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{p.player ? <Link to={`/players/${p.player.id}`} className="hover:text-accent transition-colors">{p.player.first_name} {p.player.last_name}</Link> : `Player ${p.player_id || ''}`}</div>
                  {p.games != null && <div className="text-xs text-white/60">{p.games} games</div>}
                </div>
                <div className="text-lg font-semibold">{p.pts != null ? p.pts.toFixed(1) : '—'}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
