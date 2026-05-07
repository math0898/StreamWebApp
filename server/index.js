import express from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const DEFAULT_BAR   = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }

function newId() { return randomUUID().slice(0, 8) }

function makeOverlay(name = 'Default', id = null) {
  return {
    id:     id ?? newId(),
    name,
    count1: 0,
    count2: 0,
    max1:   100,
    max2:   100,
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
}

function mergeOverlay(saved) {
  const legacyMax = typeof saved.max === 'number' ? saved.max : undefined
  return {
    ...makeOverlay(saved.name, saved.id),
    ...saved,
    id:     saved.id     ?? newId(),
    name:   saved.name   ?? 'Default',
    max1:   saved.max1   ?? legacyMax ?? 100,
    max2:   saved.max2   ?? legacyMax ?? 100,
    bar1:   { ...DEFAULT_BAR,   ...(saved.bar1   ?? {}) },
    bar2:   { ...DEFAULT_BAR,   ...(saved.bar2   ?? {}) },
    title1: { ...DEFAULT_TITLE, ...(saved.title1 ?? {}) },
    title2: { ...DEFAULT_TITLE, ...(saved.title2 ?? {}) },
    value1: { ...DEFAULT_VALUE, ...(saved.value1 ?? {}) },
    value2: { ...DEFAULT_VALUE, ...(saved.value2 ?? {}) },
  }
}

function loadState() {
  try {
    const saved = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    if (Array.isArray(saved.overlays) && saved.overlays.length > 0) {
      // New multi-overlay format
      const overlays = saved.overlays.map(mergeOverlay)
      const activeId = overlays.find(o => o.id === saved.activeId)
        ? saved.activeId
        : overlays[0].id
      return { activeId, overlays }
    } else {
      // Legacy single-overlay format: migrate to multi-overlay
      const overlay = mergeOverlay({ ...saved, id: 'default', name: 'Default' })
      return { activeId: 'default', overlays: [overlay] }
    }
  } catch {
    const overlay = makeOverlay('Default', 'default')
    return { activeId: 'default', overlays: [overlay] }
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

function getOverlay(id) {
  return state.overlays.find(o => o.id === id) ?? null
}

function getActive() {
  return getOverlay(state.activeId) ?? state.overlays[0]
}

// SSE payload: active overlay fields + metadata (activeId, overlay list)
function buildPayload() {
  const { id: _id, name: _name, ...fields } = getActive()
  return JSON.stringify({
    activeId: state.activeId,
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name })),
    ...fields,
  })
}

function broadcast() {
  const payload = `data: ${buildPayload()}\n\n`
  for (const client of clients) client.write(payload)
}

// Apply a partial state patch onto an overlay object
function applyPatch(overlay, body) {
  const { count1, count2, max1, max2, label1, label2, color1, color2 } = body
  if (typeof count1 === 'number') overlay.count1 = count1
  if (typeof count2 === 'number') overlay.count2 = count2
  if (typeof max1   === 'number' && max1 > 0) overlay.max1 = max1
  if (typeof max2   === 'number' && max2 > 0) overlay.max2 = max2
  if (typeof label1 === 'string') overlay.label1 = label1
  if (typeof label2 === 'string') overlay.label2 = label2
  if (typeof color1 === 'string') overlay.color1 = color1
  if (typeof color2 === 'string') overlay.color2 = color2

  for (const key of ['bar1', 'bar2']) {
    const obj = body[key]
    if (obj && typeof obj === 'object') {
      const { x, y, scaleX, scaleY } = obj
      if (typeof x      === 'number') overlay[key].x      = x
      if (typeof y      === 'number') overlay[key].y      = y
      if (typeof scaleX === 'number') overlay[key].scaleX = scaleX
      if (typeof scaleY === 'number') overlay[key].scaleY = scaleY
    }
  }

  for (const key of ['title1', 'title2', 'value1', 'value2']) {
    const obj = body[key]
    if (obj && typeof obj === 'object') {
      const { x, y, fontSize } = obj
      if (typeof x        === 'number') overlay[key].x        = x
      if (typeof y        === 'number') overlay[key].y        = y
      if (typeof fontSize === 'number' && fontSize > 0) overlay[key].fontSize = fontSize
    }
  }
}

// ── SSE endpoint ─────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  res.write(`data: ${buildPayload()}\n\n`)

  clients.add(res)
  req.on('close', () => clients.delete(res))
  req.on('error', () => clients.delete(res))
})

// ── Overlay management endpoints ─────────────────────────────

// GET /api/overlays — list all overlays and the active id
app.get('/api/overlays', (req, res) => {
  res.json({
    activeId: state.activeId,
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name })),
  })
})

// POST /api/overlays — create a new overlay
app.post('/api/overlays', (req, res) => {
  const name = (typeof req.body?.name === 'string' && req.body.name.trim())
    ? req.body.name.trim()
    : `Overlay ${state.overlays.length + 1}`
  const overlay = makeOverlay(name)
  state.overlays.push(overlay)
  saveState()
  broadcast()
  res.status(201).json({ id: overlay.id, name: overlay.name })
})

// DELETE /api/overlays/:id — delete an overlay (must keep at least one)
app.delete('/api/overlays/:id', (req, res) => {
  if (state.overlays.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last overlay' })
  }
  const idx = state.overlays.findIndex(o => o.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Overlay not found' })
  const wasActive = state.activeId === req.params.id
  state.overlays.splice(idx, 1)
  if (wasActive) state.activeId = state.overlays[0].id
  saveState()
  broadcast()
  res.json({
    activeId: state.activeId,
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name })),
  })
})

// PATCH /api/overlays/:id — rename an overlay
app.patch('/api/overlays/:id', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    overlay.name = req.body.name.trim()
  }
  saveState()
  broadcast()
  res.json({ id: overlay.id, name: overlay.name })
})

// POST /api/overlays/:id/activate — set the active (live) overlay
app.post('/api/overlays/:id/activate', (req, res) => {
  if (!getOverlay(req.params.id)) return res.status(404).json({ error: 'Overlay not found' })
  state.activeId = req.params.id
  saveState()
  broadcast()
  res.json({ activeId: state.activeId })
})

// ── State endpoints ───────────────────────────────────────────

// GET /api/state?id=xxx — return an overlay's content fields
app.get('/api/state', (req, res) => {
  const overlay = (req.query.id ? getOverlay(req.query.id) : null) ?? getActive()
  const { id: _id, name: _name, ...fields } = overlay
  res.json(fields)
})

// POST /api/state?id=xxx — patch an overlay's content fields
app.post('/api/state', (req, res) => {
  const overlay = (req.query.id ? getOverlay(req.query.id) : null) ?? getActive()
  applyPatch(overlay, req.body ?? {})
  saveState()
  if (overlay.id === state.activeId) broadcast()
  const { id: _id, name: _name, ...fields } = overlay
  res.json(fields)
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
