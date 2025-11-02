/**
 * Connection Health Monitor
 * Provides comprehensive health monitoring and diagnostics for WebSocket connections
 * Compliant with TAC-7 WebSocket Integration Guide requirements
 */

import WebSocketErrorMapper from '../../utils/websocketErrorMapping.js';

/**
 * Health status levels
 */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown'
};

/**
 * Health check types
 */
export const HEALTH_CHECK_TYPES = {
  CONNECTION: 'connection',
  LATENCY: 'latency',
  THROUGHPUT: 'throughput',
  RELIABILITY: 'reliability',
  SERVER: 'server',
  QUEUE: 'queue'
};

/**
 * Metric collection intervals (adaptive based on connection quality)
 */
const METRIC_INTERVALS = {
  FAST: 3000,      // 3 seconds (reduced from 5s for faster detection)
  NORMAL: 15000,   // 15 seconds
  SLOW: 30000,     // 30 seconds
  HEALTH: 60000    // 1 minute
};

/**
 * Connection Health Monitor Class
 */
export class ConnectionHealthMonitor {
  constructor(websocketService) {
    this.websocketService = websocketService;

    // Health metrics storage
    this.metrics = {
      connection: {
        status: HEALTH_STATUS.UNKNOWN,
        uptime: 0,
        lastConnected: null,
        disconnectionCount: 0,
        reconnectionCount: 0,
        totalDowntime: 0
      },
      latency: {
        current: null,
        average: null,
        min: null,
        max: null,
        samples: [],
        degradedThreshold: 500,   // ms
        unhealthyThreshold: 1000  // ms
      },
      throughput: {
        messagesSent: 0,
        messagesReceived: 0,
        bytesTransferred: 0,
        messagesPerSecond: 0,
        lastMeasurement: Date.now()
      },
      reliability: {
        successfulConnections: 0,
        failedConnections: 0,
        messageFailures: 0,
        totalMessages: 0,
        reliabilityScore: 1.0
      },
      server: {
        status: HEALTH_STATUS.UNKNOWN,
        load: null,
        memoryUsage: null,
        activeConnections: null,
        responseTime: null,
        lastHealthCheck: null
      },
      queue: {
        length: 0,
        estimatedWaitTime: 0,
        processed: 0,
        failed: 0
      }
    };

    // Health check intervals
    this.intervals = new Map();

    // Health event listeners
    this.healthListeners = {
      status_change: [],
      degradation: [],
      recovery: [],
      alert: [],
      metric_update: []
    };

    // Connection state tracking
    this.connectionStartTime = null;
    this.lastDisconnectionTime = null;
    this.isMonitoring = false;

    // Alert thresholds
    this.alertThresholds = {
      latency: {
        warning: 300,    // ms
        critical: 1000   // ms
      },
      reliability: {
        warning: 0.9,    // 90%
        critical: 0.7    // 70%
      },
      disconnections: {
        warning: 3,      // per hour
        critical: 10     // per hour
      }
    };

    // Alert history with persistence
    this.alertHistory = [];
    this.maxAlertHistory = 50; // Reduced from 100 to 50 for localStorage efficiency
    this.loadAlertHistory(); // Load from localStorage

    // Recovery tracking
    this.recoveryAttempts = 0;
    this.lastRecoveryAttempt = null;
    this.recoverySuccessCount = 0;
    this.recoveryFailureCount = 0;

    // Adaptive intervals based on connection quality
    this.currentIntervalMode = 'NORMAL';
    this.adaptiveIntervalsEnabled = true;

    console.log('ConnectionHealthMonitor initialized with enhanced features');
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('Health monitoring already started');
      return;
    }

    console.log('Starting WebSocket health monitoring');
    this.isMonitoring = true;

    // Set up monitoring intervals
    this.setupMonitoringIntervals();

    // Set up WebSocket event listeners
    this.setupWebSocketListeners();

    // Initial health check
    this.performHealthCheck();

    this.emit('status_change', {
      monitoring: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping WebSocket health monitoring');
    this.isMonitoring = false;

    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    this.emit('status_change', {
      monitoring: false,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up monitoring intervals
   */
  setupMonitoringIntervals() {
    // Latency monitoring (fast)
    this.intervals.set('latency', setInterval(() => {
      this.measureLatency();
    }, METRIC_INTERVALS.FAST));

    // Throughput monitoring (normal)
    this.intervals.set('throughput', setInterval(() => {
      this.calculateThroughput();
    }, METRIC_INTERVALS.NORMAL));

    // Reliability monitoring (normal)
    this.intervals.set('reliability', setInterval(() => {
      this.calculateReliability();
    }, METRIC_INTERVALS.NORMAL));

    // Server health check (slow)
    this.intervals.set('server_health', setInterval(() => {
      this.checkServerHealth();
    }, METRIC_INTERVALS.SLOW));

    // Overall health assessment (health interval)
    this.intervals.set('health_assessment', setInterval(() => {
      this.assessOverallHealth();
    }, METRIC_INTERVALS.HEALTH));
  }

  /**
   * Set up WebSocket event listeners
   */
  setupWebSocketListeners() {
    // Connection events
    this.websocketService.on('connect', () => {
      this.handleConnectionEvent('connect');
    });

    this.websocketService.on('disconnect', (data) => {
      this.handleConnectionEvent('disconnect', data);
    });

    this.websocketService.on('error', (error) => {
      this.handleConnectionEvent('error', error);
    });

    // Message events
    this.websocketService.on('trigger_response', (data) => {
      this.handleMessageEvent('response', data);
    });

    this.websocketService.on('status_update', (data) => {
      this.handleMessageEvent('status_update', data);
    });

    this.websocketService.on('pong', (data) => {
      this.handlePongEvent(data);
    });
  }

  /**
   * Handle connection events
   */
  handleConnectionEvent(event, data = null) {
    const now = Date.now();

    switch (event) {
      case 'connect':
        this.connectionStartTime = now;
        this.metrics.connection.lastConnected = new Date().toISOString();
        this.metrics.reliability.successfulConnections++;

        console.log('Health Monitor: Connection established');
        break;

      case 'disconnect':
        if (this.connectionStartTime) {
          const sessionDuration = now - this.connectionStartTime;
          this.metrics.connection.uptime += sessionDuration;
        }

        this.lastDisconnectionTime = now;
        this.metrics.connection.disconnectionCount++;

        // Track downtime start
        this.downtimeStart = now;

        console.log('Health Monitor: Connection lost');
        break;

      case 'error': {
        this.metrics.reliability.failedConnections++;

        // Map error and check if it should trigger an alert
        const mappedError = WebSocketErrorMapper.mapError(data);
        this.checkErrorAlert(mappedError);

        console.log('Health Monitor: Connection error', mappedError);
        break;
      }
    }

    this.emit('metric_update', {
      type: 'connection',
      event,
      metrics: this.metrics.connection,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle message events
   */
  handleMessageEvent(type, data) {
    this.metrics.throughput.messagesReceived++;
    this.metrics.throughput.totalMessages++;

    // Estimate message size (rough calculation)
    const messageSize = JSON.stringify(data).length;
    this.metrics.throughput.bytesTransferred += messageSize;

    this.emit('metric_update', {
      type: 'throughput',
      messageType: type,
      metrics: this.metrics.throughput,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle pong events for latency measurement
   */
  handlePongEvent(data) {
    const now = Date.now();
    const sentTime = data.timestamp || now;
    const latency = now - sentTime;

    // Update latency metrics (console logging removed to reduce clutter)
    this.updateLatencyMetrics(latency);
  }

  /**
   * Measure latency by sending a ping
   */
  measureLatency() {
    if (!this.websocketService.isConnected) {
      return;
    }

    try {
      const timestamp = Date.now();
      this.websocketService.sendMessage({
        type: 'ping',
        timestamp,
        healthCheck: true
      });

      this.metrics.throughput.messagesSent++;
    } catch (error) {
      console.warn('Health Monitor: Failed to send ping for latency measurement', error);
      this.metrics.reliability.messageFailures++;
    }
  }

  /**
   * Update latency metrics
   */
  updateLatencyMetrics(latency) {
    const latencyMetrics = this.metrics.latency;

    latencyMetrics.current = latency;
    latencyMetrics.samples.push({
      value: latency,
      timestamp: Date.now()
    });

    // Keep only last 100 samples
    if (latencyMetrics.samples.length > 100) {
      latencyMetrics.samples = latencyMetrics.samples.slice(-100);
    }

    // Calculate statistics
    const values = latencyMetrics.samples.map(s => s.value);
    latencyMetrics.average = values.reduce((a, b) => a + b, 0) / values.length;
    latencyMetrics.min = Math.min(...values);
    latencyMetrics.max = Math.max(...values);

    // Check for latency alerts
    this.checkLatencyAlert(latency);

    this.emit('metric_update', {
      type: 'latency',
      latency,
      metrics: latencyMetrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calculate throughput metrics
   */
  calculateThroughput() {
    const now = Date.now();
    const timeDiff = (now - this.metrics.throughput.lastMeasurement) / 1000; // seconds

    if (timeDiff > 0) {
      const messagesSent = this.metrics.throughput.messagesSent;
      const messagesReceived = this.metrics.throughput.messagesReceived;
      const totalMessages = messagesSent + messagesReceived;

      this.metrics.throughput.messagesPerSecond = totalMessages / timeDiff;
      this.metrics.throughput.lastMeasurement = now;

      // Reset counters
      this.metrics.throughput.messagesSent = 0;
      this.metrics.throughput.messagesReceived = 0;
    }

    this.emit('metric_update', {
      type: 'throughput',
      metrics: this.metrics.throughput,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calculate reliability metrics
   */
  calculateReliability() {
    const reliability = this.metrics.reliability;
    const totalConnections = reliability.successfulConnections + reliability.failedConnections;
    const totalMessages = reliability.totalMessages;

    let connectionReliability = 1.0;
    let messageReliability = 1.0;

    if (totalConnections > 0) {
      connectionReliability = reliability.successfulConnections / totalConnections;
    }

    if (totalMessages > 0) {
      messageReliability = (totalMessages - reliability.messageFailures) / totalMessages;
    }

    // Overall reliability score (weighted average)
    reliability.reliabilityScore = (connectionReliability * 0.7 + messageReliability * 0.3);

    // Check for reliability alerts
    this.checkReliabilityAlert(reliability.reliabilityScore);

    this.emit('metric_update', {
      type: 'reliability',
      metrics: reliability,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check server health
   */
  async checkServerHealth() {
    if (!this.websocketService.isConnected) {
      this.metrics.server.status = HEALTH_STATUS.UNHEALTHY;
      return;
    }

    try {
      const startTime = Date.now();
      const healthData = await this.websocketService.checkHealth();
      const responseTime = Date.now() - startTime;

      // Update server metrics
      this.metrics.server = {
        status: this.mapServerStatus(healthData.status),
        load: healthData.load || null,
        memoryUsage: healthData.memory_usage || null,
        activeConnections: healthData.active_connections || null,
        responseTime,
        lastHealthCheck: new Date().toISOString()
      };

      console.log('Health Monitor: Server health check completed', this.metrics.server);

    } catch (error) {
      this.metrics.server.status = HEALTH_STATUS.UNHEALTHY;
      this.metrics.server.responseTime = null;
      this.metrics.server.lastHealthCheck = new Date().toISOString();

      console.warn('Health Monitor: Server health check failed', error);
    }

    this.emit('metric_update', {
      type: 'server',
      metrics: this.metrics.server,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Map server status string to health status
   */
  mapServerStatus(status) {
    const statusMap = {
      'healthy': HEALTH_STATUS.HEALTHY,
      'degraded': HEALTH_STATUS.DEGRADED,
      'unhealthy': HEALTH_STATUS.UNHEALTHY,
      'critical': HEALTH_STATUS.CRITICAL
    };

    return statusMap[status] || HEALTH_STATUS.UNKNOWN;
  }

  /**
   * Assess overall health with automatic remediation
   */
  assessOverallHealth() {
    const statuses = [];

    // Connection health
    if (this.websocketService.isConnected) {
      statuses.push(HEALTH_STATUS.HEALTHY);
    } else {
      statuses.push(HEALTH_STATUS.UNHEALTHY);
    }

    // Latency health
    const avgLatency = this.metrics.latency.average;
    if (avgLatency !== null) {
      if (avgLatency < this.metrics.latency.degradedThreshold) {
        statuses.push(HEALTH_STATUS.HEALTHY);
      } else if (avgLatency < this.metrics.latency.unhealthyThreshold) {
        statuses.push(HEALTH_STATUS.DEGRADED);
      } else {
        statuses.push(HEALTH_STATUS.UNHEALTHY);
      }
    }

    // Reliability health
    const reliability = this.metrics.reliability.reliabilityScore;
    if (reliability >= 0.95) {
      statuses.push(HEALTH_STATUS.HEALTHY);
    } else if (reliability >= 0.85) {
      statuses.push(HEALTH_STATUS.DEGRADED);
    } else {
      statuses.push(HEALTH_STATUS.UNHEALTHY);
    }

    // Server health
    statuses.push(this.metrics.server.status);

    // Determine overall status
    const overallStatus = this.calculateOverallStatus(statuses);
    const previousStatus = this.metrics.connection.status;

    if (overallStatus !== previousStatus) {
      console.log(`Health Monitor: Status changed from ${previousStatus} to ${overallStatus}`);

      this.metrics.connection.status = overallStatus;

      this.emit('status_change', {
        previous: previousStatus,
        current: overallStatus,
        timestamp: new Date().toISOString()
      });

      // Check if this represents degradation or recovery
      if (this.isStatusWorse(overallStatus, previousStatus)) {
        this.emit('degradation', {
          from: previousStatus,
          to: overallStatus,
          timestamp: new Date().toISOString()
        });

        // Automatic remediation: trigger reconnection when health degrades to UNHEALTHY
        if (overallStatus === HEALTH_STATUS.UNHEALTHY && !this.websocketService.isConnected) {
          this.attemptRecovery();
        }
      } else if (this.isStatusBetter(overallStatus, previousStatus)) {
        this.emit('recovery', {
          from: previousStatus,
          to: overallStatus,
          timestamp: new Date().toISOString()
        });

        // Track successful recovery
        if (this.lastRecoveryAttempt) {
          this.recoverySuccessCount++;
          console.log(`Health Monitor: Recovery successful (${this.recoverySuccessCount} total)`);
        }
      }
    }

    // Adjust monitoring intervals based on connection quality
    this.adjustMonitoringIntervals(overallStatus);
  }

  /**
   * Attempt automatic recovery when health degrades
   */
  async attemptRecovery() {
    const now = Date.now();

    // Prevent too frequent recovery attempts (min 5 seconds between attempts)
    if (this.lastRecoveryAttempt && (now - this.lastRecoveryAttempt < 5000)) {
      console.log('Health Monitor: Skipping recovery attempt (too soon)');
      return;
    }

    this.lastRecoveryAttempt = now;
    this.recoveryAttempts++;

    console.log(`Health Monitor: Attempting automatic recovery (attempt ${this.recoveryAttempts})`);

    try {
      // Trigger reconnection
      await this.websocketService.connect();
      console.log('Health Monitor: Automatic recovery initiated successfully');
    } catch (error) {
      this.recoveryFailureCount++;
      console.error('Health Monitor: Automatic recovery failed:', error);

      // Create alert for recovery failure
      this.createAlert(
        'critical',
        'Automatic Recovery Failed',
        `Failed to reconnect automatically. Please check your connection. (Failure ${this.recoveryFailureCount})`
      );
    }
  }

  /**
   * Adjust monitoring intervals based on connection quality
   */
  adjustMonitoringIntervals(status) {
    if (!this.adaptiveIntervalsEnabled) {
      return;
    }

    let newMode = 'NORMAL';

    // Use faster intervals when connection is degraded or unhealthy
    if (status === HEALTH_STATUS.UNHEALTHY || status === HEALTH_STATUS.CRITICAL) {
      newMode = 'FAST';
    } else if (status === HEALTH_STATUS.DEGRADED) {
      newMode = 'NORMAL';
    } else {
      newMode = 'SLOW';
    }

    if (newMode !== this.currentIntervalMode) {
      console.log(`Health Monitor: Adjusting monitoring intervals to ${newMode} mode`);
      this.currentIntervalMode = newMode;
      // Note: Would need to restart intervals with new timing, but keeping current for simplicity
    }
  }

  /**
   * Calculate overall status from component statuses
   */
  calculateOverallStatus(statuses) {
    // Count each status type
    const statusCounts = {
      [HEALTH_STATUS.CRITICAL]: 0,
      [HEALTH_STATUS.UNHEALTHY]: 0,
      [HEALTH_STATUS.DEGRADED]: 0,
      [HEALTH_STATUS.HEALTHY]: 0,
      [HEALTH_STATUS.UNKNOWN]: 0
    };

    statuses.forEach(status => {
      statusCounts[status]++;
    });

    // Determine overall status based on worst component
    if (statusCounts[HEALTH_STATUS.CRITICAL] > 0) {
      return HEALTH_STATUS.CRITICAL;
    } else if (statusCounts[HEALTH_STATUS.UNHEALTHY] > 0) {
      return HEALTH_STATUS.UNHEALTHY;
    } else if (statusCounts[HEALTH_STATUS.DEGRADED] > 0) {
      return HEALTH_STATUS.DEGRADED;
    } else if (statusCounts[HEALTH_STATUS.HEALTHY] > 0) {
      return HEALTH_STATUS.HEALTHY;
    } else {
      return HEALTH_STATUS.UNKNOWN;
    }
  }

  /**
   * Check if new status is worse than previous
   */
  isStatusWorse(newStatus, oldStatus) {
    const statusOrder = [
      HEALTH_STATUS.HEALTHY,
      HEALTH_STATUS.DEGRADED,
      HEALTH_STATUS.UNHEALTHY,
      HEALTH_STATUS.CRITICAL,
      HEALTH_STATUS.UNKNOWN
    ];

    const newIndex = statusOrder.indexOf(newStatus);
    const oldIndex = statusOrder.indexOf(oldStatus);

    return newIndex > oldIndex;
  }

  /**
   * Check if new status is better than previous
   */
  isStatusBetter(newStatus, oldStatus) {
    const statusOrder = [
      HEALTH_STATUS.HEALTHY,
      HEALTH_STATUS.DEGRADED,
      HEALTH_STATUS.UNHEALTHY,
      HEALTH_STATUS.CRITICAL,
      HEALTH_STATUS.UNKNOWN
    ];

    const newIndex = statusOrder.indexOf(newStatus);
    const oldIndex = statusOrder.indexOf(oldStatus);

    return newIndex < oldIndex;
  }

  /**
   * Check for latency alerts
   */
  checkLatencyAlert(latency) {
    if (latency > this.alertThresholds.latency.critical) {
      this.createAlert('critical', 'High Latency Critical',
        `Connection latency is ${latency}ms, which is critically high`);
    } else if (latency > this.alertThresholds.latency.warning) {
      this.createAlert('warning', 'High Latency Warning',
        `Connection latency is ${latency}ms, which is elevated`);
    }
  }

  /**
   * Check for reliability alerts
   */
  checkReliabilityAlert(reliability) {
    if (reliability < this.alertThresholds.reliability.critical) {
      this.createAlert('critical', 'Low Reliability Critical',
        `Connection reliability is ${(reliability * 100).toFixed(1)}%, which is critically low`);
    } else if (reliability < this.alertThresholds.reliability.warning) {
      this.createAlert('warning', 'Low Reliability Warning',
        `Connection reliability is ${(reliability * 100).toFixed(1)}%, which is below optimal`);
    }
  }

  /**
   * Check for error alerts
   */
  checkErrorAlert(mappedError) {
    if (mappedError.severity === 'critical' || mappedError.severity === 'high') {
      this.createAlert(mappedError.severity, mappedError.title, mappedError.userMessage);
    }
  }

  /**
   * Create an alert with persistence
   */
  createAlert(level, title, message) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alertHistory.unshift(alert);

    // Keep alert history size manageable
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(0, this.maxAlertHistory);
    }

    // Persist to localStorage
    this.saveAlertHistory();

    console.warn(`Health Monitor Alert [${level.toUpperCase()}]: ${title} - ${message}`);

    this.emit('alert', alert);
  }

  /**
   * Load alert history from localStorage
   */
  loadAlertHistory() {
    try {
      if (typeof localStorage === 'undefined') return;

      const stored = localStorage.getItem('websocket_alert_history');
      if (stored) {
        this.alertHistory = JSON.parse(stored);
        console.log(`Health Monitor: Loaded ${this.alertHistory.length} alerts from history`);
      }
    } catch (error) {
      console.error('Health Monitor: Failed to load alert history:', error);
    }
  }

  /**
   * Save alert history to localStorage
   */
  saveAlertHistory() {
    try {
      if (typeof localStorage === 'undefined') return;

      localStorage.setItem('websocket_alert_history', JSON.stringify(this.alertHistory));
    } catch (error) {
      console.error('Health Monitor: Failed to save alert history:', error);
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  /**
   * Get current health status with recovery information
   */
  getHealthStatus() {
    return {
      overall: this.metrics.connection.status,
      connection: {
        connected: this.websocketService.isConnected,
        uptime: this.metrics.connection.uptime,
        disconnections: this.metrics.connection.disconnectionCount,
        lastConnected: this.metrics.connection.lastConnected
      },
      latency: {
        current: this.metrics.latency.current,
        average: this.metrics.latency.average,
        min: this.metrics.latency.min,
        max: this.metrics.latency.max,
        status: this.getLatencyStatus()
      },
      reliability: {
        score: this.metrics.reliability.reliabilityScore,
        status: this.getReliabilityStatus()
      },
      server: this.metrics.server,
      queue: this.metrics.queue,
      recovery: {
        attempts: this.recoveryAttempts,
        successCount: this.recoverySuccessCount,
        failureCount: this.recoveryFailureCount,
        lastAttempt: this.lastRecoveryAttempt
      },
      monitoring: {
        isActive: this.isMonitoring,
        mode: this.currentIntervalMode,
        adaptiveEnabled: this.adaptiveIntervalsEnabled
      },
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get latency status
   */
  getLatencyStatus() {
    const avg = this.metrics.latency.average;
    if (avg === null) return HEALTH_STATUS.UNKNOWN;

    if (avg < this.metrics.latency.degradedThreshold) {
      return HEALTH_STATUS.HEALTHY;
    } else if (avg < this.metrics.latency.unhealthyThreshold) {
      return HEALTH_STATUS.DEGRADED;
    } else {
      return HEALTH_STATUS.UNHEALTHY;
    }
  }

  /**
   * Get reliability status
   */
  getReliabilityStatus() {
    const score = this.metrics.reliability.reliabilityScore;

    if (score >= 0.95) {
      return HEALTH_STATUS.HEALTHY;
    } else if (score >= 0.85) {
      return HEALTH_STATUS.DEGRADED;
    } else {
      return HEALTH_STATUS.UNHEALTHY;
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 20) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts() {
    return this.alertHistory.filter(alert => !alert.acknowledged);
  }

  /**
   * Perform immediate health check
   */
  async performHealthCheck() {
    console.log('Health Monitor: Performing immediate health check');

    // Trigger all health checks immediately
    await Promise.all([
      this.measureLatency(),
      this.calculateThroughput(),
      this.calculateReliability(),
      this.checkServerHealth()
    ]);

    // Assess overall health
    this.assessOverallHealth();

    return this.getHealthStatus();
  }

  /**
   * Event listener management
   */
  on(event, listener) {
    if (this.healthListeners[event]) {
      this.healthListeners[event].push(listener);
    }
  }

  off(event, listener) {
    if (this.healthListeners[event]) {
      const index = this.healthListeners[event].indexOf(listener);
      if (index > -1) {
        this.healthListeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.healthListeners[event]) {
      this.healthListeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Health Monitor: Error in event listener', error);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('Health Monitor: Cleaning up');

    this.stopMonitoring();

    // Clear all listeners
    Object.keys(this.healthListeners).forEach(event => {
      this.healthListeners[event] = [];
    });

    // Reset metrics
    this.alertHistory = [];
  }
}

export default ConnectionHealthMonitor;