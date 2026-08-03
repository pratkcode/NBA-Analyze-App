import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import TeamStats from './pages/TeamStats'
import PlayerStats from './pages/PlayerStats'
import Compare from './pages/Compare'

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.div>
  )
}

export default function App(){
  const location = useLocation()
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
          <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/teams" element={<PageWrapper><TeamStats /></PageWrapper>} />
          <Route path="/players" element={<PageWrapper><PlayerStats /></PageWrapper>} />
          <Route path="/compare" element={<PageWrapper><Compare /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
