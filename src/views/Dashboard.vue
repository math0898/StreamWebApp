<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div class="max-row">
      <label class="field-label" for="max-input">Max</label>
      <input
        id="max-input"
        type="number"
        min="1"
        :value="max"
        @change="setMax($event.target.valueAsNumber)"
      />
    </div>

    <div class="counters">
      <div class="counter-block">
        <p class="label">Counter 1</p>
        <p class="count">{{ count1 }}</p>
        <div class="controls">
          <button @click="update('count1', count1 - 1)">−</button>
          <button @click="update('count1', count1 + 1)">+</button>
          <button class="reset" @click="update('count1', 0)">Reset</button>
        </div>
      </div>

      <div class="counter-block">
        <p class="label">Counter 2</p>
        <p class="count">{{ count2 }}</p>
        <div class="controls">
          <button @click="update('count2', count2 - 1)">−</button>
          <button @click="update('count2', count2 + 1)">+</button>
          <button class="reset" @click="update('count2', 0)">Reset</button>
        </div>
      </div>
    </div>

    <p class="hint">Changes are sent to the server and forwarded to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const count1 = ref(0)
const count2 = ref(0)
const max    = ref(100)

onMounted(async () => {
  try {
    const res = await fetch('/api/state')
    const data = await res.json()
    count1.value = data.count1 ?? 0
    count2.value = data.count2 ?? 0
    max.value    = data.max    ?? 100
  } catch (err) {
    // server not yet ready — keep defaults
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
    const data = await res.json()
    count1.value = data.count1
    count2.value = data.count2
    max.value    = data.max
  } catch (err) {
    console.warn('[dashboard] Failed to POST state:', err)
    // revert optimistic updates on failure
    try {
      const res = await fetch('/api/state')
      const data = await res.json()
      count1.value = data.count1 ?? count1.value
      count2.value = data.count2 ?? count2.value
      max.value    = data.max    ?? max.value
    } catch (recoveryErr) {
      console.warn('[dashboard] Failed to recover state:', recoveryErr)
    }
  }
}

function update(field, value) {
  if (field === 'count1') count1.value = value
  if (field === 'count2') count2.value = value
  post({ [field]: value })
}

function setMax(value) {
  if (!Number.isFinite(value) || value < 1) return
  max.value = value
  post({ max: value })
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
  justify-content: center;
  font-family: sans-serif;
  gap: 1.5rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0;
  color: #ffffff;
}

.max-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.field-label {
  font-size: 0.9rem;
  color: #9e9e9e;
}

input[type='number'] {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 1rem;
  width: 6rem;
  text-align: center;
}

.counters {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
  justify-content: center;
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
  font-size: 5rem;
  font-weight: bold;
  margin: 0;
  color: #82b1ff;
  line-height: 1;
}

.controls {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

button {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1.4rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

button:hover {
  background-color: #2c2c2c;
}

button:active {
  background-color: #383838;
}

button.reset {
  font-size: 1rem;
  color: #ef9a9a;
  border-color: #614040;
}

button.reset:hover {
  background-color: #2a1a1a;
}

.hint {
  font-size: 0.85rem;
  color: #616161;
  margin-top: 0.5rem;
}
</style>
