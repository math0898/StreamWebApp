import express from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const DEFAULT_BAR = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
const DEFAULT_STATE = {
  count1: 0,
  count2: 0,
  max: 100,
  label1: 'Counter 1',
  label2: 'Counter 2',
  color1: '#82b1ff',
  color2: '#a5d6a7',
  bar1: { ...DEFAULT_BAR },
  bar2: { ...DEFAULT_BAR },
}

function loadState() {
  try {
    const saved = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    return {
      ...DEFAULT_STATE,
      ...saved,
      bar1: { ...DEFAULT_BAR, ...(saved.bar1 ?? {}) },
      bar2: { ...DEFAULT_BAR, ...(saved.bar2 ?? {}) },
    }
  } catch {
    return {
      ...DEFAULT_STATE,
      bar1: { ...DEFAULT_BAR },
      bar2: { ...DEFAULT_BAR },
    }
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

// POST partial state update — accepts any subset of the full state shape
app.post('/api/state', (req, res) => {
  const { count1, count2, max, label1, label2, color1, color2, bar1, bar2 } = req.body ?? {}
  if (typeof count1 === 'number') state.count1 = count1
  if (typeof count2 === 'number') state.count2 = count2
  if (typeof max    === 'number' && max > 0) state.max = max
  if (typeof label1 === 'string') state.label1 = label1
  if (typeof label2 === 'string') state.label2 = label2
  if (typeof color1 === 'string') state.color1 = color1
  if (typeof color2 === 'string') state.color2 = color2
  if (bar1 && typeof bar1 === 'object') {
    const { x, y, scaleX, scaleY } = bar1
    if (typeof x      === 'number') state.bar1.x      = x
    if (typeof y      === 'number') state.bar1.y      = y
    if (typeof scaleX === 'number') state.bar1.scaleX = scaleX
    if (typeof scaleY === 'number') state.bar1.scaleY = scaleY
  }
  if (bar2 && typeof bar2 === 'object') {
    const { x, y, scaleX, scaleY } = bar2
    if (typeof x      === 'number') state.bar2.x      = x
    if (typeof y      === 'number') state.bar2.y      = y
    if (typeof scaleX === 'number') state.bar2.scaleX = scaleX
    if (typeof scaleY === 'number') state.bar2.scaleY = scaleY
  }
  saveState()
  broadcast()
  res.json(state)
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
