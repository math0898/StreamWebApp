<template>
  <div class="chat-section">
    <div class="chat-status-row">
      <span
        class="chat-status-dot"
        :class="'chat-' + (chatStatuses[modId] ?? 'disconnected')"
      ></span>
      <span class="chat-status-label">{{ channel ? '#' + channel : 'No channel set' }}</span>
      <span class="chat-connection-state">{{ chatStatuses[modId] ?? 'disconnected' }}</span>
    </div>
    <div class="chat-preview">
      <div
        v-for="msg in messages.slice(-5)"
        :key="msg.id"
        class="chat-preview-line"
      >
        <span class="chat-preview-user" :style="{ color: msg.color }">{{ msg.username }}</span>
        <span class="chat-preview-colon">:</span>
        <span class="chat-preview-text">{{ msg.message }}</span>
      </div>
      <div v-if="!messages.length" class="chat-preview-empty">No messages yet</div>
    </div>
  </div>
</template>

<script setup>
import { inject, computed } from 'vue'

const props = defineProps({
  modId: { type: String, required: true },
  channel: { type: String, default: '' },
})

const chatMessages = inject('chatMessages', {})
const chatStatuses = inject('chatStatuses', {})
const messages = computed(() => chatMessages[props.modId] ?? [])
</script>
