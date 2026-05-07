import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Overlay from '../views/Overlay.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/overlay', component: Overlay },
  { path: '/settings', component: Settings },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
