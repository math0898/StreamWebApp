<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <!-- ── Overlay sub-navbar ─────────────────────────── -->
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

    <!-- ── Counts ─────────────────────────────────────── -->
    <section class="section">
      <h2 class="section-title">Counts</h2>
      <div class="two-col">
        <div v-for="n in [1, 2]" :key="n" class="col">
          <p class="col-title">{{ n === 1 ? label1 : label2 }}</p>
          <p class="count">{{ n === 1 ? count1 : count2 }}</p>

          <!-- increment / decrement by step -->
          <div class="row">
            <button @click="adjustCount(n, -1)">−</button>
            <input
              type="number"
              class="step-input"
              :value="n === 1 ? step1 : step2"
              @change="setStepLocal(n, $event.target.value)"
              title="Step size"
            />
            <button @click="adjustCount(n, +1)">+</button>
          </div>

          <!-- direct set -->
          <div class="row">
            <input
              type="number"
              class="set-input"
              placeholder="Set value…"
              :value="n === 1 ? setVal1 : setVal2"
              @input="updateSetVal(n, $event.target.value)"
              @keyup.enter="setCount(n)"
            />
            <button @click="setCount(n)">Set</button>
            <button class="reset" @click="setField(`count${n}`, 0)">Reset</button>
          </div>

          <!-- goal (max) -->
          <div class="row">
            <label class="field-label">Goal</label>
            <input
              type="number"
              min="1"
              :value="n === 1 ? max1 : max2"
              @change="setField(`max${n}`, $event.target.valueAsNumber)"
            />
            <button class="reset-sm" @click="setField(`max${n}`, 100)">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Appearance ──────────────────────────────────── -->
    <section class="section">
      <h2 class="section-title">Appearance</h2>
      <div class="two-col">
        <div v-for="n in [1, 2]" :key="n" class="col">
          <p class="col-title">Bar {{ n }}</p>

          <div class="row">
            <label class="field-label">Label</label>
            <input
              type="text"
              class="text-input"
              :value="n === 1 ? label1 : label2"
              @change="setField(`label${n}`, $event.target.value)"
            />
            <button class="reset-sm" @click="setField(`label${n}`, `Counter ${n}`)">Reset</button>
          </div>

          <div class="row">
            <label class="field-label">Color</label>
            <input
              type="color"
              class="color-input"
              :value="n === 1 ? color1 : color2"
              @input="setField(`color${n}`, $event.target.value)"
            />
            <button class="reset-sm" @click="setField(`color${n}`, n === 1 ? '#82b1ff' : '#a5d6a7')">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Layout ─────────────────────────────────────── -->
    <section class="section">
      <h2 class="section-title">Layout</h2>
      <div class="two-col">
        <div v-for="n in [1, 2]" :key="n" class="col">
          <p class="col-title">Bar {{ n }}</p>

          <p class="sub-title">Bar</p>
          <div v-for="f in barFields" :key="'b' + f.key" class="row">
            <label class="field-label">{{ f.label }}</label>
            <input
              type="number"
              :step="f.step"
              :value="(n === 1 ? bar1 : bar2)[f.key]"
              @change="setNestedField(`bar${n}`, f.key, $event.target.valueAsNumber)"
            />
            <button class="reset-sm" @click="setNestedField(`bar${n}`, f.key, f.def)">Reset</button>
          </div>

          <p class="sub-title">Title</p>
          <div v-for="f in titleFields" :key="'t' + f.key" class="row">
            <label class="field-label">{{ f.label }}</label>
            <input
              type="number"
              :step="f.step"
              :value="(n === 1 ? title1 : title2)[f.key]"
              @change="setNestedField(`title${n}`, f.key, $event.target.valueAsNumber)"
            />
            <button class="reset-sm" @click="setNestedField(`title${n}`, f.key, f.def)">Reset</button>
          </div>

          <p class="sub-title">Value</p>
          <div v-for="f in valueFields" :key="'v' + f.key" class="row">
            <label class="field-label">{{ f.label }}</label>
            <input
              type="number"
              :step="f.step"
              :value="(n === 1 ? value1 : value2)[f.key]"
              @change="setNestedField(`value${n}`, f.key, $event.target.valueAsNumber)"
            />
            <button class="reset-sm" @click="setNestedField(`value${n}`, f.key, f.def)">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <p class="hint">Changes are sent to the server and forwarded to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

// ── Overlay management ────────────────────────────────────────
const overlayList    = ref([])    // [{ id, name }]
const activeId       = ref('')    // overlay shown on /overlay
const editingId      = ref('')    // overlay being edited in dashboard
const renaming       = ref(false)
const renameVal      = ref('')
const renameInputRef = ref(null)

// ── Server-persisted state (for the editing overlay) ──────────
const count1 = ref(0)
const count2 = ref(0)
const max1   = ref(100)
const max2   = ref(100)
const label1 = ref('Counter 1')
const label2 = ref('Counter 2')
const color1 = ref('#82b1ff')
const color2 = ref('#a5d6a7')
const bar1   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const bar2   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const title1 = ref({ x: 0, y: 0, fontSize: 16 })
const title2 = ref({ x: 0, y: 0, fontSize: 16 })
const value1 = ref({ x: 0, y: 0, fontSize: 14 })
const value2 = ref({ x: 0, y: 0, fontSize: 14 })

// ── Local UI state (not persisted) ───────────────────────────
const step1   = ref(1)
const step2   = ref(1)
const setVal1 = ref('')
const setVal2 = ref('')

// ── Lookup maps for generic helpers ──────────────────────────
const stateRefs  = { count1, count2, max1, max2, label1, label2, color1, color2 }
const nestedRefs = { bar1, bar2, title1, title2, value1, value2 }

// ── Field descriptors ─────────────────────────────────────────
const barFields = [
  { key: 'x',      label: 'X Offset', step: 1,   def: 0 },
  { key: 'y',      label: 'Y Offset', step: 1,   def: 0 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1, def: 1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1, def: 1 },
]
const titleFields = [
  { key: 'x',        label: 'X Offset',  step: 1, def: 0  },
  { key: 'y',        label: 'Y Offset',  step: 1, def: 0  },
  { key: 'fontSize', label: 'Font Size', step: 1, def: 16 },
]
const valueFields = [
  { key: 'x',        label: 'X Offset',  step: 1, def: 0  },
  { key: 'y',        label: 'Y Offset',  step: 1, def: 0  },
  { key: 'fontSize', label: 'Font Size', step: 1, def: 14 },
]

// ── State sync helpers ────────────────────────────────────────
function applyState(data) {
  if (data == null) return
  for (const key of ['count1', 'count2', 'max1', 'max2']) {
    if (typeof data[key] === 'number') stateRefs[key].value = data[key]
  }
  for (const key of ['label1', 'label2', 'color1', 'color2']) {
    if (typeof data[key] === 'string') stateRefs[key].value = data[key]
  }
  for (const key of Object.keys(nestedRefs)) {
    if (data[key]) nestedRefs[key].value = { ...nestedRefs[key].value, ...data[key] }
  }
}

async function fetchOverlayState(id) {
  const res = await fetch(`/api/state?id=${encodeURIComponent(id)}`)
  applyState(await res.json())
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
  } catch (err) {
    console.warn('[dashboard] Failed to load initial state:', err)
  }
})

// ── Overlay management actions ────────────────────────────────
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
    if (ov) ov.name = data.name
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

// ── POST helper (always targets the editing overlay) ─────────
async function post(patch) {
  const url = `/api/state?id=${encodeURIComponent(editingId.value)}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    applyState(await res.json())
  } catch (err) {
    console.warn('[dashboard] Failed to POST state:', err)
    try {
      applyState(await (await fetch(url)).json())
    } catch (recoveryErr) {
      console.warn('[dashboard] Failed to recover state:', recoveryErr)
    }
  }
}

// ── Counter actions ───────────────────────────────────────────
function adjustCount(n, direction) {
  const step  = (n === 1 ? step1 : step2).value
  const count = n === 1 ? count1 : count2
  const val   = count.value + direction * step
  count.value = val
  post({ [`count${n}`]: val })
}

function setCount(n) {
  const svRef = n === 1 ? setVal1 : setVal2
  const val   = Number(svRef.value)
  if (!Number.isFinite(val)) return
  const count = n === 1 ? count1 : count2
  count.value = val
  svRef.value = ''
  post({ [`count${n}`]: val })
}

function setStepLocal(n, raw) {
  const val = Number(raw)
  if (!Number.isFinite(val) || val <= 0) return
  if (n === 1) step1.value = val
  else         step2.value = val
}

function updateSetVal(n, val) {
  if (n === 1) setVal1.value = val
  else         setVal2.value = val
}

// ── Generic field setters ─────────────────────────────────────
function setField(key, value) {
  if ((key === 'max1' || key === 'max2') && (!Number.isFinite(value) || value < 1)) return
  if (stateRefs[key] !== undefined) stateRefs[key].value = value
  post({ [key]: value })
}

function setNestedField(objKey, field, value) {
  if (!Number.isFinite(value)) return
  if (field === 'fontSize' && value < 1) return
  const obj = nestedRefs[objKey]
  obj.value = { ...obj.value, [field]: value }
  post({ [objKey]: { [field]: value } })
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
  padding: 2.5rem 1.5rem;
  font-family: sans-serif;
  overflow-y: auto;
  box-sizing: border-box;
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem;
  color: #ffffff;
}

/* ── Overlay sub-navbar ───────────────────────── */
.overlay-nav {
  width: 100%;
  max-width: 640px;
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
  padding: 0.28rem 0.65rem;
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

.overlay-rename-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0 0;
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

/* ── Sections ────────────────────────────────── */
.section {
  width: 100%;
  max-width: 640px;
  border-top: 1px solid #2a2a2a;
  padding: 1.25rem 0;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #616161;
  margin: 0 0 1rem;
}

.sub-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #424242;
  margin: 0.75rem 0 0.35rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.field-label {
  font-size: 0.85rem;
  color: #9e9e9e;
  width: 5.5rem;
  flex-shrink: 0;
}

input[type='number'],
input[type='text'] {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.9rem;
  width: 7rem;
  text-align: center;
}

input[type='text'] {
  text-align: left;
  width: 9rem;
}

input[type='color'] {
  background-color: #1e1e1e;
  border: 1px solid #424242;
  border-radius: 6px;
  width: 3rem;
  height: 2rem;
  padding: 0.15rem;
  cursor: pointer;
}

.step-input {
  width: 4rem !important;
}

.set-input {
  flex: 1;
  min-width: 0;
  text-align: left !important;
}

.two-col {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.col {
  flex: 1;
  min-width: 220px;
}

.col-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #757575;
  margin: 0 0 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.count {
  font-size: 3.5rem;
  font-weight: bold;
  margin: 0 0 0.5rem;
  color: #82b1ff;
  line-height: 1;
}

button {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1.3rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

button:hover  { background-color: #2c2c2c; }
button:active { background-color: #383838; }

button.reset {
  font-size: 0.9rem;
  color: #ef9a9a;
  border-color: #614040;
}
button.reset:hover { background-color: #2a1a1a; }

.reset-sm {
  font-size: 0.75rem;
  padding: 0.3rem 0.65rem;
  color: #9e9e9e;
  border-color: #3a3a3a;
}
.reset-sm:hover { background-color: #1a1a1a; }

.hint {
  font-size: 0.8rem;
  color: #424242;
  margin-top: 1.5rem;
}
</style>
