import React, { useState } from 'react'

// Half-court shot chart using NBA.com coordinates (tenths of a foot, hoop at 0,0).
// Drawn with the hoop at the bottom, as seen by the shooter, so "Left Corner 3" is on the left.
const LINE = 'rgba(255,255,255,0.22)'

export default function ShotChart({ shots = [] }){
  const [filter, setFilter] = useState('all')
  const [hover, setHover] = useState(null)
  const visible = shots.filter(s => s.y <= 420 && (filter === 'all' || (filter === 'made') === s.made))

  return (
    <div>
      <div className="flex gap-1 mb-3 text-xs">
        {[['all', 'All shots'], ['made', 'Made'], ['missed', 'Missed']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-md transition-colors ${filter === k ? 'bg-accent/80 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg viewBox="-250 -422.5 500 470" className="w-full max-w-xl mx-auto block rounded-lg bg-white/[0.03]" role="img" aria-label={`Shot chart: ${visible.length} shots`}>
          <Court />
          {visible.map((s, i) => s.made ? (
            <circle key={i} cx={s.x} cy={-s.y} r={5} fill="#34d399" fillOpacity={0.75}
              onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)} />
          ) : (
            <g key={i} transform={`translate(${s.x} ${-s.y})`} stroke="#f87171" strokeOpacity={0.7} strokeWidth={2}
              onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}>
              <line x1={-4} y1={-4} x2={4} y2={4} /><line x1={-4} y1={4} x2={4} y2={-4} />
              <rect x={-5} y={-5} width={10} height={10} fill="transparent" stroke="none" />
            </g>
          ))}
        </svg>
        {hover && (
          <div className="absolute top-2 left-2 text-xs bg-[#141418] border border-white/10 rounded-md px-2 py-1 pointer-events-none">
            <span className={hover.made ? 'text-emerald-400' : 'text-red-400'}>{hover.made ? 'Made' : 'Missed'}</span>
            {' '}· {hover.action} · {hover.distance} ft · Q{hover.period}
          </div>
        )}
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" /> Made</span>
        <span className="flex items-center gap-1.5"><span className="text-red-400 font-bold leading-none">×</span> Missed</span>
      </div>
    </div>
  )
}

function Court(){
  return (
    <g fill="none" stroke={LINE} strokeWidth={2}>
      <rect x={-250} y={-422.5} width={500} height={470} />
      {/* Hoop and backboard */}
      <circle cx={0} cy={0} r={7.5} />
      <line x1={-30} y1={7.5} x2={30} y2={7.5} />
      {/* Paint */}
      <rect x={-80} y={-142.5} width={160} height={190} />
      <rect x={-60} y={-142.5} width={120} height={190} />
      {/* Free-throw circle */}
      <path d="M -60 -142.5 A 60 60 0 0 1 60 -142.5" />
      <path d="M -60 -142.5 A 60 60 0 0 0 60 -142.5" strokeDasharray="6 6" />
      {/* Restricted area */}
      <path d="M -40 0 A 40 40 0 0 1 40 0" />
      {/* Three-point line */}
      <line x1={-220} y1={47.5} x2={-220} y2={-89.5} />
      <line x1={220} y1={47.5} x2={220} y2={-89.5} />
      <path d="M -220 -89.5 A 237.5 237.5 0 0 1 220 -89.5" />
      {/* Half-court circle */}
      <path d="M -60 -422.5 A 60 60 0 0 0 60 -422.5" />
    </g>
  )
}
