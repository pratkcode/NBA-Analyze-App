import React from 'react'
import { motion } from 'framer-motion'

export default function Card({ children, className='' }){
  return (
    <motion.div whileHover={{ y: -6 }} className={`rounded-2xl p-4 bg-[color:var(--card)] border border-white/10 shadow-sm ${className}`}>
      {children}
    </motion.div>
  )
}
