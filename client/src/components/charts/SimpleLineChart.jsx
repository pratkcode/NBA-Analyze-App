import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function SimpleLineChart({ data, dataKey='value', stroke='#7c5cff' }){
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="name" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={3} dot={{ r:2 }} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
