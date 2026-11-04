import React, { useEffect, useState } from 'react'

// Shown when NBA.com didn't respond and the server answered with saved data.
export default function StaleBanner(){
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(true)
    window.addEventListener('nba-data-stale', on)
    return () => window.removeEventListener('nba-data-stale', on)
  }, [])
  if (!show) return null
  return (
    <div role="status" className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-between gap-4">
        <span>NBA.com isn't responding right now, so some stats show the most recent saved data.</span>
        <button onClick={() => setShow(false)} className="text-amber-200/70 hover:text-amber-100" aria-label="Dismiss">✕</button>
      </div>
    </div>
  )
}
