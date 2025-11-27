/**
 * Tests for Logger Utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger } from '../logger';

describe('logger', () => {
  let consoleSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('createLogger', () => {
    it('should create a logger instance with context', () => {
      const logger = createLogger('TestComponent');

      expect(logger).toBeDefined();
      expect(logger.context).toBe('TestComponent');
    });

    it('should have all log methods', () => {
      const logger = createLogger('Test');

      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.ws).toBeInstanceOf(Function);
      expect(logger.action).toBeInstanceOf(Function);
    });
  });

  describe('logger.debug', () => {
    it('should log debug messages in development', () => {
      const logger = createLogger('Test');
      logger.debug('Debug message');

      // In test environment, debug should be called
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context in debug logs', () => {
      const logger = createLogger('TestContext');
      logger.debug('Message');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('TestContext'))).toBe(true);
    });

    it('should include timestamp in debug logs', () => {
      const logger = createLogger('Test');
      logger.debug('Message');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      // Check for time-like pattern (HH:MM:SS)
      expect(call.some(arg => typeof arg === 'string' && /\d{2}:\d{2}:\d{2}/.test(arg))).toBe(true);
    });

    it('should accept additional data parameter', () => {
      const logger = createLogger('Test');
      const data = { key: 'value', count: 42 };
      logger.debug('Message', data);

      expect(consoleSpy.log).toHaveBeenCalled();
      const calls = consoleSpy.log.mock.calls;
      expect(calls[0]).toContain(data);
    });

    it('should use default empty object for data if not provided', () => {
      const logger = createLogger('Test');
      logger.debug('Message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('logger.info', () => {
    it('should log info messages', () => {
      const logger = createLogger('Test');
      logger.info('Info message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context in info logs', () => {
      const logger = createLogger('InfoContext');
      logger.info('Message');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('InfoContext'))).toBe(true);
    });

    it('should accept additional data parameter', () => {
      const logger = createLogger('Test');
      const data = { status: 'success' };
      logger.info('Message', data);

      const calls = consoleSpy.log.mock.calls;
      expect(calls[0]).toContain(data);
    });
  });

  describe('logger.warn', () => {
    it('should log warning messages', () => {
      const logger = createLogger('Test');
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should include context in warnings', () => {
      const logger = createLogger('WarnContext');
      logger.warn('Message');

      const calls = consoleSpy.warn.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('WarnContext'))).toBe(true);
    });

    it('should accept additional data parameter', () => {
      const logger = createLogger('Test');
      const data = { warning: 'deprecated' };
      logger.warn('Message', data);

      const calls = consoleSpy.warn.mock.calls;
      expect(calls[0]).toContain(data);
    });
  });

  describe('logger.error', () => {
    it('should log error messages', () => {
      const logger = createLogger('Test');
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include context in errors', () => {
      const logger = createLogger('ErrorContext');
      logger.error('Message');

      const calls = consoleSpy.error.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('ErrorContext'))).toBe(true);
    });

    it('should accept Error object parameter', () => {
      const logger = createLogger('Test');
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const calls = consoleSpy.error.mock.calls;
      expect(calls[0]).toContain(error);
    });

    it('should accept additional data parameter', () => {
      const logger = createLogger('Test');
      const error = new Error('Test error');
      const data = { code: 500 };
      logger.error('Message', error, data);

      const calls = consoleSpy.error.mock.calls;
      expect(calls[0]).toContain(error);
      expect(calls[0]).toContain(data);
    });

    it('should work without error object', () => {
      const logger = createLogger('Test');
      const data = { code: 404 };
      logger.error('Error message', null, data);

      expect(consoleSpy.error).toHaveBeenCalled();
      const calls = consoleSpy.error.mock.calls;
      expect(calls[0]).toContain(data);
    });
  });

  describe('logger.ws', () => {
    it('should log WebSocket events', () => {
      const logger = createLogger('Test');
      logger.ws('connected');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context in WebSocket logs', () => {
      const logger = createLogger('WSContext');
      logger.ws('message');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('WSContext'))).toBe(true);
    });

    it('should accept event data', () => {
      const logger = createLogger('Test');
      const data = { type: 'message', payload: 'test' };
      logger.ws('event', data);

      const calls = consoleSpy.log.mock.calls;
      expect(calls[0]).toContain(data);
    });
  });

  describe('logger.action', () => {
    it('should log user actions', () => {
      const logger = createLogger('Test');
      logger.action('Button clicked');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include context in action logs', () => {
      const logger = createLogger('ActionContext');
      logger.action('User action');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('ActionContext'))).toBe(true);
    });

    it('should accept action data', () => {
      const logger = createLogger('Test');
      const data = { button: 'submit', form: 'login' };
      logger.action('Form submitted', data);

      const calls = consoleSpy.log.mock.calls;
      expect(calls[0]).toContain(data);
    });
  });

  describe('logger.child', () => {
    it('should create child logger with nested context', () => {
      const logger = createLogger('Parent');
      const child = logger.child('Child');

      expect(child.context).toBe('Parent:Child');
    });

    it('should have all log methods', () => {
      const logger = createLogger('Parent');
      const child = logger.child('Child');

      expect(child.debug).toBeInstanceOf(Function);
      expect(child.info).toBeInstanceOf(Function);
      expect(child.warn).toBeInstanceOf(Function);
      expect(child.error).toBeInstanceOf(Function);
    });

    it('should log with nested context', () => {
      const logger = createLogger('Parent');
      const child = logger.child('Child');
      child.info('Message');

      const calls = consoleSpy.log.mock.calls;
      const call = calls[0];
      expect(call.some(arg => typeof arg === 'string' && arg.includes('Parent:Child'))).toBe(true);
    });

    it('should support multiple nesting levels', () => {
      const logger = createLogger('Root');
      const child = logger.child('Child');
      const grandchild = child.child('Grandchild');

      expect(grandchild.context).toBe('Root:Child:Grandchild');
    });
  });

  describe('Log message formatting', () => {
    it('should include log level in output', () => {
      const logger = createLogger('Test');

      logger.debug('Debug');
      let calls = consoleSpy.log.mock.calls;
      expect(calls[0].some(arg => typeof arg === 'string' && arg.includes('DEBUG'))).toBe(true);

      logger.info('Info');
      calls = consoleSpy.log.mock.calls;
      expect(calls[calls.length - 1].some(arg => typeof arg === 'string' && arg.includes('INFO'))).toBe(true);

      logger.warn('Warn');
      calls = consoleSpy.warn.mock.calls;
      expect(calls[0].some(arg => typeof arg === 'string' && arg.includes('WARN'))).toBe(true);

      logger.error('Error');
      calls = consoleSpy.error.mock.calls;
      expect(calls[0].some(arg => typeof arg === 'string' && arg.includes('ERROR'))).toBe(true);
    });

    it('should use color formatting', () => {
      const logger = createLogger('Test');
      logger.info('Message');

      const calls = consoleSpy.log.mock.calls;
      // First arguments should be color format strings
      expect(typeof calls[0][0]).toBe('string');
      expect(calls[0][0]).toContain('%c');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty context', () => {
      const logger = createLogger('');

      logger.info('Message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle special characters in context', () => {
      const logger = createLogger('Test:Component:Sub');

      logger.info('Message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle null/undefined in data', () => {
      const logger = createLogger('Test');

      logger.info('Message', null);
      expect(consoleSpy.log).toHaveBeenCalled();

      logger.info('Message', undefined);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle complex data objects', () => {
      const logger = createLogger('Test');
      const complexData = {
        nested: {
          deep: {
            value: 42,
          },
        },
        array: [1, 2, 3],
        date: new Date(),
      };

      logger.info('Message', complexData);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle empty messages', () => {
      const logger = createLogger('Test');

      logger.info('');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const logger = createLogger('Test');
      const longMessage = 'A'.repeat(10000);

      logger.info(longMessage);
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('should log complete workflow', () => {
      const logger = createLogger('Workflow');

      logger.debug('Starting workflow');
      logger.info('Processing step 1', { step: 1 });
      logger.info('Processing step 2', { step: 2 });
      logger.warn('Warning in step 3', { step: 3, warning: 'deprecated' });
      logger.error('Error in step 4', new Error('Failed'), { step: 4 });

      expect(consoleSpy.log.mock.calls.length).toBeGreaterThan(0);
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should support multiple loggers with different contexts', () => {
      const logger1 = createLogger('Component1');
      const logger2 = createLogger('Component2');

      logger1.info('Message from component 1');
      logger2.info('Message from component 2');

      const calls = consoleSpy.log.mock.calls;
      expect(calls[0].some(arg => typeof arg === 'string' && arg.includes('Component1'))).toBe(true);
      expect(calls[1].some(arg => typeof arg === 'string' && arg.includes('Component2'))).toBe(true);
    });

    it('should handle parent-child logger hierarchy', () => {
      const parent = createLogger('Parent');
      const child1 = parent.child('Child1');
      const child2 = parent.child('Child2');
      const grandchild = child1.child('Grandchild');

      parent.info('Parent message');
      child1.info('Child1 message');
      child2.info('Child2 message');
      grandchild.info('Grandchild message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
    });

    it('should work with WebSocket logging workflow', () => {
      const logger = createLogger('WebSocket');

      logger.ws('connecting');
      logger.ws('connected', { url: 'ws://localhost' });
      logger.ws('message_received', { type: 'data', payload: {} });
      logger.ws('disconnected', { code: 1000, reason: 'Normal closure' });

      expect(consoleSpy.log.mock.calls.length).toBeGreaterThan(0);
    });

    it('should work with user action logging workflow', () => {
      const logger = createLogger('UI');

      logger.action('Page loaded');
      logger.action('Button clicked', { button: 'submit' });
      logger.action('Form submitted', { form: 'login', valid: true });
      logger.action('Navigation', { to: '/dashboard' });

      expect(consoleSpy.log.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid consecutive logs', () => {
      const logger = createLogger('Test');

      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`);
      }

      expect(consoleSpy.log).toHaveBeenCalledTimes(100);
    });

    it('should handle large data objects', () => {
      const logger = createLogger('Test');
      const largeData = {
        array: new Array(1000).fill({ key: 'value' }),
        nested: {},
      };

      // Create deep nesting
      let current = largeData.nested;
      for (let i = 0; i < 10; i++) {
        current.next = {};
        current = current.next;
      }

      logger.info('Large data', largeData);
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});
