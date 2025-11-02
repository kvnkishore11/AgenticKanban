/**
 * WebSocket Service for ADW Trigger Communication
 * Manages real-time communication with the ADW WebSocket trigger server
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnecting = false;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20; // Increased from 5 to 20 for better production resilience
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.heartbeatIntervalTime = 15000; // Reduced from 30s to 15s for faster detection
    this.connectionId = null; // Track connection ID for server restart detection
    this.messageQueue = []; // Client-side message queue for disconnection handling
    this.pendingPromises = new Map(); // Track pending workflow trigger promises
    this.visibilityChangeHandler = null;
    this.onlineHandler = null;
    this.offlineHandler = null;
    this.connectionMetrics = {
      messageSuccessCount: 0,
      messageFailureCount: 0,
      lastLatency: null,
      connectionStartTime: null
    };

    // Event listeners
    this.eventListeners = {
      connect: [],
      disconnect: [],
      trigger_response: [],
      status_update: [],
      error: [],
      pong: [],
      workflow_log: [], // New event for real-time logs
      stage_transition: [], // New event for stage transitions
      reconnecting: []
    };

    // Configuration - extract from VITE_BACKEND_URL (required)
    // WebSocket server runs on BACKEND_PORT + 1 (convention from start.sh)
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL environment variable is required');
    }
    const url = new URL(backendUrl);
    const backendPort = parseInt(url.port);
    this.config = {
      host: url.hostname,
      port: backendPort + 1, // WebSocket server is on backend port + 1
      protocol: 'ws',
      autoReconnect: true,
      maxReconnectAttempts: 20, // Updated to match instance variable
      heartbeat: true,
      messageQueueEnabled: true,
      maxQueueSize: 100
    };

    // Set up browser visibility API integration
    this.setupVisibilityHandling();

    // Set up online/offline event listeners
    this.setupNetworkStatusHandling();

    console.log('WebSocketService initialized with enhanced reliability features');
  }

  /**
   * Configure WebSocket connection parameters
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
    console.log('WebSocket configuration updated:', this.config);
  }

  /**
   * Set up browser visibility API to pause/resume heartbeats
   */
  setupVisibilityHandling() {
    if (typeof document === 'undefined') return; // Not in browser environment

    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        console.log('WebSocket: Page hidden, pausing heartbeat');
        this.stopHeartbeat();
      } else {
        console.log('WebSocket: Page visible, resuming heartbeat');
        if (this.isConnected && this.config.heartbeat) {
          this.startHeartbeat();
        }
        // Check connection health when page becomes visible
        if (!this.isConnected && this.config.autoReconnect) {
          console.log('WebSocket: Page visible and disconnected, attempting reconnection');
          this.connect().catch(err => console.error('Reconnection failed:', err));
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Set up online/offline event listeners
   */
  setupNetworkStatusHandling() {
    if (typeof window === 'undefined') return; // Not in browser environment

    this.onlineHandler = () => {
      console.log('WebSocket: Network online, attempting reconnection');
      if (!this.isConnected && this.config.autoReconnect) {
        // Reset reconnection attempts when network comes back
        this.reconnectAttempts = 0;
        this.connect().catch(err => console.error('Reconnection after online event failed:', err));
      }
    };

    this.offlineHandler = () => {
      console.log('WebSocket: Network offline detected');
      this.emit('error', {
        type: 'network_offline',
        message: 'Network connection lost'
      });
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  /**
   * Get WebSocket URL based on configuration
   */
  getWebSocketUrl() {
    const { protocol, host, port } = this.config;
    return `${protocol}://${host}:${port}/ws/trigger`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        const url = this.getWebSocketUrl();
        console.log('Connecting to WebSocket:', url);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.connectionMetrics.connectionStartTime = Date.now();

          // Generate new connection ID
          this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Start heartbeat if enabled (only if page is visible)
          if (this.config.heartbeat && (!document || !document.hidden)) {
            this.startHeartbeat();
          }

          // Process queued messages after reconnection
          this.processMessageQueue();

          this.emit('connect');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.emit('error', { type: 'parse_error', message: 'Failed to parse server message' });
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.isConnecting = false;
          this.connectionId = null;
          this.stopHeartbeat();

          // Clean up pending promises on disconnection
          this.cleanupPendingPromises();

          this.emit('disconnect', { code: event.code, reason: event.reason });

          // Auto-reconnect if enabled and not a clean close
          if (this.config.autoReconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', { type: 'connection_error', message: 'WebSocket connection failed' });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket - draining message queue first');
      this.config.autoReconnect = false; // Disable auto-reconnect for manual disconnect

      // Drain message queue before disconnecting
      await this.drainMessageQueue();

      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
  }

  /**
   * Schedule reconnection attempt with exponential backoff and jitter
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', {
        type: 'max_reconnect_attempts',
        message: `Failed to reconnect after ${this.config.maxReconnectAttempts} attempts`
      });
      return;
    }

    this.reconnectAttempts++;

    // Calculate exponential backoff with jitter to prevent thundering herd
    const baseDelay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    // Add jitter: delay * (0.5 + random * 0.5) gives us 50-100% of the base delay
    const jitter = 0.5 + Math.random() * 0.5;
    const delay = Math.floor(baseDelay * jitter);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms (with jitter)`);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay
    });

    setTimeout(() => {
      if (!this.isConnected && this.config.autoReconnect) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.heartbeatIntervalTime);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(message) {
    const { type, data } = message;

    // Only log non-heartbeat messages to reduce console clutter
    if (type !== 'ping' && type !== 'pong') {
      console.log('Received WebSocket message:', type, data);
    }

    switch (type) {
      case 'trigger_response':
        this.emit('trigger_response', data);
        break;
      case 'status_update':
        // Check for stage transition in current_step field
        if (data && data.current_step && typeof data.current_step === 'string') {
          const stageMatch = data.current_step.match(/^Stage:\s*(\w+)/i);
          if (stageMatch) {
            const toStage = stageMatch[1].toLowerCase();
            // Emit dedicated stage transition event
            this.emit('stage_transition', {
              adw_id: data.adw_id,
              to_stage: toStage,
              from_stage: null, // We don't have from_stage in current_step format
              workflow_name: data.workflow_name,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }

        // Extract log information from status update messages
        this.emit('status_update', data);

        // If status update contains a message, treat it as a log entry
        if (data && data.message) {
          const logEntry = {
            adw_id: data.adw_id,
            timestamp: data.timestamp || new Date().toISOString(),
            level: this.getLogLevelFromStatus(data.status),
            message: data.message,
            current_step: data.current_step,
            progress_percent: data.progress_percent,
            workflow_name: data.workflow_name,
          };
          this.emit('workflow_log', logEntry);
        }
        break;
      case 'error':
        this.emit('error', data);

        // Emit error as a log entry too
        if (data && data.message) {
          const errorLog = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: data.message,
            details: data.details,
            adw_id: data.adw_id,
            error_type: data.error_type,
          };
          this.emit('workflow_log', errorLog);
        }
        break;
      case 'pong':
        // Handle heartbeat response
        this.emit('pong', message);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  /**
   * Get log level from workflow status
   */
  getLogLevelFromStatus(status) {
    const statusLevelMap = {
      'started': 'INFO',
      'in_progress': 'INFO',
      'completed': 'SUCCESS',
      'failed': 'ERROR',
    };
    return statusLevelMap[status] || 'INFO';
  }

  /**
   * Send message to WebSocket server
   */
  sendMessage(message) {
    if (!this.isConnected || !this.ws) {
      // If message queue is enabled, queue the message instead of throwing
      if (this.config.messageQueueEnabled) {
        console.log('WebSocket not connected, queueing message:', message.type);
        this.queueMessage(message);
        return;
      }
      throw new Error('WebSocket is not connected');
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.connectionMetrics.messageSuccessCount++;
      // Only log non-heartbeat messages to reduce console clutter
      if (message.type !== 'ping') {
        console.log('Sent WebSocket message:', message.type);
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.connectionMetrics.messageFailureCount++;

      // Queue message for retry if queue is enabled
      if (this.config.messageQueueEnabled) {
        this.queueMessage(message);
      }
      throw error;
    }
  }

  /**
   * Trigger an ADW workflow
   */
  async triggerWorkflow(request, timeout = 30000) {
    console.log('Triggering workflow via WebSocket:', request);

    if (!this.isConnected) {
      // Try to connect if not connected
      try {
        await this.connect();
      } catch (error) {
        // If connection fails, queue the workflow for later if queue is enabled
        if (this.config.messageQueueEnabled) {
          console.log('Connection failed, queueing workflow trigger');
          return new Promise((resolve, reject) => {
            this.queueMessage({
              type: 'trigger_workflow',
              data: request
            });
            // Store promise in pending promises map for later resolution
            const promiseId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.pendingPromises.set(promiseId, { resolve, reject, request, timeout: Date.now() + timeout });
          });
        }
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      const promiseId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up timeout for this workflow trigger
      const timeoutId = setTimeout(() => {
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        this.pendingPromises.delete(promiseId);
        reject(new Error(`Workflow trigger timed out after ${timeout}ms`));
      }, timeout);

      // Set up one-time listeners for this request
      const onResponse = (data) => {
        clearTimeout(timeoutId);
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        this.pendingPromises.delete(promiseId);

        if (data.status === 'accepted') {
          resolve(data);
        } else {
          reject(new Error(data.error || data.message || 'Workflow trigger failed'));
        }
      };

      const onError = (error) => {
        clearTimeout(timeoutId);
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        this.pendingPromises.delete(promiseId);
        reject(new Error(error.message || 'WebSocket error during workflow trigger'));
      };

      this.on('trigger_response', onResponse);
      this.on('error', onError);

      // Store in pending promises for cleanup on disconnect
      this.pendingPromises.set(promiseId, { resolve, reject, request, timeoutId });

      // Send the trigger request
      try {
        this.sendMessage({
          type: 'trigger_workflow',
          data: request
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        this.pendingPromises.delete(promiseId);

        // If queue is enabled, this will have been queued already
        if (!this.config.messageQueueEnabled) {
          reject(error);
        }
      }
    });
  }

  /**
   * Trigger workflow for a kanban task
   */
  async triggerWorkflowForTask(task, workflowType, options = {}) {
    const request = {
      workflow_type: workflowType,
      adw_id: options.adw_id || null,
      issue_number: options.issue_number || null,
      issue_type: task.workItemType || null,
      issue_json: {
        title: task.title || `Task ${task.id}`,
        body: task.description || '',
        number: task.id,
        images: task.images || [] // Include images with their annotations
      },
      model_set: options.model_set || 'base',
      trigger_reason: `Kanban task: ${task.title || task.description.substring(0, 50)}`
    };

    try {
      const response = await this.triggerWorkflow(request);
      console.log('Workflow triggered successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to trigger workflow for task:', error);
      throw error;
    }
  }

  /**
   * Check server health
   */
  async checkHealth() {
    try {
      const { protocol, host, port } = this.config;
      const healthUrl = `http${protocol === 'wss' ? 's' : ''}://${host}:${port}/health`;

      const response = await fetch(healthUrl);
      const healthData = await response.json();

      console.log('WebSocket server health:', healthData);
      return healthData;
    } catch (error) {
      console.error('Failed to check WebSocket server health:', error);
      throw error;
    }
  }

  /**
   * Queue a message for sending when connection is restored
   */
  queueMessage(message) {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      message,
      timestamp: Date.now(),
      retries: 0
    });

    console.log(`Message queued. Queue size: ${this.messageQueue.length}`);
  }

  /**
   * Process queued messages after reconnection
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    // Process all queued messages
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const item of messages) {
      try {
        await this.sendMessage(item.message);
        console.log('Queued message sent successfully:', item.message.type);
      } catch (error) {
        console.error('Failed to send queued message:', error);

        // Re-queue if retries are available
        if (item.retries < 3) {
          item.retries++;
          this.messageQueue.push(item);
        } else {
          console.error('Max retries reached for queued message, dropping');
        }
      }
    }
  }

  /**
   * Drain message queue before disconnect
   */
  async drainMessageQueue() {
    if (!this.isConnected || this.messageQueue.length === 0) {
      return;
    }

    console.log('Draining message queue before disconnect');
    await this.processMessageQueue();

    // Wait a bit for messages to be sent
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Clean up pending promises on disconnection
   */
  cleanupPendingPromises() {
    console.log(`Cleaning up ${this.pendingPromises.size} pending promises`);

    for (const [promiseId, promiseData] of this.pendingPromises) {
      if (promiseData.timeoutId) {
        clearTimeout(promiseData.timeoutId);
      }

      // If queue is enabled, re-queue the workflow trigger
      if (this.config.messageQueueEnabled && promiseData.request) {
        this.queueMessage({
          type: 'trigger_workflow',
          data: promiseData.request
        });
      }
    }

    this.pendingPromises.clear();
  }

  /**
   * Get connection quality metrics
   */
  getConnectionQuality() {
    const total = this.connectionMetrics.messageSuccessCount + this.connectionMetrics.messageFailureCount;
    const successRate = total > 0 ? this.connectionMetrics.messageSuccessCount / total : 1.0;

    let uptime = 0;
    if (this.connectionMetrics.connectionStartTime) {
      uptime = Date.now() - this.connectionMetrics.connectionStartTime;
    }

    return {
      successRate,
      totalMessages: total,
      lastLatency: this.connectionMetrics.lastLatency,
      uptime,
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      config: this.config,
      connectionId: this.connectionId,
      queueSize: this.messageQueue.length,
      quality: this.getConnectionQuality()
    };
  }

  /**
   * Event listener management
   */
  on(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    // Check if this exact listener is already registered
    if (this.eventListeners[event].includes(listener)) {
      console.warn(`[WebSocket] Duplicate listener detected for event '${event}', skipping registration`);
      return;
    }
    this.eventListeners[event].push(listener);
  }

  off(event, listener) {
    if (!this.eventListeners[event]) return;
    const index = this.eventListeners[event].indexOf(listener);
    if (index > -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  emit(event, data = null) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Map kanban stages to ADW workflow types
   */
  getWorkflowTypeForStage(stage, queuedStages = []) {
    // If task has queued stages, create dynamic pipeline
    if (queuedStages && queuedStages.length > 0) {
      // Map kanban stages to ADW stage names
      const stageMapping = {
        'plan': 'plan',
        'build': 'build',
        'implement': 'build',
        'test': 'test',
        'review': 'review',
        'document': 'document',
        'pr': 'ship'
      };

      const adwStages = queuedStages
        .map(stage => stageMapping[stage] || stage)
        .filter(stage => stage); // Remove undefined values

      if (adwStages.length > 0) {
        return `adw_${adwStages.join('_')}_iso`;
      }
    }

    // Fallback to stage-specific workflows
    const stageWorkflowMap = {
      'plan': 'adw_plan_iso',
      'build': 'adw_build_iso',
      'implement': 'adw_build_iso',
      'test': 'adw_test_iso',
      'review': 'adw_review_iso',
      'document': 'adw_document_iso',
      'pr': 'adw_ship_iso'
    };

    return stageWorkflowMap[stage] || 'adw_plan_build_iso';
  }

  /**
   * Map work item type to ADW model set
   */
  getModelSetForWorkItem(workItemType) {
    const modelSetMap = {
      'feature': 'heavy',  // Features are complex, use heavy model
      'bug': 'base',       // Bugs are often straightforward
      'chore': 'base',     // Chores are usually simple
      'patch': 'base'      // Patches are typically quick fixes
    };

    return modelSetMap[workItemType] || 'base';
  }

  /**
   * Cleanup resources and event listeners
   */
  cleanup() {
    console.log('WebSocketService: Cleaning up resources');

    // Disconnect WebSocket
    if (this.isConnected) {
      this.disconnect();
    }

    // Remove browser event listeners
    if (typeof document !== 'undefined' && this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    if (typeof window !== 'undefined') {
      if (this.onlineHandler) {
        window.removeEventListener('online', this.onlineHandler);
      }
      if (this.offlineHandler) {
        window.removeEventListener('offline', this.offlineHandler);
      }
    }

    // Clear all event listeners
    Object.keys(this.eventListeners).forEach(event => {
      this.eventListeners[event] = [];
    });

    // Clear message queue and pending promises
    this.messageQueue = [];
    this.cleanupPendingPromises();
  }
}

// Create and export singleton instance
const websocketService = new WebSocketService();
export default websocketService;