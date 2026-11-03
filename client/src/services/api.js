import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

export async function searchPlayers(q) {
  const res = await api.get('/players', { params: { search: q } })
  return res.data
}

export async function searchPlayersWithAverages(q, season) {
  const res = await api.get('/players/with-averages', { params: { search: q, season } })
  return res.data
}

export async function getPlayer(id) {
  const res = await api.get(`/players/${id}`)
  return res.data
}

export async function getSeasonAverages(player_ids, season) {
  const params = { player_ids: player_ids.join(','), season }
  const res = await api.get('/season_averages', { params })
  return res.data
}

export async function getTeams() {
  const res = await api.get('/teams')
  return res.data
}

export async function getRecentGames(per_page = 25) {
  const res = await api.get('/games/recent', { params: { per_page } })
  return res.data
}

export async function getLiveScores() {
  const res = await api.get('/live')
  return res.data
}

export async function getTeamUpcoming(teamId) {
  const res = await api.get(`/teams/${teamId}/upcoming`)
  return res.data
}

export async function getTopScorers(limit = 20, season) {
  const res = await api.get('/leaderboard/top-scorers', { params: { limit, season } })
  return res.data
}

// Readable message from a failed request (the server sends { error }).
export function errorMessage(err, fallback = 'Could not load data.') {
  return err?.response?.data?.error || fallback
}
