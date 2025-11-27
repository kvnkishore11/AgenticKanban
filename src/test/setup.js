import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Define environment variables for vitest
// This needs to happen before any module imports
process.env.VITE_BACKEND_URL = 'http://localhost:8500'

// Mock VITE_BACKEND_URL environment variable for tests using Vitest's API
vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8500')

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver for components that use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage with a resettable in-memory implementation
const createLocalStorageMock = () => {
  let store = {}

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    // Test utility to reset the store
    _reset: () => {
      store = {}
    },
  }
}

global.localStorage = createLocalStorageMock()

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 0 // CONNECTING
    this.send = vi.fn()
    this.close = vi.fn()
    this.addEventListener = vi.fn()
    this.removeEventListener = vi.fn()
    this.dispatchEvent = vi.fn()
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  get CONNECTING() { return 0 }
  get OPEN() { return 1 }
  get CLOSING() { return 2 }
  get CLOSED() { return 3 }
}

// Mock requestIdleCallback and cancelIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  const id = setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    })
  }, 0)
  return id
})

global.cancelIdleCallback = vi.fn((id) => {
  clearTimeout(id)
})

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn((blob) => {
  return `blob:mock-${Math.random().toString(36).substring(2, 15)}`
})

global.URL.revokeObjectURL = vi.fn()
