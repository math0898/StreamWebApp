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
    </section>

    <section class="panel">
      <h2>Import Music</h2>
      <form class="import-form" @submit.prevent="importMusic">
        <label class="field">
          <span>Artist</span>
          <input v-model="form.artist" type="text" required />
        </label>

        <label class="field">
          <span>Track Name</span>
          <input v-model="form.trackName" type="text" required />
        </label>

        <label class="field">
          <span>Track File (.mp3/.ogg/.wav)</span>
          <input type="file" accept=".mp3,.ogg,.wav,audio/*" @change="onTrackFileChange" required />
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
          <img :src="track.coverPath" :alt="`Album art for ${track.album ?? track.title} by ${track.artist ?? 'Unknown Artist'}`" class="cover" />
          <div class="track-info">
            <p class="track-title">{{ track.title }}</p>
            <p class="muted small">{{ track.artist }}</p>
            <p class="muted small">{{ track.album }}</p>
            <button class="action-btn play-btn" @click="playTrack(track.id)">Set Now Playing</button>
          </div>
        </article>
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
const reloading = ref(false)
const importing = ref(false)
const savingRules = ref(false)
const formMessage = ref('')

const form = reactive({
  artist: '',
  trackName: '',
  trackFile: null,
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

function onTrackFileChange(event) {
  const file = event.target.files?.[0] ?? null
  form.trackFile = file
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
        trackName: form.trackName,
        trackFileName: form.trackFile.name,
        coverFileName: form.coverFile.name,
        trackDataUrl,
        coverDataUrl,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Import failed')
    applyMusicSnapshot(data)
    formMessage.value = 'Track imported successfully.'
    form.artist = ''
    form.trackName = ''
    form.trackFile = null
    form.coverFile = null
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

.track-title {
  margin: 0 0 0.2rem;
  color: #fff;
  font-weight: 700;
}

.play-btn {
  margin-top: 0.35rem;
}

.muted {
  margin: 0.2rem 0;
  color: #9e9e9e;
}

.small {
  font-size: 0.82rem;
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
