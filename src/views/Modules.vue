<template>
  <div class="modules">
    <h1>Modules</h1>

    <section class="section">
      <h2 class="section-title">ProgressBar Defaults</h2>
      <p class="hint-inline">Applied when adding a new ProgressBar module.</p>

      <div class="row">
        <label class="field-label">Label</label>
        <input type="text" :value="defaults.progressBar.label" @change="patch('progressBar', { label: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Goal</label>
        <input type="number" min="1" :value="defaults.progressBar.max" @change="patch('progressBar', { max: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input type="color" :value="defaults.progressBar.color" @input="patch('progressBar', { color: $event.target.value })" />
      </div>

      <p class="sub-title">Bar</p>
      <div v-for="f in barFields" :key="'pb'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.bar[f.key]" @change="patch('progressBar', { bar: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Title</p>
      <div v-for="f in titleFields" :key="'pt'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.title[f.key]" @change="patch('progressBar', { title: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Value</p>
      <div v-for="f in valueFields" :key="'pv'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.value[f.key]" @change="patch('progressBar', { value: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in transformFields" :key="'pp'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.progressBar.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patch('progressBar', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.progressBar.opacity ?? 1" @change="patch('progressBar', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.progressBar.background?.backgroundColor ?? '#000000'" @input="patch('progressBar', { background: { ...defaults.progressBar.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.progressBar.background?.backgroundAlpha ?? 0" @change="patch('progressBar', { background: { ...defaults.progressBar.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.progressBar.background?.borderColor ?? '#ffffff'" @input="patch('progressBar', { background: { ...defaults.progressBar.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.progressBar.background?.borderAlpha ?? 0" @change="patch('progressBar', { background: { ...defaults.progressBar.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>

      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.progressBar.animation?.transitionDurationSec ?? 0.35" @change="patch('progressBar', { animation: { ...defaults.progressBar.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.progressBar.animation?.motionDirection ?? 'none'" @change="patch('progressBar', { animation: { ...defaults.progressBar.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.progressBar.animation?.motionDistancePx ?? 14" @change="patch('progressBar', { animation: { ...defaults.progressBar.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.progressBar.animation?.motionInterpolation ?? 'linear'" @change="patch('progressBar', { animation: { ...defaults.progressBar.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Image Module Defaults</h2>
      <p class="hint-inline">Applied when adding a new Image module.</p>

      <div class="row">
        <label class="field-label">Image Path</label>
        <input type="text" class="wide-input" :value="defaults.image.src" @change="patch('image', { src: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Alt Text</label>
        <input type="text" class="wide-input" :value="defaults.image.alt" @change="patch('image', { alt: $event.target.value })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in transformFields" :key="'im'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.image.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patch('image', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.image.opacity ?? 1" @change="patch('image', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.image.background?.backgroundColor ?? '#000000'" @input="patch('image', { background: { ...defaults.image.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.image.background?.backgroundAlpha ?? 0" @change="patch('image', { background: { ...defaults.image.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.image.background?.borderColor ?? '#ffffff'" @input="patch('image', { background: { ...defaults.image.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.image.background?.borderAlpha ?? 0" @change="patch('image', { background: { ...defaults.image.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>

      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.image.animation?.transitionDurationSec ?? 0.35" @change="patch('image', { animation: { ...defaults.image.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.image.animation?.motionDirection ?? 'none'" @change="patch('image', { animation: { ...defaults.image.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.image.animation?.motionDistancePx ?? 14" @change="patch('image', { animation: { ...defaults.image.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.image.animation?.motionInterpolation ?? 'linear'" @change="patch('image', { animation: { ...defaults.image.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Text Module Defaults</h2>
      <p class="hint-inline">Applied when adding a new Text module.</p>

      <div class="row">
        <label class="field-label">Text</label>
        <input type="text" class="wide-input" :value="defaults.text.text" @change="patch('text', { text: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input type="color" :value="defaults.text.color" @input="patch('text', { color: $event.target.value })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in textTransformFields" :key="'tx'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.text.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : (f.key === 'fontSize' ? 32 : 0))" @change="patch('text', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.text.opacity ?? 1" @change="patch('text', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.text.background?.backgroundColor ?? '#000000'" @input="patch('text', { background: { ...defaults.text.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.text.background?.backgroundAlpha ?? 0" @change="patch('text', { background: { ...defaults.text.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.text.background?.borderColor ?? '#ffffff'" @input="patch('text', { background: { ...defaults.text.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.text.background?.borderAlpha ?? 0" @change="patch('text', { background: { ...defaults.text.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>

      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.text.animation?.transitionDurationSec ?? 0.35" @change="patch('text', { animation: { ...defaults.text.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.text.animation?.motionDirection ?? 'none'" @change="patch('text', { animation: { ...defaults.text.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.text.animation?.motionDistancePx ?? 14" @change="patch('text', { animation: { ...defaults.text.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.text.animation?.motionInterpolation ?? 'linear'" @change="patch('text', { animation: { ...defaults.text.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Leaderboard Module Defaults</h2>
      <p class="hint-inline">Applied when adding a new Leaderboard module.</p>

      <div class="row">
        <label class="field-label">Title</label>
        <input type="text" class="wide-input" :value="defaults.leaderboard.name" @change="patch('leaderboard', { name: $event.target.value })" />
      </div>

      <div class="row">
        <label class="field-label">Score Type</label>
        <select :value="defaults.leaderboard.scoreType" @change="patch('leaderboard', { scoreType: $event.target.value })">
          <option value="number">Number</option>
          <option value="time">Time (ms)</option>
        </select>
      </div>

      <div class="row">
        <label class="field-label">Top Rows</label>
        <input type="number" min="1" :value="defaults.leaderboard.topCount" @change="patch('leaderboard', { topCount: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Neighbor Rows</label>
        <input type="number" min="0" :value="defaults.leaderboard.neighborCount" @change="patch('leaderboard', { neighborCount: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Focus User ID</label>
        <input type="text" class="wide-input" :value="defaults.leaderboard.focusParticipantId" @change="patch('leaderboard', { focusParticipantId: $event.target.value })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in leaderboardTransformFields" :key="'lb'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.leaderboard.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patch('leaderboard', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.leaderboard.opacity ?? 1" @change="patch('leaderboard', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.leaderboard.background?.backgroundColor ?? '#000000'" @input="patch('leaderboard', { background: { ...defaults.leaderboard.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.leaderboard.background?.backgroundAlpha ?? 0" @change="patch('leaderboard', { background: { ...defaults.leaderboard.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.leaderboard.background?.borderColor ?? '#ffffff'" @input="patch('leaderboard', { background: { ...defaults.leaderboard.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.leaderboard.background?.borderAlpha ?? 0" @change="patch('leaderboard', { background: { ...defaults.leaderboard.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>

      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.leaderboard.animation?.transitionDurationSec ?? 0.35" @change="patch('leaderboard', { animation: { ...defaults.leaderboard.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.leaderboard.animation?.motionDirection ?? 'none'" @change="patch('leaderboard', { animation: { ...defaults.leaderboard.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.leaderboard.animation?.motionDistancePx ?? 14" @change="patch('leaderboard', { animation: { ...defaults.leaderboard.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.leaderboard.animation?.motionInterpolation ?? 'linear'" @change="patch('leaderboard', { animation: { ...defaults.leaderboard.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Timer Defaults</h2>
      <p class="hint-inline">Applied when adding a new Timer module.</p>

      <div class="row">
        <label class="field-label">Mode</label>
        <select :value="defaults.timer.mode" @change="patch('timer', { mode: $event.target.value })">
          <option value="countdown">Countdown</option>
          <option value="countup">Count Up</option>
        </select>
      </div>

      <div class="row">
        <label class="field-label">Precision</label>
        <select :value="defaults.timer.precision" @change="patch('timer', { precision: $event.target.value })">
          <option value="millis">Milliseconds (.mmm)</option>
          <option value="hundredths">Hundredths (.xx)</option>
          <option value="tenths">Tenths (.x)</option>
          <option value="seconds">Seconds</option>
          <option value="minutes">Minutes</option>
        </select>
      </div>

      <div class="row">
        <label class="field-label">Max Unit</label>
        <select :value="defaults.timer.maxUnit ?? 'auto'" @change="patch('timer', { maxUnit: $event.target.value })">
          <option value="auto">Auto (days/hours/minutes/sec)</option>
          <option value="hours">Hours (HH:MM:SS)</option>
          <option value="minutes">Minutes (MM:SS)</option>
          <option value="seconds">Seconds (S)</option>
        </select>
      </div>

      <div class="row">
        <label class="field-label">Target Type</label>
        <select :value="defaults.timer.targetType" @change="patch('timer', { targetType: $event.target.value })">
          <option value="duration">Duration</option>
          <option value="datetime">Date/Time</option>
        </select>
      </div>

      <div class="row">
        <label class="field-label">Duration (ms)</label>
        <input type="number" min="1" step="1000" :value="defaults.timer.duration" @change="patch('timer', { duration: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Max Duration (ms, 0=unlimited)</label>
        <input type="number" min="0" step="1000" :value="defaults.timer.maxDuration" @change="patch('timer', { maxDuration: $event.target.valueAsNumber })" />
      </div>

      <div class="row">
        <label class="field-label">Color</label>
        <input type="color" :value="defaults.timer.color" @input="patch('timer', { color: $event.target.value })" />
      </div>

      <p class="sub-title">Transform</p>
      <div v-for="f in textTransformFields" :key="'tt'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.timer.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : (f.key === 'fontSize' ? 48 : 0))" @change="patch('timer', { transform: { ...defaults.timer.transform, [f.key]: $event.target.valueAsNumber } })" />
      </div>

      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.timer.opacity ?? 1" @change="patch('timer', { opacity: $event.target.valueAsNumber })" />
      </div>

      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.timer.background?.backgroundColor ?? '#000000'" @input="patch('timer', { background: { ...defaults.timer.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.timer.background?.backgroundAlpha ?? 0" @change="patch('timer', { background: { ...defaults.timer.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.timer.background?.borderColor ?? '#ffffff'" @input="patch('timer', { background: { ...defaults.timer.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" :value="defaults.timer.background?.borderAlpha ?? 0" @change="patch('timer', { background: { ...defaults.timer.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>

      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.timer.animation?.transitionDurationSec ?? 0.35" @change="patch('timer', { animation: { ...defaults.timer.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.timer.animation?.motionDirection ?? 'none'" @change="patch('timer', { animation: { ...defaults.timer.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.timer.animation?.motionDistancePx ?? 14" @change="patch('timer', { animation: { ...defaults.timer.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.timer.animation?.motionInterpolation ?? 'linear'" @change="patch('timer', { animation: { ...defaults.timer.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Chat Defaults</h2>
      <p class="hint-inline">Applied when adding a new Twitch Chat module.</p>

      <div class="row">
        <label class="field-label">Platform</label>
        <select :value="defaults.chat.platform" @change="patch('chat', { platform: $event.target.value })">
          <option value="twitch">Twitch</option>
          <option value="youtube" disabled>YouTube (Coming Soon)</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Prefix</label>
        <input type="text" class="wide-input" placeholder="Twitch" :value="defaults.chat.prefix" @change="patch('chat', { prefix: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Message Limit</label>
        <input type="number" min="1" max="500" :value="defaults.chat.messageLimit" @change="patch('chat', { messageLimit: $event.target.valueAsNumber })" />
      </div>
      <div class="row">
        <label class="field-label">Fade Out (sec)</label>
        <input type="number" min="0" :value="defaults.chat.fadeOutSec" @change="patch('chat', { fadeOutSec: $event.target.valueAsNumber })" />
      </div>
      <div class="row">
        <label class="field-label">Max Lines</label>
        <input type="number" min="-1" step="1" :value="defaults.chat.maxLines" @change="patchSafeInt('chat', 'maxLines', $event.target.value)" />
      </div>
      <div class="row">
        <label class="field-label">Show Badges</label>
        <input type="checkbox" :checked="defaults.chat.showBadges" @change="patch('chat', { showBadges: $event.target.checked })" />
      </div>
      <div class="row">
        <label class="field-label">Show Timestamps</label>
        <input type="checkbox" :checked="defaults.chat.showTimestamps" @change="patch('chat', { showTimestamps: $event.target.checked })" />
      </div>
      <div class="row">
        <label class="field-label">Font Size</label>
        <input type="number" min="8" max="72" :value="defaults.chat.fontSize" @change="patch('chat', { fontSize: $event.target.valueAsNumber })" />
      </div>
      <div class="row">
        <label class="field-label">Username Color</label>
        <input type="color" :value="defaults.chat.usernameColor" @input="patch('chat', { usernameColor: $event.target.value })" />
      </div>
      <div class="row">
        <label class="field-label">Message Color</label>
        <input type="color" :value="defaults.chat.messageColor" @input="patch('chat', { messageColor: $event.target.value })" />
      </div>
      <p class="sub-title">Transform</p>
      <div v-for="f in transformFields" :key="'ch'+f.key" class="row">
        <label class="field-label">{{ f.label }}</label>
        <input type="number" :step="f.step" :value="defaults.chat.transform?.[f.key] ?? (f.key.startsWith('scale') ? 1 : 0)" @change="patch('chat', { transform: { [f.key]: $event.target.valueAsNumber } })" />
      </div>
      <p class="sub-title">Opacity</p>
      <div class="row">
        <label class="field-label">Opacity</label>
        <input type="number" step="0.05" min="0" max="1" :value="defaults.chat.opacity" @change="patch('chat', { opacity: $event.target.valueAsNumber })" />
      </div>
      <p class="sub-title">Background</p>
      <div class="row">
        <label class="field-label">Background</label>
        <input type="color" :value="defaults.chat.background.backgroundColor" @input="patch('chat', { background: { ...defaults.chat.background, backgroundColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" class="alpha-input" :value="defaults.chat.background.backgroundAlpha" @change="patch('chat', { background: { ...defaults.chat.background, backgroundAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <div class="row">
        <label class="field-label">Border</label>
        <input type="color" :value="defaults.chat.background.borderColor" @input="patch('chat', { background: { ...defaults.chat.background, borderColor: $event.target.value } })" />
        <input type="number" min="0" max="255" step="1" class="alpha-input" :value="defaults.chat.background.borderAlpha" @change="patch('chat', { background: { ...defaults.chat.background, borderAlpha: $event.target.valueAsNumber } })" title="Alpha (0–255)" />
      </div>
      <p class="sub-title">Animation</p>
      <div class="row">
        <label class="field-label">Duration (sec)</label>
        <input type="number" min="0" step="0.05" :value="defaults.chat.animation.transitionDurationSec" @change="patch('chat', { animation: { ...defaults.chat.animation, transitionDurationSec: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Motion Direction</label>
        <select :value="defaults.chat.animation.motionDirection" @change="patch('chat', { animation: { ...defaults.chat.animation, motionDirection: $event.target.value } })">
          <option value="none">None (fade only)</option>
          <option value="up">Vertical Up</option>
          <option value="down">Vertical Down</option>
          <option value="left">Horizontal Left</option>
          <option value="right">Horizontal Right</option>
        </select>
      </div>
      <div class="row">
        <label class="field-label">Distance (px)</label>
        <input type="number" min="0" step="1" :value="defaults.chat.animation.motionDistancePx" @change="patch('chat', { animation: { ...defaults.chat.animation, motionDistancePx: $event.target.valueAsNumber } })" />
      </div>
      <div class="row">
        <label class="field-label">Interpolation</label>
        <select :value="defaults.chat.animation.motionInterpolation" @change="patch('chat', { animation: { ...defaults.chat.animation, motionInterpolation: $event.target.value } })">
          <option value="linear">Linear</option>
          <option value="quadratic">Quadratic</option>
          <option value="exponential">Exponential</option>
        </select>
      </div>
    </section>

    <button class="reset-factory-btn" @click="resetFactory">Reset All to Factory Defaults</button>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

const factoryDefaults = {
  progressBar: {
    label: 'Counter',
    max: 100,
    color: '#82b1ff',
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    bar: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    title: { x: 0, y: 0, fontSize: 16 },
    value: { x: 0, y: 0, fontSize: 14 },
    background: { backgroundColor: '#000000', backgroundAlpha: 0, borderColor: '#ffffff', borderAlpha: 0 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  },
  image: {
    src: '/sample-module-image.svg',
    alt: 'Sample module image',
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    background: { backgroundColor: '#000000', backgroundAlpha: 0, borderColor: '#ffffff', borderAlpha: 0 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  },
  text: {
    text: 'Sample text',
    color: '#ffffff',
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 32 },
    background: { backgroundColor: '#000000', backgroundAlpha: 0, borderColor: '#ffffff', borderAlpha: 0 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  },
  leaderboard: {
    name: 'Leaderboard',
    scoreType: 'number',
    topCount: 3,
    neighborCount: 2,
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    background: { backgroundColor: '#000000', backgroundAlpha: 0, borderColor: '#ffffff', borderAlpha: 0 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
    appearance: {
      showRankNumbers: true,
      textColor: '#ffffff',
      defaultUsernameColor: '#ffffff',
      usernameColors: {},
      numberColorMode: 'solid',
      numberColor: '#82b1ff',
      numberColorKeys: [],
      focusHighlightColor: '#82b1ff',
      focusHighlightAlpha: 255,
      bestHighlightColor: '#ffd700',
      goodHighlightColor: '#4caf50',
      badHighlightColor: '#f44336',
    },
    focusParticipantId: 'streamer',
    participants: [
      { id: 'streamer', username: 'Streamer', score: 50 },
      { id: 'challenger-1', username: 'Rival One', score: 65 },
      { id: 'challenger-2', username: 'Rival Two', score: 42 },
      { id: 'challenger-3', username: 'Rival Three', score: 31 },
    ],
  },
  timer: {
    mode: 'countdown',
    precision: 'hundredths',
    targetType: 'duration',
    duration: 300000,
    maxDuration: 0,
    color: '#ffffff',
    maxUnit: 'auto',
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, fontSize: 48 },
    background: { backgroundColor: '#000000', backgroundAlpha: 199, borderColor: '#ffffff', borderAlpha: 36 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  },
  chat: {
    platform: 'twitch',
    prefix: 'Twitch',
    messageLimit: 50,
    fadeOutSec: 30,
    showBadges: true,
    showTimestamps: false,
    fontSize: 18,
    usernameColor: '#ffffff',
    messageColor: '#ffffff',
    maxLines: 0,
    opacity: 1,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    background: { backgroundColor: '#000000', backgroundAlpha: 153, borderColor: '#ffffff', borderAlpha: 51 },
    animation: { transitionDurationSec: 0.35, motionDirection: 'none', motionDistancePx: 14, motionInterpolation: 'linear' },
  },
}

const defaults = reactive(JSON.parse(JSON.stringify(factoryDefaults)))

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
const textTransformFields = [
  { key: 'x',        label: 'X Offset',  step: 1 },
  { key: 'y',        label: 'Y Offset',  step: 1 },
  { key: 'scaleX',   label: 'Scale X',   step: 0.1 },
  { key: 'scaleY',   label: 'Scale Y',   step: 0.1 },
  { key: 'fontSize', label: 'Font Size', step: 1 },
]
const leaderboardTransformFields = [
  { key: 'x',      label: 'X Offset', step: 1 },
  { key: 'y',      label: 'Y Offset', step: 1 },
  { key: 'scaleX', label: 'Scale X',  step: 0.1 },
  { key: 'scaleY', label: 'Scale Y',  step: 0.1 },
]

function mergeInto(target, source) {
  for (const [k, v] of Object.entries(source ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) ? target[k] : {}
      mergeInto(target[k], v)
    } else {
      target[k] = v
    }
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/defaults')
    const data = await res.json()
    mergeInto(defaults, data)
  } catch (err) {
    console.warn('[modules] Failed to load defaults:', err)
  }
})

function patchSafeInt(type, key, rawValue) {
  const v = parseInt(rawValue, 10)
  if (Number.isFinite(v)) patch(type, { [key]: v })
}

async function patch(type, patchObj) {
  mergeInto(defaults[type], patchObj)
  try {
    const res = await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: patchObj }),
    })
    const data = await res.json()
    if (data?.[type]) mergeInto(defaults[type], data[type])
  } catch (err) {
    console.warn('[modules] Failed to save defaults:', err)
  }
}

async function resetFactory() {
  try {
    const res = await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(factoryDefaults),
    })
    const data = await res.json()
    mergeInto(defaults, data)
  } catch (err) {
    console.warn('[modules] Failed to reset defaults:', err)
  }
}
</script>

<style scoped>
.modules {
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.5rem;
  font-family: sans-serif;
  overflow-y: auto;
  box-sizing: border-box;
}

h1 {
  font-size: 2rem;
  margin: 0 0 1rem;
  color: #ffffff;
}

.section {
  width: 100%;
  max-width: 720px;
  border-top: 1px solid #2a2a2a;
  padding: 1.25rem 0;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #616161;
  margin: 0 0 0.5rem;
}

.hint-inline {
  font-size: 0.8rem;
  color: #757575;
  margin: 0 0 1rem;
}

.sub-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #424242;
  margin: 0.75rem 0 0.35rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.field-label {
  font-size: 0.85rem;
  color: #9e9e9e;
  width: 6.5rem;
  flex-shrink: 0;
}

.wide-input {
  flex: 1;
  min-width: 0;
}

.reset-factory-btn {
  background-color: #1e1e1e;
  color: #ef9a9a;
  border: 1px solid #614040;
  border-radius: 6px;
  padding: 0.5rem 1.2rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
  margin-top: 0.5rem;
}
.reset-factory-btn:hover { background-color: #2a1a1a; }
</style>
