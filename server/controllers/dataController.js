const nba = require('../services/nbaStats')

// Wraps a handler: sends { ...data, stale } as JSON, or { error } with a readable message.
// `stale: true` means NBA.com was unreachable and the last cached copy was used.
const handle = (method, paramsFrom = () => ({}), ttl) => async (req, res) => {
  try {
    const params = paramsFrom(req)
    const { data, stale } = await nba.get(method, params, ttl)
    res.json(Array.isArray(data) ? { data, stale } : { ...data, stale })
  } catch (err) {
    const status = err.status || 500
    if (!err.status) console.error(err)
    res.status(status).json({ error: err.status ? err.message : 'Something went wrong.' })
  }
}

const season = req => (req.query.season ? { season: req.query.season } : {})
const int = (value, fallback, max) => {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback
}
const id = name => req => {
  const n = parseInt(req.params[name], 10)
  if (!Number.isFinite(n)) throw Object.assign(new Error('Invalid id.'), { status: 400 })
  return n
}
const ids = req => String(req.query.ids || '').split(',').map(s => parseInt(s, 10)).filter(Number.isFinite).slice(0, 4).join(',')

exports.meta = handle('meta')

exports.searchPlayers = handle('search_players', req => ({ q: String(req.query.q || ''), limit: int(req.query.limit, 12, 25), ...season(req) }), 300)
exports.playerProfile = handle('player_profile', req => ({ player_id: id('id')(req), ...season(req) }), 300)
exports.playerCareer = handle('player_career', req => ({ player_id: id('id')(req) }), 600)
exports.playerGameLog = handle('player_gamelog', req => ({ player_id: id('id')(req), ...season(req) }), 300)
exports.playerShots = handle('player_shots', req => ({ player_id: id('id')(req), ...season(req) }), 600)
exports.playerClutch = handle('player_clutch', req => ({ player_id: id('id')(req), ...season(req) }), 600)
exports.comparePlayers = handle('compare_players', req => ({ ids: ids(req), ...season(req) }), 300)
exports.leaders = handle('leaders', req => ({ stat: String(req.query.stat || 'pts'), limit: int(req.query.limit, 10, 50), ...season(req) }), 300)

exports.teams = handle('teams', season, 300)
exports.teamList = handle('team_list', () => ({}), 3600)
exports.teamProfile = handle('team_profile', req => ({ team_id: id('id')(req), ...season(req) }), 300)
exports.teamHistory = handle('team_history', req => ({ team_id: id('id')(req) }), 3600)
exports.compareTeams = handle('compare_teams', req => ({ ids: ids(req), ...season(req) }), 300)

exports.standings = handle('standings', season, 300)
exports.recentGames = handle('recent_games', req => ({ limit: int(req.query.limit, 10, 50), ...season(req) }), 120)
exports.scoreboard = handle('scoreboard', () => ({}), 20)
