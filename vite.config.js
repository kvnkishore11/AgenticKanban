import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { adwApiPlugin } from './vite-plugins/adw-api-plugin.js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get the directory of this config file
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Load environment variables from .ports.env file
 * This ensures VITE_BACKEND_URL and other vars are always available
 * regardless of how the frontend is started (npm run dev or start_fe.sh)
 */
function loadPortsEnv() {
  // Try to find .ports.env - check current dir, then parent dirs (for worktrees)
  let searchDir = __dirname
  let portsEnvPath = null

  // Search up to 3 levels for .ports.env (handles worktree nesting)
  for (let i = 0; i < 3; i++) {
    const candidate = join(searchDir, '.ports.env')
    if (existsSync(candidate)) {
      portsEnvPath = candidate
      break
    }
    // Move up one directory
    const parent = dirname(searchDir)
    if (parent === searchDir) break // Reached root
    searchDir = parent
  }

  if (!portsEnvPath) {
    console.warn('[Vite Config] .ports.env not found - VITE_BACKEND_URL may not be set')
    return {}
  }

  try {
    const content = readFileSync(portsEnvPath, 'utf-8')
    const vars = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...valueParts] = trimmed.split('=')
      if (key) {
        vars[key.trim()] = valueParts.join('=').trim()
      }
    }
    console.log(`[Vite Config] Loaded env from ${portsEnvPath}`)
    return vars
  } catch (e) {
    console.warn(`[Vite Config] Failed to load .ports.env: ${e.message}`)
    return {}
  }
}

// Load .ports.env and inject into process.env for Vite to pick up
const portsEnv = loadPortsEnv()
for (const [key, value] of Object.entries(portsEnv)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

// Add process error handlers to prevent abrupt crashes
// eslint-disable-next-line no-undef
process.on('uncaughtException', (error) => {
  console.error('[Vite Process] Uncaught Exception:', error);
  // Don't exit immediately to allow cleanup
});

// eslint-disable-next-line no-undef
process.on('unhandledRejection', (reason) => {
  console.error('[Vite Process] Unhandled Promise Rejection:', reason);
  // Don't exit immediately to allow cleanup
});

// Graceful shutdown handler
// eslint-disable-next-line no-undef
process.on('SIGTERM', () => {
  console.log('[Vite Process] SIGTERM received, shutting down gracefully...');
  // eslint-disable-next-line no-undef
  process.exit(0);
});

// eslint-disable-next-line no-undef
process.on('SIGINT', () => {
  console.log('[Vite Process] SIGINT received, shutting down gracefully...');
  // eslint-disable-next-line no-undef
  process.exit(0);
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables with VITE_ prefix (for browser) and server-side vars
  // VITE_* variables are exposed to the browser, others are server-side only
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'FRONTEND_PORT', 'ADW_PORT'])

  return {
    plugins: [react(), adwApiPlugin()],
    server: {
      // Prefer environment variable (from start.sh), fallback to .env file, then default
      // eslint-disable-next-line no-undef
      port: parseInt(process.env.FRONTEND_PORT || env.FRONTEND_PORT) || 5173,
      watch: {
        // Ignore .env files to prevent server restarts during worktree setup
        // This stabilizes WebSocket connections by avoiding unnecessary restarts
        // Ignore worktree directories and config files to prevent reloads from ADW workflow operations
        ignored: [
          '**/.env*',
          '**/server/.env*',
          '**/trees/**',
          '**/.mcp.json',
          '**/playwright-mcp-config.json'
        ]
      },
      // Improve stability with stricter origin checking
      strictPort: false, // Allow fallback to different port if specified port is busy
      host: true, // Listen on all addresses
    },
    envPrefix: 'VITE_',
    // Optimize dependencies - pre-bundle TipTap extensions
    optimizeDeps: {
      include: [
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-underline',
        '@tiptap/extension-text-style',
        '@tiptap/extension-color',
        '@tiptap/extension-highlight',
        '@tiptap/extension-link',
        '@tiptap/extension-text-align',
        '@tiptap/extension-table',
        '@tiptap/extension-table-row',
        '@tiptap/extension-table-cell',
        '@tiptap/extension-table-header',
        '@tiptap/extension-typography',
        '@tiptap/extension-character-count',
      ],
    },
    // Optimize build to reduce memory usage
    build: {
      // Reduce chunk size warnings threshold
      chunkSizeWarningLimit: 1000,
    },
  }
})
