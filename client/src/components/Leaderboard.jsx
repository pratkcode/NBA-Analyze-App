import React, { useEffect, useState } from 'react'
import axios from 'axios'
import LoadingSkeleton from './LoadingSkeleton'
import SimpleBarChart from './charts/SimpleBarChart'

export default function Leaderboard({ limit = 20, season = new Date().getFullYear() }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true); setError(null)
      try {
        const res = await axios.get(`/api/leaderboard/top-scorers`, { params: { limit, season } })
        if (!cancelled) setData(res.data.data || [])
      } catch (e) { if(!cancelled) setError(e) }
      finally { if(!cancelled) setLoading(false) }
    }
    fetch()
    return () => { cancelled = true }
  }, [limit, season])

  if (loading) return <LoadingSkeleton className="h-48" />
  if (error) return <div className="text-red-400">Failed to load leaderboard</div>
  if (!data) return null

  const chartData = data.map((d,i) => ({ name: `#${i+1}`, value: d.pts || 0 }))

  return (
    <div>
      <h3 className="font-semibold mb-3">Leaderboard — Top Scorers</h3>
      <SimpleBarChart data={chartData} />
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {data.map((p, idx) => (
          <li key={p.player_id || idx} className="flex justify-between items-center">
            <div>
              <div className="font-medium">{p.player && p.player.first_name ? `${p.player.first_name} ${p.player.last_name}` : `Player ${p.player_id || ''}`}</div>
              <div className="text-xs text-white/60">{p.team ? p.team : ''}</div>
            </div>
            <div className="text-lg font-semibold">{p.pts ? p.pts.toFixed(1) : '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
