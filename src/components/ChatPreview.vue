<template>
  <div class="chat-section">
    <div class="chat-status-row">
      <span
        class="chat-status-dot"
        :class="'chat-' + (chatStatuses[modId] ?? 'disconnected')"
      ></span>
      <span class="chat-status-label">{{ channel ? '#' + channel : 'No channel set' }}</span>
      <span class="chat-connection-state" :class="'chat-' + (chatStatuses[modId] ?? 'disconnected')">{{ chatStatuses[modId] ?? 'disconnected' }}</span>
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

<style scoped>
.chat-section {
  margin-bottom: 0.5rem;
}
.chat-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.chat-disconnected { background: #757575; color: #757575; }
.chat-connecting   { background: #ffa726; color: #ffa726; }
.chat-connected    { background: #66bb6a; color: #66bb6a; }
.chat-failed       { background: #ef5350; color: #ef5350; }
.chat-status-label {
  font-weight: 600;
}
.chat-connection-state {
  font-size: 0.8rem;
  text-transform: capitalize;
}
.chat-preview {
  font-size: 0.8rem;
  max-height: 100px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
}
.chat-preview-line {
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-preview-user {
  font-weight: 600;
}
.chat-preview-colon {
  margin-right: 4px;
  opacity: 0.6;
}
.chat-preview-empty {
  opacity: 0.5;
  font-style: italic;
}
</style>
