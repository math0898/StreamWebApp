<template>
  <div class="timer-section">
    <p class="timer-display" :style="{ color: mod.color }">{{ displayText }}</p>
    <div v-if="mod.targetType !== 'datetime'" class="counter-row">
      <button
        class="counter-btn"
        :class="{ 'action-activate': mod.status !== 'running' }"
        :disabled="mod.status === 'running'"
        @click="$emit('start', mod)"
      >▶ Start</button>
      <button
        class="counter-btn"
        :class="{ 'action-hide': mod.status === 'running' }"
        :disabled="mod.status !== 'running'"
        @click="$emit('pause', mod)"
      >⏸ Pause</button>
      <button class="counter-btn-sm reset" @click="$emit('reset', mod)">Reset</button>
    </div>
    <p v-else class="timer-datetime-note">Target: {{ formatDatetime(mod.targetDateTime) }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { computeTimerMs, formatTimerValue } from '../utils/timer.js'

const props = defineProps({
  mod: { type: Object, required: true },
})

defineEmits(['start', 'pause', 'reset'])

const displayText = ref('')

let intervalHandle = null

function updateDisplay() {
  const ms = computeTimerMs(props.mod)
  displayText.value = formatTimerValue(ms, props.mod.precision || 'hundredths', props.mod.maxUnit || 'auto')
}

onMounted(() => {
  updateDisplay()
  intervalHandle = setInterval(updateDisplay, 53)
})

onUnmounted(() => {
  if (intervalHandle) clearInterval(intervalHandle)
})

watch(() => props.mod.status, updateDisplay)
watch(() => props.mod.startedAt, updateDisplay)
watch(() => props.mod.pausedAt, updateDisplay)

function formatDatetime(iso) {
  if (!iso) return 'Not set'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
</script>

<style scoped>
.timer-section {
  margin-bottom: 0.5rem;
}
.timer-display {
  margin: 0.25rem 0;
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.counter-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  justify-content: center;
}
.counter-btn {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.15s;
  line-height: 1;
}
.counter-btn:hover  { background-color: #2c2c2c; }
.counter-btn:active { background-color: #383838; }
.counter-btn-sm {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.3rem 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.counter-btn-sm:hover  { background-color: #2c2c2c; }
.counter-btn-sm.reset  { color: #ef9a9a; border-color: #614040; }
.counter-btn-sm.reset:hover { background-color: #2a1a1a; }
.action-activate          { color: #66bb6a; border-color: #2e5c30; }
.action-activate:hover    { background: #1a2e1c; }
.action-hide              { color: #9e9e9e; }
</style>
