import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Clean Vite + React configuration (error free)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
})
