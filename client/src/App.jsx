import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import TeamStats from './pages/TeamStats'
import TeamProfile from './pages/TeamProfile'
import PlayerStats from './pages/PlayerStats'
import Compare from './pages/Compare'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <ErrorBoundary
        resetKey={window.location.href}
        fallback={<div className="max-w-xl mx-auto text-center py-24 text-white/70">Something went wrong on this page. <a href={window.location.href} className="underline">Reload</a></div>}
      >
        {children}
      </ErrorBoundary>
    </motion.div>
  )
}

export default function App(){
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const page = el => <PageWrapper>{el}</PageWrapper>

  return (
    // reducedMotion="user": skip movement animations if the OS asks for less motion.
    <MotionConfig reducedMotion="user">
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={page(<Landing />)} />
            <Route path="/dashboard" element={page(<Dashboard />)} />
            <Route path="/teams" element={page(<TeamStats />)} />
            <Route path="/teams/:id" element={page(<TeamProfile />)} />
            <Route path="/players" element={page(<PlayerStats />)} />
            <Route path="/players/:id" element={page(<PlayerStats />)} />
            <Route path="/compare" element={page(<Compare />)} />
            <Route path="*" element={page(<NotFound />)} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </MotionConfig>
  )
}
