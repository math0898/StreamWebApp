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

        <transition v-else-if="mod.type === 'leaderboard'" name="leaderboard-pop">
          <div
            v-if="!leaderboardVisualHidden[mod.id]"
            class="leaderboard-pop-shell"
            :style="leaderboardShellStyle(mod)"
          >
            <div class="leaderboard-module" :style="leaderboardStyle(mod)">
              <div v-if="leaderboardAppearance(mod).backgroundImage.src" class="leaderboard-background-art">
                <img
                  :src="resolveLeaderboardImageSrc(leaderboardAppearance(mod).backgroundImage.src, mod.id, null, 'background')"
                  alt=""
                  :style="leaderboardArtworkStyle(leaderboardAppearance(mod).backgroundImage)"
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
                    'leaderboard-row-no-rank': !leaderboardAppearance(mod).showRankNumbers,
                    'leaderboard-row-with-icon': leaderboardHasIcons(mod),
                  }"
                  :style="leaderboardRowStyle(mod, row)"
                >
                  <div v-if="row.backdropImage?.src" class="leaderboard-row-backdrop">
                    <img :src="resolveLeaderboardImageSrc(row.backdropImage.src, mod.id, row.id, 'backdrop')" alt="" :style="leaderboardArtworkStyle(row.backdropImage)" />
                  </div>
                  <span v-if="leaderboardAppearance(mod).showRankNumbers" class="leaderboard-rank" :style="leaderboardNumberStyle(mod, row)">#{{ row.rank }}</span>
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
const audioRef = ref(null)
const musicProgressPct = ref(0)
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
  const appearance = leaderboardAppearance(mod)
  const bg = parseHexColor(appearance.backgroundColor)
  const br = parseHexColor(appearance.borderColor)
  const bgAlpha = (appearance.backgroundAlpha / 255).toFixed(3)
  const brAlpha = (appearance.borderAlpha / 255).toFixed(3)
  return {
    background: bg ? `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${bgAlpha})` : 'transparent',
    border: br ? `1px solid rgba(${br.r}, ${br.g}, ${br.b}, ${brAlpha})` : 'none',
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
  const srcAnimation = srcAutoHide.animation && typeof srcAutoHide.animation === 'object' ? srcAutoHide.animation : {}
  const autoHide = {
    enabled: srcAutoHide.enabled === true,
    hideDelaySec: typeof srcAutoHide.hideDelaySec === 'number' && srcAutoHide.hideDelaySec >= 0 ? srcAutoHide.hideDelaySec : 30,
    periodicShowSec: typeof srcAutoHide.periodicShowSec === 'number' && srcAutoHide.periodicShowSec >= 0 ? srcAutoHide.periodicShowSec : 5,
    periodicIntervalSec: typeof srcAutoHide.periodicIntervalSec === 'number' && srcAutoHide.periodicIntervalSec >= 0 ? srcAutoHide.periodicIntervalSec : 60,
    animation: {
      transitionDurationSec: typeof srcAnimation.transitionDurationSec === 'number' && srcAnimation.transitionDurationSec >= 0
        ? srcAnimation.transitionDurationSec
        : 0.35,
      motionDirection: ['none', 'up', 'down', 'left', 'right'].includes(srcAnimation.motionDirection)
        ? srcAnimation.motionDirection
        : 'down',
      motionDistancePx: typeof srcAnimation.motionDistancePx === 'number' && srcAnimation.motionDistancePx >= 0
        ? srcAnimation.motionDistancePx
        : 14,
      motionInterpolation: ['linear', 'quadratic', 'exponential'].includes(srcAnimation.motionInterpolation)
        ? srcAnimation.motionInterpolation
        : 'linear',
    },
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
    backgroundColor: typeof source.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.backgroundColor) ? source.backgroundColor : '#000000',
    backgroundAlpha: Number.isFinite(Number(source.backgroundAlpha)) && Number(source.backgroundAlpha) >= 0 && Number(source.backgroundAlpha) <= 255 ? Math.round(Number(source.backgroundAlpha)) : 199,
    borderColor: typeof source.borderColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.borderColor) ? source.borderColor : '#ffffff',
    borderAlpha: Number.isFinite(Number(source.borderAlpha)) && Number(source.borderAlpha) >= 0 && Number(source.borderAlpha) <= 255 ? Math.round(Number(source.borderAlpha)) : 36,
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
  const animation = leaderboardAppearance(mod).autoHide.animation
  const vector = motionVector(animation.motionDirection)
  return {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transformOrigin: 'left top',
    '--leaderboard-base-x': `${tr.x ?? 0}px`,
    '--leaderboard-base-y': `${tr.y ?? 0}px`,
    '--leaderboard-scale-x': `${tr.scaleX ?? 1}`,
    '--leaderboard-scale-y': `${tr.scaleY ?? 1}`,
    '--leaderboard-motion-x': `${vector.x * animation.motionDistancePx}px`,
    '--leaderboard-motion-y': `${vector.y * animation.motionDistancePx}px`,
    '--leaderboard-transition-duration': `${animation.transitionDurationSec}s`,
    '--leaderboard-motion-ease': interpolationCurve(animation.motionInterpolation),
  }
}

function leaderboardHeaderStyle(mod) {
  const appearance = leaderboardAppearance(mod)
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

function lerpHexColor(a, b, t, fallback = '#82b1ff') {
  const left = parseHexColor(a)
  const right = parseHexColor(b)
  if (!left || !right) return fallback
  const lerp = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${lerp(left.r, right.r)}${lerp(left.g, right.g)}${lerp(left.b, right.b)}`
}

function leaderboardNumberColor(mod, row) {
  const appearance = leaderboardAppearance(mod)
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
  const appearance = leaderboardAppearance(mod)
  const focus = row.id === mod.focusParticipantId
  if (!focus) return { color: appearance.textColor }
  const color = parseHexColor(appearance.focusHighlightColor)
  if (!color) return { color: appearance.textColor }
  const alpha = appearance.focusHighlightAlpha / 255
  return {
    color: appearance.textColor,
    background: `rgba(${color.r}, ${color.g}, ${color.b}, ${(alpha * 0.2).toFixed(3)})`,
    border: `1px solid rgba(${color.r}, ${color.g}, ${color.b}, ${(alpha * 0.55).toFixed(3)})`,
  }
}

function leaderboardUsernameStyle(mod, row) {
  const appearance = leaderboardAppearance(mod)
  return {
    color: appearance.usernameColors[row.id] ?? appearance.defaultUsernameColor,
    ...leaderboardOutlineStyle(appearance.participantOutline),
  }
}

function leaderboardNumberStyle(mod, row) {
  const appearance = leaderboardAppearance(mod)
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
  return orderedIndexes.map(index => ({
    ...sorted[index],
    showDivider: dividerIndex != null && index === dividerIndex,
  }))
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
    }
    normalizePopupConfig(data?.nowPlayingPopup)
    if (data?.music) syncMusic(data.music)
  }
  source.onerror = (event) => {
    console.warn('[overlay] SSE connection lost, will retry automatically.', event)
  }

  progressTimer = setInterval(refreshMusicProgress, PROGRESS_UPDATE_INTERVAL_MS)
  audioRef.value?.addEventListener('ended', skipAfterTrackEnded)
})

onUnmounted(() => {
  source?.close()
  audioRef.value?.removeEventListener('ended', skipAfterTrackEnded)
  if (progressTimer) clearInterval(progressTimer)
  if (popupHideTimer) clearTimeout(popupHideTimer)
  if (popupEndTimer) clearTimeout(popupEndTimer)
  if (popupPeriodicTimer) clearInterval(popupPeriodicTimer)
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
</style>
