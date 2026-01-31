import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['listabob.jefflord.com'],
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})

// Note: The "@property" CSS warning from daisyUI is cosmetic - it's valid CSS
// that lightningcss doesn't fully support yet. It doesn't affect the build.
