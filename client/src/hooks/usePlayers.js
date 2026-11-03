import { useEffect, useState } from 'react'
import { searchPlayersWithAverages, getPlayer, getSeasonAverages, getPlayerGameLog } from '../services/api'

// Loads a player by id. If `known` (e.g. the clicked search result) already
// matches, it's used directly and no request is made.
export function usePlayer(id, known) {
  const hasKnown = known && String(known.id) === String(id)
  const [data, setData] = useState(hasKnown ? known : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) { setData(null); return }
    if (hasKnown) { setData(known); setError(null); return }
    let cancelled = false
    setLoading(true); setData(null); setError(null)
    getPlayer(id).then(res => { if (!cancelled) setData(res) }).catch(e => { if (!cancelled) setError(e) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, hasKnown])

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

export function usePlayerGameLog(id, season) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true); setData(null); setError(null)
    getPlayerGameLog(id, season).then(res => { if (!cancelled) setData(res.data || []) }).catch(e => { if (!cancelled) setError(e) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, season])

  return { data, loading, error }
}

// Combined search hook that enriches player search results with season averages
export function usePlayerSearchWithAverages(query, season) {
  const [data, setData] = useState(null)
  const [averagesError, setAveragesError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!query || query.trim().length < 2) { setData(null); setLoading(false); return }
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
    // Wait until typing pauses, so each name costs one API request.
    const t = setTimeout(fetch, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, season])

  return { data, loading, error, averagesError }
}
