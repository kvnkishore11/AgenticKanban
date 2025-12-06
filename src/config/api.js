/**
 * API Configuration
 * Auto-detects backend URL based on environment:
 * 1. Environment variable (VITE_BACKEND_URL)
 * 2. Hostname-based (Caddy setup): <adw_id>.localhost → api.<adw_id>.localhost
 * 3. Fallback to localhost:8500
 */

/**
 * Check if hostname follows Caddy routing pattern
 * @returns {boolean}
 */
function isCaddyRouted() {
  if (typeof window === 'undefined' || !window.location) return false;
  const hostname = window.location.hostname;
  if (!hostname) return false;
  return hostname.endsWith('.localhost') && hostname !== 'localhost';
}

/**
 * Get the backend URL based on environment and hostname
 * @returns {string} The backend URL
 */
function getBackendUrl() {
  // 1. Environment variable (from wt script or .env)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // 2. Auto-detect from hostname (Caddy setup)
  if (isCaddyRouted() && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//api.${hostname}`;
  }

  // 3. Production check
  if (import.meta.env.PROD && typeof window !== 'undefined' && window.location) {
    // Update this with your production API URL
    return window.location.origin.replace('://', '://api.');
  }

  // 4. Fallback for traditional local development
  return 'http://localhost:8500';
}

/**
 * Get the ADW server URL (WebSocket endpoint) based on environment and hostname
 * ADW server handles real-time communication for workflow triggers
 * @returns {string} The ADW server URL
 */
function getAdwUrl() {
  // Auto-detect from hostname (Caddy setup)
  if (isCaddyRouted() && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//adw.${hostname}`;
  }

  // Fallback: derive from backend URL
  const backendUrl = getBackendUrl();
  return backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
}

/**
 * Get the API host (hostname only, no protocol)
 * @returns {string} The API host
 */
function getApiHost() {
  const url = new URL(getBackendUrl());
  return url.hostname;
}

/**
 * Get the API port
 * @returns {number} The API port
 */
function getApiPort() {
  const url = new URL(getBackendUrl());
  return parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
}

// Export computed values
export const API_URL = getBackendUrl();
export const ADW_URL = getAdwUrl();
export const ADW_TRIGGER_ENDPOINT = `${ADW_URL}/ws/trigger`;
export const API_HOST = getApiHost();
export const API_PORT = getApiPort();

// Legacy aliases for backward compatibility
export const WS_URL = ADW_URL;
export const WS_TRIGGER_ENDPOINT = ADW_TRIGGER_ENDPOINT;

// Export utility functions for dynamic use
export { getBackendUrl, getAdwUrl, isCaddyRouted, getApiHost, getApiPort };
// Legacy alias
export { getAdwUrl as getWebSocketUrl };

// For debugging
if (import.meta.env.DEV) {
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'N/A';
  console.log('[API Config]', {
    hostname,
    isCaddyRouted: isCaddyRouted(),
    API_URL,
    ADW_URL,
    ADW_TRIGGER_ENDPOINT,
  });
}
