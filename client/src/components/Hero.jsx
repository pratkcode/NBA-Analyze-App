import React from 'react'
import { motion } from 'framer-motion'

export default function Hero(){
  return (
    <section className="relative hero-bg overflow-hidden rounded-3xl p-8 md:p-14 mb-12" style={{backgroundColor:'transparent'}}>
      <div className="absolute inset-0 -z-10" />
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <motion.h1 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-4xl md:text-6xl font-extrabold leading-tight">NBA analytics reimagined</motion.h1>
          <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="mt-4 text-lg text-white/80 max-w-xl">Premium insights, realtime design, and elegant UI — all in one place.</motion.p>

          <div className="mt-6 flex gap-4">
            <motion.a whileHover={{ scale: 1.02 }} href="/dashboard" className="px-6 py-3 bg-white/6 backdrop-blur-md rounded-lg">Open Dashboard</motion.a>
            <motion.a whileHover={{ scale: 1.02 }} href="#features" className="px-6 py-3 border border-white/6 rounded-lg">Learn More</motion.a>
          </div>

          <div className="mt-8 flex gap-8">
            <StatCounter label="Players" value={534} />
            <StatCounter label="Teams" value={30} />
            <StatCounter label="Analytics" value={128} />
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="rounded-xl bg-gradient-to-br from-white/3 to-white/2 p-6 shadow-lg backdrop-blur-md border border-white/6">
            <div className="h-56 md:h-72 rounded-md bg-black/40 flex items-center justify-center text-white/60">Animated scoreboard placeholder</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatCounter({ label, value }){
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}+</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  )
}
