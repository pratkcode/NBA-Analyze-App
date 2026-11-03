const nba = require('../services/nbaService')

// Wraps a handler so errors become JSON responses with a readable message.
const handle = fn => async (req, res) => {
  try {
    res.json(await fn(req))
  } catch (err) {
    const status = err.status || 500
    if (!err.status) console.error(err) // unexpected bug: log the full error
    else if (status >= 500) console.warn(`${req.path}: ${err.message}`)
    res.status(status).json({ error: err.status ? err.message : 'Something went wrong.' })
  }
}

function parseIds(value) {
  if (Array.isArray(value)) return value
  return value ? String(value).split(',') : []
}

function clampLimit(value, fallback, max) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback
}

exports.getPlayers = handle(req => nba.searchPlayers(req.query.search))

exports.getPlayersWithAverages = handle(req =>
  nba.searchPlayersWithAverages(req.query.search, req.query.season)
)

exports.getPlayer = handle(req => nba.getPlayer(req.params.id))

exports.seasonAverages = handle(req =>
  nba.seasonAverages(parseIds(req.query.player_ids), req.query.season)
)

exports.getTeams = handle(() => nba.teams())

exports.recentGames = handle(req => nba.recentGames(clampLimit(req.query.per_page, 25, 100)))

exports.teamGames = handle(req => nba.teamGames(req.params.teamId, req.params.season))

exports.teamUpcoming = handle(req => nba.teamUpcoming(req.params.teamId))

exports.liveScores = handle(() => nba.liveScores())

exports.leaderboardTop = handle(req =>
  nba.leaders({
    statType: 'pts',
    season: req.query.season,
    limit: clampLimit(req.query.limit, 20, 100),
  })
)

exports.meta = handle(async () => ({
  season: nba.currentSeason(),
  hasApiKey: Boolean(process.env.BALLDONTLIE_API_KEY),
}))
