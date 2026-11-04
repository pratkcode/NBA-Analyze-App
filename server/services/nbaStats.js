// Talks to the Python nba_api service (python/nba_bridge.py).
// The Python process is the only thing that contacts NBA.com. It throttles and caches
// requests; this file adds a short in-memory cache and starts/restarts the process.
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const NodeCache = require('node-cache')

const SERVER_DIR = path.join(__dirname, '..')
const SCRIPT = path.join(SERVER_DIR, 'python', 'nba_bridge.py')
const VENV_PYTHON = path.join(SERVER_DIR, '.venv', 'bin', 'python')
const PYTHON = process.env.PYTHON || (fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3')
const REQUEST_TIMEOUT_MS = 90 * 1000 // NBA.com can be slow; the bridge also retries

// Error with an HTTP status and a message that is safe to show users.
class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

let child = null
let ready = false
let startError = null
let nextId = 1
const pending = new Map()

function failAll(message) {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer)
    reject(new ApiError(503, message))
  }
  pending.clear()
}

function start() {
  ready = false
  startError = null
  child = spawn(PYTHON, [SCRIPT], { cwd: SERVER_DIR, stdio: ['pipe', 'pipe', 'pipe'] })

  readline.createInterface({ input: child.stdout }).on('line', line => {
    let msg
    try { msg = JSON.parse(line) } catch { return }
    if (msg.ready) { ready = true; console.log('nba_api service ready') ; return }
    const req = pending.get(msg.id)
    if (!req) return
    pending.delete(msg.id)
    clearTimeout(req.timer)
    if (msg.ok) req.resolve({ data: msg.data, stale: msg.stale })
    else req.reject(new ApiError(msg.status || 502, msg.error || 'NBA data unavailable.'))
  })

  // Python logs (retries, failures) go to stderr.
  readline.createInterface({ input: child.stderr }).on('line', line => {
    if (/ModuleNotFoundError|No module named/.test(line)) {
      startError = 'The nba_api Python package is not installed. Run "npm run setup:py" in the server folder.'
    }
    console.warn(line)
  })

  child.on('error', err => {
    startError = `Could not start Python (${PYTHON}): ${err.message}. Install Python 3 and run "npm run setup:py".`
    console.error(startError)
  })

  child.on('exit', code => {
    ready = false
    failAll(startError || 'NBA data service stopped unexpectedly. Retrying…')
    if (startError) return // setup problem: don't restart in a loop
    console.warn(`nba_api service exited (code ${code}); restarting in 2s`)
    setTimeout(start, 2000)
  })
}

function call(method, params = {}) {
  if (!child) start()
  if (startError) return Promise.reject(new ApiError(503, startError))
  return new Promise((resolve, reject) => {
    const id = nextId++
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new ApiError(504, 'NBA.com is taking too long to respond. Please try again.'))
    }, REQUEST_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timer })
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n')
  })
}

// Short in-memory cache on top of the bridge's own cache, plus request de-duplication.
const cache = new NodeCache({ stdTTL: 60 })
const inFlight = new Map()

async function get(method, params = {}, ttl = 60) {
  const key = `${method}:${JSON.stringify(params)}`
  const hit = cache.get(key)
  if (hit) return hit
  if (inFlight.has(key)) return inFlight.get(key)
  const p = call(method, params)
    .then(res => {
      // Don't hold on to stale fallback data; ask again next time.
      if (!res.stale) cache.set(key, res, ttl)
      return res
    })
    .finally(() => inFlight.delete(key))
  inFlight.set(key, p)
  return p
}

// Load the league-wide data sets in the background so the first page view is fast.
function warmUp() {
  const steps = [['teams'], ['standings'], ['leaders', { stat: 'pts', limit: 10 }], ['scoreboard'], ['recent_games', { limit: 10 }]]
  steps.reduce((p, [m, params]) => p.then(() => get(m, params).catch(() => {})), Promise.resolve())
}

function stop() {
  if (child) child.kill()
}

module.exports = { get, start, warmUp, stop, ApiError, isReady: () => ready }
