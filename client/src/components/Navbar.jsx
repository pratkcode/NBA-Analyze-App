import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbar(){
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/30 border-b border-white/6">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4 md:p-6">
        <Link to="/" className="text-xl font-semibold tracking-tight">NBA<span className="text-accent">Analytics</span></Link>
        <nav className="hidden md:flex gap-8 items-center">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/players">Players</NavLink>
          <NavLink to="/compare">Compare</NavLink>
          <motion.button whileHover={{ y: -2 }} className="px-4 py-2 bg-accent/90 rounded-md shadow-md">Get Started</motion.button>
        </nav>
        <button className="md:hidden p-2" onClick={()=>setOpen(!open)} aria-label="menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden px-4 pb-6">
          <div className="flex flex-col gap-3">
            <MobileLink to="/dashboard">Dashboard</MobileLink>
            <MobileLink to="/teams">Teams</MobileLink>
            <MobileLink to="/players">Players</MobileLink>
            <MobileLink to="/compare">Compare</MobileLink>
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({ to, children }){
  return (
    <Link to={to} className="relative text-sm font-medium opacity-90 hover:opacity-100">
      <span className="pb-1">{children}</span>
      <span className="absolute left-0 -bottom-1 w-full h-0.5 bg-transparent hover:bg-gradient-to-r hover:from-accent hover:to-white transition-all duration-300"></span>
    </Link>
  )
}

function MobileLink({ to, children }){
  return (
    <Link to={to} className="block py-3 px-2 rounded-md hover:bg-white/4">{children}</Link>
  )
}
