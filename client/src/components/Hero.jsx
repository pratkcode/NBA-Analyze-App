import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import TodaysGames from './TodaysGames'
import { currentSeason, seasonLabel } from '../utils/season'

const MotionLink = motion(Link)

export default function Hero(){
  return (
    <section className="relative hero-bg overflow-hidden rounded-3xl p-8 md:p-14 mb-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <motion.h1 initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-4xl md:text-6xl font-extrabold leading-tight">NBA analytics reimagined</motion.h1>
          <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="mt-4 text-lg text-white/80 max-w-xl">
            Live scores, standings, player stats and head-to-head comparisons for the {seasonLabel(currentSeason())} season.
          </motion.p>

          <div className="mt-6 flex flex-wrap gap-4">
            <MotionLink whileHover={{ scale: 1.02 }} to="/dashboard" className="px-6 py-3 bg-accent/90 rounded-lg font-medium">Open Dashboard</MotionLink>
            <MotionLink whileHover={{ scale: 1.02 }} to="/compare" className="px-6 py-3 border border-white/10 rounded-lg">Compare Players</MotionLink>
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="rounded-xl bg-black/30 p-5 shadow-lg backdrop-blur-md border border-white/10">
            <div className="text-sm font-semibold mb-3 text-white/80">Today's Games</div>
            <TodaysGames max={6} />
          </div>
        </div>
      </div>
    </section>
  )
}
