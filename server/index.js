import express from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const DEFAULT_BAR   = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }
const DEFAULT_STATE = {
  count1: 0,
  count2: 0,
  max1: 100,
  max2: 100,
  label1: 'Counter 1',
  label2: 'Counter 2',
  color1: '#82b1ff',
  color2: '#a5d6a7',
  bar1:   { ...DEFAULT_BAR },
  bar2:   { ...DEFAULT_BAR },
  title1: { ...DEFAULT_TITLE },
  title2: { ...DEFAULT_TITLE },
  value1: { ...DEFAULT_VALUE },
  value2: { ...DEFAULT_VALUE },
}

function loadState() {
  try {
    const saved = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    // Backward-compat: migrate shared `max` to per-counter max1/max2
    const legacyMax = typeof saved.max === 'number' ? saved.max : undefined
    return {
      ...DEFAULT_STATE,
      ...saved,
      max1:   saved.max1   ?? legacyMax ?? DEFAULT_STATE.max1,
      max2:   saved.max2   ?? legacyMax ?? DEFAULT_STATE.max2,
      bar1:   { ...DEFAULT_BAR,   ...(saved.bar1   ?? {}) },
      bar2:   { ...DEFAULT_BAR,   ...(saved.bar2   ?? {}) },
      title1: { ...DEFAULT_TITLE, ...(saved.title1 ?? {}) },
      title2: { ...DEFAULT_TITLE, ...(saved.title2 ?? {}) },
      value1: { ...DEFAULT_VALUE, ...(saved.value1 ?? {}) },
      value2: { ...DEFAULT_VALUE, ...(saved.value2 ?? {}) },
    }
  } catch {
    return {
      ...DEFAULT_STATE,
      bar1:   { ...DEFAULT_BAR },
      bar2:   { ...DEFAULT_BAR },
      title1: { ...DEFAULT_TITLE },
      title2: { ...DEFAULT_TITLE },
      value1: { ...DEFAULT_VALUE },
      value2: { ...DEFAULT_VALUE },
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
  const body = req.body ?? {}
  const { count1, count2, max1, max2, label1, label2, color1, color2 } = body
  if (typeof count1 === 'number') state.count1 = count1
  if (typeof count2 === 'number') state.count2 = count2
  if (typeof max1   === 'number' && max1 > 0) state.max1 = max1
  if (typeof max2   === 'number' && max2 > 0) state.max2 = max2
  if (typeof label1 === 'string') state.label1 = label1
  if (typeof label2 === 'string') state.label2 = label2
  if (typeof color1 === 'string') state.color1 = color1
  if (typeof color2 === 'string') state.color2 = color2

  // nested bar objects: x, y, scaleX, scaleY
  for (const key of ['bar1', 'bar2']) {
    const obj = body[key]
    if (obj && typeof obj === 'object') {
      const { x, y, scaleX, scaleY } = obj
      if (typeof x      === 'number') state[key].x      = x
      if (typeof y      === 'number') state[key].y      = y
      if (typeof scaleX === 'number') state[key].scaleX = scaleX
      if (typeof scaleY === 'number') state[key].scaleY = scaleY
    }
  }

  // nested text objects: x, y, fontSize
  for (const key of ['title1', 'title2', 'value1', 'value2']) {
    const obj = body[key]
    if (obj && typeof obj === 'object') {
      const { x, y, fontSize } = obj
      if (typeof x        === 'number') state[key].x        = x
      if (typeof y        === 'number') state[key].y        = y
      if (typeof fontSize === 'number' && fontSize > 0) state[key].fontSize = fontSize
    }
  }

  saveState()
  broadcast()
  res.json(state)
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
