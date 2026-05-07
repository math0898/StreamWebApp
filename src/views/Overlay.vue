<template>
  <div class="overlay">
    <div class="scene">
      <audio ref="audioRef" preload="auto"></audio>
      <template v-for="mod in modules" :key="mod.id">
        <template v-if="!mod.hidden">
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
      </template>

      <transition name="now-playing-pop">
        <div v-if="shouldShowNowPlaying" class="now-playing-popup" :style="popupStyle">
          <img
            class="now-playing-cover"
            :src="music?.song?.coverPath"
            :alt="music?.song?.coverPath
              ? `Album art for ${music?.song?.album ?? music?.song?.title ?? 'Unknown Album'}`
              : 'No album art available'"
          />
          <div class="now-playing-info">
            <p class="now-playing-title">{{ music?.song?.title ?? 'Unknown Song' }}</p>
            <p class="now-playing-artist">{{ music?.song?.artist ?? 'Unknown Artist' }}</p>
            <div class="now-playing-progress-track">
              <div class="now-playing-progress-fill" :style="{ width: `${musicProgressPct}%` }"></div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const modules = ref([])
const music = ref(null)
const audioRef = ref(null)
const musicProgressPct = ref(0)
const PROGRESS_UPDATE_INTERVAL_MS = 250
const SYNC_TOLERANCE_SEC = 1
const popupConfig = ref({
  x: 0,
  y: 0,
  hiddenVisual: false,
  defaultPlayMusic: true,
  animation: {
    songStartShowSec: 6,
    songEndShowSec: 3,
    periodicIntervalSec: 45,
    periodicShowSec: 4,
  },
})
const popupVisible = ref(false)
let progressTimer = null
let popupHideTimer = null
let popupEndTimer = null
let popupPeriodicTimer = null
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

function computeElapsedSec(snapshot, nowMs = Date.now()) {
  if (!snapshot) return 0
  let pausedBase = nowMs
  if (snapshot.status === 'paused') {
    pausedBase = typeof snapshot.pauseStartedAt === 'number'
      ? snapshot.pauseStartedAt
      : snapshot.startedAt + snapshot.pausedMsTotal
  }
  const elapsedMs = snapshot.status === 'paused'
    ? pausedBase - snapshot.startedAt - snapshot.pausedMsTotal
    : nowMs - snapshot.startedAt - snapshot.pausedMsTotal
  const safeElapsed = Math.max(0, elapsedMs / 1000)
  const knownDuration = snapshot.song?.durationSec
  if (typeof knownDuration === 'number' && knownDuration > 0) return Math.min(safeElapsed, knownDuration)
  return safeElapsed
}

function normalizePopupConfig(rawConfig) {
  const animation = rawConfig?.animation ?? {}
  popupConfig.value = {
    x: typeof rawConfig?.x === 'number' ? rawConfig.x : 0,
    y: typeof rawConfig?.y === 'number' ? rawConfig.y : 0,
    hiddenVisual: typeof rawConfig?.hiddenVisual === 'boolean' ? rawConfig.hiddenVisual : false,
    defaultPlayMusic: typeof rawConfig?.defaultPlayMusic === 'boolean' ? rawConfig.defaultPlayMusic : true,
    animation: {
      songStartShowSec: typeof animation.songStartShowSec === 'number' && animation.songStartShowSec >= 0 ? animation.songStartShowSec : 6,
      songEndShowSec: typeof animation.songEndShowSec === 'number' && animation.songEndShowSec >= 0 ? animation.songEndShowSec : 3,
      periodicIntervalSec: typeof animation.periodicIntervalSec === 'number' && animation.periodicIntervalSec >= 0 ? animation.periodicIntervalSec : 45,
      periodicShowSec: typeof animation.periodicShowSec === 'number' && animation.periodicShowSec >= 0 ? animation.periodicShowSec : 4,
    },
  }
  if (popupConfig.value.hiddenVisual) popupVisible.value = false
}

function showPopupFor(showDurationSec) {
  if (popupConfig.value.hiddenVisual || showDurationSec <= 0) return
  popupVisible.value = true
  if (popupHideTimer) clearTimeout(popupHideTimer)
  popupHideTimer = setTimeout(() => {
    popupVisible.value = false
  }, Math.max(100, showDurationSec * 1000))
}

function trackDurationSec(snapshot) {
  const audio = audioRef.value
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
  const storedDuration = snapshot?.song?.durationSec
  return typeof storedDuration === 'number' && storedDuration > 0 ? storedDuration : 0
}

function resetPopupTimers(snapshot) {
  if (popupEndTimer) clearTimeout(popupEndTimer)
  if (popupPeriodicTimer) clearInterval(popupPeriodicTimer)
  const cfg = popupConfig.value.animation
  const duration = trackDurationSec(snapshot)
  const elapsed = computeElapsedSec(snapshot)

  if (cfg.songEndShowSec > 0 && duration > 0) {
    const startsInMs = Math.max(0, (duration - elapsed - cfg.songEndShowSec) * 1000)
    popupEndTimer = setTimeout(() => showPopupFor(cfg.songEndShowSec), startsInMs)
  }

  if (cfg.periodicIntervalSec > 0 && cfg.periodicShowSec > 0) {
    popupPeriodicTimer = setInterval(() => showPopupFor(cfg.periodicShowSec), cfg.periodicIntervalSec * 1000)
  }
}

function syncMusic(snapshot) {
  const previousSequence = music.value?.sequence
  music.value = snapshot
  const audio = audioRef.value
  if (!snapshot?.song?.audioPath) return
  if (!audio) {
    resetPopupTimers(snapshot)
    if (snapshot.sequence !== previousSequence) showPopupFor(popupConfig.value.animation.songStartShowSec)
    return
  }

  const incomingSeq = String(snapshot.sequence ?? 0)
  const seqChanged = audio.dataset.sequence !== incomingSeq
  const expectedSrc = snapshot.song.audioPath
  const srcChanged = !audio.getAttribute('src') || audio.getAttribute('src') !== expectedSrc

  if (seqChanged || srcChanged) {
    audio.setAttribute('src', expectedSrc)
    audio.dataset.sequence = incomingSeq
    audio.load()
  }

  const targetTime = computeElapsedSec(snapshot)
  if (Number.isFinite(targetTime) && Math.abs((audio.currentTime || 0) - targetTime) > SYNC_TOLERANCE_SEC) {
    try {
      audio.currentTime = targetTime
    } catch {}
  }

  if (snapshot.status === 'paused') {
    audio.pause()
  } else {
    audio.play().catch((err) => {
      console.warn('[overlay] Audio playback request failed.', err)
    })
  }

  resetPopupTimers(snapshot)
  if (snapshot.sequence !== previousSequence) {
    showPopupFor(popupConfig.value.animation.songStartShowSec)
  }
}

function refreshMusicProgress() {
  const audio = audioRef.value
  const duration = audio && Number.isFinite(audio.duration) && audio.duration > 0
    ? audio.duration
    : (music.value?.song?.durationSec ?? 0)
  const current = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : computeElapsedSec(music.value)
  const pctVal = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0
  musicProgressPct.value = pctVal
}

const shouldShowNowPlaying = computed(() => {
  if (popupConfig.value.hiddenVisual) return false
  return popupVisible.value
})

const popupStyle = computed(() => ({
  transform: `translate(${popupConfig.value.x}px, ${popupConfig.value.y}px)`,
}))

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (Array.isArray(data?.modules)) modules.value = data.modules
    normalizePopupConfig(data?.nowPlayingPopup)
    if (data?.music) syncMusic(data.music)
  }
  source.onerror = (event) => {
    console.warn('[overlay] SSE connection lost, will retry automatically.', event)
  }

  progressTimer = setInterval(refreshMusicProgress, PROGRESS_UPDATE_INTERVAL_MS)
})

onUnmounted(() => {
  source?.close()
  if (progressTimer) clearInterval(progressTimer)
  if (popupHideTimer) clearTimeout(popupHideTimer)
  if (popupEndTimer) clearTimeout(popupEndTimer)
  if (popupPeriodicTimer) clearInterval(popupPeriodicTimer)
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

.now-playing-popup {
  position: absolute;
  left: 2rem;
  bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 320px;
  max-width: 520px;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(2px);
}

.now-playing-cover {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);
}

.now-playing-info {
  flex: 1;
  min-width: 0;
}

.now-playing-title {
  margin: 0;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.now-playing-artist {
  margin: 0.2rem 0 0.45rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.84rem;
}

.now-playing-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.now-playing-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #82b1ff;
  transition: width 0.2s linear;
}

.now-playing-pop-enter-active,
.now-playing-pop-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.now-playing-pop-enter-from,
.now-playing-pop-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
</style>
