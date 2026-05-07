<template>
  <div class="overlay">
    <div class="scene">
      <template v-for="mod in modules" :key="mod.id">
        <div
          v-if="mod.type === 'progressBar'"
          class="progress-module"
          :style="progressContainerStyle(mod)"
        >
          <span class="bar-label" :style="textStyle(mod.title)">{{ mod.label }}</span>
          <div class="bar-track" :style="trackStyle(mod.bar)">
            <div class="bar-fill" :style="{ width: pct(mod.count, mod.max), background: mod.color }"></div>
          </div>
          <span class="bar-value" :style="textStyle(mod.value)">{{ mod.count }} / {{ mod.max }}</span>
        </div>

        <img
          v-else-if="mod.type === 'image'"
          class="image-module"
          :src="mod.src"
          :alt="mod.alt || ''"
          :style="imageStyle(mod)"
        />

        <div
          v-else-if="mod.type === 'text'"
          class="text-module"
          :style="textModuleStyle(mod)"
        >
          {{ mod.text }}
        </div>
      </template>
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

function progressContainerStyle(mod) {
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${mod?.bar?.x ?? 0}px, ${mod?.bar?.y ?? 0}px)`,
  }
}

function trackStyle(bar) {
  return {
    transform: `scale(${bar?.scaleX ?? 1}, ${bar?.scaleY ?? 1})`,
    transformOrigin: 'left top',
  }
}

function textStyle(t) {
  return {
    transform: `translate(${t?.x ?? 0}px, ${t?.y ?? 0}px)`,
    fontSize: `${t?.fontSize ?? 16}px`,
  }
}

function imageStyle(mod) {
  const tr = mod?.transform ?? {}
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${tr.x ?? 0}px, ${tr.y ?? 0}px) scale(${tr.scaleX ?? 1}, ${tr.scaleY ?? 1})`,
    transformOrigin: 'left top',
    opacity: `${mod?.opacity ?? 1}`,
    maxWidth: 'none',
    pointerEvents: 'none',
  }
}

function textModuleStyle(mod) {
  const tr = mod?.transform ?? {}
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${tr.x ?? 0}px, ${tr.y ?? 0}px) scale(${tr.scaleX ?? 1}, ${tr.scaleY ?? 1})`,
    transformOrigin: 'left top',
    fontSize: `${tr.fontSize ?? 32}px`,
    color: mod?.color ?? '#ffffff',
    whiteSpace: 'pre-wrap',
    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
  }
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
  background: transparent;
  font-family: sans-serif;
}

.scene {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.progress-module {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 480px;
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

.image-module {
  display: block;
}

.text-module {
  font-weight: 600;
}
</style>
