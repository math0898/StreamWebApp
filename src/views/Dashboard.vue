<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="label">Counter</p>
    <p class="counter">{{ count }}</p>
    <div class="controls">
      <button @click="decrement">−</button>
      <button @click="increment">+</button>
      <button class="reset" @click="reset">Reset</button>
    </div>
    <p class="hint">Changes are broadcast to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const CHANNEL_NAME = 'stream-counter'

const count = ref(0)
let channel = null

function broadcast() {
  channel?.postMessage({ count: count.value })
}

function increment() {
  count.value++
  broadcast()
}

function decrement() {
  count.value--
  broadcast()
}

function reset() {
  count.value = 0
  broadcast()
}

onMounted(() => {
  channel = new BroadcastChannel(CHANNEL_NAME)
})

onUnmounted(() => {
  channel?.close()
})
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
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #ffffff;
}

.label {
  font-size: 1rem;
  color: #9e9e9e;
  margin: 0;
}

.counter {
  font-size: 5rem;
  font-weight: bold;
  margin: 0;
  color: #82b1ff;
  line-height: 1;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
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
