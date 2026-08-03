require('dotenv').config()
const express = require('express')
const cors = require('cors')
const api = require('./routes/api')
const rateLimit = require('express-rate-limit')

const app = express()
app.use(cors())
app.use(express.json())

// Basic rate limiter
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 })
app.use(limiter)

app.use('/api', api)

app.get('/', (req, res) => res.send({ status: 'NBA Analytics API' }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('Server listening on', PORT))
