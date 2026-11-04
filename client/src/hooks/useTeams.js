import { useApi } from './useApi'
import {
  getTeams, getTeamList, getTeamProfile, getTeamHistory, compareTeams,
  getStandings, getRecentGames, getScoreboard,
} from '../services/api'

export const useTeams = season => useApi(() => getTeams(season), [season])
export const useTeamList = () => useApi(() => getTeamList().then(r => r.data), [])
export const useTeamProfile = (id, season) => useApi(() => getTeamProfile(id, season), [id, season], { enabled: !!id })
export const useTeamHistory = id => useApi(() => getTeamHistory(id), [id], { enabled: !!id })
export const useCompareTeams = (ids, season) => useApi(() => compareTeams(ids, season), [ids.join(','), season], { enabled: ids.length >= 2 })

// { conferences: [{ name, abbreviation, teams: [...] }] }
export const useStandings = season => useApi(() => getStandings(season), [season])
export const useRecentGames = (limit = 10) => useApi(() => getRecentGames(limit), [limit])
// Today's games (or the next day with games): { date, is_today, games }
export const useScoreboard = () => useApi(() => getScoreboard(), [])
