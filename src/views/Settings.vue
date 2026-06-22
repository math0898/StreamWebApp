<template>
  <div class="settings">
    <h1>Brand Appearance</h1>
    <p class="hint-inline">Global brand colors and styles. All visual modules inherit from these values unless overridden per-module.</p>

    <section class="section">
      <h2 class="section-title">Background</h2>
      <div class="row">
        <label class="field-label">Fill</label>
        <input type="color" :value="brand.background.backgroundColor" @input="patchBrand({ background: { ...brand.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" class="alpha-input" :value="brand.background.backgroundAlpha" @change="patchBrand({ background: { ...brand.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="brand.background.borderColor" @input="patchBrand({ background: { ...brand.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" class="alpha-input" :value="brand.background.borderAlpha" @change="patchBrand({ background: { ...brand.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Colors</h2>
      <div class="row">
        <label class="field-label">Text</label>
        <input type="color" :value="brand.textColor" @input="patchBrand({ textColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Highlight</label>
        <input type="color" :value="brand.highlightColor" @input="patchBrand({ highlightColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Numbers</label>
        <input type="color" :value="brand.numberColor" @input="patchBrand({ numberColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Username</label>
        <input type="color" :value="brand.defaultUsernameColor" @input="patchBrand({ defaultUsernameColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Second Highlight</label>
        <input type="color" :value="brand.secondHighlightColor" @input="patchBrand({ secondHighlightColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Best Highlight</label>
        <input type="color" :value="brand.bestHighlightColor" @input="patchBrand({ bestHighlightColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Good Highlight</label>
        <input type="color" :value="brand.goodHighlightColor" @input="patchBrand({ goodHighlightColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Bad Highlight</label>
        <input type="color" :value="brand.badHighlightColor" @input="patchBrand({ badHighlightColor: $event.target.value })" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Opacity</h2>
      <div class="row">
        <label class="field-label">Default</label>
        <input type="number" step="0.05" min="0" max="1" :value="brand.opacity" @change="patchBrand({ opacity: $event.target.valueAsNumber })" />
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Animation</h2>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="brand.animation.transitionDurationSec" @change="patchBrand({ animation: { ...brand.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="brand.animation.motionDirection" @change="patchBrand({ animation: { ...brand.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="brand.animation.motionDistancePx" @change="patchBrand({ animation: { ...brand.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="brand.animation.motionInterpolation" @change="patchBrand({ animation: { ...brand.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <button class="reset-factory-btn" @click="resetToFactory">Reset to Factory Defaults</button>
      <p v-if="saved" class="saved-msg">Saved &amp; propagated to all non-overridden modules.</p>
    </section>
  </div>
</template>

<script setup>
import { reactive, onMounted, ref } from 'vue'

const brand = reactive({
  background: { backgroundColor: '#000000', backgroundAlpha: 199, borderColor: '#ffffff', borderAlpha: 36 },
  textColor: '#ffffff',
  highlightColor: '#82b1ff',
  numberColor: '#82b1ff',
  defaultUsernameColor: '#ffffff',
  secondHighlightColor: '#82b1ff',
  goodHighlightColor: '#4caf50',
  badHighlightColor: '#f44336',
  bestHighlightColor: '#ffd700',
  opacity: 1,
  animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
})

const saved = ref(false)

async function loadBrand() {
  try {
    const res = await fetch('/api/brand')
    const data = await res.json()
    Object.assign(brand, data)
    brand.background = { ...brand.background, ...data.background }
    brand.animation = { ...brand.animation, ...data.animation }
  } catch (err) {
    console.warn('[settings] Failed to load brand:', err)
  }
}

async function patchBrand(patch) {
  saved.value = false
  // Apply locally
  if (patch.background) brand.background = { ...brand.background, ...patch.background }
  else if (patch.animation) brand.animation = { ...brand.animation, ...patch.animation }
  else Object.assign(brand, patch)
  try {
    const res = await fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) saved.value = true
  } catch (err) {
    console.warn('[settings] Failed to save brand:', err)
  }
}

async function resetToFactory() {
  const factory = {
    background: { backgroundColor: '#000000', backgroundAlpha: 199, borderColor: '#ffffff', borderAlpha: 36 },
    textColor: '#ffffff',
    highlightColor: '#82b1ff',
    numberColor: '#82b1ff',
    defaultUsernameColor: '#ffffff',
    secondHighlightColor: '#82b1ff',
    goodHighlightColor: '#4caf50',
    badHighlightColor: '#f44336',
    bestHighlightColor: '#ffd700',
    opacity: 1,
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  }
  try {
    const res = await fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(factory),
    })
    if (res.ok) {
      Object.assign(brand, factory)
      saved.value = true
    }
  } catch (err) {
    console.warn('[settings] Failed to reset brand:', err)
  }
}

onMounted(loadBrand)
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
  margin: 0 0 0.25rem;
  color: #ffffff;
}

.hint-inline {
  font-size: 0.85rem;
  color: #9e9e9e;
  margin: 0 0 1.25rem;
  max-width: 640px;
  text-align: center;
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
  margin: 0 0 0.75rem;
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

.alpha-input {
  width: 5rem;
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
}
.reset-factory-btn:hover { background-color: #2a1a1a; }

.saved-msg {
  font-size: 0.85rem;
  color: #81c784;
  margin-top: 0.75rem;
}
</style>