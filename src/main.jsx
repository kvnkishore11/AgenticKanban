import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Enhanced error logging for uncaught errors
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler] Uncaught error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error logging for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Error Handler] Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString()
  });
});

// Log HMR (Hot Module Replacement) events
if (import.meta.hot) {
  console.log('[HMR] Hot Module Replacement enabled');

  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('[HMR] Vite is about to update modules');
  });

  import.meta.hot.on('vite:afterUpdate', () => {
    console.log('[HMR] Vite finished updating modules');
  });

  import.meta.hot.on('vite:error', (err) => {
    console.error('[HMR] Vite HMR error:', err);
  });
}

// Log application initialization
console.log('[App Init] Starting AgenticKanban application', {
  timestamp: new Date().toISOString(),
  env: import.meta.env.MODE,
  backend: import.meta.env.VITE_BACKEND_URL,
  wsPort: import.meta.env.VITE_WEBSOCKET_PORT
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
