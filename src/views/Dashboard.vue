<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div class="overlay-nav">
      <div class="overlay-tabs">
        <button
          v-for="ov in overlayList"
          :key="ov.id"
          class="overlay-tab"
          :class="{ 'tab-selected': editingId === ov.id }"
          @click="selectOverlay(ov.id)"
        >
          <span v-if="activeId === ov.id" class="live-dot" title="Currently live on /overlay">●</span>
          {{ ov.name }}
        </button>
        <button class="overlay-tab tab-new" title="New overlay" @click="createOverlay">＋</button>
      </div>
      <div class="overlay-actions">
        <button
          v-if="editingId !== activeId"
          class="action-btn action-activate"
          @click="activateOverlay(editingId)"
        >Set Active</button>
        <button class="action-btn" @click="startRename">Rename</button>
        <button
          v-if="overlayList.length > 1"
          class="action-btn action-delete"
          @click="confirmDelete"
        >Delete</button>
      </div>
      <div v-if="renaming" class="overlay-rename-row">
        <input
          ref="renameInputRef"
          type="text"
          class="rename-input"
          v-model="renameVal"
          @keyup.enter="submitRename"
          @keyup.escape="renaming = false"
        />
        <button class="action-btn" @click="submitRename">Save</button>
        <button class="action-btn" @click="renaming = false">Cancel</button>
      </div>
    </div>

    <div class="music-panel">
      <div class="music-header-row">
        <h2>Background Music</h2>
        <div class="music-header-actions">
          <span class="music-status" :class="music?.status === 'paused' ? 'music-paused' : 'music-playing'">
            {{ music?.status === 'paused' ? 'Paused' : 'Playing' }}
          </span>
          <button
            class="action-btn"
            :class="{ 'action-edit-active': musicEditOpen }"
            @click="musicEditOpen = !musicEditOpen"
          >{{ musicEditOpen ? 'Done' : 'Edit' }}</button>
        </div>
      </div>

      <div class="music-now-playing">
        <p class="music-line"><strong>Now Playing:</strong> {{ music?.song?.title ?? 'Unknown Song' }}</p>
        <p class="music-line"><strong>Artist:</strong> {{ music?.song?.artist ?? 'Unknown Artist' }}</p>
        <p class="music-line"><strong>Album:</strong> {{ music?.song?.album ?? 'Unknown Album' }}</p>
      </div>

      <div class="music-controls">
        <button class="action-btn" :disabled="!canPause" @click="pauseMusic">Pause</button>
        <button class="action-btn" :disabled="!canResume" @click="resumeMusic">Resume</button>
        <button class="action-btn action-activate" @click="skipMusic">Skip Song</button>
      </div>

      <p class="music-help">
        Place songs and album art in
        <code>public/Music/Album Name - Artist/</code>
        (use <code>cover.jpg</code> plus <code>.mp3/.ogg/.wav</code> files) so the app can load them as <code>/Music/...</code> assets.
      </p>

      <div v-if="musicEditOpen" class="edit-panel music-edit-panel">
        <div class="edit-row">
          <label class="edit-label">Popup X Offset</label>
          <input
            type="number"
            :value="popupSettings.x"
            @change="patchPopupSettings({ x: $event.target.valueAsNumber })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Popup Y Offset</label>
          <input
            type="number"
            :value="popupSettings.y"
            @change="patchPopupSettings({ y: $event.target.valueAsNumber })"
          />
        </div>
        <div class="edit-row checkbox-row">
          <label class="edit-label">Default Play Music</label>
          <input
            type="checkbox"
            :checked="popupSettings.defaultPlayMusic"
            @change="patchPopupSettings({ defaultPlayMusic: $event.target.checked })"
          />
        </div>
        <div class="edit-row checkbox-row">
          <label class="edit-label">Hide Popup Visual</label>
          <input
            type="checkbox"
            :checked="popupSettings.hiddenVisual"
            @change="patchPopupSettings({ hiddenVisual: $event.target.checked })"
          />
        </div>
        <p class="edit-sub">Popup Animation</p>
        <div class="edit-row">
          <label class="edit-label">Song Start Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.songStartShowSec"
            @change="patchPopupSettings({ animation: { songStartShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Song End Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.songEndShowSec"
            @change="patchPopupSettings({ animation: { songEndShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Periodic Interval (sec)</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="popupSettings.animation.periodicIntervalSec"
            @change="patchPopupSettings({ animation: { periodicIntervalSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Periodic Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.periodicShowSec"
            @change="patchPopupSettings({ animation: { periodicShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Fade + Motion Duration (sec)</label>
          <input
            type="number"
            min="0"
            step="0.05"
            :value="popupSettings.animation.transitionDurationSec"
            @change="patchPopupSettings({ animation: { transitionDurationSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Direction</label>
          <select
            :value="popupSettings.animation.motionDirection"
            @change="patchPopupSettings({ animation: { motionDirection: $event.target.value } })"
          >
            <option value="none">None (fade only)</option>
            <option value="up">Vertical Up</option>
            <option value="down">Vertical Down</option>
            <option value="left">Horizontal Left</option>
            <option value="right">Horizontal Right</option>
          </select>
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Distance (px)</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="popupSettings.animation.motionDistancePx"
            @change="patchPopupSettings({ animation: { motionDistancePx: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Interpolation</label>
          <select
            :value="popupSettings.animation.motionInterpolation"
            @change="patchPopupSettings({ animation: { motionInterpolation: $event.target.value } })"
          >
            <option value="linear">Linear</option>
            <option value="quadratic">Quadratic</option>
            <option value="exponential">Exponential</option>
          </select>
        </div>
      </div>
    </div>

    <div class="module-grid">
      <div v-for="mod in modules" :key="mod.id" class="module-card" :class="{ 'mod-is-hidden': mod.hidden }">

        <!-- Card header -->
        <div class="module-header">
          <span class="module-title">
            <span v-if="mod.hidden" class="hidden-badge">HIDDEN</span>
            {{ moduleTitle(mod) }}
          </span>
          <div class="card-actions">
            <button
              class="action-btn"
              :class="mod.hidden ? 'action-show' : 'action-hide'"
              :title="mod.hidden ? 'Show in overlay' : 'Hide from overlay'"
              @click="toggleHidden(mod)"
            >{{ mod.hidden ? 'Show' : 'Hide' }}</button>
            <button
              class="action-btn"
              :class="{ 'action-edit-active': editOpen[mod.id] }"
              @click="toggleEdit(mod.id)"
            >{{ editOpen[mod.id] ? 'Done' : 'Edit' }}</button>
            <button v-if="modules.length > 1" class="action-btn action-delete" @click="removeModule(mod.id)">✕</button>
          </div>
        </div>

        <!-- Always-visible: counter controls for progressBar -->
        <div v-if="mod.type === 'progressBar'" class="counter-section">
          <p class="count" :style="{ color: mod.color }">{{ mod.count }}</p>
          <div class="counter-row">
            <button class="counter-btn" @click="adjustCount(mod, -1)">−</button>
            <input type="number" class="step-input" :value="steps[mod.id] ?? 1" @change="setStepLocal(mod.id, $event.target.value)" title="Step size" />
            <button class="counter-btn" @click="adjustCount(mod, +1)">+</button>
          </div>
          <div class="counter-row">
            <input type="number" class="set-input" placeholder="Set value…" :value="setVals[mod.id] ?? ''" @input="updateSetVal(mod.id, $event.target.value)" @keyup.enter="setCount(mod)" />
            <button class="counter-btn-sm" @click="setCount(mod)">Set</button>
            <button class="counter-btn-sm reset" @click="patchMod(mod.id, { count: 0 })">Reset</button>
          </div>
        </div>

        <!-- Edit panel (all types) -->
        <div v-if="editOpen[mod.id]" class="edit-panel">

          <template v-if="mod.type === 'progressBar'">
            <div class="edit-row">
              <label class="edit-label">Goal</label>
              <input type="number" min="1" :value="mod.max" @change="patchMod(mod.id, { max: $event.target.valueAsNumber })" />
              <button class="reset-sm" @click="patchMod(mod.id, { max: 100 })">↺</button>
            </div>
            <div class="edit-row">
              <label class="edit-label">Label</label>
              <input type="text" :value="mod.label" @change="patchMod(mod.id, { label: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Color</label>
              <input type="color" :value="mod.color" @input="patchMod(mod.id, { color: $event.target.value })" />
            </div>
            <p class="edit-sub">Bar</p>
            <div v-for="f in barFields" :key="mod.id+'b'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.bar[f.key]" @change="patchMod(mod.id, { bar: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Title</p>
            <div v-for="f in titleFields" :key="mod.id+'t'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.title[f.key]" @change="patchMod(mod.id, { title: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Value</p>
            <div v-for="f in valueFields" :key="mod.id+'v'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.value[f.key]" @change="patchMod(mod.id, { value: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
          </template>

          <template v-else-if="mod.type === 'image'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Image Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Image Path</label>
              <input type="text" class="wide-input" :value="mod.src" @change="patchMod(mod.id, { src: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Alt Text</label>
              <input type="text" class="wide-input" :value="mod.alt" @change="patchMod(mod.id, { alt: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.1" min="0" max="1" :value="mod.opacity" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'i'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform[f.key]" @change="patchMod(mod.id, { transform: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
          </template>

          <template v-else-if="mod.type === 'text'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Text Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Text</label>
              <input type="text" class="wide-input" :value="mod.text" @change="patchMod(mod.id, { text: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Color</label>
              <input type="color" :value="mod.color" @input="patchMod(mod.id, { color: $event.target.value })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in textTransformFields" :key="mod.id+'x'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform[f.key]" @change="patchMod(mod.id, { transform: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
          </template>

          <template v-else-if="mod.type === 'dj'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="DJ Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Liked Bonus</label>
              <input type="number" step="0.1" min="0" :value="mod.likedBonus" @change="patchMod(mod.id, { likedBonus: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Min Repeats</label>
              <input type="number" step="1" min="0" :value="mod.minRepeats" @change="patchMod(mod.id, { minRepeats: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Style Penalty</label>
              <input type="number" step="0.01" min="0" :value="mod.stylePenalty" @change="patchMod(mod.id, { stylePenalty: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Variance</label>
              <input type="number" step="0.01" min="0" :value="mod.variance ?? 0" @change="patchMod(mod.id, { variance: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Mood Window</label>
              <input type="number" step="1" min="1" :value="mod.moodWindow" @change="patchMod(mod.id, { moodWindow: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Target Styles</p>
            <p v-if="!(music?.styleOptions?.length)" class="edit-note">No styles loaded. Reload the music library.</p>
            <div v-for="style in (music?.styleOptions ?? [])" :key="mod.id+'-style-'+style" class="edit-row checkbox-row">
              <label class="edit-label">{{ style }}</label>
              <input
                type="checkbox"
                :checked="mod.targetStyles?.includes(style)"
                @change="patchDjStyles(mod, style, $event.target.checked)"
              />
            </div>
            <p class="edit-sub">Target Attributes</p>
            <p v-if="!customDjAttributes.length" class="edit-note">No custom attributes defined. Add them in /music.</p>
            <div v-for="definition in customDjAttributes" :key="mod.id+'-attr-'+definition.id" class="edit-row">
              <label class="edit-label">{{ definition.name }} ({{ ((mod.targetAttributes?.[definition.id]) ?? 0.5).toFixed(2) }})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="(mod.targetAttributes?.[definition.id]) ?? 0.5"
                @change="patchMod(mod.id, { targetAttributes: { ...mod.targetAttributes, [definition.id]: $event.target.valueAsNumber } })"
              />
            </div>
          </template>

        </div>
      </div>
    </div>

    <div class="add-module-row">
      <select v-model="newModuleType" class="module-type-select">
        <option value="progressBar">ProgressBar</option>
        <option value="image">Image</option>
        <option value="text">Text</option>
        <option value="dj">DJ</option>
      </select>
      <button class="add-module-btn" @click="addModule">+ Add Module</button>
    </div>

    <p class="hint">Changes are sent to the server and forwarded to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'

const overlayList    = ref([])
const activeId       = ref('')
const editingId      = ref('')
const renaming       = ref(false)
const renameVal      = ref('')
const renameInputRef = ref(null)

const modules = ref([])
const steps   = reactive({})
const setVals = reactive({})
const editOpen = reactive({})
const music = ref(null)
const musicEditOpen = ref(false)
const canPause = computed(() => !!music.value && music.value.status !== 'paused')
const canResume = computed(() => !!music.value && music.value.status === 'paused')
const popupSettings = reactive({
  x: 0,
  y: 0,
  hiddenVisual: false,
  defaultPlayMusic: true,
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
})

const newModuleType = ref('progressBar')

const barFields = [
  { key: 'x',      label: 'X Offset', step: 1 },
  { key: 'y',      label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1 },
]
const titleFields = [
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]
const valueFields = [
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]
const transformFields = [
  { key: 'x',      label: 'X Offset', step: 1 },
  { key: 'y',      label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1 },
]
const textTransformFields = [
  { key: 'x',        label: 'X Offset', step: 1 },
  { key: 'y',        label: 'Y Offset', step: 1 },
  { key: 'scaleX',   label: 'Scale X',  step: 0.1 },
  { key: 'scaleY',   label: 'Scale Y',  step: 0.1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]

const customDjAttributes = computed(() =>
  (music.value?.attributeDefinitions ?? []).filter(d => d.type === 'custom')
)

function moduleTitle(mod) {
  if (mod.type === 'image') return mod.name?.trim() || 'Image Module'
  if (mod.type === 'text') return mod.name?.trim() || 'Text Module'
  if (mod.type === 'dj') return mod.name?.trim() || 'DJ Module'
  return mod.label || 'ProgressBar Module'
}

function toggleEdit(modId) {
  editOpen[modId] = !editOpen[modId]
}

async function toggleHidden(mod) {
  await patchMod(mod.id, { hidden: !mod.hidden })
}

function applyModules(newModules) {
  const newIds = new Set(newModules.map(m => m.id))
  for (const key of Object.keys(editOpen)) {
    if (!newIds.has(key)) delete editOpen[key]
  }
  modules.value = newModules
  for (const key of Object.keys(steps)) delete steps[key]
  for (const key of Object.keys(setVals)) delete setVals[key]
  for (const mod of newModules) {
    steps[mod.id] = 1
    setVals[mod.id] = ''
    if (editOpen[mod.id] === undefined) editOpen[mod.id] = false
  }
}

function applyPopupSettings(nextSettings) {
  popupSettings.x = nextSettings?.x ?? 0
  popupSettings.y = nextSettings?.y ?? 0
  popupSettings.hiddenVisual = !!nextSettings?.hiddenVisual
  popupSettings.defaultPlayMusic = typeof nextSettings?.defaultPlayMusic === 'boolean' ? nextSettings.defaultPlayMusic : true
  popupSettings.animation.songStartShowSec = nextSettings?.animation?.songStartShowSec ?? 6
  popupSettings.animation.songEndShowSec = nextSettings?.animation?.songEndShowSec ?? 3
  popupSettings.animation.periodicIntervalSec = nextSettings?.animation?.periodicIntervalSec ?? 45
  popupSettings.animation.periodicShowSec = nextSettings?.animation?.periodicShowSec ?? 4
  popupSettings.animation.transitionDurationSec = nextSettings?.animation?.transitionDurationSec ?? 0.35
  popupSettings.animation.motionDirection = nextSettings?.animation?.motionDirection ?? 'down'
  popupSettings.animation.motionDistancePx = nextSettings?.animation?.motionDistancePx ?? 14
  popupSettings.animation.motionInterpolation = nextSettings?.animation?.motionInterpolation ?? 'linear'
}

async function fetchOverlayState(id) {
  const res  = await fetch(`/api/state?id=${encodeURIComponent(id)}`)
  const data = await res.json()
  applyModules(data.modules ?? [])
  applyPopupSettings(data.nowPlayingPopup ?? {})
}

async function fetchOverlayList() {
  const res  = await fetch('/api/overlays')
  const data = await res.json()
  overlayList.value = data.overlays
  activeId.value    = data.activeId
  return data
}

onMounted(async () => {
  try {
    const { activeId: aid } = await fetchOverlayList()
    editingId.value = aid
    await fetchOverlayState(aid)
    await fetchMusicState()
  } catch (err) {
    console.warn('[dashboard] Failed to load initial state:', err)
  }
})

async function fetchMusicState() {
  const res = await fetch('/api/music')
  music.value = await res.json()
}

async function selectOverlay(id) {
  if (editingId.value === id) return
  editingId.value = id
  renaming.value  = false
  try {
    await fetchOverlayState(id)
  } catch (err) {
    console.warn('[dashboard] Failed to fetch overlay state:', err)
  }
}

async function createOverlay() {
  try {
    const res  = await fetch('/api/overlays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    overlayList.value.push(data)
    await selectOverlay(data.id)
  } catch (err) {
    console.warn('[dashboard] Failed to create overlay:', err)
  }
}

async function activateOverlay(id) {
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(id)}/activate`, { method: 'POST' })
    const data = await res.json()
    activeId.value = data.activeId
  } catch (err) {
    console.warn('[dashboard] Failed to activate overlay:', err)
  }
}

async function startRename() {
  const ov = overlayList.value.find(o => o.id === editingId.value)
  renameVal.value = ov?.name ?? ''
  renaming.value  = true
  await nextTick()
  renameInputRef.value?.focus()
}

async function submitRename() {
  const name = renameVal.value.trim()
  if (!name) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    const ov = overlayList.value.find(o => o.id === editingId.value)
    if (ov) {
      ov.name = data.name
      ov.nowPlayingPopup = data.nowPlayingPopup
    }
    renaming.value = false
  } catch (err) {
    console.warn('[dashboard] Failed to rename overlay:', err)
  }
}

async function confirmDelete() {
  const ov = overlayList.value.find(o => o.id === editingId.value)
  if (!window.confirm(`Delete overlay "${ov?.name ?? editingId.value}"? This cannot be undone.`)) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, { method: 'DELETE' })
    const data = await res.json()
    overlayList.value = data.overlays
    activeId.value    = data.activeId
    editingId.value   = data.activeId
    renaming.value    = false
    await fetchOverlayState(data.activeId)
  } catch (err) {
    console.warn('[dashboard] Failed to delete overlay:', err)
  }
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
  } catch (err) {
    console.warn('[dashboard] Failed to patch module:', err)
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function addModule() {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newModuleType.value }),
    })
    const mod = await res.json()
    modules.value.push(mod)
    steps[mod.id] = 1
    setVals[mod.id] = ''
    editOpen[mod.id] = false
  } catch (err) {
    console.warn('[dashboard] Failed to add module:', err)
  }
}

async function removeModule(moduleId) {
  const mod = modules.value.find(m => m.id === moduleId)
  if (!window.confirm(`Remove module "${moduleTitle(mod ?? {})}"? This cannot be undone.`)) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(moduleId)}`, { method: 'DELETE' })
    const data = await res.json()
    applyModules(data.modules)
  } catch (err) {
    console.warn('[dashboard] Failed to remove module:', err)
  }
}

function patchDjStyles(mod, style, checked) {
  const current = Array.isArray(mod.targetStyles) ? [...mod.targetStyles] : []
  const next = checked
    ? [...new Set([...current, style])]
    : current.filter(s => s !== style)
  patchMod(mod.id, { targetStyles: next })
}

async function pauseMusic() {
  try {
    const res = await fetch('/api/music/pause', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to pause music:', err)
  }
}

async function resumeMusic() {
  try {
    const res = await fetch('/api/music/resume', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to resume music:', err)
  }
}

async function skipMusic() {
  try {
    const res = await fetch('/api/music/skip', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to skip song:', err)
  }
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

async function patchPopupSettings(patch) {
  if (typeof patch.x === 'number' && Number.isFinite(patch.x)) popupSettings.x = patch.x
  if (typeof patch.y === 'number' && Number.isFinite(patch.y)) popupSettings.y = patch.y
  if (typeof patch.hiddenVisual === 'boolean') popupSettings.hiddenVisual = patch.hiddenVisual
  if (typeof patch.defaultPlayMusic === 'boolean') popupSettings.defaultPlayMusic = patch.defaultPlayMusic
  if (patch.animation && typeof patch.animation === 'object') {
    if (typeof patch.animation.songStartShowSec === 'number' && Number.isFinite(patch.animation.songStartShowSec)) {
      popupSettings.animation.songStartShowSec = patch.animation.songStartShowSec
    }
    if (typeof patch.animation.songEndShowSec === 'number' && Number.isFinite(patch.animation.songEndShowSec)) {
      popupSettings.animation.songEndShowSec = patch.animation.songEndShowSec
    }
    if (typeof patch.animation.periodicIntervalSec === 'number' && Number.isFinite(patch.animation.periodicIntervalSec)) {
      popupSettings.animation.periodicIntervalSec = patch.animation.periodicIntervalSec
    }
    if (typeof patch.animation.periodicShowSec === 'number' && Number.isFinite(patch.animation.periodicShowSec)) {
      popupSettings.animation.periodicShowSec = patch.animation.periodicShowSec
    }
    if (typeof patch.animation.transitionDurationSec === 'number' && Number.isFinite(patch.animation.transitionDurationSec)) {
      popupSettings.animation.transitionDurationSec = patch.animation.transitionDurationSec
    }
    if (typeof patch.animation.motionDirection === 'string') {
      popupSettings.animation.motionDirection = patch.animation.motionDirection
    }
    if (typeof patch.animation.motionDistancePx === 'number' && Number.isFinite(patch.animation.motionDistancePx)) {
      popupSettings.animation.motionDistancePx = patch.animation.motionDistancePx
    }
    if (typeof patch.animation.motionInterpolation === 'string') {
      popupSettings.animation.motionInterpolation = patch.animation.motionInterpolation
    }
  }

  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nowPlayingPopup: patch }),
    })
    const data = await res.json()
    applyPopupSettings(data.nowPlayingPopup ?? {})
    const ov = overlayList.value.find(o => o.id === editingId.value)
    if (ov) ov.nowPlayingPopup = data.nowPlayingPopup
    if (typeof patch.defaultPlayMusic === 'boolean') {
      await fetchMusicState()
    }
  } catch (err) {
    console.warn('[dashboard] Failed to patch popup settings:', err)
    try { await fetchOverlayState(editingId.value) } catch (refreshErr) {
      console.warn('[dashboard] Failed to refresh overlay state after popup settings patch failure:', refreshErr)
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  font-family: sans-serif;
  overflow-y: auto;
  box-sizing: border-box;
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem;
  color: #ffffff;
}

/* ── Overlay nav ─────────────────────────────────────── */
.overlay-nav {
  width: 100%;
  max-width: 720px;
  margin-bottom: 1.5rem;
}

.overlay-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: flex-end;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 0;
}

.overlay-tab {
  background: #181818;
  border: 1px solid #303030;
  border-bottom: none;
  color: #757575;
  border-radius: 6px 6px 0 0;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.overlay-tab:hover { background: #222; color: #bdbdbd; }
.tab-selected      { background: #2a2a2a; color: #ffffff; border-color: #555; }
.tab-new           { color: #424242; font-size: 1.1rem; padding: 0.25rem 0.65rem; }
.tab-new:hover     { color: #9e9e9e; }

.live-dot { color: #66bb6a; font-size: 0.7rem; }

.overlay-actions {
  display: flex;
  gap: 0.4rem;
  padding: 0.4rem 0 0;
}

.action-btn {
  font-size: 0.78rem;
  padding: 0.22rem 0.55rem;
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.action-btn:hover         { background: #282828; }
.action-activate          { color: #66bb6a; border-color: #2e5c30; }
.action-activate:hover    { background: #1a2e1c; }
.action-delete            { color: #ef9a9a; border-color: #614040; }
.action-delete:hover      { background: #2a1a1a; }
.action-hide              { color: #9e9e9e; }
.action-show              { color: #ffd54f; border-color: #5c4a1a; }
.action-show:hover        { background: #2a240f; }
.action-edit-active       { color: #82b1ff; border-color: #2a4070; background: #141e33; }
.action-edit-active:hover { background: #182340; }

.overlay-rename-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0 0;
}

.music-panel {
  width: 100%;
  max-width: 720px;
  margin-bottom: 1.2rem;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  background: #151515;
}

.music-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.music-header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.music-header-row h2 {
  margin: 0;
  font-size: 1rem;
  color: #e0e0e0;
}

.music-status {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.music-playing {
  color: #66bb6a;
  border-color: #2e5c30;
  background: #132014;
}

.music-paused {
  color: #ffd54f;
  border-color: #5c4a1a;
  background: #231f10;
}

.music-now-playing {
  margin-bottom: 0.55rem;
}

.music-line {
  margin: 0.1rem 0;
  font-size: 0.85rem;
  color: #bdbdbd;
}

.music-controls {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.music-controls .action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.music-help {
  margin: 0;
  color: #9e9e9e;
  font-size: 0.75rem;
  line-height: 1.45;
}

.music-help code {
  color: #82b1ff;
}

.music-edit-panel {
  margin-top: 0.75rem;
}

.checkbox-row {
  grid-template-columns: 1fr auto;
}

.rename-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.9rem;
  width: 12rem;
}

/* ── Module grid ─────────────────────────────────────── */
.module-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  margin-bottom: 1rem;
}

.module-card {
  flex: 0 0 300px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0 0.85rem 0.85rem;
  transition: opacity 0.2s, border-color 0.2s;
}

.mod-is-hidden {
  opacity: 0.5;
  border-color: #1e1e1e;
}

/* ── Card header ─────────────────────────────────────── */
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0 0.5rem;
  border-bottom: 1px solid #2a2a2a;
  gap: 0.4rem;
  min-width: 0;
}

.module-title {
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
  letter-spacing: 0.05em;
}

.card-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ── Counter section (progressBar always-visible) ────── */
.counter-section {
  padding: 0.7rem 0 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.count {
  font-size: 3rem;
  font-weight: bold;
  margin: 0;
  line-height: 1;
  color: #82b1ff;
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
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.15s;
  line-height: 1;
}
.counter-btn:hover  { background-color: #2c2c2c; }
.counter-btn:active { background-color: #383838; }

.counter-btn-sm {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.3rem 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.counter-btn-sm:hover  { background-color: #2c2c2c; }
.counter-btn-sm.reset  { color: #ef9a9a; border-color: #614040; }
.counter-btn-sm.reset:hover { background-color: #2a1a1a; }

.step-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.35rem 0.4rem;
  font-size: 0.9rem;
  width: 3.8rem;
  text-align: center;
}

.set-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.9rem;
  flex: 1;
  min-width: 0;
  text-align: left;
}

/* ── Edit panel ──────────────────────────────────────── */
.edit-panel {
  padding: 0.6rem 0 0;
  border-top: 1px solid #2a2a2a;
  margin-top: 0.55rem;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.45rem;
}

.edit-label {
  font-size: 0.8rem;
  color: #9e9e9e;
  width: 5rem;
  flex-shrink: 0;
}

.edit-sub {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #424242;
  margin: 0.55rem 0 0.3rem;
}

.wide-input {
  flex: 1;
  min-width: 0;
  width: auto !important;
}

.reset-sm {
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 0.2rem 0.45rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.reset-sm:hover { background: #1a1a1a; }

.edit-note {
  font-size: 0.75rem;
  color: #616161;
  margin: 0 0 0.4rem;
  font-style: italic;
}

/* ── Add module row ──────────────────────────────────── */
.add-module-row {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.module-type-select {
  background: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.add-module-btn {
  font-size: 0.85rem;
  padding: 0.45rem 1.4rem;
  background: #1e1e1e;
  color: #66bb6a;
  border: 1px solid #2e5c30;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.add-module-btn:hover { background: #1a2e1c; }

.hint {
  font-size: 0.8rem;
  color: #424242;
  margin-top: 1.5rem;
}
</style>
