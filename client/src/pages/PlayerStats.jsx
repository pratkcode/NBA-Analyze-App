import React, { useState } from 'react'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import { usePlayer, useSeasonAverages } from '../hooks/usePlayers'
import LoadingSkeleton from '../components/LoadingSkeleton'
import SimpleLineChart from '../components/charts/SimpleLineChart'

export default function PlayerStats(){
  const [selected, setSelected] = useState(null)
  const { data: player, loading: playerLoading } = usePlayer(selected?.id)
  const playerIds = selected ? [selected.id] : []
  const { data: avgs, loading: avgLoading } = useSeasonAverages(playerIds, new Date().getFullYear())

  const sampleTrend = [{name:'G1', value:20},{name:'G2', value:24},{name:'G3', value:18},{name:'G4', value:28}]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Player Statistics</h1>
        <PlayerSearch onSelect={p=>setSelected(p)} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          {playerLoading ? <LoadingSkeleton className="h-48" /> : (
            <div>
              <h3 className="text-xl font-semibold">{player ? `${player.first_name} ${player.last_name}` : 'Select a player'}</h3>
              <div className="text-sm text-white/70 mt-2">{player && player.team && player.team.full_name}</div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold">Season Averages</h3>
          {avgLoading ? <LoadingSkeleton className="h-32" /> : (
            <div className="text-sm text-white/70 mt-2">
              {avgs && avgs.data && avgs.data.length ? (
                <div>PPG: {avgs.data[0].pts} — REB: {avgs.data[0].reb} — AST: {avgs.data[0].ast}</div>
              ) : <div className="text-white/60">No season averages available</div>}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold">Performance Trend</h3>
          <SimpleLineChart data={sampleTrend} />
        </Card>
      </div>
    </div>
  )
}
