/**
 * Tests for ConnectionHealthMonitor
 * Comprehensive tests for WebSocket health monitoring and diagnostics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConnectionHealthMonitor,
  HEALTH_STATUS,
  HEALTH_CHECK_TYPES
} from '../connectionHealthMonitor.js';

// Mock WebSocketErrorMapper
vi.mock('../../utils/websocketErrorMapping.js', () => ({
  default: {
    mapError: vi.fn((error) => ({
      code: 'connection_error',
      category: 'system',
      severity: 'medium',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      userMessage: "Something unexpected happened. We're not sure what went wrong.",
      suggestions: [
        'Try the action again',
        'Refresh the page if the problem continues',
        'Contact support with details about what you were doing'
      ],
      recoveryActions: ['retry', 'refresh', 'contact_support'],
      autoRetry: true,
      retryDelay: 3000,
      timestamp: '2025-01-15T12:00:00.000Z',
      context: {},
      originalError: error
    }))
  }
}));

// Create mock WebSocket service
const createMockWebSocketService = (isConnected = false) => ({
  isConnected,
  on: vi.fn(),
  off: vi.fn(),
  sendMessage: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({
    status: 'healthy',
    load: 0.5,
    memory_usage: 0.6,
    active_connections: 10
  }),
  connect: vi.fn().mockResolvedValue()
});

describe('ConnectionHealthMonitor', () => {
  let monitor;
  let mockWsService;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock localStorage
    const localStorageMock = {
      store: {},
      getItem: vi.fn((key) => localStorageMock.store[key] || null),
      setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
      removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
      clear: vi.fn(() => { localStorageMock.store = {}; })
    };
    global.localStorage = localStorageMock;

    mockWsService = createMockWebSocketService();
    monitor = new ConnectionHealthMonitor(mockWsService);
  });

  afterEach(() => {
    monitor.cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default metrics', () => {
      expect(monitor.metrics.connection.status).toBe(HEALTH_STATUS.UNKNOWN);
      expect(monitor.metrics.connection.uptime).toBe(0);
      expect(monitor.metrics.connection.disconnectionCount).toBe(0);
      expect(monitor.metrics.connection.reconnectionCount).toBe(0);
    });

    it('should initialize latency metrics', () => {
      expect(monitor.metrics.latency.current).toBeNull();
      expect(monitor.metrics.latency.average).toBeNull();
      expect(monitor.metrics.latency.min).toBeNull();
      expect(monitor.metrics.latency.max).toBeNull();
      expect(monitor.metrics.latency.samples).toEqual([]);
      expect(monitor.metrics.latency.degradedThreshold).toBe(500);
      expect(monitor.metrics.latency.unhealthyThreshold).toBe(1000);
    });

    it('should initialize throughput metrics', () => {
      expect(monitor.metrics.throughput.messagesSent).toBe(0);
      expect(monitor.metrics.throughput.messagesReceived).toBe(0);
      expect(monitor.metrics.throughput.bytesTransferred).toBe(0);
      expect(monitor.metrics.throughput.messagesPerSecond).toBe(0);
    });

    it('should initialize reliability metrics', () => {
      expect(monitor.metrics.reliability.successfulConnections).toBe(0);
      expect(monitor.metrics.reliability.failedConnections).toBe(0);
      expect(monitor.metrics.reliability.messageFailures).toBe(0);
      expect(monitor.metrics.reliability.reliabilityScore).toBe(1.0);
    });

    it('should initialize server metrics', () => {
      expect(monitor.metrics.server.status).toBe(HEALTH_STATUS.UNKNOWN);
      expect(monitor.metrics.server.load).toBeNull();
      expect(monitor.metrics.server.memoryUsage).toBeNull();
      expect(monitor.metrics.server.activeConnections).toBeNull();
    });

    it('should initialize with monitoring disabled', () => {
      expect(monitor.isMonitoring).toBe(false);
    });

    it('should load alert history from localStorage', () => {
      localStorage.setItem('websocket_alert_history', JSON.stringify([
        { id: 'alert_1', level: 'warning', title: 'Test' }
      ]));

      const newMonitor = new ConnectionHealthMonitor(mockWsService);

      expect(newMonitor.alertHistory.length).toBe(1);
      newMonitor.cleanup();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      monitor.startMonitoring();

      expect(monitor.isMonitoring).toBe(true);
      expect(mockWsService.on).toHaveBeenCalled();
    });

    it('should set up WebSocket event listeners on start', () => {
      monitor.startMonitoring();

      expect(mockWsService.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockWsService.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should emit status_change event on start', () => {
      const listener = vi.fn();
      monitor.on('status_change', listener);

      monitor.startMonitoring();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        monitoring: true
      }));
    });

    it('should not start monitoring if already monitoring', () => {
      monitor.startMonitoring();
      const initialCallCount = mockWsService.on.mock.calls.length;

      monitor.startMonitoring(); // Second call

      expect(mockWsService.on.mock.calls.length).toBe(initialCallCount);
    });

    it('should stop monitoring', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();

      expect(monitor.isMonitoring).toBe(false);
      expect(monitor.intervals.size).toBe(0);
    });

    it('should emit status_change event on stop', () => {
      monitor.startMonitoring();

      const listener = vi.fn();
      monitor.on('status_change', listener);

      monitor.stopMonitoring();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        monitoring: false
      }));
    });
  });

  describe('Connection Event Handling', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should handle connect event', () => {
      monitor.handleConnectionEvent('connect');

      expect(monitor.connectionStartTime).not.toBeNull();
      expect(monitor.metrics.connection.lastConnected).not.toBeNull();
      expect(monitor.metrics.reliability.successfulConnections).toBe(1);
    });

    it('should handle disconnect event', () => {
      monitor.connectionStartTime = Date.now() - 5000;
      monitor.handleConnectionEvent('disconnect');

      expect(monitor.metrics.connection.disconnectionCount).toBe(1);
      expect(monitor.lastDisconnectionTime).not.toBeNull();
    });

    it('should handle error event', () => {
      monitor.handleConnectionEvent('error', { type: 'connection_error' });

      expect(monitor.metrics.reliability.failedConnections).toBe(1);
    });

    it('should emit metric_update on connection events', () => {
      const listener = vi.fn();
      monitor.on('metric_update', listener);

      monitor.handleConnectionEvent('connect');

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'connection',
        event: 'connect'
      }));
    });
  });

  describe('Latency Monitoring', () => {
    beforeEach(() => {
      mockWsService.isConnected = true;
      monitor.startMonitoring();
    });

    it('should send ping for latency measurement', () => {
      monitor.measureLatency();

      expect(mockWsService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ping',
        healthCheck: true
      }));
    });

    it('should not measure latency when disconnected', () => {
      mockWsService.isConnected = false;
      mockWsService.sendMessage.mockClear(); // Clear any calls from beforeEach/startMonitoring

      monitor.measureLatency();

      expect(mockWsService.sendMessage).not.toHaveBeenCalled();
    });

    it('should update latency metrics from pong', () => {
      const timestamp = Date.now() - 50; // 50ms latency
      monitor.handlePongEvent({ timestamp });

      expect(monitor.metrics.latency.current).toBeGreaterThanOrEqual(0);
      expect(monitor.metrics.latency.samples.length).toBe(1);
    });

    it('should calculate latency statistics', () => {
      // Add multiple samples
      monitor.updateLatencyMetrics(100);
      monitor.updateLatencyMetrics(200);
      monitor.updateLatencyMetrics(150);

      expect(monitor.metrics.latency.average).toBe(150);
      expect(monitor.metrics.latency.min).toBe(100);
      expect(monitor.metrics.latency.max).toBe(200);
    });

    it('should limit latency samples to 100', () => {
      for (let i = 0; i < 150; i++) {
        monitor.updateLatencyMetrics(i);
      }

      expect(monitor.metrics.latency.samples.length).toBe(100);
    });
  });

  describe('Throughput Monitoring', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should calculate throughput', () => {
      monitor.metrics.throughput.messagesSent = 10;
      monitor.metrics.throughput.messagesReceived = 15;
      monitor.metrics.throughput.lastMeasurement = Date.now() - 1000;

      monitor.calculateThroughput();

      expect(monitor.metrics.throughput.messagesPerSecond).toBeGreaterThan(0);
    });

    it('should reset counters after calculation', () => {
      monitor.metrics.throughput.messagesSent = 10;
      monitor.metrics.throughput.messagesReceived = 15;
      monitor.metrics.throughput.lastMeasurement = Date.now() - 1000;

      monitor.calculateThroughput();

      expect(monitor.metrics.throughput.messagesSent).toBe(0);
      expect(monitor.metrics.throughput.messagesReceived).toBe(0);
    });

    it('should emit metric_update for throughput', () => {
      const listener = vi.fn();
      monitor.on('metric_update', listener);

      monitor.calculateThroughput();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'throughput'
      }));
    });
  });

  describe('Reliability Monitoring', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should calculate reliability score', () => {
      monitor.metrics.reliability.successfulConnections = 9;
      monitor.metrics.reliability.failedConnections = 1;
      monitor.metrics.reliability.totalMessages = 100;
      monitor.metrics.reliability.messageFailures = 5;

      monitor.calculateReliability();

      // Expected: (0.9 * 0.7) + (0.95 * 0.3) = 0.63 + 0.285 = 0.915
      expect(monitor.metrics.reliability.reliabilityScore).toBeCloseTo(0.915, 2);
    });

    it('should return 1.0 for perfect reliability', () => {
      monitor.metrics.reliability.successfulConnections = 10;
      monitor.metrics.reliability.failedConnections = 0;
      monitor.metrics.reliability.totalMessages = 100;
      monitor.metrics.reliability.messageFailures = 0;

      monitor.calculateReliability();

      expect(monitor.metrics.reliability.reliabilityScore).toBe(1.0);
    });

    it('should emit metric_update for reliability', () => {
      const listener = vi.fn();
      monitor.on('metric_update', listener);

      monitor.calculateReliability();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'reliability'
      }));
    });
  });

  describe('Server Health Check', () => {
    beforeEach(() => {
      mockWsService.isConnected = true;
      monitor.startMonitoring();
    });

    it('should update server metrics on successful health check', async () => {
      await monitor.checkServerHealth();

      expect(monitor.metrics.server.status).toBe(HEALTH_STATUS.HEALTHY);
      expect(monitor.metrics.server.load).toBe(0.5);
      expect(monitor.metrics.server.memoryUsage).toBe(0.6);
      expect(monitor.metrics.server.activeConnections).toBe(10);
    });

    it('should set unhealthy status on failed health check', async () => {
      mockWsService.checkHealth.mockRejectedValue(new Error('Health check failed'));

      await monitor.checkServerHealth();

      expect(monitor.metrics.server.status).toBe(HEALTH_STATUS.UNHEALTHY);
    });

    it('should set unhealthy when disconnected', async () => {
      mockWsService.isConnected = false;

      await monitor.checkServerHealth();

      expect(monitor.metrics.server.status).toBe(HEALTH_STATUS.UNHEALTHY);
    });
  });

  describe('Overall Health Assessment', () => {
    beforeEach(() => {
      mockWsService.isConnected = true;
      monitor.startMonitoring();
    });

    it('should assess healthy status', () => {
      monitor.metrics.latency.average = 100;
      monitor.metrics.reliability.reliabilityScore = 0.98;
      monitor.metrics.server.status = HEALTH_STATUS.HEALTHY;

      monitor.assessOverallHealth();

      expect(monitor.metrics.connection.status).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should assess degraded status', () => {
      monitor.metrics.latency.average = 600; // Above degraded threshold
      monitor.metrics.reliability.reliabilityScore = 0.98;
      monitor.metrics.server.status = HEALTH_STATUS.HEALTHY;

      monitor.assessOverallHealth();

      expect(monitor.metrics.connection.status).toBe(HEALTH_STATUS.DEGRADED);
    });

    it('should assess unhealthy status', () => {
      mockWsService.isConnected = false;

      monitor.assessOverallHealth();

      expect(monitor.metrics.connection.status).toBe(HEALTH_STATUS.UNHEALTHY);
    });

    it('should emit status_change on status transition', () => {
      const listener = vi.fn();
      monitor.on('status_change', listener);

      // Set initial status to UNKNOWN (default)
      monitor.metrics.connection.status = HEALTH_STATUS.UNKNOWN;

      // Make the connection healthy so status changes from UNKNOWN to HEALTHY
      mockWsService.isConnected = true;
      monitor.metrics.latency.average = 100;
      monitor.metrics.reliability.reliabilityScore = 0.98;
      monitor.metrics.server.status = HEALTH_STATUS.HEALTHY;

      monitor.assessOverallHealth();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit degradation event when status worsens', () => {
      const listener = vi.fn();
      monitor.on('degradation', listener);

      // Set initial healthy status
      monitor.metrics.connection.status = HEALTH_STATUS.HEALTHY;

      // Make it unhealthy
      mockWsService.isConnected = false;
      monitor.metrics.server.status = HEALTH_STATUS.UNHEALTHY;

      monitor.assessOverallHealth();

      expect(listener).toHaveBeenCalled();
    });

    it('should emit recovery event when status improves', () => {
      const listener = vi.fn();
      monitor.on('recovery', listener);

      // Set initial unhealthy status
      monitor.metrics.connection.status = HEALTH_STATUS.UNHEALTHY;

      // Make it healthy
      monitor.metrics.latency.average = 100;
      monitor.metrics.reliability.reliabilityScore = 0.98;
      monitor.metrics.server.status = HEALTH_STATUS.HEALTHY;

      monitor.assessOverallHealth();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Status Comparison', () => {
    it('should detect when status is worse', () => {
      expect(monitor.isStatusWorse(HEALTH_STATUS.DEGRADED, HEALTH_STATUS.HEALTHY)).toBe(true);
      expect(monitor.isStatusWorse(HEALTH_STATUS.UNHEALTHY, HEALTH_STATUS.DEGRADED)).toBe(true);
      expect(monitor.isStatusWorse(HEALTH_STATUS.CRITICAL, HEALTH_STATUS.UNHEALTHY)).toBe(true);
    });

    it('should detect when status is better', () => {
      expect(monitor.isStatusBetter(HEALTH_STATUS.HEALTHY, HEALTH_STATUS.DEGRADED)).toBe(true);
      expect(monitor.isStatusBetter(HEALTH_STATUS.DEGRADED, HEALTH_STATUS.UNHEALTHY)).toBe(true);
      expect(monitor.isStatusBetter(HEALTH_STATUS.UNHEALTHY, HEALTH_STATUS.CRITICAL)).toBe(true);
    });

    it('should not consider same status as worse or better', () => {
      expect(monitor.isStatusWorse(HEALTH_STATUS.HEALTHY, HEALTH_STATUS.HEALTHY)).toBe(false);
      expect(monitor.isStatusBetter(HEALTH_STATUS.HEALTHY, HEALTH_STATUS.HEALTHY)).toBe(false);
    });
  });

  describe('Overall Status Calculation', () => {
    it('should return critical if any component is critical', () => {
      const statuses = [HEALTH_STATUS.HEALTHY, HEALTH_STATUS.CRITICAL, HEALTH_STATUS.DEGRADED];
      expect(monitor.calculateOverallStatus(statuses)).toBe(HEALTH_STATUS.CRITICAL);
    });

    it('should return unhealthy if any component is unhealthy', () => {
      const statuses = [HEALTH_STATUS.HEALTHY, HEALTH_STATUS.UNHEALTHY, HEALTH_STATUS.DEGRADED];
      expect(monitor.calculateOverallStatus(statuses)).toBe(HEALTH_STATUS.UNHEALTHY);
    });

    it('should return degraded if any component is degraded', () => {
      const statuses = [HEALTH_STATUS.HEALTHY, HEALTH_STATUS.DEGRADED, HEALTH_STATUS.HEALTHY];
      expect(monitor.calculateOverallStatus(statuses)).toBe(HEALTH_STATUS.DEGRADED);
    });

    it('should return healthy if all components are healthy', () => {
      const statuses = [HEALTH_STATUS.HEALTHY, HEALTH_STATUS.HEALTHY, HEALTH_STATUS.HEALTHY];
      expect(monitor.calculateOverallStatus(statuses)).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should return unknown if no healthy components', () => {
      const statuses = [HEALTH_STATUS.UNKNOWN, HEALTH_STATUS.UNKNOWN];
      expect(monitor.calculateOverallStatus(statuses)).toBe(HEALTH_STATUS.UNKNOWN);
    });
  });

  describe('Alerts', () => {
    it('should create latency warning alert', () => {
      monitor.checkLatencyAlert(350); // Above warning threshold

      expect(monitor.alertHistory.length).toBe(1);
      expect(monitor.alertHistory[0].level).toBe('warning');
      expect(monitor.alertHistory[0].title).toContain('Latency');
    });

    it('should create latency critical alert', () => {
      monitor.checkLatencyAlert(1500); // Above critical threshold

      expect(monitor.alertHistory.length).toBe(1);
      expect(monitor.alertHistory[0].level).toBe('critical');
    });

    it('should create reliability warning alert', () => {
      monitor.checkReliabilityAlert(0.85); // Below warning threshold

      expect(monitor.alertHistory.length).toBe(1);
      expect(monitor.alertHistory[0].level).toBe('warning');
    });

    it('should create reliability critical alert', () => {
      monitor.checkReliabilityAlert(0.65); // Below critical threshold

      expect(monitor.alertHistory.length).toBe(1);
      expect(monitor.alertHistory[0].level).toBe('critical');
    });

    it('should limit alert history size', () => {
      for (let i = 0; i < 60; i++) {
        monitor.createAlert('warning', `Alert ${i}`, 'Test message');
      }

      expect(monitor.alertHistory.length).toBe(50); // maxAlertHistory
    });

    it('should persist alerts to localStorage', () => {
      monitor.createAlert('warning', 'Test Alert', 'Test message');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'websocket_alert_history',
        expect.any(String)
      );
    });

    it('should emit alert event', () => {
      const listener = vi.fn();
      monitor.on('alert', listener);

      monitor.createAlert('warning', 'Test Alert', 'Test message');

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        level: 'warning',
        title: 'Test Alert',
        message: 'Test message'
      }));
    });

    it('should acknowledge alert', () => {
      monitor.createAlert('warning', 'Test Alert', 'Test message');
      const alertId = monitor.alertHistory[0].id;

      monitor.acknowledgeAlert(alertId);

      expect(monitor.alertHistory[0].acknowledged).toBe(true);
      expect(monitor.alertHistory[0].acknowledgedAt).toBeDefined();
    });

    it('should get recent alerts', () => {
      for (let i = 0; i < 30; i++) {
        monitor.createAlert('warning', `Alert ${i}`, 'Test message');
      }

      const recent = monitor.getRecentAlerts(20);

      expect(recent.length).toBe(20);
    });

    it('should get unacknowledged alerts', () => {
      monitor.createAlert('warning', 'Alert 1', 'Test message');
      monitor.createAlert('warning', 'Alert 2', 'Test message');
      monitor.acknowledgeAlert(monitor.alertHistory[0].id);

      const unack = monitor.getUnacknowledgedAlerts();

      expect(unack.length).toBe(1);
    });
  });

  describe('Adaptive Intervals', () => {
    it('should adjust to fast mode when unhealthy', () => {
      monitor.startMonitoring();
      monitor.adjustMonitoringIntervals(HEALTH_STATUS.UNHEALTHY);

      expect(monitor.currentIntervalMode).toBe('FAST');
    });

    it('should adjust to normal mode when degraded', () => {
      monitor.startMonitoring();
      monitor.adjustMonitoringIntervals(HEALTH_STATUS.DEGRADED);

      expect(monitor.currentIntervalMode).toBe('NORMAL');
    });

    it('should adjust to slow mode when healthy', () => {
      monitor.startMonitoring();
      monitor.adjustMonitoringIntervals(HEALTH_STATUS.HEALTHY);

      expect(monitor.currentIntervalMode).toBe('SLOW');
    });

    it('should not adjust when adaptive intervals disabled', () => {
      monitor.adaptiveIntervalsEnabled = false;
      monitor.currentIntervalMode = 'NORMAL';

      monitor.adjustMonitoringIntervals(HEALTH_STATUS.UNHEALTHY);

      expect(monitor.currentIntervalMode).toBe('NORMAL');
    });
  });

  describe('Automatic Recovery', () => {
    beforeEach(() => {
      mockWsService.isConnected = false;
      monitor.startMonitoring();
    });

    it('should attempt recovery when health degrades to unhealthy', async () => {
      monitor.metrics.connection.status = HEALTH_STATUS.HEALTHY;

      // Trigger health assessment that results in unhealthy
      monitor.assessOverallHealth();

      // Fast forward past the minimum recovery interval
      vi.advanceTimersByTime(6000);

      expect(mockWsService.connect).toHaveBeenCalled();
    });

    it('should track recovery attempts', async () => {
      await monitor.attemptRecovery();

      expect(monitor.recoveryAttempts).toBe(1);
      expect(monitor.lastRecoveryAttempt).not.toBeNull();
    });

    it('should not attempt recovery too frequently', async () => {
      await monitor.attemptRecovery();
      const firstAttempt = monitor.recoveryAttempts;

      await monitor.attemptRecovery(); // Should be skipped

      expect(monitor.recoveryAttempts).toBe(firstAttempt);
    });

    it('should track recovery failures', async () => {
      mockWsService.connect.mockRejectedValue(new Error('Connection failed'));

      await monitor.attemptRecovery();

      expect(monitor.recoveryFailureCount).toBe(1);
    });
  });

  describe('Health Status', () => {
    it('should return comprehensive health status', () => {
      mockWsService.isConnected = true;
      monitor.metrics.latency.current = 50;
      monitor.metrics.latency.average = 60;
      monitor.metrics.reliability.reliabilityScore = 0.95;

      const status = monitor.getHealthStatus();

      expect(status.overall).toBeDefined();
      expect(status.connection).toBeDefined();
      expect(status.latency).toBeDefined();
      expect(status.reliability).toBeDefined();
      expect(status.server).toBeDefined();
      expect(status.recovery).toBeDefined();
      expect(status.monitoring).toBeDefined();
      expect(status.lastUpdate).toBeDefined();
    });

    it('should include recovery statistics', () => {
      monitor.recoveryAttempts = 3;
      monitor.recoverySuccessCount = 2;
      monitor.recoveryFailureCount = 1;

      const status = monitor.getHealthStatus();

      expect(status.recovery.attempts).toBe(3);
      expect(status.recovery.successCount).toBe(2);
      expect(status.recovery.failureCount).toBe(1);
    });

    it('should include monitoring state', () => {
      monitor.startMonitoring();
      monitor.adaptiveIntervalsEnabled = true;
      monitor.currentIntervalMode = 'FAST';

      const status = monitor.getHealthStatus();

      expect(status.monitoring.isActive).toBe(true);
      expect(status.monitoring.mode).toBe('FAST');
      expect(status.monitoring.adaptiveEnabled).toBe(true);
    });
  });

  describe('Latency Status', () => {
    it('should return unknown for null average', () => {
      expect(monitor.getLatencyStatus()).toBe(HEALTH_STATUS.UNKNOWN);
    });

    it('should return healthy for low latency', () => {
      monitor.metrics.latency.average = 100;
      expect(monitor.getLatencyStatus()).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should return degraded for medium latency', () => {
      monitor.metrics.latency.average = 600;
      expect(monitor.getLatencyStatus()).toBe(HEALTH_STATUS.DEGRADED);
    });

    it('should return unhealthy for high latency', () => {
      monitor.metrics.latency.average = 1500;
      expect(monitor.getLatencyStatus()).toBe(HEALTH_STATUS.UNHEALTHY);
    });
  });

  describe('Reliability Status', () => {
    it('should return healthy for high reliability', () => {
      monitor.metrics.reliability.reliabilityScore = 0.98;
      expect(monitor.getReliabilityStatus()).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should return degraded for medium reliability', () => {
      monitor.metrics.reliability.reliabilityScore = 0.90;
      expect(monitor.getReliabilityStatus()).toBe(HEALTH_STATUS.DEGRADED);
    });

    it('should return unhealthy for low reliability', () => {
      monitor.metrics.reliability.reliabilityScore = 0.70;
      expect(monitor.getReliabilityStatus()).toBe(HEALTH_STATUS.UNHEALTHY);
    });
  });

  describe('Server Status Mapping', () => {
    it('should map healthy status', () => {
      expect(monitor.mapServerStatus('healthy')).toBe(HEALTH_STATUS.HEALTHY);
    });

    it('should map degraded status', () => {
      expect(monitor.mapServerStatus('degraded')).toBe(HEALTH_STATUS.DEGRADED);
    });

    it('should map unhealthy status', () => {
      expect(monitor.mapServerStatus('unhealthy')).toBe(HEALTH_STATUS.UNHEALTHY);
    });

    it('should map critical status', () => {
      expect(monitor.mapServerStatus('critical')).toBe(HEALTH_STATUS.CRITICAL);
    });

    it('should map unknown status', () => {
      expect(monitor.mapServerStatus('something_else')).toBe(HEALTH_STATUS.UNKNOWN);
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener', () => {
      const listener = vi.fn();
      monitor.on('alert', listener);

      monitor.emit('alert', { test: 'data' });

      expect(listener).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should remove event listener', () => {
      const listener = vi.fn();
      monitor.on('alert', listener);
      monitor.off('alert', listener);

      monitor.emit('alert', { test: 'data' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      monitor.on('alert', errorListener);

      expect(() => monitor.emit('alert', {})).not.toThrow();
    });

    it('should not add listener for unknown event', () => {
      const listener = vi.fn();
      monitor.on('unknown_event', listener);

      // healthListeners doesn't have unknown_event
      expect(monitor.healthListeners['unknown_event']).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should stop monitoring on cleanup', () => {
      monitor.startMonitoring();
      monitor.cleanup();

      expect(monitor.isMonitoring).toBe(false);
    });

    it('should clear all intervals', () => {
      monitor.startMonitoring();
      monitor.cleanup();

      expect(monitor.intervals.size).toBe(0);
    });

    it('should clear all listeners', () => {
      monitor.on('alert', vi.fn());
      monitor.on('status_change', vi.fn());

      monitor.cleanup();

      expect(monitor.healthListeners.alert.length).toBe(0);
      expect(monitor.healthListeners.status_change.length).toBe(0);
    });

    it('should clear alert history', () => {
      monitor.createAlert('warning', 'Test', 'Test');
      monitor.cleanup();

      expect(monitor.alertHistory.length).toBe(0);
    });
  });

  describe('Immediate Health Check', () => {
    it('should perform immediate health check', async () => {
      mockWsService.isConnected = true;

      const status = await monitor.performHealthCheck();

      expect(status).toBeDefined();
      expect(status.overall).toBeDefined();
    });

    it('should return full health status', async () => {
      mockWsService.isConnected = true;
      monitor.metrics.latency.average = 50;
      monitor.metrics.reliability.reliabilityScore = 0.99;

      const status = await monitor.performHealthCheck();

      expect(status.connection).toBeDefined();
      expect(status.latency).toBeDefined();
      expect(status.reliability).toBeDefined();
      expect(status.server).toBeDefined();
    });
  });

  describe('HEALTH_STATUS and HEALTH_CHECK_TYPES exports', () => {
    it('should export HEALTH_STATUS constants', () => {
      expect(HEALTH_STATUS.HEALTHY).toBe('healthy');
      expect(HEALTH_STATUS.DEGRADED).toBe('degraded');
      expect(HEALTH_STATUS.UNHEALTHY).toBe('unhealthy');
      expect(HEALTH_STATUS.CRITICAL).toBe('critical');
      expect(HEALTH_STATUS.UNKNOWN).toBe('unknown');
    });

    it('should export HEALTH_CHECK_TYPES constants', () => {
      expect(HEALTH_CHECK_TYPES.CONNECTION).toBe('connection');
      expect(HEALTH_CHECK_TYPES.LATENCY).toBe('latency');
      expect(HEALTH_CHECK_TYPES.THROUGHPUT).toBe('throughput');
      expect(HEALTH_CHECK_TYPES.RELIABILITY).toBe('reliability');
      expect(HEALTH_CHECK_TYPES.SERVER).toBe('server');
      expect(HEALTH_CHECK_TYPES.QUEUE).toBe('queue');
    });
  });
});
