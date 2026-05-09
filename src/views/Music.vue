<template>
  <div class="music-page">
    <h1>Music</h1>

    <section class="panel">
      <div class="panel-header">
        <h2>Now Playing</h2>
        <button class="action-btn" @click="reloadLibrary" :disabled="reloading">
          {{ reloading ? 'Reloading…' : 'Reload Library' }}
        </button>
      </div>
      <p class="muted"><strong>Track:</strong> {{ music.song?.title ?? 'Unknown Song' }}</p>
      <p class="muted"><strong>Artist:</strong> {{ music.song?.artist ?? 'Unknown Artist' }}</p>
      <p class="muted"><strong>Album:</strong> {{ music.song?.album ?? 'Unknown Album' }}</p>
      <p class="muted"><strong>Status:</strong> {{ music.status ?? 'unknown' }}</p>
      <div class="playback-controls">
        <button class="action-btn" :disabled="music.status !== 'playing'" @click="pauseMusicPage">⏸ Pause</button>
        <button class="action-btn" :disabled="music.status !== 'paused'" @click="resumeMusicPage">▶ Resume</button>
      </div>
    </section>

    <section class="panel">
      <h2>Import Music</h2>
      <form class="import-form" @submit.prevent="importMusic">
        <label class="field">
          <span>Artist</span>
          <input v-model="form.artist" type="text" required />
        </label>

        <label class="field">
          <span>Album</span>
          <input v-model="form.album" type="text" required />
        </label>

        <label class="field">
          <span>Track Name</span>
          <input v-model="form.trackName" type="text" required />
        </label>

        <label class="field">
          <span>Track File (.mp3/.ogg/.wav)</span>
          <input ref="trackFileInput" type="file" accept=".mp3,.ogg,.wav,audio/*" @change="onTrackFileChange" required />
        </label>

        <label class="field">
          <span>Cover Image (.jpg/.jpeg/.png/.webp)</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" @change="onCoverFileChange" required />
        </label>

        <button class="action-btn" type="submit" :disabled="importing || !form.trackFile || !form.coverFile">
          {{ importing ? 'Importing…' : 'Import Track' }}
        </button>
      </form>
      <p v-if="formMessage" class="muted">{{ formMessage }}</p>
    </section>

    <section class="panel">
      <h2>Loaded Tracks</h2>
      <p class="muted" v-if="tracks.length === 0">No tracks loaded.</p>
      <div class="track-grid">
        <article v-for="track in tracks" :key="track.id" class="track-card">
          <img :src="track.coverPath" :alt="`Album art for ${track.title} by ${track.artist ?? 'Unknown Artist'}`" class="cover" />
          <div class="track-info metadata-track">
            <p class="track-title">{{ track.title }}</p>
            <p class="muted small">{{ track.artist }}</p>
            <p class="muted small">{{ track.album }}</p>
            <div class="track-action-row">
              <button
                class="action-btn preview-btn"
                :aria-label="previewingTrackId === track.id ? 'Pause preview' : 'Play preview'"
                @click="previewTrack(track)"
              >{{ previewingTrackId === track.id ? '⏸' : '▶' }}</button>
              <button class="action-btn play-btn" @click="playTrack(track.id)">Set Now Playing</button>
            </div>
            <label class="preview-seek-row">
              <span class="muted small">
                {{ formatPreviewTime(previewPositionForTrack(track.id)) }} / {{ formatPreviewTime(previewDurationForTrack(track)) }}
              </span>
              <input
                type="range"
                min="0"
                :max="previewSeekMax(track)"
                step="0.1"
                :value="previewPositionForTrack(track.id)"
                :disabled="previewingTrackId !== track.id"
                @input="seekPreview(track.id, Number($event.target.value))"
              />
            </label>
            <div class="attr-editor">
              <label class="attr-row">
                <span>Liked ({{ trackDraftValue(track.id, likedAttributeId).toFixed(2) }})</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  :value="trackDraftValue(track.id, likedAttributeId)"
                  @input="setTrackDraftValue(track.id, likedAttributeId, Number($event.target.value))"
                />
              </label>
              <label v-for="definition in customAttributeDefinitions" :key="definition.id" class="attr-row">
                <span>{{ definition.name }} ({{ trackDraftValue(track.id, definition.id).toFixed(2) }})</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="trackDraftValue(track.id, definition.id)"
                  @input="setTrackDraftValue(track.id, definition.id, Number($event.target.value))"
                />
              </label>
            </div>
            <div class="styles-editor">
              <p class="muted small">Styles</p>
              <div class="style-list">
                <label
                  v-for="style in styleOptionsForTrack(track.id)"
                  :key="`${track.id}-${style}`"
                  class="style-chip"
                >
                  <input
                    type="checkbox"
                    :checked="trackDraftHasStyle(track.id, style)"
                    @change="toggleTrackStyle(track.id, style, $event.target.checked)"
                  />
                  <span>{{ style }}</span>
                </label>
              </div>
              <div class="custom-style-row">
                <input
                  v-model="trackStyleDrafts[track.id]"
                  type="text"
                  placeholder="Add custom style"
                  @keydown.enter.prevent="addCustomTrackStyle(track.id)"
                />
                <button class="action-btn" @click="addCustomTrackStyle(track.id)">Add</button>
              </div>
            </div>
            <button class="action-btn" :disabled="savingTrackId === track.id" @click="saveTrackMeta(track.id)">
              {{ savingTrackId === track.id ? 'Saving…' : 'Save Track Metadata' }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Track Attributes</h2>
        <button class="action-btn" :disabled="savingAttributes" @click="saveAttributes">
          {{ savingAttributes ? 'Saving…' : 'Save Attributes' }}
        </button>
      </div>
      <p class="muted small">Liked is always present and decays toward 0 over time. Custom attributes are 0-1 sliders.</p>
      <div class="attribute-list">
        <div class="attribute-row fixed">
          <span class="attribute-label">Liked</span>
          <span class="muted small">Range -1 to 1</span>
        </div>
        <div v-for="(attribute, idx) in editableCustomAttributes" :key="attribute.id" class="attribute-row">
          <input v-model="editableCustomAttributes[idx].name" type="text" />
          <button class="action-btn" @click="removeCustomAttribute(attribute.id)">Remove</button>
        </div>
      </div>
      <div class="custom-style-row">
        <input
          v-model="newAttributeName"
          type="text"
          placeholder="New attribute name"
          @keydown.enter.prevent="addCustomAttribute"
        />
        <button class="action-btn" @click="addCustomAttribute">Add Attribute</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Overlay Album Rules</h2>
        <button class="action-btn" @click="saveOverlayRules" :disabled="savingRules || !selectedOverlayId">
          {{ savingRules ? 'Saving…' : 'Save Rules' }}
        </button>
      </div>
      <p class="muted">Active Overlay: <strong>{{ activeOverlayName }}</strong></p>
      <label class="field">
        <span>Edit Rules For Overlay</span>
        <select v-model="selectedOverlayId">
          <option v-for="overlay in overlays" :key="overlay.id" :value="overlay.id">{{ overlay.name }}</option>
        </select>
      </label>
      <p class="muted small">
        Whitelist: only listed albums can play on this overlay. Blacklist: listed albums cannot play on this overlay.
        Unique: listed albums are reserved for this overlay and removed from other overlays.
      </p>
      <p class="muted" v-if="albumNames.length === 0">No albums found in the loaded music library.</p>
      <div v-else class="rules-grid">
        <div class="rules-head album-col">Album</div>
        <div class="rules-head">Whitelist</div>
        <div class="rules-head">Blacklist</div>
        <div class="rules-head">Unique</div>
        <template v-for="album in albumNames" :key="album">
          <div class="rules-cell album-col">{{ album }}</div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('whitelistAlbums', album)"
              @change="toggleRule('whitelistAlbums', album, $event.target.checked)"
            />
          </div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('blacklistAlbums', album)"
              @change="toggleRule('blacklistAlbums', album, $event.target.checked)"
            />
          </div>
          <div class="rules-cell">
            <input
              type="checkbox"
              :checked="ruleHas('uniqueAlbums', album)"
              @change="toggleRule('uniqueAlbums', album, $event.target.checked)"
            />
          </div>
        </template>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>DJ Simulator</h2>
        <button class="action-btn" @click="runDjSimulation" :disabled="simLoading">
          {{ simLoading ? 'Running…' : 'Run Simulation' }}
        </button>
      </div>
      <p v-if="!simResult && !simLoading" class="muted small">Click "Run Simulation" to analyse the DJ selection algorithm against the current library.</p>
      <p v-if="simError" class="muted">{{ simError }}</p>

      <div v-if="simResult">
        <!-- ── Mood vs Target ─────────────────────────────────────────── -->
        <div class="sim-block">
          <p class="sim-block-title">Current Mood vs Target</p>
          <p v-if="!simResult.hasDj" class="muted small">No DJ module is active on the current overlay. Add a DJ module on the Dashboard to enable the scoring algorithm.</p>
          <p v-if="simResult.customAttrIds.length === 0" class="muted small">No custom attributes defined. Add attributes to use the DJ scoring algorithm.</p>
          <table v-else class="sim-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Current Mood</th>
                <th>Target</th>
                <th class="sim-override-col">Override Target</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="attrId in simResult.customAttrIds" :key="attrId">
                <td>{{ simAttrName(attrId) }}</td>
                <td>{{ fmtN(simResult.moodVector[attrId] ?? 0.5) }}</td>
                <td>{{ fmtN(simResult.effectiveTargetAttributes[attrId] ?? 0.5) }}</td>
                <td class="sim-override-col">
                  <div class="sim-slider-row">
                    <input
                      type="range" min="0" max="1" step="0.01"
                      :value="simOverrides[attrId] ?? simResult.effectiveTargetAttributes[attrId] ?? 0.5"
                      @input="simOverrides[attrId] = Number($event.target.value)"
                    />
                    <span>{{ fmtN(simOverrides[attrId] ?? simResult.effectiveTargetAttributes[attrId] ?? 0.5) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="simResult.customAttrIds.length > 0" class="playback-controls">
            <button class="action-btn" @click="runDjSimulation" :disabled="simLoading">Re-run with Overrides</button>
            <button class="action-btn" @click="resetSimOverrides">Reset</button>
          </div>
          <p class="muted small" style="margin-top:0.4rem;">
            Mood window: last {{ simResult.djConfig.moodWindow }} tracks ·
            Liked bonus: {{ simResult.djConfig.likedBonus }} ·
            Style penalty: {{ simResult.djConfig.stylePenalty }} ·
            Variance: {{ simResult.djConfig.variance }}
          </p>
        </div>

        <!-- ── Candidate Scores ───────────────────────────────────────── -->
        <div class="sim-block">
          <p class="sim-block-title">Candidate Scores — {{ simResult.candidates.length }} track(s), sorted by final score (lower = more likely to be selected)</p>
          <p class="muted small">DistA = mood distance + style penalty A + liked adj. · DistB = target distance + style penalty B · Score = (DistA + DistB) / 2</p>
          <div class="sim-table-scroll">
            <table class="sim-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Artist</th>
                  <th v-for="attrId in simResult.customAttrIds" :key="`m-${attrId}`" class="sim-num">Δ{{ simAttrName(attrId) }}</th>
                  <th class="sim-num">Style A</th>
                  <th class="sim-num">Liked Adj</th>
                  <th class="sim-num">DistA</th>
                  <th v-for="attrId in simResult.customAttrIds" :key="`t-${attrId}`" class="sim-num">Δ{{ simAttrName(attrId) }}(tgt)</th>
                  <th class="sim-num">Style B</th>
                  <th class="sim-num">DistB</th>
                  <th class="sim-num sim-score-col">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in simResult.candidates"
                  :key="c.id"
                  :class="{ 'sim-current-row': c.isCurrentTrack }"
                >
                  <td class="sim-title">{{ c.title }}</td>
                  <td class="sim-artist">{{ c.artist }}</td>
                  <td v-for="attrId in simResult.customAttrIds" :key="`m-${attrId}`" class="sim-num">{{ fmtN(c.moodAttrDistances[attrId] ?? 0) }}</td>
                  <td class="sim-num">{{ fmtN(c.stylePenaltyA) }}</td>
                  <td class="sim-num">{{ fmtN(c.likedAdjustment) }}</td>
                  <td class="sim-num sim-dist-a">{{ fmtN(c.distanceA) }}</td>
                  <td v-for="attrId in simResult.customAttrIds" :key="`t-${attrId}`" class="sim-num">{{ fmtN(c.targetAttrDistances[attrId] ?? 0) }}</td>
                  <td class="sim-num">{{ fmtN(c.stylePenaltyB) }}</td>
                  <td class="sim-num sim-dist-b">{{ fmtN(c.distanceB) }}</td>
                  <td class="sim-num sim-score-col">{{ fmtN(c.finalScore) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Recently Played Graph ──────────────────────────────────── -->
        <div class="sim-block">
          <p class="sim-block-title">Recently Played Graph — {{ simResult.recentlyPlayedTracks.length }} track(s)</p>
          <p v-if="simResult.recentlyPlayedTracks.length === 0" class="muted small">No recently played history. Play some tracks first.</p>
          <p v-if="simResult.customAttrIds.length >= 2" class="muted small">
            X axis: {{ simAttrName(simResult.customAttrIds[0]) }} · Y axis: {{ simAttrName(simResult.customAttrIds[1]) }}
          </p>
          <p v-else-if="simResult.customAttrIds.length === 1" class="muted small">
            X axis: {{ simAttrName(simResult.customAttrIds[0]) }} · Y axis: play order
          </p>
          <p v-else class="muted small">No custom attributes — tracks laid out by play order.</p>

          <svg
            v-if="simResult.recentlyPlayedTracks.length > 0"
            class="sim-graph"
            viewBox="0 0 620 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- axis lines -->
            <line x1="58" y1="10" x2="58" y2="268" stroke="#333" stroke-width="1"/>
            <line x1="58" y1="268" x2="610" y2="268" stroke="#333" stroke-width="1"/>
            <!-- axis tick labels -->
            <text x="58" y="282" fill="#666" font-size="10" text-anchor="middle">0</text>
            <text x="610" y="282" fill="#666" font-size="10" text-anchor="middle">1</text>
            <text x="46" y="272" fill="#666" font-size="10" text-anchor="end">0</text>
            <text x="46" y="14" fill="#666" font-size="10" text-anchor="end">1</text>

            <!-- edges: connect consecutive plays -->
            <line
              v-for="(edge, idx) in simGraphEdges"
              :key="`e-${idx}`"
              :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2"
              stroke="#3a3a3a" stroke-width="1.5"
            />

            <!-- nodes -->
            <g v-for="(node, idx) in simGraphNodes" :key="`n-${idx}`">
              <circle
                :cx="node.x" :cy="node.y" r="7"
                :fill="node.isNewest ? '#82b1ff' : '#2a2a2a'"
                :stroke="node.isOldest ? '#555' : '#82b1ff'"
                stroke-width="1.5"
              />
              <text
                :x="node.x" :y="node.y - 10"
                fill="#bdbdbd" font-size="8" text-anchor="middle"
              >{{ node.label }}</text>
              <title>{{ node.title }} — {{ node.artist }}</title>
            </g>

            <!-- current mood marker (diamond) -->
            <g v-if="simGraphMood">
              <polygon
                :points="simGraphMood.points"
                fill="#ffd54f" stroke="#ffd54f" stroke-width="1" opacity="0.9"
              />
              <text :x="simGraphMood.x" :y="simGraphMood.y - 12" fill="#ffd54f" font-size="8" text-anchor="middle">mood</text>
            </g>

            <!-- target marker (cross/×) -->
            <g v-if="simGraphTarget">
              <line :x1="simGraphTarget.x - 6" :y1="simGraphTarget.y - 6" :x2="simGraphTarget.x + 6" :y2="simGraphTarget.y + 6" stroke="#ef5350" stroke-width="2"/>
              <line :x1="simGraphTarget.x + 6" :y1="simGraphTarget.y - 6" :x2="simGraphTarget.x - 6" :y2="simGraphTarget.y + 6" stroke="#ef5350" stroke-width="2"/>
              <text :x="simGraphTarget.x" :y="simGraphTarget.y - 10" fill="#ef5350" font-size="8" text-anchor="middle">target</text>
            </g>

            <!-- legend -->
            <circle cx="70" cy="305" r="5" fill="#82b1ff" stroke="#82b1ff" stroke-width="1.5"/>
            <text x="80" y="309" fill="#9e9e9e" font-size="9">newest</text>
            <circle cx="120" cy="305" r="5" fill="#2a2a2a" stroke="#82b1ff" stroke-width="1.5"/>
            <text x="130" y="309" fill="#9e9e9e" font-size="9">older</text>
            <polygon points="162,305 169,299 176,305 169,311" fill="#ffd54f"/>
            <text x="181" y="309" fill="#9e9e9e" font-size="9">mood</text>
            <line x1="218" y1="301" x2="228" y2="309" stroke="#ef5350" stroke-width="2"/>
            <line x1="228" y1="301" x2="218" y2="309" stroke="#ef5350" stroke-width="2"/>
            <text x="234" y="309" fill="#9e9e9e" font-size="9">target</text>
          </svg>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Debug Messages</h2>
      <div class="debug-box">
        <p v-for="(line, idx) in debugMessagesReversed" :key="`${idx}-${line}`" class="debug-line">{{ line }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const trackFileInput = ref(null)

const music = reactive({
  song: null,
  status: '',
})
const tracks = ref([])
const debugMessages = ref([])
const overlays = ref([])
const activeOverlayId = ref('')
const selectedOverlayId = ref('')
const overlayAlbumRules = ref({})
const attributeDefinitions = ref([])
const styleOptions = ref([])
const editableCustomAttributes = ref([])
const trackMetaDrafts = ref({})
const trackStyleDrafts = reactive({})
const reloading = ref(false)
const importing = ref(false)
const savingRules = ref(false)
const savingAttributes = ref(false)
const savingTrackId = ref('')
const formMessage = ref('')
const newAttributeName = ref('')
let trackDurationProbeToken = 0

// ── Client-side track preview ──────────────────────────────────────────────
// A single shared Audio element is reused across all track previews.
// Only one track plays at a time; clicking another track's play button stops
// the current one and starts the new one.
let previewAudio = null
const previewingTrackId = ref(null)
const previewPositionSec = ref(0)
const previewDurationSec = ref(0)

function getOrCreateAudio() {
  if (!previewAudio) {
    previewAudio = new Audio()
    previewAudio.ontimeupdate = () => {
      previewPositionSec.value = Number.isFinite(previewAudio.currentTime) ? previewAudio.currentTime : 0
    }
    previewAudio.onloadedmetadata = () => {
      previewDurationSec.value = Number.isFinite(previewAudio.duration) && previewAudio.duration > 0
        ? previewAudio.duration
        : 0
    }
    previewAudio.ondurationchange = () => {
      previewDurationSec.value = Number.isFinite(previewAudio.duration) && previewAudio.duration > 0
        ? previewAudio.duration
        : 0
    }
  }
  return previewAudio
}

function previewTrack(track) {
  const audio = getOrCreateAudio()
  if (previewingTrackId.value === track.id && !audio.paused) {
    // Clicking the same track while it's playing → pause it.
    audio.pause()
    previewingTrackId.value = null
    return
  }
  if (previewingTrackId.value !== track.id) {
    audio.pause()
    audio.src = track.audioPath
    audio.currentTime = 0
    previewPositionSec.value = 0
    previewDurationSec.value = Number.isFinite(track.trackDurationSec) && track.trackDurationSec > 0
      ? track.trackDurationSec
      : 0
  }
  previewingTrackId.value = track.id
  audio.play().catch(() => {
    // Browser may block autoplay; the user will need to click again.
    previewingTrackId.value = null
  })
  audio.onended = () => {
    previewingTrackId.value = null
    previewPositionSec.value = 0
  }
  audio.onerror = () => { previewingTrackId.value = null }
}

function previewDurationForTrack(track) {
  if (previewingTrackId.value === track.id && previewDurationSec.value > 0) return previewDurationSec.value
  return Number.isFinite(track.trackDurationSec) && track.trackDurationSec > 0 ? track.trackDurationSec : 0
}

function previewPositionForTrack(trackId) {
  if (previewingTrackId.value === trackId) return previewPositionSec.value
  return 0
}

function previewSeekMax(track) {
  return Math.max(previewDurationForTrack(track), 0.1)
}

function seekPreview(trackId, value) {
  if (previewingTrackId.value !== trackId) return
  const audio = getOrCreateAudio()
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : previewDurationSec.value
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0
  const next = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
  try {
    audio.currentTime = next
    previewPositionSec.value = Number.isFinite(audio.currentTime) ? audio.currentTime : next
  } catch {
    previewPositionSec.value = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
  }
}

function formatPreviewTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'
  const total = Math.floor(value)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const form = reactive({
  artist: '',
  album: '',
  trackName: '',
  trackFile: null,
  trackDurationSec: null,
  coverFile: null,
})

const debugMessagesReversed = computed(() => [...debugMessages.value].reverse())
const albumNames = computed(() => {
  const names = tracks.value
    .map(track => typeof track?.album === 'string' ? track.album.trim() : '')
    .filter(Boolean)
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})
const activeOverlayName = computed(() => {
  const active = overlays.value.find(overlay => overlay.id === activeOverlayId.value)
  return active?.name ?? 'Unknown'
})
const LIKED_ATTRIBUTE_ID = 'liked'
const likedAttributeId = LIKED_ATTRIBUTE_ID
const customAttributeDefinitions = computed(() =>
  attributeDefinitions.value.filter(definition => definition.type === 'custom')
)

function normalizeAttributeDefinition(definition) {
  if (definition?.id === LIKED_ATTRIBUTE_ID || definition?.type === 'liked') {
    return { id: LIKED_ATTRIBUTE_ID, name: 'Liked', type: 'liked' }
  }
  const id = typeof definition?.id === 'string' && definition.id.trim() ? definition.id.trim() : createAttributeId()
  const name = typeof definition?.name === 'string' && definition.name.trim() ? definition.name.trim() : 'Attribute'
  return { id, name, type: 'custom' }
}

function createAttributeId() {
  if (globalThis.crypto?.randomUUID) return `attr-${globalThis.crypto.randomUUID()}`
  return `attr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeRule(rule) {
  const toList = (values) => {
    if (!Array.isArray(values)) return []
    return [...new Set(values.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean))]
  }
  return {
    whitelistAlbums: toList(rule?.whitelistAlbums),
    blacklistAlbums: toList(rule?.blacklistAlbums),
    uniqueAlbums: toList(rule?.uniqueAlbums),
  }
}

function applyMusicSnapshot(data) {
  music.song = data.song
  music.status = data.status
  tracks.value = Array.isArray(data.library) ? data.library : []
  debugMessages.value = Array.isArray(data.debugMessages) ? data.debugMessages : []
  overlays.value = Array.isArray(data.overlays) ? data.overlays : []
  activeOverlayId.value = typeof data.activeOverlayId === 'string' ? data.activeOverlayId : ''
  const nextRules = {}
  for (const overlay of overlays.value) {
    nextRules[overlay.id] = normalizeRule(data.overlayAlbumRules?.[overlay.id])
  }
  overlayAlbumRules.value = nextRules
  const incomingDefinitions = Array.isArray(data.attributeDefinitions)
    ? data.attributeDefinitions.map(normalizeAttributeDefinition)
    : [normalizeAttributeDefinition({ id: LIKED_ATTRIBUTE_ID, type: 'liked' })]
  attributeDefinitions.value = incomingDefinitions
  editableCustomAttributes.value = incomingDefinitions
    .filter(definition => definition.type === 'custom')
    .map(definition => ({ id: definition.id, name: definition.name }))
  styleOptions.value = Array.isArray(data.styleOptions) ? [...new Set(data.styleOptions)] : []
  const nextDrafts = {}
  for (const track of tracks.value) {
    nextDrafts[track.id] = {
      attributes: { ...(track.attributes ?? {}) },
      styles: Array.isArray(track.styles) ? [...new Set(track.styles)] : [],
    }
    if (typeof trackStyleDrafts[track.id] !== 'string') trackStyleDrafts[track.id] = ''
  }
  trackMetaDrafts.value = nextDrafts
  const hasSelected = overlays.value.some(overlay => overlay.id === selectedOverlayId.value)
  if (!hasSelected) {
    selectedOverlayId.value = activeOverlayId.value || overlays.value[0]?.id || ''
  }
}

async function fetchLibrary() {
  const res = await fetch('/api/music/library')
  if (!res.ok) throw new Error('Failed to load library')
  applyMusicSnapshot(await res.json())
}

async function reloadLibrary() {
  reloading.value = true
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/reload', { method: 'POST' })
    if (!res.ok) throw new Error('Reload failed')
    applyMusicSnapshot(await res.json())
  } catch (err) {
    formMessage.value = `Reload failed: ${err.message}`
  } finally {
    reloading.value = false
  }
}

async function pauseMusicPage() {
  try {
    const res = await fetch('/api/music/pause', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Pause failed')
    music.status = data.status ?? music.status
  } catch (err) {
    formMessage.value = `Pause failed: ${err.message}`
  }
}

async function resumeMusicPage() {
  try {
    const res = await fetch('/api/music/resume', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Resume failed')
    music.status = data.status ?? music.status
  } catch (err) {
    formMessage.value = `Resume failed: ${err.message}`
  }
}

function probeAudioDuration(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      audio.src = ''
      URL.revokeObjectURL(objectUrl)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 8000)
    audio.onloadedmetadata = () => {
      clearTimeout(timer)
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null
      finish(duration)
    }
    audio.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    audio.preload = 'metadata'
    audio.src = objectUrl
  })
}

async function onTrackFileChange(event) {
  const file = event.target.files?.[0] ?? null
  form.trackFile = file
  form.trackDurationSec = null
  if (!file) return
  const probeToken = ++trackDurationProbeToken
  const duration = await probeAudioDuration(file)
  if (probeToken !== trackDurationProbeToken) return
  form.trackDurationSec = duration
}

function onCoverFileChange(event) {
  const file = event.target.files?.[0] ?? null
  form.coverFile = file
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

async function importMusic() {
  if (!form.trackFile || !form.coverFile) return
  importing.value = true
  formMessage.value = ''
  try {
    const [trackDataUrl, coverDataUrl] = await Promise.all([
      fileToDataUrl(form.trackFile),
      fileToDataUrl(form.coverFile),
    ])
    const res = await fetch('/api/music/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist: form.artist,
        album: form.album,
        trackName: form.trackName,
        trackFileName: form.trackFile.name,
        trackDurationSec: form.trackDurationSec,
        coverFileName: form.coverFile.name,
        trackDataUrl,
        coverDataUrl,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Import failed')
    applyMusicSnapshot(data)
    formMessage.value = 'Track imported successfully.'
    form.trackName = ''
    form.trackFile = null
    form.trackDurationSec = null
    if (trackFileInput.value) trackFileInput.value.value = ''
  } catch (err) {
    formMessage.value = `Import failed: ${err.message}`
  } finally {
    importing.value = false
  }
}

async function playTrack(id) {
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to set track')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Set track failed: ${err.message}`
  }
}

function currentRule() {
  return overlayAlbumRules.value[selectedOverlayId.value] ?? normalizeRule(null)
}

function ruleHas(type, album) {
  return currentRule()[type].includes(album)
}

function toggleRule(type, album, checked) {
  if (!selectedOverlayId.value) return
  const next = normalizeRule(currentRule())
  if (checked) {
    if (!next[type].includes(album)) next[type].push(album)
    if (type === 'whitelistAlbums') next.blacklistAlbums = next.blacklistAlbums.filter(name => name !== album)
    if (type === 'blacklistAlbums') next.whitelistAlbums = next.whitelistAlbums.filter(name => name !== album)
  } else {
    next[type] = next[type].filter(name => name !== album)
  }
  overlayAlbumRules.value = {
    ...overlayAlbumRules.value,
    [selectedOverlayId.value]: next,
  }
}

async function saveOverlayRules() {
  if (!selectedOverlayId.value) return
  savingRules.value = true
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overlayId: selectedOverlayId.value,
        rules: currentRule(),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save rules')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save rules failed: ${err.message}`
  } finally {
    savingRules.value = false
  }
}

function addCustomAttribute() {
  const name = newAttributeName.value.trim()
  if (!name) return
  editableCustomAttributes.value.push({
    id: createAttributeId(),
    name,
  })
  newAttributeName.value = ''
}

function removeCustomAttribute(attributeId) {
  editableCustomAttributes.value = editableCustomAttributes.value.filter(attribute => attribute.id !== attributeId)
}

async function saveAttributes() {
  savingAttributes.value = true
  formMessage.value = ''
  try {
    const payload = editableCustomAttributes.value
      .map(attribute => ({ id: attribute.id, name: attribute.name?.trim() || '' }))
      .filter(attribute => attribute.name)
    const res = await fetch('/api/music/attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: payload }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save attributes')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save attributes failed: ${err.message}`
  } finally {
    savingAttributes.value = false
  }
}

function trackDraftValue(trackId, attributeId) {
  const draft = trackMetaDrafts.value[trackId]
  const value = draft?.attributes?.[attributeId]
  if (typeof value === 'number') return value
  if (attributeId === LIKED_ATTRIBUTE_ID) return 0
  return 0.5
}

function setTrackDraftValue(trackId, attributeId, value) {
  if (!trackMetaDrafts.value[trackId]) {
    trackMetaDrafts.value[trackId] = { attributes: {}, styles: [] }
  }
  const next = attributeId === LIKED_ATTRIBUTE_ID
    ? Math.max(-1, Math.min(1, value))
    : Math.max(0, Math.min(1, value))
  trackMetaDrafts.value[trackId].attributes = {
    ...trackMetaDrafts.value[trackId].attributes,
    [attributeId]: next,
  }
}

function styleOptionsForTrack(trackId) {
  const draft = trackMetaDrafts.value[trackId]
  const base = Array.isArray(styleOptions.value) ? styleOptions.value : []
  const styles = Array.isArray(draft?.styles) ? draft.styles : []
  return [...new Set([...base, ...styles])]
}

function trackDraftHasStyle(trackId, style) {
  const draft = trackMetaDrafts.value[trackId]
  return Array.isArray(draft?.styles) && draft.styles.includes(style)
}

function toggleTrackStyle(trackId, style, checked) {
  if (!trackMetaDrafts.value[trackId]) {
    trackMetaDrafts.value[trackId] = { attributes: {}, styles: [] }
  }
  const existing = Array.isArray(trackMetaDrafts.value[trackId].styles) ? trackMetaDrafts.value[trackId].styles : []
  const next = checked
    ? [...new Set([...existing, style])]
    : existing.filter(item => item !== style)
  trackMetaDrafts.value[trackId].styles = next
}

function addCustomTrackStyle(trackId) {
  const raw = trackStyleDrafts[trackId]
  const style = typeof raw === 'string' ? raw.trim() : ''
  if (!style) return
  toggleTrackStyle(trackId, style, true)
  trackStyleDrafts[trackId] = ''
}

async function saveTrackMeta(trackId) {
  if (!trackMetaDrafts.value[trackId]) return
  savingTrackId.value = trackId
  formMessage.value = ''
  try {
    const res = await fetch('/api/music/track-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId,
        attributes: trackMetaDrafts.value[trackId].attributes,
        styles: trackMetaDrafts.value[trackId].styles,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Unable to save track metadata')
    applyMusicSnapshot(data)
  } catch (err) {
    formMessage.value = `Save track metadata failed: ${err.message}`
  } finally {
    savingTrackId.value = ''
  }
}

onMounted(async () => {
  try {
    await fetchLibrary()
  } catch (err) {
    formMessage.value = `Load failed: ${err.message}`
  }
})

// ── DJ Simulator ──────────────────────────────────────────────────────────────
const simResult = ref(null)
const simLoading = ref(false)
const simError = ref('')
const simOverrides = reactive({}) // attrId -> number override for target

const SIM_GRAPH_X0 = 60
const SIM_GRAPH_Y0 = 10
const SIM_GRAPH_W  = 550 // inner width (from x=60 to x=610)
const SIM_GRAPH_H  = 258 // inner height (from y=10 to y=268)

function simAttrName(attrId) {
  const def = (simResult.value?.attributeDefinitions ?? attributeDefinitions.value)
    .find(d => d.id === attrId)
  return def?.name ?? attrId
}

function fmtN(value) {
  return typeof value === 'number' ? value.toFixed(3) : '—'
}

function resetSimOverrides() {
  const target = simResult.value?.effectiveTargetAttributes ?? {}
  for (const k of Object.keys(simOverrides)) delete simOverrides[k]
  for (const [k, v] of Object.entries(target)) simOverrides[k] = v
}

async function runDjSimulation() {
  simLoading.value = true
  simError.value = ''
  try {
    const overrideAttrs = Object.keys(simOverrides).length > 0 ? { ...simOverrides } : undefined
    const res = await fetch('/api/music/dj-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAttributes: overrideAttrs }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? 'Simulation failed')
    simResult.value = data
    // Seed overrides from the returned effective targets if not yet set.
    for (const [k, v] of Object.entries(data.effectiveTargetAttributes ?? {})) {
      if (!(k in simOverrides)) simOverrides[k] = v
    }
  } catch (err) {
    simError.value = `Simulation failed: ${err.message}`
  } finally {
    simLoading.value = false
  }
}

function simGraphAttrToXY(attrs) {
  const attrIds = simResult.value?.customAttrIds ?? []
  const xAttr = attrIds[0] ?? null
  const yAttr = attrIds[1] ?? null
  const xVal = xAttr !== null && typeof attrs[xAttr] === 'number' ? attrs[xAttr] : 0.5
  const yVal = yAttr !== null && typeof attrs[yAttr] === 'number' ? attrs[yAttr] : null
  const x = SIM_GRAPH_X0 + xVal * SIM_GRAPH_W
  const y = yVal !== null
    ? SIM_GRAPH_Y0 + (1 - yVal) * SIM_GRAPH_H
    : SIM_GRAPH_Y0 + SIM_GRAPH_H / 2
  return { x, y }
}

const simGraphNodes = computed(() => {
  if (!simResult.value) return []
  const tracks = simResult.value.recentlyPlayedTracks
  if (tracks.length === 0) return []
  const attrIds = simResult.value.customAttrIds
  const hasY = attrIds.length >= 2
  const hasX = attrIds.length >= 1
  return tracks.map((track, idx) => {
    let x, y
    if (!hasX) {
      // No attributes: layout as timeline left-to-right.
      x = SIM_GRAPH_X0 + (tracks.length === 1 ? SIM_GRAPH_W / 2 : (idx / (tracks.length - 1)) * SIM_GRAPH_W)
      y = SIM_GRAPH_Y0 + SIM_GRAPH_H / 2
    } else if (!hasY) {
      // One attribute: X = attribute, Y = play order.
      const xVal = typeof track.attrs[attrIds[0]] === 'number' ? track.attrs[attrIds[0]] : 0.5
      x = SIM_GRAPH_X0 + xVal * SIM_GRAPH_W
      y = SIM_GRAPH_Y0 + (tracks.length === 1 ? SIM_GRAPH_H / 2 : (idx / (tracks.length - 1)) * SIM_GRAPH_H)
    } else {
      const pos = simGraphAttrToXY(track.attrs)
      x = pos.x
      y = pos.y
    }
    return {
      x,
      y,
      title: track.title,
      artist: track.artist,
      label: track.title.length > 10 ? track.title.slice(0, 9) + '…' : track.title,
      isNewest: idx === tracks.length - 1,
      isOldest: idx === 0,
    }
  })
})

const simGraphEdges = computed(() => {
  const nodes = simGraphNodes.value
  const edges = []
  for (let i = 0; i + 1 < nodes.length; i++) {
    edges.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[i + 1].x, y2: nodes[i + 1].y })
  }
  return edges
})

const simGraphMood = computed(() => {
  if (!simResult.value) return null
  const mv = simResult.value.moodVector
  if (!mv || Object.keys(mv).length === 0) return null
  const { x, y } = simGraphAttrToXY(mv)
  const r = 7
  return { x, y, points: `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}` }
})

const simGraphTarget = computed(() => {
  if (!simResult.value) return null
  const ta = simResult.value.effectiveTargetAttributes
  const attrIds = simResult.value.customAttrIds
  if (!ta || attrIds.length === 0) return null
  const { x, y } = simGraphAttrToXY(ta)
  return { x, y }
})
</script>

<style scoped>
.music-page {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  font-family: sans-serif;
  box-sizing: border-box;
}

h1 {
  margin: 0 0 1rem;
  color: #fff;
}

.panel {
  width: 100%;
  max-width: 980px;
  background: #171717;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.9rem;
}

.panel h2 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

.import-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #bdbdbd;
  font-size: 0.85rem;
}

.field input {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.field select {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.action-btn {
  font-size: 0.8rem;
  padding: 0.38rem 0.75rem;
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.action-btn:hover {
  background: #282828;
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.track-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.7rem;
}

.track-card {
  display: flex;
  gap: 0.65rem;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 0.55rem;
  background: #111;
}

.cover {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
  background: #1c1c1c;
}

.track-info {
  min-width: 0;
}

.metadata-track {
  width: 100%;
}

.track-title {
  margin: 0 0 0.2rem;
  color: #fff;
  font-weight: 700;
}

.play-btn {
  margin-top: 0.35rem;
}

.track-action-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
}

.preview-btn {
  min-width: 2.2rem;
  text-align: center;
  flex-shrink: 0;
}

.preview-seek-row {
  margin-top: 0.45rem;
  display: grid;
  gap: 0.2rem;
}

.preview-seek-row input {
  width: 100%;
}

.playback-controls {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.5rem;
}

.muted {
  margin: 0.2rem 0;
  color: #9e9e9e;
}

.small {
  font-size: 0.82rem;
}

.attr-editor {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.35rem;
}

.attr-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #bdbdbd;
}

.styles-editor {
  margin-top: 0.5rem;
}

.style-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.style-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #353535;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.75rem;
  color: #bdbdbd;
}

.custom-style-row {
  margin-top: 0.45rem;
  display: flex;
  gap: 0.45rem;
}

.custom-style-row input {
  flex: 1;
  min-width: 0;
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.attribute-list {
  display: grid;
  gap: 0.45rem;
}

.attribute-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.45rem;
}

.attribute-row input {
  background: #1d1d1d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 0.45rem 0.55rem;
}

.attribute-row.fixed {
  grid-template-columns: auto auto;
}

.attribute-label {
  color: #fff;
  font-weight: 600;
}

.rules-grid {
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(90px, 1fr));
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
}

.rules-head {
  background: #1f1f1f;
  color: #bdbdbd;
  font-size: 0.8rem;
  padding: 0.45rem 0.5rem;
  text-align: center;
  border-bottom: 1px solid #2a2a2a;
}

.rules-cell {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid #242424;
  text-align: center;
}

.album-col {
  text-align: left;
}

.debug-box {
  max-height: 240px;
  overflow: auto;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  background: #111;
  padding: 0.5rem;
}

.debug-line {
  margin: 0 0 0.32rem;
  color: #9e9e9e;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.76rem;
  white-space: pre-wrap;
}

/* ── DJ Simulator ─────────────────────────────────────────────────────────── */

.sim-block {
  border-top: 1px solid #222;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
}

.sim-block:first-child {
  border-top: none;
  margin-top: 0.3rem;
  padding-top: 0;
}

.sim-block-title {
  margin: 0 0 0.5rem;
  font-weight: 600;
  font-size: 0.88rem;
  color: #e0e0e0;
}

.sim-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  color: #bdbdbd;
}

.sim-table th {
  background: #1a1a1a;
  color: #9e9e9e;
  padding: 0.3rem 0.45rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #2a2a2a;
}

.sim-table td {
  padding: 0.28rem 0.45rem;
  border-bottom: 1px solid #1e1e1e;
  white-space: nowrap;
}

.sim-table tbody tr:hover {
  background: #1c1c1c;
}

.sim-num {
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.sim-title {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sim-artist {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9e9e9e;
}

.sim-dist-a { color: #82b1ff; }
.sim-dist-b { color: #a5d6a7; }

.sim-score-col {
  font-weight: 700;
  color: #ffd54f;
}

.sim-current-row td {
  background: #1a1f2e;
}

.sim-override-col {
  min-width: 160px;
}

.sim-slider-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sim-slider-row input {
  flex: 1;
}

.sim-table-scroll {
  overflow-x: auto;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #222;
  border-radius: 6px;
}

.sim-graph {
  width: 100%;
  max-width: 620px;
  height: 320px;
  display: block;
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  margin-top: 0.5rem;
}
</style>
