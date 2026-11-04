import React from 'react'
import { seasonLabel, seasonOptions } from '../utils/season'

export default function SeasonSelect({ value, onChange, first = 1996, className = '' }){
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-white/50">Season</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 outline-none focus:border-accent/60 [&>option]:bg-[#141418]"
      >
        {seasonOptions(first).map(y => <option key={y} value={y}>{seasonLabel(y)}</option>)}
      </select>
    </label>
  )
}
