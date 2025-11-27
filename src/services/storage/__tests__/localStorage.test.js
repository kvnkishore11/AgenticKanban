/**
 * @fileoverview Tests for LocalStorageService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Import the service after mocking (it's a singleton instance, not a class)
import localStorageService from '../localStorage.js';

describe('LocalStorageService', () => {
  let service;

  beforeEach(() => {
    // Reset mocks
    localStorageMock.clear();
    vi.clearAllMocks();

    // Use the singleton instance
    service = localStorageService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setItem', () => {
    it('should set an item in localStorage with prefix', () => {
      const result = service.setItem('test-key', { value: 'test-value' });

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'agentic-kanban-test-key',
        expect.stringContaining('test-value')
      );
    });

    it('should include version and timestamp in stored value', () => {
      service.setItem('test-key', { value: 'test' });

      const storedValue = localStorageMock.getItem('agentic-kanban-test-key');
      const parsed = JSON.parse(storedValue);

      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('version', '1.0.0');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.data).toEqual({ value: 'test' });
    });

    it('should handle errors and return false', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      const result = service.setItem('test-key', { value: 'test' });

      expect(result).toBe(false);
    });

    it('should serialize complex objects', () => {
      const complexData = {
        nested: { object: true },
        array: [1, 2, 3],
        string: 'test'
      };

      const result = service.setItem('complex', complexData);

      expect(result).toBe(true);
      const stored = localStorageMock.getItem('agentic-kanban-complex');
      const parsed = JSON.parse(stored);
      expect(parsed.data).toEqual(complexData);
    });
  });

  describe('getItem', () => {
    it('should retrieve an item from localStorage', () => {
      const testData = { value: 'test' };
      service.setItem('test-key', testData);

      const result = service.getItem('test-key');

      expect(result).toEqual(testData);
    });

    it('should return default value when item does not exist', () => {
      const result = service.getItem('non-existent', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should return null as default when no default value provided', () => {
      const result = service.getItem('non-existent');

      expect(result).toBe(null);
    });

    it('should handle version mismatch', () => {
      const oldVersionData = JSON.stringify({
        data: { value: 'test' },
        version: '0.9.0',
        timestamp: new Date().toISOString()
      });

      localStorageMock.setItem('agentic-kanban-old-version', oldVersionData);

      const result = service.getItem('old-version', 'default');

      expect(result).toBe('default');
    });

    it('should handle corrupted data gracefully', () => {
      localStorageMock.setItem('agentic-kanban-corrupted', 'invalid-json{{{');

      const result = service.getItem('corrupted', 'default');

      expect(result).toBe('default');
    });

    it('should handle null data', () => {
      localStorageMock.setItem('agentic-kanban-null', 'null');

      const result = service.getItem('null', 'default');

      expect(result).toBe('default');
    });
  });

  describe('removeItem', () => {
    it('should remove an item from localStorage', () => {
      service.setItem('test-key', { value: 'test' });

      const result = service.removeItem('test-key');

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agentic-kanban-test-key');
    });

    it('should handle errors and return false', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Remove failed');
      });

      const result = service.removeItem('test-key');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all app-specific items', () => {
      service.setItem('key1', 'value1');
      service.setItem('key2', 'value2');
      localStorageMock.setItem('other-app-key', 'value');

      const result = service.clear();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agentic-kanban-key1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agentic-kanban-key2');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other-app-key');
    });

    it('should preserve workflow state when preserveWorkflowState is true', () => {
      // Set up data with workflow state
      const workflowData = JSON.stringify({
        data: { value: 'test' },
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        state: {
          taskWorkflowProgress: { step: 1 },
          taskWorkflowMetadata: { id: 'test' }
        }
      });

      const normalData = JSON.stringify({
        data: { value: 'normal' },
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });

      localStorageMock.setItem('agentic-kanban-workflow', workflowData);
      localStorageMock.setItem('agentic-kanban-normal', normalData);

      service.clear(true);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('agentic-kanban-normal');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('agentic-kanban-workflow');
    });

    it('should handle errors and return false', () => {
      localStorageMock.key.mockImplementationOnce(() => {
        throw new Error('Clear failed');
      });

      const result = service.clear();

      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when localStorage is available', () => {
      const result = service.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when localStorage throws error', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Not available');
      });

      const result = service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      service.setItem('key1', { value: 'test1' });
      service.setItem('key2', { value: 'test2' });
      localStorageMock.setItem('other-key', 'other-value');

      const info = service.getStorageInfo();

      expect(info).toHaveProperty('totalKeys');
      expect(info).toHaveProperty('appKeys', 2);
      expect(info).toHaveProperty('totalSize');
      expect(info).toHaveProperty('appSize');
      expect(info).toHaveProperty('available', true);
      expect(info.totalSize).toBeGreaterThan(0);
    });

    it('should return null when localStorage is not available', () => {
      const originalIsAvailable = service.isAvailable;
      service.isAvailable = vi.fn(() => false);

      const info = service.getStorageInfo();

      expect(info).toBe(null);

      service.isAvailable = originalIsAvailable;
    });

    it('should handle errors and return null', () => {
      localStorageMock.key.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const info = service.getStorageInfo();

      expect(info).toBe(null);
    });
  });

  describe('exportData', () => {
    it('should export all app data', () => {
      service.setItem('key1', { value: 'test1' });
      service.setItem('key2', { value: 'test2' });

      const exported = service.exportData();

      expect(exported).toHaveProperty('data');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('version', '1.0.0');
      expect(exported.data).toHaveProperty('key1');
      expect(exported.data).toHaveProperty('key2');
    });

    it('should only export app-specific data', () => {
      service.setItem('app-key', { value: 'app-value' });
      localStorageMock.setItem('other-key', 'other-value');

      const exported = service.exportData();

      expect(exported.data).toHaveProperty('app-key');
      expect(exported.data).not.toHaveProperty('other-key');
    });

    it('should handle errors and return null', () => {
      localStorageMock.key.mockImplementationOnce(() => {
        throw new Error('Export failed');
      });

      const exported = service.exportData();

      expect(exported).toBe(null);
    });
  });

  describe('importData', () => {
    it('should import data successfully', () => {
      const importData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
          'key1': {
            data: { value: 'test1' },
            version: '1.0.0',
            timestamp: new Date().toISOString()
          },
          'key2': {
            data: { value: 'test2' },
            version: '1.0.0',
            timestamp: new Date().toISOString()
          }
        }
      };

      const result = service.importData(importData);

      expect(result).toBe(true);
      expect(service.getItem('key1')).toEqual({ value: 'test1' });
      expect(service.getItem('key2')).toEqual({ value: 'test2' });
    });

    it('should clear existing data before import', () => {
      service.setItem('old-key', { value: 'old' });

      const importData = {
        version: '1.0.0',
        data: {
          'new-key': {
            data: { value: 'new' },
            version: '1.0.0',
            timestamp: new Date().toISOString()
          }
        }
      };

      service.importData(importData);

      expect(service.getItem('old-key')).toBe(null);
      expect(service.getItem('new-key')).toEqual({ value: 'new' });
    });

    it('should handle invalid data format', () => {
      const result = service.importData({ invalid: true });

      expect(result).toBe(false);
    });

    it('should handle null data', () => {
      const result = service.importData(null);

      expect(result).toBe(false);
    });
  });

  describe('migrateData', () => {
    it('should log migration message', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      const result = service.migrateData('0.9.0', '1.0.0');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Migration from 0.9.0 to 1.0.0')
      );

      consoleSpy.mockRestore();
    });
  });
});
