<template>
  <div class="overlay">
    <div class="bars">
      <div class="bar-row" :style="barStyle(bar1)">
        <span class="bar-label">{{ label1 }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: pct(count1), background: color1 }"></div>
        </div>
        <span class="bar-value">{{ count1 }} / {{ max }}</span>
      </div>

      <div class="bar-row" :style="barStyle(bar2)">
        <span class="bar-label">{{ label2 }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: pct(count2), background: color2 }"></div>
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
const label1 = ref('Counter 1')
const label2 = ref('Counter 2')
const color1 = ref('#82b1ff')
const color2 = ref('#a5d6a7')
const bar1   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
const bar2   = ref({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
let source = null

function pct(count) {
  if (max.value <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (count / max.value) * 100))}%`
}

function barStyle(bar) {
  return {
    transform: `translate(${bar.x}px, ${bar.y}px) scale(${bar.scaleX}, ${bar.scaleY})`,
  }
}

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (typeof data?.count1 === 'number') count1.value = data.count1
    if (typeof data?.count2 === 'number') count2.value = data.count2
    if (typeof data?.max    === 'number') max.value    = data.max
    if (typeof data?.label1 === 'string') label1.value = data.label1
    if (typeof data?.label2 === 'string') label2.value = data.label2
    if (typeof data?.color1 === 'string') color1.value = data.color1
    if (typeof data?.color2 === 'string') color2.value = data.color2
    if (data?.bar1) bar1.value = { ...bar1.value, ...data.bar1 }
    if (data?.bar2) bar2.value = { ...bar2.value, ...data.bar2 }
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
  transform-origin: center center;
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

.bar-value {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  text-align: right;
}
</style>
