import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3301,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': 'http://0.0.0.0:3302',
      '/Music': 'http://0.0.0.0:3302',
    },
  },
  preview: {
    port: 3301,
    strictPort: true,
  },
})
