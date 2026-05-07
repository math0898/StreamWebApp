<template>
  <div class="settings">
    <h1>Settings</h1>

    <section class="section">
      <h2 class="section-title">Progress Bar Defaults</h2>
      <p class="hint-inline">These values are applied when adding a new module to an overlay.</p>

      <div class="row">
        <label class="field-label">Label</label>
        <input
          type="text"
          class="text-input"
          :value="d.label"
          @change="patch({ label: $event.target.value })"
        />
      </div>

      <div class="row">
        <label class="field-label">Max</label>
        <input
          type="number"
          min="1"
          :value="d.max"
          @change="patch({ max: $event.target.valueAsNumber })"
        />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input
          type="color"
          class="color-input"
          :value="d.color"
          @input="patch({ color: $event.target.value })"
        />
      </div>

      <p class="sub-title">Bar Layout</p>
      <div v-for="f in barFields" :key="f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input
          type="number"
          :step="f.step"
          :value="d.bar[f.key]"
          @change="patch({ bar: { [f.key]: $event.target.valueAsNumber } })"
        />
      </div>

      <p class="sub-title">Title Layout</p>
      <div v-for="f in titleFields" :key="f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input
          type="number"
          :step="f.step"
          :value="d.title[f.key]"
          @change="patch({ title: { [f.key]: $event.target.valueAsNumber } })"
        />
      </div>

      <p class="sub-title">Value Layout</p>
      <div v-for="f in valueFields" :key="f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input
          type="number"
          :step="f.step"
          :value="d.value[f.key]"
          @change="patch({ value: { [f.key]: $event.target.valueAsNumber } })"
        />
      </div>
    </section>

    <button class="reset-factory-btn" @click="resetFactory">Reset All to Factory</button>

    <p class="hint">Changes apply to new modules only. Existing modules are not affected.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const d = ref({
  label: 'Counter',
  max:   100,
  color: '#82b1ff',
  bar:   { x: 0, y: 0, scaleX: 1, scaleY: 1 },
  title: { x: 0, y: 0, fontSize: 16 },
  value: { x: 0, y: 0, fontSize: 14 },
})

const barFields = [
  { key: 'x',      label: 'X Offset', step: 1,   },
  { key: 'y',      label: 'Y Offset', step: 1,   },
  { key: 'scaleX', label: 'Scale X',  step: 0.1, },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1, },
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

onMounted(async () => {
  try {
    const res  = await fetch('/api/defaults')
    const data = await res.json()
    if (data.progressBar) d.value = data.progressBar
  } catch (err) {
    console.warn('[settings] Failed to load defaults:', err)
  }
})

async function patch(update) {
  // Optimistic update
  for (const [key, val] of Object.entries(update)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      d.value[key] = { ...d.value[key], ...val }
    } else {
      d.value[key] = val
    }
  }
  try {
    const res  = await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    const data = await res.json()
    if (data.progressBar) d.value = data.progressBar
  } catch (err) {
    console.warn('[settings] Failed to update defaults:', err)
  }
}

async function resetFactory() {
  await patch({
    label: 'Counter',
    max:   100,
    color: '#82b1ff',
    bar:   { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    title: { x: 0, y: 0, fontSize: 16 },
    value: { x: 0, y: 0, fontSize: 14 },
  })
}
</script>

<style scoped>
.settings {
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
  margin: 0 0 0.5rem;
}

.hint-inline {
  font-size: 0.8rem;
  color: #424242;
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

button {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
button:hover  { background-color: #2c2c2c; }
button:active { background-color: #383838; }

.reset-factory-btn {
  font-size: 0.85rem;
  padding: 0.45rem 1.2rem;
  color: #ef9a9a;
  border-color: #614040;
  margin-top: 0.5rem;
}
.reset-factory-btn:hover { background-color: #2a1a1a; }

.hint {
  font-size: 0.8rem;
  color: #424242;
  margin-top: 1.5rem;
}
</style>
