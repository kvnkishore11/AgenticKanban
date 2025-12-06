import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original window.location
const originalLocation = window.location;

describe('API Configuration', () => {
  beforeEach(() => {
    // Reset modules before each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore window.location after each test
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.unstubAllEnvs();
  });

  describe('isCaddyRouted', () => {
    it('returns true for hostname ending with .localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });
      vi.stubEnv('VITE_BACKEND_URL', '');

      const { isCaddyRouted } = await import('../api.js');
      expect(isCaddyRouted()).toBe(true);
    });

    it('returns false for plain localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });
      vi.stubEnv('VITE_BACKEND_URL', '');

      const { isCaddyRouted } = await import('../api.js');
      expect(isCaddyRouted()).toBe(false);
    });

    it('returns true for api subdomain of .localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'api.f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });
      vi.stubEnv('VITE_BACKEND_URL', '');

      const { isCaddyRouted } = await import('../api.js');
      expect(isCaddyRouted()).toBe(true);
    });

    it('returns true for main.localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'main.localhost', protocol: 'http:' },
        writable: true,
      });
      vi.stubEnv('VITE_BACKEND_URL', '');

      const { isCaddyRouted } = await import('../api.js');
      expect(isCaddyRouted()).toBe(true);
    });
  });

  describe('getBackendUrl', () => {
    it('uses VITE_BACKEND_URL when set', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:9999');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });

      const { getBackendUrl } = await import('../api.js');
      expect(getBackendUrl()).toBe('http://localhost:9999');
    });

    it('auto-detects backend URL from Caddy hostname', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { getBackendUrl } = await import('../api.js');
      expect(getBackendUrl()).toBe('http://api.f4d61857.localhost');
    });

    it('falls back to localhost:8500 for plain localhost', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      vi.stubEnv('PROD', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });

      const { getBackendUrl } = await import('../api.js');
      expect(getBackendUrl()).toBe('http://localhost:8500');
    });
  });

  describe('getAdwUrl', () => {
    it('uses adw subdomain for Caddy hostname', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { getAdwUrl } = await import('../api.js');
      expect(getAdwUrl()).toBe('ws://adw.f4d61857.localhost');
    });

    it('uses wss protocol for https Caddy hostname', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'https:' },
        writable: true,
      });

      const { getAdwUrl } = await import('../api.js');
      expect(getAdwUrl()).toBe('wss://adw.f4d61857.localhost');
    });

    it('derives ADW URL from backend URL for localhost', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8500');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });

      const { getAdwUrl } = await import('../api.js');
      expect(getAdwUrl()).toBe('ws://localhost:8500');
    });
  });

  describe('legacy getWebSocketUrl alias', () => {
    it('is an alias for getAdwUrl', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { getAdwUrl, getWebSocketUrl } = await import('../api.js');
      expect(getWebSocketUrl()).toBe(getAdwUrl());
    });
  });

  describe('exported constants', () => {
    it('exports ADW_TRIGGER_ENDPOINT with /ws/trigger suffix', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { ADW_TRIGGER_ENDPOINT } = await import('../api.js');
      expect(ADW_TRIGGER_ENDPOINT).toBe('ws://adw.f4d61857.localhost/ws/trigger');
    });

    it('exports ADW_URL correctly', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { ADW_URL } = await import('../api.js');
      expect(ADW_URL).toBe('ws://adw.f4d61857.localhost');
    });

    it('exports legacy WS_URL as alias for ADW_URL', async () => {
      vi.stubEnv('VITE_BACKEND_URL', '');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'f4d61857.localhost', protocol: 'http:' },
        writable: true,
      });

      const { ADW_URL, WS_URL } = await import('../api.js');
      expect(WS_URL).toBe(ADW_URL);
    });

    it('exports API_HOST correctly', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8500');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });

      const { API_HOST } = await import('../api.js');
      expect(API_HOST).toBe('localhost');
    });

    it('exports API_PORT correctly', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8500');
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', protocol: 'http:' },
        writable: true,
      });

      const { API_PORT } = await import('../api.js');
      expect(API_PORT).toBe(8500);
    });
  });
});
