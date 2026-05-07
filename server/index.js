import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname, extname } from 'path'
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
const PUBLIC_DIR = join(__dirname, '..', 'public')
const MUSIC_DIR = join(PUBLIC_DIR, 'Music')
const DEFAULT_MUSIC_LIBRARY_PATH = '/Music'
const DEFAULT_SONG_DURATION_SEC = 0
const MAX_DEBUG_MESSAGES = 120
const IMPORT_RATE_LIMIT_WINDOW_MS = 60_000
const IMPORT_RATE_LIMIT_MAX_REQUESTS = 8
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const DEFAULT_SONG = {
  title: 'Default Song',
  artist: 'Unknown Artist',
  album: 'Default Album',
  coverPath: `${DEFAULT_MUSIC_LIBRARY_PATH}/Default Album - Unknown Artist/cover.jpg`,
  audioPath: `${DEFAULT_MUSIC_LIBRARY_PATH}/Default Album - Unknown Artist/Default Song.mp3`,
  durationSec: DEFAULT_SONG_DURATION_SEC,
}
const DEFAULT_NOW_PLAYING_POPUP = {
  x: 0,
  y: 0,
  hiddenVisual: false,
  defaultPlayMusic: true,
  animation: {
    songStartShowSec: 6,
    songEndShowSec: 3,
    periodicIntervalSec: 45,
    periodicShowSec: 4,
  },
}
const musicDebugMessages = []
// Limit import bursts to reduce abuse of repeated file-write operations.
const musicImportLimiter = rateLimit({
  windowMs: IMPORT_RATE_LIMIT_WINDOW_MS,
  limit: IMPORT_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many import attempts. Please wait and try again.' },
})

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

function normalizeNowPlayingPopup(savedPopup) {
  const animation = savedPopup?.animation ?? {}
  return {
    x: typeof savedPopup?.x === 'number' ? savedPopup.x : DEFAULT_NOW_PLAYING_POPUP.x,
    y: typeof savedPopup?.y === 'number' ? savedPopup.y : DEFAULT_NOW_PLAYING_POPUP.y,
    hiddenVisual: typeof savedPopup?.hiddenVisual === 'boolean' ? savedPopup.hiddenVisual : DEFAULT_NOW_PLAYING_POPUP.hiddenVisual,
    defaultPlayMusic: typeof savedPopup?.defaultPlayMusic === 'boolean'
      ? savedPopup.defaultPlayMusic
      : DEFAULT_NOW_PLAYING_POPUP.defaultPlayMusic,
    animation: {
      songStartShowSec: typeof animation.songStartShowSec === 'number' && animation.songStartShowSec >= 0
        ? animation.songStartShowSec
        : DEFAULT_NOW_PLAYING_POPUP.animation.songStartShowSec,
      songEndShowSec: typeof animation.songEndShowSec === 'number' && animation.songEndShowSec >= 0
        ? animation.songEndShowSec
        : DEFAULT_NOW_PLAYING_POPUP.animation.songEndShowSec,
      periodicIntervalSec: typeof animation.periodicIntervalSec === 'number' && animation.periodicIntervalSec >= 0
        ? animation.periodicIntervalSec
        : DEFAULT_NOW_PLAYING_POPUP.animation.periodicIntervalSec,
      periodicShowSec: typeof animation.periodicShowSec === 'number' && animation.periodicShowSec >= 0
        ? animation.periodicShowSec
        : DEFAULT_NOW_PLAYING_POPUP.animation.periodicShowSec,
    },
  }
}

function patchNowPlayingPopup(target, patch) {
  if (!patch || typeof patch !== 'object') return
  if (typeof patch.x === 'number') target.x = patch.x
  if (typeof patch.y === 'number') target.y = patch.y
  if (typeof patch.hiddenVisual === 'boolean') target.hiddenVisual = patch.hiddenVisual
  if (typeof patch.defaultPlayMusic === 'boolean') target.defaultPlayMusic = patch.defaultPlayMusic
  if (patch.animation && typeof patch.animation === 'object') {
    if (typeof patch.animation.songStartShowSec === 'number' && patch.animation.songStartShowSec >= 0) {
      target.animation.songStartShowSec = patch.animation.songStartShowSec
    }
    if (typeof patch.animation.songEndShowSec === 'number' && patch.animation.songEndShowSec >= 0) {
      target.animation.songEndShowSec = patch.animation.songEndShowSec
    }
    if (typeof patch.animation.periodicIntervalSec === 'number' && patch.animation.periodicIntervalSec >= 0) {
      target.animation.periodicIntervalSec = patch.animation.periodicIntervalSec
    }
    if (typeof patch.animation.periodicShowSec === 'number' && patch.animation.periodicShowSec >= 0) {
      target.animation.periodicShowSec = patch.animation.periodicShowSec
    }
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
    nowPlayingPopup: normalizeNowPlayingPopup(saved.nowPlayingPopup),
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
          ? {
            id: o.id ?? newId(),
            name: o.name ?? 'Default',
            nowPlayingPopup: normalizeNowPlayingPopup(o.nowPlayingPopup),
            modules: o.modules.map(m => mergeOverlayModule(m, newId)),
          }
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
        nowPlayingPopup: normalizeNowPlayingPopup(null),
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

function logMusicDebug(message, level = 'info') {
  const entry = `${new Date().toISOString()} [${level}] ${message}`
  musicDebugMessages.push(entry)
  if (musicDebugMessages.length > MAX_DEBUG_MESSAGES) {
    musicDebugMessages.splice(0, musicDebugMessages.length - MAX_DEBUG_MESSAGES)
  }
}

function sanitizeSegment(raw, fallback = 'Unknown') {
  const value = String(raw ?? '').trim()
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  let withoutTrailingDots = cleaned
  while (withoutTrailingDots.endsWith('.')) {
    withoutTrailingDots = withoutTrailingDots.slice(0, -1).trimEnd()
  }
  return withoutTrailingDots || fallback
}

function toWebPath(absPath) {
  const rel = absPath.slice(PUBLIC_DIR.length).replaceAll('\\', '/')
  return rel.startsWith('/') ? rel : `/${rel}`
}

function parseAlbumFolderName(folderName) {
  const idx = folderName.lastIndexOf(' - ')
  if (idx < 0) return { album: folderName, artist: 'Unknown Artist' }
  return {
    album: folderName.slice(0, idx).trim() || folderName,
    artist: folderName.slice(idx + 3).trim() || 'Unknown Artist',
  }
}

function readMusicLibraryFromDisk() {
  if (!existsSync(MUSIC_DIR)) mkdirSync(MUSIC_DIR, { recursive: true })
  const tracks = []
  const albumFolders = readdirSync(MUSIC_DIR, { withFileTypes: true }).filter(entry => entry.isDirectory())

  for (const albumFolder of albumFolders) {
    const folderName = albumFolder.name
    const { album, artist } = parseAlbumFolderName(folderName)
    const albumAbsPath = join(MUSIC_DIR, folderName)
    const files = readdirSync(albumAbsPath, { withFileTypes: true }).filter(entry => entry.isFile())
    const imageFile = files.find(file => IMAGE_EXTENSIONS.has(extname(file.name).toLowerCase()))
    const coverPath = imageFile ? toWebPath(join(albumAbsPath, imageFile.name)) : DEFAULT_SONG.coverPath

    for (const audioFile of files) {
      const audioExt = extname(audioFile.name).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(audioExt)) continue
      const title = audioFile.name.slice(0, -audioExt.length) || 'Unknown Song'
      tracks.push({
        id: `${folderName}::${audioFile.name}`,
        title,
        artist,
        album,
        coverPath,
        audioPath: toWebPath(join(albumAbsPath, audioFile.name)),
        durationSec: DEFAULT_SONG_DURATION_SEC,
      })
    }
  }

  tracks.sort((a, b) => {
    if (a.artist !== b.artist) return a.artist.localeCompare(b.artist)
    if (a.album !== b.album) return a.album.localeCompare(b.album)
    return a.title.localeCompare(b.title)
  })

  return tracks
}

function setNowPlaying(track) {
  state.music.song = {
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverPath: track.coverPath,
    audioPath: track.audioPath,
    durationSec: track.durationSec ?? DEFAULT_SONG_DURATION_SEC,
  }
  state.music.playback.sequence += 1
  state.music.playback.status = 'playing'
  state.music.playback.startedAt = Date.now()
  state.music.playback.pauseStartedAt = null
  state.music.playback.pausedMsTotal = 0
}

function nextTrackFromLibrary() {
  const list = state.music.library
  if (!Array.isArray(list) || list.length === 0) return null
  const currentPath = state.music?.song?.audioPath
  const idx = list.findIndex(track => track.audioPath === currentPath)
  if (idx < 0) return list[0]
  return list[(idx + 1) % list.length]
}

function reloadMusicLibrary() {
  const currentPath = state.music?.song?.audioPath
  const tracks = readMusicLibraryFromDisk()
  state.music.library = tracks.length > 0 ? tracks : [{
    id: 'default-song',
    ...DEFAULT_SONG,
  }]
  const currentTrack = state.music.library.find(track => track.audioPath === currentPath)
  if (currentTrack) {
    state.music.song = {
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      coverPath: currentTrack.coverPath,
      audioPath: currentTrack.audioPath,
      durationSec: currentTrack.durationSec,
    }
  } else {
    setNowPlaying(state.music.library[0])
  }
  logMusicDebug(`Reloaded music library with ${state.music.library.length} track(s).`)
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  try {
    return {
      mime: match[1].toLowerCase(),
      buffer: Buffer.from(match[2], 'base64'),
    }
  } catch {
    return null
  }
}

function extensionForMime(mime, fallback = '') {
  if (mime === 'audio/mpeg') return '.mp3'
  if (mime === 'audio/ogg') return '.ogg'
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return '.wav'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  return fallback
}

function createInitialMusicState() {
  return {
    library: [{ id: 'default-song', ...DEFAULT_SONG }],
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
  const savedLibrary = Array.isArray(savedMusic?.library) ? savedMusic.library : []
  const library = savedLibrary
    .filter(track => track && typeof track === 'object')
    .map(track => ({
      id: typeof track.id === 'string' && track.id.trim() ? track.id : `${track.album ?? 'Unknown'}::${track.title ?? 'Unknown'}`,
      title: typeof track.title === 'string' && track.title.trim() ? track.title : DEFAULT_SONG.title,
      artist: typeof track.artist === 'string' && track.artist.trim() ? track.artist : DEFAULT_SONG.artist,
      album: typeof track.album === 'string' && track.album.trim() ? track.album : DEFAULT_SONG.album,
      coverPath: typeof track.coverPath === 'string' && track.coverPath.trim() ? track.coverPath : DEFAULT_SONG.coverPath,
      audioPath: typeof track.audioPath === 'string' && track.audioPath.trim() ? track.audioPath : DEFAULT_SONG.audioPath,
      durationSec: typeof track.durationSec === 'number' && track.durationSec >= 0 ? track.durationSec : DEFAULT_SONG_DURATION_SEC,
    }))
  const mergedSong = {
    title: typeof savedMusic?.song?.title === 'string' && savedMusic.song.title.trim() ? savedMusic.song.title : DEFAULT_SONG.title,
    artist: typeof savedMusic?.song?.artist === 'string' && savedMusic.song.artist.trim() ? savedMusic.song.artist : DEFAULT_SONG.artist,
    album: typeof savedMusic?.song?.album === 'string' && savedMusic.song.album.trim() ? savedMusic.song.album : DEFAULT_SONG.album,
    coverPath: typeof savedMusic?.song?.coverPath === 'string' && savedMusic.song.coverPath.trim() ? savedMusic.song.coverPath : DEFAULT_SONG.coverPath,
    audioPath: typeof savedMusic?.song?.audioPath === 'string' && savedMusic.song.audioPath.trim() ? savedMusic.song.audioPath : DEFAULT_SONG.audioPath,
    durationSec: typeof savedMusic?.song?.durationSec === 'number' && savedMusic.song.durationSec >= 0 ? savedMusic.song.durationSec : DEFAULT_SONG.durationSec,
  }
  const status = savedMusic?.playback?.status === 'paused' ? 'paused' : 'playing'
  let pauseStartedAt = null
  let playbackStatus = status
  if (status === 'paused' && typeof savedMusic?.playback?.pauseStartedAt === 'number') {
    pauseStartedAt = savedMusic.playback.pauseStartedAt
  } else if (status === 'paused') {
    playbackStatus = 'playing'
    logMusicDebug('Recovered from invalid paused state: missing timestamp. Resumed playback automatically.', 'warn')
  }
  return {
    library: library.length > 0 ? library : [{ id: 'default-song', ...DEFAULT_SONG }],
    song: mergedSong,
    playback: {
      status: playbackStatus,
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
    library: state.music.library,
    debugMessages: musicDebugMessages,
    song: { ...state.music.song },
    status: state.music.playback.status,
    sequence: state.music.playback.sequence,
    startedAt: state.music.playback.startedAt,
    pauseStartedAt: state.music.playback.pauseStartedAt,
    pausedMsTotal: state.music.playback.pausedMsTotal,
    serverTime: Date.now(),
  }
}

function applyActiveOverlayPlaybackDefault() {
  const active = getActive()
  if (!active?.nowPlayingPopup) return
  if (active.nowPlayingPopup.defaultPlayMusic) resumeMusic()
  else pauseMusic()
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
  const next = nextTrackFromLibrary()
  if (!next) return
  setNowPlaying(next)
}

const app = express()
const PORT = 3302

let state = loadState()
reloadMusicLibrary()
const clients = new Set()

app.use(express.json({ limit: '50mb' }))

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
    nowPlayingPopup: active.nowPlayingPopup,
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
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name, nowPlayingPopup: o.nowPlayingPopup })),
  })
})

app.post('/api/overlays', (req, res) => {
  const name = (typeof req.body?.name === 'string' && req.body.name.trim())
    ? req.body.name.trim()
    : `Overlay ${state.overlays.length + 1}`
  const overlay = {
    id: newId(),
    name,
    nowPlayingPopup: normalizeNowPlayingPopup(null),
    modules: [createModule('progressBar', state.moduleDefaults, newId)],
  }
  state.overlays.push(overlay)
  saveState()
  broadcast()
  res.status(201).json({ id: overlay.id, name: overlay.name, nowPlayingPopup: overlay.nowPlayingPopup })
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
    overlays: state.overlays.map(o => ({ id: o.id, name: o.name, nowPlayingPopup: o.nowPlayingPopup })),
  })
})

app.patch('/api/overlays/:id', (req, res) => {
  const overlay = getOverlay(req.params.id)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  if (typeof req.body?.name === 'string' && req.body.name.trim()) overlay.name = req.body.name.trim()
  if (!overlay.nowPlayingPopup) overlay.nowPlayingPopup = normalizeNowPlayingPopup(null)
  patchNowPlayingPopup(overlay.nowPlayingPopup, req.body?.nowPlayingPopup)
  if (overlay.id === state.activeId && req.body?.nowPlayingPopup && typeof req.body.nowPlayingPopup === 'object') {
    applyActiveOverlayPlaybackDefault()
  }
  saveState()
  broadcast()
  res.json({ id: overlay.id, name: overlay.name, nowPlayingPopup: overlay.nowPlayingPopup })
})

app.post('/api/overlays/:id/activate', (req, res) => {
  if (!getOverlay(req.params.id)) return res.status(404).json({ error: 'Overlay not found' })
  state.activeId = req.params.id
  applyActiveOverlayPlaybackDefault()
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
  if (!overlay.nowPlayingPopup) overlay.nowPlayingPopup = normalizeNowPlayingPopup(null)
  res.json({ modules: overlay.modules, nowPlayingPopup: overlay.nowPlayingPopup })
})

app.get('/api/music', (req, res) => {
  res.json(getMusicSnapshot())
})

app.get('/api/music/library', (req, res) => {
  res.json(getMusicSnapshot())
})

app.post('/api/music/reload', (req, res) => {
  reloadMusicLibrary()
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/select', (req, res) => {
  const trackId = typeof req.body?.id === 'string' ? req.body.id : ''
  const track = state.music.library.find(item => item.id === trackId)
  if (!track) return res.status(404).json({ error: 'Track not found' })
  setNowPlaying(track)
  logMusicDebug(`Set now playing track to "${track.title}" by ${track.artist}.`)
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/import', musicImportLimiter, (req, res) => {
  const artistRaw = req.body?.artist
  const trackNameRaw = req.body?.trackName
  const trackDataUrl = req.body?.trackDataUrl
  const coverDataUrl = req.body?.coverDataUrl
  const trackFileName = req.body?.trackFileName
  const coverFileName = req.body?.coverFileName

  if (typeof artistRaw !== 'string' || !artistRaw.trim()) {
    return res.status(400).json({ error: 'Artist is required' })
  }
  if (typeof trackNameRaw !== 'string' || !trackNameRaw.trim()) {
    return res.status(400).json({ error: 'Track name is required' })
  }

  const trackPayload = parseDataUrl(trackDataUrl)
  const coverPayload = parseDataUrl(coverDataUrl)
  if (!trackPayload || !trackPayload.mime.startsWith('audio/')) {
    return res.status(400).json({ error: 'Invalid track file payload' })
  }
  if (!coverPayload || !coverPayload.mime.startsWith('image/')) {
    return res.status(400).json({ error: 'Invalid cover image payload' })
  }

  const requestedTrackExt = extname(String(trackFileName ?? '')).toLowerCase()
  const trackExt = AUDIO_EXTENSIONS.has(requestedTrackExt)
    ? requestedTrackExt
    : extensionForMime(trackPayload.mime, '')
  if (!AUDIO_EXTENSIONS.has(trackExt)) {
    return res.status(400).json({ error: 'Unsupported track format. Use .mp3, .ogg, or .wav' })
  }

  const requestedCoverExt = extname(String(coverFileName ?? '')).toLowerCase()
  const coverExt = IMAGE_EXTENSIONS.has(requestedCoverExt)
    ? requestedCoverExt
    : extensionForMime(coverPayload.mime, '.jpg')
  if (!IMAGE_EXTENSIONS.has(coverExt)) {
    return res.status(400).json({ error: 'Unsupported cover format. Use .jpg, .jpeg, .png, or .webp' })
  }

  const artist = sanitizeSegment(artistRaw, 'Unknown Artist')
  const trackTitle = sanitizeSegment(trackNameRaw, 'Unknown Song')
  const albumFolder = `Imported - ${artist}`
  const albumDir = join(MUSIC_DIR, albumFolder)
  if (!existsSync(albumDir)) mkdirSync(albumDir, { recursive: true })

  const trackPath = join(albumDir, `${trackTitle}${trackExt}`)
  const coverPath = join(albumDir, `cover${coverExt}`)

  writeFileSync(trackPath, trackPayload.buffer)
  writeFileSync(coverPath, coverPayload.buffer)

  reloadMusicLibrary()
  const importedTrack = state.music.library.find(track => track.audioPath === toWebPath(trackPath))
  if (importedTrack) setNowPlaying(importedTrack)
  else logMusicDebug('Warning: Imported track not found in reloaded library.', 'warn')
  logMusicDebug(`Imported track "${trackTitle}" by ${artist}.`)
  saveState()
  broadcast()
  res.status(201).json(getMusicSnapshot())
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
