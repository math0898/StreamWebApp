export const DEFAULT_BAR = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TITLE = { x: 0, y: 0, fontSize: 16 }
export const DEFAULT_VALUE = { x: 0, y: 0, fontSize: 14 }
export const DEFAULT_IMAGE_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1 }
export const DEFAULT_TEXT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 }

export const MODULE_TYPES = new Set(['progressBar', 'image', 'text'])

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

function moduleClassFor(type) {
  if (type === 'image') return ImageModule
  if (type === 'text') return TextModule
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
