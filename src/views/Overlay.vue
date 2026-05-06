<template>
  <div class="overlay">
    <span class="counter">{{ count }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const count = ref(0)
let source = null

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (typeof data?.count === 'number') {
      count.value = data.count
    }
  }
  source.onerror = () => {
    console.warn('[overlay] SSE connection lost, will retry automatically.')
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

.counter {
  font-size: 8rem;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
</style>
