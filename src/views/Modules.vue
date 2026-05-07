<template>
  <div class="modules">
    <h1>Modules</h1>

    <section class="section">
      <h2 class="section-title">ProgressBar Defaults</h2>
      <p class="hint-inline">Applied when adding a new ProgressBar module.</p>

      <div class="row">
        <label class="field-label">Label</label>
        <input type="text" :value="defaults.progressBar.label" @change="patch('progressBar', { label: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Goal</label>
        <input type="number" min="1" :value="defaults.progressBar.max" @change="patch('progressBar', { max: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input type="color" :value="defaults.progressBar.color" @input="patch('progressBar', { color: $event.target.value })" />
      </div>

      <p class="sub-title">Bar</p>
      <div v-for="f in barFields" :key="'pb'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.bar[f.key]" @change="patch('progressBar', { bar: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Title</p>
      <div v-for="f in titleFields" :key="'pt'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.title[f.key]" @change="patch('progressBar', { title: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Value</p>
      <div v-for="f in valueFields" :key="'pv'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.value[f.key]" @change="patch('progressBar', { value: { [f.key]: $event.target.valueAsNumber } })" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Image Module Defaults</h2>
      <p class="hint-inline">Applied when adding a new Image module.</p>

      <div class="row">
        <label class="field-label">Image Path</label>
        <input type="text" class="wide-input" :value="defaults.image.src" @change="patch('image', { src: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Alt Text</label>
        <input type="text" class="wide-input" :value="defaults.image.alt" @change="patch('image', { alt: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.1" min="0" max="1" :value="defaults.image.opacity" @change="patch('image', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in transformFields" :key="'im'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.image.transform[f.key]" @change="patch('image', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Text Module Defaults</h2>
      <p class="hint-inline">Applied when adding a new Text module.</p>

      <div class="row">
        <label class="field-label">Text</label>
        <input type="text" class="wide-input" :value="defaults.text.text" @change="patch('text', { text: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input type="color" :value="defaults.text.color" @input="patch('text', { color: $event.target.value })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in textTransformFields" :key="'tx'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.text.transform[f.key]" @change="patch('text', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>
    </section>

    <button class="reset-factory-btn" @click="resetFactory">Reset All to Factory Defaults</button>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

const factoryDefaults = {
  progressBar: {
    label: 'Counter',
    max: 100,
    color: '#82b1ff',
    bar: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    title: { x: 0, y: 0, fontSize: 16 },
    value: { x: 0, y: 0, fontSize: 14 },
  },
  image: {
    src: '/sample-module-image.svg',
    alt: 'Sample module image',
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
  },
  text: {
    text: 'Sample text',
    color: '#ffffff',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 },
  },
}

const defaults = reactive(JSON.parse(JSON.stringify(factoryDefaults)))

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
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'scaleX',   label: 'Scale X',   step: 0.1 },
  { key: 'scaleY',   label: 'Scale Y',   step: 0.1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]

function mergeInto(target, source) {
  for (const [k, v] of Object.entries(source ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) ? target[k] : {}
      mergeInto(target[k], v)
    } else {
      target[k] = v
    }
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/defaults')
    const data = await res.json()
    mergeInto(defaults, data)
  } catch (err) {
    console.warn('[modules] Failed to load defaults:', err)
  }
})

async function patch(type, patchObj) {
  mergeInto(defaults[type], patchObj)
  try {
    const res = await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: patchObj }),
    })
    const data = await res.json()
    if (data?.[type]) mergeInto(defaults[type], data[type])
  } catch (err) {
    console.warn('[modules] Failed to save defaults:', err)
  }
}

async function resetFactory() {
  try {
    const res = await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(factoryDefaults),
    })
    const data = await res.json()
    mergeInto(defaults, data)
  } catch (err) {
    console.warn('[modules] Failed to reset defaults:', err)
  }
}
</script>

<style scoped>
.modules {
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
  max-width: 720px;
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
  color: #757575;
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
  width: 6.5rem;
  flex-shrink: 0;
}

.wide-input {
  flex: 1;
  min-width: 0;
}

.reset-factory-btn {
  background-color: #1e1e1e;
  color: #ef9a9a;
  border: 1px solid #614040;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
  margin-top: 0.5rem;
}
.reset-factory-btn:hover { background-color: #2a1a1a; }
</style>
