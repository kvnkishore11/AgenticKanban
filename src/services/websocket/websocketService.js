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
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.heartbeatIntervalTime = 30000; // 30 seconds

    // Event listeners
    this.eventListeners = {
      connect: [],
      disconnect: [],
      trigger_response: [],
      status_update: [],
      error: [],
      pong: []
    };

    // Configuration
    this.config = {
      host: 'localhost',
      port: 8002,
      protocol: 'ws',
      autoReconnect: true,
      maxReconnectAttempts: 5,
      heartbeat: true
    };

    console.log('WebSocketService initialized');
  }

  /**
   * Configure WebSocket connection parameters
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
    console.log('WebSocket configuration updated:', this.config);
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

          // Start heartbeat if enabled
          if (this.config.heartbeat) {
            this.startHeartbeat();
          }

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
          this.stopHeartbeat();
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
  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket');
      this.config.autoReconnect = false; // Disable auto-reconnect for manual disconnect
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Schedule reconnection attempt
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
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

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

    console.log('Received WebSocket message:', type, data);

    switch (type) {
      case 'trigger_response':
        this.emit('trigger_response', data);
        break;
      case 'status_update':
        this.emit('status_update', data);
        break;
      case 'error':
        this.emit('error', data);
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
   * Send message to WebSocket server
   */
  sendMessage(message) {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket is not connected');
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('Sent WebSocket message:', message.type);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      throw error;
    }
  }

  /**
   * Trigger an ADW workflow
   */
  async triggerWorkflow(request) {
    console.log('Triggering workflow via WebSocket:', request);

    if (!this.isConnected) {
      // Try to connect if not connected
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      // Set up one-time listeners for this request
      const onResponse = (data) => {
        this.off('trigger_response', onResponse);
        this.off('error', onError);

        if (data.status === 'accepted') {
          resolve(data);
        } else {
          reject(new Error(data.error || data.message || 'Workflow trigger failed'));
        }
      };

      const onError = (error) => {
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        reject(new Error(error.message || 'WebSocket error during workflow trigger'));
      };

      this.on('trigger_response', onResponse);
      this.on('error', onError);

      // Send the trigger request
      try {
        this.sendMessage({
          type: 'trigger_workflow',
          data: request
        });
      } catch (error) {
        this.off('trigger_response', onResponse);
        this.off('error', onError);
        reject(error);
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
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      config: this.config
    };
  }

  /**
   * Event listener management
   */
  on(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
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
}

// Create and export singleton instance
const websocketService = new WebSocketService();
export default websocketService;