import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { axisProps, gridProps, tooltipProps } from './theme'

export default function SimpleBarChart({ data, dataKey = 'value', fill = '#7c5cff', label = 'PPG' }){
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" {...axisProps} interval={0} angle={data.length > 7 ? -30 : 0} textAnchor={data.length > 7 ? 'end' : 'middle'} height={data.length > 7 ? 50 : 30} />
          <YAxis {...axisProps} axisLine={false} />
          <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={v => [Number(v).toFixed(1), label]} />
          <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
