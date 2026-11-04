import { useApi } from './useApi'
import {
  searchPlayers, getPlayerProfile, getPlayerCareer, getPlayerGameLog,
  getPlayerShots, getPlayerClutch, comparePlayers, getLeaders,
} from '../services/api'
import { useEffect, useState } from 'react'

// Player search, waiting until typing pauses. Returns { data: players[], loading, error }.
export function usePlayerSearch(query, season) {
  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])
  const q = debounced.trim()
  const res = useApi(() => searchPlayers(q, season).then(r => r.data), [q, season], { enabled: q.length >= 2 })
  return { ...res, loading: res.loading || (query.trim() !== q && query.trim().length >= 2) }
}

export const usePlayerProfile = (id, season) => useApi(() => getPlayerProfile(id, season), [id, season], { enabled: !!id })
export const usePlayerCareer = (id, enabled = true) => useApi(() => getPlayerCareer(id), [id], { enabled: !!id && enabled })
export const usePlayerGameLog = (id, season, enabled = true) => useApi(() => getPlayerGameLog(id, season), [id, season], { enabled: !!id && enabled })
export const usePlayerShots = (id, season, enabled = true) => useApi(() => getPlayerShots(id, season), [id, season], { enabled: !!id && enabled })
export const usePlayerClutch = (id, season, enabled = true) => useApi(() => getPlayerClutch(id, season), [id, season], { enabled: !!id && enabled })
export const useComparePlayers = (ids, season) => useApi(() => comparePlayers(ids, season), [ids.join(','), season], { enabled: ids.length >= 2 })
export const useLeaders = (stat, limit, season) => useApi(() => getLeaders(stat, limit, season), [stat, limit, season])
