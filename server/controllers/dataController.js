const nba = require('../services/nbaService')

exports.getPlayers = async (req, res) => {
  try {
    const { search } = req.query
    const data = await nba.searchPlayers(search)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch players' })
  }
}

exports.getPlayersWithAverages = async (req, res) => {
  try {
    const { search, season } = req.query
    const data = await nba.searchPlayersWithAverages(search, season)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch players with averages' })
  }
}

exports.getPlayer = async (req, res) => {
  try {
    const { id } = req.params
    const data = await nba.getPlayer(id)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch player' })
  }
}

exports.seasonAverages = async (req, res) => {
  try {
    const { player_ids, season } = req.query
    const ids = Array.isArray(player_ids) ? player_ids : (player_ids ? player_ids.split(',') : [])
    const data = await nba.seasonAverages(ids, season)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch season averages' })
  }
}

exports.getTeams = async (req, res) => {
  try {
    const data = await nba.teamStats()
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
}

exports.recentGames = async (req, res) => {
  try {
    const { page, per_page } = req.query
    const data = await nba.recentGames(page || 1, per_page || 25)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch recent games' })
  }
}

exports.teamGames = async (req, res) => {
  try {
    const { teamId, season } = req.params
    const data = await nba.teamGames(teamId, season)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch team games' })
  }
}

exports.liveScores = async (req, res) => {
  try {
    const data = await nba.liveScores()
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch live scores' })
  }
}

exports.sportsdbTeams = async (req, res) => {
  try {
    const { t } = req.query
    const data = await nba.sportsdb.searchTeams(t)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch teams from SportsDB' })
  }
}

exports.sportsdbSearchPlayers = async (req, res) => {
  try {
    const { p } = req.query
    const data = await nba.sportsdb.searchPlayers(p)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to search players on SportsDB' })
  }
}

exports.sportsdbNextEvents = async (req, res) => {
  try {
    const { teamId } = req.params
    const data = await nba.sportsdb.teamEventsNext(teamId)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch next events from SportsDB' })
  }
}

exports.sportsdbEvent = async (req, res) => {
  try {
    const { id } = req.params
    const data = await nba.sportsdb.lookupEvent(id)
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch event from SportsDB' })
  }
}

exports.leaderboardTop = async (req, res) => {
  try {
    const { limit = 50, season } = req.query
    const data = await require('../services/nbaService').leaderboard.topScorers({ limit: Number(limit), season })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to build leaderboard' })
  }
}
