import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function SimpleBarChart({ data, dataKey='value', fill='#7c5cff' }){
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip />
          <Bar dataKey={dataKey} fill={fill} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
