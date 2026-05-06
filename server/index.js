import express from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const DEFAULT_STATE = { count1: 0, count2: 0, max: 100 }

function loadState() {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(DATA_FILE, 'utf8')) }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function saveState() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(state), 'utf8')
  } catch (err) {
    console.error('[server] Failed to persist state:', err)
  }
}

const app = express()
const PORT = 3302

let state = loadState()
const clients = new Set()

app.use(express.json())

function broadcast() {
  const payload = `data: ${JSON.stringify(state)}\n\n`
  for (const client of clients) {
    client.write(payload)
  }
}

// SSE endpoint — clients subscribe here to receive live updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send current state immediately to the newly connected client
  res.write(`data: ${JSON.stringify(state)}\n\n`)

  clients.add(res)
  req.on('close', () => clients.delete(res))
  req.on('error', () => clients.delete(res))
})

// GET current state — used for initial load on dashboard mount
app.get('/api/state', (req, res) => {
  res.json(state)
})

// POST partial state update — accepts any subset of { count1, count2, max }
app.post('/api/state', (req, res) => {
  const { count1, count2, max } = req.body ?? {}
  if (typeof count1 === 'number') state.count1 = count1
  if (typeof count2 === 'number') state.count2 = count2
  if (typeof max === 'number' && max > 0) state.max = max
  saveState()
  broadcast()
  res.json(state)
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
