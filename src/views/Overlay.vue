<template>
  <div class="overlay">
    <div class="bars">
      <div
        v-for="mod in modules"
        :key="mod.id"
        class="bar-row"
        :style="rowStyle(mod.bar)"
      >
        <span class="bar-label" :style="textStyle(mod.title)">{{ mod.label }}</span>
        <div class="bar-track" :style="trackStyle(mod.bar)">
          <div class="bar-fill" :style="{ width: pct(mod.count, mod.max), background: mod.color }"></div>
        </div>
        <span class="bar-value" :style="textStyle(mod.value)">{{ mod.count }} / {{ mod.max }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const modules = ref([])
let source = null

function pct(count, maxVal) {
  if (maxVal <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (count / maxVal) * 100))}%`
}

function rowStyle(bar) {
  return { transform: `translate(${bar.x}px, ${bar.y}px)` }
}

function trackStyle(bar) {
  return { transform: `scale(${bar.scaleX}, ${bar.scaleY})`, transformOrigin: 'left top' }
}

function textStyle(t) {
  return { transform: `translate(${t.x}px, ${t.y}px)`, fontSize: `${t.fontSize}px` }
}

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (Array.isArray(data?.modules)) modules.value = data.modules
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
