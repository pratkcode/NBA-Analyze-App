import React from 'react'
import Navbar from './Navbar'

export default function Layout({ children }){
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <Navbar />
      <main className="px-4 sm:px-6 md:px-12 lg:px-20 py-8 md:py-10">{children}</main>
    </div>
  )
}
