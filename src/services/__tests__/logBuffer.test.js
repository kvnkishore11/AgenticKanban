/**
 * Tests for Log Buffer Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LogBuffer, LogBufferManager, logBufferManager } from '../logBuffer.js';

describe('LogBuffer', () => {
  let buffer;

  beforeEach(() => {
    buffer = new LogBuffer(100);
  });

  describe('constructor', () => {
    it('should create buffer with default max size', () => {
      const defaultBuffer = new LogBuffer();
      expect(defaultBuffer.maxSize).toBe(1000);
    });

    it('should clamp max size between 100 and 10000', () => {
      const smallBuffer = new LogBuffer(10);
      expect(smallBuffer.maxSize).toBe(100);

      const largeBuffer = new LogBuffer(100000);
      expect(largeBuffer.maxSize).toBe(10000);
    });
  });

  describe('append', () => {
    it('should append log entry', () => {
      const entry = buffer.append({ message: 'Test log' });

      expect(entry.message).toBe('Test log');
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.bufferIndex).toBe(0);
    });

    it('should generate unique IDs', () => {
      const entry1 = buffer.append({ message: 'Log 1' });
      const entry2 = buffer.append({ message: 'Log 2' });

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should evict oldest entries when full', () => {
      const smallBuffer = new LogBuffer(100);

      for (let i = 0; i < 110; i++) {
        smallBuffer.append({ message: `Log ${i}` });
      }

      expect(smallBuffer.buffer.length).toBe(100);
      expect(smallBuffer.evictedCount).toBe(10);
    });
  });

  describe('appendBatch', () => {
    it('should append multiple entries', () => {
      const entries = buffer.appendBatch([
        { message: 'Log 1' },
        { message: 'Log 2' },
        { message: 'Log 3' }
      ]);

      expect(entries).toHaveLength(3);
      expect(buffer.buffer).toHaveLength(3);
    });
  });

  describe('getAll', () => {
    it('should return all logs', () => {
      buffer.append({ message: 'Log 1' });
      buffer.append({ message: 'Log 2' });

      const all = buffer.getAll();

      expect(all).toHaveLength(2);
    });

    it('should return copy of buffer', () => {
      buffer.append({ message: 'Log 1' });

      const all = buffer.getAll();
      all.push({ message: 'Modified' });

      expect(buffer.buffer).toHaveLength(1);
    });
  });

  describe('getByLevel', () => {
    it('should filter by single level', () => {
      buffer.append({ message: 'Info', level: 'INFO' });
      buffer.append({ message: 'Error', level: 'ERROR' });
      buffer.append({ message: 'Info 2', level: 'INFO' });

      const infoLogs = buffer.getByLevel('INFO');

      expect(infoLogs).toHaveLength(2);
    });

    it('should filter by multiple levels', () => {
      buffer.append({ message: 'Info', level: 'INFO' });
      buffer.append({ message: 'Error', level: 'ERROR' });
      buffer.append({ message: 'Warning', level: 'WARNING' });

      const logs = buffer.getByLevel(['INFO', 'ERROR']);

      expect(logs).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('should search by message content', () => {
      buffer.append({ message: 'Build started' });
      buffer.append({ message: 'Test running' });
      buffer.append({ message: 'Build completed' });

      const results = buffer.search('build');

      expect(results).toHaveLength(2);
    });

    it('should return all logs when query is empty', () => {
      buffer.append({ message: 'Log 1' });
      buffer.append({ message: 'Log 2' });

      expect(buffer.search('')).toHaveLength(2);
      expect(buffer.search(null)).toHaveLength(2);
    });
  });

  describe('getRecent', () => {
    it('should return most recent logs', () => {
      for (let i = 0; i < 10; i++) {
        buffer.append({ message: `Log ${i}` });
      }

      const recent = buffer.getRecent(3);

      expect(recent).toHaveLength(3);
      expect(recent[0].message).toBe('Log 7');
      expect(recent[2].message).toBe('Log 9');
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      buffer.append({ message: 'Log 1' });
      buffer.append({ message: 'Log 2' });

      buffer.clear();

      expect(buffer.buffer).toHaveLength(0);
      expect(buffer.logCount).toBe(0);
      expect(buffer.evictedCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return buffer statistics', () => {
      buffer.append({ message: 'Log 1' });
      buffer.append({ message: 'Log 2' });

      const stats = buffer.getStats();

      expect(stats.currentSize).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.totalReceived).toBe(2);
      expect(stats.evictedCount).toBe(0);
      expect(stats.utilizationPercent).toBe(2);
    });
  });

  describe('isFull', () => {
    it('should return true when buffer is at capacity', () => {
      const smallBuffer = new LogBuffer(100);

      for (let i = 0; i < 100; i++) {
        smallBuffer.append({ message: `Log ${i}` });
      }

      expect(smallBuffer.isFull()).toBe(true);
    });

    it('should return false when buffer has space', () => {
      expect(buffer.isFull()).toBe(false);
    });
  });
});

describe('LogBufferManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LogBufferManager(100);
  });

  afterEach(() => {
    manager.clearAll();
  });

  describe('getBuffer', () => {
    it('should create buffer for new task', () => {
      const buffer = manager.getBuffer('task-1');

      expect(buffer).toBeInstanceOf(LogBuffer);
    });

    it('should return same buffer for same task', () => {
      const buffer1 = manager.getBuffer('task-1');
      const buffer2 = manager.getBuffer('task-1');

      expect(buffer1).toBe(buffer2);
    });
  });

  describe('append', () => {
    it('should append to task buffer', () => {
      manager.append('task-1', { message: 'Log 1' });
      manager.append('task-1', { message: 'Log 2' });

      const logs = manager.getAll('task-1');

      expect(logs).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear logs for specific task', () => {
      manager.append('task-1', { message: 'Log 1' });
      manager.append('task-2', { message: 'Log 2' });

      manager.clear('task-1');

      expect(manager.getAll('task-1')).toHaveLength(0);
      expect(manager.getAll('task-2')).toHaveLength(1);
    });
  });

  describe('getGlobalStats', () => {
    it('should return aggregated statistics', () => {
      manager.append('task-1', { message: 'Log 1' });
      manager.append('task-2', { message: 'Log 2' });
      manager.append('task-2', { message: 'Log 3' });

      const stats = manager.getGlobalStats();

      expect(stats.bufferCount).toBe(2);
      expect(stats.totalLogs).toBe(3);
    });
  });
});

describe('logBufferManager singleton', () => {
  it('should be a LogBufferManager instance', () => {
    expect(logBufferManager).toBeInstanceOf(LogBufferManager);
  });
});
