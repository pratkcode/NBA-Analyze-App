import React from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'

// Values are expected on a 0–100 scale so different stats share one axis.
export default function RadarCompare({ dataA = [], dataB = [], keys = [], nameA = 'Player A', nameB = 'Player B' }){
  const formatted = keys.map((k, i) => ({
    subject: k,
    A: dataA[i] || 0,
    B: dataB[i] || 0
  }))

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RadarChart data={formatted}>
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.7)" />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={nameA} dataKey="A" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.25} />
          <Radar name={nameB} dataKey="B" stroke="#00d8ff" fill="#00d8ff" fillOpacity={0.15} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
