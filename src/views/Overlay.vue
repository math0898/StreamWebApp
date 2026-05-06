<template>
  <div class="overlay">
    <span class="counter">{{ count }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const CHANNEL_NAME = 'stream-counter'

const count = ref(0)
let channel = null

onMounted(() => {
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event) => {
    if (typeof event.data?.count === 'number') {
      count.value = event.data.count
    }
  }
})

onUnmounted(() => {
  channel?.close()
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
