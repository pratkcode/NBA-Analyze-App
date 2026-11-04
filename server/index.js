require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const api = require('./routes/api')
const nba = require('./services/nbaStats')

const app = express()
app.use(cors())
app.use(express.json())

// Limits requests to this server per visitor. NBA.com itself is protected separately by the
// Python service, which sends at most one request at a time with a pause between them.
app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }))

app.use('/api', api)

app.get('/', (req, res) => res.send({ status: 'NBA Analytics API' }))

// Start the nba_api data service and preload league data in the background.
nba.start()
setTimeout(nba.warmUp, 1000)

const PORT = process.env.PORT || 4000
const server = app.listen(PORT, () => console.log('Server listening on', PORT))

function shutdown() {
  nba.stop()
  server.close(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
