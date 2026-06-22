<template>
  <div class="dashboard">
    <h1>Dashboard</h1>

    <div class="overlay-nav">
      <div class="overlay-tabs">
        <button
          v-for="ov in overlayList"
          :key="ov.id"
          class="overlay-tab"
          :class="{ 'tab-selected': editingId === ov.id }"
          @click="selectOverlay(ov.id)"
        >
          <span v-if="activeId === ov.id" class="live-dot" title="Currently live on /overlay">●</span>
          {{ ov.name }}
        </button>
        <button class="overlay-tab tab-new" title="New overlay" @click="createOverlay">＋</button>
      </div>
      <div class="overlay-actions">
        <button
          v-if="editingId !== activeId"
          class="action-btn action-activate"
          @click="activateOverlay(editingId)"
        >Set Active</button>
        <button class="action-btn" @click="startRename">Rename</button>
        <button
          v-if="overlayList.length > 1"
          class="action-btn action-delete"
          @click="confirmDelete"
        >Delete</button>
      </div>
      <div v-if="renaming" class="overlay-rename-row">
        <input
          ref="renameInputRef"
          type="text"
          class="rename-input"
          v-model="renameVal"
          @keyup.enter="submitRename"
          @keyup.escape="renaming = false"
        />
        <button class="action-btn" @click="submitRename">Save</button>
        <button class="action-btn" @click="renaming = false">Cancel</button>
      </div>
    </div>

    <div class="music-panel">
      <div class="music-header-row">
        <h2>Background Music</h2>
        <div class="music-header-actions">
          <span class="music-status" :class="music?.status === 'paused' ? 'music-paused' : 'music-playing'">
            {{ music?.status === 'paused' ? 'Paused' : 'Playing' }}
          </span>
          <button
            class="action-btn"
            :class="{ 'action-edit-active': musicEditOpen }"
            @click="musicEditOpen = !musicEditOpen"
          >{{ musicEditOpen ? 'Done' : 'Edit' }}</button>
        </div>
      </div>

      <div class="music-now-playing">
        <p class="music-line"><strong>Now Playing:</strong> {{ music?.song?.title ?? 'Unknown Song' }}</p>
        <p class="music-line"><strong>Artist:</strong> {{ music?.song?.artist ?? 'Unknown Artist' }}</p>
        <p class="music-line"><strong>Album:</strong> {{ music?.song?.album ?? 'Unknown Album' }}</p>
      </div>

      <div class="music-controls">
        <button class="action-btn" :disabled="!canPause" @click="pauseMusic">Pause</button>
        <button class="action-btn" :disabled="!canResume" @click="resumeMusic">Resume</button>
        <button class="action-btn action-activate" @click="skipMusic">Skip Song</button>
        <label class="music-inline-option">
          <input
            type="checkbox"
            :checked="popupSettings.normalizeVolume"
            @change="patchPopupSettings({ normalizeVolume: $event.target.checked })"
          />
          Normalize Volume
        </label>
        <label class="music-inline-option">
          Level
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            class="music-inline-number"
            :disabled="!popupSettings.normalizeVolume"
            :value="popupSettings.normalizedVolumePct"
            @change="patchPopupSettings({ normalizedVolumePct: $event.target.valueAsNumber })"
          />
          %
        </label>
      </div>

      <p class="music-help">
        Place songs and album art in
        <code>public/Music/Album Name - Artist/</code>
        (use <code>cover.jpg</code> plus <code>.mp3/.ogg/.wav</code> files) so the app can load them as <code>/Music/...</code> assets.
      </p>

      <div v-if="musicEditOpen" class="edit-panel music-edit-panel">
        <div class="edit-row">
          <label class="edit-label">Popup X Offset</label>
          <input
            type="number"
            :value="popupSettings.x"
            @change="patchPopupSettings({ x: $event.target.valueAsNumber })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Popup Y Offset</label>
          <input
            type="number"
            :value="popupSettings.y"
            @change="patchPopupSettings({ y: $event.target.valueAsNumber })"
          />
        </div>
        <div class="edit-row checkbox-row">
          <label class="edit-label">Default Play Music</label>
          <input
            type="checkbox"
            :checked="popupSettings.defaultPlayMusic"
            @change="patchPopupSettings({ defaultPlayMusic: $event.target.checked })"
          />
        </div>
        <div class="edit-row checkbox-row">
          <label class="edit-label">Hide Popup Visual</label>
          <input
            type="checkbox"
            :checked="popupSettings.hiddenVisual"
            @change="patchPopupSettings({ hiddenVisual: $event.target.checked })"
          />
        </div>
        <p class="edit-sub">Popup Animation</p>
        <div class="edit-row">
          <label class="edit-label">Song Start Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.songStartShowSec"
            @change="patchPopupSettings({ animation: { songStartShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Song End Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.songEndShowSec"
            @change="patchPopupSettings({ animation: { songEndShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Periodic Interval (sec)</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="popupSettings.animation.periodicIntervalSec"
            @change="patchPopupSettings({ animation: { periodicIntervalSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Periodic Show (sec)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            :value="popupSettings.animation.periodicShowSec"
            @change="patchPopupSettings({ animation: { periodicShowSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Fade + Motion Duration (sec)</label>
          <input
            type="number"
            min="0"
            step="0.05"
            :value="popupSettings.animation.transitionDurationSec"
            @change="patchPopupSettings({ animation: { transitionDurationSec: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Direction</label>
          <select
            :value="popupSettings.animation.motionDirection"
            @change="patchPopupSettings({ animation: { motionDirection: $event.target.value } })"
          >
            <option value="none">None (fade only)</option>
            <option value="up">Vertical Up</option>
            <option value="down">Vertical Down</option>
            <option value="left">Horizontal Left</option>
            <option value="right">Horizontal Right</option>
          </select>
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Distance (px)</label>
          <input
            type="number"
            min="0"
            step="1"
            :value="popupSettings.animation.motionDistancePx"
            @change="patchPopupSettings({ animation: { motionDistancePx: $event.target.valueAsNumber } })"
          />
        </div>
        <div class="edit-row">
          <label class="edit-label">Motion Interpolation</label>
          <select
            :value="popupSettings.animation.motionInterpolation"
            @change="patchPopupSettings({ animation: { motionInterpolation: $event.target.value } })"
          >
            <option value="linear">Linear</option>
            <option value="quadratic">Quadratic</option>
            <option value="exponential">Exponential</option>
          </select>
        </div>
      </div>
    </div>

    <div class="module-grid">
      <div v-for="mod in modules" :key="mod.id" class="module-card" :class="{ 'mod-is-hidden': mod.hidden }">

        <!-- Card header -->
        <div class="module-header">
          <span class="module-title">
            <span v-if="mod.hidden" class="hidden-badge">HIDDEN</span>
            {{ moduleTitle(mod) }}
          </span>
          <div class="card-actions">
            <button
              class="action-btn"
              :class="mod.hidden ? 'action-show' : 'action-hide'"
              :title="mod.hidden ? 'Show in overlay' : 'Hide from overlay'"
              @click="toggleHidden(mod)"
            >{{ mod.hidden ? 'Show' : 'Hide' }}</button>
            <button
              class="action-btn"
              :class="{ 'action-edit-active': editOpen[mod.id] }"
              @click="toggleEdit(mod.id)"
            >{{ editOpen[mod.id] ? 'Done' : 'Edit' }}</button>
            <button v-if="modules.length > 1" class="action-btn action-delete" @click="removeModule(mod.id)">✕</button>
          </div>
        </div>

        <!-- Always-visible: counter controls for progressBar -->
        <div v-if="mod.type === 'progressBar'" class="counter-section">
          <p class="count" :style="{ color: mod.color }">{{ mod.count }}</p>
          <div class="counter-row">
            <button class="counter-btn" @click="adjustCount(mod, -1)">−</button>
            <input type="number" class="step-input" :value="steps[mod.id] ?? 1" @change="setStepLocal(mod.id, $event.target.value)" title="Step size" />
            <button class="counter-btn" @click="adjustCount(mod, +1)">+</button>
          </div>
          <div class="counter-row">
            <input type="number" class="set-input" placeholder="Set value…" :value="setVals[mod.id] ?? ''" @input="updateSetVal(mod.id, $event.target.value)" @keyup.enter="setCount(mod)" />
            <button class="counter-btn-sm" @click="setCount(mod)">Set</button>
            <button class="counter-btn-sm reset" @click="patchMod(mod.id, { count: 0 })">Reset</button>
          </div>
        </div>

        <div v-else-if="mod.type === 'leaderboard'" class="leaderboard-section">
          <p class="leaderboard-rank">
            #{{ leaderboardFocusSnapshot(mod).rank }} / {{ leaderboardFocusSnapshot(mod).total }}
          </p>
          <p class="leaderboard-name">{{ leaderboardFocusSnapshot(mod).participant?.username ?? 'No User' }}</p>
          <p class="leaderboard-score">{{ leaderboardFocusSnapshot(mod).formattedScore }}</p>
          <div class="counter-row">
            <button class="counter-btn" @click="adjustLeaderboardScore(mod, -1)">−</button>
            <input type="number" class="step-input" :value="steps[mod.id] ?? leaderboardDefaultStep(mod)" @change="setStepLocal(mod.id, $event.target.value)" title="Step size" />
            <button class="counter-btn" @click="adjustLeaderboardScore(mod, +1)">+</button>
          </div>
          <div class="counter-row">
            <input type="number" class="set-input" :placeholder="mod.scoreType === 'time' ? 'Set ms…' : 'Set value…'" :value="setVals[mod.id] ?? ''" @input="updateSetVal(mod.id, $event.target.value)" @keyup.enter="setLeaderboardScore(mod)" />
            <button class="counter-btn-sm" @click="setLeaderboardScore(mod)">Set</button>
            <button class="counter-btn-sm reset" @click="setLeaderboardScore(mod, 0)">Reset</button>
          </div>
        </div>

        <TimerDisplayBlock
          v-else-if="mod.type === 'timer'"
          :mod="mod"
          @start="timerStart"
          @pause="timerPause"
          @reset="timerReset"
        />

        <ChatPreview
          v-else-if="mod.type === 'chat'"
          :mod-id="mod.id"
          :channel="mod.channel"
        />

        <!-- Edit panel (all types) -->
        <div v-if="editOpen[mod.id]" class="edit-panel">

          <template v-if="mod.type === 'progressBar'">
            <div class="edit-row">
              <label class="edit-label">Goal</label>
              <input type="number" min="1" :value="mod.max" @change="patchMod(mod.id, { max: $event.target.valueAsNumber })" />
              <button class="reset-sm" @click="patchMod(mod.id, { max: 100 })">↺</button>
            </div>
            <div class="edit-row">
              <label class="edit-label">Label</label>
              <input type="text" :value="mod.label" @change="patchMod(mod.id, { label: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Color <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['color'])" title="Reset to brand bar color">↺</a></label>
              <input type="color" :value="mod.color" @input="patchMod(mod.id, { color: $event.target.value })" />
            </div>
            <p class="edit-sub">Bar</p>
            <div v-for="f in barFields" :key="mod.id+'b'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.bar[f.key]" @change="patchMod(mod.id, { bar: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Title</p>
            <div v-for="f in titleFields" :key="mod.id+'t'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.title[f.key]" @change="patchMod(mod.id, { title: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Value</p>
            <div v-for="f in valueFields" :key="mod.id+'v'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.value[f.key]" @change="patchMod(mod.id, { value: { [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'p'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          </template>

          <template v-else-if="mod.type === 'image'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Image Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Image Path</label>
              <input type="text" class="wide-input" :value="mod.src" @change="patchMod(mod.id, { src: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Alt Text</label>
              <input type="text" class="wide-input" :value="mod.alt" @change="patchMod(mod.id, { alt: $event.target.value })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'i'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          </template>

          <template v-else-if="mod.type === 'text'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Text Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Text</label>
              <input type="text" class="wide-input" :value="mod.text" @change="patchMod(mod.id, { text: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Color <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['color'])" title="Reset to brand text color">↺</a></label>
              <input type="color" :value="mod.color" @input="patchMod(mod.id, { color: $event.target.value })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in textTransformFields" :key="mod.id+'x'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : (f.key === 'fontSize' ? 32 : 0))" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          </template>

          <template v-else-if="mod.type === 'dj'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="DJ Module" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Liked Bonus</label>
              <input type="number" step="0.1" min="0" :value="mod.likedBonus" @change="patchMod(mod.id, { likedBonus: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Min Repeats</label>
              <input type="number" step="1" min="0" :value="mod.minRepeats" @change="patchMod(mod.id, { minRepeats: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Style Penalty</label>
              <input type="number" step="0.01" min="0" :value="mod.stylePenalty" @change="patchMod(mod.id, { stylePenalty: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Variance</label>
              <input type="number" step="0.01" min="0" :value="mod.variance ?? 0" @change="patchMod(mod.id, { variance: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Mood Window</label>
              <input type="number" step="1" min="1" :value="mod.moodWindow" @change="patchMod(mod.id, { moodWindow: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Target Styles</p>
            <p v-if="!(music?.styleOptions?.length)" class="edit-note">No styles loaded. Reload the music library.</p>
            <div v-for="style in (music?.styleOptions ?? [])" :key="mod.id+'-style-'+style" class="edit-row checkbox-row">
              <label class="edit-label">{{ style }}</label>
              <input
                type="checkbox"
                :checked="mod.targetStyles?.includes(style)"
                @change="patchDjStyles(mod, style, $event.target.checked)"
              />
            </div>
            <p class="edit-sub">Target Attributes</p>
            <p v-if="!customDjAttributes.length" class="edit-note">No custom attributes defined. Add them in /music.</p>
            <div v-for="definition in customDjAttributes" :key="mod.id+'-attr-'+definition.id" class="edit-row">
              <label class="edit-label">{{ definition.name }} ({{ ((mod.targetAttributes?.[definition.id]) ?? 0.5).toFixed(2) }})</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="(mod.targetAttributes?.[definition.id]) ?? 0.5"
                @change="patchMod(mod.id, { targetAttributes: { ...mod.targetAttributes, [definition.id]: $event.target.valueAsNumber } })"
              />
            </div>
          </template>

          <template v-else-if="mod.type === 'leaderboard'">
            <div class="edit-row">
              <label class="edit-label">Title</label>
              <input type="text" class="wide-input" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Score Type</label>
              <select :value="mod.scoreType" @change="patchMod(mod.id, { scoreType: $event.target.value })">
                <option value="number">Number</option>
                <option value="time">Time (ms)</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Top Rows</label>
              <input type="number" min="1" :value="mod.topCount" @change="patchMod(mod.id, { topCount: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Neighbor Rows</label>
              <input type="number" min="0" :value="mod.neighborCount" @change="patchMod(mod.id, { neighborCount: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Focus User</label>
              <select :value="mod.focusParticipantId" @change="patchMod(mod.id, { focusParticipantId: $event.target.value })">
                <option v-for="participant in sortedLeaderboardParticipants(mod)" :key="mod.id + '-focus-' + participant.id" :value="participant.id">
                  {{ participant.username }}
                </option>
              </select>
            </div>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Hide Rank Numbers</label>
              <input
                type="checkbox"
                :checked="!leaderboardAppearance(mod).showRankNumbers"
                @change="patchLeaderboardAppearance(mod, { showRankNumbers: !$event.target.checked })"
              />
            </div>
            <p class="edit-sub">Colors</p>
            <div class="edit-row">
              <label class="edit-label">Text <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.textColor'])" title="Reset to brand text color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).textColor"
                @input="patchLeaderboardAppearance(mod, { textColor: $event.target.value })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">User Default <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.defaultUsernameColor'])" title="Reset to brand default username color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).defaultUsernameColor"
                @input="patchLeaderboardAppearance(mod, { defaultUsernameColor: $event.target.value })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Focus Highlight <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.focusHighlightColor'])" title="Reset to brand highlight color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).focusHighlightColor"
                @input="patchLeaderboardAppearance(mod, { focusHighlightColor: $event.target.value })"
              />
              <input
                type="number"
                min="0"
                max="255"
                step="1"
                class="alpha-input"
                :value="leaderboardAppearance(mod).focusHighlightAlpha"
                @change="patchLeaderboardAppearance(mod, { focusHighlightAlpha: $event.target.valueAsNumber })"
                title="Alpha (0–255)"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Best Highlight <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.bestHighlightColor'])" title="Reset to brand best highlight color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).bestHighlightColor"
                @input="patchLeaderboardAppearance(mod, { bestHighlightColor: $event.target.value })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Good Highlight <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.goodHighlightColor'])" title="Reset to brand good highlight color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).goodHighlightColor"
                @input="patchLeaderboardAppearance(mod, { goodHighlightColor: $event.target.value })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Bad Highlight <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.badHighlightColor'])" title="Reset to brand bad highlight color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).badHighlightColor"
                @input="patchLeaderboardAppearance(mod, { badHighlightColor: $event.target.value })"
              />
            </div>

            <div class="edit-row">
              <label class="edit-label">Number Color</label>
              <select
                :value="leaderboardAppearance(mod).numberColorMode"
                @change="patchLeaderboardAppearance(mod, { numberColorMode: $event.target.value })"
              >
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </select>
            </div>
            <div v-if="leaderboardAppearance(mod).numberColorMode === 'solid'" class="edit-row">
              <label class="edit-label">Number Solid <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['appearance.numberColor'])" title="Reset to brand number color">↺</a></label>
              <input
                type="color"
                :value="leaderboardAppearance(mod).numberColor"
                @input="patchLeaderboardAppearance(mod, { numberColor: $event.target.value })"
              />
            </div>
            <template v-else>
              <div
                v-for="(keyValue, keyIdx) in leaderboardAppearance(mod).numberColorKeys"
                :key="`${mod.id}-num-key-${keyIdx}`"
                class="leaderboard-keyvalue-row"
              >
                <label class="edit-label">Key {{ keyIdx + 1 }}</label>
                <input
                  type="number"
                  step="1"
                  class="participant-score-input"
                  :value="keyValue.position"
                  @change="setLeaderboardNumberColorKey(mod, keyIdx, { position: $event.target.valueAsNumber })"
                />
                <input
                  type="color"
                  :value="keyValue.color"
                  @input="setLeaderboardNumberColorKey(mod, keyIdx, { color: $event.target.value })"
                />
                <button class="action-btn action-delete" @click="removeLeaderboardNumberColorKey(mod, keyIdx)">✕</button>
              </div>
              <button class="counter-btn-sm" @click="addLeaderboardNumberColorKey(mod)">+ Add Score Key</button>
            </template>
            <p class="edit-sub">Text Outline</p>
            <div
              v-for="field in leaderboardOutlineFields"
              :key="`${mod.id}-${field.key}`"
              class="edit-row"
            >
              <label class="edit-label">{{ field.label }}</label>
              <input
                type="color"
                :value="leaderboardAppearance(mod)[field.key].color"
                @input="patchLeaderboardTextOutline(mod, field.key, { color: $event.target.value })"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                :value="leaderboardAppearance(mod)[field.key].sizePx"
                @change="patchLeaderboardTextOutline(mod, field.key, { sizePx: $event.target.valueAsNumber })"
              />
              <span class="edit-unit">px</span>
            </div>
            <p class="edit-sub">Artwork</p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input
                type="text"
                class="wide-input"
                placeholder="/path/to/image.png"
                :value="leaderboardAppearance(mod).backgroundImage.src"
                @change="patchLeaderboardBackgroundImage(mod, { src: $event.target.value })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Background Opacity</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                :value="leaderboardAppearance(mod).backgroundImage.opacity"
                @change="patchLeaderboardBackgroundImage(mod, { opacity: $event.target.valueAsNumber })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Background Blur</label>
              <input
                type="number"
                min="0"
                step="0.5"
                :value="leaderboardAppearance(mod).backgroundImage.blurPx"
                @change="patchLeaderboardBackgroundImage(mod, { blurPx: $event.target.valueAsNumber })"
              />
              <span class="edit-unit">px</span>
            </div>
            <div class="edit-row">
              <label class="edit-label">Icon Size</label>
              <input
                type="number"
                min="0"
                step="1"
                :value="leaderboardAppearance(mod).participantIconSizePx"
                @change="patchLeaderboardAppearance(mod, { participantIconSizePx: $event.target.valueAsNumber })"
              />
              <span class="edit-unit">px</span>
            </div>
            <div
              v-for="field in leaderboardArtFields"
              :key="`${mod.id}-bg-art-${field.key}`"
              class="edit-row"
            >
              <label class="edit-label">{{ field.label }}</label>
              <input
                type="number"
                :step="field.step"
                :value="leaderboardAppearance(mod).backgroundImage[field.key]"
                @change="patchLeaderboardBackgroundImage(mod, { [field.key]: $event.target.valueAsNumber })"
              />
            </div>
            <div
              v-for="field in leaderboardCropFields"
              :key="`${mod.id}-bg-crop-${field.key}`"
              class="edit-row"
            >
              <label class="edit-label">{{ field.label }}</label>
              <input
                type="number"
                min="0"
                step="1"
                :value="leaderboardAppearance(mod).backgroundImage[field.key]"
                @change="patchLeaderboardBackgroundImage(mod, { [field.key]: $event.target.valueAsNumber })"
              />
              <span class="edit-unit">px</span>
            </div>
            <p class="edit-sub">Auto-Hide</p>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Enable</label>
              <input
                type="checkbox"
                :checked="leaderboardAppearance(mod).autoHide.enabled"
                @change="patchLeaderboardAppearance(mod, { autoHide: { ...leaderboardAppearance(mod).autoHide, enabled: $event.target.checked } })"
              />
            </div>
            <template v-if="leaderboardAppearance(mod).autoHide.enabled">
              <div class="edit-row">
                <label class="edit-label">Hide After</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  :value="leaderboardAppearance(mod).autoHide.hideDelaySec"
                  @change="patchLeaderboardAppearance(mod, { autoHide: { ...leaderboardAppearance(mod).autoHide, hideDelaySec: $event.target.valueAsNumber } })"
                />
                <span class="edit-unit">s</span>
              </div>
              <div class="edit-row">
                <label class="edit-label">Show Every</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  :value="leaderboardAppearance(mod).autoHide.periodicIntervalSec"
                  @change="patchLeaderboardAppearance(mod, { autoHide: { ...leaderboardAppearance(mod).autoHide, periodicIntervalSec: $event.target.valueAsNumber } })"
                />
                <span class="edit-unit">s</span>
              </div>
              <div class="edit-row">
                <label class="edit-label">Show For</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  :value="leaderboardAppearance(mod).autoHide.periodicShowSec"
                  @change="patchLeaderboardAppearance(mod, { autoHide: { ...leaderboardAppearance(mod).autoHide, periodicShowSec: $event.target.valueAsNumber } })"
                />
                <span class="edit-unit">s</span>
              </div>

            </template>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'l'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
            <p class="edit-sub">Participants</p>
            <div
              v-for="(participant, index) in (mod.participants ?? [])"
              :key="mod.id + '-participant-' + participant.id"
              class="participant-block"
            >
              <div class="participant-main-row">
                <span class="participant-rank">#{{ index + 1 }}</span>
                <input type="text" class="wide-input" :value="participant.username" @change="updateLeaderboardParticipant(mod, participant.id, { username: $event.target.value })" />
                <input type="number" step="0.001" class="participant-score-input" :value="participant.score" @change="updateLeaderboardParticipant(mod, participant.id, { score: $event.target.valueAsNumber })" />
                <button class="action-btn participant-expand-btn" :class="{ 'action-edit-active': isParticipantEditOpen(mod.id, participant.id) }" @click="toggleParticipantEdit(mod.id, participant.id)" title="More options">⋯</button>
              </div>
              <div v-if="isParticipantEditOpen(mod.id, participant.id)" class="participant-extra-row">
                <div class="participant-extra-actions">
                  <button class="counter-btn-sm" :class="{ 'participant-focus-btn': participant.id === mod.focusParticipantId }" @click="patchMod(mod.id, { focusParticipantId: participant.id })">Focus</button>
                  <input
                    type="color"
                    :value="leaderboardUsernameColor(mod, participant.id)"
                    @input="setLeaderboardUsernameColor(mod, participant.id, $event.target.value)"
                    title="Username color"
                  />
                  <button
                    v-if="hasLeaderboardUsernameColor(mod, participant.id)"
                    class="action-btn"
                    @click="clearLeaderboardUsernameColor(mod, participant.id)"
                  >Default</button>
                  <span v-else class="participant-default-pill">Default</span>
                  <button v-if="(mod.participants?.length ?? 0) > 1" class="action-btn action-delete" @click="removeLeaderboardParticipant(mod, participant.id)">✕</button>
                </div>
                <div class="edit-row participant-extra-edit-row">
                  <label class="edit-label">Icon</label>
                  <input
                    type="text"
                    class="wide-input"
                    placeholder="/path/to/icon.png"
                    :value="participant.iconSrc ?? ''"
                    @change="updateLeaderboardParticipant(mod, participant.id, { iconSrc: $event.target.value })"
                  />
                </div>
                <div class="edit-row participant-extra-edit-row">
                  <label class="edit-label">Icon Blur</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    :value="participant.iconBlurPx ?? 0"
                    @change="updateLeaderboardParticipant(mod, participant.id, { iconBlurPx: $event.target.valueAsNumber })"
                  />
                  <span class="edit-unit">px</span>
                </div>
                <div class="edit-row participant-extra-edit-row">
                  <label class="edit-label">Backdrop</label>
                  <input
                    type="text"
                    class="wide-input"
                    placeholder="/path/to/backdrop.png"
                    :value="participant.backdropImage?.src ?? ''"
                    @change="updateLeaderboardParticipant(mod, participant.id, { backdropImage: { src: $event.target.value } })"
                  />
                </div>
                <div class="edit-row participant-extra-edit-row">
                  <label class="edit-label">Backdrop Blur</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    :value="participant.backdropImage?.blurPx ?? 0"
                    @change="updateLeaderboardParticipant(mod, participant.id, { backdropImage: { blurPx: $event.target.valueAsNumber } })"
                  />
                  <span class="edit-unit">px</span>
                </div>
                <div class="edit-row participant-extra-edit-row">
                  <label class="edit-label">Backdrop Opacity</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    :value="participant.backdropImage?.opacity ?? 1"
                    @change="updateLeaderboardParticipant(mod, participant.id, { backdropImage: { opacity: $event.target.valueAsNumber } })"
                  />
                </div>
                <div class="participant-art-grid">
                  <div
                    v-for="field in leaderboardArtFields"
                    :key="`${mod.id}-${participant.id}-art-${field.key}`"
                    class="edit-row participant-extra-edit-row"
                  >
                    <label class="edit-label">{{ field.label }}</label>
                    <input
                      type="number"
                      :step="field.step"
                      :value="participant.backdropImage?.[field.key] ?? (field.key.startsWith('scale') ? 1 : 0)"
                      @change="updateLeaderboardParticipant(mod, participant.id, { backdropImage: { [field.key]: $event.target.valueAsNumber } })"
                    />
                  </div>
                  <div
                    v-for="field in leaderboardCropFields"
                    :key="`${mod.id}-${participant.id}-crop-${field.key}`"
                    class="edit-row participant-extra-edit-row"
                  >
                    <label class="edit-label">{{ field.label }}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      :value="participant.backdropImage?.[field.key] ?? 0"
                      @change="updateLeaderboardParticipant(mod, participant.id, { backdropImage: { [field.key]: $event.target.valueAsNumber } })"
                    />
                    <span class="edit-unit">px</span>
                  </div>
                </div>
              </div>
            </div>
            <button class="counter-btn-sm" @click="addLeaderboardParticipant(mod)">+ Add Participant</button>
          </template>

          <template v-else-if="mod.type === 'timer'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Timer" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Mode</label>
              <select :value="mod.mode" @change="patchMod(mod.id, { mode: $event.target.value })">
                <option value="countdown">Countdown</option>
                <option value="countup">Count Up</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Precision</label>
              <select :value="mod.precision" @change="patchMod(mod.id, { precision: $event.target.value })">
                <option value="millis">Milliseconds (.mmm)</option>
                <option value="hundredths">Hundredths (.xx)</option>
                <option value="tenths">Tenths (.x)</option>
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Max Unit</label>
              <select :value="mod.maxUnit ?? 'auto'" @change="patchMod(mod.id, { maxUnit: $event.target.value })">
                <option value="auto">Auto (days/hours/minutes/sec)</option>
                <option value="hours">Hours (HH:MM:SS)</option>
                <option value="minutes">Minutes (MM:SS)</option>
                <option value="seconds">Seconds (S)</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Target Type</label>
              <select :value="mod.targetType" @change="patchMod(mod.id, { targetType: $event.target.value })">
                <option value="duration">Duration</option>
                <option value="datetime">Date/Time</option>
              </select>
            </div>
            <template v-if="mod.targetType === 'duration'">
              <div class="edit-row">
                <label class="edit-label">Duration</label>
                <input type="number" min="1" :value="displayMs(mod.duration, getDurationUnit(mod.id))" @change="patchMod(mod.id, { duration: storeMs($event.target.valueAsNumber, getDurationUnit(mod.id)) })" />
                <select :value="getDurationUnit(mod.id)" @change="setDurationUnit(mod.id, $event.target.value)">
                  <option value="hours">Hours</option>
                  <option value="minutes">Minutes</option>
                  <option value="seconds">Seconds</option>
                  <option value="millis">Milliseconds</option>
                </select>
                <button class="reset-sm" @click="patchMod(mod.id, { duration: storeMs(5, 'minutes') })">↺</button>
              </div>
            </template>
            <template v-else>
              <div class="edit-row">
                <label class="edit-label">Target Date/Time</label>
                <input type="datetime-local" :value="mod.targetDateTime ? mod.targetDateTime.slice(0, 16) : ''" @change="patchMod(mod.id, { targetDateTime: $event.target.value ? new Date($event.target.value).toISOString() : '' })" />
              </div>
            </template>
            <template v-if="mod.mode === 'countup'">
              <div class="edit-row">
                <label class="edit-label">Max Duration (0=unlimited)</label>
                <input type="number" min="0" :value="displayMs(mod.maxDuration, getDurationUnit(mod.id))" @change="patchMod(mod.id, { maxDuration: storeMs($event.target.valueAsNumber, getDurationUnit(mod.id)) })" />
                <select :value="getDurationUnit(mod.id)" @change="setDurationUnit(mod.id, $event.target.value)">
                  <option value="hours">Hours</option>
                  <option value="minutes">Minutes</option>
                  <option value="seconds">Seconds</option>
                  <option value="millis">Milliseconds</option>
                </select>
              </div>
            </template>
            <div class="edit-row">
              <label class="edit-label">Color <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['color'])" title="Reset to brand text color">↺</a></label>
              <input type="color" :value="mod.color" @input="patchMod(mod.id, { color: $event.target.value })" />
            </div>
            <p class="edit-sub">On Complete</p>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Freeze at zero / max</label>
              <input
                type="checkbox"
                :checked="mod.onComplete?.freezeAtZero"
                @change="patchMod(mod.id, { onComplete: { ...mod.onComplete, freezeAtZero: $event.target.checked } })"
              />
            </div>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Flash animation</label>
              <input
                type="checkbox"
                :checked="mod.onComplete?.flashAnimation !== false"
                @change="patchMod(mod.id, { onComplete: { ...mod.onComplete, flashAnimation: $event.target.checked } })"
              />
            </div>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Play sound</label>
              <input
                type="checkbox"
                :checked="mod.onComplete?.playSound"
                @change="patchMod(mod.id, { onComplete: { ...mod.onComplete, playSound: $event.target.checked } })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Sound URL</label>
              <input type="text" class="wide-input" :value="mod.onComplete?.soundSrc ?? ''" @change="patchMod(mod.id, { onComplete: { ...mod.onComplete, soundSrc: $event.target.value } })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'tm'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          </template>
          <template v-else-if="mod.type === 'chat'">
            <div class="edit-row">
              <label class="edit-label">Name</label>
              <input type="text" class="wide-input" placeholder="Twitch Chat" :value="mod.name" @change="patchMod(mod.id, { name: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Platform</label>
              <select :value="mod.platform ?? 'twitch'" @change="patchMod(mod.id, { platform: $event.target.value })">
                <option value="twitch">Twitch</option>
                <option value="youtube" disabled>YouTube (Coming Soon)</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Channel</label>
              <input type="text" class="wide-input" placeholder="channelname" :value="mod.channel" @change="patchMod(mod.id, { channel: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Message Prefix</label>
              <input type="text" class="wide-input" placeholder="Twitch" :value="mod.prefix" @change="patchMod(mod.id, { prefix: $event.target.value })" />
            </div>

            <p class="edit-sub">Twitch Connection</p>
            <div class="chat-credential-note">
              <p>Enter your Twitch Client ID and OAuth token below. To get these:</p>
              <ol>
                <li>Go to <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener">Twitch Developer Console</a></li>
                <li>Create an app (use <code>http://localhost</code> as OAuth Redirect URL)</li>
                <li>Copy the Client ID</li>
                <li>Generate an OAuth token at <a href="https://twitchtokengenerator.com/" target="_blank" rel="noopener">twitchtokengenerator.com</a> (scope: <code>chat:read</code>)</li>
              </ol>
            </div>
            <div class="edit-row">
              <label class="edit-label">Client ID</label>
              <input type="text" class="wide-input" :value="mod.clientId" @change="patchMod(mod.id, { clientId: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">OAuth Token</label>
              <input type="password" class="wide-input" :value="mod.accessToken" @change="patchMod(mod.id, { accessToken: $event.target.value })" />
            </div>
            <div class="chat-connect-row">
              <button
                class="action-btn action-activate"
                :disabled="!mod.channel || !mod.clientId || !mod.accessToken"
                @click="connectChat(mod)"
              >Connect</button>
              <button
                class="action-btn action-hide"
                :disabled="(chatStatuses[mod.id] ?? 'disconnected') === 'disconnected'"
                @click="disconnectChat(mod)"
              >Disconnect</button>
              <span
                class="chat-status-dot"
                :class="'chat-' + (chatStatuses[mod.id] ?? 'disconnected')"
              ></span>
              <span class="chat-connection-state">{{ chatStatuses[mod.id] ?? 'disconnected' }}</span>
            </div>

            <p class="edit-sub">Appearance</p>
            <div class="edit-row">
              <label class="edit-label">Message Limit</label>
              <input type="number" min="1" max="500" step="1" :value="mod.messageLimit ?? 50" @change="patchMod(mod.id, { messageLimit: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Fade Out (sec)</label>
              <input type="number" min="0" step="1" :value="mod.fadeOutSec ?? 30" @change="patchMod(mod.id, { fadeOutSec: $event.target.valueAsNumber })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Max Lines</label>
              <input type="number" min="-1" step="1" :value="mod.maxLines ?? 0" @change="patchMaxLines(mod, $event.target.value)" />
              <span class="edit-unit">0=no wrap, -1=unlimited</span>
            </div>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Show Badges</label>
              <input
                type="checkbox"
                :checked="mod.showBadges !== false"
                @change="patchMod(mod.id, { showBadges: $event.target.checked })"
              />
            </div>
            <div class="edit-row checkbox-row">
              <label class="edit-label">Show Timestamps</label>
              <input
                type="checkbox"
                :checked="mod.showTimestamps === true"
                @change="patchMod(mod.id, { showTimestamps: $event.target.checked })"
              />
            </div>
            <div class="edit-row">
              <label class="edit-label">Font Size</label>
              <input type="number" min="8" max="72" step="1" :value="mod.fontSize ?? 18" @change="patchMod(mod.id, { fontSize: $event.target.valueAsNumber })" />
              <span class="edit-unit">px</span>
            </div>
            <div class="edit-row">
              <label class="edit-label">Username Color</label>
              <input type="color" :value="mod.usernameColor ?? '#ffffff'" @input="patchMod(mod.id, { usernameColor: $event.target.value })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Message Color</label>
              <input type="color" :value="mod.messageColor ?? '#ffffff'" @input="patchMod(mod.id, { messageColor: $event.target.value })" />
            </div>
            <p class="edit-sub">Transform</p>
            <div v-for="f in transformFields" :key="mod.id+'ch'+f.key" class="edit-row">
              <label class="edit-label">{{ f.label }}</label>
              <input type="number" :step="f.step" :value="mod.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patchMod(mod.id, { transform: { ...mod.transform, [f.key]: $event.target.valueAsNumber } })" />
            </div>
            <p class="edit-sub">Opacity <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['opacity'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Opacity</label>
              <input type="number" step="0.05" min="0" max="1" :value="mod.opacity ?? 1" @change="patchMod(mod.id, { opacity: $event.target.valueAsNumber })" />
            </div>
            <p class="edit-sub">Background <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['background'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Background</label>
              <input type="color" :value="mod.background?.backgroundColor ?? '#000000'" @input="patchMod(mod.id, { background: { ...mod.background, backgroundColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.backgroundAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Border</label>
              <input type="color" :value="mod.background?.borderColor ?? '#ffffff'" @input="patchMod(mod.id, { background: { ...mod.background, borderColor: $event.target.value } })" />
              <input type="number" min="0" max="255" step="1" class="alpha-input" :value="mod.background?.borderAlpha ?? 0" @change="patchMod(mod.id, { background: { ...mod.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
            </div>
            <p class="edit-sub">Animation <a href="#" class="brand-reset-link" @click.prevent="resetBrandSection(mod, ['animation'])" title="Reset to brand">↺</a></p>
            <div class="edit-row">
              <label class="edit-label">Duration (sec)</label>
              <input type="number" min="0" step="0.05" :value="mod.animation?.transitionDurationSec ?? 0.35" @change="patchMod(mod.id, { animation: { ...mod.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Motion Direction</label>
              <select :value="mod.animation?.motionDirection ?? 'none'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDirection: $event.target.value } })">
                <option value="none">None (fade only)</option>
                <option value="up">Vertical Up</option>
                <option value="down">Vertical Down</option>
                <option value="left">Horizontal Left</option>
                <option value="right">Horizontal Right</option>
              </select>
            </div>
            <div class="edit-row">
              <label class="edit-label">Distance (px)</label>
              <input type="number" min="0" step="1" :value="mod.animation?.motionDistancePx ?? 14" @change="patchMod(mod.id, { animation: { ...mod.animation, motionDistancePx: $event.target.valueAsNumber } })" />
            </div>
            <div class="edit-row">
              <label class="edit-label">Interpolation</label>
              <select :value="mod.animation?.motionInterpolation ?? 'linear'" @change="patchMod(mod.id, { animation: { ...mod.animation, motionInterpolation: $event.target.value } })">
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          </template>

        </div>
      </div>
    </div>

    <div class="add-module-row">
      <select v-model="newModuleType" class="module-type-select">
        <option value="progressBar">ProgressBar</option>
        <option value="image">Image</option>
        <option value="text">Text</option>
        <option value="dj">DJ</option>
        <option value="leaderboard">Leaderboard</option>
        <option value="timer">Timer</option>
        <option value="chat">Twitch Chat</option>
      </select>
      <button class="add-module-btn" @click="addModule">+ Add Module</button>
    </div>

    <p class="hint">Changes are sent to the server and forwarded to the Overlay page in real time.</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, provide } from 'vue'
import ChatPreview from '../components/ChatPreview.vue'
import TimerDisplayBlock from '../components/TimerDisplayBlock.vue'

const overlayList    = ref([])
const activeId       = ref('')
const editingId      = ref('')
const renaming       = ref(false)
const renameVal      = ref('')
const renameInputRef = ref(null)

const modules = ref([])
const steps   = reactive({})
const setVals = reactive({})
const editOpen = reactive({})
const participantEditOpen = reactive({})
const durationUnits = reactive({})
const chatMessages = reactive({})
const chatStatuses = reactive({})
provide('chatMessages', chatMessages)
provide('chatStatuses', chatStatuses)

const UNIT_MS = { hours: 3600000, minutes: 60000, seconds: 1000, millis: 1 }

function displayMs(ms, unit) {
  if (!Number.isFinite(ms)) return 0
  const divisor = UNIT_MS[unit] ?? 60000
  return Math.round(ms / divisor)
}

function storeMs(value, unit) {
  if (!Number.isFinite(value) || value < 0) return 0
  const multiplier = UNIT_MS[unit] ?? 60000
  return Math.round(value * multiplier)
}

function getDurationUnit(modId) {
  return durationUnits[modId] ?? 'minutes'
}

function setDurationUnit(modId, unit) {
  durationUnits[modId] = unit
}

const music = ref(null)
const musicEditOpen = ref(false)
const brand = ref(null)

async function fetchBrand() {
  try {
    const res = await fetch('/api/brand')
    brand.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to load brand:', err)
  }
}

function hasBrandOverride(mod, path) {
  return Array.isArray(mod?.brandOverrides) && mod.brandOverrides.includes(path)
}

function resetBrandSection(mod, paths) {
  // Remove the given paths from brandOverrides so module inherits from brand
  const overrides = Array.isArray(mod.brandOverrides) ? mod.brandOverrides : []
  const next = overrides.filter(p => !paths.includes(p))
  patchMod(mod.id, { brandOverrides: next })
}
const canPause = computed(() => !!music.value && music.value.status !== 'paused')
const canResume = computed(() => !!music.value && music.value.status === 'paused')
const popupSettings = reactive({
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

const newModuleType = ref('progressBar')

const barFields = [
  { key: 'x',      label: 'X Offset', step: 1 },
  { key: 'y',      label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1 },
]
const titleFields = [
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]
const valueFields = [
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]
const transformFields = [
  { key: 'x',      label: 'X Offset', step: 1 },
  { key: 'y',      label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1 },
]
const leaderboardArtFields = [
  { key: 'x', label: 'X Offset', step: 1 },
  { key: 'y', label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X', step: 0.1 },
  { key: 'scaleY', label: 'Scale Y', step: 0.1 },
]
const leaderboardOutlineFields = [
  { key: 'titleOutline', label: 'Title' },
  { key: 'participantOutline', label: 'Participants' },
  { key: 'scoreOutline', label: 'Scores' },
]
const leaderboardCropFields = [
  { key: 'cropTop', label: 'Crop Top', step: 1 },
  { key: 'cropRight', label: 'Crop Right', step: 1 },
  { key: 'cropBottom', label: 'Crop Bottom', step: 1 },
  { key: 'cropLeft', label: 'Crop Left', step: 1 },
]
const textTransformFields = [
  { key: 'x',        label: 'X Offset', step: 1 },
  { key: 'y',        label: 'Y Offset', step: 1 },
  { key: 'scaleX',   label: 'Scale X',  step: 0.1 },
  { key: 'scaleY',   label: 'Scale Y',  step: 0.1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]

const customDjAttributes = computed(() =>
  (music.value?.attributeDefinitions ?? []).filter(d => d.type === 'custom')
)

function moduleTitle(mod) {
  if (mod.type === 'image') return mod.name?.trim() || 'Image Module'
  if (mod.type === 'text') return mod.name?.trim() || 'Text Module'
  if (mod.type === 'dj') return mod.name?.trim() || 'DJ Module'
  if (mod.type === 'leaderboard') return mod.name?.trim() || 'Leaderboard Module'
  if (mod.type === 'timer') return mod.name?.trim() || 'Timer Module'
  if (mod.type === 'chat') return mod.name?.trim() || 'Chat Module'
  return mod.label || 'ProgressBar Module'
}

function toggleEdit(modId) {
  editOpen[modId] = !editOpen[modId]
}

function toggleParticipantEdit(modId, participantId) {
  const key = `${modId}-${participantId}`
  participantEditOpen[key] = !participantEditOpen[key]
}

function isParticipantEditOpen(modId, participantId) {
  return !!participantEditOpen[`${modId}-${participantId}`]
}

async function toggleHidden(mod) {
  await patchMod(mod.id, { hidden: !mod.hidden })
}

function applyModules(newModules) {
  const newIds = new Set(newModules.map(m => m.id))
  for (const key of Object.keys(editOpen)) {
    if (!newIds.has(key)) delete editOpen[key]
  }
  // Clean up participantEditOpen keys for removed modules
  for (const key of Object.keys(participantEditOpen)) {
    const modId = key.split('-').slice(0, -1).join('-')
    if (!newIds.has(modId)) delete participantEditOpen[key]
  }
  modules.value = newModules
  for (const key of Object.keys(steps)) delete steps[key]
  for (const key of Object.keys(setVals)) delete setVals[key]
  for (const mod of newModules) {
    steps[mod.id] = mod.type === 'leaderboard' && mod.scoreType === 'time' ? 1000 : 1
    setVals[mod.id] = ''
    if (editOpen[mod.id] === undefined) editOpen[mod.id] = false
  }
}

function applyPopupSettings(nextSettings) {
  popupSettings.x = nextSettings?.x ?? 0
  popupSettings.y = nextSettings?.y ?? 0
  popupSettings.hiddenVisual = !!nextSettings?.hiddenVisual
  popupSettings.defaultPlayMusic = typeof nextSettings?.defaultPlayMusic === 'boolean' ? nextSettings.defaultPlayMusic : true
  popupSettings.normalizeVolume = typeof nextSettings?.normalizeVolume === 'boolean' ? nextSettings.normalizeVolume : false
  popupSettings.normalizedVolumePct = Number.isFinite(nextSettings?.normalizedVolumePct)
    ? Math.max(0, Math.min(100, nextSettings.normalizedVolumePct))
    : 100
  popupSettings.animation.songStartShowSec = nextSettings?.animation?.songStartShowSec ?? 6
  popupSettings.animation.songEndShowSec = nextSettings?.animation?.songEndShowSec ?? 3
  popupSettings.animation.periodicIntervalSec = nextSettings?.animation?.periodicIntervalSec ?? 45
  popupSettings.animation.periodicShowSec = nextSettings?.animation?.periodicShowSec ?? 4
  popupSettings.animation.transitionDurationSec = nextSettings?.animation?.transitionDurationSec ?? 0.35
  popupSettings.animation.motionDirection = nextSettings?.animation?.motionDirection ?? 'down'
  popupSettings.animation.motionDistancePx = nextSettings?.animation?.motionDistancePx ?? 14
  popupSettings.animation.motionInterpolation = nextSettings?.animation?.motionInterpolation ?? 'linear'
}

async function fetchOverlayState(id) {
  const res  = await fetch(`/api/state?id=${encodeURIComponent(id)}`)
  const data = await res.json()
  applyModules(data.modules ?? [])
  applyPopupSettings(data.nowPlayingPopup ?? {})
}

async function fetchOverlayList() {
  const res  = await fetch('/api/overlays')
  const data = await res.json()
  overlayList.value = data.overlays
  activeId.value    = data.activeId
  return data
}

let sseSource = null

onMounted(async () => {
  try {
    const { activeId: aid } = await fetchOverlayList()
    editingId.value = aid
    await fetchOverlayState(aid)
    await fetchMusicState()
    await fetchBrand()
  } catch (err) {
    console.warn('[dashboard] Failed to load initial state:', err)
  }
  sseSource = new EventSource('/api/events')
  sseSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    // Update chat messages & statuses from SSE
    if (data?.chatMessages) {
      for (const [modId, msgs] of Object.entries(data.chatMessages)) {
        chatMessages[modId] = msgs
      }
    }
    if (data?.chatStatuses) {
      for (const [modId, status] of Object.entries(data.chatStatuses)) {
        chatStatuses[modId] = status
      }
    }
  }
  sseSource.onerror = () => {
    // will auto-reconnect
  }
})

onUnmounted(() => {
  if (sseSource) sseSource.close()
})

async function fetchMusicState() {
  const res = await fetch('/api/music')
  music.value = await res.json()
}

async function selectOverlay(id) {
  if (editingId.value === id) return
  editingId.value = id
  renaming.value  = false
  try {
    await fetchOverlayState(id)
  } catch (err) {
    console.warn('[dashboard] Failed to fetch overlay state:', err)
  }
}

async function createOverlay() {
  try {
    const res  = await fetch('/api/overlays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    overlayList.value.push(data)
    await selectOverlay(data.id)
  } catch (err) {
    console.warn('[dashboard] Failed to create overlay:', err)
  }
}

async function activateOverlay(id) {
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(id)}/activate`, { method: 'POST' })
    const data = await res.json()
    activeId.value = data.activeId
  } catch (err) {
    console.warn('[dashboard] Failed to activate overlay:', err)
  }
}

async function startRename() {
  const ov = overlayList.value.find(o => o.id === editingId.value)
  renameVal.value = ov?.name ?? ''
  renaming.value  = true
  await nextTick()
  renameInputRef.value?.focus()
}

async function submitRename() {
  const name = renameVal.value.trim()
  if (!name) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    const ov = overlayList.value.find(o => o.id === editingId.value)
    if (ov) {
      ov.name = data.name
      ov.nowPlayingPopup = data.nowPlayingPopup
    }
    renaming.value = false
  } catch (err) {
    console.warn('[dashboard] Failed to rename overlay:', err)
  }
}

async function confirmDelete() {
  const ov = overlayList.value.find(o => o.id === editingId.value)
  if (!window.confirm(`Delete overlay "${ov?.name ?? editingId.value}"? This cannot be undone.`)) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, { method: 'DELETE' })
    const data = await res.json()
    overlayList.value = data.overlays
    activeId.value    = data.activeId
    editingId.value   = data.activeId
    renaming.value    = false
    await fetchOverlayState(data.activeId)
  } catch (err) {
    console.warn('[dashboard] Failed to delete overlay:', err)
  }
}

function patchMaxLines(mod, rawValue) {
  const v = parseInt(rawValue, 10)
  if (Number.isFinite(v)) patchMod(mod.id, { maxLines: v })
}

async function patchMod(moduleId, patch) {
  const mod = modules.value.find(m => m.id === moduleId)
  if (mod) {
    for (const [key, val] of Object.entries(patch)) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) mod[key] = { ...mod[key], ...val }
      else mod[key] = val
    }
  }

  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(moduleId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === moduleId)
    if (idx !== -1) modules.value[idx] = updated
  } catch (err) {
    console.warn('[dashboard] Failed to patch module:', err)
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function addModule() {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newModuleType.value }),
    })
    const mod = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) { modules.value[idx] = mod } else { modules.value.push(mod) }
    steps[mod.id] = 1
    setVals[mod.id] = ''
    editOpen[mod.id] = false
  } catch (err) {
    console.warn('[dashboard] Failed to add module:', err)
  }
}

async function removeModule(moduleId) {
  const mod = modules.value.find(m => m.id === moduleId)
  if (!window.confirm(`Remove module "${moduleTitle(mod ?? {})}"? This cannot be undone.`)) return
  try {
    const res  = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(moduleId)}`, { method: 'DELETE' })
    const data = await res.json()
    applyModules(data.modules)
  } catch (err) {
    console.warn('[dashboard] Failed to remove module:', err)
  }
}

function patchDjStyles(mod, style, checked) {
  const current = Array.isArray(mod.targetStyles) ? [...mod.targetStyles] : []
  const next = checked
    ? [...new Set([...current, style])]
    : current.filter(s => s !== style)
  patchMod(mod.id, { targetStyles: next })
}

async function pauseMusic() {
  try {
    const res = await fetch('/api/music/pause', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to pause music:', err)
  }
}

async function resumeMusic() {
  try {
    const res = await fetch('/api/music/resume', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to resume music:', err)
  }
}

async function skipMusic() {
  try {
    const res = await fetch('/api/music/skip', { method: 'POST' })
    music.value = await res.json()
  } catch (err) {
    console.warn('[dashboard] Failed to skip song:', err)
  }
}

function adjustCount(mod, direction) {
  const step = steps[mod.id] ?? 1
  patchMod(mod.id, { count: mod.count + direction * step })
}

function setCount(mod) {
  const val = Number(setVals[mod.id])
  if (!Number.isFinite(val)) return
  setVals[mod.id] = ''
  patchMod(mod.id, { count: val })
}

function setStepLocal(modId, raw) {
  const val = Number(raw)
  if (!Number.isFinite(val) || val <= 0) return
  steps[modId] = val
}

function updateSetVal(modId, val) {
  setVals[modId] = val
}



async function timerStart(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/start`, {
      method: 'POST',
    })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch (err) {
    console.warn('[dashboard] Failed to start timer:', err)
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function timerPause(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/pause`, {
      method: 'POST',
    })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch (err) {
    console.warn('[dashboard] Failed to pause timer:', err)
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function timerReset(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/timer/reset`, {
      method: 'POST',
    })
    const updated = await res.json()
    const idx = modules.value.findIndex(m => m.id === mod.id)
    if (idx !== -1) modules.value[idx] = updated
  } catch (err) {
    console.warn('[dashboard] Failed to reset timer:', err)
    try { await fetchOverlayState(editingId.value) } catch {}
  }
}

async function connectChat(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/chat/connect`, {
      method: 'POST',
    })
    const data = await res.json()
    if (data.status === 'connected') {
      chatStatuses[mod.id] = 'connected'
    } else {
      chatStatuses[mod.id] = 'failed'
      console.warn('[dashboard] Chat connect failed:', data)
    }
  } catch (err) {
    console.warn('[dashboard] Chat connect error:', err)
    chatStatuses[mod.id] = 'failed'
  }
}

async function disconnectChat(mod) {
  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}/modules/${encodeURIComponent(mod.id)}/chat/disconnect`, {
      method: 'POST',
    })
    const data = await res.json()
    if (data.status === 'disconnected') {
      chatStatuses[mod.id] = 'disconnected'
    }
  } catch (err) {
    console.warn('[dashboard] Chat disconnect error:', err)
  }
}

function sortedLeaderboardParticipants(mod) {
  const participants = Array.isArray(mod?.participants) ? mod.participants : []
  return [...participants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
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

function patchLeaderboardAppearance(mod, patch) {
  const current = leaderboardAppearance(mod)
  const next = {
    ...current,
    ...patch,
    usernameColors: patch.usernameColors && typeof patch.usernameColors === 'object' && !Array.isArray(patch.usernameColors)
      ? patch.usernameColors
      : current.usernameColors,
    numberColorKeys: Array.isArray(patch.numberColorKeys) ? patch.numberColorKeys : current.numberColorKeys,
    backgroundImage: patch.backgroundImage && typeof patch.backgroundImage === 'object'
      ? { ...current.backgroundImage, ...patch.backgroundImage }
      : current.backgroundImage,
    titleOutline: patch.titleOutline && typeof patch.titleOutline === 'object'
      ? { ...current.titleOutline, ...patch.titleOutline }
      : current.titleOutline,
    participantOutline: patch.participantOutline && typeof patch.participantOutline === 'object'
      ? { ...current.participantOutline, ...patch.participantOutline }
      : current.participantOutline,
    scoreOutline: patch.scoreOutline && typeof patch.scoreOutline === 'object'
      ? { ...current.scoreOutline, ...patch.scoreOutline }
      : current.scoreOutline,
    autoHide: patch.autoHide && typeof patch.autoHide === 'object'
      ? { ...current.autoHide, ...patch.autoHide }
      : current.autoHide,
  }
  patchMod(mod.id, { appearance: next })
}

function patchLeaderboardBackgroundImage(mod, patch) {
  patchLeaderboardAppearance(mod, {
    backgroundImage: {
      ...leaderboardAppearance(mod).backgroundImage,
      ...patch,
    },
  })
}

function patchLeaderboardTextOutline(mod, key, patch) {
  patchLeaderboardAppearance(mod, {
    [key]: {
      ...leaderboardAppearance(mod)[key],
      ...patch,
    },
  })
}

function leaderboardFocusSnapshot(mod) {
  const sorted = sortedLeaderboardParticipants(mod)
  const focusId = mod?.focusParticipantId
  const rankIndex = Math.max(0, sorted.findIndex(participant => participant.id === focusId))
  const participant = sorted[rankIndex] ?? null
  return {
    participant,
    rank: sorted.length === 0 ? 0 : rankIndex + 1,
    total: sorted.length,
    formattedScore: formatLeaderboardScore(participant?.score ?? 0, mod?.scoreType),
  }
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

function leaderboardUsernameColor(mod, participantId) {
  const appearance = leaderboardAppearance(mod)
  return appearance.usernameColors[participantId] ?? appearance.defaultUsernameColor
}

function hasLeaderboardUsernameColor(mod, participantId) {
  return Object.prototype.hasOwnProperty.call(leaderboardAppearance(mod).usernameColors, participantId)
}

function setLeaderboardUsernameColor(mod, participantId, color) {
  const appearance = leaderboardAppearance(mod)
  patchLeaderboardAppearance(mod, {
    usernameColors: {
      ...appearance.usernameColors,
      [participantId]: color,
    },
  })
}

function clearLeaderboardUsernameColor(mod, participantId) {
  const appearance = leaderboardAppearance(mod)
  const next = { ...appearance.usernameColors }
  delete next[participantId]
  patchLeaderboardAppearance(mod, { usernameColors: next })
}

function addLeaderboardNumberColorKey(mod) {
  const appearance = leaderboardAppearance(mod)
  const nextPosition = (appearance.numberColorKeys[appearance.numberColorKeys.length - 1]?.position ?? 0) + 1
  patchLeaderboardAppearance(mod, {
    numberColorKeys: [...appearance.numberColorKeys, { position: nextPosition, color: '#82b1ff' }],
  })
}

function setLeaderboardNumberColorKey(mod, keyIdx, patch) {
  const appearance = leaderboardAppearance(mod)
  const next = appearance.numberColorKeys.map((item, idx) => (idx === keyIdx ? { ...item, ...patch } : item))
  patchLeaderboardAppearance(mod, { numberColorKeys: next })
}

function removeLeaderboardNumberColorKey(mod, keyIdx) {
  const appearance = leaderboardAppearance(mod)
  patchLeaderboardAppearance(mod, {
    numberColorKeys: appearance.numberColorKeys.filter((_, idx) => idx !== keyIdx),
  })
}

function leaderboardDefaultStep(mod) {
  return mod?.scoreType === 'time' ? 1000 : 1
}

function patchLeaderboardParticipants(mod, participants, extraPatch = {}) {
  patchMod(mod.id, { ...extraPatch, participants })
}

function adjustLeaderboardScore(mod, direction) {
  const snapshot = leaderboardFocusSnapshot(mod)
  const participant = snapshot.participant
  if (!participant) return
  const step = steps[mod.id] ?? leaderboardDefaultStep(mod)
  const participants = (mod.participants ?? []).map(item =>
    item.id === participant.id ? { ...item, score: (item.score ?? 0) + direction * step } : item
  )
  patchLeaderboardParticipants(mod, participants)
}

function setLeaderboardScore(mod, forceValue = null) {
  const snapshot = leaderboardFocusSnapshot(mod)
  const participant = snapshot.participant
  if (!participant) return
  const value = forceValue === null ? Number(setVals[mod.id]) : forceValue
  if (!Number.isFinite(value)) return
  setVals[mod.id] = ''
  const participants = (mod.participants ?? []).map(item =>
    item.id === participant.id ? { ...item, score: value } : item
  )
  patchLeaderboardParticipants(mod, participants)
}

function updateLeaderboardParticipant(mod, participantId, patch) {
  const participants = (mod.participants ?? []).map((participant, idx) => {
    if (participant.id !== participantId) return participant
    const currentBackdrop = leaderboardArt(participant.backdropImage)
    const username = typeof patch.username === 'string'
      ? (patch.username.trim() || `Player ${idx + 1}`)
      : participant.username
    const score = typeof patch.score === 'number' && Number.isFinite(patch.score) ? patch.score : participant.score
    const iconSrc = typeof patch.iconSrc === 'string' ? patch.iconSrc : (participant.iconSrc ?? '')
    const iconBlurPx = typeof patch.iconBlurPx === 'number' && Number.isFinite(patch.iconBlurPx) && patch.iconBlurPx >= 0
      ? patch.iconBlurPx
      : (typeof participant.iconBlurPx === 'number' && Number.isFinite(participant.iconBlurPx) && participant.iconBlurPx >= 0
        ? participant.iconBlurPx
        : 0)
    const backdropImage = patch.backdropImage && typeof patch.backdropImage === 'object'
      ? { ...currentBackdrop, ...patch.backdropImage }
      : currentBackdrop
    return { ...participant, username, score, iconSrc, iconBlurPx, backdropImage }
  })
  patchLeaderboardParticipants(mod, participants)
}

function addLeaderboardParticipant(mod) {
  const participants = Array.isArray(mod.participants) ? [...mod.participants] : []
  participants.push({
    id: `participant-${Math.random().toString(36).slice(2, 10)}`,
    username: `Player ${participants.length + 1}`,
    score: 0,
  })
  const focusParticipantId = mod.focusParticipantId || participants[0]?.id || ''
  patchLeaderboardParticipants(mod, participants, { focusParticipantId })
}

function removeLeaderboardParticipant(mod, participantId) {
  const participants = (mod.participants ?? []).filter(participant => participant.id !== participantId)
  if (participants.length === 0) return
  const focusParticipantId = participants.some(participant => participant.id === mod.focusParticipantId)
    ? mod.focusParticipantId
    : participants[0].id
  patchLeaderboardParticipants(mod, participants, { focusParticipantId })
}

async function patchPopupSettings(patch) {
  if (typeof patch.x === 'number' && Number.isFinite(patch.x)) popupSettings.x = patch.x
  if (typeof patch.y === 'number' && Number.isFinite(patch.y)) popupSettings.y = patch.y
  if (typeof patch.hiddenVisual === 'boolean') popupSettings.hiddenVisual = patch.hiddenVisual
  if (typeof patch.defaultPlayMusic === 'boolean') popupSettings.defaultPlayMusic = patch.defaultPlayMusic
  if (typeof patch.normalizeVolume === 'boolean') popupSettings.normalizeVolume = patch.normalizeVolume
  if (typeof patch.normalizedVolumePct === 'number' && Number.isFinite(patch.normalizedVolumePct)) {
    popupSettings.normalizedVolumePct = Math.max(0, Math.min(100, patch.normalizedVolumePct))
  }
  if (patch.animation && typeof patch.animation === 'object') {
    if (typeof patch.animation.songStartShowSec === 'number' && Number.isFinite(patch.animation.songStartShowSec)) {
      popupSettings.animation.songStartShowSec = patch.animation.songStartShowSec
    }
    if (typeof patch.animation.songEndShowSec === 'number' && Number.isFinite(patch.animation.songEndShowSec)) {
      popupSettings.animation.songEndShowSec = patch.animation.songEndShowSec
    }
    if (typeof patch.animation.periodicIntervalSec === 'number' && Number.isFinite(patch.animation.periodicIntervalSec)) {
      popupSettings.animation.periodicIntervalSec = patch.animation.periodicIntervalSec
    }
    if (typeof patch.animation.periodicShowSec === 'number' && Number.isFinite(patch.animation.periodicShowSec)) {
      popupSettings.animation.periodicShowSec = patch.animation.periodicShowSec
    }
    if (typeof patch.animation.transitionDurationSec === 'number' && Number.isFinite(patch.animation.transitionDurationSec)) {
      popupSettings.animation.transitionDurationSec = patch.animation.transitionDurationSec
    }
    if (typeof patch.animation.motionDirection === 'string') {
      popupSettings.animation.motionDirection = patch.animation.motionDirection
    }
    if (typeof patch.animation.motionDistancePx === 'number' && Number.isFinite(patch.animation.motionDistancePx)) {
      popupSettings.animation.motionDistancePx = patch.animation.motionDistancePx
    }
    if (typeof patch.animation.motionInterpolation === 'string') {
      popupSettings.animation.motionInterpolation = patch.animation.motionInterpolation
    }
  }

  try {
    const res = await fetch(`/api/overlays/${encodeURIComponent(editingId.value)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nowPlayingPopup: patch }),
    })
    const data = await res.json()
    applyPopupSettings(data.nowPlayingPopup ?? {})
    const ov = overlayList.value.find(o => o.id === editingId.value)
    if (ov) ov.nowPlayingPopup = data.nowPlayingPopup
    if (typeof patch.defaultPlayMusic === 'boolean') {
      await fetchMusicState()
    }
  } catch (err) {
    console.warn('[dashboard] Failed to patch popup settings:', err)
    try { await fetchOverlayState(editingId.value) } catch (refreshErr) {
      console.warn('[dashboard] Failed to refresh overlay state after popup settings patch failure:', refreshErr)
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem 3rem;
  font-family: sans-serif;
  overflow-y: auto;
  box-sizing: border-box;
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem;
  color: #ffffff;
}

/* ── Overlay nav ─────────────────────────────────────── */
.overlay-nav {
  width: 100%;
  max-width: 720px;
  margin-bottom: 1.5rem;
}

.overlay-tabs {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: flex-end;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 0;
}

.overlay-tab {
  background: #181818;
  border: 1px solid #303030;
  border-bottom: none;
  color: #757575;
  border-radius: 6px 6px 0 0;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.overlay-tab:hover { background: #222; color: #bdbdbd; }
.tab-selected      { background: #2a2a2a; color: #ffffff; border-color: #555; }
.tab-new           { color: #424242; font-size: 1.1rem; padding: 0.25rem 0.65rem; }
.tab-new:hover     { color: #9e9e9e; }

.live-dot { color: #66bb6a; font-size: 0.7rem; }

.overlay-actions {
  display: flex;
  gap: 0.4rem;
  padding: 0.4rem 0 0;
}

.action-btn {
  font-size: 0.78rem;
  padding: 0.22rem 0.55rem;
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.action-btn:hover         { background: #282828; }
.action-activate          { color: #66bb6a; border-color: #2e5c30; }
.action-activate:hover    { background: #1a2e1c; }
.action-delete            { color: #ef9a9a; border-color: #614040; }
.action-delete:hover      { background: #2a1a1a; }
.action-hide              { color: #9e9e9e; }
.action-show              { color: #ffd54f; border-color: #5c4a1a; }
.action-show:hover        { background: #2a240f; }
.action-edit-active       { color: #82b1ff; border-color: #2a4070; background: #141e33; }
.action-edit-active:hover { background: #182340; }

.overlay-rename-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0 0;
}

.music-panel {
  width: 100%;
  max-width: 720px;
  margin-bottom: 1.2rem;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0.8rem 0.9rem;
  background: #151515;
}

.music-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.music-header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.music-header-row h2 {
  margin: 0;
  font-size: 1rem;
  color: #e0e0e0;
}

.music-status {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.music-playing {
  color: #66bb6a;
  border-color: #2e5c30;
  background: #132014;
}

.music-paused {
  color: #ffd54f;
  border-color: #5c4a1a;
  background: #231f10;
}

.music-now-playing {
  margin-bottom: 0.55rem;
}

.music-line {
  margin: 0.1rem 0;
  font-size: 0.85rem;
  color: #bdbdbd;
}

.music-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.music-inline-option {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #bdbdbd;
}

.music-inline-number {
  width: 4rem;
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.22rem 0.35rem;
  font-size: 0.8rem;
}

.music-inline-number:disabled {
  opacity: 0.45;
}

.music-controls .action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.music-help {
  margin: 0;
  color: #9e9e9e;
  font-size: 0.75rem;
  line-height: 1.45;
}

.music-help code {
  color: #82b1ff;
}

.music-edit-panel {
  margin-top: 0.75rem;
}

.checkbox-row {
  grid-template-columns: 1fr auto;
}

.rename-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.9rem;
  width: 12rem;
}

/* ── Module grid ─────────────────────────────────────── */
.module-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  width: 100%;
  margin-bottom: 1rem;
}

.module-card {
  flex: 0 0 300px;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 0 0.85rem 0.85rem;
  transition: opacity 0.2s, border-color 0.2s;
}

.mod-is-hidden {
  opacity: 0.5;
  border-color: #1e1e1e;
}

/* ── Card header ─────────────────────────────────────── */
.module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0 0.5rem;
  border-bottom: 1px solid #2a2a2a;
  gap: 0.4rem;
  min-width: 0;
}

.module-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #bdbdbd;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.hidden-badge {
  display: inline-block;
  font-size: 0.65rem;
  color: #ffd54f;
  background: #2a240f;
  border: 1px solid #5c4a1a;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  letter-spacing: 0.05em;
}

.card-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ── Counter section (progressBar always-visible) ────── */
.counter-section {
  padding: 0.7rem 0 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.leaderboard-section {
  padding: 0.7rem 0 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.leaderboard-rank {
  margin: 0;
  font-size: 0.75rem;
  color: #9e9e9e;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.leaderboard-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #e0e0e0;
}

.leaderboard-score {
  margin: 0 0 0.15rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #82b1ff;
}

.count {
  font-size: 3rem;
  font-weight: bold;
  margin: 0;
  line-height: 1;
  color: #82b1ff;
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

.step-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.35rem 0.4rem;
  font-size: 0.9rem;
  width: 3.8rem;
  text-align: center;
}

.set-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.9rem;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.edit-unit {
  font-size: 0.75rem;
  color: #757575;
  flex-shrink: 0;
}

.alpha-input {
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.25rem 0.35rem;
  font-size: 0.8rem;
  width: 3.5rem;
  text-align: center;
}

/* ── Edit panel ──────────────────────────────────────── */
.edit-panel {
  padding: 0.6rem 0 0;
  border-top: 1px solid #2a2a2a;
  margin-top: 0.55rem;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.45rem;
}

.edit-label {
  font-size: 0.8rem;
  color: #9e9e9e;
  width: 5rem;
  flex-shrink: 0;
}

.edit-sub {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #424242;
  margin: 0.55rem 0 0.3rem;
}

.wide-input {
  flex: 1;
  min-width: 0;
  width: auto !important;
}

.reset-sm {
  background: #1e1e1e;
  color: #9e9e9e;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  padding: 0.2rem 0.45rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.reset-sm:hover { background: #1a1a1a; }

.edit-note {
  font-size: 0.75rem;
  color: #616161;
  margin: 0 0 0.4rem;
  font-style: italic;
}

.participant-block {
  margin-bottom: 0.35rem;
}

.participant-main-row {
  display: grid;
  grid-template-columns: auto 1fr 5.6rem auto;
  gap: 0.4rem;
  align-items: center;
}

.participant-extra-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.3rem 0.3rem 0.1rem 1.4rem;
  border-left: 2px solid #2a2a2a;
  margin-left: 0.2rem;
}

.participant-extra-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.participant-extra-edit-row {
  margin-bottom: 0;
}

.participant-art-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.4rem 0.8rem;
}

.participant-expand-btn {
  padding: 0.18rem 0.45rem;
  font-size: 1rem;
  line-height: 1;
}

.leaderboard-keyvalue-row {
  display: grid;
  grid-template-columns: 4.5rem 1fr auto auto;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.4rem;
}

.participant-score-input {
  width: 100%;
  min-width: 0;
}

.participant-rank {
  font-size: 0.75rem;
  color: #757575;
}

.participant-default-pill {
  font-size: 0.7rem;
  color: #757575;
}

.participant-focus-btn {
  color: #82b1ff;
  border-color: #2a4070;
  background: #141e33;
}

/* ── Add module row ──────────────────────────────────── */
.add-module-row {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.module-type-select {
  background: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #424242;
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.add-module-btn {
  font-size: 0.85rem;
  padding: 0.45rem 1.4rem;
  background: #1e1e1e;
  color: #66bb6a;
  border: 1px solid #2e5c30;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.add-module-btn:hover { background: #1a2e1c; }

.hint {
  font-size: 0.8rem;
  color: #424242;
  margin-top: 1.5rem;
}

.brand-reset-link {
  color: #7e57c2;
  text-decoration: none;
  font-size: 0.75rem;
  margin-left: 0.25rem;
  opacity: 0.6;
  cursor: pointer;
}

.brand-reset-link:hover {
  opacity: 1;
}

/* ── Chat module ─────────────────────────────────────── */
.chat-status-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
}

.chat-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.chat-disconnected { background: #757575; }
.chat-connecting   { background: #ffa726; }
.chat-connected    { background: #66bb6a; }
.chat-failed       { background: #ef5350; }

.chat-status-label {
  font-weight: 600;
}

.chat-connection-state {
  font-size: 0.8rem;
  color: #757575;
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
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
  word-break: break-word;
}

.chat-preview-user {
  font-weight: 700;
  flex-shrink: 0;
}

.chat-preview-colon {
  color: #757575;
  flex-shrink: 0;
}

.chat-preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-preview-empty {
  color: #616161;
  font-style: italic;
  padding: 0.5rem 0;
}

.chat-credential-note {
  font-size: 0.8rem;
  color: #b0bec5;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  padding: 0.5rem 0.7rem;
  margin-bottom: 0.5rem;
}

.chat-credential-note ol {
  margin: 0.3rem 0 0 1.2rem;
  padding: 0;
}

.chat-credential-note li {
  margin-bottom: 0.2rem;
}

.chat-credential-note a {
  color: #82b1ff;
}

.chat-credential-note code {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.85em;
}

.chat-connect-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
