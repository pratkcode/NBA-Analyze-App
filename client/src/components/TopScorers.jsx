import React, { useEffect, useState } from 'react'
import { searchPlayers, getSeasonAverages } from '../services/api'
import LoadingSkeleton from './LoadingSkeleton'
import SimpleBarChart from './charts/SimpleBarChart'

const DEFAULT_NAMES = ['LeBron James','Stephen Curry','Kevin Durant','Giannis Antetokounmpo','Luka Doncic','Joel Embiid','Jayson Tatum']

export default function TopScorers({ names = DEFAULT_NAMES, season = new Date().getFullYear() }){
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setLoading(true); setError(null)
      try {
        // Search players for each name to get IDs (first match)
        const playerPromises = names.map(n => searchPlayers(n))
        const results = await Promise.all(playerPromises)
        const players = results.map(r => (r && r.data && r.data[0]) ? r.data[0] : null).filter(Boolean)
        const ids = players.map(p => p.id)
        const avgs = await getSeasonAverages(ids, season)
        const avgsMap = new Map((avgs.data || []).map(a => [a.player_id, a]))
        const merged = players.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, team: p.team?.abbreviation, avg: avgsMap.get(p.id) || null }))
        // sort by points
        merged.sort((a,b)=> (b.avg?.pts || 0) - (a.avg?.pts || 0))
        if (!cancelled) setData(merged)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally { if(!cancelled) setLoading(false) }
    }
    fetch()
    return () => { cancelled = true }
  }, [names.join(','), season])

  if (loading) return <LoadingSkeleton className="h-48" />
  if (error) return <div className="text-red-400">Failed to load top scorers</div>
  if (!data) return null

  const chartData = data.map(p => ({ name: p.name.split(' ').slice(-1)[0], value: p.avg?.pts || 0 }))

  return (
    <div>
      <h3 className="font-semibold mb-3">Top Scorers</h3>
      <SimpleBarChart data={chartData} dataKey="value" />
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {data.map(p => (
          <li key={p.id} className="flex justify-between items-center">
            <div>
              <div className="font-medium">{p.name} <span className="text-white/60">{p.team ? `· ${p.team}` : ''}</span></div>
              <div className="text-xs text-white/60">PPG: {p.avg?.pts ?? '—'} · AST: {p.avg?.ast ?? '—'} · REB: {p.avg?.reb ?? '—'}</div>
            </div>
            <div className="text-lg font-semibold">{p.avg?.pts ? p.avg.pts.toFixed(1) : '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
