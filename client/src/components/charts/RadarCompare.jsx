import React from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export default function RadarCompare({ dataA = [], dataB = [], keys = [] }){
  const formatted = keys.map((k, i) => ({
    subject: k,
    A: dataA[i] || 0,
    B: dataB[i] || 0
  }))

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RadarChart data={formatted}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" stroke="#fff" />
          <PolarRadiusAxis stroke="#fff" />
          <Radar name="Player A" dataKey="A" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.18} />
          <Radar name="Player B" dataKey="B" stroke="#00d8ff" fill="#00d8ff" fillOpacity={0.12} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
