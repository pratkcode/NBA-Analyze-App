import React, { useState } from 'react'
import Card from '../components/Card'
import PlayerSearch from '../components/PlayerSearch'
import RadarCompare from '../components/charts/RadarCompare'

export default function Compare(){
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)

  // Placeholder metric values; real values come from season averages
  const keys = ['PTS','REB','AST','STL','BLK']
  const aVals = [25,8,7,1.2,0.6]
  const bVals = [22,6,8,1.0,0.4]

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Comparison</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4">Select Player A</div>
          <PlayerSearch onSelect={(p)=>setA(p)} />
          {a && <div className="mt-4">{a.first_name} {a.last_name}</div>}
        </Card>
        <Card>
          <div className="mb-4">Select Player B</div>
          <PlayerSearch onSelect={(p)=>setB(p)} />
          {b && <div className="mt-4">{b.first_name} {b.last_name}</div>}
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <h3 className="font-semibold mb-4">Comparison Radar</h3>
          <RadarCompare keys={keys} dataA={aVals} dataB={bVals} />
        </Card>
      </div>
    </div>
  )
}
