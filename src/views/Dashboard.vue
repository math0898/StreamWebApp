<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <!-- ── Counts ─────────────────────────────────────── -->
    <section class="section">
      <h2 class="section-title">Counts</h2>

      <div class="row">
        <label class="field-label" for="max-input">Max</label>
        <input
          id="max-input"
          type="number"
          min="1"
          :value="max"
          @change="setField('max', $event.target.valueAsNumber)"
        />
        <button class="reset-sm" @click="setField('max', 100)">Reset</button>
      </div>

      <div class="counters">
        <div v-for="n in [1, 2]" :key="n" class="counter-block">
          <p class="label">{{ n === 1 ? label1 : label2 }}</p>
          <p class="count">{{ n === 1 ? count1 : count2 }}</p>
          <div class="controls">
            <button @click="adjustCount(n, -1)">−</button>
            <button @click="adjustCount(n, +1)">+</button>
            <button class="reset" @click="setField(`count${n}`, 0)">Reset</button>
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

          <div v-for="{ key, label: lbl, step, def } in layoutFields" :key="key" class="row">
            <label class="field-label">{{ lbl }}</label>
            <input
              type="number"
              :step="step"
              :value="(n === 1 ? bar1 : bar2)[key]"
              @change="setBarField(n, key, $event.target.valueAsNumber)"
            />
            <button class="reset-sm" @click="setBarField(n, key, def)">Reset</button>
          </div>
        </div>
      </div>
    </section>

    <p class="hint">Changes are sent to the server and forwarded to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const count1 = ref(0)
const count2 = ref(0)
const max    = ref(100)
const label1 = ref('Counter 1')
const label2 = ref('Counter 2')
const color1 = ref('#82b1ff')
const color2 = ref('#a5d6a7')
const bar1   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const bar2   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })

const layoutFields = [
  { key: 'x',      label: 'X Offset', step: 1,   def: 0 },
  { key: 'y',      label: 'Y Offset', step: 1,   def: 0 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1, def: 1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1, def: 1 },
]

function applyState(data) {
  if (data == null) return
  if (typeof data.count1 === 'number') count1.value = data.count1
  if (typeof data.count2 === 'number') count2.value = data.count2
  if (typeof data.max    === 'number') max.value    = data.max
  if (typeof data.label1 === 'string') label1.value = data.label1
  if (typeof data.label2 === 'string') label2.value = data.label2
  if (typeof data.color1 === 'string') color1.value = data.color1
  if (typeof data.color2 === 'string') color2.value = data.color2
  if (data.bar1) bar1.value = { ...bar1.value, ...data.bar1 }
  if (data.bar2) bar2.value = { ...bar2.value, ...data.bar2 }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/state')
    applyState(await res.json())
  } catch (err) {
    console.warn('[dashboard] Failed to load initial state:', err)
  }
})

async function post(patch) {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    applyState(await res.json())
  } catch (err) {
    console.warn('[dashboard] Failed to POST state:', err)
    try {
      applyState(await (await fetch('/api/state')).json())
    } catch (recoveryErr) {
      console.warn('[dashboard] Failed to recover state:', recoveryErr)
    }
  }
}

function adjustCount(n, delta) {
  const key = `count${n}`
  const val = (n === 1 ? count1 : count2).value + delta
  if (n === 1) count1.value = val
  else         count2.value = val
  post({ [key]: val })
}

function setField(key, value) {
  if (key === 'count1') count1.value = value
  else if (key === 'count2') count2.value = value
  else if (key === 'max')    max.value    = value
  else if (key === 'label1') label1.value = value
  else if (key === 'label2') label2.value = value
  else if (key === 'color1') color1.value = value
  else if (key === 'color2') color2.value = value
  if (key === 'max' && (!Number.isFinite(value) || value < 1)) return
  post({ [key]: value })
}

function setBarField(n, key, value) {
  if (!Number.isFinite(value)) return
  const bar = n === 1 ? bar1 : bar2
  bar.value = { ...bar.value, [key]: value }
  post({ [`bar${n}`]: { [key]: value } })
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
  gap: 0;
  overflow-y: auto;
  box-sizing: border-box;
}

h1 {
  font-size: 2rem;
  margin: 0 0 1.5rem;
  color: #ffffff;
}

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

.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
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

.counters {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}

.counter-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-size: 1rem;
  color: #9e9e9e;
  margin: 0;
}

.count {
  font-size: 4.5rem;
  font-weight: bold;
  margin: 0;
  color: #82b1ff;
  line-height: 1;
}

.controls {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.25rem;
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

.hint {
  font-size: 0.8rem;
  color: #424242;
  margin-top: 1.5rem;
}
</style>
