<template>
  <div class="settings">
    <h1>Settings</h1>
    <section class="section">
      <h2 class="section-title">Module Defaults Moved</h2>
      <p class="hint-inline">
        ProgressBar module defaults are now configured directly on the Dashboard under
        <strong>ProgressBar Defaults</strong>.
      </p>
      <p class="hint-inline">Use that section when you want new modules to inherit different defaults.</p>
    </section>
  </div>
</template>

<script setup>
</script>

<style scoped>
.settings {
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
  max-width: 640px;
  border-top: 1px solid #2a2a2a;
  padding: 1.25rem 0;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #616161;
  margin: 0 0 0.75rem;
}

.hint-inline {
  font-size: 0.9rem;
  color: #9e9e9e;
  margin: 0 0 0.65rem;
  line-height: 1.45;
}
</style>
