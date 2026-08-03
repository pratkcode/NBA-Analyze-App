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

export async function getRecentGames(page = 1, per_page = 25) {
  const res = await api.get('/games/recent', { params: { page, per_page } })
  return res.data
}

export async function getLiveScores() {
  const res = await api.get('/live')
  return res.data
}

export async function searchSportsdbTeams(name) {
  const res = await api.get('/sportsdb/teams', { params: { t: name } })
  return res.data
}

export async function searchSportsdbPlayers(name) {
  const res = await api.get('/sportsdb/searchplayers', { params: { p: name } })
  return res.data
}

export async function getSportsdbNextEvents(teamId) {
  const res = await api.get(`/sportsdb/events/next/${teamId}`)
  return res.data
}

export async function getSportsdbEvent(id) {
  const res = await api.get(`/sportsdb/event/${id}`)
  return res.data
}
