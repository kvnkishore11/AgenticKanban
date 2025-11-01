import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .ports.env if it exists
  const env = loadEnv(mode, process.cwd(), ['FRONTEND_PORT', 'BACKEND_PORT'])

  return {
    plugins: [react()],
    server: {
      // Prefer environment variable (from start.sh), fallback to .env file, then default
      port: parseInt(process.env.FRONTEND_PORT || env.FRONTEND_PORT) || 5173,
    },
    envPrefix: 'VITE_',
  }
})
