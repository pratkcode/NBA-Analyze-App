import React, { useState } from 'react'
import { usePlayerSearchWithAverages } from '../hooks/usePlayers'
import { motion } from 'framer-motion'

export default function PlayerSearch({ onSelect }){
  const [q, setQ] = useState('')
  const season = new Date().getFullYear()
  const { data, loading } = usePlayerSearchWithAverages(q, season)

  return (
    <div className="relative w-full max-w-lg">
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search players" className="w-full px-4 py-3 rounded-lg bg-transparent text-white placeholder:text-white/60 border border-white/6" />
      {loading && <div className="absolute right-3 top-3 w-3 h-3 rounded-full bg-accent animate-pulse" />}
      {data && data.length > 0 && (
        <motion.ul initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="mt-2 bg-black/60 border border-white/6 rounded-lg overflow-hidden">
          {data.map(p => (
            <li key={p.id} onClick={()=>onSelect && onSelect(p)} className="px-4 py-3 hover:bg-white/4 cursor-pointer flex justify-between items-center">
              <div>
                <div className="font-medium">{p.first_name} {p.last_name} <span className="text-white/60">{p.team?.abbreviation}</span></div>
                <div className="text-xs text-white/60">{p.position || '—'} • {p.height_feet ? `${p.height_feet}'${p.height_inches}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{p.season_avg?.pts ? p.season_avg.pts.toFixed(1) : '—'}</div>
                <div className="text-xs text-white/60">PPG</div>
              </div>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
