<template>
  <div class="mdashboard">
    <h1>Stream Control</h1>

    <div class="overlay-bar">
      <div class="overlay-tabs">
        <button
          v-for="ov in overlayList"
          :key="ov.id"
          class="overlay-tab"
          :class="{ 'tab-selected': editingId === ov.id }"
          @click="selectOverlay(ov.id)"
        >
          <span v-if="activeId === ov.id" class="live-dot">●</span>
          {{ ov.name }}
        </button>
      </div>
      <button
        v-if="editingId !== activeId"
        class="action-btn action-activate"
        @click="activateOverlay(editingId)"
      >Set Active</button>
    </div>

    <div class="music-panel">
      <div class="music-header">
        <h2>Music</h2>
        <span class="music-status" :class="music?.status === 'paused' ? 'music-paused' : 'music-playing'">
          {{ music?.status === 'paused' ? 'Paused' : 'Playing' }}
        </span>
      </div>
      <div class="music-now-playing">
        <p class="song-title">{{ music?.song?.title ?? 'Unknown Song' }}</p>
        <p class="song-artist">{{ music?.song?.artist ?? 'Unknown Artist' }} — {{ music?.song?.album ?? 'Unknown Album' }}</p>
      </div>
      <div class="music-controls">
        <button class="ctrl-btn" :disabled="!canPause" @click="pauseMusic">Pause</button>
        <button class="ctrl-btn" :disabled="!canResume" @click="resumeMusic">Resume</button>
        <button class="ctrl-btn ctrl-skip" @click="skipMusic">Skip</button>
        <label class="volume-opt">
          <input type="checkbox" :checked="popupSettings.normalizeVolume" @change="patchPopupSettings({ normalizeVolume: $event.target.checked })" />
          Norm
        </label>
        <label class="volume-opt">
          Lvl
          <input type="number" min="0" max="100" step="1" class="vol-input" :disabled="!popupSettings.normalizeVolume" :value="popupSettings.normalizedVolumePct" @change="patchPopupSettings({ normalizedVolumePct: $event.target.valueAsNumber })" />
        </label>
      </div>
    </div>

    <div class="module-list">
      <div v-for="mod in modules" :key="mod.id" class="mod-card" :class="{ 'mod-hidden': mod.hidden }">

        <div class="mod-header">
          <span class="mod-title">
            <span v-if="mod.hidden" class="hidden-badge">HIDDEN</span>
            {{ moduleTitle(mod) }}
          </span>
          <button class="action-btn" :class="mod.hidden ? 'action-show' : 'action-hide'" @click="toggleHidden(mod)">
            {{ mod.hidden ? 'Show' : 'Hide' }}
          </button>
        </div>

        <div v-if="mod.type === 'progressBar'" class="live-section">
          <p class="count" :style="{ color: mod.color }">{{ mod.count }}</p>
          <div class="counter-row">
            <button class="counter-btn" @click="adjustCount(mod, -1)">−</button>
            <input type="number" class="step-input" :value="steps[mod.id] ?? 1" @change="setStepLocal(mod.id, $event.target.value)" />
            <button class="counter-btn" @click="adjustCount(mod, +1)">+</button>
          </div>
          <div class="counter-row">
            <input type="number" class="set-input" placeholder="Set value…" :value="setVals[mod.id] ?? ''" @input="updateSetVal(mod.id, $event.target.value)" @keyup.enter="setCount(mod)" />
            <button class="counter-btn-sm" @click="setCount(mod)">Set</button>
            <button class="counter-btn-sm reset" @click="patchMod(mod.id, { count: 0 })">Reset</button>
          </div>
        </div>

        <div v-else-if="mod.type === 'leaderboard'" class="live-section">
          <p class="lb-rank">#{{ leaderboardFocusSnapshot(mod).rank }} / {{ leaderboardFocusSnapshot(mod).total }}</p>
          <p class="lb-name">{{ leaderboardFocusSnapshot(mod).participant?.username ?? 'No User' }}</p>
          <p class="lb-score">{{ leaderboardFocusSnapshot(mod).formattedScore }}</p>
          <div class="counter-row">
            <button class="counter-btn" @click="adjustLeaderboardScore(mod, -1)">−</button>
            <input type="number" class="step-input" :value="steps[mod.id] ?? leaderboardDefaultStep(mod)" @change="setStepLocal(mod.id, $event.target.value)" />
            <button class="counter-btn" @click="adjustLeaderboardScore(mod, +1)">+</button>
          </div>
          <div class="counter-row">
            <input type="number" class="set-input" :placeholder="mod.scoreType === 'time' ? 'Set ms…' : 'Set value…'" :value="setVals[mod.id] ?? ''" @input="updateSetVal(mod.id, $event.target.value)" @keyup.enter="setLeaderboardScore(mod)" />
            <button class="counter-btn-sm" @click="setLeaderboardScore(mod)">Set</button>
            <button class="counter-btn-sm reset" @click="setLeaderboardScore(mod, 0)">Reset</button>
          </div>
        </div>

        <TimerDisplayBlock
          v-else-if="mod.type === 'timer'"
          :mod="mod"
          @start="timerStart"
          @pause="timerPause"
          @reset="timerReset"
        />

        <ChatPreview
          v-else-if="mod.type === 'chat'"
          :mod-id="mod.id"
          :channel="mod.channel"
        />

      </div>
    </div>

    <p class="hint">Open /overlay to see the live stream overlay.</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, provide } from 'vue'
import ChatPreview from '../components/ChatPreview.vue'
import TimerDisplayBlock from '../components/TimerDisplayBlock.vue'

const overlayList = ref([])
const activeId    = ref('')
const editingId   = ref('')

const modules = ref([])
const steps   = reactive({})
const setVals = reactive({})
const chatMessages = reactive({})
const chatStatuses = reactive({})
provide('chatMessages', chatMessages)
provide('chatStatuses', chatStatuses)

const music = ref(null)
const brand = ref(null)

const popupSettings = reactive({
  normalizeVolume: false,
  normalizedVolumePct: 100,
})

const canPause  = computed(() => !!music.value && music.value.status !== 'paused')
const canResume = computed(() => !!music.value && music.value.status === 'paused')

function moduleTitle(mod) {
  if (mod.type === 'image') return mod.name?.trim() || 'Image Module'
  if (mod.type === 'text') return mod.name?.trim() || 'Text Module'
  if (mod.type === 'dj') return mod.name?.trim() || 'DJ Module'
  if (mod.type === 'leaderboard') return mod.name?.trim() || 'Leaderboard Module'
  if (mod.type === 'timer') return mod.name?.trim() || 'Timer Module'
  if (mod.type === 'chat') return mod.name?.trim() || 'Chat Module'
  return mod.label || 'ProgressBar Module'
}

function applyModules(newModules) {
  const newIds = new Set(newModules.map(m => m.id))
  modules.value = newModules
  for (const key of Object.keys(steps)) delete steps[key]
  for (const key of Object.keys(setVals)) delete setVals[key]
  for (const mod of newModules) {
    steps[mod.id] = mod.type === 'leaderboard' && mod.scoreType === 'time' ? 1000 : 1
    setVals[mod.id] = ''
  }
}

async function fetchOverlayState(id) {
  const res  = await fetch(`/api/state?id=${encodeURIComponent(id)}`)
  const data = await res.json()
  applyModules(data.modules ?? [])
  popupSettings.normalizeVolume = !!data.nowPlayingPopup?.normalizeVolume
  popupSettings.normalizedVolumePct = Number.isFinite(data.nowPlayingPopup?.normalizedVolumePct)
    ? Math.max(0, Math.min(100, data.nowPlayingPopup.normalizedVolumePct))
    : 100
}

async function fetchOverlayList() {
  const res  = await fetch('/api/overlays')
  const data = await res.json()
  overlayList.value = data.overlays
  activeId.value    = data.activeId
  return data
}

async function fetchMusicState() {
  const res = await fetch('/api/music')
  music.value = await res.json()
}

async function fetchBrand() {
  try {
    const res = await fetch('/api/brand')
    brand.value = await res.json()
  } catch {}
}

let sseSource = null

onMounted(async () => {
  try {
    const { activeId: aid } = await fetchOverlayList()
    editingId.value = aid
    await fetchOverlayState(aid)
    await fetchMusicState()
    await fetchBrand()
  } catch {}
  sseSource = new EventSource('/api/events')
  sseSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data?.chatMessages) {
      for (const [modId, msgs] of Object.entries(data.chatMessages)) {
        chatMessages[modId] = msgs
      }
    }
    if (data?.chatStatuses) {
      for (const [modId, status] of Object.entries(data.chatStatuses)) {
        chatStatuses[modId] = status
      }
    }
  }
})

onUnmounted(() => {
  if (sseSource) sseSource.close()
})

async function selectOverlay(id) {
  if (editingId.value === id) return
  editingId.value = id
  try { await fetchOverlayState(id) } catch {}
}

async function activateOverlay(id) {
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(id)}/activate`, { method: 'POST' })
    const data = await res.json()
    activeId.value = data.activeId
  } catch {}
}

async function toggleHidden(mod) {
  await patchMod(mod.id, { hidden: !mod.hidden })
}

async function patchMod(moduleId, patch) {
  const mod = modules.value.find(m => m.id === moduleId)
  if (mod) {
    for (const [key, val] of Object.entries(patch)) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) mod[key] = { ...mod[key], ...val }
      else mod[key] = val
    }
  }
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(moduleId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === moduleId)
    if (idx !== -1) modules.value[idx] = updated
  } catch {
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function pauseMusic() {
  try {
    const res = await fetch('/api/music/pause', { method: 'POST' })
    music.value = await res.json()
  } catch {}
}

async function resumeMusic() {
  try {
    const res = await fetch('/api/music/resume', { method: 'POST' })
    music.value = await res.json()
  } catch {}
}

async function skipMusic() {
  try {
    const res = await fetch('/api/music/skip', { method: 'POST' })
    music.value = await res.json()
  } catch {}
}

async function patchPopupSettings(patch) {
  if (typeof patch.normalizeVolume === 'boolean') popupSettings.normalizeVolume = patch.normalizeVolume
  if (typeof patch.normalizedVolumePct === 'number' && Number.isFinite(patch.normalizedVolumePct)) {
    popupSettings.normalizedVolumePct = Math.max(0, Math.min(100, patch.normalizedVolumePct))
  }
  try {
    await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nowPlayingPopup: patch }),
    })
  } catch {}
}

function adjustCount(mod, direction) {
  const step = steps[mod.id] ?? 1
  patchMod(mod.id, { count: mod.count + direction * step })
}

function setCount(mod) {
  const val = Number(setVals[mod.id])
  if (!Number.isFinite(val)) return
  setVals[mod.id] = ''
  patchMod(mod.id, { count: val })
}

function setStepLocal(modId, raw) {
  const val = Number(raw)
  if (!Number.isFinite(val) || val <= 0) return
  steps[modId] = val
}

function updateSetVal(modId, val) {
  setVals[modId] = val
}

async function timerStart(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/start`, { method: 'POST' })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch {
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function timerPause(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/pause`, { method: 'POST' })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch {
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function timerReset(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/reset`, { method: 'POST' })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch {
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

function sortedLeaderboardParticipants(mod) {
  const participants = Array.isArray(mod?.participants) ? mod.participants : []
  return [...participants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

function leaderboardDefaultStep(mod) {
  return mod?.scoreType === 'time' ? 1000 : 1
}

function adjustLeaderboardScore(mod, direction) {
  const snapshot = leaderboardFocusSnapshot(mod)
  const participant = snapshot.participant
  if (!participant) return
  const step = steps[mod.id] ?? leaderboardDefaultStep(mod)
  const participants = (mod.participants ?? []).map(item =>
    item.id === participant.id ? { ...item, score: (item.score ?? 0) + direction * step } : item
  )
  patchMod(mod.id, { participants })
}

function setLeaderboardScore(mod, forceValue = null) {
  const snapshot = leaderboardFocusSnapshot(mod)
  const participant = snapshot.participant
  if (!participant) return
  const value = forceValue === null ? Number(setVals[mod.id]) : forceValue
  if (!Number.isFinite(value)) return
  setVals[mod.id] = ''
  const participants = (mod.participants ?? []).map(item =>
    item.id === participant.id ? { ...item, score: value } : item
  )
  patchMod(mod.id, { participants })
}

function leaderboardFocusSnapshot(mod) {
  const sorted = sortedLeaderboardParticipants(mod)
  const focusId = mod?.focusParticipantId
  const rankIndex = Math.max(0, sorted.findIndex(p => p.id === focusId))
  const participant = sorted[rankIndex] ?? null
  return {
    participant,
    rank: sorted.length === 0 ? 0 : rankIndex + 1,
    total: sorted.length,
    formattedScore: formatLeaderboardScore(participant?.score ?? 0, mod?.scoreType),
  }
}

function formatLeaderboardScore(rawScore, scoreType) {
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0
  if (scoreType !== 'time') return Number.isInteger(score) ? String(score) : score.toFixed(3).replace(/\.?0+$/, '')
  const negative = score < 0
  let rest = Math.abs(score)
  const ms = Math.floor(rest % 1000)
  rest = Math.floor(rest / 1000)
  const seconds = rest % 60
  rest = Math.floor(rest / 60)
  const minutes = rest % 60
  rest = Math.floor(rest / 60)
  const hours = rest % 24
  const days = Math.floor(rest / 24)
  let units = []
  if (days > 0) units = [`${days}d`, `${hours}h`, `${minutes}m`]
  else if (hours > 0) units = [`${hours}h`, `${minutes}m`, `${seconds}s`]
  else if (minutes > 0) units = [`${minutes}m`, `${seconds}s`]
  else if (seconds > 0) units = [`${seconds}s`, `${ms}ms`]
  else units = [`${ms}ms`]
  units = units.filter((unit, index) => index === 0 || !unit.startsWith('0'))
  return `${negative ? '-' : ''}${units.join(' ')}`
}
</script>

<style scoped>
.mdashboard {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  padding: 0.75rem 0.65rem 2rem;
  font-family: sans-serif;
  box-sizing: border-box;
}

h1 {
  font-size: 1.3rem;
  margin: 0 0 0.65rem;
  color: #ffffff;
}

.overlay-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.overlay-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.overlay-tab {
  background: #181818;
  border: 1px solid #303030;
  color: #757575;
  border-radius: 6px;
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.overlay-tab:hover { background: #222; color: #bdbdbd; }
.tab-selected { background: #2a2a2a; color: #fff; border-color: #555; }

.live-dot { color: #66bb6a; font-size: 0.65rem; }

.music-panel {
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #151515;
  margin-bottom: 0.75rem;
}

.music-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.music-header h2 {
  margin: 0;
  font-size: 0.95rem;
  color: #e0e0e0;
}

.music-status {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid transparent;
}
.music-playing { color: #66bb6a; border-color: #2e5c30; background: #132014; }
.music-paused { color: #ffd54f; border-color: #5c4a1a; background: #231f10; }

.music-now-playing {
  margin-bottom: 0.4rem;
}

.song-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #e0e0e0;
}

.song-artist {
  margin: 0;
  font-size: 0.78rem;
  color: #9e9e9e;
}

.music-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.ctrl-btn {
  font-size: 0.82rem;
  padding: 0.45rem 0.8rem;
  background: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.ctrl-btn:hover { background: #2c2c2c; }
.ctrl-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ctrl-skip { color: #66bb6a; border-color: #2e5c30; }
.ctrl-skip:hover { background: #1a2e1c; }

.volume-opt {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #bdbdbd;
}

.vol-input {
  width: 3.2rem;
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.3rem 0.35rem;
  font-size: 0.8rem;
}
.vol-input:disabled { opacity: 0.45; }

.module-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.mod-card {
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0 0.75rem 0.65rem;
  background: #151515;
  transition: opacity 0.2s;
}

.mod-hidden {
  opacity: 0.5;
  border-color: #1e1e1e;
}

.mod-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0 0.5rem;
  border-bottom: 1px solid #2a2a2a;
  gap: 0.4rem;
}

.mod-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #bdbdbd;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.hidden-badge {
  display: inline-block;
  font-size: 0.65rem;
  color: #ffd54f;
  background: #2a240f;
  border: 1px solid #5c4a1a;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  margin-right: 0.3rem;
  vertical-align: middle;
}

.action-btn {
  font-size: 0.78rem;
  padding: 0.35rem 0.6rem;
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.action-btn:hover { background: #282828; }
.action-activate { color: #66bb6a; border-color: #2e5c30; }
.action-activate:hover { background: #1a2e1c; }
.action-hide { color: #9e9e9e; }
.action-show { color: #ffd54f; border-color: #5c4a1a; }
.action-show:hover { background: #2a240f; }

.live-section {
  padding: 0.6rem 0 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.count {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0;
  line-height: 1;
}

.counter-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  justify-content: center;
}

.counter-btn {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 1.15rem;
  cursor: pointer;
  transition: background-color 0.15s;
  line-height: 1;
}
.counter-btn:hover { background-color: #2c2c2c; }
.counter-btn:active { background-color: #383838; }

.counter-btn-sm {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.counter-btn-sm:hover { background-color: #2c2c2c; }
.counter-btn-sm.reset { color: #ef9a9a; border-color: #614040; }
.counter-btn-sm.reset:hover { background-color: #2a1a1a; }

.step-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.45rem 0.45rem;
  font-size: 0.95rem;
  width: 4rem;
  text-align: center;
}

.set-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.95rem;
  flex: 1;
  min-width: 0;
}

.lb-rank {
  margin: 0;
  font-size: 0.72rem;
  color: #9e9e9e;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.lb-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #e0e0e0;
}

.lb-score {
  margin: 0 0 0.1rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: #82b1ff;
}

.hint {
  font-size: 0.78rem;
  color: #424242;
  margin-top: 1.2rem;
  text-align: center;
}
</style>
