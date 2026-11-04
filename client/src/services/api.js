import axios from 'axios'

// All NBA data comes from our own server (/api), which gets it from NBA.com via nba_api.
const api = axios.create({ baseURL: '/api', timeout: 95000 })

const get = (url, params) => api.get(url, { params }).then(res => res.data)

// Players
export const searchPlayers = (q, season) => get('/players/search', { q, season })
export const getPlayerProfile = (id, season) => get(`/players/${id}`, { season })
export const getPlayerCareer = id => get(`/players/${id}/career`)
export const getPlayerGameLog = (id, season) => get(`/players/${id}/gamelog`, { season })
export const getPlayerShots = (id, season) => get(`/players/${id}/shots`, { season })
export const getPlayerClutch = (id, season) => get(`/players/${id}/clutch`, { season })
export const comparePlayers = (ids, season) => get('/players/compare', { ids: ids.join(','), season })
export const getLeaders = (stat = 'pts', limit = 10, season) => get('/leaders', { stat, limit, season })

// Teams
export const getTeams = season => get('/teams', { season })
export const getTeamList = () => get('/teams/list')
export const getTeamProfile = (id, season) => get(`/teams/${id}`, { season })
export const getTeamHistory = id => get(`/teams/${id}/history`)
export const compareTeams = (ids, season) => get('/teams/compare', { ids: ids.join(','), season })

// League
export const getStandings = season => get('/standings', { season })
export const getRecentGames = (limit = 10) => get('/games/recent', { limit })
export const getScoreboard = () => get('/scoreboard')

// Readable message from a failed request (the server sends { error }).
export function errorMessage(err, fallback = 'Could not load data.') {
  if (err?.code === 'ECONNABORTED') return 'NBA.com is taking too long to respond. Please try again.'
  if (err?.response?.status === 502 || err?.response?.status === 504) return err.response.data?.error || 'NBA.com did not respond. Please try again.'
  return err?.response?.data?.error || (err?.request && !err?.response ? 'Cannot reach the server. Is it running?' : fallback)
}
