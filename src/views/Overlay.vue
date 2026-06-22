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
          <span class="bar-label" :style="textStyle(mod.title, mod.bar)">{{ mod.label }}</span>
          <div class="bar-track" :style="trackStyle(mod.bar)">
            <div class="bar-fill" :style="{ width: pct(mod.count, mod.max), background: brandColor(mod, 'progressBar') }"></div>
          </div>
          <span class="bar-value" :style="textStyle(mod.value, mod.bar)">{{ mod.count }} / {{ mod.max }}</span>
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

        <transition v-else-if="mod.type === 'leaderboard'" name="leaderboard-pop">
          <div
            v-if="!leaderboardVisualHidden[mod.id]"
            class="leaderboard-pop-shell"
            :style="leaderboardShellStyle(mod)"
          >
            <div class="leaderboard-module" :style="leaderboardStyle(mod)">
              <div v-if="brandLeaderboardAppearance(mod).backgroundImage.src" class="leaderboard-background-art">
                <img
                  :src="resolveLeaderboardImageSrc(brandLeaderboardAppearance(mod).backgroundImage.src, mod.id, null, 'background')"
                  alt=""
                  :style="leaderboardArtworkStyle(brandLeaderboardAppearance(mod).backgroundImage)"
                />
              </div>
              <div class="leaderboard-header" :style="leaderboardHeaderStyle(mod)">
                <span>{{ mod.name || 'Leaderboard' }}</span>
              </div>
              <transition-group name="leaderboard-row" tag="div" class="leaderboard-rows">
                <div
                  v-for="row in visibleLeaderboardRows(mod)"
                  :key="`${mod.id}-${row.id}`"
                  class="leaderboard-row"
                  :class="{
                    'leaderboard-row-focus': row.id === mod.focusParticipantId,
                    'leaderboard-row-divider': row.showDivider,
                    'leaderboard-row-no-rank': !brandLeaderboardAppearance(mod).showRankNumbers,
                    'leaderboard-row-with-icon': leaderboardHasIcons(mod),
                  }"
                  :style="leaderboardRowStyle(mod, row)"
                >
                  <div v-if="row.backdropImage?.src" class="leaderboard-row-backdrop">
                    <img :src="resolveLeaderboardImageSrc(row.backdropImage.src, mod.id, row.id, 'backdrop')" alt="" :style="leaderboardArtworkStyle(row.backdropImage)" />
                  </div>
                  <span v-if="brandLeaderboardAppearance(mod).showRankNumbers" class="leaderboard-rank" :style="leaderboardNumberStyle(mod, row)">#{{ row.rank }}</span>
                  <span v-if="leaderboardHasIcons(mod)" class="leaderboard-icon-slot" :style="leaderboardIconSlotStyle(mod)">
                    <img
                      v-if="row.iconSrc"
                      class="leaderboard-participant-icon"
                      :src="resolveLeaderboardImageSrc(row.iconSrc, mod.id, row.id, 'icon')"
                      alt=""
                      :style="leaderboardIconStyle(mod, row)"
                    />
                  </span>
                  <span class="leaderboard-user" :style="leaderboardUsernameStyle(mod, row)">{{ row.username }}</span>
                  <span class="leaderboard-score" :style="leaderboardNumberStyle(mod, row)">{{ formatLeaderboardScore(row.score, mod.scoreType) }}</span>
                </div>
              </transition-group>
            </div>
          </div>
        </transition>

        <div
          v-else-if="mod.type === 'timer'"
          class="timer-module"
          :class="{ 'timer-finished': timerFinished(mod) }"
          :style="timerContainerStyle(mod)"
        >
          <audio
            v-if="mod.onComplete?.playSound && mod.onComplete?.soundSrc"
            ref="timerAudioRefs"
            :data-module-id="mod.id"
            :src="mod.onComplete.soundSrc"
            preload="auto"
          ></audio>
          <div class="timer-time" :style="timerTimeStyle(mod)">{{ timerDisplays[mod.id] ?? '00:00.00' }}</div>
          <div v-if="mod.name" class="timer-label">{{ mod.name }}</div>
        </div>

        <div
          v-else-if="mod.type === 'chat'"
          class="chat-module"
          :style="chatContainerStyle(mod)"
        >
          <div class="chat-messages" :data-module-id="mod.id">
            <transition-group name="chat-message">
              <div
                v-for="msg in (chatMessagesByMod[mod.id] ?? [])"
                :key="msg.id"
                class="chat-message-row"
                :class="chatRowCls(mod)"
              >
                <span class="chat-prefix" v-if="mod.prefix">[{{ mod.prefix }}]</span>
                <span class="chat-badges" v-if="mod.showBadges !== false">
                  <img
                    v-for="(badgeUrl, badgeName, bi) in (msg.badgeUrls ?? {})"
                    :key="bi"
                    class="chat-badge"
                    :src="badgeUrl"
                    :alt="badgeName"
                    :title="badgeName"
                  />
                </span>
                <span class="chat-username" :style="{ color: msg.color || mod.usernameColor }">{{ msg.username }}</span>
                <span class="chat-colon">:</span>
                <span class="chat-message-text" :style="chatTextStyle(mod)">
                  <template v-if="msg.messageParts">
                    <template v-for="(part, pi) in msg.messageParts" :key="pi">
                      <img v-if="part.type === 'emote'" class="chat-emote" :src="part.url" :alt="part.id" :title="part.id" />
                      <span v-else>{{ part.value }}</span>
                    </template>
                  </template>
                  <span v-else>{{ msg.message }}</span>
                  <span class="chat-timestamp" v-if="mod.showTimestamps">{{ formatChatTimestamp(msg.timestamp) }}</span>
                </span>
              </div>
            </transition-group>
          </div>
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
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'

const modules = ref([])
const music = ref(null)
const brand = ref(null)
const audioRef = ref(null)
const chatMessagesByMod = reactive({})
const musicProgressPct = ref(0)
const timerDisplays = reactive({})
const timerAudioRefs = ref([])
const timerFinishedState = reactive({})
const PROGRESS_UPDATE_INTERVAL_MS = 250
const SYNC_TOLERANCE_SEC = 1
const popupConfig = ref({
  x: 0,
  y: 0,
  hiddenVisual: false,
  defaultPlayMusic: true,
  normalizeVolume: false,
  normalizedVolumePct: 100,
  animation: {
    songStartShowSec: 6,
    songEndShowSec: 3,
    periodicIntervalSec: 45,
    periodicShowSec: 4,
    transitionDurationSec: 0.35,
    motionDirection: 'down',
    motionDistancePx: 14,
    motionInterpolation: 'linear',
  },
})
const popupVisible = ref(false)
let progressTimer = null
let popupHideTimer = null
let popupEndTimer = null
let popupPeriodicTimer = null
let source = null
let skipInFlight = false
let overlayTimerInterval = null

// Leaderboard auto-hide state
const leaderboardVisualHidden = reactive({})
const leaderboardHideTimers = {}
const leaderboardPeriodicTimers = {}
const leaderboardLastSignature = {}
const WINDOWS_ABSOLUTE_PATH_RE = /^[a-zA-Z]:[\\/]/ // C:\foo or C:/foo
const UNC_ABSOLUTE_PATH_RE = /^\\\\[^\\]+\\[^\\]+/
const FILE_URL_PREFIX = 'file://'
const LIKELY_POSIX_ABSOLUTE_PREFIXES = ['/home/', '/Users/', '/mnt/', '/var/', '/tmp/', '/opt/', '/srv/', '/etc/', '/usr/', '/private/']

function leaderboardParticipantsSignature(mod) {
  return JSON.stringify((mod?.participants ?? []).map(p => ({ id: p.id, score: p.score })))
}

function showLeaderboard(modId, hideSec) {
  leaderboardVisualHidden[modId] = false
  if (leaderboardHideTimers[modId]) clearTimeout(leaderboardHideTimers[modId])
  if (hideSec > 0) {
    leaderboardHideTimers[modId] = setTimeout(() => { leaderboardVisualHidden[modId] = true }, hideSec * 1000)
  }
}

function clearLeaderboardAutoHideTimers(modId) {
  if (leaderboardHideTimers[modId]) { clearTimeout(leaderboardHideTimers[modId]); delete leaderboardHideTimers[modId] }
  if (leaderboardPeriodicTimers[modId]) { clearInterval(leaderboardPeriodicTimers[modId]); delete leaderboardPeriodicTimers[modId] }
}

function onLeaderboardModuleUpdate(mod) {
  const autoHide = leaderboardAppearance(mod).autoHide
  if (!autoHide.enabled) {
    clearLeaderboardAutoHideTimers(mod.id)
    leaderboardVisualHidden[mod.id] = false
    return
  }

  const sig = leaderboardParticipantsSignature(mod)
  const changed = leaderboardLastSignature[mod.id] !== sig
  leaderboardLastSignature[mod.id] = sig

  if (changed || !(mod.id in leaderboardVisualHidden)) {
    showLeaderboard(mod.id, autoHide.hideDelaySec)
  }

  // Setup periodic timer if not already running
  if (!leaderboardPeriodicTimers[mod.id] && autoHide.periodicIntervalSec > 0 && autoHide.periodicShowSec > 0) {
    leaderboardPeriodicTimers[mod.id] = setInterval(() => {
      if (leaderboardVisualHidden[mod.id]) {
        showLeaderboard(mod.id, autoHide.periodicShowSec)
      }
    }, autoHide.periodicIntervalSec * 1000)
  }
}

function pct(count, maxVal) {
  if (maxVal <= 0) return '0%'
  return `${Math.min(100, Math.max(0, (count / maxVal) * 100))}%`
}

function computeTimerMs(mod) {
  if (!mod) return 0
  const now = Date.now()
  if (mod.targetType === 'datetime' && mod.targetDateTime) {
    const target = new Date(mod.targetDateTime).getTime()
    if (!Number.isFinite(target)) return 0
    return target - now
  }
  if (mod.status === 'stopped') {
    return mod.mode === 'countdown' ? mod.duration : 0
  }
  let elapsed
  if (mod.status === 'running') {
    elapsed = now - mod.startedAt - mod.pausedMsTotal
  } else {
    elapsed = mod.pausedAt - mod.startedAt - mod.pausedMsTotal
  }
  if (mod.mode === 'countdown') {
    const remaining = mod.duration - elapsed
    if (remaining <= 0) {
      if (mod.onComplete?.freezeAtZero) return 0
      return remaining
    }
    return remaining
  }
  if (mod.maxDuration > 0 && elapsed >= mod.maxDuration) {
    if (mod.onComplete?.freezeAtZero) return mod.maxDuration
    return elapsed
  }
  return elapsed
}

function formatTimerValue(ms, precision, maxUnit = 'auto') {
  if (!Number.isFinite(ms)) return '00:00.00'
  const sign = ms < 0 ? '-' : ''
  const abs = Math.abs(ms)

  if (precision === 'minutes') {
    const totalMinutes = Math.round(abs / 60000)

    if (maxUnit === 'minutes' || maxUnit === 'seconds') {
      return `${sign}${totalMinutes}m`
    }

    if (maxUnit === 'hours') {
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const days = Math.floor(totalMinutes / 1440)
    const h = Math.floor((totalMinutes % 1440) / 60)
    const m = totalMinutes % 60
    let result = sign
    if (days > 0) result += `${days}d `
    result += `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return result
  }

  const totalSec = Math.floor(abs / 1000)
  const frac = abs % 1000

  if (maxUnit === 'seconds') {
    let result = sign + String(totalSec)
    if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
    else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
    else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`
    return result
  }

  if (maxUnit === 'minutes') {
    const totalMinutes = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    let result = `${sign}${String(totalMinutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
    else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
    else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`
    return result
  }

  let days, hours, minutes, seconds
  if (maxUnit === 'hours') {
    days = 0
    hours = Math.floor(totalSec / 3600)
    minutes = Math.floor((totalSec % 3600) / 60)
    seconds = totalSec % 60
  } else {
    days = Math.floor(totalSec / 86400)
    hours = Math.floor((totalSec % 86400) / 3600)
    minutes = Math.floor((totalSec % 3600) / 60)
    seconds = totalSec % 60
  }

  let result = sign
  if (days > 0) result += `${days}d `
  result += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
  else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
  else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`

  return result
}

function refreshTimerDisplays() {
  for (const mod of modules.value) {
    if (mod.type === 'timer') {
      const ms = computeTimerMs(mod)
      timerDisplays[mod.id] = formatTimerValue(ms, mod.precision || 'hundredths', mod.maxUnit || 'auto')
    }
  }
}

function timerFinished(mod) {
  if (!mod || mod.type !== 'timer') return false
  if (mod.targetType === 'datetime') {
    if (mod.onComplete?.freezeAtZero) {
      const ms = computeTimerMs(mod)
      return ms <= 0
    }
    return false
  }
  if (mod.mode === 'countdown') {
    if (mod.status === 'stopped') return false
    const elapsed = Date.now() - mod.startedAt - mod.pausedMsTotal
    return elapsed >= mod.duration
  }
  if (mod.mode === 'countup' && mod.maxDuration > 0) {
    const elapsed = Date.now() - mod.startedAt - mod.pausedMsTotal
    return elapsed >= mod.maxDuration
  }
  return false
}

let prevTimerFinished = {}

function checkTimerFinishedSound(modules) {
  if (!Array.isArray(modules)) return
  for (const mod of modules) {
    if (mod.type !== 'timer') continue
    const nowFinished = timerFinished(mod)
    const wasFinished = prevTimerFinished[mod.id]
    if (nowFinished && !wasFinished && mod.onComplete?.playSound && mod.onComplete?.soundSrc) {
      const audios = timerAudioRefs.value
      if (Array.isArray(audios)) {
        const el = audios.find(a => a?.dataset?.moduleId === mod.id)
        if (el) { el.currentTime = 0; el.play().catch(() => {}) }
      }
    }
    prevTimerFinished[mod.id] = nowFinished
  }
}

function timerContainerStyle(mod) {
  const t = mod?.transform ?? {}
  const bg = brandBackground(mod)
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${t.x ?? 0}px, ${t.y ?? 0}px) scale(${t.scaleX ?? 1}, ${t.scaleY ?? 1})`,
    transformOrigin: 'left top',
    opacity: brandOpacity(mod),
    background: bg.backgroundAlpha > 0 ? rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha) : 'rgba(0,0,0,0.7)',
    borderRadius: '8px',
    border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
    padding: '0.6rem 1.2rem',
    textAlign: 'center',
    minWidth: '180px',
    pointerEvents: 'none',
  }
}

function timerTimeStyle(mod) {
  return {
    color: brandColor(mod, 'text'),
    fontSize: `${mod.transform?.fontSize ?? 48}px`,
    fontFamily: '"Courier New", Courier, monospace',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  }
}

function chatContainerStyle(mod) {
  const t = mod?.transform ?? {}
  const bg = brandBackground(mod)
  const fontSize = mod.fontSize ?? 18
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${t.x ?? 0}px, ${t.y ?? 0}px) scale(${t.scaleX ?? 1}, ${t.scaleY ?? 1})`,
    transformOrigin: 'left top',
    opacity: brandOpacity(mod),
    background: bg.backgroundAlpha > 0 ? rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha) : 'rgba(0,0,0,0.6)',
    borderRadius: '8px',
    border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
    padding: '0.5rem 0.8rem',
    minWidth: '300px',
    maxWidth: '600px',
    maxHeight: '400px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column-reverse',
    fontFamily: 'sans-serif',
    fontSize: `${fontSize}px`,
    lineHeight: 1.4,
    pointerEvents: 'none',
  }
}

function formatChatTimestamp(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function chatRowCls(mod) {
  const ml = mod.maxLines
  if (ml === 0) return 'chat-row-nowrap'
  if (ml === -1) return 'chat-row-wrap'
  if (ml > 0) return 'chat-row-clamp'
  return ''
}

function chatTextStyle(mod) {
  const ml = mod.maxLines
  const base = { color: mod.messageColor }
  if (ml > 0) {
    base['overflow'] = 'hidden'
    base['display'] = '-webkit-box'
    base['WebkitBoxOrient'] = 'vertical'
    base['WebkitLineClamp'] = ml
    base['wordBreak'] = 'break-word'
  }
  return base
}

function progressContainerStyle(mod) {
  const t = mod?.transform ?? {}
  const bg = brandBackground(mod)
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${t.x ?? 0}px, ${t.y ?? 0}px)`,
    transformOrigin: 'left top',
    opacity: brandOpacity(mod),
    ...(bg.backgroundAlpha > 0 ? {
      background: rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha),
      borderRadius: '12px',
      border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
    } : {}),
  }
}

function trackStyle(bar) {
  return {
    transform: `translate(${bar?.x ?? 0}px, ${bar?.y ?? 0}px) scale(${bar?.scaleX ?? 1}, ${bar?.scaleY ?? 1})`,
    transformOrigin: 'left top',
  }
}

function textStyle(t, bar = {}) {
  return {
    transform: `translate(${(t?.x ?? 0) + (bar?.x ?? 0)}px, ${(t?.y ?? 0) + (bar?.y ?? 0)}px)`,
    fontSize: `${t?.fontSize ?? 16}px`,
  }
}

function imageStyle(mod) {
  const tr = mod?.transform ?? {}
  const bg = brandBackground(mod)
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${tr.x ?? 0}px, ${tr.y ?? 0}px) scale(${tr.scaleX ?? 1}, ${tr.scaleY ?? 1})`,
    transformOrigin: 'left top',
    opacity: `${brandOpacity(mod)}`,
    maxWidth: 'none',
    pointerEvents: 'none',
    ...(bg.backgroundAlpha > 0 ? {
      background: rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha),
      borderRadius: '12px',
      border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
    } : {}),
  }
}

function textModuleStyle(mod) {
  const tr = mod?.transform ?? {}
  const bg = brandBackground(mod)
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transform: `translate(${tr.x ?? 0}px, ${tr.y ?? 0}px) scale(${tr.scaleX ?? 1}, ${tr.scaleY ?? 1})`,
    transformOrigin: 'left top',
    fontSize: `${tr.fontSize ?? 32}px`,
    color: brandColor(mod, 'text'),
    opacity: brandOpacity(mod),
    whiteSpace: 'pre-wrap',
    textShadow: '0 1px 4px rgba(0,0,0,0.7)',
    ...(bg.backgroundAlpha > 0 ? {
      background: rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha),
      borderRadius: '12px',
      padding: '0.3rem 0.5rem',
      border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
    } : {}),
  }
}

function leaderboardArt(source) {
  const item = source && typeof source === 'object' ? source : {}
  return {
    src: typeof item.src === 'string' ? item.src : '',
    x: typeof item.x === 'number' && Number.isFinite(item.x) ? item.x : 0,
    y: typeof item.y === 'number' && Number.isFinite(item.y) ? item.y : 0,
    scaleX: typeof item.scaleX === 'number' && Number.isFinite(item.scaleX) ? item.scaleX : 1,
    scaleY: typeof item.scaleY === 'number' && Number.isFinite(item.scaleY) ? item.scaleY : 1,
    opacity: typeof item.opacity === 'number' && Number.isFinite(item.opacity) && item.opacity >= 0 && item.opacity <= 1 ? item.opacity : 1,
    blurPx: typeof item.blurPx === 'number' && Number.isFinite(item.blurPx) && item.blurPx >= 0 ? item.blurPx : 0,
    cropTop: typeof item.cropTop === 'number' && Number.isFinite(item.cropTop) && item.cropTop >= 0 ? item.cropTop : 0,
    cropRight: typeof item.cropRight === 'number' && Number.isFinite(item.cropRight) && item.cropRight >= 0 ? item.cropRight : 0,
    cropBottom: typeof item.cropBottom === 'number' && Number.isFinite(item.cropBottom) && item.cropBottom >= 0 ? item.cropBottom : 0,
    cropLeft: typeof item.cropLeft === 'number' && Number.isFinite(item.cropLeft) && item.cropLeft >= 0 ? item.cropLeft : 0,
  }
}

function leaderboardTextOutline(source) {
  const item = source && typeof source === 'object' ? source : {}
  return {
    sizePx: typeof item.sizePx === 'number' && Number.isFinite(item.sizePx) && item.sizePx >= 0 ? item.sizePx : 0,
    color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#000000',
  }
}

function leaderboardStyle(mod) {
  const bg = brandBackground(mod)
  return {
    background: bg.backgroundAlpha > 0 ? rgbaFromHex(bg.backgroundColor, bg.backgroundAlpha) : 'transparent',
    border: bg.borderAlpha > 0 ? `1px solid ${rgbaFromHex(bg.borderColor, bg.borderAlpha)}` : 'none',
  }
}

function leaderboardAppearance(mod) {
  const source = mod?.appearance ?? {}
  const usernameColors = source.usernameColors && typeof source.usernameColors === 'object' && !Array.isArray(source.usernameColors)
    ? source.usernameColors
    : {}
  const numberColorKeys = Array.isArray(source.numberColorKeys)
    ? source.numberColorKeys
      .map(item => ({ position: Number(item?.position), color: item?.color }))
      .filter(item => Number.isFinite(item.position) && typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color))
      .sort((a, b) => a.position - b.position)
    : []

  const srcAutoHide = source.autoHide && typeof source.autoHide === 'object' ? source.autoHide : {}
  const autoHide = {
    enabled: srcAutoHide.enabled === true,
    hideDelaySec: typeof srcAutoHide.hideDelaySec === 'number' && srcAutoHide.hideDelaySec >= 0 ? srcAutoHide.hideDelaySec : 30,
    periodicShowSec: typeof srcAutoHide.periodicShowSec === 'number' && srcAutoHide.periodicShowSec >= 0 ? srcAutoHide.periodicShowSec : 5,
    periodicIntervalSec: typeof srcAutoHide.periodicIntervalSec === 'number' && srcAutoHide.periodicIntervalSec >= 0 ? srcAutoHide.periodicIntervalSec : 60,
  }

  return {
    showRankNumbers: source.showRankNumbers !== false,
    textColor: typeof source.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.textColor) ? source.textColor : '#ffffff',
    defaultUsernameColor: typeof source.defaultUsernameColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.defaultUsernameColor) ? source.defaultUsernameColor : '#ffffff',
    usernameColors,
    numberColorMode: source.numberColorMode === 'gradient' ? 'gradient' : 'solid',
    numberColor: typeof source.numberColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.numberColor) ? source.numberColor : '#82b1ff',
    numberColorKeys,
    focusHighlightColor: typeof source.focusHighlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.focusHighlightColor) ? source.focusHighlightColor : '#82b1ff',
    focusHighlightAlpha: Number.isFinite(Number(source.focusHighlightAlpha)) && Number(source.focusHighlightAlpha) >= 0 && Number(source.focusHighlightAlpha) <= 255 ? Math.round(Number(source.focusHighlightAlpha)) : 255,
    bestHighlightColor: typeof source.bestHighlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.bestHighlightColor) ? source.bestHighlightColor : '#ffd700',
    goodHighlightColor: typeof source.goodHighlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.goodHighlightColor) ? source.goodHighlightColor : '#4caf50',
    badHighlightColor: typeof source.badHighlightColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.badHighlightColor) ? source.badHighlightColor : '#f44336',
    backgroundImage: leaderboardArt(source.backgroundImage),
    titleOutline: leaderboardTextOutline(source.titleOutline),
    participantOutline: leaderboardTextOutline(source.participantOutline),
    scoreOutline: leaderboardTextOutline(source.scoreOutline),
    participantIconSizePx: typeof source.participantIconSizePx === 'number' && Number.isFinite(source.participantIconSizePx) && source.participantIconSizePx >= 0 ? source.participantIconSizePx : 24,
    autoHide,
  }
}

function leaderboardArtworkStyle(source) {
  const art = leaderboardArt(source)
  return {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translate(${art.x}px, ${art.y}px) scale(${art.scaleX}, ${art.scaleY})`,
    transformOrigin: 'center center',
    opacity: `${art.opacity}`,
    filter: art.blurPx > 0 ? `blur(${art.blurPx}px)` : 'none',
    clipPath: `inset(${art.cropTop}px ${art.cropRight}px ${art.cropBottom}px ${art.cropLeft}px)`,
    pointerEvents: 'none',
  }
}

function leaderboardShellStyle(mod) {
  const tr = mod?.transform ?? {}
  const anim = brandAnimation(mod)
  const vector = motionVector(anim.motionDirection ?? 'none')
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transformOrigin: 'left top',
    opacity: brandOpacity(mod),
    '--leaderboard-base-x': `${tr.x ?? 0}px`,
    '--leaderboard-base-y': `${tr.y ?? 0}px`,
    '--leaderboard-scale-x': `${tr.scaleX ?? 1}`,
    '--leaderboard-scale-y': `${tr.scaleY ?? 1}`,
    '--leaderboard-motion-x': `${vector.x * (anim.motionDistancePx ?? 14)}px`,
    '--leaderboard-motion-y': `${vector.y * (anim.motionDistancePx ?? 14)}px`,
    '--leaderboard-transition-duration': `${anim.transitionDurationSec ?? 0.35}s`,
    '--leaderboard-motion-ease': interpolationCurve(anim.motionInterpolation ?? 'linear'),
  }
}

function leaderboardHeaderStyle(mod) {
  const appearance = brandLeaderboardAppearance(mod)
  return {
    color: appearance.textColor,
    ...leaderboardOutlineStyle(appearance.titleOutline),
  }
}

function parseHexColor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return null
  const normalized = hex.slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbaFromHex(hex, alpha) {
  const parsed = parseHexColor(hex)
  if (!parsed) return 'transparent'
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${(Math.max(0, Math.min(255, alpha ?? 0)) / 255).toFixed(3)})`
}

function lerpHexColor(a, b, t, fallback = '#82b1ff') {
  const left = parseHexColor(a)
  const right = parseHexColor(b)
  if (!left || !right) return fallback
  const lerp = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${lerp(left.r, right.r)}${lerp(left.g, right.g)}${lerp(left.b, right.b)}`
}

function hasBrandOverride(mod, path) {
  return Array.isArray(mod?.brandOverrides) && mod.brandOverrides.includes(path)
}

function brandBackground(mod) {
  if (!hasBrandOverride(mod, 'background')) return brand.value?.background ?? {}
  return mod?.background ?? {}
}

function brandOpacity(mod) {
  if (!hasBrandOverride(mod, 'opacity')) return brand.value?.opacity ?? 1
  return mod?.opacity ?? 1
}

function brandAnimation(mod) {
  if (!hasBrandOverride(mod, 'animation')) return brand.value?.animation ?? {}
  return mod?.animation ?? {}
}

function brandColor(mod, type) {
  if (!hasBrandOverride(mod, 'color')) {
    const b = brand.value
    if (type === 'text') return b?.textColor ?? '#ffffff'
    return b?.highlightColor ?? '#82b1ff' // progressBar fallback
  }
  return mod?.color ?? '#ffffff'
}

function brandLeaderboardAppearance(mod) {
  const fallback = leaderboardAppearance(mod)
  if (!brand.value) return fallback
  const b = brand.value
  return {
    ...fallback,
    textColor: !hasBrandOverride(mod, 'appearance.textColor') ? b.textColor : fallback.textColor,
    defaultUsernameColor: !hasBrandOverride(mod, 'appearance.defaultUsernameColor') ? b.defaultUsernameColor : fallback.defaultUsernameColor,
    focusHighlightColor: !hasBrandOverride(mod, 'appearance.focusHighlightColor') ? b.highlightColor : fallback.focusHighlightColor,
    bestHighlightColor: !hasBrandOverride(mod, 'appearance.bestHighlightColor') ? b.bestHighlightColor : fallback.bestHighlightColor,
    goodHighlightColor: !hasBrandOverride(mod, 'appearance.goodHighlightColor') ? b.goodHighlightColor : fallback.goodHighlightColor,
    badHighlightColor: !hasBrandOverride(mod, 'appearance.badHighlightColor') ? b.badHighlightColor : fallback.badHighlightColor,
    numberColor: !hasBrandOverride(mod, 'appearance.numberColor') ? b.numberColor : fallback.numberColor,
  }
}

function leaderboardNumberColor(mod, row) {
  const appearance = brandLeaderboardAppearance(mod)
  if (appearance.numberColorMode !== 'gradient') return appearance.numberColor
  const keys = appearance.numberColorKeys
  if (keys.length === 0) return appearance.numberColor
  const value = typeof row?.score === 'number' && Number.isFinite(row.score) ? row.score : 0
  if (value <= keys[0].position) return keys[0].color
  const last = keys[keys.length - 1]
  if (value >= last.position) return last.color
  for (let i = 0; i < keys.length - 1; i += 1) {
    const left = keys[i]
    const right = keys[i + 1]
    if (value >= left.position && value <= right.position) {
      const t = right.position === left.position ? 0 : (value - left.position) / (right.position - left.position)
      return lerpHexColor(left.color, right.color, t, appearance.numberColor)
    }
  }
  return appearance.numberColor
}

function leaderboardRowStyle(mod, row) {
  const appearance = brandLeaderboardAppearance(mod)
  const focus = row.id === mod.focusParticipantId
  if (focus) {
    const color = parseHexColor(appearance.focusHighlightColor)
    if (!color) return { color: appearance.textColor }
    const alpha = appearance.focusHighlightAlpha / 255
    return {
      color: appearance.textColor,
      background: `rgba(${color.r}, ${color.g}, ${color.b}, ${(alpha * 0.2).toFixed(3)})`,
      border: `1px solid rgba(${color.r}, ${color.g}, ${color.b}, ${(alpha * 0.55).toFixed(3)})`,
    }
  }
  const accentKey = row.status === 'best' ? 'bestHighlightColor'
    : row.status === 'ahead' ? 'goodHighlightColor'
    : row.status === 'behind' ? 'badHighlightColor'
    : null
  if (!accentKey) return { color: appearance.textColor }
  const accentColor = parseHexColor(appearance[accentKey])
  if (!accentColor) return { color: appearance.textColor }
  return {
    color: appearance.textColor,
    borderLeft: `3px solid rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.8)`,
    paddingLeft: 'calc(0.5rem - 3px)',
  }
}

function leaderboardUsernameStyle(mod, row) {
  const appearance = brandLeaderboardAppearance(mod)
  return {
    color: appearance.usernameColors[row.id] ?? appearance.defaultUsernameColor,
    ...leaderboardOutlineStyle(appearance.participantOutline),
  }
}

function leaderboardNumberStyle(mod, row) {
  const appearance = brandLeaderboardAppearance(mod)
  return {
    color: leaderboardNumberColor(mod, row),
    ...leaderboardOutlineStyle(appearance.scoreOutline),
  }
}

function leaderboardOutlineStyle(source) {
  const outline = leaderboardTextOutline(source)
  if (!(outline.sizePx > 0)) return {}
  const width = outline.sizePx
  const color = outline.color
  return {
    WebkitTextStroke: `${width}px ${color}`,
    paintOrder: 'stroke fill',
    textShadow: [
      `${width}px 0 ${color}`,
      `${-width}px 0 ${color}`,
      `0 ${width}px ${color}`,
      `0 ${-width}px ${color}`,
      `${width}px ${width}px ${color}`,
      `${width}px ${-width}px ${color}`,
      `${-width}px ${width}px ${color}`,
      `${-width}px ${-width}px ${color}`,
    ].join(', '),
  }
}

function leaderboardHasIcons(mod) {
  return visibleLeaderboardRows(mod).some(row => typeof row.iconSrc === 'string' && row.iconSrc.trim())
}

function leaderboardIconSlotStyle(mod) {
  const size = leaderboardAppearance(mod).participantIconSizePx
  return {
    width: `${size}px`,
    height: `${size}px`,
  }
}

function leaderboardIconStyle(mod, row) {
  const size = leaderboardAppearance(mod).participantIconSizePx
  const iconBlurPx = typeof row?.iconBlurPx === 'number' && Number.isFinite(row.iconBlurPx) && row.iconBlurPx >= 0 ? row.iconBlurPx : 0
  return {
    width: `${size}px`,
    height: `${size}px`,
    filter: iconBlurPx > 0 ? `blur(${iconBlurPx}px)` : 'none',
  }
}

function isAbsoluteFilePath(source) {
  if (source.startsWith(FILE_URL_PREFIX)) return true
  if (WINDOWS_ABSOLUTE_PATH_RE.test(source)) return true
  if (UNC_ABSOLUTE_PATH_RE.test(source)) return true
  return LIKELY_POSIX_ABSOLUTE_PREFIXES.some(prefix => source.startsWith(prefix))
}

function resolveLeaderboardImageSrc(source, moduleId, participantId, kind) {
  if (typeof source !== 'string') return ''
  const normalized = source.trim()
  if (!normalized) return ''
  if (isAbsoluteFilePath(normalized)) {
    const params = new URLSearchParams({
      moduleId: moduleId ?? '',
      kind,
    })
    if (participantId) params.set('participantId', participantId)
    return `/api/local-image?${params.toString()}`
  }
  return normalized
}

function sortedLeaderboardRows(mod) {
  const participants = Array.isArray(mod?.participants) ? mod.participants : []
  return [...participants]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }))
}

function visibleLeaderboardRows(mod) {
  const sorted = sortedLeaderboardRows(mod)
  if (sorted.length === 0) return []
  const topCount = Math.max(1, Math.floor(mod?.topCount ?? 3))
  const neighborCount = Math.max(0, Math.floor(mod?.neighborCount ?? 2))
  const focusRank = sorted.findIndex(participant => participant.id === mod?.focusParticipantId)
  const focusIndex = focusRank >= 0 ? focusRank : 0
  const focusStart = Math.max(0, focusIndex - neighborCount)
  const selectedIndexes = new Set()
  for (let i = 0; i < Math.min(topCount, sorted.length); i += 1) selectedIndexes.add(i)
  for (let i = Math.max(0, focusIndex - neighborCount); i <= Math.min(sorted.length - 1, focusIndex + neighborCount); i += 1) {
    selectedIndexes.add(i)
  }
  const orderedIndexes = [...selectedIndexes].sort((a, b) => a - b)
  const topEnd = Math.min(topCount, sorted.length) - 1
  const dividerIndex = focusStart > topEnd
    ? orderedIndexes.find(index => index >= focusStart)
    : null
  return orderedIndexes.map(index => {
    const participant = sorted[index]
    let status
    if (participant.id === mod?.focusParticipantId) {
      status = 'focus'
    } else if (index < focusIndex) {
      status = participant.rank === 1 ? 'best' : 'ahead'
    } else {
      status = 'behind'
    }
    return {
      ...participant,
      showDivider: dividerIndex != null && index === dividerIndex,
      status,
    }
  })
}

function formatLeaderboardScore(rawScore, scoreType) {
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0
  if (scoreType !== 'time') return Number.isInteger(score) ? String(score) : score.toFixed(3).replace(/\.?0+$/, '')
  const negative = score < 0
  let rest = Math.abs(score)
  const ms = Math.floor(rest % 1000)
  rest = Math.floor(rest / 1000)
  const seconds = rest % 60
  rest = Math.floor(rest / 60)
  const minutes = rest % 60
  rest = Math.floor(rest / 60)
  const hours = rest % 24
  const days = Math.floor(rest / 24)
  let units = []
  if (days > 0) units = [`${days}d`, `${hours}h`, `${minutes}m`]
  else if (hours > 0) units = [`${hours}h`, `${minutes}m`, `${seconds}s`]
  else if (minutes > 0) units = [`${minutes}m`, `${seconds}s`]
  else if (seconds > 0) units = [`${seconds}s`, `${ms}ms`]
  else units = [`${ms}ms`]
  units = units.filter((unit, index) => index === 0 || !unit.startsWith('0'))
  return `${negative ? '-' : ''}${units.join(' ')}`
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
    normalizeVolume: typeof rawConfig?.normalizeVolume === 'boolean' ? rawConfig.normalizeVolume : false,
    normalizedVolumePct: typeof rawConfig?.normalizedVolumePct === 'number' && Number.isFinite(rawConfig.normalizedVolumePct)
      ? Math.max(0, Math.min(100, rawConfig.normalizedVolumePct))
      : 100,
    animation: {
      songStartShowSec: typeof animation.songStartShowSec === 'number' && animation.songStartShowSec >= 0 ? animation.songStartShowSec : 6,
      songEndShowSec: typeof animation.songEndShowSec === 'number' && animation.songEndShowSec >= 0 ? animation.songEndShowSec : 3,
      periodicIntervalSec: typeof animation.periodicIntervalSec === 'number' && animation.periodicIntervalSec >= 0 ? animation.periodicIntervalSec : 45,
      periodicShowSec: typeof animation.periodicShowSec === 'number' && animation.periodicShowSec >= 0 ? animation.periodicShowSec : 4,
      transitionDurationSec: typeof animation.transitionDurationSec === 'number' && animation.transitionDurationSec >= 0 ? animation.transitionDurationSec : 0.35,
      motionDirection: ['none', 'up', 'down', 'left', 'right'].includes(animation.motionDirection) ? animation.motionDirection : 'down',
      motionDistancePx: typeof animation.motionDistancePx === 'number' && animation.motionDistancePx >= 0 ? animation.motionDistancePx : 14,
      motionInterpolation: ['linear', 'quadratic', 'exponential'].includes(animation.motionInterpolation) ? animation.motionInterpolation : 'linear',
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
  const storedDuration = snapshot?.song?.durationSec
  if (typeof storedDuration === 'number' && storedDuration > 0) return storedDuration
  const audio = audioRef.value
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration
  return 0
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
  if (Number.isFinite(targetTime) && Math.abs((audio.currentTime ?? 0) - targetTime) > SYNC_TOLERANCE_SEC) {
    try {
      audio.currentTime = targetTime
    } catch (err) {
      console.warn('[overlay] Failed to sync audio currentTime.', err)
    }
  }

  if (snapshot.status === 'paused') {
    audio.pause()
  } else {
    audio.play().catch((err) => {
      console.warn('[overlay] Audio playback request failed.', err)
    })
  }
  audio.volume = popupConfig.value.normalizeVolume
    ? Math.max(0, Math.min(1, popupConfig.value.normalizedVolumePct / 100))
    : 1

  resetPopupTimers(snapshot)
  if (snapshot.sequence !== previousSequence) {
    showPopupFor(popupConfig.value.animation.songStartShowSec)
  }
}

function refreshMusicProgress() {
  const audio = audioRef.value
  const duration = trackDurationSec(music.value)
  const current = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : computeElapsedSec(music.value)
  const pctVal = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0
  musicProgressPct.value = pctVal
}

async function skipAfterTrackEnded() {
  if (skipInFlight) return
  if (music.value?.status !== 'playing') return
  skipInFlight = true
  try {
    await fetch('/api/music/skip', { method: 'POST' })
  } catch (err) {
    console.warn('[overlay] Failed to advance to next track after audio ended.', err)
  } finally {
    skipInFlight = false
  }
}

const shouldShowNowPlaying = computed(() => {
  if (popupConfig.value.hiddenVisual) return false
  return popupVisible.value
})

function motionVector(direction) {
  if (direction === 'up') return { x: 0, y: -1 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  if (direction === 'right') return { x: 1, y: 0 }
  return { x: 0, y: 0 }
}

function interpolationCurve(kind) {
  if (kind === 'quadratic') return 'cubic-bezier(0.55, 0.085, 0.68, 0.53)'
  if (kind === 'exponential') return 'cubic-bezier(0.95, 0.05, 0.795, 0.035)'
  return 'linear'
}

const popupStyle = computed(() => {
  const direction = popupConfig.value.animation.motionDirection
  const distancePx = popupConfig.value.animation.motionDistancePx
  const vector = motionVector(direction)
  return {
    '--popup-base-x': `${popupConfig.value.x}px`,
    '--popup-base-y': `${popupConfig.value.y}px`,
    '--popup-motion-x': `${vector.x * distancePx}px`,
    '--popup-motion-y': `${vector.y * distancePx}px`,
    '--popup-transition-duration': `${popupConfig.value.animation.transitionDurationSec}s`,
    '--popup-motion-ease': interpolationCurve(popupConfig.value.animation.motionInterpolation),
  }
})

onMounted(() => {
  source = new EventSource('/api/events')
  source.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (Array.isArray(data?.modules)) {
      for (const mod of data.modules) {
        if (mod.type === 'leaderboard') onLeaderboardModuleUpdate(mod)
      }
      modules.value = data.modules
      refreshTimerDisplays()
      checkTimerFinishedSound(data.modules)
    }
    normalizePopupConfig(data?.nowPlayingPopup)
    if (data?.music) syncMusic(data.music)
    if (data?.brand) brand.value = data.brand
    if (data?.chatMessages) {
      for (const [modId, msgs] of Object.entries(data.chatMessages)) {
        chatMessagesByMod[modId] = msgs
      }
    }
  }
  source.onerror = (event) => {
    console.warn('[overlay] SSE connection lost, will retry automatically.', event)
  }

  progressTimer = setInterval(refreshMusicProgress, PROGRESS_UPDATE_INTERVAL_MS)
  audioRef.value?.addEventListener('ended', skipAfterTrackEnded)

  // Timer update interval
  refreshTimerDisplays()
  overlayTimerInterval = setInterval(() => {
    refreshTimerDisplays()
    checkTimerFinishedSound(modules.value)
  }, 53)
})

onUnmounted(() => {
  source?.close()
  audioRef.value?.removeEventListener('ended', skipAfterTrackEnded)
  if (progressTimer) clearInterval(progressTimer)
  if (popupHideTimer) clearTimeout(popupHideTimer)
  if (popupEndTimer) clearTimeout(popupEndTimer)
  if (popupPeriodicTimer) clearInterval(popupPeriodicTimer)
  if (overlayTimerInterval) clearInterval(overlayTimerInterval)
  for (const modId of Object.keys(leaderboardHideTimers)) clearTimeout(leaderboardHideTimers[modId])
  for (const modId of Object.keys(leaderboardPeriodicTimers)) clearInterval(leaderboardPeriodicTimers[modId])
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

.leaderboard-module {
  position: relative;
  min-width: 280px;
  max-width: 420px;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  backdrop-filter: blur(2px);
  color: #ffffff;
  pointer-events: none;
  overflow: hidden;
}

.leaderboard-pop-shell {
  transform: translate(var(--leaderboard-base-x, 0px), var(--leaderboard-base-y, 0px))
    scale(var(--leaderboard-scale-x, 1), var(--leaderboard-scale-y, 1));
}

.leaderboard-background-art {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

.leaderboard-module > :not(.leaderboard-background-art) {
  position: relative;
  z-index: 1;
}

.leaderboard-header {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.86);
  margin-bottom: 0.4rem;
}

.leaderboard-rows {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.leaderboard-row {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.2rem 0.4rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.leaderboard-row-no-rank {
  grid-template-columns: 1fr auto;
}

.leaderboard-row-with-icon {
  grid-template-columns: auto auto 1fr auto;
}

.leaderboard-row-with-icon.leaderboard-row-no-rank {
  grid-template-columns: auto 1fr auto;
}

.leaderboard-row-focus {
}

.leaderboard-row-divider {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  margin-top: 0.35rem;
  padding-top: 0.45rem;
}

.leaderboard-rank {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.82rem;
}

.leaderboard-row-backdrop {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

.leaderboard-row > :not(.leaderboard-row-backdrop) {
  position: relative;
  z-index: 1;
}

.leaderboard-icon-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.leaderboard-participant-icon {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
}

.leaderboard-user {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leaderboard-score {
  font-weight: 700;
  color: #82b1ff;
  font-variant-numeric: tabular-nums;
}

.leaderboard-row-move,
.leaderboard-row-enter-active,
.leaderboard-row-leave-active {
  transition: all 0.35s ease;
}

.leaderboard-row-enter-from,
.leaderboard-row-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.leaderboard-pop-enter-active,
.leaderboard-pop-leave-active {
  transition:
    opacity var(--leaderboard-transition-duration, 0.35s) var(--leaderboard-motion-ease, linear),
    transform var(--leaderboard-transition-duration, 0.35s) var(--leaderboard-motion-ease, linear);
}

.leaderboard-pop-enter-from,
.leaderboard-pop-leave-to {
  opacity: 0;
  transform: translate(
      calc(var(--leaderboard-base-x, 0px) + var(--leaderboard-motion-x, 0px)),
      calc(var(--leaderboard-base-y, 0px) + var(--leaderboard-motion-y, 0px))
    )
    scale(var(--leaderboard-scale-x, 1), var(--leaderboard-scale-y, 1));
}

.now-playing-popup {
  position: absolute;
  left: 2rem;
  bottom: 2rem;
  transform: translate(var(--popup-base-x, 0px), var(--popup-base-y, 0px));
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
  transition:
    opacity var(--popup-transition-duration, 0.35s) var(--popup-motion-ease, linear),
    transform var(--popup-transition-duration, 0.35s) var(--popup-motion-ease, linear);
}

.now-playing-pop-enter-from,
.now-playing-pop-leave-to {
  opacity: 0;
  transform: translate(
    calc(var(--popup-base-x, 0px) + var(--popup-motion-x, 0px)),
    calc(var(--popup-base-y, 0px) + var(--popup-motion-y, 0px))
  );
}

.timer-module {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.timer-module.timer-finished {
  animation: timerPulse 1s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.timer-time {
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.timer-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  margin-top: 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  overflow: hidden;
}

.chat-message-row {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.chat-row-nowrap {
  white-space: nowrap;
}

.chat-row-wrap {
  white-space: normal;
}

.chat-row-clamp {
  white-space: normal;
  overflow: hidden;
}

.chat-prefix {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8em;
  font-weight: 600;
  margin-right: 0.15rem;
}

.chat-badges {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-right: 0.15rem;
}

.chat-badge {
  width: 1.3em;
  height: 1.3em;
  display: inline-block;
  vertical-align: middle;
}

.chat-username {
  font-weight: 700;
}

.chat-colon {
  color: rgba(255, 255, 255, 0.5);
  margin-right: 0.15rem;
}

.chat-message-text {
  min-width: 0;
}

.chat-timestamp {
  font-size: 0.75em;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 0.4rem;
}

.chat-emote {
  display: inline-block;
  width: 1.5em;
  height: 1.5em;
  vertical-align: middle;
}

.chat-message-enter-active,
.chat-message-leave-active {
  transition: all 0.5s ease;
}

.chat-message-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.chat-message-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.chat-message-move {
  transition: transform 0.5s ease;
}
</style>
