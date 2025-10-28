import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Default export
export default defineConfig({
  plugins: [react()],
  base: './', // 👈 important for Vercel path resolution
  build: {
    outDir: 'dist', // Vercel expects this
  },
})
