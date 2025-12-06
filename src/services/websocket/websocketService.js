/**
 * WebSocket Service for ADW Trigger Communication
 * Manages real-time communication with the ADW WebSocket trigger server
 */

import { isWorkflowComplete } from '../../utils/workflowValidation.js';
import { SDLC_STAGES } from '../../constants/workItems.js';

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

    // Owner-based listener tracking for proper cleanup
    this.listenerOwners = new Map(); // Maps ownerId -> Set of {event, listener}

    // Pending connection promise to prevent concurrent connection attempts
    this.pendingConnectPromise = null;

    // Startup phase tracking
    this.isStartupPhase = true;
    this.startupReconnectAttempts = 0;
    this.maxStartupReconnectAttempts = 3;
    this.lastReconnectAttempt = 0;
    this.minReconnectInterval = 1000;

    // Circuit breaker for connection failures
    this.circuitBreaker = {
      state: 'CLOSED',  // CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)
      failureCount: 0,
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeout: 60000, // 60 seconds
      lastFailureTime: null,
      consecutiveSuccesses: 0
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
      reconnecting: [],
      // Agent state streaming events
      agent_summary_update: [],
      agent_log: [],
      thinking_block: [],
      tool_use_pre: [],
      tool_use_post: [],
      file_changed: [],
      text_block: [],
      summary_update: [],
      system_log: [], // System log events
      // Enhanced agent directory streaming events
      heartbeat: [],
      workflow_phase_transition: [],
      agent_output_chunk: [],
      screenshot_available: [],
      spec_created: [],
      // Circuit breaker and startup events
      startup_connection_failed: [],
      circuit_open: [],
      circuit_closed: [],
      connection_blocked: []
    };

    // Configuration - extract from environment variables
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const adwPort = import.meta.env.VITE_ADW_PORT;

    if (!backendUrl) {
      throw new Error('VITE_BACKEND_URL environment variable is required');
    }

    const url = new URL(backendUrl);

    // Use VITE_ADW_PORT if provided, otherwise fallback to VITE_BACKEND_URL port
    const port = adwPort ? parseInt(adwPort) : parseInt(url.port);

    this.config = {
      host: url.hostname,
      port: port, // Dynamic WebSocket server port
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
    // Connect to main WebSocket endpoint for real-time agent state streaming
    return `${protocol}://${host}:${port}/ws/trigger`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    // Return existing promise if connection already in progress
    if (this.pendingConnectPromise) {
      console.log('[WebSocket] Connection already in progress, returning existing promise');
      return this.pendingConnectPromise;
    }

    if (this.isConnected) {
      console.log('[WebSocket] Already connected');
      return Promise.resolve();
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.log('[WebSocket] Circuit breaker OPEN, connection blocked');
      this.emit('connection_blocked', { reason: 'circuit_breaker_open' });
      return Promise.reject(new Error('Circuit breaker is open - connection blocked'));
    }

    this.pendingConnectPromise = new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        const url = this.getWebSocketUrl();
        console.log(`Connecting to WebSocket at ${url} (host: ${this.config.host}, port: ${this.config.port})`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.connectionMetrics.connectionStartTime = Date.now();

          // Record success for circuit breaker
          this.recordConnectionSuccess();

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
          // Record failure for circuit breaker
          this.recordConnectionFailure();
          this.emit('error', { type: 'connection_error', message: 'WebSocket connection failed' });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        // Record failure for circuit breaker
        this.recordConnectionFailure();
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    }).finally(() => {
      // Clear pending promise when connection completes (success or failure)
      this.pendingConnectPromise = null;
    });

    return this.pendingConnectPromise;
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
    const now = Date.now();

    // Throttle reconnection attempts - prevent rapid retries
    if (now - this.lastReconnectAttempt < this.minReconnectInterval) {
      console.log('[WebSocket] Throttling reconnection - too soon since last attempt');
      return;
    }
    this.lastReconnectAttempt = now;

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.log('[WebSocket] Circuit breaker OPEN, skipping reconnection');
      return;
    }

    // During startup, limit reconnection attempts
    if (this.isStartupPhase) {
      this.startupReconnectAttempts++;
      if (this.startupReconnectAttempts >= this.maxStartupReconnectAttempts) {
        console.log('[WebSocket] Startup reconnection limit reached - backend may be unavailable');
        this.emit('startup_connection_failed', {
          message: 'Backend unavailable at startup',
          attempts: this.startupReconnectAttempts
        });
        return;
      }
    }

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

            // Check if workflow is complete after this stage
            let workflowComplete = false;
            if (data.workflow_name && data.status === 'completed') {
              workflowComplete = isWorkflowComplete(data.workflow_name, toStage);
            }

            // Emit dedicated stage transition event
            this.emit('stage_transition', {
              adw_id: data.adw_id,
              to_stage: toStage,
              from_stage: null, // We don't have from_stage in current_step format
              workflow_name: data.workflow_name,
              workflow_complete: workflowComplete,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }

        // Check if this is a workflow completion status
        if (data && data.status === 'completed' && data.workflow_name) {
          // Determine if workflow is complete based on workflow name
          // This requires knowing what stage we're in, which might be in current_step
          const currentStage = this.extractStageFromCurrentStep(data.current_step);
          if (currentStage && isWorkflowComplete(data.workflow_name, currentStage)) {
            // Add workflow_complete flag to the status update
            data.workflow_complete = true;
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
            workflow_complete: data.workflow_complete || false,
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
      case 'workflow_log':
        console.log('[WebSocketService] ===== WORKFLOW_LOG RECEIVED =====');
        console.log('[WebSocketService] workflow_log data:', JSON.stringify(data, null, 2));
        console.log('[WebSocketService] adw_id:', data?.adw_id);
        console.log('[WebSocketService] workflow_name:', data?.workflow_name);
        console.log('[WebSocketService] level:', data?.level);
        console.log('[WebSocketService] message:', data?.message);
        console.log('[WebSocketService] Emitting workflow_log event to registered listeners');
        console.log('[WebSocketService] Number of listeners for workflow_log:', this.listenerCount('workflow_log'));
        this.emit('workflow_log', data);
        console.log('[WebSocketService] workflow_log event emitted successfully');
        break;
      // Agent state streaming events
      case 'agent_summary_update':
        this.emit('agent_summary_update', data);
        break;
      case 'agent_log':
        this.emit('agent_log', data);
        break;
      case 'thinking_block':
        this.emit('thinking_block', data);
        break;
      case 'tool_use_pre':
        this.emit('tool_use_pre', data);
        break;
      case 'tool_use_post':
        this.emit('tool_use_post', data);
        break;
      case 'file_changed':
        this.emit('file_changed', data);
        break;
      case 'text_block':
        this.emit('text_block', data);
        break;
      case 'summary_update':
        this.emit('summary_update', data);
        break;
      case 'connection_ack':
        // Handle connection acknowledgment from server
        console.log('WebSocket connection acknowledged:', data);
        break;
      // Enhanced agent directory streaming events
      case 'heartbeat':
        // Update connection metrics from heartbeat
        if (data && data.timestamp) {
          const now = Date.now();
          const serverTime = new Date(data.timestamp).getTime();
          this.connectionMetrics.lastLatency = Math.abs(now - serverTime);
        }
        this.emit('heartbeat', data);
        break;
      case 'workflow_phase_transition':
        console.log('Phase transition:', data.phase_from, '→', data.phase_to);
        this.emit('workflow_phase_transition', data);
        break;
      case 'agent_output_chunk':
        this.emit('agent_output_chunk', data);
        break;
      case 'screenshot_available':
        console.log('Screenshot available:', data.screenshot_path);
        this.emit('screenshot_available', data);
        break;
      case 'spec_created':
        console.log('Spec created:', data.spec_path);
        this.emit('spec_created', data);
        break;
      case 'stage_transition':
        console.log('[WebSocket] Stage transition received:', data);
        this.emit('stage_transition', data);
        break;
      // Agent management message types
      case 'agent_created':
        this.emit('agent_created', data);
        break;
      case 'agent_updated':
        this.emit('agent_updated', data);
        break;
      case 'agent_deleted':
        this.emit('agent_deleted', data);
        break;
      case 'agent_status_change':
        this.emit('agent_status_change', data);
        break;
      // Orchestrator and system message types
      case 'orchestrator_updated':
        this.emit('orchestrator_updated', data);
        break;
      case 'system_log':
        this.emit('system_log', data);
        break;
      // Session and subscription message types
      case 'session_registered':
        this.emit('session_registered', data);
        break;
      case 'ticket_notification_response':
        this.emit('ticket_notification_response', data);
        break;
      case 'subscription_ack':
        this.emit('subscription_ack', data);
        break;
      // Chat-related message types (future-proofing)
      case 'chat_message':
        this.emit('chat_message', data);
        break;
      case 'chat_stream':
        this.emit('chat_stream', data);
        break;
      case 'typing_indicator':
        this.emit('typing_indicator', data);
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
    // Validate inputs
    if (!task) {
      throw new Error('Task is required to trigger workflow');
    }
    if (!workflowType) {
      throw new Error('Workflow type is required');
    }

    // Build issue_json with all task data
    const issue_json = {
      title: task.title || `Task ${task.id}`,
      body: task.description || '',
      number: task.id,
      images: task.images || [], // Include images with their annotations
      metadata: task.metadata || {}, // Include task metadata
      stage: task.stage || 'backlog', // Include current stage
      workItemType: task.workItemType || null, // Include work item type
    };

    // Add patch_request to issue_json if provided
    if (options.patch_request) {
      issue_json.patch_request = options.patch_request;
    }

    const request = {
      workflow_type: workflowType,
      adw_id: options.adw_id || null,
      issue_number: options.issue_number || String(task.id),
      issue_type: task.workItemType || null,
      issue_json: issue_json,
      model_set: options.model_set || 'base',
      trigger_reason: `Kanban task: ${task.title || task.description.substring(0, 50)}`
    };

    // For orchestrator workflow, include the stages array
    if (workflowType === 'adw_orchestrator' && task.queuedStages) {
      request.stages = this.getNormalizedStages(task.queuedStages);
      console.log('[WebSocketService] Using orchestrator with stages:', request.stages);
    }

    // Include orchestrator config if provided in options
    if (options.config) {
      request.config = options.config;
    }

    console.log('[WebSocketService] Triggering workflow with request:', JSON.stringify(request, null, 2));

    try {
      const response = await this.triggerWorkflow(request);
      console.log('[WebSocketService] Workflow triggered successfully:', response);
      return response;
    } catch (error) {
      console.error('[WebSocketService] Failed to trigger workflow for task:', error);
      // Enhance error message with more context
      const enhancedError = new Error(
        `Failed to trigger ${workflowType} workflow: ${error.message || 'Unknown error'}`
      );
      enhancedError.originalError = error;
      throw enhancedError;
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
   * Trigger a slash command execution.
   *
   * This is the simple way to trigger complex operations from the UI.
   * Instead of scripting every edge case, we let Claude handle the complexity.
   *
   * @param {string} command - Command name (e.g., "merge_worktree" or alias "merge")
   * @param {string[]} args - Command arguments (e.g., ["8250f1e2", "rebase"])
   * @param {object} context - Additional context (adw_id, task_id, etc.)
   * @returns {Promise<object>} - Command execution result
   */
  async triggerSlashCommand(command, args = [], context = {}) {
    try {
      const { protocol, host, port } = this.config;
      const apiUrl = `http${protocol === 'wss' ? 's' : ''}://${host}:${port}/api/slash-command`;

      console.log(`[WebSocketService] Executing slash command: /${command} ${args.join(' ')}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          arguments: args,
          context
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Command failed with status ${response.status}`);
      }

      console.log(`[WebSocketService] Slash command result:`, result);
      return result;
    } catch (error) {
      console.error('[WebSocketService] Failed to execute slash command:', error);
      throw error;
    }
  }

  /**
   * List all available slash commands
   * @returns {Promise<object[]>} - Array of available commands
   */
  async listSlashCommands() {
    try {
      const { protocol, host, port } = this.config;
      const apiUrl = `http${protocol === 'wss' ? 's' : ''}://${host}:${port}/api/slash-commands`;

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to list commands`);
      }

      return result.commands || [];
    } catch (error) {
      console.error('[WebSocketService] Failed to list slash commands:', error);
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

    for (const [, promiseData] of this.pendingPromises) {
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

  listenerCount(event) {
    if (!this.eventListeners[event]) return 0;
    return this.eventListeners[event].length;
  }

  // ============================================================
  // Owner-Based Listener Management
  // ============================================================

  /**
   * Register event listener with owner tracking for bulk cleanup
   * @param {string} ownerId - Unique identifier for the owner (e.g., 'kanban-store')
   * @param {string} event - Event name to listen to
   * @param {function} listener - Callback function
   */
  onWithOwner(ownerId, event, listener) {
    // Register the listener normally
    this.on(event, listener);

    // Track the listener by owner
    if (!this.listenerOwners.has(ownerId)) {
      this.listenerOwners.set(ownerId, new Set());
    }
    this.listenerOwners.get(ownerId).add({ event, listener });
    console.log(`[WebSocket] Registered listener for '${event}' owned by '${ownerId}'`);
  }

  /**
   * Remove all listeners registered by a specific owner
   * @param {string} ownerId - Owner identifier to remove listeners for
   */
  offAllByOwner(ownerId) {
    const listeners = this.listenerOwners.get(ownerId);
    if (!listeners || listeners.size === 0) {
      console.log(`[WebSocket] No listeners found for owner '${ownerId}'`);
      return;
    }

    let removedCount = 0;
    for (const { event, listener } of listeners) {
      this.off(event, listener);
      removedCount++;
    }

    this.listenerOwners.delete(ownerId);
    console.log(`[WebSocket] Removed ${removedCount} listeners for owner '${ownerId}'`);
  }

  /**
   * Check if an owner has registered listeners
   * @param {string} ownerId - Owner identifier to check
   * @returns {boolean} True if owner has registered listeners
   */
  hasListenersByOwner(ownerId) {
    const listeners = this.listenerOwners.get(ownerId);
    return !!(listeners && listeners.size > 0);
  }

  /**
   * Get count of listeners registered by an owner
   * @param {string} ownerId - Owner identifier
   * @returns {number} Number of listeners registered by owner
   */
  getListenerCountByOwner(ownerId) {
    const listeners = this.listenerOwners.get(ownerId);
    return listeners ? listeners.size : 0;
  }

  // ============================================================
  // Circuit Breaker Methods
  // ============================================================

  /**
   * Check if circuit breaker is open (blocking connections)
   * @returns {boolean} True if circuit is open and connections should be blocked
   */
  isCircuitOpen() {
    if (this.circuitBreaker.state === 'CLOSED') {
      return false;
    }

    if (this.circuitBreaker.state === 'OPEN') {
      // Check if reset timeout has passed
      const elapsed = Date.now() - this.circuitBreaker.lastFailureTime;
      if (elapsed >= this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN after reset timeout');
        return false;
      }
      return true;
    }

    // HALF_OPEN allows connection attempts
    return false;
  }

  /**
   * Record a successful connection for circuit breaker
   */
  recordConnectionSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.consecutiveSuccesses++;
      if (this.circuitBreaker.consecutiveSuccesses >= this.circuitBreaker.successThreshold) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.consecutiveSuccesses = 0;
        console.log('[CircuitBreaker] Circuit CLOSED after successful recovery');
        this.emit('circuit_closed', { message: 'Connection recovered' });
      }
    } else {
      // Reset failure count on successful connection
      this.circuitBreaker.failureCount = 0;
    }
  }

  /**
   * Record a failed connection for circuit breaker
   */
  recordConnectionFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.consecutiveSuccesses = 0;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      console.log('[CircuitBreaker] Circuit OPEN after', this.circuitBreaker.failureCount, 'failures');
      this.emit('circuit_open', {
        failures: this.circuitBreaker.failureCount,
        willRetryAt: Date.now() + this.circuitBreaker.resetTimeout
      });
    }
  }

  /**
   * Get circuit breaker status
   * @returns {object} Circuit breaker state information
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      isOpen: this.isCircuitOpen()
    };
  }

  // ============================================================
  // Startup Phase Management
  // ============================================================

  /**
   * Exit startup phase - called when first successful connection is made
   * This allows unlimited reconnection attempts after initial connection
   */
  exitStartupPhase() {
    if (this.isStartupPhase) {
      this.isStartupPhase = false;
      this.startupReconnectAttempts = 0;
      console.log('[WebSocket] Exited startup phase - normal reconnection enabled');
    }
  }

  /**
   * Manual reconnect - resets all counters and attempts to connect
   * Use this when user explicitly requests reconnection
   */
  async manualReconnect() {
    console.log('[WebSocket] Manual reconnection triggered');

    // Reset all reconnection-related state
    this.isStartupPhase = false;
    this.startupReconnectAttempts = 0;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.lastReconnectAttempt = 0;

    // Reset circuit breaker
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.consecutiveSuccesses = 0;

    // Close existing connection if any
    if (this.ws) {
      this.config.autoReconnect = false; // Temporarily disable auto-reconnect
      this.ws.close(1000, 'Manual reconnect');
      this.ws = null;
    }

    // Re-enable auto-reconnect
    this.config.autoReconnect = true;

    // Attempt new connection
    return this.connect();
  }

  /**
   * Map kanban stages to ADW workflow types
   * Returns workflow type and optionally the stages array for orchestrator
   */
  getWorkflowTypeForStage(stage, queuedStages = []) {
    // If task has queued stages, use the dynamic orchestrator
    if (queuedStages && queuedStages.length > 0) {
      // Map kanban stages to ADW stage names (normalize naming)
      const stageMapping = {
        'plan': 'plan',
        'build': 'build',
        'implement': 'build',
        'test': 'test',
        'review': 'review',
        'document': 'document',
        'merge': 'merge'
      };

      // Convert queued stages to ADW stages (filter out unmapped stages like 'pr')
      const adwStages = queuedStages
        .map(s => stageMapping[s])
        .filter(s => s); // Remove undefined values

      if (adwStages.length > 0) {
        // Return orchestrator workflow type - stages will be passed separately
        return 'adw_orchestrator';
      }
    }

    // Fallback to stage-specific workflows for single-stage operations
    const stageWorkflowMap = {
      'plan': 'adw_plan_iso',
      'build': 'adw_build_iso',
      'implement': 'adw_build_iso',
      'test': 'adw_test_iso',
      'review': 'adw_review_iso',
      'document': 'adw_document_iso'
    };

    return stageWorkflowMap[stage] || 'adw_plan_build_iso';
  }

  /**
   * Get normalized ADW stages from queued stages
   */
  getNormalizedStages(queuedStages = []) {
    if (!queuedStages || queuedStages.length === 0) {
      return [];
    }

    // Map kanban stages to ADW stage names
    const stageMapping = {
      'plan': 'plan',
      'build': 'build',
      'implement': 'build',
      'test': 'test',
      'review': 'review',
      'document': 'document',
      'merge': 'merge'
    };

    return queuedStages
      .map(s => stageMapping[s])
      .filter(s => s); // Remove undefined values (like 'pr')
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
   * Extract stage name from current_step string
   * @param {string} currentStep - The current_step string (e.g., "Stage: Build")
   * @returns {string|null} - The extracted stage name (lowercase) or null
   */
  extractStageFromCurrentStep(currentStep) {
    if (!currentStep || typeof currentStep !== 'string') {
      return null;
    }

    const stageMatch = currentStep.match(/^Stage:\s*(\w+)/i);
    if (stageMatch) {
      return stageMatch[1].toLowerCase();
    }

    return null;
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