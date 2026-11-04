const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/dataController')

router.get('/meta', ctrl.meta)

// Players
router.get('/players/search', ctrl.searchPlayers)
router.get('/players/compare', ctrl.comparePlayers)
router.get('/players/:id', ctrl.playerProfile)
router.get('/players/:id/career', ctrl.playerCareer)
router.get('/players/:id/gamelog', ctrl.playerGameLog)
router.get('/players/:id/shots', ctrl.playerShots)
router.get('/players/:id/clutch', ctrl.playerClutch)
router.get('/leaders', ctrl.leaders)

// Teams
router.get('/teams', ctrl.teams)
router.get('/teams/list', ctrl.teamList)
router.get('/teams/compare', ctrl.compareTeams)
router.get('/teams/:id', ctrl.teamProfile)
router.get('/teams/:id/history', ctrl.teamHistory)

// League
router.get('/standings', ctrl.standings)
router.get('/games/recent', ctrl.recentGames)
router.get('/scoreboard', ctrl.scoreboard)

module.exports = router
