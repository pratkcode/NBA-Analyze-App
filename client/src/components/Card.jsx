import React from 'react'

// Plain container. Pass `interactive` for clickable cards to get a hover lift.
export default function Card({ children, className = '', interactive = false }){
  return (
    <div
      className={`rounded-2xl p-4 md:p-5 bg-[color:var(--card)] border border-white/10 shadow-sm ${
        interactive ? 'transition duration-200 hover:-translate-y-1 hover:border-white/20 motion-reduce:hover:translate-y-0' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
