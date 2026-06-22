export const DEFAULT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
export const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }
export const DEFAULT_TEXT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 }
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
export const DEFAULT_BACKGROUND = {
  backgroundColor: '#000000',
  backgroundAlpha: 0,
  borderColor: '#ffffff',
  borderAlpha: 0,
}
export const DEFAULT_ANIMATION = {
  transitionDurationSec: 0.35,
  motionDirection: 'none',
  motionDistancePx: 14,
  motionInterpolation: 'linear',
}

export const DEFAULT_BRAND = {
  background: { backgroundColor: '#000000', backgroundAlpha: 199, borderColor: '#ffffff', borderAlpha: 36 },
  textColor: '#ffffff',
  highlightColor: '#82b1ff',
  numberColor: '#82b1ff',
  defaultUsernameColor: '#ffffff',
  secondHighlightColor: '#82b1ff',
  goodHighlightColor: '#4caf50',
  badHighlightColor: '#f44336',
  bestHighlightColor: '#ffd700',
  opacity: 1,
  animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
}

export const MODULE_TYPES = new Set(['progressBar', 'image', 'text', 'dj', 'leaderboard', 'timer', 'chat'])

export const FACTORY_MODULE_DEFAULTS = {
  progressBar: {
    label: 'Counter',
    max: 100,
    color: '#82b1ff',
    bar: { ...DEFAULT_TRANSFORM },
    title: { ...DEFAULT_TITLE },
    value: { ...DEFAULT_VALUE },
  },
  image: {
    src: '/sample-module-image.svg',
    alt: 'Sample module image',
    opacity: 1,
    transform: { ...DEFAULT_TRANSFORM },
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
    transform: { ...DEFAULT_TRANSFORM },
    background: {
      backgroundColor: '#000000',
      backgroundAlpha: 199,
      borderColor: '#ffffff',
      borderAlpha: 36,
    },
    animation: {
      transitionDurationSec: 0.35,
      motionDirection: 'down',
      motionDistancePx: 14,
      motionInterpolation: 'linear',
    },
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
      bestHighlightColor: '#ffd700',
      goodHighlightColor: '#4caf50',
      badHighlightColor: '#f44336',
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
  timer: {
    mode: 'countdown',
    precision: 'hundredths',
    targetType: 'duration',
    duration: 300000,
    targetDateTime: '',
    maxDuration: 0,
    color: '#ffffff',
    status: 'stopped',
    startedAt: 0,
    pausedAt: 0,
    pausedMsTotal: 0,
    onComplete: {
      freezeAtZero: false,
      flashAnimation: true,
      playSound: false,
      soundSrc: '',
    },
    maxUnit: 'auto',
    transform: { ...DEFAULT_TRANSFORM },
  },
  chat: {
    platform: 'twitch',
    channel: '',
    clientId: '',
    accessToken: '',
    messageLimit: 50,
    fadeOutSec: 30,
    showBadges: true,
    showTimestamps: false,
    fontSize: 18,
    usernameColor: '#ffffff',
    messageColor: '#ffffff',
    prefix: 'Twitch',
    maxLines: 0,
    opacity: 1,
    transform: { ...DEFAULT_TRANSFORM },
    background: { ...DEFAULT_BACKGROUND },
    animation: { ...DEFAULT_ANIMATION },
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

function sanitizeTransform(raw, fallback = DEFAULT_TRANSFORM) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    x: typeof source.x === 'number' && Number.isFinite(source.x) ? source.x : fallback.x,
    y: typeof source.y === 'number' && Number.isFinite(source.y) ? source.y : fallback.y,
    scaleX: typeof source.scaleX === 'number' && Number.isFinite(source.scaleX) ? source.scaleX : fallback.scaleX,
    scaleY: typeof source.scaleY === 'number' && Number.isFinite(source.scaleY) ? source.scaleY : fallback.scaleY,
  }
}

function sanitizeAnimation(raw, fallback = DEFAULT_ANIMATION) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    transitionDurationSec: typeof source.transitionDurationSec === 'number' && source.transitionDurationSec >= 0
      ? source.transitionDurationSec
      : fallback.transitionDurationSec,
    motionDirection: ['none', 'up', 'down', 'left', 'right'].includes(source.motionDirection)
      ? source.motionDirection
      : fallback.motionDirection,
    motionDistancePx: typeof source.motionDistancePx === 'number' && source.motionDistancePx >= 0
      ? source.motionDistancePx
      : fallback.motionDistancePx,
    motionInterpolation: ['linear', 'quadratic', 'exponential'].includes(source.motionInterpolation)
      ? source.motionInterpolation
      : fallback.motionInterpolation,
  }
}

function sanitizeBackground(raw, fallback = DEFAULT_BACKGROUND) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    backgroundColor: sanitizeHexColor(source.backgroundColor, fallback.backgroundColor),
    backgroundAlpha: sanitizeAlpha(source.backgroundAlpha, fallback.backgroundAlpha),
    borderColor: sanitizeHexColor(source.borderColor, fallback.borderColor),
    borderAlpha: sanitizeAlpha(source.borderAlpha, fallback.borderAlpha),
  }
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
  const autoHide = {
    enabled: typeof srcAutoHide.enabled === 'boolean' ? srcAutoHide.enabled : !!fallbackAutoHide.enabled,
    hideDelaySec: typeof srcAutoHide.hideDelaySec === 'number' && srcAutoHide.hideDelaySec >= 0
      ? srcAutoHide.hideDelaySec : fallbackAutoHide.hideDelaySec,
    periodicShowSec: typeof srcAutoHide.periodicShowSec === 'number' && srcAutoHide.periodicShowSec >= 0
      ? srcAutoHide.periodicShowSec : fallbackAutoHide.periodicShowSec,
    periodicIntervalSec: typeof srcAutoHide.periodicIntervalSec === 'number' && srcAutoHide.periodicIntervalSec >= 0
      ? srcAutoHide.periodicIntervalSec : fallbackAutoHide.periodicIntervalSec,
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
    bestHighlightColor: sanitizeHexColor(source.bestHighlightColor, fallback.bestHighlightColor ?? '#ffd700'),
    goodHighlightColor: sanitizeHexColor(source.goodHighlightColor, fallback.goodHighlightColor ?? '#4caf50'),
    badHighlightColor: sanitizeHexColor(source.badHighlightColor, fallback.badHighlightColor ?? '#f44336'),
    backgroundImage: sanitizeLeaderboardArt(source.backgroundImage, fallback.backgroundImage ?? DEFAULT_LEADERBOARD_ART),
    titleOutline: sanitizeLeaderboardTextOutline(source.titleOutline, fallback.titleOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    participantOutline: sanitizeLeaderboardTextOutline(source.participantOutline, fallback.participantOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    scoreOutline: sanitizeLeaderboardTextOutline(source.scoreOutline, fallback.scoreOutline ?? DEFAULT_LEADERBOARD_TEXT_OUTLINE),
    participantIconSizePx: sanitizeNonNegative(source.participantIconSizePx, fallback.participantIconSizePx ?? 24),
    autoHide,
  }
}

export function sanitizeBrand(raw, fallback = DEFAULT_BRAND) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    background: sanitizeBackground(source.background, fallback.background),
    textColor: sanitizeHexColor(source.textColor, fallback.textColor),
    highlightColor: sanitizeHexColor(source.highlightColor, fallback.highlightColor),
    numberColor: sanitizeHexColor(source.numberColor, fallback.numberColor),
    defaultUsernameColor: sanitizeHexColor(source.defaultUsernameColor, fallback.defaultUsernameColor),
    secondHighlightColor: sanitizeHexColor(source.secondHighlightColor, fallback.secondHighlightColor),
    goodHighlightColor: sanitizeHexColor(source.goodHighlightColor, fallback.goodHighlightColor),
    badHighlightColor: sanitizeHexColor(source.badHighlightColor, fallback.badHighlightColor),
    bestHighlightColor: sanitizeHexColor(source.bestHighlightColor, fallback.bestHighlightColor),
    opacity: sanitizeOpacity(source.opacity, fallback.opacity),
    animation: sanitizeAnimation(source.animation, fallback.animation),
  }
}

const BRAND_FIELD_PATHS = ['background', 'opacity', 'animation']

function trackBrandOverride(mod, path) {
  if (!Array.isArray(mod.brandOverrides)) mod.brandOverrides = []
  if (!mod.brandOverrides.includes(path)) mod.brandOverrides.push(path)
}

class AbstractModule {
  constructor(saved, newId, type) {
    this.id = saved?.id ?? newId()
    this.type = type
    this.hidden = saved?.hidden === true
    this.name = typeof saved?.name === 'string' ? saved.name : ''
  }

  patchShared(patch) {
    if (typeof patch?.hidden === 'boolean') this.hidden = patch.hidden
    if (typeof patch?.name === 'string') this.name = patch.name
  }

  toObject() {
    return {
      id: this.id,
      type: this.type,
      hidden: this.hidden,
      name: this.name,
    }
  }
}

class VisualModule extends AbstractModule {
  constructor(saved, newId, type) {
    super(saved, newId, type)
    this.transform = sanitizeTransform(saved?.transform)
    this.opacity = sanitizeOpacity(saved?.opacity, 1)
    this.background = sanitizeBackground(saved?.background)
    this.animation = sanitizeAnimation(saved?.animation)
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patchShared(patch) {
    super.patchShared(patch)
    if (Array.isArray(patch?.brandOverrides)) {
      this.brandOverrides = [...patch.brandOverrides]
    }
    if (patch?.transform && typeof patch.transform === 'object') {
      const { x, y, scaleX, scaleY } = patch.transform
      if (typeof x === 'number' && Number.isFinite(x)) this.transform.x = x
      if (typeof y === 'number' && Number.isFinite(y)) this.transform.y = y
      if (typeof scaleX === 'number' && Number.isFinite(scaleX)) this.transform.scaleX = scaleX
      if (typeof scaleY === 'number' && Number.isFinite(scaleY)) this.transform.scaleY = scaleY
    }
    if (typeof patch?.opacity === 'number' && patch.opacity >= 0 && patch.opacity <= 1) {
      this.opacity = patch.opacity
      trackBrandOverride(this, 'opacity')
    }
    if (patch?.background && typeof patch.background === 'object') {
      this.background = sanitizeBackground({ ...this.background, ...patch.background })
      trackBrandOverride(this, 'background')
    }
    if (patch?.animation && typeof patch.animation === 'object') {
      this.animation = sanitizeAnimation({ ...this.animation, ...patch.animation })
      trackBrandOverride(this, 'animation')
    }
  }

  toObject() {
    return {
      ...super.toObject(),
      transform: { ...this.transform },
      opacity: this.opacity,
      background: { ...this.background },
      animation: { ...this.animation },
      brandOverrides: [...this.brandOverrides],
    }
  }
}

class ProgressBarModule extends VisualModule {
  constructor(saved, newId) {
    super(saved, newId, 'progressBar')
    const d = FACTORY_MODULE_DEFAULTS.progressBar
    const legacyMax = typeof saved?.max === 'number' ? saved.max : undefined
    this.label = typeof saved?.label === 'string' ? saved.label : d.label
    this.count = typeof saved?.count === 'number' ? saved.count : 0
    this.max = legacyMax && legacyMax > 0 ? legacyMax : d.max
    this.color = typeof saved?.color === 'string' ? saved.color : d.color
    this.bar = { ...DEFAULT_TRANSFORM, ...(saved?.bar ?? {}) }
    this.title = { ...DEFAULT_TITLE, ...(saved?.title ?? {}) }
    this.value = { ...DEFAULT_VALUE, ...(saved?.value ?? {}) }
    this.patch(saved ?? {})
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.label === 'string') this.label = patch.label
    if (typeof patch?.count === 'number') this.count = patch.count
    if (typeof patch?.max === 'number' && patch.max > 0) this.max = patch.max
    if (typeof patch?.color === 'string') {
      this.color = patch.color
      trackBrandOverride(this, 'color')
    }

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
      ...super.toObject(),
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

class ImageModule extends VisualModule {
  constructor(saved, newId) {
    super(saved, newId, 'image')
    const d = FACTORY_MODULE_DEFAULTS.image
    this.src = typeof saved?.src === 'string' ? saved.src : d.src
    this.alt = typeof saved?.alt === 'string' ? saved.alt : d.alt
    this.patch(saved ?? {})
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.src === 'string') this.src = patch.src
    if (typeof patch?.alt === 'string') this.alt = patch.alt
  }

  toObject() {
    return {
      ...super.toObject(),
      src: this.src,
      alt: this.alt,
    }
  }
}

class TextModule extends VisualModule {
  constructor(saved, newId) {
    super(saved, newId, 'text')
    const d = FACTORY_MODULE_DEFAULTS.text
    this.text = typeof saved?.text === 'string' ? saved.text : d.text
    this.color = typeof saved?.color === 'string' ? saved.color : d.color
    if (saved?.transform && typeof saved.transform.fontSize === 'number' && saved.transform.fontSize > 0) {
      this.transform.fontSize = saved.transform.fontSize
    } else {
      this.transform.fontSize = d.transform.fontSize
    }
    this.patch(saved ?? {})
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch) {
    this.patchShared(patch)
    if (typeof patch?.text === 'string') this.text = patch.text
    if (typeof patch?.color === 'string') {
      this.color = patch.color
      trackBrandOverride(this, 'color')
    }
    if (patch?.transform && typeof patch.transform === 'object') {
      if (typeof patch.transform.fontSize === 'number' && patch.transform.fontSize > 0) {
        this.transform.fontSize = patch.transform.fontSize
      }
    }
  }

  toObject() {
    return {
      ...super.toObject(),
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
      ...super.toObject(),
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

const VALID_PRECISIONS = new Set(['millis', 'hundredths', 'tenths', 'seconds', 'minutes'])
const VALID_MODES = new Set(['countdown', 'countup'])
const VALID_TARGET_TYPES = new Set(['duration', 'datetime'])

class TimerModule extends VisualModule {
  constructor(saved, newId) {
    super(saved, newId, 'timer')
    const d = FACTORY_MODULE_DEFAULTS.timer
    this.mode = VALID_MODES.has(saved?.mode) ? saved.mode : d.mode
    this.precision = VALID_PRECISIONS.has(saved?.precision) ? saved.precision : d.precision
    this.targetType = VALID_TARGET_TYPES.has(saved?.targetType) ? saved.targetType : d.targetType
    this.duration = typeof saved?.duration === 'number' && saved.duration > 0 ? saved.duration : d.duration
    this.targetDateTime = typeof saved?.targetDateTime === 'string' ? saved.targetDateTime : d.targetDateTime
    this.maxDuration = typeof saved?.maxDuration === 'number' && saved.maxDuration >= 0 ? saved.maxDuration : d.maxDuration
    this.maxUnit = ['auto', 'hours', 'minutes', 'seconds'].includes(saved?.maxUnit) ? saved.maxUnit : d.maxUnit
    this.color = typeof saved?.color === 'string' ? saved.color : d.color
    this.status = ['stopped', 'running', 'paused'].includes(saved?.status) ? saved.status : d.status
    this.startedAt = typeof saved?.startedAt === 'number' ? saved.startedAt : d.startedAt
    this.pausedAt = typeof saved?.pausedAt === 'number' ? saved.pausedAt : d.pausedAt
    this.pausedMsTotal = typeof saved?.pausedMsTotal === 'number' ? saved.pausedMsTotal : d.pausedMsTotal
    this.onComplete = {
      freezeAtZero: saved?.onComplete?.freezeAtZero === true,
      flashAnimation: saved?.onComplete?.flashAnimation !== false,
      playSound: saved?.onComplete?.playSound === true,
      soundSrc: typeof saved?.onComplete?.soundSrc === 'string' ? saved.onComplete.soundSrc : '',
    }
    this.patch(saved ?? {})
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch) {
    this.patchShared(patch)
    if (VALID_MODES.has(patch?.mode)) this.mode = patch.mode
    if (VALID_PRECISIONS.has(patch?.precision)) this.precision = patch.precision
    if (VALID_TARGET_TYPES.has(patch?.targetType)) this.targetType = patch.targetType
    if (typeof patch?.duration === 'number' && patch.duration > 0) this.duration = patch.duration
    if (typeof patch?.targetDateTime === 'string') this.targetDateTime = patch.targetDateTime
    if (typeof patch?.maxDuration === 'number' && patch.maxDuration >= 0) this.maxDuration = patch.maxDuration
    if (['auto', 'hours', 'minutes', 'seconds'].includes(patch?.maxUnit)) this.maxUnit = patch.maxUnit
    if (typeof patch?.color === 'string') {
      this.color = patch.color
      trackBrandOverride(this, 'color')
    }
    if (['stopped', 'running', 'paused'].includes(patch?.status)) {
      const now = Date.now()
      if (patch.status === 'running' && this.status !== 'running') {
        if (this.status === 'paused' && typeof this.pausedAt === 'number') {
          this.pausedMsTotal += now - this.pausedAt
        } else if (this.status === 'stopped') {
          this.startedAt = now
          this.pausedMsTotal = 0
        }
        this.pausedAt = 0
      } else if (patch.status === 'paused' && this.status === 'running') {
        this.pausedAt = now
      } else if (patch.status === 'stopped' && this.status !== 'stopped') {
        this.startedAt = 0
        this.pausedAt = 0
        this.pausedMsTotal = 0
      }
      this.status = patch.status
    }
    if (patch?.onComplete && typeof patch.onComplete === 'object') {
      if (typeof patch.onComplete.freezeAtZero === 'boolean') this.onComplete.freezeAtZero = patch.onComplete.freezeAtZero
      if (typeof patch.onComplete.flashAnimation === 'boolean') this.onComplete.flashAnimation = patch.onComplete.flashAnimation
      if (typeof patch.onComplete.playSound === 'boolean') this.onComplete.playSound = patch.onComplete.playSound
      if (typeof patch.onComplete.soundSrc === 'string') this.onComplete.soundSrc = patch.onComplete.soundSrc
    }
  }

  toObject() {
    return {
      ...super.toObject(),
      mode: this.mode,
      precision: this.precision,
      targetType: this.targetType,
      duration: this.duration,
      targetDateTime: this.targetDateTime,
      maxDuration: this.maxDuration,
      maxUnit: this.maxUnit,
      color: this.color,
      status: this.status,
      startedAt: this.startedAt,
      pausedAt: this.pausedAt,
      pausedMsTotal: this.pausedMsTotal,
      onComplete: { ...this.onComplete },
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

function extractLegacyAppearanceFields(saved) {
  if (!saved?.appearance || typeof saved.appearance !== 'object') return saved
  const legacy = saved.appearance
  const migrated = { ...saved }
  migrated.background = sanitizeBackground({
    ...(saved.background ?? {}),
    backgroundColor: legacy.backgroundColor,
    backgroundAlpha: legacy.backgroundAlpha,
    borderColor: legacy.borderColor,
    borderAlpha: legacy.borderAlpha,
  })
  migrated.animation = sanitizeAnimation({
    ...(saved.animation ?? {}),
    ...(legacy.autoHide?.animation ?? {}),
  })
  return migrated
}

function cleanAppearance(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const cleaned = { ...raw }
  delete cleaned.backgroundColor
  delete cleaned.backgroundAlpha
  delete cleaned.borderColor
  delete cleaned.borderAlpha
  if (cleaned.autoHide && typeof cleaned.autoHide === 'object') {
    cleaned.autoHide = { ...cleaned.autoHide }
    delete cleaned.autoHide.animation
  }
  return cleaned
}

class LeaderboardModule extends VisualModule {
  constructor(saved, newId) {
    const migrated = extractLegacyAppearanceFields(saved)
    super(migrated, newId, 'leaderboard')
    const d = FACTORY_MODULE_DEFAULTS.leaderboard
    this.name = typeof saved?.name === 'string' && saved.name.trim() ? saved.name : d.name
    this.scoreType = saved?.scoreType === 'time' ? 'time' : 'number'
    this.topCount = typeof saved?.topCount === 'number' && saved.topCount >= 1 ? Math.floor(saved.topCount) : d.topCount
    this.neighborCount = typeof saved?.neighborCount === 'number' && saved.neighborCount >= 0
      ? Math.floor(saved.neighborCount)
      : d.neighborCount
    this.appearance = sanitizeLeaderboardAppearance(
      cleanAppearance(saved?.appearance),
      d.appearance,
    )
    this.focusParticipantId = typeof saved?.focusParticipantId === 'string' ? saved.focusParticipantId : d.focusParticipantId
    this.participants = []
    this.patch(saved ?? {}, newId)
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch, newId = () => this.id) {
    this.patchShared(patch)
    if (typeof patch?.name === 'string' && patch.name.trim()) this.name = patch.name.trim()

    if (patch?.appearance && typeof patch.appearance === 'object') {
      const incoming = { ...patch.appearance }

      if (incoming.backgroundColor || incoming.backgroundAlpha || incoming.borderColor || incoming.borderAlpha) {
        this.patchShared({
          background: {
            backgroundColor: incoming.backgroundColor,
            backgroundAlpha: incoming.backgroundAlpha,
            borderColor: incoming.borderColor,
            borderAlpha: incoming.borderAlpha,
          },
        })
      }
      if (incoming.autoHide?.animation) {
        this.patchShared({ animation: incoming.autoHide.animation })
      }

      delete incoming.backgroundColor
      delete incoming.backgroundAlpha
      delete incoming.borderColor
      delete incoming.borderAlpha
      if (incoming.autoHide) {
        incoming.autoHide = { ...incoming.autoHide }
        delete incoming.autoHide.animation
      }

      const appearanceBrandPaths = ['textColor', 'defaultUsernameColor', 'focusHighlightColor', 'numberColor']
      for (const key of appearanceBrandPaths) {
        if (key in incoming) trackBrandOverride(this, `appearance.${key}`)
      }

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
          ? { ...this.appearance.autoHide, ...incoming.autoHide }
          : this.appearance.autoHide,
      }
      this.appearance = sanitizeLeaderboardAppearance(merged, FACTORY_MODULE_DEFAULTS.leaderboard.appearance)
    }

    if (typeof patch?.scoreType === 'string' && (patch.scoreType === 'time' || patch.scoreType === 'number')) {
      this.scoreType = patch.scoreType
    }
    if (typeof patch?.topCount === 'number' && patch.topCount >= 1) this.topCount = Math.floor(patch.topCount)
    if (typeof patch?.neighborCount === 'number' && patch.neighborCount >= 0) this.neighborCount = Math.floor(patch.neighborCount)
    if (typeof patch?.focusParticipantId === 'string') this.focusParticipantId = patch.focusParticipantId

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
      ...super.toObject(),
      scoreType: this.scoreType,
      topCount: this.topCount,
      neighborCount: this.neighborCount,
      appearance: {
        ...this.appearance,
        usernameColors: { ...this.appearance.usernameColors },
        numberColorKeys: this.appearance.numberColorKeys.map(item => ({ ...item })),
        backgroundImage: { ...this.appearance.backgroundImage },
        titleOutline: { ...this.appearance.titleOutline },
        participantOutline: { ...this.appearance.participantOutline },
        scoreOutline: { ...this.appearance.scoreOutline },
        autoHide: { ...this.appearance.autoHide },
      },
      focusParticipantId: this.focusParticipantId,
      participants: this.participants.map(participant => ({
        ...participant,
        backdropImage: { ...participant.backdropImage },
      })),
    }
  }
}

class ChatModule extends VisualModule {
  constructor(saved, newId) {
    super(saved, newId, 'chat')
    const d = FACTORY_MODULE_DEFAULTS.chat
    this.platform = ['twitch', 'youtube'].includes(saved?.platform) ? saved.platform : d.platform
    this.channel = typeof saved?.channel === 'string' ? saved.channel.replace(/^#/, '').trim().toLowerCase() : d.channel
    this.clientId = typeof saved?.clientId === 'string' ? saved.clientId.trim() : d.clientId
    this.accessToken = typeof saved?.accessToken === 'string' ? saved.accessToken.trim() : d.accessToken
    this.messageLimit = typeof saved?.messageLimit === 'number' && saved.messageLimit >= 1
      ? Math.floor(saved.messageLimit) : d.messageLimit
    this.fadeOutSec = typeof saved?.fadeOutSec === 'number' && saved.fadeOutSec >= 0
      ? saved.fadeOutSec : d.fadeOutSec
    this.showBadges = saved?.showBadges !== false
    this.showTimestamps = saved?.showTimestamps === true
    this.fontSize = typeof saved?.fontSize === 'number' && saved.fontSize > 0
      ? saved.fontSize : d.fontSize
    this.usernameColor = typeof saved?.usernameColor === 'string' ? saved.usernameColor : d.usernameColor
    this.messageColor = typeof saved?.messageColor === 'string' ? saved.messageColor : d.messageColor
    this.prefix = typeof saved?.prefix === 'string' ? saved.prefix.trim() : d.prefix
    this.maxLines = typeof saved?.maxLines === 'number' && Number.isInteger(saved.maxLines)
      ? saved.maxLines : d.maxLines
    this.patch(saved ?? {})
    this.brandOverrides = Array.isArray(saved?.brandOverrides) ? [...saved.brandOverrides] : []
  }

  patch(patch) {
    this.patchShared(patch)
    if (['twitch', 'youtube'].includes(patch?.platform)) this.platform = patch.platform
    if (typeof patch?.channel === 'string') {
      this.channel = patch.channel.replace(/^#/, '').trim().toLowerCase()
    }
    if (typeof patch?.clientId === 'string') this.clientId = patch.clientId.trim()
    if (typeof patch?.accessToken === 'string') this.accessToken = patch.accessToken.trim()
    if (typeof patch?.messageLimit === 'number' && patch.messageLimit >= 1) {
      this.messageLimit = Math.floor(patch.messageLimit)
    }
    if (typeof patch?.fadeOutSec === 'number' && patch.fadeOutSec >= 0) this.fadeOutSec = patch.fadeOutSec
    if (typeof patch?.showBadges === 'boolean') this.showBadges = patch.showBadges
    if (typeof patch?.showTimestamps === 'boolean') this.showTimestamps = patch.showTimestamps
    if (typeof patch?.fontSize === 'number' && patch.fontSize > 0) this.fontSize = patch.fontSize
    if (typeof patch?.usernameColor === 'string') this.usernameColor = patch.usernameColor
    if (typeof patch?.messageColor === 'string') this.messageColor = patch.messageColor
    if (typeof patch?.prefix === 'string') this.prefix = patch.prefix.trim()
    if (typeof patch?.maxLines === 'number' && Number.isInteger(patch.maxLines)) {
      this.maxLines = patch.maxLines
    }
  }

  toObject() {
    return {
      ...super.toObject(),
      platform: this.platform,
      channel: this.channel,
      clientId: this.clientId,
      accessToken: this.accessToken,
      messageLimit: this.messageLimit,
      fadeOutSec: this.fadeOutSec,
      showBadges: this.showBadges,
      showTimestamps: this.showTimestamps,
      fontSize: this.fontSize,
      usernameColor: this.usernameColor,
      messageColor: this.messageColor,
      prefix: this.prefix,
      maxLines: this.maxLines,
    }
  }
}

function moduleClassFor(type) {
  if (type === 'image') return ImageModule
  if (type === 'text') return TextModule
  if (type === 'dj') return DJModule
  if (type === 'leaderboard') return LeaderboardModule
  if (type === 'timer') return TimerModule
  if (type === 'chat') return ChatModule
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
      transform: { ...d.transform },
      background: { ...(d.background ?? DEFAULT_BACKGROUND) },
      animation: { ...(d.animation ?? DEFAULT_ANIMATION) },
    }, newId).toObject()
  }

  if (actualType === 'text') {
    const d = moduleDefaults.text
    return new TextModule({
      hidden: false,
      name: '',
      text: d.text,
      color: d.color,
      transform: { ...d.transform },
      background: { ...(d.background ?? DEFAULT_BACKGROUND) },
      animation: { ...(d.animation ?? DEFAULT_ANIMATION) },
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
    const defaults = FACTORY_MODULE_DEFAULTS.leaderboard
    const d = moduleDefaults.leaderboard ?? defaults
    return new LeaderboardModule({
      hidden: false,
      name: d.name,
      scoreType: d.scoreType === 'time' ? 'time' : 'number',
      topCount: d.topCount,
      neighborCount: d.neighborCount,
      transform: { ...DEFAULT_TRANSFORM, ...(d.transform ?? {}) },
      background: { ...DEFAULT_BACKGROUND, ...(d.background ?? defaults.background) },
      animation: { ...DEFAULT_ANIMATION, ...(d.animation ?? defaults.animation) },
      appearance: {
        ...defaults.appearance,
        ...(d.appearance ?? {}),
        backgroundImage: { ...DEFAULT_LEADERBOARD_ART, ...((d.appearance?.backgroundImage || defaults.appearance.backgroundImage) ?? {}) },
        titleOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE, ...((d.appearance?.titleOutline || defaults.appearance.titleOutline) ?? {}) },
        participantOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE, ...((d.appearance?.participantOutline || defaults.appearance.participantOutline) ?? {}) },
        scoreOutline: { ...DEFAULT_LEADERBOARD_TEXT_OUTLINE, ...((d.appearance?.scoreOutline || defaults.appearance.scoreOutline) ?? {}) },
        autoHide: { ...defaults.appearance.autoHide, ...((d.appearance?.autoHide ?? {}) ?? {}) },
      },
      focusParticipantId: d.focusParticipantId,
      participants: Array.isArray(d.participants) ? d.participants.map(participant => ({ ...participant })) : [],
    }, newId).toObject()
  }

  if (actualType === 'timer') {
    const d = moduleDefaults.timer ?? FACTORY_MODULE_DEFAULTS.timer
    return new TimerModule({
      hidden: false,
      name: '',
      mode: d.mode,
      precision: d.precision,
      targetType: d.targetType,
      duration: d.duration,
      targetDateTime: '',
      maxDuration: d.maxDuration,
      color: d.color,
      status: 'stopped',
      startedAt: 0,
      pausedAt: 0,
      pausedMsTotal: 0,
      onComplete: { ...d.onComplete },
      transform: { ...DEFAULT_TRANSFORM, ...(d.transform ?? {}) },
    }, newId).toObject()
  }

  if (actualType === 'chat') {
    const d = moduleDefaults.chat ?? FACTORY_MODULE_DEFAULTS.chat
    return new ChatModule({
      hidden: false,
      name: '',
      platform: d.platform,
      channel: d.channel,
      clientId: d.clientId,
      accessToken: d.accessToken,
      messageLimit: d.messageLimit,
      fadeOutSec: d.fadeOutSec,
      showBadges: d.showBadges !== false,
      showTimestamps: d.showTimestamps === true,
      fontSize: d.fontSize,
      usernameColor: d.usernameColor,
      messageColor: d.messageColor,
      prefix: d.prefix,
      transform: { ...DEFAULT_TRANSFORM, ...(d.transform ?? {}) },
    }, newId).toObject()
  }

  const d = moduleDefaults.progressBar
  return new ProgressBarModule({
    hidden: false,
    label: d.label,
    count: 0,
    max: d.max,
    color: d.color,
    bar: { ...DEFAULT_TRANSFORM, ...(d.bar ?? {}) },
    title: { ...DEFAULT_TITLE, ...(d.title ?? {}) },
    value: { ...DEFAULT_VALUE, ...(d.value ?? {}) },
  }, newId).toObject()
}

export function patchModule(mod, body) {
  const normalizedType = MODULE_TYPES.has(mod?.type) ? mod.type : 'progressBar'
  const ModuleClass = moduleClassFor(normalizedType)
  const instance = new ModuleClass(mod ?? {}, () => mod?.id ?? '')
  instance.patch(body ?? {})
  return instance.toObject()
}
