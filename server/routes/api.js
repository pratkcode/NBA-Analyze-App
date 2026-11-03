const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/dataController')

router.get('/meta', ctrl.meta)
router.get('/players', ctrl.getPlayers)
router.get('/players/with-averages', ctrl.getPlayersWithAverages)
router.get('/players/:id', ctrl.getPlayer)
router.get('/season_averages', ctrl.seasonAverages)
router.get('/teams', ctrl.getTeams)
router.get('/teams/:teamId/upcoming', ctrl.teamUpcoming)
router.get('/teams/:teamId/games/:season?', ctrl.teamGames)
router.get('/games/recent', ctrl.recentGames)
router.get('/live', ctrl.liveScores)
router.get('/leaderboard/top-scorers', ctrl.leaderboardTop)

module.exports = router
