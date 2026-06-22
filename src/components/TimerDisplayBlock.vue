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
