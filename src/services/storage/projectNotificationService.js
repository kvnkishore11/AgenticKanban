/**
 * Project Notification Service
 * Manages WebSocket connections to running project development servers
 * Sends ticket notifications to project environments
 */

class ProjectNotificationService {
  constructor() {
    this.connections = new Map(); // Map of projectId -> connection info
    this.isConnecting = new Map(); // Track connection attempts
    this.reconnectAttempts = new Map(); // Track reconnection attempts
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.maxReconnectDelay = 10000; // Max 10 seconds
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckIntervals = new Map(); // Track health check intervals

    // Common development server ports to try (ordered by popularity/likelihood)
    this.commonPorts = [3000, 4000, 5000, 8080, 3001, 8000, 9000, 5173, 5174, 8081, 9001];

    // Development server patterns for smart detection
    this.serverPatterns = {
      vite: { ports: [5173, 5174], priority: 1 },
      react: { ports: [3000, 3001], priority: 2 },
      nextjs: { ports: [3000, 3001], priority: 2 },
      express: { ports: [3000, 8000, 8080], priority: 3 },
      webpack: { ports: [8080, 8081], priority: 4 },
      general: { ports: [4000, 5000, 9000, 9001], priority: 5 }
    };

    // Port discovery cache
    this.portCache = new Map(); // projectId -> { port, host, timestamp, confidence }
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Event listeners for each project
    this.eventListeners = new Map(); // projectId -> { connect: [], disconnect: [], error: [], message: [] }

    console.log('ProjectNotificationService initialized');
  }

  /**
   * Initialize event listeners for a project
   */
  initializeProjectListeners(projectId) {
    if (!this.eventListeners.has(projectId)) {
      this.eventListeners.set(projectId, {
        connect: [],
        disconnect: [],
        error: [],
        message: [],
        notification_sent: [],
        notification_failed: []
      });
    }
  }

  /**
   * Auto-discover project WebSocket port with caching and smart detection
   */
  async discoverProjectPort(projectId, host = 'localhost', forceRefresh = false) {
    console.log(`Discovering WebSocket port for project ${projectId} on ${host}`);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedPort(projectId, host);
      if (cached) {
        console.log(`Using cached port ${cached.port} for project ${projectId}`);
        return { host, port: cached.port, discovered: true, cached: true, confidence: cached.confidence };
      }
    }

    // Smart detection based on project patterns
    const smartResult = await this.smartPortDetection(projectId, host);
    if (smartResult) {
      this.cachePort(projectId, host, smartResult.port, smartResult.confidence);
      return smartResult;
    }

    // Fallback to brute force scanning
    const bruteForceResult = await this.bruteForcePortScan(projectId, host);
    if (bruteForceResult) {
      this.cachePort(projectId, host, bruteForceResult.port, 0.5); // Lower confidence for brute force
      return bruteForceResult;
    }

    console.warn(`No active WebSocket server found for project ${projectId} on common ports`);
    return null;
  }

  /**
   * Smart port detection based on development server patterns
   */
  async smartPortDetection(projectId, host) {
    console.log(`Running smart detection for project ${projectId}`);

    // Get sorted patterns by priority
    const sortedPatterns = Object.entries(this.serverPatterns)
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [serverType, pattern] of sortedPatterns) {
      console.log(`Testing ${serverType} ports for project ${projectId}`);

      for (const port of pattern.ports) {
        try {
          const isConnectable = await this.testConnection(host, port, 2000);
          if (isConnectable) {
            // Additional validation for specific server types
            const confidence = await this.validateServerType(host, port, serverType);

            console.log(`Found ${serverType} server for project ${projectId} on port ${port} (confidence: ${confidence})`);
            return {
              host,
              port,
              discovered: true,
              serverType,
              confidence,
              smart: true
            };
          }
        } catch {
          // Continue to next port
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Brute force port scanning as fallback
   */
  async bruteForcePortScan(projectId, host) {
    console.log(`Running brute force scan for project ${projectId}`);

    // Use a subset of ports for faster scanning
    const priorityPorts = this.commonPorts.slice(0, 6); // Test top 6 most common ports

    const scanPromises = priorityPorts.map(async (port) => {
      try {
        const isConnectable = await this.testConnection(host, port, 1500);
        if (isConnectable) {
          return { host, port, discovered: true, bruteForce: true };
        }
      } catch {
        // Ignore errors, return null
      }
      return null;
    });

    const results = await Promise.allSettled(scanPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`Brute force found server for project ${projectId} on port ${result.value.port}`);
        return result.value;
      }
    }

    return null;
  }

  /**
   * Validate server type for better confidence scoring
   */
  async validateServerType(host, port, serverType) {
    // Try to connect and check for specific WebSocket endpoints or headers
    try {
      // For now, return base confidence. Could be enhanced with HTTP requests
      // to check for specific server signatures, package.json, etc.

      const baseConfidence = {
        vite: 0.9,      // Vite is very specific about ports
        react: 0.8,     // React dev server is common
        nextjs: 0.8,    // Next.js is common
        express: 0.6,   // Express can vary
        webpack: 0.7,   // Webpack dev server
        general: 0.4    // General fallback
      };

      return baseConfidence[serverType] || 0.5;

    } catch {
      return 0.3; // Low confidence if we can't validate
    }
  }

  /**
   * Cache successful port discoveries
   */
  cachePort(projectId, host, port, confidence = 1.0) {
    const cacheKey = `${projectId}_${host}`;
    this.portCache.set(cacheKey, {
      port,
      host,
      confidence,
      timestamp: Date.now()
    });

    console.log(`Cached port ${port} for project ${projectId} (confidence: ${confidence})`);
  }

  /**
   * Get cached port if still valid
   */
  getCachedPort(projectId, host) {
    const cacheKey = `${projectId}_${host}`;
    const cached = this.portCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.portCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Clear port cache for a project
   */
  clearPortCache(projectId) {
    const keysToDelete = [];
    for (const [cacheKey] of this.portCache) {
      if (cacheKey.startsWith(`${projectId}_`)) {
        keysToDelete.push(cacheKey);
      }
    }

    keysToDelete.forEach(key => this.portCache.delete(key));
    console.log(`Cleared port cache for project ${projectId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, value] of this.portCache) {
      const age = now - value.timestamp;
      if (age <= this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.portCache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Test WebSocket connection to a specific host/port
   */
  async testConnection(host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const url = `ws://${host}:${port}/ws/trigger`;
      const ws = new WebSocket(url);

      const timer = setTimeout(() => {
        ws.close();
        resolve(false);
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };

      ws.onclose = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });
  }

  /**
   * Connect to a project's WebSocket server
   */
  async connectToProject(projectId, config) {
    if (this.isConnecting.get(projectId)) {
      console.log(`Already connecting to project ${projectId}`);
      return false;
    }

    if (this.isConnected(projectId)) {
      console.log(`Already connected to project ${projectId}`);
      return true;
    }

    this.initializeProjectListeners(projectId);

    try {
      this.isConnecting.set(projectId, true);

      // Auto-discover port if not provided
      let connectionConfig = config;
      if (!connectionConfig || !connectionConfig.port) {
        const discovered = await this.discoverProjectPort(projectId, config?.host);
        if (!discovered) {
          throw new Error('No active WebSocket server found for project');
        }
        connectionConfig = { ...config, ...discovered };
      }

      const { host = 'localhost', port } = connectionConfig;
      const url = `ws://${host}:${port}/ws/trigger`;

      console.log(`Connecting to project ${projectId} WebSocket:`, url);

      const ws = new WebSocket(url);

      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          ws.close();
          this.isConnecting.set(projectId, false);
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          console.log(`Connected to project ${projectId} WebSocket successfully`);

          // Store connection info
          this.connections.set(projectId, {
            ws,
            config: connectionConfig,
            connectedAt: new Date().toISOString(),
            status: 'connected'
          });

          this.isConnecting.set(projectId, false);
          this.reconnectAttempts.delete(projectId);

          // Start health checks
          this.startHealthCheck(projectId);

          this.emit(projectId, 'connect', { projectId, config: connectionConfig });
          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleProjectMessage(projectId, message);
          } catch {
            console.warn(`Invalid message from project ${projectId}:`, event.data);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          console.log(`Project ${projectId} WebSocket connection closed:`, event.code, event.reason);

          this.connections.delete(projectId);
          this.isConnecting.set(projectId, false);
          this.stopHealthCheck(projectId);

          this.emit(projectId, 'disconnect', {
            projectId,
            code: event.code,
            reason: event.reason
          });

          // Auto-reconnect if not a clean close
          if (event.code !== 1000) {
            this.scheduleReconnect(projectId, connectionConfig);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          console.error(`Project ${projectId} WebSocket error:`, error);

          this.isConnecting.set(projectId, false);
          this.emit(projectId, 'error', {
            projectId,
            error: 'WebSocket connection failed'
          });

          reject(error);
        };
      });

    } catch (error) {
      this.isConnecting.set(projectId, false);
      console.error(`Failed to connect to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(projectId, config) {
    const attempts = this.reconnectAttempts.get(projectId) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for project ${projectId}`);
      this.emit(projectId, 'error', {
        projectId,
        error: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      });
      return;
    }

    this.reconnectAttempts.set(projectId, attempts + 1);
    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), this.maxReconnectDelay);

    console.log(`Scheduling reconnect for project ${projectId} (attempt ${attempts + 1}) in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected(projectId)) {
        console.log(`Reconnect attempt ${attempts + 1}/${this.maxReconnectAttempts} for project ${projectId}`);
        this.connectToProject(projectId, config).catch(error => {
          console.error(`Reconnection failed for project ${projectId}:`, error);
        });
      }
    }, delay);
  }

  /**
   * Disconnect from a project's WebSocket server
   */
  disconnectFromProject(projectId) {
    const connection = this.connections.get(projectId);
    if (connection) {
      console.log(`Disconnecting from project ${projectId}`);
      this.stopHealthCheck(projectId);
      connection.ws.close(1000, 'Client disconnect');
      this.connections.delete(projectId);
    }

    this.isConnecting.set(projectId, false);
    this.reconnectAttempts.delete(projectId);
  }

  /**
   * Check if connected to a project
   */
  isConnected(projectId) {
    const connection = this.connections.get(projectId);
    return connection && connection.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Start health check for a project connection
   */
  startHealthCheck(projectId) {
    this.stopHealthCheck(projectId); // Clear any existing interval

    const interval = setInterval(() => {
      if (this.isConnected(projectId)) {
        this.sendToProject(projectId, { type: 'ping', timestamp: Date.now() });
      }
    }, this.healthCheckInterval);

    this.healthCheckIntervals.set(projectId, interval);
  }

  /**
   * Stop health check for a project
   */
  stopHealthCheck(projectId) {
    const interval = this.healthCheckIntervals.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(projectId);
    }
  }

  /**
   * Handle incoming messages from project WebSocket
   */
  handleProjectMessage(projectId, message) {
    const { type, data } = message;

    console.log(`Received message from project ${projectId}:`, type, data);

    switch (type) {
      case 'pong':
        // Health check response - connection is healthy
        break;
      case 'notification_received':
        this.emit(projectId, 'notification_sent', { projectId, data });
        break;
      case 'error':
        this.emit(projectId, 'error', { projectId, error: data.message });
        break;
      default:
        this.emit(projectId, 'message', { projectId, type, data });
    }
  }

  /**
   * Send message to project WebSocket
   */
  async sendToProject(projectId, message) {
    const connection = this.connections.get(projectId);

    if (!connection || !this.isConnected(projectId)) {
      throw new Error(`Not connected to project ${projectId}`);
    }

    try {
      const messageStr = JSON.stringify(message);
      connection.ws.send(messageStr);
      console.log(`Sent message to project ${projectId}:`, message.type);
      return true;
    } catch (error) {
      console.error(`Error sending message to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Send ticket notification to project
   */
  async sendTicketNotification(projectId, ticketData) {
    console.log(`Sending ticket notification to project ${projectId}:`, ticketData.title || ticketData.id);

    try {
      // Format ticket data for project consumption
      const notification = this.formatTicketNotification(ticketData);

      await this.sendToProject(projectId, {
        type: 'ticket_notification',
        data: notification,
        timestamp: new Date().toISOString()
      });

      this.emit(projectId, 'notification_sent', {
        projectId,
        ticketId: ticketData.id,
        success: true
      });

      return true;

    } catch (error) {
      console.error(`Failed to send ticket notification to project ${projectId}:`, error);

      this.emit(projectId, 'notification_failed', {
        projectId,
        ticketId: ticketData.id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Format ticket data for project consumption
   */
  formatTicketNotification(ticketData) {
    const formattedTicket = {
      id: String(ticketData.id),
      title: ticketData.title || `Task ${ticketData.id}`,
      description: ticketData.description,
      workItemType: ticketData.workItemType,
      queuedStages: ticketData.queuedStages || [],
      stage: ticketData.stage,
      substage: ticketData.substage,
      progress: ticketData.progress || 0,
      createdAt: ticketData.createdAt,
      images: ticketData.images || [],
      metadata: {
        adw_id: ticketData.metadata?.adw_id,
        workflow_name: ticketData.metadata?.workflow_name,
        pipelineId: ticketData.pipelineId
      }
    };

    // Include the complete ticket data as issue_json for ADW workflows
    formattedTicket.issue_json = {
      number: ticketData.id,
      title: ticketData.title || `Task ${ticketData.id}`,
      body: ticketData.description || '',
      state: 'open',
      labels: [ticketData.workItemType || 'task'],
      created_at: ticketData.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Include additional kanban-specific data
      work_item_type: ticketData.workItemType,
      queued_stages: ticketData.queuedStages || [],
      stage: ticketData.stage,
      substage: ticketData.substage,
      progress: ticketData.progress || 0,
      images: ticketData.images || [],
      pipeline_id: ticketData.pipelineId
    };

    return formattedTicket;
  }

  /**
   * Get connection status for a project
   */
  getProjectStatus(projectId) {
    const connection = this.connections.get(projectId);
    const isConnecting = this.isConnecting.get(projectId) || false;
    const reconnectAttempts = this.reconnectAttempts.get(projectId) || 0;

    return {
      projectId,
      connected: this.isConnected(projectId),
      connecting: isConnecting,
      reconnectAttempts,
      connection: connection ? {
        config: connection.config,
        connectedAt: connection.connectedAt,
        status: connection.status
      } : null
    };
  }

  /**
   * Get status for all projects
   */
  getAllProjectsStatus() {
    const allProjects = new Set([
      ...this.connections.keys(),
      ...this.isConnecting.keys(),
      ...this.reconnectAttempts.keys()
    ]);

    return Array.from(allProjects).map(projectId => this.getProjectStatus(projectId));
  }

  /**
   * Event listener management
   */
  on(projectId, event, listener) {
    this.initializeProjectListeners(projectId);
    const listeners = this.eventListeners.get(projectId);
    if (listeners && listeners[event]) {
      listeners[event].push(listener);
    }
  }

  off(projectId, event, listener) {
    const listeners = this.eventListeners.get(projectId);
    if (listeners && listeners[event]) {
      const index = listeners[event].indexOf(listener);
      if (index > -1) {
        listeners[event].splice(index, 1);
      }
    }
  }

  emit(projectId, event, data = null) {
    const listeners = this.eventListeners.get(projectId);
    if (listeners && listeners[event]) {
      listeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in project ${projectId} event listener:`, error);
        }
      });
    }
  }

  /**
   * Clean up all connections and intervals
   */
  cleanup() {
    console.log('Cleaning up ProjectNotificationService');

    // Disconnect all projects
    for (const projectId of this.connections.keys()) {
      this.disconnectFromProject(projectId);
    }

    // Clear all intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }

    // Clear all maps
    this.connections.clear();
    this.isConnecting.clear();
    this.reconnectAttempts.clear();
    this.healthCheckIntervals.clear();
    this.eventListeners.clear();
    this.portCache.clear(); // Clear port cache
  }
}

// Create and export singleton instance
const projectNotificationService = new ProjectNotificationService();
export default projectNotificationService;