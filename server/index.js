import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname, extname, isAbsolute, resolve, sep } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { homedir } from 'os'
import {
  MODULE_TYPES,
  FACTORY_MODULE_DEFAULTS,
  DEFAULT_BAR,
  DEFAULT_TITLE,
  DEFAULT_VALUE,
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_TEXT_TRANSFORM,
  DEFAULT_LEADERBOARD_TRANSFORM,
  mergeModule as mergeOverlayModule,
  newModule as createModule,
  patchModule as patchOverlayModule,
} from './module-models.js'
import { selectNextTrack, computeMoodVector, scoreCandidateTrack } from './dj-selector.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = join(__dirname, 'data.json')
const PUBLIC_DIR = join(__dirname, '..', 'public')
const MUSIC_DIR = join(PUBLIC_DIR, 'Music')
const DEFAULT_MUSIC_LIBRARY_PATH = '/Music'
const DEFAULT_SONG_DURATION_SEC = 0
const DEFAULT_TRACK_ATTRIBUTE_VALUE = 0.5
const LIKED_ATTRIBUTE_ID = 'liked'
const LIKED_POSITIVE_DECAY_MS = 30 * 24 * 60 * 60 * 1000
const LIKED_NEGATIVE_DECAY_MS = 90 * 24 * 60 * 60 * 1000
const DEFAULT_STYLE_OPTIONS = ['Acoustic', 'Piano', 'EDM', 'Lofi', 'Christmas']
const MAX_DEBUG_MESSAGES = 120
const MAX_RECENTLY_PLAYED = 200
const IMPORT_RATE_LIMIT_WINDOW_MS = 60_000
const IMPORT_RATE_LIMIT_MAX_REQUESTS = 8
const LOCAL_IMAGE_RATE_LIMIT_WINDOW_MS = 60_000
const LOCAL_IMAGE_RATE_LIMIT_MAX_REQUESTS = 120
const DOT_CHAR_CODE = '.'.charCodeAt(0)
const ALBUM_FOLDER_SEPARATOR = ' - '
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav'])
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const AUDIO_MIME_TYPES = new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav'])
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const WINDOWS_ABSOLUTE_PATH_RE = /^[a-zA-Z]:[\\/]/
const UNC_ABSOLUTE_PATH_RE = /^\\\\[^\\]+\\[^\\]+/
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
  normalizeVolume: false,
  normalizedVolumeDb: -16,
  animation: {
    songStartShowSec: 6,
    songEndShowSec: 3,
    periodicIntervalSec: 45,
    periodicShowSec: 4,
    transitionDurationSec: 0.35,
    motionDirection: 'down',
    motionDistancePx: 14,
    motionInterpolation: 'linear',
  },
  appearance: {
    scale: 1,
    backgroundColor: '#000000',
    backgroundAlpha: 204,
    borderColor: '#ffffff',
    borderAlpha: 38,
    backgroundImage: { src: '', opacity: 1, blurPx: 0 },
    titleColor: '#ffffff',
    titleFontSizePx: 16,
    artistColor: '#cccccc',
    artistFontSizePx: 14,
    titleOutline: { sizePx: 0, color: '#000000' },
    artistOutline: { sizePx: 0, color: '#000000' },
  },
}
const MIN_NORMALIZED_VOLUME_DB = -36
const MAX_NORMALIZED_VOLUME_DB = 0
const musicDebugMessages = []
// Limit import bursts to reduce abuse of repeated file-write operations.
const musicImportLimiter = rateLimit({
  windowMs: IMPORT_RATE_LIMIT_WINDOW_MS,
  limit: IMPORT_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many import attempts. Please wait and try again.' },
})
const localImageLimiter = rateLimit({
  windowMs: LOCAL_IMAGE_RATE_LIMIT_WINDOW_MS,
  limit: LOCAL_IMAGE_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many image path requests. Please wait and try again.' },
})
const LOCAL_IMAGE_ALLOWED_ROOTS = (() => {
  const configured = (process.env.LOCAL_IMAGE_ALLOWED_ROOTS ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const roots = configured.length > 0 ? configured : [PUBLIC_DIR, homedir()]
  return [...new Set(roots.map(item => resolve(item)))]
})()

function newId() { return randomUUID().slice(0, 8) }

function isAbsoluteFilePath(rawPath) {
  if (typeof rawPath !== 'string') return false
  if (isAbsolute(rawPath)) return true
  if (WINDOWS_ABSOLUTE_PATH_RE.test(rawPath)) return true
  if (UNC_ABSOLUTE_PATH_RE.test(rawPath)) return true
  return false
}

function normalizeAbsoluteImagePath(rawPath) {
  if (typeof rawPath !== 'string') return ''
  const trimmed = rawPath.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('file://')) {
    try {
      const asUrl = new URL(trimmed)
      const decodedPath = decodeURIComponent(asUrl.pathname)
      return decodedPath.replace(/^\/([a-zA-Z]:[\\/])/, '$1')
    } catch {
      return ''
    }
  }
  return trimmed
}

function normalizeForPathCompare(value) {
  if (process.platform === 'win32') return value.toLowerCase()
  return value
}

function isPathWithinRoot(candidatePath, allowedRoot) {
  const normalizedCandidate = normalizeForPathCompare(resolve(candidatePath))
  const normalizedRoot = normalizeForPathCompare(resolve(allowedRoot))
  if (normalizedCandidate === normalizedRoot) return true
  const rootPrefix = normalizedRoot.endsWith(sep) ? normalizedRoot : `${normalizedRoot}${sep}`
  return normalizedCandidate.startsWith(rootPrefix)
}

function getLeaderboardAbsoluteImagePath(moduleId, participantId, kind) {
  const active = getActive()
  const module = active?.modules?.find(item => item?.type === 'leaderboard' && item?.id === moduleId)
  if (!module) return ''
  if (kind === 'background') return module.appearance?.backgroundImage?.src ?? ''
  if (kind !== 'icon' && kind !== 'backdrop') return ''
  const participant = (module.participants ?? []).find(item => item?.id === participantId)
  if (!participant) return ''
  if (kind === 'icon') return participant.iconSrc ?? ''
  return participant.backdropImage?.src ?? ''
}

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

function sanitizeHexColor(raw, fallback) {
  if (typeof raw !== 'string') return fallback
  const normalized = raw.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback
}

function sanitizeLeaderboardAppearance(raw, fallback = FACTORY_MODULE_DEFAULTS.leaderboard.appearance) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const usernameColors = {}
  if (source.usernameColors && typeof source.usernameColors === 'object' && !Array.isArray(source.usernameColors)) {
    for (const [participantId, color] of Object.entries(source.usernameColors)) {
      if (typeof participantId !== 'string' || !participantId.trim()) continue
      const normalizedColor = sanitizeHexColor(color, '')
      if (normalizedColor) usernameColors[participantId] = normalizedColor
    }
  }

  const uniqueGradientKeys = new Map()
  if (Array.isArray(source.numberColorKeys)) {
    for (const item of source.numberColorKeys) {
      if (!item || typeof item !== 'object') continue
      const position = Number(item.position)
      if (!Number.isFinite(position)) continue
      const color = sanitizeHexColor(item.color, '')
      if (!color) continue
      uniqueGradientKeys.set(position, { position, color })
    }
  }

  return {
    showRankNumbers: typeof source.showRankNumbers === 'boolean'
      ? source.showRankNumbers
      : !!fallback.showRankNumbers,
    textColor: sanitizeHexColor(source.textColor, fallback.textColor),
    defaultUsernameColor: sanitizeHexColor(source.defaultUsernameColor, fallback.defaultUsernameColor),
    usernameColors,
    numberColorMode: source.numberColorMode === 'gradient' ? 'gradient' : 'solid',
    numberColor: sanitizeHexColor(source.numberColor, fallback.numberColor),
    numberColorKeys: [...uniqueGradientKeys.values()].sort((a, b) => a.position - b.position),
    focusHighlightColor: sanitizeHexColor(source.focusHighlightColor, fallback.focusHighlightColor),
  }
}

function patchLeaderboard(target, patch) {
  if (typeof patch.name === 'string' && patch.name.trim()) target.name = patch.name.trim()
  if (patch.scoreType === 'number' || patch.scoreType === 'time') target.scoreType = patch.scoreType
  if (typeof patch.topCount === 'number' && patch.topCount >= 1) target.topCount = Math.floor(patch.topCount)
  if (typeof patch.neighborCount === 'number' && patch.neighborCount >= 0) target.neighborCount = Math.floor(patch.neighborCount)
  if (typeof patch.focusParticipantId === 'string') target.focusParticipantId = patch.focusParticipantId

  if (patch.transform && typeof patch.transform === 'object') {
    const { x, y, scaleX, scaleY } = patch.transform
    if (typeof x === 'number') target.transform.x = x
    if (typeof y === 'number') target.transform.y = y
    if (typeof scaleX === 'number') target.transform.scaleX = scaleX
    if (typeof scaleY === 'number') target.transform.scaleY = scaleY
  }

  if (Array.isArray(patch.participants)) {
    target.participants = patch.participants
      .filter(participant => participant && typeof participant === 'object')
      .map((participant, idx) => ({
        id: typeof participant.id === 'string' && participant.id.trim()
          ? participant.id.trim()
          : `participant-${idx + 1}`,
        username: typeof participant.username === 'string' && participant.username.trim()
          ? participant.username.trim()
          : `Player ${idx + 1}`,
        score: typeof participant.score === 'number' && Number.isFinite(participant.score) ? participant.score : 0,
      }))
  }

  if (patch.appearance && typeof patch.appearance === 'object') {
    const merged = {
      ...(target.appearance ?? FACTORY_MODULE_DEFAULTS.leaderboard.appearance),
      ...patch.appearance,
      usernameColors: patch.appearance.usernameColors && typeof patch.appearance.usernameColors === 'object' && !Array.isArray(patch.appearance.usernameColors)
        ? { ...((target.appearance?.usernameColors ?? {})), ...patch.appearance.usernameColors }
        : (target.appearance?.usernameColors ?? {}),
      numberColorKeys: Array.isArray(patch.appearance.numberColorKeys)
        ? patch.appearance.numberColorKeys
        : (target.appearance?.numberColorKeys ?? []),
    }
    target.appearance = sanitizeLeaderboardAppearance(merged, FACTORY_MODULE_DEFAULTS.leaderboard.appearance)
  }
}

function normalizeNowPlayingPopup(savedPopup) {
  const animation = savedPopup?.animation ?? {}
  const normalizeVolumeDbFromLegacyPct = Number.isFinite(savedPopup?.normalizedVolumePct)
    ? Math.max(MIN_NORMALIZED_VOLUME_DB, Math.min(MAX_NORMALIZED_VOLUME_DB, 20 * Math.log10(Math.max(0.0001, savedPopup.normalizedVolumePct / 100))))
    : null
  const normalizeVolumeDb = typeof savedPopup?.normalizedVolumeDb === 'number' && Number.isFinite(savedPopup.normalizedVolumeDb)
    ? Math.max(MIN_NORMALIZED_VOLUME_DB, Math.min(MAX_NORMALIZED_VOLUME_DB, savedPopup.normalizedVolumeDb))
    : (normalizeVolumeDbFromLegacyPct ?? DEFAULT_NOW_PLAYING_POPUP.normalizedVolumeDb)
  return {
    x: typeof savedPopup?.x === 'number' ? savedPopup.x : DEFAULT_NOW_PLAYING_POPUP.x,
    y: typeof savedPopup?.y === 'number' ? savedPopup.y : DEFAULT_NOW_PLAYING_POPUP.y,
    hiddenVisual: typeof savedPopup?.hiddenVisual === 'boolean' ? savedPopup.hiddenVisual : DEFAULT_NOW_PLAYING_POPUP.hiddenVisual,
    defaultPlayMusic: typeof savedPopup?.defaultPlayMusic === 'boolean'
      ? savedPopup.defaultPlayMusic
      : DEFAULT_NOW_PLAYING_POPUP.defaultPlayMusic,
    normalizeVolume: typeof savedPopup?.normalizeVolume === 'boolean'
      ? savedPopup.normalizeVolume
      : DEFAULT_NOW_PLAYING_POPUP.normalizeVolume,
    normalizedVolumeDb: normalizeVolumeDb,
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
      transitionDurationSec: typeof animation.transitionDurationSec === 'number' && animation.transitionDurationSec >= 0
        ? animation.transitionDurationSec
        : DEFAULT_NOW_PLAYING_POPUP.animation.transitionDurationSec,
      motionDirection: ['none', 'up', 'down', 'left', 'right'].includes(animation.motionDirection)
        ? animation.motionDirection
        : DEFAULT_NOW_PLAYING_POPUP.animation.motionDirection,
      motionDistancePx: typeof animation.motionDistancePx === 'number' && animation.motionDistancePx >= 0
        ? animation.motionDistancePx
        : DEFAULT_NOW_PLAYING_POPUP.animation.motionDistancePx,
      motionInterpolation: ['linear', 'quadratic', 'exponential'].includes(animation.motionInterpolation)
        ? animation.motionInterpolation
        : DEFAULT_NOW_PLAYING_POPUP.animation.motionInterpolation,
    },
    appearance: normalizeNowPlayingAppearance(savedPopup?.appearance),
  }
}

function normalizeNowPlayingAppearance(raw) {
  const d = DEFAULT_NOW_PLAYING_POPUP.appearance
  const source = raw && typeof raw === 'object' ? raw : {}
  const bgImg = source.backgroundImage && typeof source.backgroundImage === 'object' ? source.backgroundImage : {}
  const titleOutline = source.titleOutline && typeof source.titleOutline === 'object' ? source.titleOutline : {}
  const artistOutline = source.artistOutline && typeof source.artistOutline === 'object' ? source.artistOutline : {}
  return {
    scale: typeof source.scale === 'number' && Number.isFinite(source.scale) && source.scale > 0 ? source.scale : d.scale,
    backgroundColor: /^#[0-9a-f]{6}$/i.test(source.backgroundColor) ? source.backgroundColor.toLowerCase() : d.backgroundColor,
    backgroundAlpha: Number.isFinite(Number(source.backgroundAlpha)) && Number(source.backgroundAlpha) >= 0 && Number(source.backgroundAlpha) <= 255
      ? Math.round(Number(source.backgroundAlpha)) : d.backgroundAlpha,
    borderColor: /^#[0-9a-f]{6}$/i.test(source.borderColor) ? source.borderColor.toLowerCase() : d.borderColor,
    borderAlpha: Number.isFinite(Number(source.borderAlpha)) && Number(source.borderAlpha) >= 0 && Number(source.borderAlpha) <= 255
      ? Math.round(Number(source.borderAlpha)) : d.borderAlpha,
    backgroundImage: {
      src: typeof bgImg.src === 'string' ? bgImg.src.trim() : d.backgroundImage.src,
      opacity: typeof bgImg.opacity === 'number' && Number.isFinite(bgImg.opacity) && bgImg.opacity >= 0 && bgImg.opacity <= 1
        ? bgImg.opacity : d.backgroundImage.opacity,
      blurPx: typeof bgImg.blurPx === 'number' && bgImg.blurPx >= 0 ? bgImg.blurPx : d.backgroundImage.blurPx,
    },
    titleColor: /^#[0-9a-f]{6}$/i.test(source.titleColor) ? source.titleColor.toLowerCase() : d.titleColor,
    titleFontSizePx: typeof source.titleFontSizePx === 'number' && source.titleFontSizePx > 0 ? source.titleFontSizePx : d.titleFontSizePx,
    artistColor: /^#[0-9a-f]{6}$/i.test(source.artistColor) ? source.artistColor.toLowerCase() : d.artistColor,
    artistFontSizePx: typeof source.artistFontSizePx === 'number' && source.artistFontSizePx > 0 ? source.artistFontSizePx : d.artistFontSizePx,
    titleOutline: {
      sizePx: typeof titleOutline.sizePx === 'number' && titleOutline.sizePx >= 0 ? titleOutline.sizePx : d.titleOutline.sizePx,
      color: /^#[0-9a-f]{6}$/i.test(titleOutline.color) ? titleOutline.color.toLowerCase() : d.titleOutline.color,
    },
    artistOutline: {
      sizePx: typeof artistOutline.sizePx === 'number' && artistOutline.sizePx >= 0 ? artistOutline.sizePx : d.artistOutline.sizePx,
      color: /^#[0-9a-f]{6}$/i.test(artistOutline.color) ? artistOutline.color.toLowerCase() : d.artistOutline.color,
    },
  }
}

function patchNowPlayingPopup(target, patch) {
  if (!patch || typeof patch !== 'object') return
  if (typeof patch.x === 'number') target.x = patch.x
  if (typeof patch.y === 'number') target.y = patch.y
  if (typeof patch.hiddenVisual === 'boolean') target.hiddenVisual = patch.hiddenVisual
  if (typeof patch.defaultPlayMusic === 'boolean') target.defaultPlayMusic = patch.defaultPlayMusic
  if (typeof patch.normalizeVolume === 'boolean') target.normalizeVolume = patch.normalizeVolume
  if (typeof patch.normalizedVolumeDb === 'number' && Number.isFinite(patch.normalizedVolumeDb)) {
    target.normalizedVolumeDb = Math.max(MIN_NORMALIZED_VOLUME_DB, Math.min(MAX_NORMALIZED_VOLUME_DB, patch.normalizedVolumeDb))
  } else if (typeof patch.normalizedVolumePct === 'number' && Number.isFinite(patch.normalizedVolumePct)) {
    target.normalizedVolumeDb = Math.max(
      MIN_NORMALIZED_VOLUME_DB,
      Math.min(
        MAX_NORMALIZED_VOLUME_DB,
        20 * Math.log10(Math.max(0.0001, patch.normalizedVolumePct / 100)),
      ),
    )
  }
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
    if (typeof patch.animation.transitionDurationSec === 'number' && patch.animation.transitionDurationSec >= 0) {
      target.animation.transitionDurationSec = patch.animation.transitionDurationSec
    }
    if (['none', 'up', 'down', 'left', 'right'].includes(patch.animation.motionDirection)) {
      target.animation.motionDirection = patch.animation.motionDirection
    }
    if (typeof patch.animation.motionDistancePx === 'number' && patch.animation.motionDistancePx >= 0) {
      target.animation.motionDistancePx = patch.animation.motionDistancePx
    }
    if (['linear', 'quadratic', 'exponential'].includes(patch.animation.motionInterpolation)) {
      target.animation.motionInterpolation = patch.animation.motionInterpolation
    }
  }
  if (patch.appearance && typeof patch.appearance === 'object') {
    if (!target.appearance) target.appearance = normalizeNowPlayingAppearance(null)
    const app = patch.appearance
    if (typeof app.scale === 'number' && Number.isFinite(app.scale) && app.scale > 0) target.appearance.scale = app.scale
    if (/^#[0-9a-f]{6}$/i.test(app.backgroundColor)) target.appearance.backgroundColor = app.backgroundColor.toLowerCase()
    if (Number.isFinite(Number(app.backgroundAlpha)) && Number(app.backgroundAlpha) >= 0 && Number(app.backgroundAlpha) <= 255) {
      target.appearance.backgroundAlpha = Math.round(Number(app.backgroundAlpha))
    }
    if (/^#[0-9a-f]{6}$/i.test(app.borderColor)) target.appearance.borderColor = app.borderColor.toLowerCase()
    if (Number.isFinite(Number(app.borderAlpha)) && Number(app.borderAlpha) >= 0 && Number(app.borderAlpha) <= 255) {
      target.appearance.borderAlpha = Math.round(Number(app.borderAlpha))
    }
    if (app.backgroundImage && typeof app.backgroundImage === 'object') {
      if (!target.appearance.backgroundImage) target.appearance.backgroundImage = { ...DEFAULT_NOW_PLAYING_POPUP.appearance.backgroundImage }
      if (typeof app.backgroundImage.src === 'string') target.appearance.backgroundImage.src = app.backgroundImage.src.trim()
      if (typeof app.backgroundImage.opacity === 'number' && Number.isFinite(app.backgroundImage.opacity)
        && app.backgroundImage.opacity >= 0 && app.backgroundImage.opacity <= 1) {
        target.appearance.backgroundImage.opacity = app.backgroundImage.opacity
      }
      if (typeof app.backgroundImage.blurPx === 'number' && app.backgroundImage.blurPx >= 0) {
        target.appearance.backgroundImage.blurPx = app.backgroundImage.blurPx
      }
    }
    if (/^#[0-9a-f]{6}$/i.test(app.titleColor)) target.appearance.titleColor = app.titleColor.toLowerCase()
    if (typeof app.titleFontSizePx === 'number' && app.titleFontSizePx > 0) target.appearance.titleFontSizePx = app.titleFontSizePx
    if (/^#[0-9a-f]{6}$/i.test(app.artistColor)) target.appearance.artistColor = app.artistColor.toLowerCase()
    if (typeof app.artistFontSizePx === 'number' && app.artistFontSizePx > 0) target.appearance.artistFontSizePx = app.artistFontSizePx
    if (app.titleOutline && typeof app.titleOutline === 'object') {
      if (!target.appearance.titleOutline) target.appearance.titleOutline = { ...DEFAULT_NOW_PLAYING_POPUP.appearance.titleOutline }
      if (typeof app.titleOutline.sizePx === 'number' && app.titleOutline.sizePx >= 0) target.appearance.titleOutline.sizePx = app.titleOutline.sizePx
      if (/^#[0-9a-f]{6}$/i.test(app.titleOutline.color)) target.appearance.titleOutline.color = app.titleOutline.color.toLowerCase()
    }
    if (app.artistOutline && typeof app.artistOutline === 'object') {
      if (!target.appearance.artistOutline) target.appearance.artistOutline = { ...DEFAULT_NOW_PLAYING_POPUP.appearance.artistOutline }
      if (typeof app.artistOutline.sizePx === 'number' && app.artistOutline.sizePx >= 0) target.appearance.artistOutline.sizePx = app.artistOutline.sizePx
      if (/^#[0-9a-f]{6}$/i.test(app.artistOutline.color)) target.appearance.artistOutline.color = app.artistOutline.color.toLowerCase()
    }
  }
}

function mergeModuleDefaults(saved) {
  const p = saved?.progressBar ?? {}
  const i = saved?.image ?? {}
  const t = saved?.text ?? {}
  const l = saved?.leaderboard ?? {}

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
    leaderboard: {
      name: typeof l.name === 'string' && l.name.trim() ? l.name.trim() : FACTORY_MODULE_DEFAULTS.leaderboard.name,
      scoreType: l.scoreType === 'time' ? 'time' : 'number',
      topCount: typeof l.topCount === 'number' && l.topCount >= 1 ? Math.floor(l.topCount) : FACTORY_MODULE_DEFAULTS.leaderboard.topCount,
      neighborCount: typeof l.neighborCount === 'number' && l.neighborCount >= 0
        ? Math.floor(l.neighborCount)
        : FACTORY_MODULE_DEFAULTS.leaderboard.neighborCount,
      transform: { ...DEFAULT_LEADERBOARD_TRANSFORM, ...(l.transform ?? {}) },
      appearance: sanitizeLeaderboardAppearance(l.appearance, FACTORY_MODULE_DEFAULTS.leaderboard.appearance),
      focusParticipantId: typeof l.focusParticipantId === 'string' ? l.focusParticipantId : FACTORY_MODULE_DEFAULTS.leaderboard.focusParticipantId,
      participants: Array.isArray(l.participants) && l.participants.length > 0
        ? l.participants
          .filter(participant => participant && typeof participant === 'object')
          .map((participant, idx) => ({
            id: typeof participant.id === 'string' && participant.id.trim()
              ? participant.id.trim()
              : `participant-${idx + 1}`,
            username: typeof participant.username === 'string' && participant.username.trim()
              ? participant.username.trim()
              : `Player ${idx + 1}`,
            score: typeof participant.score === 'number' && Number.isFinite(participant.score) ? participant.score : 0,
          }))
        : FACTORY_MODULE_DEFAULTS.leaderboard.participants.map(participant => ({ ...participant })),
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
  let end = cleaned.length
  while (end > 0 && cleaned.charCodeAt(end - 1) === DOT_CHAR_CODE) end -= 1
  const withoutTrailingDots = cleaned.slice(0, end).trimEnd()
  return withoutTrailingDots || fallback
}

function toWebPath(absPath) {
  const rel = absPath.slice(PUBLIC_DIR.length).replaceAll('\\', '/')
  return rel.startsWith('/') ? rel : `/${rel}`
}

function parseAlbumFolderName(folderName) {
  const idx = folderName.lastIndexOf(ALBUM_FOLDER_SEPARATOR)
  if (idx < 0) return { album: folderName, artist: 'Unknown Artist' }
  return {
    album: folderName.slice(0, idx).trim() || folderName,
    artist: folderName.slice(idx + ALBUM_FOLDER_SEPARATOR.length).trim() || 'Unknown Artist',
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
        id: `${encodeURIComponent(folderName)}::${encodeURIComponent(audioFile.name)}`,
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
  // Record the currently-playing track in the recently-played history before
  // switching, so the DJ mood window has an up-to-date sample.
  const outgoingId = state.music.song?.audioPath
    ? (state.music.library.find(t => t.audioPath === state.music.song.audioPath)?.id ?? null)
    : null
  if (outgoingId) {
    if (!Array.isArray(state.music.recentlyPlayed)) state.music.recentlyPlayed = []
    state.music.recentlyPlayed.push(outgoingId)
    if (state.music.recentlyPlayed.length > MAX_RECENTLY_PLAYED) {
      state.music.recentlyPlayed.splice(0, state.music.recentlyPlayed.length - MAX_RECENTLY_PLAYED)
    }
  }
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
  state.music.rulePauseActive = false
}

/**
 * Return the next track to play for the given overlay.
 *
 * If the overlay has a DJ module, the DJ scoring algorithm (see dj-selector.js)
 * is used to choose the best candidate.  Otherwise, tracks advance sequentially.
 *
 * @param {string} [overlayId]
 * @returns {Track | null}
 */
function nextTrackFromLibrary(overlayId = state.activeId) {
  const list = getAllowedTracksForOverlay(overlayId)
  if (!Array.isArray(list) || list.length === 0) return null

  // Look for a DJ module in the target overlay.
  const overlay = getOverlay(overlayId) ?? getActive()
  const djModule = overlay?.modules?.find(m => m.type === 'dj') ?? null

  if (djModule) {
    // ── DJ-guided selection ────────────────────────────────────────────────
    const currentTrackId = state.music.library.find(
      t => t.audioPath === state.music?.song?.audioPath,
    )?.id ?? null

    // IDs of all custom (non-liked) attributes, used for vector computations.
    const customAttrIds = (Array.isArray(state.music.attributeDefinitions)
      ? state.music.attributeDefinitions
      : []
    ).filter(d => d.type === 'custom').map(d => d.id)

    const djConfig = {
      likedBonus:       djModule.likedBonus   ?? 1,
      stylePenalty:     djModule.stylePenalty  ?? 0.1,
      variance:         djModule.variance      ?? 0,
      moodWindow:       djModule.moodWindow    ?? 5,
      minRepeats:       djModule.minRepeats    ?? 0,
      targetStyles:     djModule.targetStyles  ?? [],
      targetAttributes: djModule.targetAttributes ?? {},
    }

    const recentlyPlayed = Array.isArray(state.music.recentlyPlayed)
      ? state.music.recentlyPlayed
      : []

    const selected = selectNextTrack(
      list,
      currentTrackId,
      recentlyPlayed,
      djConfig,
      customAttrIds,
      /* getAttrValues */ (id) => getTrackAttributeValues(id),
      /* getStyles     */ (id) => normalizeStyleList(
        state.music.trackMetadata?.[id]?.styles ?? [],
      ),
    )

    if (selected) {
      logMusicDebug(`DJ selected: "${selected.title}" by ${selected.artist}`)
      return selected
    }
    // Fall through to sequential if DJ returned null (should not happen).
  }

  // ── Sequential fallback ────────────────────────────────────────────────
  const currentPath = state.music?.song?.audioPath
  const idx = list.findIndex(track => track.audioPath === currentPath)
  if (idx < 0) return list[0]
  return list[(idx + 1) % list.length]
}

function reloadMusicLibrary() {
  const currentPath = state.music?.song?.audioPath
  const existingDurations = new Map(
    (Array.isArray(state.music?.library) ? state.music.library : [])
      .map(track => [track?.audioPath, track?.durationSec]),
  )
  const tracks = readMusicLibraryFromDisk().map(track => {
    const existingDuration = existingDurations.get(track.audioPath)
    return {
      ...track,
      durationSec: typeof existingDuration === 'number' && existingDuration > 0
        ? existingDuration
        : track.durationSec,
    }
  })
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
  compactTrackMetadata()
  compactOverlayAlbumRules()
  enforceActiveOverlayTrackRules('rules')
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function createLikedAttributeDefinition() {
  return {
    id: LIKED_ATTRIBUTE_ID,
    name: 'Liked',
    type: 'liked',
  }
}

function normalizeCustomAttributeName(rawName, index) {
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  return name || `Attribute ${index + 1}`
}

function normalizeMusicAttributeDefinitions(savedDefinitions) {
  const custom = []
  const usedIds = new Set([LIKED_ATTRIBUTE_ID])
  const source = Array.isArray(savedDefinitions) ? savedDefinitions : []
  for (let i = 0; i < source.length; i += 1) {
    const item = source[i]
    if (!item || typeof item !== 'object') continue
    if (item.type === 'liked' || item.id === LIKED_ATTRIBUTE_ID) continue
    const id = typeof item.id === 'string' && item.id.trim() && !usedIds.has(item.id.trim())
      ? item.id.trim()
      : newId()
    usedIds.add(id)
    custom.push({
      id,
      name: normalizeCustomAttributeName(item.name, custom.length),
      type: 'custom',
    })
  }
  return [createLikedAttributeDefinition(), ...custom]
}

function normalizeStyleName(raw) {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ')
  return value.slice(0, 40)
}

function normalizeStyleList(rawStyles) {
  if (!Array.isArray(rawStyles)) return []
  const normalized = rawStyles.map(normalizeStyleName).filter(Boolean)
  return [...new Set(normalized)]
}

function isSafeTrackKey(value) {
  if (typeof value !== 'string') return false
  if (!value.trim()) return false
  return value !== '__proto__' && value !== 'constructor' && value !== 'prototype'
}

function getAttributeBounds(definition) {
  if (definition?.id === LIKED_ATTRIBUTE_ID || definition?.type === 'liked') return { min: -1, max: 1, defaultValue: 0 }
  return { min: 0, max: 1, defaultValue: DEFAULT_TRACK_ATTRIBUTE_VALUE }
}

function normalizeTrackAttributeEntry(value, updatedAt, definition) {
  const bounds = getAttributeBounds(definition)
  return {
    value: clamp(typeof value === 'number' ? value : bounds.defaultValue, bounds.min, bounds.max),
    updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  }
}

function normalizeTrackMetadataEntry(rawEntry) {
  const rawAttributes = rawEntry?.attributes && typeof rawEntry.attributes === 'object' ? rawEntry.attributes : {}
  const attributes = Object.create(null)
  for (const [attrId, rawAttr] of Object.entries(rawAttributes)) {
    if (!isSafeTrackKey(attrId)) continue
    if (typeof rawAttr === 'number') {
      attributes[attrId] = { value: rawAttr, updatedAt: Date.now() }
      continue
    }
    if (!rawAttr || typeof rawAttr !== 'object') continue
    attributes[attrId] = {
      value: typeof rawAttr.value === 'number' ? rawAttr.value : rawAttr,
      updatedAt: typeof rawAttr.updatedAt === 'number' ? rawAttr.updatedAt : Date.now(),
    }
  }
  return {
    attributes,
    styles: normalizeStyleList(rawEntry?.styles),
  }
}

function normalizeTrackMetadata(savedTrackMetadata) {
  const metadata = Object.create(null)
  if (!savedTrackMetadata || typeof savedTrackMetadata !== 'object') return metadata
  for (const [trackId, rawEntry] of Object.entries(savedTrackMetadata)) {
    if (!isSafeTrackKey(trackId)) continue
    metadata[trackId] = normalizeTrackMetadataEntry(rawEntry)
  }
  return metadata
}

function createInitialMusicState() {
  return {
    library: [{ id: 'default-song', ...DEFAULT_SONG }],
    song: { ...DEFAULT_SONG },
    attributeDefinitions: normalizeMusicAttributeDefinitions(null),
    trackMetadata: Object.create(null),
    styleOptions: [...DEFAULT_STYLE_OPTIONS],
    overlayAlbumRules: Object.create(null),
    recentlyPlayed: [],
    rulePauseActive: false,
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
  const savedOverlayAlbumRules = savedMusic?.overlayAlbumRules && typeof savedMusic.overlayAlbumRules === 'object'
    ? savedMusic.overlayAlbumRules
    : Object.create(null)
  const overlayAlbumRules = Object.create(null)
  for (const [overlayId, rawRule] of Object.entries(savedOverlayAlbumRules)) {
    if (!isSafeOverlayRuleKey(overlayId)) continue
    overlayAlbumRules[overlayId] = normalizeOverlayAlbumRule(rawRule)
  }
  const styleOptions = normalizeStyleList([
    ...DEFAULT_STYLE_OPTIONS,
    ...(Array.isArray(savedMusic?.styleOptions) ? savedMusic.styleOptions : []),
  ])
  return {
    library: library.length > 0 ? library : [{ id: 'default-song', ...DEFAULT_SONG }],
    song: mergedSong,
    attributeDefinitions: normalizeMusicAttributeDefinitions(savedMusic?.attributeDefinitions),
    trackMetadata: normalizeTrackMetadata(savedMusic?.trackMetadata),
    styleOptions,
    overlayAlbumRules,
    recentlyPlayed: Array.isArray(savedMusic?.recentlyPlayed)
      ? savedMusic.recentlyPlayed.filter(id => typeof id === 'string' && id.trim()).slice(-MAX_RECENTLY_PLAYED)
      : [],
    rulePauseActive: savedMusic?.rulePauseActive === true,
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

function isSafeOverlayRuleKey(value) {
  if (typeof value !== 'string') return false
  if (!value.trim()) return false
  return value !== '__proto__' && value !== 'constructor' && value !== 'prototype'
}

function uniqueNonEmptyStrings(values) {
  if (!Array.isArray(values)) return []
  const normalized = values
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
  return [...new Set(normalized)]
}

function normalizeOverlayAlbumRule(rawRule) {
  return {
    whitelistAlbums: uniqueNonEmptyStrings(rawRule?.whitelistAlbums),
    blacklistAlbums: uniqueNonEmptyStrings(rawRule?.blacklistAlbums),
    uniqueAlbums: uniqueNonEmptyStrings(rawRule?.uniqueAlbums),
  }
}

function getOverlayAlbumRule(overlayId) {
  if (!isSafeOverlayRuleKey(overlayId)) return normalizeOverlayAlbumRule(null)
  if (!state.music.overlayAlbumRules || typeof state.music.overlayAlbumRules !== 'object') {
    state.music.overlayAlbumRules = Object.create(null)
  }
  if (!state.music.overlayAlbumRules[overlayId]) {
    state.music.overlayAlbumRules[overlayId] = normalizeOverlayAlbumRule(null)
  } else {
    state.music.overlayAlbumRules[overlayId] = normalizeOverlayAlbumRule(state.music.overlayAlbumRules[overlayId])
  }
  return state.music.overlayAlbumRules[overlayId]
}

function compactOverlayAlbumRules() {
  if (!state.music.overlayAlbumRules || typeof state.music.overlayAlbumRules !== 'object') {
    state.music.overlayAlbumRules = Object.create(null)
  }
  const allowedOverlayIds = new Set(state.overlays.map(overlay => overlay.id).filter(isSafeOverlayRuleKey))
  for (const overlayId of Object.keys(state.music.overlayAlbumRules)) {
    if (!allowedOverlayIds.has(overlayId)) delete state.music.overlayAlbumRules[overlayId]
  }
  for (const overlayId of allowedOverlayIds) getOverlayAlbumRule(overlayId)
}

function patchOverlayAlbumRule(overlayId, nextRule) {
  if (!isSafeOverlayRuleKey(overlayId)) return
  const normalized = normalizeOverlayAlbumRule(nextRule)
  const target = getOverlayAlbumRule(overlayId)
  target.whitelistAlbums = normalized.whitelistAlbums
  target.blacklistAlbums = normalized.blacklistAlbums
  target.uniqueAlbums = normalized.uniqueAlbums
  for (const overlay of state.overlays) {
    if (overlay.id === overlayId) continue
    const rule = getOverlayAlbumRule(overlay.id)
    rule.uniqueAlbums = rule.uniqueAlbums.filter(album => !target.uniqueAlbums.includes(album))
  }
}

function getMusicAttributeDefinitionMap() {
  const definitions = Array.isArray(state.music.attributeDefinitions) ? state.music.attributeDefinitions : []
  const map = new Map()
  for (const definition of definitions) {
    if (!definition || typeof definition !== 'object') continue
    if (!isSafeTrackKey(definition.id)) continue
    map.set(definition.id, definition)
  }
  if (!map.has(LIKED_ATTRIBUTE_ID)) map.set(LIKED_ATTRIBUTE_ID, createLikedAttributeDefinition())
  return map
}

function getTrackMetadataEntry(trackId) {
  if (!isSafeTrackKey(trackId)) return normalizeTrackMetadataEntry(null)
  if (!state.music.trackMetadata || typeof state.music.trackMetadata !== 'object') {
    state.music.trackMetadata = Object.create(null)
  }
  if (!state.music.trackMetadata[trackId]) {
    state.music.trackMetadata[trackId] = normalizeTrackMetadataEntry(null)
  } else {
    state.music.trackMetadata[trackId] = normalizeTrackMetadataEntry(state.music.trackMetadata[trackId])
  }
  return state.music.trackMetadata[trackId]
}

function ensureTrackMetadataDefaults(trackId, now = Date.now()) {
  const entry = getTrackMetadataEntry(trackId)
  const definitionMap = getMusicAttributeDefinitionMap()
  for (const [definitionId, definition] of definitionMap.entries()) {
    const current = entry.attributes[definitionId]
    const normalized = normalizeTrackAttributeEntry(current?.value, current?.updatedAt, definition)
    if (!current) normalized.updatedAt = now
    entry.attributes[definitionId] = normalized
  }
  for (const definitionId of Object.keys(entry.attributes)) {
    if (!definitionMap.has(definitionId)) delete entry.attributes[definitionId]
  }
  return entry
}

function decayLikedValue(value, updatedAt, now) {
  if (value === 0) return 0
  const elapsedMs = Math.max(0, now - updatedAt)
  if (value > 0) {
    const next = value - (elapsedMs / LIKED_POSITIVE_DECAY_MS)
    return Math.max(0, next)
  }
  const next = value + (elapsedMs / LIKED_NEGATIVE_DECAY_MS)
  return Math.min(0, next)
}

function getTrackAttributeValues(trackId, now = Date.now()) {
  const entry = ensureTrackMetadataDefaults(trackId, now)
  const definitionMap = getMusicAttributeDefinitionMap()
  const values = Object.create(null)
  for (const [definitionId, definition] of definitionMap.entries()) {
    const rawAttr = entry.attributes[definitionId]
    const normalized = normalizeTrackAttributeEntry(rawAttr?.value, rawAttr?.updatedAt, definition)
    if (definitionId === LIKED_ATTRIBUTE_ID) {
      const decayed = decayLikedValue(normalized.value, normalized.updatedAt, now)
      values[definitionId] = decayed
      if (Math.abs(decayed - normalized.value) > 1e-6) {
        entry.attributes[definitionId] = { value: decayed, updatedAt: now }
      } else {
        entry.attributes[definitionId] = normalized
      }
    } else {
      values[definitionId] = normalized.value
      entry.attributes[definitionId] = normalized
    }
  }
  entry.styles = normalizeStyleList(entry.styles)
  return values
}

function compactTrackMetadata() {
  if (!state.music.trackMetadata || typeof state.music.trackMetadata !== 'object') {
    state.music.trackMetadata = Object.create(null)
  }
  const validTrackIds = new Set(
    (Array.isArray(state.music.library) ? state.music.library : [])
      .map(track => track.id)
      .filter(isSafeTrackKey)
  )
  for (const trackId of Object.keys(state.music.trackMetadata)) {
    if (!validTrackIds.has(trackId)) delete state.music.trackMetadata[trackId]
  }
  for (const trackId of validTrackIds) ensureTrackMetadataDefaults(trackId)
}

function patchMusicAttributes(nextAttributes) {
  const normalized = normalizeMusicAttributeDefinitions([
    createLikedAttributeDefinition(),
    ...(Array.isArray(nextAttributes) ? nextAttributes : []),
  ])
  state.music.attributeDefinitions = normalized
  compactTrackMetadata()
}

function patchTrackMetadata(trackId, patch = {}) {
  const entry = ensureTrackMetadataDefaults(trackId)
  const definitionMap = getMusicAttributeDefinitionMap()
  if (patch.attributes && typeof patch.attributes === 'object') {
    for (const [definitionId, rawValue] of Object.entries(patch.attributes)) {
      if (!definitionMap.has(definitionId)) continue
      if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) continue
      const definition = definitionMap.get(definitionId)
      const nextAttr = normalizeTrackAttributeEntry(rawValue, Date.now(), definition)
      entry.attributes[definitionId] = nextAttr
    }
  }
  if (patch.styles !== undefined) {
    entry.styles = normalizeStyleList(patch.styles)
    state.music.styleOptions = normalizeStyleList([
      ...DEFAULT_STYLE_OPTIONS,
      ...(Array.isArray(state.music.styleOptions) ? state.music.styleOptions : []),
      ...entry.styles,
    ])
  }
}

function getAlbumUniqueOwnerMap() {
  const owners = new Map()
  for (const overlay of state.overlays) {
    const rule = getOverlayAlbumRule(overlay.id)
    for (const album of rule.uniqueAlbums) {
      if (!owners.has(album)) owners.set(album, overlay.id)
    }
  }
  return owners
}

function isTrackAllowedForOverlay(track, overlayId, uniqueOwnerMap = getAlbumUniqueOwnerMap()) {
  const album = typeof track?.album === 'string' ? track.album.trim() : ''
  if (!album) return true
  const rule = getOverlayAlbumRule(overlayId)
  if (rule.whitelistAlbums.length > 0 && !rule.whitelistAlbums.includes(album)) return false
  if (rule.blacklistAlbums.includes(album)) return false
  const uniqueOwner = uniqueOwnerMap.get(album)
  if (uniqueOwner && uniqueOwner !== overlayId) return false
  return true
}

function getAllowedTracksForOverlay(overlayId) {
  const list = Array.isArray(state.music.library) ? state.music.library : []
  const uniqueOwnerMap = getAlbumUniqueOwnerMap()
  return list.filter(track => isTrackAllowedForOverlay(track, overlayId, uniqueOwnerMap))
}

function enforceActiveOverlayTrackRules(reason = 'rule update') {
  const active = getActive()
  if (!active) return false
  const allowedTracks = getAllowedTracksForOverlay(active.id)
  const currentPath = state.music?.song?.audioPath
  const currentAllowed = allowedTracks.some(track => track.audioPath === currentPath)
  if (currentAllowed) {
    if (state.music.rulePauseActive && active.nowPlayingPopup?.defaultPlayMusic) {
      resumeMusic()
      state.music.rulePauseActive = false
      logMusicDebug('Resumed playback after overlay rule constraints were satisfied.')
      return true
    }
    return false
  }
  if (allowedTracks.length > 0) {
    setNowPlaying(allowedTracks[0])
    state.music.rulePauseActive = false
    logMusicDebug(`Switched track due to active overlay music ${reason}.`)
    return true
  }
  pauseMusic()
  state.music.rulePauseActive = true
  logMusicDebug(`No tracks satisfy active overlay music ${reason}; playback paused.`, 'warn')
  return false
}

function getMusicSnapshot() {
  compactTrackMetadata()
  compactOverlayAlbumRules()
  const now = Date.now()
  const library = state.music.library.map(track => {
    const entry = getTrackMetadataEntry(track.id)
    return {
      ...track,
      attributes: getTrackAttributeValues(track.id, now),
      styles: normalizeStyleList(entry.styles),
    }
  })
  return {
    library,
    debugMessages: musicDebugMessages,
    song: { ...state.music.song },
    activeOverlayId: state.activeId,
    overlays: state.overlays.map(overlay => ({ id: overlay.id, name: overlay.name })),
    overlayAlbumRules: state.music.overlayAlbumRules,
    attributeDefinitions: state.music.attributeDefinitions,
    styleOptions: normalizeStyleList([
      ...DEFAULT_STYLE_OPTIONS,
      ...(Array.isArray(state.music.styleOptions) ? state.music.styleOptions : []),
    ]),
    status: state.music.playback.status,
    sequence: state.music.playback.sequence,
    startedAt: state.music.playback.startedAt,
    pauseStartedAt: state.music.playback.pauseStartedAt,
    pausedMsTotal: state.music.playback.pausedMsTotal,
    serverTime: now,
  }
}

function applyActiveOverlayPlaybackDefault() {
  const active = getActive()
  if (!active?.nowPlayingPopup) return
  if (active.nowPlayingPopup.defaultPlayMusic) resumeMusic()
  else pauseMusic()
  state.music.rulePauseActive = false
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
  const next = nextTrackFromLibrary(state.activeId)
  if (!next) return
  setNowPlaying(next)
}

const app = express()
const PORT = 3302

let state = loadState()
compactOverlayAlbumRules()
reloadMusicLibrary()
const clients = new Set()

app.use(express.json({ limit: '50mb' }))
app.use('/Music', express.static(MUSIC_DIR))

app.get('/api/local-image', localImageLimiter, (req, res) => {
  const moduleId = typeof req.query.moduleId === 'string' ? req.query.moduleId.trim() : ''
  const participantId = typeof req.query.participantId === 'string' ? req.query.participantId.trim() : ''
  const kind = typeof req.query.kind === 'string' ? req.query.kind.trim() : ''
  if (!moduleId || !['background', 'icon', 'backdrop'].includes(kind)) {
    return res.status(400).json({ error: 'invalid image request' })
  }
  if ((kind === 'icon' || kind === 'backdrop') && !participantId) {
    return res.status(400).json({ error: 'participantId is required for participant images' })
  }
  if (kind === 'background' && participantId) {
    return res.status(400).json({ error: 'participantId is only valid for participant images' })
  }
  const configuredPath = getLeaderboardAbsoluteImagePath(moduleId, participantId, kind)
  const requestedPath = normalizeAbsoluteImagePath(configuredPath)
  if (!requestedPath || !isAbsoluteFilePath(requestedPath)) {
    return res.status(404).json({ error: 'image not found or not absolute' })
  }
  const normalizedPath = resolve(requestedPath)
  const extension = extname(normalizedPath).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return res.status(400).json({ error: 'path must target an image file' })
  }
  if (!LOCAL_IMAGE_ALLOWED_ROOTS.some(root => isPathWithinRoot(normalizedPath, root))) {
    return res.status(403).json({ error: 'path is outside allowed directories' })
  }
  if (!existsSync(normalizedPath)) {
    return res.status(404).json({ error: 'file not found' })
  }
  return res.sendFile(normalizedPath, err => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'file not found' })
    }
  })
})

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
  if (body.leaderboard && typeof body.leaderboard === 'object') {
    patchLeaderboard(state.moduleDefaults.leaderboard, body.leaderboard)
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
  getOverlayAlbumRule(overlay.id)
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
  if (state.music?.overlayAlbumRules && typeof state.music.overlayAlbumRules === 'object') {
    delete state.music.overlayAlbumRules[req.params.id]
  }
  if (wasActive) state.activeId = state.overlays[0].id
  enforceActiveOverlayTrackRules('rules')
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
  if (overlay.id === state.activeId && typeof req.body?.nowPlayingPopup?.defaultPlayMusic === 'boolean') {
    applyActiveOverlayPlaybackDefault()
  }
  saveState()
  broadcast()
  res.json({ id: overlay.id, name: overlay.name, nowPlayingPopup: overlay.nowPlayingPopup })
})

app.post('/api/overlays/:id/activate', (req, res) => {
  if (!getOverlay(req.params.id)) return res.status(404).json({ error: 'Overlay not found' })
  state.activeId = req.params.id
  getOverlayAlbumRule(state.activeId)
  applyActiveOverlayPlaybackDefault()
  enforceActiveOverlayTrackRules('rules')
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
  if (!isTrackAllowedForOverlay(track, state.activeId)) {
    return res.status(400).json({ error: 'Track album is not allowed for the active overlay' })
  }
  setNowPlaying(track)
  logMusicDebug(`Set now playing track to "${track.title}" by ${track.artist}.`)
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/rules', (req, res) => {
  const overlayId = typeof req.body?.overlayId === 'string' ? req.body.overlayId : ''
  const overlay = getOverlay(overlayId)
  if (!overlay) return res.status(404).json({ error: 'Overlay not found' })
  patchOverlayAlbumRule(overlayId, req.body?.rules)
  enforceActiveOverlayTrackRules('rules')
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/attributes', (req, res) => {
  const attributes = req.body?.attributes
  if (!Array.isArray(attributes)) return res.status(400).json({ error: 'attributes must be an array' })
  patchMusicAttributes(attributes)
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/track-meta', (req, res) => {
  const trackId = typeof req.body?.trackId === 'string' ? req.body.trackId : ''
  const track = state.music.library.find(item => item.id === trackId)
  if (!track) return res.status(404).json({ error: 'Track not found' })
  patchTrackMetadata(trackId, {
    attributes: req.body?.attributes,
    styles: req.body?.styles,
  })
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/import', musicImportLimiter, (req, res) => {
  const artistRaw = req.body?.artist
  const albumRaw = req.body?.album
  const trackNameRaw = req.body?.trackName
  const trackDataUrl = req.body?.trackDataUrl
  const coverDataUrl = req.body?.coverDataUrl
  const trackFileName = req.body?.trackFileName
  const coverFileName = req.body?.coverFileName
  const trackDurationRaw = req.body?.trackDurationSec

  if (typeof artistRaw !== 'string' || !artistRaw.trim()) {
    return res.status(400).json({ error: 'Artist is required' })
  }
  if (typeof albumRaw !== 'string' || !albumRaw.trim()) {
    return res.status(400).json({ error: 'Album is required' })
  }
  if (typeof trackNameRaw !== 'string' || !trackNameRaw.trim()) {
    return res.status(400).json({ error: 'Track name is required' })
  }

  const trackPayload = parseDataUrl(trackDataUrl)
  const coverPayload = parseDataUrl(coverDataUrl)
  if (!trackPayload || !AUDIO_MIME_TYPES.has(trackPayload.mime)) {
    return res.status(400).json({ error: 'Invalid track file payload' })
  }
  if (!coverPayload || !IMAGE_MIME_TYPES.has(coverPayload.mime)) {
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
  const album = sanitizeSegment(albumRaw, 'Unknown Album')
  const trackTitle = sanitizeSegment(trackNameRaw, 'Unknown Song')
  const albumFolder = `${album}${ALBUM_FOLDER_SEPARATOR}${artist}`
  const albumDir = join(MUSIC_DIR, albumFolder)
  if (!existsSync(albumDir)) mkdirSync(albumDir, { recursive: true })

  const trackPath = join(albumDir, `${trackTitle}${trackExt}`)
  const coverPath = join(albumDir, `cover${coverExt}`)

  try {
    writeFileSync(trackPath, trackPayload.buffer)
    writeFileSync(coverPath, coverPayload.buffer)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    logMusicDebug(`Import file write failed for "${trackTitle}" from "${album}" by ${artist}: ${detail}`, 'error')
    return res.status(500).json({ error: 'Failed to write imported files' })
  }

  reloadMusicLibrary()
  const importedTrack = state.music.library.find(track => track.audioPath === toWebPath(trackPath))
  const importedDurationSec = typeof trackDurationRaw === 'number' && Number.isFinite(trackDurationRaw) && trackDurationRaw > 0
    ? trackDurationRaw
    : 0
  if (importedTrack) {
    if (importedDurationSec > 0) importedTrack.durationSec = importedDurationSec
    setNowPlaying(importedTrack)
  }
  else logMusicDebug('Warning: Imported track not found in reloaded library.', 'warn')
  logMusicDebug(`Imported track "${trackTitle}" from "${album}" by ${artist}.`)
  saveState()
  broadcast()
  res.status(201).json(getMusicSnapshot())
})

const DJ_SIMULATE_MAX_STEPS_LIMIT = 50

app.post('/api/music/dj-simulate', (req, res) => {
  const overlay = getActive()
  const djModule = overlay?.modules?.find(m => m.type === 'dj') ?? null

  // IDs of all custom (non-liked) attributes.
  const customAttrIds = (Array.isArray(state.music.attributeDefinitions)
    ? state.music.attributeDefinitions
    : []).filter(d => d.type === 'custom').map(d => d.id)

  const djConfig = djModule
    ? {
      likedBonus:       djModule.likedBonus   ?? 1,
      stylePenalty:     djModule.stylePenalty  ?? 0.1,
      moodWindow:       djModule.moodWindow    ?? 5,
      minRepeats:       djModule.minRepeats    ?? 0,
      targetStyles:     djModule.targetStyles  ?? [],
      targetAttributes: djModule.targetAttributes ?? {},
    }
    : {
      likedBonus: 1, stylePenalty: 0.1,
      moodWindow: 5, minRepeats: 0,
      targetStyles: [], targetAttributes: {},
    }

  // Apply caller-supplied target overrides (for simulation without persisting).
  const effectiveTargetAttributes = { ...djConfig.targetAttributes }
  const overrideAttrs = req.body?.targetAttributes
  if (overrideAttrs && typeof overrideAttrs === 'object' && !Array.isArray(overrideAttrs)) {
    for (const [k, v] of Object.entries(overrideAttrs)) {
      if (customAttrIds.includes(k) && typeof v === 'number' && Number.isFinite(v)) {
        effectiveTargetAttributes[k] = Math.max(0, Math.min(1, v))
      }
    }
  }
  const effectiveTargetStyles = Array.isArray(req.body?.targetStyles)
    ? req.body.targetStyles.filter(s => typeof s === 'string' && s.trim())
    : djConfig.targetStyles

  // Resolve starting track.
  const realCurrentId = state.music.library.find(
    t => t.audioPath === state.music?.song?.audioPath,
  )?.id ?? null
  const requestedStartId = typeof req.body?.startTrackId === 'string' ? req.body.startTrackId : null
  const startId = requestedStartId
    ? (state.music.library.find(t => t.id === requestedStartId)?.id ?? realCurrentId)
    : realCurrentId

  // Max simulation steps (capped).
  const maxSteps = Math.min(
    typeof req.body?.maxSteps === 'number' && req.body.maxSteps >= 1
      ? Math.floor(req.body.maxSteps)
      : 20,
    DJ_SIMULATE_MAX_STEPS_LIMIT,
  )

  const now = Date.now()
  const allCandidates = getAllowedTracksForOverlay(state.activeId)

  if (allCandidates.length === 0) {
    return res.json({
      hasDj: djModule !== null,
      customAttrIds,
      attributeDefinitions: state.music.attributeDefinitions,
      djConfig,
      effectiveTargetAttributes,
      effectiveTargetStyles,
      startTrackId: startId,
      steps: [],
      stopReason: 'no_candidates',
      graphPath: [],
      graphTracks: [],
    })
  }

  // Helper: does stylesA share any style with stylesB?
  function sharesStyle(stylesA, stylesB) {
    if (!Array.isArray(stylesA) || !Array.isArray(stylesB)) return false
    const setA = new Set(stylesA)
    return stylesB.some(s => setA.has(s))
  }

  // Score all candidates for a given simulation state.
  function scoreCandidates(moodVector, currentTrackId, excludedIds) {
    const currentStyles = currentTrackId
      ? normalizeStyleList(state.music.trackMetadata?.[currentTrackId]?.styles ?? [])
      : []
    return allCandidates.map(track => {
      const attrs  = getTrackAttributeValues(track.id, now)
      const styles = normalizeStyleList(state.music.trackMetadata?.[track.id]?.styles ?? [])
      const excluded = excludedIds.has(track.id)

      // Mood distance — per attribute
      const moodAttrDistances = {}
      let moodAttrTotal = 0
      for (const attrId of customAttrIds) {
        const a = typeof attrs[attrId] === 'number' ? attrs[attrId] : 0.5
        const m = typeof moodVector[attrId] === 'number' ? moodVector[attrId] : 0.5
        const d = Math.abs(a - m)
        moodAttrDistances[attrId] = d
        moodAttrTotal += d
      }

      // Style penalty vs current song's styles
      const stylePenaltyMood = sharesStyle(styles, currentStyles) ? 0 : djConfig.stylePenalty

      // Liked adjustment
      const likedValue = typeof attrs[LIKED_ATTRIBUTE_ID] === 'number' ? attrs[LIKED_ATTRIBUTE_ID] : 0
      const likedAdjustment = -(likedValue * djConfig.likedBonus)

      const moodScore = moodAttrTotal + stylePenaltyMood + likedAdjustment

      // Target distance — per attribute
      const targetAttrDistances = {}
      let targetAttrTotal = 0
      for (const attrId of customAttrIds) {
        const a = typeof attrs[attrId] === 'number' ? attrs[attrId] : 0.5
        const t = typeof effectiveTargetAttributes[attrId] === 'number' ? effectiveTargetAttributes[attrId] : 0.5
        const d = Math.abs(a - t)
        targetAttrDistances[attrId] = d
        targetAttrTotal += d
      }

      // Style penalty vs target styles (only when target styles are configured)
      const stylePenaltyTarget = (effectiveTargetStyles.length > 0 && !sharesStyle(styles, effectiveTargetStyles))
        ? djConfig.stylePenalty
        : 0

      const targetScore = targetAttrTotal + stylePenaltyTarget

      // Final score = average of mood score and target score (variance omitted for determinism)
      const finalScore = (moodScore + targetScore) / 2

      return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        styles,
        excluded,
        moodAttrDistances,
        stylePenaltyMood,
        likedValue,
        likedAdjustment,
        moodScore,
        targetAttrDistances,
        stylePenaltyTarget,
        targetScore,
        finalScore,
      }
    }).sort((a, b) => {
      // Non-excluded tracks first, then sort by finalScore ascending.
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1
      return a.finalScore - b.finalScore
    })
  }

  // ── Multi-step simulation loop ─────────────────────────────────────────────
  // Seed the history with the real recently-played list so that the initial
  // mood window reflects actual playback state.
  const simHistory = [...(Array.isArray(state.music.recentlyPlayed) ? state.music.recentlyPlayed : [])]
  let currentId = startId
  const steps = []
  const seenStateKeys = new Set()
  let stopReason = 'max_steps'
  const graphPathIds = startId ? [startId] : []

  for (let stepIdx = 0; stepIdx < maxSteps; stepIdx++) {
    // Compute mood from the rolling history window.
    const moodVector = computeMoodVector(
      simHistory,
      djConfig.moodWindow,
      customAttrIds,
      id => getTrackAttributeValues(id, now),
    )

    // Build the exclusion set: the last minRepeats entries + the current song.
    const excludedIds = new Set(
      djConfig.minRepeats > 0 ? simHistory.slice(-djConfig.minRepeats) : [],
    )
    if (currentId) excludedIds.add(currentId)

    const scored = scoreCandidates(moodVector, currentId, excludedIds)

    // Pick best non-excluded track; fall back to best excluded if all excluded.
    const winner = scored.find(c => !c.excluded) ?? scored[0] ?? null

    if (!winner) {
      steps.push({
        stepNumber: stepIdx,
        currentTrackId: currentId,
        moodVector,
        excludedIds: [...excludedIds],
        candidates: scored,
        selectedId: null,
      })
      stopReason = 'no_candidates'
      break
    }

    // Cycle detection: same (moodVector, selectedTrack) pair already seen?
    const moodKey = customAttrIds.map(id => (moodVector[id] ?? 0.5).toFixed(4)).join('\x00')
    const stateKey = `${winner.id}\x00${moodKey}`
    const isCycle = seenStateKeys.has(stateKey)
    seenStateKeys.add(stateKey)

    steps.push({
      stepNumber: stepIdx,
      currentTrackId: currentId,
      moodVector,
      excludedIds: [...excludedIds],
      candidates: scored,
      selectedId: winner.id,
    })

    graphPathIds.push(winner.id)

    if (isCycle) {
      stopReason = 'cycle'
      break
    }

    // Advance simulation state: push current track into history, move to winner.
    if (currentId) {
      simHistory.push(currentId)
      if (simHistory.length > MAX_RECENTLY_PLAYED) {
        simHistory.splice(0, simHistory.length - MAX_RECENTLY_PLAYED)
      }
    }
    currentId = winner.id
  }

  // Build deduplicated track detail map for the graph.
  const uniqueGraphIds = [...new Set(graphPathIds)]
  const libraryById = new Map(state.music.library.map(t => [t.id, t]))
  const graphTracks = uniqueGraphIds.map(id => {
    const track = libraryById.get(id)
    if (!track) return null
    return {
      id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      attrs: getTrackAttributeValues(id, now),
      styles: normalizeStyleList(state.music.trackMetadata?.[id]?.styles ?? []),
    }
  }).filter(Boolean)

  res.json({
    hasDj: djModule !== null,
    customAttrIds,
    attributeDefinitions: state.music.attributeDefinitions,
    djConfig,
    effectiveTargetAttributes,
    effectiveTargetStyles,
    startTrackId: startId,
    steps,
    stopReason,
    graphPath: graphPathIds,
    graphTracks,
  })
})

app.post('/api/music/pause', (req, res) => {
  pauseMusic()
  state.music.rulePauseActive = false
  saveState()
  broadcast()
  res.json(getMusicSnapshot())
})

app.post('/api/music/resume', (req, res) => {
  resumeMusic()
  state.music.rulePauseActive = false
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
