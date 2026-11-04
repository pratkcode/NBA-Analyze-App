import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { axisProps, gridProps, tooltipProps, animate } from './theme'

export default function SimpleBarChart({ data, dataKey = 'value', fill = '#7c5cff', label = 'PPG' }){
  // Tilt labels when there are many bars or long names, so they don't overlap.
  const tilt = data.length > 7 || data.some(d => String(d.name).length > 9)
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" {...axisProps} interval={0} angle={tilt ? -30 : 0} textAnchor={tilt ? 'end' : 'middle'} height={tilt ? 60 : 30} />
          <YAxis {...axisProps} axisLine={false} />
          <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={v => [Number(v).toFixed(1), label]} />
          <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} isAnimationActive={animate} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
