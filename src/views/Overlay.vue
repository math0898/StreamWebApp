<template>
  <div class="overlay">
    <div class="bars">
      <div class="bar-row">
        <span class="bar-label">Counter 1</span>
        <div class="bar-track">
          <div class="bar-fill bar-fill--1" :style="{ width: pct(count1) }"></div>
        </div>
        <span class="bar-value">{{ count1 }} / {{ max }}</span>
      </div>

      <div class="bar-row">
        <span class="bar-label">Counter 2</span>
        <div class="bar-track">
          <div class="bar-fill bar-fill--2" :style="{ width: pct(count2) }"></div>
        </div>
        <span class="bar-value">{{ count2 }} / {{ max }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const count1 = ref(0)
const count2 = ref(0)
const max    = ref(100)
let source = null

function pct(count) {
  if (max.value <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (count / max.value) * 100))}%`
}

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (typeof data?.count1 === 'number') count1.value = data.count1
    if (typeof data?.count2 === 'number') count2.value = data.count2
    if (typeof data?.max   === 'number') max.value    = data.max
  }
  source.onerror = (event) => {
    console.warn('[overlay] SSE connection lost, will retry automatically.', event)
  }
})

onUnmounted(() => {
  source?.close()
})
</script>

<style scoped>
.overlay {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  font-family: sans-serif;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 480px;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bar-label {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}

.bar-track {
  width: 100%;
  height: 28px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 14px;
  transition: width 0.2s ease;
}

.bar-fill--1 {
  background: #82b1ff;
}

.bar-fill--2 {
  background: #a5d6a7;
}

.bar-value {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  text-align: right;
}
</style>
