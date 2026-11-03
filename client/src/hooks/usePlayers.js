import { useEffect, useState, useRef } from 'react'
import { searchPlayers, getPlayer, getSeasonAverages } from '../services/api'

const cache = new Map()

export function usePlayerSearch(query) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const qRef = useRef('')

  useEffect(() => {
    if (!query) { setData(null); return }
    qRef.current = query
    let cancelled = false
    const fetch = async () => {
      setLoading(true); setError(null)
      try {
        if (cache.has(query)) {
          setData(cache.get(query))
        } else {
          const res = await searchPlayers(query)
          cache.set(query, res)
          if (!cancelled && qRef.current === query) setData(res)
        }
      } catch (err) { setError(err) }
      setLoading(false)
    }
    const t = setTimeout(fetch, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  return { data, loading, error }
}

export function usePlayer(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    getPlayer(id).then((res) => { if (!cancelled) setData(res) }).catch((e)=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { data, loading, error }
}

export function useSeasonAverages(playerIds = [], season) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!playerIds.length) return
    let cancelled = false
    setLoading(true); setData(null); setError(null)
    getSeasonAverages(playerIds, season).then((res)=>{ if(!cancelled) setData(res) }).catch(e=>{ if(!cancelled) setError(e) }).finally(()=>{ if(!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [playerIds.join(','), season])

  return { data, loading, error }
}

// Combined search hook that enriches player search results with season averages
export function usePlayerSearchWithAverages(query, season) {
  const [data, setData] = useState(null)
  const [averagesError, setAveragesError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!query) { setData(null); return }
    let cancelled = false
    setLoading(true); setError(null)
    const fetch = async () => {
      try {
        const playersRes = await searchPlayersWithAverages(query, season)
        const players = playersRes && playersRes.data ? playersRes.data : []
        if (!cancelled) setData(players)
        if (!cancelled) setAveragesError(playersRes?.averages_error || null)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const t = setTimeout(fetch, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, season])

  return { data, loading, error, averagesError }
}
