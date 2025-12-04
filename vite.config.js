import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { adwApiPlugin } from './vite-plugins/adw-api-plugin.js'

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
