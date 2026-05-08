<template>
  <div class="music-page">
    <h1>Music</h1>

    <section class="panel">
      <div class="panel-header">
        <h2>Now Playing</h2>
        <button class="action-btn" @click="reloadLibrary" :disabled="reloading">
          {{ reloading ? 'Reloading…' : 'Reload Library' }}
        </button>
      </div>
      <p class="muted"><strong>Track:</strong> {{ music.song?.title ?? 'Unknown Song' }}</p>
      <p class="muted"><strong>Artist:</strong> {{ music.song?.artist ?? 'Unknown Artist' }}</p>
      <p class="muted"><strong>Album:</strong> {{ music.song?.album ?? 'Unknown Album' }}</p>
      <p class="muted"><strong>Status:</strong> {{ music.status ?? 'unknown' }}</p>
      <div class="playback-controls">
        <button class="action-btn" :disabled="music.status !== 'playing'" @click="pauseMusicPage">⏸ Pause</button>
        <button class="action-btn" :disabled="music.status !== 'paused'" @click="resumeMusicPage">▶ Resume</button>
      </div>
    </section>

    <section class="panel">
      <h2>Import Music</h2>
      <form class="import-form" @submit.prevent="importMusic">
        <label class="field">
          <span>Artist</span>
          <input v-model="form.artist" type="text" required />
        </label>

        <label class="field">
          <span>Album</span>
          <input v-model="form.album" type="text" required />
        </label>

        <label class="field">
          <span>Track Name</span>
          <input v-model="form.trackName" type="text" required />
        </label>

        <label class="field">
          <span>Track File (.mp3/.ogg/.wav)</span>
          <input ref="trackFileInput" type="file" accept=".mp3,.ogg,.wav,audio/*" @change="onTrackFileChange" required />
        </label>

        <label class="field">
          <span>Cover Image (.jpg/.jpeg/.png/.webp)</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" @change="onCoverFileChange" required />
        </label>

        <button class="action-btn" type="submit" :disabled="importing || !form.trackFile || !form.coverFile">
          {{ importing ? 'Importing…' : 'Import Track' }}
        </button>
      </form>
      <p v-if="formMessage" class="muted">{{ formMessage }}</p>
    </section>

    <section class="panel">
      <h2>Loaded Tracks</h2>
      <p class="muted" v-if="tracks.length === 0">No tracks loaded.</p>
      <div class="track-grid">
        <article v-for="track in tracks" :key="track.id" class="track-card">
          <img :src="track.coverPath" :alt="`Album art for ${track.title} by ${track.artist ?? 'Unknown Artist'}`" class="cover" />
          <div class="track-info metadata-track">
            <p class="track-title">{{ track.title }}</p>
            <p class="muted small">{{ track.artist }}</p>
            <p class="muted small">{{ track.album }}</p>
            <div class="track-action-row">
              <button
                class="action-btn preview-btn"
                :aria-label="previewingTrackId === track.id ? 'Pause preview' : 'Play preview'"
                @click="previewTrack(track)"
              >{{ previewingTrackId === track.id ? '⏸' : '▶' }}</button>
              <button class="action-btn play-btn" @click="playTrack(track.id)">Set Now Playing</button>
            </div>
            <label class="preview-seek-row">
              <span class="muted small">
                {{ formatPreviewTime(previewPositionForTrack(track.id)) }} / {{ formatPreviewTime(previewDurationForTrack(track)) }}
              </span>
              <input
                type="range"
                min="0"
                :max="previewSeekMax(track)"
                step="0.1"
                :value="previewPositionForTrack(track.id)"
                :disabled="previewingTrackId !== track.id"
                @input="seekPreview(track.id, Number($event.target.value))"
              />
            </label>
            <div class="attr-editor">
              <label class="attr-row">
                <span>Liked ({{ trackDraftValue(track.id, likedAttributeId).toFixed(2) }})</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  :value="trackDraftValue(track.id, likedAttributeId)"
                  @input="setTrackDraftValue(track.id, likedAttributeId, Number($event.target.value))"
                />
              </label>
              <label v-for="definition in customAttributeDefinitions" :key="definition.id" class="attr-row">
                <span>{{ definition.name }} ({{ trackDraftValue(track.id, definition.id).toFixed(2) }})</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="trackDraftValue(track.id, definition.id)"
                  @input="setTrackDraftValue(track.id, definition.id, Number($event.target.value))"
                />
              </label>
            </div>
            <div class="styles-editor">
              <p class="muted small">Styles</p>
              <div class="style-list">
                <label
                  v-for="style in styleOptionsForTrack(track.id)"
                  :key="`${track.id}-${style}`"
                  class="style-chip"
                >
                  <input
                    type="checkbox"
                    :checked="trackDraftHasStyle(track.id, style)"
                    @change="toggleTrackStyle(track.id, style, $event.target.checked)"
                  />
                  <span>{{ style }}</span>
                </label>
              </div>
              <div class="custom-style-row">
                <input
                  v-model="trackStyleDrafts[track.id]"
                  type="text"
                  placeholder="Add custom style"
                  @keydown.enter.prevent="addCustomTrackStyle(track.id)"
                />
                <button class="action-btn" @click="addCustomTrackStyle(track.id)">Add</button>
              </div>
            </div>
            <button class="action-btn" :disabled="savingTrackId === track.id" @click="saveTrackMeta(track.id)">
              {{ savingTrackId === track.id ? 'Saving…' : 'Save Track Metadata' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Track Attributes</h2>
        <button class="action-btn" :disabled="savingAttributes" @click="saveAttributes">
          {{ savingAttributes ? 'Saving…' : 'Save Attributes' }}
        </button>
      </div>
      <p class="muted small">Liked is always present and decays toward 0 over time. Custom attributes are 0-1 sliders.</p>
      <div class="attribute-list">
        <div class="attribute-row fixed">
          <span class="attribute-label">Liked</span>
          <span class="muted small">Range -1 to 1</span>
        </div>
        <div v-for="(attribute, idx) in editableCustomAttributes" :key="attribute.id" class="attribute-row">
          <input v-model="editableCustomAttributes[idx].name" type="text" />
          <button class="action-btn" @click="removeCustomAttribute(attribute.id)">Remove</button>
        </div>
      </div>
      <div class="custom-style-row">
        <input
          v-model="newAttributeName"
          type="text"
          placeholder="New attribute name"
          @keydown.enter.prevent="addCustomAttribute"
        />
        <button class="action-btn" @click="addCustomAttribute">Add Attribute</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Overlay Album Rules</h2>
        <button class="action-btn" @click="saveOverlayRules" :disabled="savingRules || !selectedOverlayId">
          {{ savingRules ? 'Saving…' : 'Save Rules' }}
        </button>
      </div>
      <p class="muted">Active Overlay: <strong>{{ activeOverlayName }}</strong></p>
      <label class="field">
        <span>Edit Rules For Overlay</span>
        <select v-model="selectedOverlayId">
          <option v-for="overlay in overlays" :key="overlay.id" :value="overlay.id">{{ overlay.name }}</option>
        </select>
      </label>
      <p class="muted small">
        Whitelist: only listed albums can play on this overlay. Blacklist: listed albums cannot play on this overlay.
        Unique: listed albums are reserved for this overlay and removed from other overlays.
      </p>
      <p class="muted" v-if="albumNames.length === 0">No albums found in the loaded music library.</p>
      <div v-else class="rules-grid">
        <div class="rules-head album-col">Album</div>
        <div class="rules-head">Whitelist</div>
        <div class="rules-head">Blacklist</div>
        <div class="rules-head">Unique</div>
        <template v-for="album in albumNames" :key="album">
          <div class="rules-cell album-col">{{ album }}</div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('whitelistAlbums', album)"
              @change="toggleRule('whitelistAlbums', album, $event.target.checked)"
            />
          </div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('blacklistAlbums', album)"
              @change="toggleRule('blacklistAlbums', album, $event.target.checked)"
            />
          </div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('uniqueAlbums', album)"
              @change="toggleRule('uniqueAlbums', album, $event.target.checked)"
            />
          </div>
        </template>
      </div>
    </section>

    <section class="panel">
      <h2>Debug Messages</h2>
      <div class="debug-box">
        <p v-for="(line, idx) in debugMessagesReversed" :key="`${idx}-${line}`" class="debug-line">{{ line }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const trackFileInput = ref(null)

const music = reactive({
  song: null,
  status: '',
})
const tracks = ref([])
const debugMessages = ref([])
const overlays = ref([])
const activeOverlayId = ref('')
const selectedOverlayId = ref('')
const overlayAlbumRules = ref({})
const attributeDefinitions = ref([])
const styleOptions = ref([])
const editableCustomAttributes = ref([])
const trackMetaDrafts = ref({})
const trackStyleDrafts = reactive({})
const reloading = ref(false)
const importing = ref(false)
const savingRules = ref(false)
const savingAttributes = ref(false)
const savingTrackId = ref('')
const formMessage = ref('')
const newAttributeName = ref('')
let trackDurationProbeToken = 0

// ── Client-side track preview ──────────────────────────────────────────────
// A single shared Audio element is reused across all track previews.
// Only one track plays at a time; clicking another track's play button stops
// the current one and starts the new one.
let previewAudio = null
const previewingTrackId = ref(null)
const previewPositionSec = ref(0)
const previewDurationSec = ref(0)

function getOrCreateAudio() {
  if (!previewAudio) {
    previewAudio = new Audio()
    previewAudio.ontimeupdate = () => {
      previewPositionSec.value = Number.isFinite(previewAudio.currentTime) ? previewAudio.currentTime : 0
    }
    previewAudio.onloadedmetadata = () => {
      previewDurationSec.value = Number.isFinite(previewAudio.duration) && previewAudio.duration > 0
        ? previewAudio.duration
        : 0
    }
    previewAudio.ondurationchange = () => {
      previewDurationSec.value = Number.isFinite(previewAudio.duration) && previewAudio.duration > 0
        ? previewAudio.duration
        : 0
    }
  }
  return previewAudio
}

function previewTrack(track) {
  const audio = getOrCreateAudio()
  if (previewingTrackId.value === track.id && !audio.paused) {
    // Clicking the same track while it's playing → pause it.
    audio.pause()
    previewingTrackId.value = null
    return
  }
  if (previewingTrackId.value !== track.id) {
    audio.pause()
    audio.src = track.audioPath
    audio.currentTime = 0
    previewPositionSec.value = 0
    previewDurationSec.value = Number.isFinite(track.trackDurationSec) && track.trackDurationSec > 0
      ? track.trackDurationSec
      : 0
  }
  previewingTrackId.value = track.id
  audio.play().catch(() => {
    // Browser may block autoplay; the user will need to click again.
    previewingTrackId.value = null
  })
  audio.onended = () => {
    previewingTrackId.value = null
    previewPositionSec.value = 0
  }
  audio.onerror = () => { previewingTrackId.value = null }
}

function previewDurationForTrack(track) {
  if (previewingTrackId.value === track.id && previewDurationSec.value > 0) return previewDurationSec.value
  return Number.isFinite(track.trackDurationSec) && track.trackDurationSec > 0 ? track.trackDurationSec : 0
}

function previewPositionForTrack(trackId) {
  if (previewingTrackId.value === trackId) return previewPositionSec.value
  return 0
}

function previewSeekMax(track) {
  return Math.max(previewDurationForTrack(track), 0.1)
}

function seekPreview(trackId, value) {
  if (previewingTrackId.value !== trackId) return
  const audio = getOrCreateAudio()
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : previewDurationSec.value
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0
  const next = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
  audio.currentTime = next
  previewPositionSec.value = next
}

function formatPreviewTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'
  const total = Math.floor(value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const form = reactive({
  artist: '',
  album: '',
  trackName: '',
  trackFile: null,
  trackDurationSec: null,
  coverFile: null,
})

const debugMessagesReversed = computed(() => [...debugMessages.value].reverse())
const albumNames = computed(() => {
  const names = tracks.value
    .map(track => typeof track?.album === 'string' ? track.album.trim() : '')
    .filter(Boolean)
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})
const activeOverlayName = computed(() => {
  const active = overlays.value.find(overlay => overlay.id === activeOverlayId.value)
  return active?.name ?? 'Unknown'
})
const LIKED_ATTRIBUTE_ID = 'liked'
const likedAttributeId = LIKED_ATTRIBUTE_ID
const customAttributeDefinitions = computed(() =>
  attributeDefinitions.value.filter(definition => definition.type === 'custom')
)

function normalizeAttributeDefinition(definition) {
  if (definition?.id === LIKED_ATTRIBUTE_ID || definition?.type === 'liked') {
    return { id: LIKED_ATTRIBUTE_ID, name: 'Liked', type: 'liked' }
  }
  const id = typeof definition?.id === 'string' && definition.id.trim() ? definition.id.trim() : createAttributeId()
  const name = typeof definition?.name === 'string' && definition.name.trim() ? definition.name.trim() : 'Attribute'
  return { id, name, type: 'custom' }
}

function createAttributeId() {
  if (globalThis.crypto?.randomUUID) return `attr-${globalThis.crypto.randomUUID()}`
  return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeRule(rule) {
  const toList = (values) => {
    if (!Array.isArray(values)) return []
    return [...new Set(values.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean))]
  }
  return {
    whitelistAlbums: toList(rule?.whitelistAlbums),
    blacklistAlbums: toList(rule?.blacklistAlbums),
    uniqueAlbums: toList(rule?.uniqueAlbums),
  }
}

function applyMusicSnapshot(data) {
  music.song = data.song
  music.status = data.status
  tracks.value = Array.isArray(data.library) ? data.library : []
  debugMessages.value = Array.isArray(data.debugMessages) ? data.debugMessages : []
  overlays.value = Array.isArray(data.overlays) ? data.overlays : []
  activeOverlayId.value = typeof data.activeOverlayId === 'string' ? data.activeOverlayId : ''
  const nextRules = {}
  for (const overlay of overlays.value) {
    nextRules[overlay.id] = normalizeRule(data.overlayAlbumRules?.[overlay.id])
  }
  overlayAlbumRules.value = nextRules
  const incomingDefinitions = Array.isArray(data.attributeDefinitions)
    ? data.attributeDefinitions.map(normalizeAttributeDefinition)
    : [normalizeAttributeDefinition({ id: LIKED_ATTRIBUTE_ID, type: 'liked' })]
  attributeDefinitions.value = incomingDefinitions
  editableCustomAttributes.value = incomingDefinitions
    .filter(definition => definition.type === 'custom')
    .map(definition => ({ id: definition.id, name: definition.name }))
  styleOptions.value = Array.isArray(data.styleOptions) ? [...new Set(data.styleOptions)] : []
  const nextDrafts = {}
  for (const track of tracks.value) {
    nextDrafts[track.id] = {
      attributes: { ...(track.attributes ?? {}) },
      styles: Array.isArray(track.styles) ? [...new Set(track.styles)] : [],
    }
    if (typeof trackStyleDrafts[track.id] !== 'string') trackStyleDrafts[track.id] = ''
  }
  trackMetaDrafts.value = nextDrafts
  const hasSelected = overlays.value.some(overlay => overlay.id === selectedOverlayId.value)
  if (!hasSelected) {
    selectedOverlayId.value = activeOverlayId.value || overlays.value[0]?.id || ''
  }
}

async function fetchLibrary() {
  const res = await fetch('/api/music/library')
  if (!res.ok) throw new Error('Failed to load library')
  applyMusicSnapshot(await res.json())
}

async function reloadLibrary() {
  reloading.value = true
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/reload', { method: 'POST' })
    if (!res.ok) throw new Error('Reload failed')
    applyMusicSnapshot(await res.json())
  } catch (err) {
    formMessage.value = `Reload failed: ${err.message}`
  } finally {
    reloading.value = false
  }
}

async function pauseMusicPage() {
  try {
    const res = await fetch('/api/music/pause', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Pause failed')
    music.status = data.status ?? music.status
  } catch (err) {
    formMessage.value = `Pause failed: ${err.message}`
  }
}

async function resumeMusicPage() {
  try {
    const res = await fetch('/api/music/resume', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Resume failed')
    music.status = data.status ?? music.status
  } catch (err) {
    formMessage.value = `Resume failed: ${err.message}`
  }
}

function probeAudioDuration(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      audio.src = ''
      URL.revokeObjectURL(objectUrl)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 8000)
    audio.onloadedmetadata = () => {
      clearTimeout(timer)
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null
      finish(duration)
    }
    audio.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    audio.preload = 'metadata'
    audio.src = objectUrl
  })
}

async function onTrackFileChange(event) {
  const file = event.target.files?.[0] ?? null
  form.trackFile = file
  form.trackDurationSec = null
  if (!file) return
  const probeToken = ++trackDurationProbeToken
  const duration = await probeAudioDuration(file)
  if (probeToken !== trackDurationProbeToken) return
  form.trackDurationSec = duration
}

function onCoverFileChange(event) {
  const file = event.target.files?.[0] ?? null
  form.coverFile = file
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

async function importMusic() {
  if (!form.trackFile || !form.coverFile) return
  importing.value = true
  formMessage.value = ''
  try {
    const [trackDataUrl, coverDataUrl] = await Promise.all([
      fileToDataUrl(form.trackFile),
      fileToDataUrl(form.coverFile),
    ])
    const res = await fetch('/api/music/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist: form.artist,
        album: form.album,
        trackName: form.trackName,
        trackFileName: form.trackFile.name,
        trackDurationSec: form.trackDurationSec,
        coverFileName: form.coverFile.name,
        trackDataUrl,
        coverDataUrl,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Import failed')
    applyMusicSnapshot(data)
    formMessage.value = 'Track imported successfully.'
    form.trackName = ''
    form.trackFile = null
    form.trackDurationSec = null
    if (trackFileInput.value) trackFileInput.value.value = ''
  } catch (err) {
    formMessage.value = `Import failed: ${err.message}`
  } finally {
    importing.value = false
  }
}

async function playTrack(id) {
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to set track')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Set track failed: ${err.message}`
  }
}

function currentRule() {
  return overlayAlbumRules.value[selectedOverlayId.value] ?? normalizeRule(null)
}

function ruleHas(type, album) {
  return currentRule()[type].includes(album)
}

function toggleRule(type, album, checked) {
  if (!selectedOverlayId.value) return
  const next = normalizeRule(currentRule())
  if (checked) {
    if (!next[type].includes(album)) next[type].push(album)
    if (type === 'whitelistAlbums') next.blacklistAlbums = next.blacklistAlbums.filter(name => name !== album)
    if (type === 'blacklistAlbums') next.whitelistAlbums = next.whitelistAlbums.filter(name => name !== album)
  } else {
    next[type] = next[type].filter(name => name !== album)
  }
  overlayAlbumRules.value = {
    ...overlayAlbumRules.value,
    [selectedOverlayId.value]: next,
  }
}

async function saveOverlayRules() {
  if (!selectedOverlayId.value) return
  savingRules.value = true
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overlayId: selectedOverlayId.value,
        rules: currentRule(),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save rules')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save rules failed: ${err.message}`
  } finally {
    savingRules.value = false
  }
}

function addCustomAttribute() {
  const name = newAttributeName.value.trim()
  if (!name) return
  editableCustomAttributes.value.push({
    id: createAttributeId(),
    name,
  })
  newAttributeName.value = ''
}

function removeCustomAttribute(attributeId) {
  editableCustomAttributes.value = editableCustomAttributes.value.filter(attribute => attribute.id !== attributeId)
}

async function saveAttributes() {
  savingAttributes.value = true
  formMessage.value = ''
  try {
    const payload = editableCustomAttributes.value
      .map(attribute => ({ id: attribute.id, name: attribute.name?.trim() || '' }))
      .filter(attribute => attribute.name)
    const res = await fetch('/api/music/attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save attributes')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save attributes failed: ${err.message}`
  } finally {
    savingAttributes.value = false
  }
}

function trackDraftValue(trackId, attributeId) {
  const draft = trackMetaDrafts.value[trackId]
  const value = draft?.attributes?.[attributeId]
  if (typeof value === 'number') return value
  if (attributeId === LIKED_ATTRIBUTE_ID) return 0
  return 0.5
}

function setTrackDraftValue(trackId, attributeId, value) {
  if (!trackMetaDrafts.value[trackId]) {
    trackMetaDrafts.value[trackId] = { attributes: {}, styles: [] }
  }
  const next = attributeId === LIKED_ATTRIBUTE_ID
    ? Math.max(-1, Math.min(1, value))
    : Math.max(0, Math.min(1, value))
  trackMetaDrafts.value[trackId].attributes = {
    ...trackMetaDrafts.value[trackId].attributes,
    [attributeId]: next,
  }
}

function styleOptionsForTrack(trackId) {
  const draft = trackMetaDrafts.value[trackId]
  const base = Array.isArray(styleOptions.value) ? styleOptions.value : []
  const styles = Array.isArray(draft?.styles) ? draft.styles : []
  return [...new Set([...base, ...styles])]
}

function trackDraftHasStyle(trackId, style) {
  const draft = trackMetaDrafts.value[trackId]
  return Array.isArray(draft?.styles) && draft.styles.includes(style)
}

function toggleTrackStyle(trackId, style, checked) {
  if (!trackMetaDrafts.value[trackId]) {
    trackMetaDrafts.value[trackId] = { attributes: {}, styles: [] }
  }
  const existing = Array.isArray(trackMetaDrafts.value[trackId].styles) ? trackMetaDrafts.value[trackId].styles : []
  const next = checked
    ? [...new Set([...existing, style])]
    : existing.filter(item => item !== style)
  trackMetaDrafts.value[trackId].styles = next
}

function addCustomTrackStyle(trackId) {
  const raw = trackStyleDrafts[trackId]
  const style = typeof raw === 'string' ? raw.trim() : ''
  if (!style) return
  toggleTrackStyle(trackId, style, true)
  trackStyleDrafts[trackId] = ''
}

async function saveTrackMeta(trackId) {
  if (!trackMetaDrafts.value[trackId]) return
  savingTrackId.value = trackId
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/track-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId,
        attributes: trackMetaDrafts.value[trackId].attributes,
        styles: trackMetaDrafts.value[trackId].styles,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save track metadata')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save track metadata failed: ${err.message}`
  } finally {
    savingTrackId.value = ''
  }
}

onMounted(async () => {
  try {
    await fetchLibrary()
  } catch (err) {
    formMessage.value = `Load failed: ${err.message}`
  }
})
</script>

<style scoped>
.music-page {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  font-family: sans-serif;
  box-sizing: border-box;
}

h1 {
  margin: 0 0 1rem;
  color: #fff;
}

.panel {
  width: 100%;
  max-width: 980px;
  background: #171717;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.9rem;
}

.panel h2 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

.import-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #bdbdbd;
  font-size: 0.85rem;
}

.field input {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.field select {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.action-btn {
  font-size: 0.8rem;
  padding: 0.38rem 0.75rem;
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.action-btn:hover {
  background: #282828;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.track-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.7rem;
}

.track-card {
  display: flex;
  gap: 0.65rem;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 0.55rem;
  background: #111;
}

.cover {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
  background: #1c1c1c;
}

.track-info {
  min-width: 0;
}

.metadata-track {
  width: 100%;
}

.track-title {
  margin: 0 0 0.2rem;
  color: #fff;
  font-weight: 700;
}

.play-btn {
  margin-top: 0.35rem;
}

.track-action-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
}

.preview-btn {
  min-width: 2.2rem;
  text-align: center;
  flex-shrink: 0;
}

.preview-seek-row {
  margin-top: 0.45rem;
  display: grid;
  gap: 0.2rem;
}

.preview-seek-row input {
  width: 100%;
}

.playback-controls {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.5rem;
}

.muted {
  margin: 0.2rem 0;
  color: #9e9e9e;
}

.small {
  font-size: 0.82rem;
}

.attr-editor {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.35rem;
}

.attr-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #bdbdbd;
}

.styles-editor {
  margin-top: 0.5rem;
}

.style-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.style-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #353535;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.75rem;
  color: #bdbdbd;
}

.custom-style-row {
  margin-top: 0.45rem;
  display: flex;
  gap: 0.45rem;
}

.custom-style-row input {
  flex: 1;
  min-width: 0;
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.attribute-list {
  display: grid;
  gap: 0.45rem;
}

.attribute-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.45rem;
}

.attribute-row input {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.attribute-row.fixed {
  grid-template-columns: auto auto;
}

.attribute-label {
  color: #fff;
  font-weight: 600;
}

.rules-grid {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(90px, 1fr));
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.rules-head {
  background: #1f1f1f;
  color: #bdbdbd;
  font-size: 0.8rem;
  padding: 0.45rem 0.5rem;
  text-align: center;
  border-bottom: 1px solid #2a2a2a;
}

.rules-cell {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid #242424;
  text-align: center;
}

.album-col {
  text-align: left;
}

.debug-box {
  max-height: 240px;
  overflow: auto;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  background: #111;
  padding: 0.5rem;
}

.debug-line {
  margin: 0 0 0.32rem;
  color: #9e9e9e;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
  white-space: pre-wrap;
}
</style>
