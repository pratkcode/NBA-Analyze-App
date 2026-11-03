import { useEffect, useState } from 'react'
import { getTeams, getRecentGames, getLiveScores, getStandings } from '../services/api'

export function useTeams() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTeams().then(res => { if (!cancelled) setData(res) }).catch(e=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}

export function useRecentGames() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRecentGames().then(res => { if (!cancelled) setData(res) }).catch(e=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}

export function useLiveScores() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLiveScores().then(res => { if (!cancelled) setData(res) }).catch(e=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}

export function useStandings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStandings().then(res => { if (!cancelled) setData(res.data || []) }).catch(e=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { data, loading, error }
}
