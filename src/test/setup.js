import { vi } from 'vitest';

// Mock import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_GEMINI_API_KEY: 'test-api-key'
      }
    }
  },
  writable: true
});

// Mock global objects that might be used in browser environment
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

Object.defineProperty(globalThis, 'Audio', {
  value: vi.fn(() => ({
    play: vi.fn(() => Promise.resolve()),
    onloadstart: null,
    onerror: null,
    onended: null
  })),
  writable: true
});

Object.defineProperty(globalThis, 'Blob', {
  value: vi.fn((data, options) => ({ data, options, type: options?.type || 'application/octet-stream' })),
  writable: true
});

// Mock atob and btoa for base64 operations
Object.defineProperty(globalThis, 'atob', {
  value: vi.fn((str) => {
    // Simple mock implementation
    return 'mock-decoded-data';
  }),
  writable: true
});

Object.defineProperty(globalThis, 'btoa', {
  value: vi.fn((str) => {
    // Simple mock implementation
    return 'mock-encoded-data';
  }),
  writable: true
});

// Mock console methods to avoid noise in tests
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});