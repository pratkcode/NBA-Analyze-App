import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { axisProps, gridProps, tooltipProps, animate } from './theme'

export default function SimpleLineChart({ data, dataKey = 'value', stroke = '#7c5cff', label = 'PTS' }){
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipProps} formatter={v => [v, label]} />
          <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={3} dot={{ r: 3, fill: stroke }} activeDot={{ r: 5 }} isAnimationActive={animate} animationDuration={500} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
