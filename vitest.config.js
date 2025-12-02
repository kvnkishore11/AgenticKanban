import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    env: {
      VITE_BACKEND_URL: 'http://localhost:8500',
      VITE_ADW_PORT: '8500',
    },
    include: [
      'src/**/*.test.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'trees/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'agents/'
      ]
    },
    // Reporter configuration for CI/automated parsing
    reporters: ['verbose'],
    outputFile: {
      json: './test-results.json'
    }
  },
})
