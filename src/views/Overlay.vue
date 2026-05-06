<template>
  <div class="overlay">
    <div class="bars">
      <div class="bar-row" :style="rowStyle(bar1)">
        <span class="bar-label" :style="textStyle(title1)">{{ label1 }}</span>
        <div class="bar-track" :style="trackStyle(bar1)">
          <div class="bar-fill" :style="{ width: pct(count1, max1), background: color1 }"></div>
        </div>
        <span class="bar-value" :style="textStyle(value1)">{{ count1 }} / {{ max1 }}</span>
      </div>

      <div class="bar-row" :style="rowStyle(bar2)">
        <span class="bar-label" :style="textStyle(title2)">{{ label2 }}</span>
        <div class="bar-track" :style="trackStyle(bar2)">
          <div class="bar-fill" :style="{ width: pct(count2, max2), background: color2 }"></div>
        </div>
        <span class="bar-value" :style="textStyle(value2)">{{ count2 }} / {{ max2 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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
let source = null

function pct(count, maxVal) {
  if (maxVal <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (count / maxVal) * 100))}%`
}

// Bar row: translate only — text is NOT scaled by bar scale controls
function rowStyle(bar) {
  return { transform: `translate(${bar.x}px, ${bar.y}px)` }
}

// Bar track: scale only — text is unaffected
function trackStyle(bar) {
  return { transform: `scale(${bar.scaleX}, ${bar.scaleY})`, transformOrigin: 'left top' }
}

// Text elements: own offset + font size, anchored to the bar's translated position
function textStyle(t) {
  return { transform: `translate(${t.x}px, ${t.y}px)`, fontSize: `${t.fontSize}px` }
}

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (typeof data?.count1 === 'number') count1.value = data.count1
    if (typeof data?.count2 === 'number') count2.value = data.count2
    if (typeof data?.max1   === 'number') max1.value   = data.max1
    if (typeof data?.max2   === 'number') max2.value   = data.max2
    if (typeof data?.label1 === 'string') label1.value = data.label1
    if (typeof data?.label2 === 'string') label2.value = data.label2
    if (typeof data?.color1 === 'string') color1.value = data.color1
    if (typeof data?.color2 === 'string') color2.value = data.color2
    if (data?.bar1)   bar1.value   = { ...bar1.value,   ...data.bar1 }
    if (data?.bar2)   bar2.value   = { ...bar2.value,   ...data.bar2 }
    if (data?.title1) title1.value = { ...title1.value, ...data.title1 }
    if (data?.title2) title2.value = { ...title2.value, ...data.title2 }
    if (data?.value1) value1.value = { ...value1.value, ...data.value1 }
    if (data?.value2) value2.value = { ...value2.value, ...data.value2 }
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
  transform-origin: left top;
}

.bar-fill {
  height: 100%;
  border-radius: 14px;
  transition: width 0.2s ease;
}

.bar-value {
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  text-align: right;
}
</style>
