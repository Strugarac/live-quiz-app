import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Listen on the LAN too, so a phone on the same Wi-Fi can open http://<PC-IP>:5173
    // (the console prints that "Network:" address on start-up).
    host: true,
    // Proxying keeps the browser on a single origin during development, so the
    // backend CORS config and any future auth cookie are never in play.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // The STOMP endpoint registered by WebSocketConfig (used from slice 9b).
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
