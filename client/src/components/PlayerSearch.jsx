import React, { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePlayerSearchWithAverages } from '../hooks/usePlayers'
import { currentSeason } from '../utils/season'

// Search box with a floating results list.
// Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
export default function PlayerSearch({ onSelect, placeholder = 'Search players' }){
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const listId = useId()
  const { data, loading, error, averagesError } = usePlayerSearchWithAverages(q, currentSeason())
  const results = data || []

  // New results → reset the highlighted row.
  useEffect(() => { setActive(results.length ? 0 : -1) }, [data])

  // Close when clicking anywhere else.
  useEffect(() => {
    const onDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = p => {
    onSelect && onSelect(p)
    setQ(''); setOpen(false)
  }

  const onKeyDown = e => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + results.length) % results.length) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(results[active]) }
  }

  const trimmed = q.trim()
  // Keep showing the previous results while new ones load, so the list doesn't flicker.
  const showPanel = open && trimmed.length >= 2 && (results.length > 0 || (!loading && (data || error)))

  return (
    <div ref={rootRef} className="relative w-full max-w-lg">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={Boolean(showPanel)}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full pl-9 pr-10 py-3 rounded-lg bg-white/5 text-white placeholder:text-white/40 border border-white/10 outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 transition"
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white/20 border-t-accent animate-spin" />}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 left-0 right-0 mt-2 max-h-96 overflow-y-auto bg-[#141418] border border-white/10 rounded-lg shadow-2xl"
          >
            {error && <li className="px-4 py-3 text-sm text-white/60">{error.response?.data?.error || 'Search failed.'}</li>}
            {!error && results.length === 0 && <li className="px-4 py-3 text-sm text-white/60">No players found for “{trimmed}”.</li>}
            {results.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => { e.preventDefault(); pick(p) }}
                className={`px-4 py-3 cursor-pointer flex justify-between items-center ${i === active ? 'bg-white/10' : ''}`}
              >
                <div>
                  <div className="font-medium">{p.first_name} {p.last_name} <span className="text-white/50 text-sm">{p.team?.abbreviation}</span></div>
                  <div className="text-xs text-white/50">{[p.position, p.height].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                {p.season_avg?.pts != null && (
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{p.season_avg.pts.toFixed(1)}</div>
                    <div className="text-xs text-white/50">PPG</div>
                  </div>
                )}
              </li>
            ))}
            {averagesError && results.length > 0 && <li className="px-4 py-2 text-xs text-white/40 border-t border-white/10">PPG unavailable: {averagesError}</li>}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
