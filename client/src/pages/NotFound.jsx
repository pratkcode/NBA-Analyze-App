import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(){
  return (
    <div className="max-w-xl mx-auto text-center py-24">
      <div className="text-7xl font-extrabold text-accent">404</div>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-white/60">That page doesn't exist or has moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="px-5 py-2.5 bg-accent/90 rounded-lg font-medium hover:bg-accent transition-colors">Go home</Link>
        <Link to="/dashboard" className="px-5 py-2.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">Dashboard</Link>
      </div>
    </div>
  )
}
