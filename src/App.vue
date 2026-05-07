<template>
  <nav v-if="showNav" class="top-nav">
    <RouterLink to="/dashboard" class="nav-link">Dashboard</RouterLink>
    <RouterLink to="/modules" class="nav-link">Modules</RouterLink>
    <RouterLink to="/music" class="nav-link">Music</RouterLink>
    <RouterLink to="/settings" class="nav-link">Settings</RouterLink>
    <span class="nav-link nav-disabled">About</span>
  </nav>
  <RouterView />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route   = useRoute()
const showNav = computed(() => route.path !== '/overlay')
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #121212;
}

.top-nav {
  display: flex;
  background: #181818;
  border-bottom: 1px solid #2a2a2a;
  padding: 0 1.5rem;
  font-family: sans-serif;
}

.nav-link {
  color: #616161;
  text-decoration: none;
  padding: 0.75rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
  display: inline-block;
}

.nav-link:not(.nav-disabled):hover {
  color: #bdbdbd;
}

.router-link-active {
  color: #ffffff !important;
  border-bottom-color: #82b1ff;
}

.nav-disabled {
  cursor: default;
  opacity: 0.3;
}
</style>
