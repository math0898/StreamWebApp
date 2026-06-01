export const DEFAULT_BAR = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
export const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }
export const DEFAULT_IMAGE_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TEXT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 }
export const DEFAULT_LEADERBOARD_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_LEADERBOARD_ART = {
  src: '',
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
  blurPx: 0,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
}
export const DEFAULT_LEADERBOARD_TEXT_OUTLINE = {
  sizePx: 0,
  color: '#000000',
}

export const MODULE_TYPES = new Set(['progressBar', 'image', 'text', 'dj', 'leaderboard'])

export const FACTORY_MODULE_DEFAULTS = {
  progressBar: {
    label: 'Counter',
    max: 100,
    color: '#82b1ff',
    bar: { ...DEFAULT_BAR },
    title: { ...DEFAULT_TITLE },
    value: { ...DEFAULT_VALUE },
  },
  image: {
    src: '/sample-module-image.svg',
    alt: 'Sample module image',
    opacity: 1,
    transform: { ...DEFAULT_IMAGE_TRANSFORM },
  },
  text: {
    text: 'Sample text',
    color: '#ffffff',
    transform: { ...DEFAULT_TEXT_TRANSFORM },
  },
  dj: {
    likedBonus: 1.0,
    minRepeats: 0,
    stylePenalty: 0.1,
    variance: 0,
    moodWindow: 5,
    targetStyles: [],
    targetAttributes: {},
  },
  leaderboard: {
    name: 'Leaderboard',
    scoreType: 'number',
    topCount: 3,
    neighborCount: 2,
    transform: { ...DEFAULT_LEADERBOARD_TRANSFORM },
    appearance: {
      showRankNumbers: true,
      textColor: '#ffffff',
      defaultUsernameColor: '#ffffff',
      usernameColors: {},
      numberColorMode: 'solid',
      numberColor: '#82b1ff',
      numberColorKeys: [],
      focusHighlightColor: '#82b1ff',
      focusHighlightAlpha: 255,
      backgroundColor: '#000000',
      backgroundAlpha: 199,
      borderColor: '#ffffff',
      borderAlpha: 36,
      backgroundImage: { ...DEFAULT_LEADERBOARD_ART },
      titleOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE },
      participantOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE },
      scoreOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE },
      participantIconSizePx: 24,
      autoHide: {
        enabled: false,
        hideDelaySec: 30,
        periodicShowSec: 5,
        periodicIntervalSec: 60,
        animation: {
          transitionDurationSec: 0.35,
          motionDirection: 'down',
          motionDistancePx: 14,
          motionInterpolation: 'linear',
        },
      },
    },
    focusParticipantId: 'streamer',
    participants: [
      { id: 'streamer', username: 'Streamer', score: 50 },
      { id: 'challenger-1', username: 'Rival One', score: 65 },
      { id: 'challenger-2', username: 'Rival Two', score: 42 },
      { id: 'challenger-3', username: 'Rival Three', score: 31 },
    ],
  },
}

function sanitizeHexColor(raw, fallback) {
  if (typeof raw !== 'string') return fallback
  const normalized = raw.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback
}

function sanitizeAlpha(raw, fallback) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 255) return fallback
  return Math.round(n)
}

function sanitizeOpacity(raw, fallback) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback
  return n
}

function sanitizeNonNegative(raw, fallback) {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function sanitizeLeaderboardArt(raw, fallback = DEFAULT_LEADERBOARD_ART) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    src: typeof source.src === 'string' ? source.src.trim() : fallback.src,
    x: typeof source.x === 'number' && Number.isFinite(source.x) ? source.x : fallback.x,
    y: typeof source.y === 'number' && Number.isFinite(source.y) ? source.y : fallback.y,
    scaleX: typeof source.scaleX === 'number' && Number.isFinite(source.scaleX) ? source.scaleX : fallback.scaleX,
    scaleY: typeof source.scaleY === 'number' && Number.isFinite(source.scaleY) ? source.scaleY : fallback.scaleY,
    opacity: sanitizeOpacity(source.opacity, fallback.opacity),
    blurPx: sanitizeNonNegative(source.blurPx, fallback.blurPx ?? 0),
    cropTop: sanitizeNonNegative(source.cropTop, fallback.cropTop),
    cropRight: sanitizeNonNegative(source.cropRight, fallback.cropRight),
    cropBottom: sanitizeNonNegative(source.cropBottom, fallback.cropBottom),
    cropLeft: sanitizeNonNegative(source.cropLeft, fallback.cropLeft),
  }
}

function sanitizeLeaderboardTextOutline(raw, fallback = DEFAULT_LEADERBOARD_TEXT_OUTLINE) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    sizePx: sanitizeNonNegative(source.sizePx, fallback.sizePx ?? 0),
    color: sanitizeHexColor(source.color, fallback.color ?? '#000000'),
  }
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

  const fallbackAutoHide = fallback.autoHide ?? FACTORY_MODULE_DEFAULTS.leaderboard.appearance.autoHide
  const srcAutoHide = source.autoHide && typeof source.autoHide === 'object' ? source.autoHide : {}
  const fallbackAnimation = fallbackAutoHide.animation ?? FACTORY_MODULE_DEFAULTS.leaderboard.appearance.autoHide.animation
  const srcAnimation = srcAutoHide.animation && typeof srcAutoHide.animation === 'object' ? srcAutoHide.animation : {}
  const autoHide = {
    enabled: typeof srcAutoHide.enabled === 'boolean' ? srcAutoHide.enabled : !!fallbackAutoHide.enabled,
    hideDelaySec: typeof srcAutoHide.hideDelaySec === 'number' && srcAutoHide.hideDelaySec >= 0
      ? srcAutoHide.hideDelaySec : fallbackAutoHide.hideDelaySec,
    periodicShowSec: typeof srcAutoHide.periodicShowSec === 'number' && srcAutoHide.periodicShowSec >= 0
      ? srcAutoHide.periodicShowSec : fallbackAutoHide.periodicShowSec,
    periodicIntervalSec: typeof srcAutoHide.periodicIntervalSec === 'number' && srcAutoHide.periodicIntervalSec >= 0
      ? srcAutoHide.periodicIntervalSec : fallbackAutoHide.periodicIntervalSec,
    animation: {
      transitionDurationSec: typeof srcAnimation.transitionDurationSec === 'number' && srcAnimation.transitionDurationSec >= 0
        ? srcAnimation.transitionDurationSec
        : fallbackAnimation.transitionDurationSec,
      motionDirection: ['none', 'up', 'down', 'left', 'right'].includes(srcAnimation.motionDirection)
        ? srcAnimation.motionDirection
        : fallbackAnimation.motionDirection,
      motionDistancePx: typeof srcAnimation.motionDistancePx === 'number' && srcAnimation.motionDistancePx >= 0
        ? srcAnimation.motionDistancePx
        : fallbackAnimation.motionDistancePx,
      motionInterpolation: ['linear', 'quadratic', 'exponential'].includes(srcAnimation.motionInterpolation)
        ? srcAnimation.motionInterpolation
        : fallbackAnimation.motionInterpolation,
    },
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
    focusHighlightAlpha: sanitizeAlpha(source.focusHighlightAlpha, fallback.focusHighlightAlpha ?? 255),
    backgroundColor: sanitizeHexColor(source.backgroundColor, fallback.backgroundColor ?? '#000000'),
    backgroundAlpha: sanitizeAlpha(source.backgroundAlpha, fallback.backgroundAlpha ?? 199),
    borderColor: sanitizeHexColor(source.borderColor, fallback.borderColor ?? '#ffffff'),
    borderAlpha: sanitizeAlpha(source.borderAlpha, fallback.borderAlpha ?? 36),
    backgroundImage: sanitizeLeaderboardArt(source.backgroundImage, fallback.backgroundImage ?? DEFAULT_LEADERBOARD_ART),
    titleOutline: sanitizeLeaderboardTextOutline(source.titleOutline, fallback.titleOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    participantOutline: sanitizeLeaderboardTextOutline(source.participantOutline, fallback.participantOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    scoreOutline: sanitizeLeaderboardTextOutline(source.scoreOutline, fallback.scoreOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    participantIconSizePx: sanitizeNonNegative(source.participantIconSizePx, fallback.participantIconSizePx ?? 24),
    autoHide,
  }
}

class AbstractModule {
  constructor(saved, newId, type) {
    this.id = saved?.id ?? newId()
    this.type = type
    this.hidden = saved?.hidden === true
  }

  patchShared(patch) {
    if (typeof patch?.hidden === 'boolean') this.hidden = patch.hidden
  }
}

class ProgressBarModule extends AbstractModule {
  constructor(saved, newId) {
    super(saved, newId, 'progressBar')
    const d = FACTORY_MODULE_DEFAULTS.progressBar
    const legacyMax = typeof saved?.max === 'number' ? saved.max : undefined
    this.label = typeof saved?.label === 'string' ? saved.label : d.label
    this.count = typeof saved?.count === 'number' ? saved.count : 0
    this.max = legacyMax && legacyMax > 0 ? legacyMax : d.max
    this.color = typeof saved?.color === 'string' ? saved.color : d.color
    this.bar = { ...DEFAULT_BAR, ...(saved?.bar ?? {}) }
    this.title = { ...DEFAULT_TITLE, ...(saved?.title ?? {}) }
    this.value = { ...DEFAULT_VALUE, ...(saved?.value ?? {}) }
    this.patch(saved ?? {})
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.label === 'string') this.label = patch.label
    if (typeof patch?.count === 'number') this.count = patch.count
    if (typeof patch?.max === 'number' && patch.max > 0) this.max = patch.max
    if (typeof patch?.color === 'string') this.color = patch.color

    if (patch?.bar && typeof patch.bar === 'object') {
      const { x, y, scaleX, scaleY } = patch.bar
      if (typeof x === 'number') this.bar.x = x
      if (typeof y === 'number') this.bar.y = y
      if (typeof scaleX === 'number') this.bar.scaleX = scaleX
      if (typeof scaleY === 'number') this.bar.scaleY = scaleY
    }

    for (const key of ['title', 'value']) {
      if (patch?.[key] && typeof patch[key] === 'object') {
        const { x, y, fontSize } = patch[key]
        if (typeof x === 'number') this[key].x = x
        if (typeof y === 'number') this[key].y = y
        if (typeof fontSize === 'number' && fontSize > 0) this[key].fontSize = fontSize
      }
    }
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      label: this.label,
      count: this.count,
      max: this.max,
      color: this.color,
      bar: { ...this.bar },
      title: { ...this.title },
      value: { ...this.value },
    }
  }
}

class ImageModule extends AbstractModule {
  constructor(saved, newId) {
    super(saved, newId, 'image')
    const d = FACTORY_MODULE_DEFAULTS.image
    this.name = typeof saved?.name === 'string' ? saved.name : ''
    this.src = typeof saved?.src === 'string' ? saved.src : d.src
    this.alt = typeof saved?.alt === 'string' ? saved.alt : d.alt
    this.opacity = typeof saved?.opacity === 'number' ? saved.opacity : d.opacity
    this.transform = { ...DEFAULT_IMAGE_TRANSFORM, ...(saved?.transform ?? {}) }
    this.patch(saved ?? {})
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.name === 'string') this.name = patch.name
    if (typeof patch?.src === 'string') this.src = patch.src
    if (typeof patch?.alt === 'string') this.alt = patch.alt
    if (typeof patch?.opacity === 'number' && patch.opacity >= 0 && patch.opacity <= 1) this.opacity = patch.opacity

    if (patch?.transform && typeof patch.transform === 'object') {
      const { x, y, scaleX, scaleY } = patch.transform
      if (typeof x === 'number') this.transform.x = x
      if (typeof y === 'number') this.transform.y = y
      if (typeof scaleX === 'number') this.transform.scaleX = scaleX
      if (typeof scaleY === 'number') this.transform.scaleY = scaleY
    }
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      name: this.name,
      src: this.src,
      alt: this.alt,
      opacity: this.opacity,
      transform: { ...this.transform },
    }
  }
}

class TextModule extends AbstractModule {
  constructor(saved, newId) {
    super(saved, newId, 'text')
    const d = FACTORY_MODULE_DEFAULTS.text
    this.name = typeof saved?.name === 'string' ? saved.name : ''
    this.text = typeof saved?.text === 'string' ? saved.text : d.text
    this.color = typeof saved?.color === 'string' ? saved.color : d.color
    this.transform = { ...DEFAULT_TEXT_TRANSFORM, ...(saved?.transform ?? {}) }
    this.patch(saved ?? {})
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.name === 'string') this.name = patch.name
    if (typeof patch?.text === 'string') this.text = patch.text
    if (typeof patch?.color === 'string') this.color = patch.color

    if (patch?.transform && typeof patch.transform === 'object') {
      const { x, y, scaleX, scaleY, fontSize } = patch.transform
      if (typeof x === 'number') this.transform.x = x
      if (typeof y === 'number') this.transform.y = y
      if (typeof scaleX === 'number') this.transform.scaleX = scaleX
      if (typeof scaleY === 'number') this.transform.scaleY = scaleY
      if (typeof fontSize === 'number' && fontSize > 0) this.transform.fontSize = fontSize
    }
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      name: this.name,
      text: this.text,
      color: this.color,
      transform: { ...this.transform },
    }
  }
}

class DJModule extends AbstractModule {
  constructor(saved, newId) {
    super(saved, newId, 'dj')
    const d = FACTORY_MODULE_DEFAULTS.dj
    this.name = typeof saved?.name === 'string' ? saved.name : ''
    this.likedBonus = typeof saved?.likedBonus === 'number' && Number.isFinite(saved.likedBonus)
      ? saved.likedBonus : d.likedBonus
    this.minRepeats = typeof saved?.minRepeats === 'number' && saved.minRepeats >= 0
      ? Math.floor(saved.minRepeats) : d.minRepeats
    this.stylePenalty = typeof saved?.stylePenalty === 'number' && Number.isFinite(saved.stylePenalty)
      ? saved.stylePenalty : d.stylePenalty
    this.variance = typeof saved?.variance === 'number' && Number.isFinite(saved.variance) && saved.variance >= 0
      ? saved.variance : d.variance
    this.moodWindow = typeof saved?.moodWindow === 'number' && saved.moodWindow >= 1
      ? Math.floor(saved.moodWindow) : d.moodWindow
    this.targetStyles = []
    this.targetAttributes = {}
    this.patch(saved ?? {})
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.name === 'string') this.name = patch.name
    if (typeof patch?.likedBonus === 'number' && Number.isFinite(patch.likedBonus)) this.likedBonus = patch.likedBonus
    if (typeof patch?.minRepeats === 'number' && patch.minRepeats >= 0) this.minRepeats = Math.floor(patch.minRepeats)
    if (typeof patch?.stylePenalty === 'number' && Number.isFinite(patch.stylePenalty)) this.stylePenalty = patch.stylePenalty
    if (typeof patch?.variance === 'number' && Number.isFinite(patch.variance) && patch.variance >= 0) this.variance = patch.variance
    if (typeof patch?.moodWindow === 'number' && patch.moodWindow >= 1) this.moodWindow = Math.floor(patch.moodWindow)
    if (Array.isArray(patch?.targetStyles)) {
      this.targetStyles = [...new Set(patch.targetStyles.filter(s => typeof s === 'string' && s.trim()))]
    }
    if (patch?.targetAttributes && typeof patch.targetAttributes === 'object' && !Array.isArray(patch.targetAttributes)) {
      for (const [k, v] of Object.entries(patch.targetAttributes)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          this.targetAttributes[k] = Math.max(0, Math.min(1, v))
        }
      }
    }
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      name: this.name,
      likedBonus: this.likedBonus,
      minRepeats: this.minRepeats,
      stylePenalty: this.stylePenalty,
      variance: this.variance,
      moodWindow: this.moodWindow,
      targetStyles: [...this.targetStyles],
      targetAttributes: { ...this.targetAttributes },
    }
  }
}

function sanitizeParticipant(raw, newId, idx = 0) {
  const fallback = `Player ${idx + 1}`
  const generatedId = typeof newId === 'function' ? newId() : ''
  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : (generatedId || `participant-${idx + 1}`),
    username: typeof raw?.username === 'string' && raw.username.trim() ? raw.username.trim() : fallback,
    score: typeof raw?.score === 'number' && Number.isFinite(raw.score) ? raw.score : 0,
    iconSrc: typeof raw?.iconSrc === 'string' ? raw.iconSrc.trim() : '',
    iconBlurPx: sanitizeNonNegative(raw?.iconBlurPx, 0),
    backdropImage: sanitizeLeaderboardArt(raw?.backdropImage, DEFAULT_LEADERBOARD_ART),
  }
}

class LeaderboardModule extends AbstractModule {
  constructor(saved, newId) {
    super(saved, newId, 'leaderboard')
    const d = FACTORY_MODULE_DEFAULTS.leaderboard
    this.name = typeof saved?.name === 'string' && saved.name.trim() ? saved.name : d.name
    this.scoreType = saved?.scoreType === 'time' ? 'time' : 'number'
    this.topCount = typeof saved?.topCount === 'number' && saved.topCount >= 1 ? Math.floor(saved.topCount) : d.topCount
    this.neighborCount = typeof saved?.neighborCount === 'number' && saved.neighborCount >= 0
      ? Math.floor(saved.neighborCount)
      : d.neighborCount
    this.transform = { ...DEFAULT_LEADERBOARD_TRANSFORM, ...(saved?.transform ?? {}) }
    this.appearance = sanitizeLeaderboardAppearance(saved?.appearance, d.appearance)
    this.focusParticipantId = typeof saved?.focusParticipantId === 'string' ? saved.focusParticipantId : d.focusParticipantId
    this.participants = []
    this.patch(saved ?? {}, newId)
  }

  patch(patch, newId = () => this.id) {
    this.patchShared(patch)
    if (typeof patch?.name === 'string' && patch.name.trim()) this.name = patch.name.trim()
    if (patch?.scoreType === 'time' || patch?.scoreType === 'number') this.scoreType = patch.scoreType
    if (typeof patch?.topCount === 'number' && patch.topCount >= 1) this.topCount = Math.floor(patch.topCount)
    if (typeof patch?.neighborCount === 'number' && patch.neighborCount >= 0) this.neighborCount = Math.floor(patch.neighborCount)
    if (typeof patch?.focusParticipantId === 'string') this.focusParticipantId = patch.focusParticipantId

    if (patch?.transform && typeof patch.transform === 'object') {
      const { x, y, scaleX, scaleY } = patch.transform
      if (typeof x === 'number') this.transform.x = x
      if (typeof y === 'number') this.transform.y = y
      if (typeof scaleX === 'number') this.transform.scaleX = scaleX
      if (typeof scaleY === 'number') this.transform.scaleY = scaleY
    }

    if (patch?.appearance && typeof patch.appearance === 'object') {
      const incoming = patch.appearance
      const merged = {
        ...this.appearance,
        ...incoming,
        usernameColors: incoming.usernameColors && typeof incoming.usernameColors === 'object' && !Array.isArray(incoming.usernameColors)
          ? { ...this.appearance.usernameColors, ...incoming.usernameColors }
          : this.appearance.usernameColors,
        numberColorKeys: Array.isArray(incoming.numberColorKeys) ? incoming.numberColorKeys : this.appearance.numberColorKeys,
        backgroundImage: incoming.backgroundImage && typeof incoming.backgroundImage === 'object'
          ? { ...this.appearance.backgroundImage, ...incoming.backgroundImage }
          : this.appearance.backgroundImage,
        titleOutline: incoming.titleOutline && typeof incoming.titleOutline === 'object'
          ? { ...this.appearance.titleOutline, ...incoming.titleOutline }
          : this.appearance.titleOutline,
        participantOutline: incoming.participantOutline && typeof incoming.participantOutline === 'object'
          ? { ...this.appearance.participantOutline, ...incoming.participantOutline }
          : this.appearance.participantOutline,
        scoreOutline: incoming.scoreOutline && typeof incoming.scoreOutline === 'object'
          ? { ...this.appearance.scoreOutline, ...incoming.scoreOutline }
          : this.appearance.scoreOutline,
        autoHide: incoming.autoHide && typeof incoming.autoHide === 'object'
          ? {
            ...this.appearance.autoHide,
            ...incoming.autoHide,
            animation: incoming.autoHide.animation && typeof incoming.autoHide.animation === 'object'
              ? { ...this.appearance.autoHide.animation, ...incoming.autoHide.animation }
              : this.appearance.autoHide.animation,
          }
          : this.appearance.autoHide,
      }
      this.appearance = sanitizeLeaderboardAppearance(merged, FACTORY_MODULE_DEFAULTS.leaderboard.appearance)
    }

    if (Array.isArray(patch?.participants)) {
      this.participants = patch.participants.map((participant, idx) => sanitizeParticipant(participant, newId, idx))
    } else if (this.participants.length === 0) {
      this.participants = FACTORY_MODULE_DEFAULTS.leaderboard.participants.map((participant, idx) =>
        sanitizeParticipant(participant, newId, idx)
      )
    }

    if (!this.participants.some(participant => participant.id === this.focusParticipantId)) {
      this.focusParticipantId = this.participants[0]?.id ?? ''
    }
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      name: this.name,
      scoreType: this.scoreType,
      topCount: this.topCount,
      neighborCount: this.neighborCount,
      transform: { ...this.transform },
      appearance: {
        ...this.appearance,
        usernameColors: { ...this.appearance.usernameColors },
        numberColorKeys: this.appearance.numberColorKeys.map(item => ({ ...item })),
        backgroundImage: { ...this.appearance.backgroundImage },
        titleOutline: { ...this.appearance.titleOutline },
        participantOutline: { ...this.appearance.participantOutline },
        scoreOutline: { ...this.appearance.scoreOutline },
        autoHide: {
          ...this.appearance.autoHide,
          animation: { ...this.appearance.autoHide.animation },
        },
      },
      focusParticipantId: this.focusParticipantId,
      participants: this.participants.map(participant => ({
        ...participant,
        backdropImage: { ...participant.backdropImage },
      })),
    }
  }
}

function moduleClassFor(type) {
  if (type === 'image') return ImageModule
  if (type === 'text') return TextModule
  if (type === 'dj') return DJModule
  if (type === 'leaderboard') return LeaderboardModule
  return ProgressBarModule
}

export function mergeModule(saved, newId) {
  const normalizedType = MODULE_TYPES.has(saved?.type) ? saved.type : 'progressBar'
  const ModuleClass = moduleClassFor(normalizedType)
  return new ModuleClass(saved, newId).toObject()
}

export function newModule(type, moduleDefaults, newId) {
  const actualType = MODULE_TYPES.has(type) ? type : 'progressBar'

  if (actualType === 'image') {
    const d = moduleDefaults.image
    return new ImageModule({
      hidden: false,
      name: '',
      src: d.src,
      alt: d.alt,
      opacity: d.opacity,
      transform: { ...DEFAULT_IMAGE_TRANSFORM, ...d.transform },
    }, newId).toObject()
  }

  if (actualType === 'text') {
    const d = moduleDefaults.text
    return new TextModule({
      hidden: false,
      name: '',
      text: d.text,
      color: d.color,
      transform: { ...DEFAULT_TEXT_TRANSFORM, ...d.transform },
    }, newId).toObject()
  }

  if (actualType === 'dj') {
    const d = FACTORY_MODULE_DEFAULTS.dj
    return new DJModule({
      hidden: true,
      name: '',
      likedBonus: d.likedBonus,
      minRepeats: d.minRepeats,
      stylePenalty: d.stylePenalty,
      variance: d.variance,
      moodWindow: d.moodWindow,
      targetStyles: [],
      targetAttributes: {},
    }, newId).toObject()
  }

  if (actualType === 'leaderboard') {
    const d = moduleDefaults.leaderboard ?? FACTORY_MODULE_DEFAULTS.leaderboard
    return new LeaderboardModule({
      hidden: false,
      name: d.name,
      scoreType: d.scoreType === 'time' ? 'time' : 'number',
      topCount: d.topCount,
      neighborCount: d.neighborCount,
      transform: { ...DEFAULT_LEADERBOARD_TRANSFORM, ...(d.transform ?? {}) },
      appearance: {
        ...FACTORY_MODULE_DEFAULTS.leaderboard.appearance,
        ...(d.appearance ?? {}),
      },
      focusParticipantId: d.focusParticipantId,
      participants: Array.isArray(d.participants) ? d.participants.map(participant => ({ ...participant })) : [],
    }, newId).toObject()
  }

  const d = moduleDefaults.progressBar
  return new ProgressBarModule({
    hidden: false,
    label: d.label,
    count: 0,
    max: d.max,
    color: d.color,
    bar: { ...DEFAULT_BAR, ...d.bar },
    title: { ...DEFAULT_TITLE, ...d.title },
    value: { ...DEFAULT_VALUE, ...d.value },
  }, newId).toObject()
}

export function patchModule(mod, body) {
  const normalizedType = MODULE_TYPES.has(mod?.type) ? mod.type : 'progressBar'
  const ModuleClass = moduleClassFor(normalizedType)
  const instance = new ModuleClass(mod ?? {}, () => mod?.id ?? '')
  instance.patch(body ?? {})
  return instance.toObject()
}
