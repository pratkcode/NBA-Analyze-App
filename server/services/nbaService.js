const axios = require('axios')
const NodeCache = require('node-cache')

const cache = new NodeCache({ stdTTL: 60 * 5 })

const MINUTE = 60
const HOUR = 60 * MINUTE

// balldontlie NBA API (https://docs.balldontlie.io). Needs a free API key.
// Free tier: teams, players, games (5 req/min).
// Season averages, leaders and standings need the paid GOAT tier.
const API_KEY = process.env.BALLDONTLIE_API_KEY
const bdl = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  timeout: 10000,
  headers: API_KEY ? { Authorization: API_KEY } : {},
})

// ESPN's public scoreboard: free, no key, includes live scores.
const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'

// Error with an HTTP status and a message that is safe to show users.
class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function toApiError(err) {
  if (err instanceof ApiError) return err
  const status = err.response?.status
  if (status === 401) {
    return API_KEY
      ? new ApiError(403, 'This data is not included in your balldontlie plan.')
      : new ApiError(503, 'Stats API key is missing. Set BALLDONTLIE_API_KEY in server/.env.')
  }
  if (status === 429) return new ApiError(429, 'Stats provider rate limit reached. Try again in a minute.')
  if (status === 404) return new ApiError(404, 'Not found.')
  return new ApiError(502, 'Stats provider is unavailable right now.')
}

// Caches successful results only. Concurrent callers share one in-flight request.
const inFlight = new Map()
async function cached(key, ttl, fn) {
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  if (inFlight.has(key)) return inFlight.get(key)
  const p = (async () => {
    try {
      const result = await fn()
      cache.set(key, result, ttl)
      return result
    } catch (err) {
      throw toApiError(err)
    } finally {
      inFlight.delete(key)
    }
  })()
  inFlight.set(key, p)
  return p
}

async function bdlGet(path, params) {
  const res = await bdl.get(path, { params })
  return res.data
}

// NBA seasons are named by their starting year: Oct 2026 – Jun 2027 is season 2026.
function currentSeason(date = new Date()) {
  const year = date.getFullYear()
  return date.getMonth() >= 8 ? year : year - 1 // Sep or later → new season
}

function parseSeason(season) {
  const n = parseInt(season, 10)
  return Number.isFinite(n) && n > 1946 ? n : currentSeason()
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Flattens a season-averages row into { player_id, pts, reb, ast, ... }.
function flattenAverages(row) {
  return { player_id: row.player?.id, season: row.season, ...(row.stats || {}) }
}

const service = {
  currentSeason,

  async searchPlayers(query) {
    const q = (query || '').trim()
    if (!q) return { data: [] }
    return cached(`players:${q.toLowerCase()}`, HOUR, () =>
      bdlGet('/players', { search: q, per_page: 25 })
    )
  },

  async getPlayer(id) {
    return cached(`player:${id}`, 24 * HOUR, async () => {
      const res = await bdlGet(`/players/${id}`)
      return res.data || res
    })
  },

  // Returns { data: [{ player_id, pts, reb, ast, ... }] }. Needs the GOAT tier.
  async seasonAverages(playerIds = [], season) {
    const ids = playerIds.map(Number).filter(Boolean)
    if (!ids.length) return { data: [] }
    const s = parseSeason(season)
    return cached(`avgs:${s}:${[...ids].sort().join(',')}`, HOUR, async () => {
      const res = await bdlGet('/season_averages/general', {
        season: s,
        season_type: 'regular',
        type: 'base',
        'player_ids[]': ids,
        per_page: 100,
      })
      return { data: (res.data || []).map(flattenAverages) }
    })
  },

  // Player search with averages attached. If averages are not available
  // (plan or rate limit), players still come back with season_avg: null.
  async searchPlayersWithAverages(query, season) {
    const players = (await service.searchPlayers(query)).data || []
    let averages = []
    let averagesError = null
    if (players.length) {
      try {
        averages = (await service.seasonAverages(players.map(p => p.id), season)).data
      } catch (err) {
        averagesError = err.message
      }
    }
    const byId = new Map(averages.map(a => [a.player_id, a]))
    return {
      data: players.map(p => ({ ...p, season_avg: byId.get(p.id) || null })),
      averages_error: averagesError,
    }
  },

  async teams() {
    return cached('teams', 24 * HOUR, () => bdlGet('/teams'))
  },

  // Games from the last 7 days, newest first.
  async recentGames(limit = 25) {
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * HOUR * 1000)
    return cached(`recentGames:${isoDate(end)}:${limit}`, 5 * MINUTE, async () => {
      const res = await bdlGet('/games', {
        start_date: isoDate(start),
        end_date: isoDate(end),
        per_page: 100,
      })
      const games = (res.data || [])
        .filter(g => g.status === 'Final' || g.home_team_score > 0)
        .sort((a, b) => (b.datetime || b.date).localeCompare(a.datetime || a.date))
        .slice(0, limit)
      return { data: games }
    })
  },

  async teamGames(teamId, season) {
    const s = parseSeason(season)
    return cached(`teamGames:${teamId}:${s}`, 15 * MINUTE, () =>
      bdlGet('/games', { 'team_ids[]': teamId, 'seasons[]': s, per_page: 100 })
    )
  },

  // A team's next games over the coming 30 days.
  async teamUpcoming(teamId, limit = 5) {
    const start = new Date()
    const end = new Date(start.getTime() + 30 * 24 * HOUR * 1000)
    return cached(`teamUpcoming:${teamId}:${isoDate(start)}`, 30 * MINUTE, async () => {
      const res = await bdlGet('/games', {
        'team_ids[]': teamId,
        start_date: isoDate(start),
        end_date: isoDate(end),
        per_page: 100,
      })
      const games = (res.data || [])
        .filter(g => g.status !== 'Final')
        .sort((a, b) => (a.datetime || a.date).localeCompare(b.datetime || b.date))
        .slice(0, limit)
      return { data: games }
    })
  },

  // Today's scoreboard from ESPN, simplified. Short cache so live scores stay fresh.
  async liveScores() {
    return cached('scoreboard', 30, async () => {
      const res = await axios.get(ESPN_SCOREBOARD, { timeout: 10000 })
      const events = res.data?.events || []
      const team = c => ({
        abbreviation: c?.team?.abbreviation,
        name: c?.team?.displayName,
        logo: c?.team?.logo,
        score: c?.score != null ? Number(c.score) : null,
      })
      return {
        data: events.map(ev => {
          const comp = ev.competitions?.[0] || {}
          const home = comp.competitors?.find(c => c.homeAway === 'home')
          const away = comp.competitors?.find(c => c.homeAway === 'away')
          return {
            id: ev.id,
            start: ev.date,
            state: ev.status?.type?.state, // 'pre' | 'in' | 'post'
            status: ev.status?.type?.shortDetail,
            home: team(home),
            away: team(away),
          }
        }),
      }
    })
  },

  // League leaders for a stat (pts, reb, ast, stl, blk, ...). Needs the GOAT tier.
  // Fetched once per season/stat and sliced, so different limits share one request.
  async leaders({ statType = 'pts', season, limit = 20 }) {
    const s = parseSeason(season)
    const all = await cached(`leaders:${statType}:${s}`, 6 * HOUR, async () => {
      const res = await bdlGet('/leaders', { stat_type: statType, season: s, season_type: 'regular' })
      return (res.data || [])
        .map(row => ({
          player_id: row.player?.id,
          player: row.player,
          rank: row.rank,
          games: row.games_played,
          [statType]: row.value,
        }))
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    })
    return { data: all.slice(0, limit), season: s }
  },
}

module.exports = service
module.exports.ApiError = ApiError
