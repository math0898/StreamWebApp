import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3301,
    strictPort: true,
  },
  preview: {
    port: 3301,
    strictPort: true,
  },
})
