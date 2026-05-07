import express from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import {
  MODULE_TYPES,
  FACTORY_MODULE_DEFAULTS,
  DEFAULT_BAR,
  DEFAULT_TITLE,
  DEFAULT_VALUE,
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_TEXT_TRANSFORM,
  mergeModule as mergeOverlayModule,
  newModule as createModule,
  patchModule as patchOverlayModule,
} from './module-models.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const DEFAULT_MUSIC_LIBRARY_PATH = '/Music'
const DEFAULT_SONG_DURATION_SEC = 180
const DEFAULT_SONG = {
  title: 'Default Song',
  artist: 'Unknown Artist',
  album: 'Default Album',
  coverPath: `${DEFAULT_MUSIC_LIBRARY_PATH}/Default Album - Unknown Artist/cover.jpg`,
  audioPath: `${DEFAULT_MUSIC_LIBRARY_PATH}/Default Album - Unknown Artist/Default Song.mp3`,
  durationSec: DEFAULT_SONG_DURATION_SEC,
}

function newId() { return randomUUID().slice(0, 8) }

function patchProgressBar(target, patch) {
  if (typeof patch.label === 'string') target.label = patch.label
  if (typeof patch.count === 'number') target.count = patch.count
  if (typeof patch.max   === 'number' && patch.max > 0) target.max = patch.max
  if (typeof patch.color === 'string') target.color = patch.color

  if (patch.bar && typeof patch.bar === 'object') {
    const { x, y, scaleX, scaleY } = patch.bar
    if (typeof x      === 'number') target.bar.x      = x
    if (typeof y      === 'number') target.bar.y      = y
    if (typeof scaleX === 'number') target.bar.scaleX = scaleX
    if (typeof scaleY === 'number') target.bar.scaleY = scaleY
  }

  for (const key of ['title', 'value']) {
    if (patch[key] && typeof patch[key] === 'object') {
      const { x, y, fontSize } = patch[key]
      if (typeof x        === 'number') target[key].x        = x
      if (typeof y        === 'number') target[key].y        = y
      if (typeof fontSize === 'number' && fontSize > 0) target[key].fontSize = fontSize
    }
  }
}

function patchImage(target, patch) {
  if (typeof patch.name === 'string') target.name = patch.name
  if (typeof patch.src === 'string') target.src = patch.src
  if (typeof patch.alt === 'string') target.alt = patch.alt
  if (typeof patch.opacity === 'number' && patch.opacity >= 0 && patch.opacity <= 1) target.opacity = patch.opacity

  if (patch.transform && typeof patch.transform === 'object') {
    const { x, y, scaleX, scaleY } = patch.transform
    if (typeof x      === 'number') target.transform.x      = x
    if (typeof y      === 'number') target.transform.y      = y
    if (typeof scaleX === 'number') target.transform.scaleX = scaleX
    if (typeof scaleY === 'number') target.transform.scaleY = scaleY
  }
}

function patchText(target, patch) {
  if (typeof patch.name === 'string') target.name = patch.name
  if (typeof patch.text === 'string') target.text = patch.text
  if (typeof patch.color === 'string') target.color = patch.color

  if (patch.transform && typeof patch.transform === 'object') {
    const { x, y, scaleX, scaleY, fontSize } = patch.transform
    if (typeof x      === 'number') target.transform.x      = x
    if (typeof y      === 'number') target.transform.y      = y
    if (typeof scaleX === 'number') target.transform.scaleX = scaleX
    if (typeof scaleY === 'number') target.transform.scaleY = scaleY
    if (typeof fontSize === 'number' && fontSize > 0) target.transform.fontSize = fontSize
  }
}

function mergeModuleDefaults(saved) {
  const p = saved?.progressBar ?? {}
  const i = saved?.image ?? {}
  const t = saved?.text ?? {}

  return {
    progressBar: {
      label: typeof p.label === 'string' ? p.label : FACTORY_MODULE_DEFAULTS.progressBar.label,
      max:   typeof p.max === 'number' && p.max > 0 ? p.max : FACTORY_MODULE_DEFAULTS.progressBar.max,
      color: typeof p.color === 'string' ? p.color : FACTORY_MODULE_DEFAULTS.progressBar.color,
      bar:   { ...DEFAULT_BAR,   ...(p.bar   ?? {}) },
      title: { ...DEFAULT_TITLE, ...(p.title ?? {}) },
      value: { ...DEFAULT_VALUE, ...(p.value ?? {}) },
    },
    image: {
      src:       typeof i.src === 'string' && i.src.trim() ? i.src : FACTORY_MODULE_DEFAULTS.image.src,
      alt:       typeof i.alt === 'string' ? i.alt : FACTORY_MODULE_DEFAULTS.image.alt,
      opacity:   typeof i.opacity === 'number' ? i.opacity : FACTORY_MODULE_DEFAULTS.image.opacity,
      transform: { ...DEFAULT_IMAGE_TRANSFORM, ...(i.transform ?? {}) },
    },
    text: {
      text:      typeof t.text === 'string' ? t.text : FACTORY_MODULE_DEFAULTS.text.text,
      color:     typeof t.color === 'string' ? t.color : FACTORY_MODULE_DEFAULTS.text.color,
      transform: { ...DEFAULT_TEXT_TRANSFORM, ...(t.transform ?? {}) },
    },
  }
}

function migrateOverlay(saved) {
  const legacyMax = typeof saved.max === 'number' ? saved.max : undefined
  const overlayId = saved.id ?? 'default'
  return {
    id:      overlayId,
    name:    saved.name ?? 'Default',
    modules: [
      mergeOverlayModule({
        id:    `${overlayId}-m1`,
        type:  'progressBar',
        label: saved.label1 ?? 'Counter 1',
        count: saved.count1 ?? 0,
        max:   saved.max1 ?? legacyMax ?? FACTORY_MODULE_DEFAULTS.progressBar.max,
        color: saved.color1 ?? '#82b1ff',
        bar:   saved.bar1   ?? {},
        title: saved.title1 ?? {},
        value: saved.value1 ?? {},
      }, newId),
      mergeOverlayModule({
        id:    `${overlayId}-m2`,
        type:  'progressBar',
        label: saved.label2 ?? 'Counter 2',
        count: saved.count2 ?? 0,
        max:   saved.max2 ?? legacyMax ?? FACTORY_MODULE_DEFAULTS.progressBar.max,
        color: saved.color2 ?? '#a5d6a7',
        bar:   saved.bar2   ?? {},
        title: saved.title2 ?? {},
        value: saved.value2 ?? {},
      }, newId),
    ],
  }
}

function loadState() {
  try {
    const saved          = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    const moduleDefaults = mergeModuleDefaults(saved.moduleDefaults)
    const music = mergeMusicState(saved.music)
    let overlays
    let activeId

    if (Array.isArray(saved.overlays) && saved.overlays.length > 0) {
      overlays = saved.overlays.map(o =>
        Array.isArray(o.modules)
          ? { id: o.id ?? newId(), name: o.name ?? 'Default', modules: o.modules.map(m => mergeOverlayModule(m, newId)) }
          : migrateOverlay(o)
      )
      activeId = overlays.find(o => o.id === saved.activeId) ? saved.activeId : overlays[0].id
    } else {
      overlays = [migrateOverlay({ ...saved, id: 'default', name: 'Default' })]
      activeId = 'default'
    }

    return { activeId, moduleDefaults, overlays, music }
  } catch {
    return {
      activeId:       'default',
      moduleDefaults: mergeModuleDefaults(null),
      music: createInitialMusicState(),
      overlays: [{
        id:   'default',
        name: 'Default',
        modules: [
          mergeOverlayModule({ id: 'default-m1', type: 'progressBar', label: 'Counter 1', color: '#82b1ff' }, newId),
          mergeOverlayModule({ id: 'default-m2', type: 'progressBar', label: 'Counter 2', color: '#a5d6a7' }, newId),
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

function createInitialMusicState() {
  return {
    song: { ...DEFAULT_SONG },
    playback: {
      status: 'playing',
      sequence: 1,
      startedAt: Date.now(),
      pauseStartedAt: null,
      pausedMsTotal: 0,
    },
  }
}

function mergeMusicState(savedMusic) {
  const mergedSong = {
    title: typeof savedMusic?.song?.title === 'string' && savedMusic.song.title.trim() ? savedMusic.song.title : DEFAULT_SONG.title,
    artist: typeof savedMusic?.song?.artist === 'string' && savedMusic.song.artist.trim() ? savedMusic.song.artist : DEFAULT_SONG.artist,
    album: typeof savedMusic?.song?.album === 'string' && savedMusic.song.album.trim() ? savedMusic.song.album : DEFAULT_SONG.album,
    coverPath: typeof savedMusic?.song?.coverPath === 'string' && savedMusic.song.coverPath.trim() ? savedMusic.song.coverPath : DEFAULT_SONG.coverPath,
    audioPath: typeof savedMusic?.song?.audioPath === 'string' && savedMusic.song.audioPath.trim() ? savedMusic.song.audioPath : DEFAULT_SONG.audioPath,
    durationSec: typeof savedMusic?.song?.durationSec === 'number' && savedMusic.song.durationSec > 0 ? savedMusic.song.durationSec : DEFAULT_SONG.durationSec,
  }
  const status = savedMusic?.playback?.status === 'paused' ? 'paused' : 'playing'
  let pauseStartedAt = null
  if (status === 'paused') {
    pauseStartedAt = typeof savedMusic?.playback?.pauseStartedAt === 'number'
      ? savedMusic.playback.pauseStartedAt
      : Date.now()
  }
  return {
    song: mergedSong,
    playback: {
      status,
      sequence: typeof savedMusic?.playback?.sequence === 'number' && savedMusic.playback.sequence > 0
        ? savedMusic.playback.sequence
        : 1,
      startedAt: typeof savedMusic?.playback?.startedAt === 'number' ? savedMusic.playback.startedAt : Date.now(),
      pauseStartedAt,
      pausedMsTotal: typeof savedMusic?.playback?.pausedMsTotal === 'number' && savedMusic.playback.pausedMsTotal >= 0
        ? savedMusic.playback.pausedMsTotal
        : 0,
    },
  }
}

function getMusicSnapshot() {
  return {
    song: { ...state.music.song },
    status: state.music.playback.status,
    sequence: state.music.playback.sequence,
    startedAt: state.music.playback.startedAt,
    pauseStartedAt: state.music.playback.pauseStartedAt,
    pausedMsTotal: state.music.playback.pausedMsTotal,
    serverTime: Date.now(),
  }
}

function pauseMusic() {
  if (state.music.playback.status === 'paused') return false
  state.music.playback.status = 'paused'
  state.music.playback.pauseStartedAt = Date.now()
  return true
}

function resumeMusic() {
  if (state.music.playback.status !== 'paused') return false
  if (state.music.playback.pauseStartedAt === null) return false
  const now = Date.now()
  const pausedFor = Math.max(0, now - state.music.playback.pauseStartedAt)
  state.music.playback.pausedMsTotal += pausedFor
  state.music.playback.pauseStartedAt = null
  state.music.playback.status = 'playing'
  return true
}

function skipSong() {
  state.music.playback.sequence += 1
  state.music.playback.status = 'playing'
  state.music.playback.startedAt = Date.now()
  state.music.playback.pauseStartedAt = null
  state.music.playback.pausedMsTotal = 0
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
    music: getMusicSnapshot(),
  })
}

function broadcast() {
  const payload = `data: ${buildPayload()}\n\n`
  for (const client of clients) client.write(payload)
}

function patchDefaults(body) {
  if (body.progressBar && typeof body.progressBar === 'object') {
    patchProgressBar(state.moduleDefaults.progressBar, body.progressBar)
    if (typeof state.moduleDefaults.progressBar.count === 'number') delete state.moduleDefaults.progressBar.count
  }
  if (body.image && typeof body.image === 'object') {
    patchImage(state.moduleDefaults.image, body.image)
  }
  if (body.text && typeof body.text === 'object') {
    patchText(state.moduleDefaults.text, body.text)
  }
}

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

app.get('/api/defaults', (req, res) => {
  res.json(state.moduleDefaults)
})

app.post('/api/defaults', (req, res) => {
  patchDefaults(req.body ?? {})
  saveState()
  res.json(state.moduleDefaults)
})

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
  const overlay = { id: newId(), name, modules: [createModule('progressBar', state.moduleDefaults, newId)] }
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

app.post('/api/overlays/:id/modules', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  const requestedType = req.body?.type
  if (requestedType != null && !MODULE_TYPES.has(requestedType)) {
    return res.status(400).json({ error: 'Unsupported module type' })
  }
  const mod = createModule(requestedType ?? 'progressBar', state.moduleDefaults, newId)
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
  const modIdx = overlay.modules.findIndex(m => m.id === req.params.moduleId)
  if (modIdx === -1) return res.status(404).json({ error: 'Module not found' })
  const mod = overlay.modules[modIdx]
  const nextMod = patchOverlayModule(mod, req.body ?? {})
  overlay.modules[modIdx] = nextMod
  saveState()
  // broadcast when editing the active overlay, or whenever `hidden` changes
  // so that visibility toggles are always reflected on /overlay immediately
  const shouldBroadcast = overlay.id === state.activeId || typeof req.body?.hidden === 'boolean'
  if (shouldBroadcast) broadcast()
  res.json(nextMod)
})

app.get('/api/state', (req, res) => {
  const overlay = (req.query.id ? getOverlay(req.query.id) : null) ?? getActive()
  res.json({ modules: overlay.modules })
})

app.get('/api/music', (req, res) => {
  res.json(getMusicSnapshot())
})

app.post('/api/music/pause', (req, res) => {
  pauseMusic()
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/resume', (req, res) => {
  resumeMusic()
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/skip', (req, res) => {
  skipSong()
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
