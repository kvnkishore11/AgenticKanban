/**
 * Tests for ProjectNotificationService
 * Comprehensive tests for WebSocket connection management and ticket notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this._messageQueue = [];
  }

  send(data) {
    this._messageQueue.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(error) {
    if (this.onerror) this.onerror(error);
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }
}

// Store original WebSocket
const OriginalWebSocket = global.WebSocket;

describe('ProjectNotificationService', () => {
  let service;
  let mockWs;

  beforeEach(async () => {
    // Mock WebSocket globally
    global.WebSocket = vi.fn().mockImplementation((url) => {
      mockWs = new MockWebSocket(url);
      return mockWs;
    });

    // Import fresh instance
    vi.resetModules();
    const module = await import('../projectNotificationService.js');
    service = module.default;

    // Clear any existing state
    service.cleanup();
  });

  afterEach(() => {
    service.cleanup();
    global.WebSocket = OriginalWebSocket;
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(service.connections).toBeInstanceOf(Map);
      expect(service.isConnecting).toBeInstanceOf(Map);
      expect(service.reconnectAttempts).toBeInstanceOf(Map);
      expect(service.maxReconnectAttempts).toBe(3);
      expect(service.reconnectDelay).toBe(2000);
      expect(service.maxReconnectDelay).toBe(10000);
      expect(service.healthCheckInterval).toBe(30000);
    });

    it('should have common ports defined', () => {
      expect(service.commonPorts).toContain(3000);
      expect(service.commonPorts).toContain(5173);
      expect(service.commonPorts).toContain(8080);
    });

    it('should have server patterns defined', () => {
      expect(service.serverPatterns).toHaveProperty('vite');
      expect(service.serverPatterns).toHaveProperty('react');
      expect(service.serverPatterns).toHaveProperty('express');
      expect(service.serverPatterns.vite.ports).toContain(5173);
    });

    it('should initialize port cache', () => {
      expect(service.portCache).toBeInstanceOf(Map);
      expect(service.cacheTimeout).toBe(5 * 60 * 1000);
    });
  });

  describe('Event Listeners', () => {
    it('should initialize project listeners', () => {
      service.initializeProjectListeners('test-project');
      const listeners = service.eventListeners.get('test-project');

      expect(listeners).toBeDefined();
      expect(listeners.connect).toEqual([]);
      expect(listeners.disconnect).toEqual([]);
      expect(listeners.error).toEqual([]);
      expect(listeners.message).toEqual([]);
      expect(listeners.notification_sent).toEqual([]);
      expect(listeners.notification_failed).toEqual([]);
    });

    it('should add event listeners with on()', () => {
      const listener = vi.fn();
      service.on('test-project', 'connect', listener);

      const listeners = service.eventListeners.get('test-project');
      expect(listeners.connect).toContain(listener);
    });

    it('should remove event listeners with off()', () => {
      const listener = vi.fn();
      service.on('test-project', 'connect', listener);
      service.off('test-project', 'connect', listener);

      const listeners = service.eventListeners.get('test-project');
      expect(listeners.connect).not.toContain(listener);
    });

    it('should emit events to listeners', () => {
      const listener = vi.fn();
      service.on('test-project', 'connect', listener);

      service.emit('test-project', 'connect', { test: 'data' });

      expect(listener).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      service.on('test-project', 'connect', errorListener);
      service.on('test-project', 'connect', normalListener);

      // Should not throw
      expect(() => service.emit('test-project', 'connect', {})).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('Port Caching', () => {
    it('should cache successful port discoveries', () => {
      service.cachePort('test-project', 'localhost', 3000, 0.9);

      const cached = service.getCachedPort('test-project', 'localhost');
      expect(cached).toBeDefined();
      expect(cached.port).toBe(3000);
      expect(cached.confidence).toBe(0.9);
    });

    it('should return null for non-cached ports', () => {
      const cached = service.getCachedPort('unknown-project', 'localhost');
      expect(cached).toBeNull();
    });

    it('should invalidate expired cache entries', () => {
      service.cachePort('test-project', 'localhost', 3000, 0.9);

      // Manually expire the cache
      const cacheKey = 'test-project_localhost';
      const cached = service.portCache.get(cacheKey);
      cached.timestamp = Date.now() - service.cacheTimeout - 1000;

      const result = service.getCachedPort('test-project', 'localhost');
      expect(result).toBeNull();
    });

    it('should clear port cache for a specific project', () => {
      service.cachePort('project1', 'localhost', 3000, 0.9);
      service.cachePort('project1', 'localhost', 3001, 0.8);
      service.cachePort('project2', 'localhost', 5000, 0.7);

      service.clearPortCache('project1');

      expect(service.getCachedPort('project1', 'localhost')).toBeNull();
      expect(service.getCachedPort('project2', 'localhost')).not.toBeNull();
    });

    it('should return cache statistics', () => {
      service.cachePort('project1', 'localhost', 3000, 0.9);
      service.cachePort('project2', 'localhost', 5000, 0.8);

      const stats = service.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.cacheTimeout).toBe(service.cacheTimeout);
    });
  });

  describe('Connection Management', () => {
    it('should check if connected to a project', () => {
      expect(service.isConnected('test-project')).toBe(false);
    });

    it('should return false when project has no connection', () => {
      expect(service.isConnected('nonexistent')).toBe(false);
    });

    it('should return false when WebSocket is not in OPEN state', () => {
      service.connections.set('test-project', {
        ws: { readyState: MockWebSocket.CONNECTING, close: vi.fn() },
        config: {},
        connectedAt: new Date().toISOString(),
        status: 'connecting'
      });

      expect(service.isConnected('test-project')).toBe(false);
    });

    it('should return true when WebSocket is in OPEN state', () => {
      service.connections.set('test-project', {
        ws: { readyState: 1, close: vi.fn() }, // WebSocket.OPEN = 1
        config: {},
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });

      expect(service.isConnected('test-project')).toBe(true);
    });

    it('should prevent duplicate connection attempts', async () => {
      service.isConnecting.set('test-project', true);

      const result = await service.connectToProject('test-project', { port: 3000 });

      expect(result).toBe(false);
    });

    it('should return true if already connected', async () => {
      service.connections.set('test-project', {
        ws: { readyState: 1, close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });

      const result = await service.connectToProject('test-project', { port: 3000 });

      expect(result).toBe(true);
    });
  });

  describe('Project Status', () => {
    it('should return status for disconnected project', () => {
      const status = service.getProjectStatus('test-project');

      expect(status.projectId).toBe('test-project');
      expect(status.connected).toBe(false);
      expect(status.connecting).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.connection).toBeNull();
    });

    it('should return status for connecting project', () => {
      service.isConnecting.set('test-project', true);

      const status = service.getProjectStatus('test-project');

      expect(status.connecting).toBe(true);
    });

    it('should return status for connected project', () => {
      const config = { host: 'localhost', port: 3000 };
      const connectedAt = new Date().toISOString();

      service.connections.set('test-project', {
        ws: { readyState: 1, close: vi.fn() },
        config,
        connectedAt,
        status: 'connected'
      });

      const status = service.getProjectStatus('test-project');

      expect(status.connected).toBe(true);
      expect(status.connection.config).toEqual(config);
      expect(status.connection.connectedAt).toBe(connectedAt);
    });

    it('should get status for all projects', () => {
      service.connections.set('project1', {
        ws: { readyState: 1, close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });
      service.isConnecting.set('project2', true);

      const allStatus = service.getAllProjectsStatus();

      expect(allStatus.length).toBe(2);
      expect(allStatus.find(s => s.projectId === 'project1').connected).toBe(true);
      expect(allStatus.find(s => s.projectId === 'project2').connecting).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should start health check interval', () => {
      vi.useFakeTimers();

      service.connections.set('test-project', {
        ws: { readyState: 1, send: vi.fn(), close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });

      service.startHealthCheck('test-project');

      expect(service.healthCheckIntervals.has('test-project')).toBe(true);

      vi.useRealTimers();
    });

    it('should stop health check interval', () => {
      vi.useFakeTimers();

      service.healthCheckIntervals.set('test-project', setInterval(() => {}, 1000));

      service.stopHealthCheck('test-project');

      expect(service.healthCheckIntervals.has('test-project')).toBe(false);

      vi.useRealTimers();
    });

    it('should clear existing interval when starting new one', () => {
      vi.useFakeTimers();

      const oldInterval = setInterval(() => {}, 1000);
      service.healthCheckIntervals.set('test-project', oldInterval);

      service.connections.set('test-project', {
        ws: { readyState: 1, send: vi.fn(), close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });

      service.startHealthCheck('test-project');

      const newInterval = service.healthCheckIntervals.get('test-project');
      expect(newInterval).not.toBe(oldInterval);

      vi.useRealTimers();
    });
  });

  describe('Message Handling', () => {
    it('should handle pong messages', () => {
      const listener = vi.fn();
      service.on('test-project', 'message', listener);

      service.handleProjectMessage('test-project', { type: 'pong', data: {} });

      // pong messages should not emit general message event
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle notification_received messages', () => {
      const listener = vi.fn();
      service.on('test-project', 'notification_sent', listener);

      service.handleProjectMessage('test-project', {
        type: 'notification_received',
        data: { ticketId: '123' }
      });

      expect(listener).toHaveBeenCalledWith({
        projectId: 'test-project',
        data: { ticketId: '123' }
      });
    });

    it('should handle error messages', () => {
      const listener = vi.fn();
      service.on('test-project', 'error', listener);

      service.handleProjectMessage('test-project', {
        type: 'error',
        data: { message: 'Test error' }
      });

      expect(listener).toHaveBeenCalledWith({
        projectId: 'test-project',
        error: 'Test error'
      });
    });

    it('should handle unknown message types', () => {
      const listener = vi.fn();
      service.on('test-project', 'message', listener);

      service.handleProjectMessage('test-project', {
        type: 'custom_type',
        data: { custom: 'data' }
      });

      expect(listener).toHaveBeenCalledWith({
        projectId: 'test-project',
        type: 'custom_type',
        data: { custom: 'data' }
      });
    });
  });

  describe('Ticket Notification Formatting', () => {
    it('should format basic ticket notification', () => {
      const ticketData = {
        id: 123,
        title: 'Test Ticket',
        description: 'Test description',
        workItemType: 'feature',
        stage: 'build',
        substage: 'implement'
      };

      const formatted = service.formatTicketNotification(ticketData);

      expect(formatted.id).toBe('123');
      expect(formatted.title).toBe('Test Ticket');
      expect(formatted.description).toBe('Test description');
      expect(formatted.workItemType).toBe('feature');
      expect(formatted.stage).toBe('build');
      expect(formatted.substage).toBe('implement');
    });

    it('should include issue_json with complete ticket data', () => {
      const ticketData = {
        id: 456,
        title: 'Another Ticket',
        description: 'Another description',
        workItemType: 'bug',
        queuedStages: ['plan', 'build'],
        createdAt: '2024-01-01T00:00:00Z'
      };

      const formatted = service.formatTicketNotification(ticketData);

      expect(formatted.issue_json).toBeDefined();
      expect(formatted.issue_json.number).toBe(456);
      expect(formatted.issue_json.title).toBe('Another Ticket');
      expect(formatted.issue_json.body).toBe('Another description');
      expect(formatted.issue_json.queued_stages).toEqual(['plan', 'build']);
    });

    it('should use default title when none provided', () => {
      const ticketData = {
        id: 789,
        description: 'No title ticket'
      };

      const formatted = service.formatTicketNotification(ticketData);

      expect(formatted.title).toBe('Task 789');
      expect(formatted.issue_json.title).toBe('Task 789');
    });

    it('should handle missing optional fields', () => {
      const ticketData = {
        id: 101
      };

      const formatted = service.formatTicketNotification(ticketData);

      expect(formatted.queuedStages).toEqual([]);
      expect(formatted.images).toEqual([]);
      expect(formatted.progress).toBe(0);
    });

    it('should include metadata fields', () => {
      const ticketData = {
        id: 202,
        title: 'Metadata test',
        metadata: {
          adw_id: 'adw-123',
          workflow_name: 'test_workflow'
        },
        pipelineId: 'pipeline-456'
      };

      const formatted = service.formatTicketNotification(ticketData);

      expect(formatted.metadata.adw_id).toBe('adw-123');
      expect(formatted.metadata.workflow_name).toBe('test_workflow');
      expect(formatted.metadata.pipelineId).toBe('pipeline-456');
    });
  });

  describe('Send Message', () => {
    it('should throw when not connected', async () => {
      await expect(service.sendToProject('test-project', { type: 'test' }))
        .rejects.toThrow('Not connected to project test-project');
    });

    it('should send message when connected', async () => {
      const sendMock = vi.fn();
      service.connections.set('test-project', {
        ws: { readyState: 1, send: sendMock, close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });

      await service.sendToProject('test-project', { type: 'test', data: 'hello' });

      expect(sendMock).toHaveBeenCalledWith(JSON.stringify({ type: 'test', data: 'hello' }));
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all connections and intervals', () => {
      // Set up some state
      service.connections.set('project1', {
        ws: { readyState: 1, close: vi.fn() },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });
      service.isConnecting.set('project2', true);
      service.healthCheckIntervals.set('project1', setInterval(() => {}, 1000));
      service.portCache.set('project1_localhost', { port: 3000 });
      service.initializeProjectListeners('project1');

      service.cleanup();

      expect(service.connections.size).toBe(0);
      expect(service.isConnecting.size).toBe(0);
      expect(service.healthCheckIntervals.size).toBe(0);
      expect(service.eventListeners.size).toBe(0);
      expect(service.portCache.size).toBe(0);
    });
  });

  describe('Disconnect', () => {
    it('should disconnect from project', () => {
      const closeMock = vi.fn();
      service.connections.set('test-project', {
        ws: { readyState: 1, close: closeMock },
        config: { port: 3000 },
        connectedAt: new Date().toISOString(),
        status: 'connected'
      });
      service.healthCheckIntervals.set('test-project', setInterval(() => {}, 1000));

      service.disconnectFromProject('test-project');

      expect(closeMock).toHaveBeenCalledWith(1000, 'Client disconnect');
      expect(service.connections.has('test-project')).toBe(false);
      expect(service.healthCheckIntervals.has('test-project')).toBe(false);
    });

    it('should handle disconnect for non-connected project', () => {
      // Should not throw
      expect(() => service.disconnectFromProject('nonexistent')).not.toThrow();
    });

    it('should clear reconnect attempts on disconnect', () => {
      service.reconnectAttempts.set('test-project', 2);
      service.isConnecting.set('test-project', true);

      service.disconnectFromProject('test-project');

      expect(service.reconnectAttempts.has('test-project')).toBe(false);
      expect(service.isConnecting.get('test-project')).toBe(false);
    });
  });

  describe('Server Type Validation', () => {
    it('should return high confidence for vite servers', async () => {
      const confidence = await service.validateServerType('localhost', 5173, 'vite');
      expect(confidence).toBe(0.9);
    });

    it('should return moderate confidence for react servers', async () => {
      const confidence = await service.validateServerType('localhost', 3000, 'react');
      expect(confidence).toBe(0.8);
    });

    it('should return lower confidence for general servers', async () => {
      const confidence = await service.validateServerType('localhost', 4000, 'general');
      expect(confidence).toBe(0.4);
    });

    it('should return default confidence for unknown server types', async () => {
      const confidence = await service.validateServerType('localhost', 9999, 'unknown');
      expect(confidence).toBe(0.5);
    });
  });

  describe('Reconnection Scheduling', () => {
    it('should schedule reconnect on non-clean close', () => {
      vi.useFakeTimers();

      const config = { host: 'localhost', port: 3000 };

      service.scheduleReconnect('test-project', config);

      expect(service.reconnectAttempts.get('test-project')).toBe(1);

      vi.useRealTimers();
    });

    it('should not exceed max reconnect attempts', () => {
      vi.useFakeTimers();

      const config = { host: 'localhost', port: 3000 };
      service.reconnectAttempts.set('test-project', service.maxReconnectAttempts);

      const errorListener = vi.fn();
      service.on('test-project', 'error', errorListener);

      service.scheduleReconnect('test-project', config);

      expect(errorListener).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should use exponential backoff for reconnect delay', () => {
      vi.useFakeTimers();

      const config = { host: 'localhost', port: 3000 };

      // First attempt
      service.scheduleReconnect('test-project', config);
      const firstAttempt = service.reconnectAttempts.get('test-project');

      // Reset for second attempt
      service.reconnectAttempts.set('test-project', 1);
      service.scheduleReconnect('test-project', config);
      const secondAttempt = service.reconnectAttempts.get('test-project');

      expect(secondAttempt).toBe(firstAttempt + 1);

      vi.useRealTimers();
    });
  });
});
