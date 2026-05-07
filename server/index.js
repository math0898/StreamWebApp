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

const FACTORY_MODULE_DEFAULTS = {
  progressBar: {
    label: 'Counter',
    max:   100,
    color: '#82b1ff',
    bar:   { ...DEFAULT_BAR },
    title: { ...DEFAULT_TITLE },
    value: { ...DEFAULT_VALUE },
  },
}

function newId() { return randomUUID().slice(0, 8) }

// Merge a saved module with hard-coded defaults (used during loadState)
function mergeModule(saved) {
  const d = FACTORY_MODULE_DEFAULTS.progressBar
  return {
    id:    saved.id    ?? newId(),
    type:  saved.type  ?? 'progressBar',
    label: saved.label ?? d.label,
    count: typeof saved.count === 'number' ? saved.count : 0,
    max:   typeof saved.max === 'number' && saved.max > 0 ? saved.max : d.max,
    color: saved.color ?? d.color,
    bar:   { ...DEFAULT_BAR,   ...(saved.bar   ?? {}) },
    title: { ...DEFAULT_TITLE, ...(saved.title ?? {}) },
    value: { ...DEFAULT_VALUE, ...(saved.value ?? {}) },
  }
}

// Create a brand-new module using the current state's module defaults
function newModule() {
  const d = state.moduleDefaults.progressBar
  return {
    id:    newId(),
    type:  'progressBar',
    label: d.label,
    count: 0,
    max:   d.max,
    color: d.color,
    bar:   { ...DEFAULT_BAR,   ...d.bar   },
    title: { ...DEFAULT_TITLE, ...d.title },
    value: { ...DEFAULT_VALUE, ...d.value },
  }
}

// Merge saved moduleDefaults with factory defaults
function mergeModuleDefaults(saved) {
  const d = saved?.progressBar ?? {}
  return {
    progressBar: {
      label: d.label ?? FACTORY_MODULE_DEFAULTS.progressBar.label,
      max:   typeof d.max === 'number' && d.max > 0 ? d.max : FACTORY_MODULE_DEFAULTS.progressBar.max,
      color: d.color ?? FACTORY_MODULE_DEFAULTS.progressBar.color,
      bar:   { ...DEFAULT_BAR,   ...(d.bar   ?? {}) },
      title: { ...DEFAULT_TITLE, ...(d.title ?? {}) },
      value: { ...DEFAULT_VALUE, ...(d.value ?? {}) },
    },
  }
}

// Migrate a legacy overlay (flat fields) into the module-based format
function migrateOverlay(saved) {
  const legacyMax = typeof saved.max === 'number' ? saved.max : undefined
  const overlayId = saved.id ?? 'default'
  return {
    id:      overlayId,
    name:    saved.name ?? 'Default',
    modules: [
      mergeModule({
        id:    `${overlayId}-m1`,
        label: saved.label1 ?? 'Counter 1',
        count: saved.count1 ?? 0,
        max:   saved.max1 ?? legacyMax ?? FACTORY_MODULE_DEFAULTS.progressBar.max,
        color: saved.color1 ?? '#82b1ff',
        bar:   saved.bar1   ?? {},
        title: saved.title1 ?? {},
        value: saved.value1 ?? {},
      }),
      mergeModule({
        id:    `${overlayId}-m2`,
        label: saved.label2 ?? 'Counter 2',
        count: saved.count2 ?? 0,
        max:   saved.max2 ?? legacyMax ?? FACTORY_MODULE_DEFAULTS.progressBar.max,
        color: saved.color2 ?? '#a5d6a7',
        bar:   saved.bar2   ?? {},
        title: saved.title2 ?? {},
        value: saved.value2 ?? {},
      }),
    ],
  }
}

function loadState() {
  try {
    const saved          = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    const moduleDefaults = mergeModuleDefaults(saved.moduleDefaults)
    let overlays, activeId

    if (Array.isArray(saved.overlays) && saved.overlays.length > 0) {
      overlays = saved.overlays.map(o =>
        Array.isArray(o.modules)
          ? { id: o.id ?? newId(), name: o.name ?? 'Default', modules: o.modules.map(mergeModule) }
          : migrateOverlay(o)
      )
      activeId = overlays.find(o => o.id === saved.activeId) ? saved.activeId : overlays[0].id
    } else {
      // Completely legacy flat format
      overlays = [migrateOverlay({ ...saved, id: 'default', name: 'Default' })]
      activeId = 'default'
    }

    return { activeId, moduleDefaults, overlays }
  } catch {
    return {
      activeId:       'default',
      moduleDefaults: mergeModuleDefaults(null),
      overlays: [{
        id:   'default',
        name: 'Default',
        modules: [
          mergeModule({ id: 'default-m1', label: 'Counter 1', color: '#82b1ff' }),
          mergeModule({ id: 'default-m2', label: 'Counter 2', color: '#a5d6a7' }),
        ],
      }],
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

function getOverlay(id) {
  return state.overlays.find(o => o.id === id) ?? null
}

function getActive() {
  return getOverlay(state.activeId) ?? state.overlays[0]
}

function buildPayload() {
  const active = getActive()
  return JSON.stringify({
    activeId: state.activeId,
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name })),
    modules:  active.modules,
  })
}

function broadcast() {
  const payload = `data: ${buildPayload()}\n\n`
  for (const client of clients) client.write(payload)
}

function patchModule(mod, body) {
  if (typeof body.label === 'string') mod.label = body.label
  if (typeof body.count === 'number') mod.count = body.count
  if (typeof body.max   === 'number' && body.max > 0) mod.max = body.max
  if (typeof body.color === 'string') mod.color = body.color

  if (body.bar && typeof body.bar === 'object') {
    const { x, y, scaleX, scaleY } = body.bar
    if (typeof x      === 'number') mod.bar.x      = x
    if (typeof y      === 'number') mod.bar.y      = y
    if (typeof scaleX === 'number') mod.bar.scaleX = scaleX
    if (typeof scaleY === 'number') mod.bar.scaleY = scaleY
  }

  for (const key of ['title', 'value']) {
    if (body[key] && typeof body[key] === 'object') {
      const { x, y, fontSize } = body[key]
      if (typeof x        === 'number') mod[key].x        = x
      if (typeof y        === 'number') mod[key].y        = y
      if (typeof fontSize === 'number' && fontSize > 0) mod[key].fontSize = fontSize
    }
  }
}

function patchDefaults(body) {
  const d = state.moduleDefaults.progressBar
  if (typeof body.label === 'string') d.label = body.label
  if (typeof body.max   === 'number' && body.max > 0) d.max = body.max
  if (typeof body.color === 'string') d.color = body.color

  if (body.bar && typeof body.bar === 'object') {
    const { x, y, scaleX, scaleY } = body.bar
    if (typeof x      === 'number') d.bar.x      = x
    if (typeof y      === 'number') d.bar.y      = y
    if (typeof scaleX === 'number') d.bar.scaleX = scaleX
    if (typeof scaleY === 'number') d.bar.scaleY = scaleY
  }

  for (const key of ['title', 'value']) {
    if (body[key] && typeof body[key] === 'object') {
      const { x, y, fontSize } = body[key]
      if (typeof x        === 'number') d[key].x        = x
      if (typeof y        === 'number') d[key].y        = y
      if (typeof fontSize === 'number' && fontSize > 0) d[key].fontSize = fontSize
    }
  }
}

// ── SSE ──────────────────────────────────────────────────────
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

// ── Module defaults ───────────────────────────────────────────
app.get('/api/defaults', (req, res) => {
  res.json(state.moduleDefaults)
})

app.post('/api/defaults', (req, res) => {
  patchDefaults(req.body ?? {})
  saveState()
  res.json(state.moduleDefaults)
})

// ── Overlay management endpoints ─────────────────────────────
app.get('/api/overlays', (req, res) => {
  res.json({
    activeId: state.activeId,
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name })),
  })
})

app.post('/api/overlays', (req, res) => {
  const name = (typeof req.body?.name === 'string' && req.body.name.trim())
    ? req.body.name.trim()
    : `Overlay ${state.overlays.length + 1}`
  const overlay = { id: newId(), name, modules: [newModule()] }
  state.overlays.push(overlay)
  saveState()
  broadcast()
  res.status(201).json({ id: overlay.id, name: overlay.name })
})

app.delete('/api/overlays/:id', (req, res) => {
  if (state.overlays.length <= 1) return res.status(400).json({ error: 'Cannot delete the last overlay' })
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

app.patch('/api/overlays/:id', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  if (typeof req.body?.name === 'string' && req.body.name.trim()) overlay.name = req.body.name.trim()
  saveState()
  broadcast()
  res.json({ id: overlay.id, name: overlay.name })
})

app.post('/api/overlays/:id/activate', (req, res) => {
  if (!getOverlay(req.params.id)) return res.status(404).json({ error: 'Overlay not found' })
  state.activeId = req.params.id
  saveState()
  broadcast()
  res.json({ activeId: state.activeId })
})

// ── Module endpoints ──────────────────────────────────────────
app.post('/api/overlays/:id/modules', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  const mod = newModule()
  overlay.modules.push(mod)
  saveState()
  if (overlay.id === state.activeId) broadcast()
  res.status(201).json(mod)
})

app.delete('/api/overlays/:id/modules/:moduleId', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  if (overlay.modules.length <= 1) return res.status(400).json({ error: 'Cannot remove the last module' })
  const idx = overlay.modules.findIndex(m => m.id === req.params.moduleId)
  if (idx === -1) return res.status(404).json({ error: 'Module not found' })
  overlay.modules.splice(idx, 1)
  saveState()
  if (overlay.id === state.activeId) broadcast()
  res.json({ modules: overlay.modules })
})

app.patch('/api/overlays/:id/modules/:moduleId', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  const mod = overlay.modules.find(m => m.id === req.params.moduleId)
  if (!mod) return res.status(404).json({ error: 'Module not found' })
  patchModule(mod, req.body ?? {})
  saveState()
  if (overlay.id === state.activeId) broadcast()
  res.json(mod)
})

// ── State (returns modules for a given overlay) ───────────────
app.get('/api/state', (req, res) => {
  const overlay = (req.query.id ? getOverlay(req.query.id) : null) ?? getActive()
  res.json({ modules: overlay.modules })
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
