import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/teams', label: 'Teams' },
  { to: '/players', label: 'Players' },
  { to: '/compare', label: 'Compare' },
]

export default function Navbar(){
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu after navigating.
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="text-xl font-semibold tracking-tight">NBA<span className="text-accent">Analytics</span></Link>
        <nav className="hidden md:flex gap-1 items-center">
          {LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="md:hidden p-2 -mr-2 rounded-md hover:bg-white/5"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden overflow-hidden px-4"
          >
            <div className="flex flex-col gap-1 pb-4">
              {LINKS.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `block py-3 px-3 rounded-md ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
