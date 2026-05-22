export const DEFAULT_BAR = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
export const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }
export const DEFAULT_IMAGE_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TEXT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 }
export const DEFAULT_LEADERBOARD_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }

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
    focusParticipantId: 'streamer',
    participants: [
      { id: 'streamer', username: 'Streamer', score: 50 },
      { id: 'challenger-1', username: 'Rival One', score: 65 },
      { id: 'challenger-2', username: 'Rival Two', score: 42 },
      { id: 'challenger-3', username: 'Rival Three', score: 31 },
    ],
  },
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
      focusParticipantId: this.focusParticipantId,
      participants: this.participants.map(participant => ({ ...participant })),
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
