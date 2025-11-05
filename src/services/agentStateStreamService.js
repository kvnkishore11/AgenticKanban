/**
 * Agent State Stream Service
 *
 * High-level service for managing agent state WebSocket subscriptions.
 * Provides an abstraction layer over websocketService for agent state updates.
 */

import websocketService from './websocket/websocketService.js';

class AgentStateStreamService {
  constructor() {
    // In-memory cache of agent states keyed by adw_id
    this.agentStates = new Map();

    // Map of adw_id -> Set of callback functions
    this.subscribers = new Map();

    // Track initialization
    this.initialized = false;

    console.log('AgentStateStreamService initialized');
  }

  /**
   * Initialize the service and set up WebSocket event listeners
   */
  initialize() {
    if (this.initialized) {
      console.log('AgentStateStreamService already initialized');
      return;
    }

    // Listen to agent state update events from WebSocket
    websocketService.on('agent_summary_update', this.handleAgentSummaryUpdate.bind(this));
    websocketService.on('agent_log', this.handleAgentLog.bind(this));
    websocketService.on('thinking_block', this.handleThinkingBlock.bind(this));
    websocketService.on('tool_use_pre', this.handleToolUsePre.bind(this));
    websocketService.on('tool_use_post', this.handleToolUsePost.bind(this));
    websocketService.on('file_changed', this.handleFileChanged.bind(this));
    websocketService.on('text_block', this.handleTextBlock.bind(this));

    this.initialized = true;
    console.log('AgentStateStreamService event listeners registered');
  }

  /**
   * Subscribe to agent state updates for a specific ADW ID
   *
   * @param {string} adwId - The ADW ID to subscribe to
   * @param {Function} callback - Callback function to receive state updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToAgentState(adwId, callback) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!adwId) {
      console.error('subscribeToAgentState: adwId is required');
      return () => {};
    }

    if (typeof callback !== 'function') {
      console.error('subscribeToAgentState: callback must be a function');
      return () => {};
    }

    // Create subscribers set if it doesn't exist
    if (!this.subscribers.has(adwId)) {
      this.subscribers.set(adwId, new Set());
    }

    // Add callback to subscribers
    this.subscribers.get(adwId).add(callback);

    console.log(`Subscribed to agent state updates for ${adwId}. Total subscribers: ${this.subscribers.get(adwId).size}`);

    // If we have cached state, send it immediately
    if (this.agentStates.has(adwId)) {
      try {
        callback(this.agentStates.get(adwId));
      } catch (error) {
        console.error('Error in initial state callback:', error);
      }
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromAgentState(adwId, callback);
    };
  }

  /**
   * Unsubscribe from agent state updates
   *
   * @param {string} adwId - The ADW ID to unsubscribe from
   * @param {Function} callback - Optional specific callback to remove
   */
  unsubscribeFromAgentState(adwId, callback = null) {
    if (!this.subscribers.has(adwId)) {
      return;
    }

    if (callback) {
      // Remove specific callback
      this.subscribers.get(adwId).delete(callback);
      console.log(`Unsubscribed callback from agent state ${adwId}. Remaining: ${this.subscribers.get(adwId).size}`);
    } else {
      // Remove all callbacks for this adw_id
      this.subscribers.delete(adwId);
      console.log(`Unsubscribed all callbacks from agent state ${adwId}`);
    }

    // Clean up if no more subscribers
    if (this.subscribers.get(adwId)?.size === 0) {
      this.subscribers.delete(adwId);
    }
  }

  /**
   * Get cached agent state for an ADW ID
   *
   * @param {string} adwId - The ADW ID
   * @returns {Object|null} Cached state or null
   */
  getAgentState(adwId) {
    return this.agentStates.get(adwId) || null;
  }

  /**
   * Fetch current agent state from REST API
   * Useful for initial load or when WebSocket is unavailable
   *
   * @param {string} adwId - The ADW ID
   * @returns {Promise<Object>} Agent state data
   */
  async fetchAgentState(adwId) {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/agent-state/${adwId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch agent state: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the state
      if (data.state) {
        this.updateAgentState(adwId, {
          type: 'state_snapshot',
          timestamp: data.timestamp,
          state: data.state
        });
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch agent state for ${adwId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent state cache and notify subscribers
   *
   * @param {string} adwId - The ADW ID
   * @param {Object} update - State update object
   */
  updateAgentState(adwId, update) {
    // Get current state or create new
    const currentState = this.agentStates.get(adwId) || {
      adw_id: adwId,
      logs: [],
      files: [],
      thinking: [],
      toolExecutions: [],
      textBlocks: [],
      lastUpdate: null
    };

    // Merge update into current state based on update type
    const newState = {
      ...currentState,
      lastUpdate: update.timestamp || new Date().toISOString()
    };

    switch (update.type) {
      case 'agent_summary_update':
        newState.status = update.data.status;
        newState.progress = update.data.progress_percent;
        newState.currentStep = update.data.current_step;
        newState.workflowName = update.data.workflow_name;
        newState.message = update.data.message;
        newState.metadata = update.data.metadata;
        break;

      case 'agent_log':
        newState.logs = [...(newState.logs || []), {
          timestamp: update.data.timestamp,
          level: update.data.level,
          message: update.data.message,
          summary: update.data.summary,
          category: update.data.event_category,
          type: update.data.event_type
        }];
        // Keep only last 1000 logs to prevent memory bloat
        if (newState.logs.length > 1000) {
          newState.logs = newState.logs.slice(-1000);
        }
        break;

      case 'thinking_block':
        newState.thinking = [...(newState.thinking || []), {
          timestamp: update.data.timestamp,
          content: update.data.content,
          duration: update.data.duration_ms,
          sequence: update.data.sequence
        }];
        if (newState.thinking.length > 100) {
          newState.thinking = newState.thinking.slice(-100);
        }
        break;

      case 'tool_use_pre':
        newState.toolExecutions = [...(newState.toolExecutions || []), {
          timestamp: update.data.timestamp,
          toolName: update.data.tool_name,
          toolUseId: update.data.tool_use_id,
          phase: 'pre',
          input: update.data.input
        }];
        break;

      case 'tool_use_post': {
        // Find and update the matching pre execution
        const executions = [...(newState.toolExecutions || [])];
        const matchingIndex = executions.findIndex(
          e => e.toolUseId === update.data.tool_use_id && e.phase === 'pre'
        );

        if (matchingIndex >= 0) {
          executions[matchingIndex] = {
            ...executions[matchingIndex],
            phase: 'complete',
            output: update.data.output,
            duration: update.data.duration_ms,
            success: update.data.success,
            error: update.data.error,
            completedAt: update.data.timestamp
          };
        } else {
          // If no matching pre, add as standalone post
          executions.push({
            timestamp: update.data.timestamp,
            toolName: update.data.tool_name,
            toolUseId: update.data.tool_use_id,
            phase: 'post',
            output: update.data.output,
            duration: update.data.duration_ms,
            success: update.data.success,
            error: update.data.error
          });
        }

        newState.toolExecutions = executions;
        if (newState.toolExecutions.length > 200) {
          newState.toolExecutions = newState.toolExecutions.slice(-200);
        }
        break;
      }

      case 'file_changed':
        newState.files = [...(newState.files || []), {
          timestamp: update.data.timestamp,
          filePath: update.data.file_path,
          operation: update.data.operation,
          diff: update.data.diff,
          summary: update.data.summary,
          linesAdded: update.data.lines_added,
          linesRemoved: update.data.lines_removed
        }];
        if (newState.files.length > 500) {
          newState.files = newState.files.slice(-500);
        }
        break;

      case 'text_block':
        newState.textBlocks = [...(newState.textBlocks || []), {
          timestamp: update.data.timestamp,
          content: update.data.content,
          sequence: update.data.sequence
        }];
        if (newState.textBlocks.length > 100) {
          newState.textBlocks = newState.textBlocks.slice(-100);
        }
        break;

      case 'state_snapshot':
        // Full state replacement from REST API
        Object.assign(newState, update.state);
        break;

      default:
        console.warn('Unknown agent state update type:', update.type);
    }

    // Update cache
    this.agentStates.set(adwId, newState);

    // Notify all subscribers
    this.notifySubscribers(adwId, newState);
  }

  /**
   * Notify all subscribers for an ADW ID
   *
   * @param {string} adwId - The ADW ID
   * @param {Object} state - Updated state
   */
  notifySubscribers(adwId, state) {
    const callbacks = this.subscribers.get(adwId);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error(`Error in subscriber callback for ${adwId}:`, error);
      }
    });
  }

  // ===== Event Handlers =====

  handleAgentSummaryUpdate(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'agent_summary_update',
      timestamp: data.timestamp,
      data
    });
  }

  handleAgentLog(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'agent_log',
      timestamp: data.timestamp,
      data
    });
  }

  handleThinkingBlock(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'thinking_block',
      timestamp: data.timestamp,
      data
    });
  }

  handleToolUsePre(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'tool_use_pre',
      timestamp: data.timestamp,
      data
    });
  }

  handleToolUsePost(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'tool_use_post',
      timestamp: data.timestamp,
      data
    });
  }

  handleFileChanged(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'file_changed',
      timestamp: data.timestamp,
      data
    });
  }

  handleTextBlock(data) {
    if (!data || !data.adw_id) return;

    this.updateAgentState(data.adw_id, {
      type: 'text_block',
      timestamp: data.timestamp,
      data
    });
  }

  /**
   * Clear cached state for an ADW ID
   *
   * @param {string} adwId - The ADW ID
   */
  clearAgentState(adwId) {
    this.agentStates.delete(adwId);
    console.log(`Cleared cached state for ${adwId}`);
  }

  /**
   * Clear all cached states
   */
  clearAllStates() {
    this.agentStates.clear();
    console.log('Cleared all cached agent states');
  }

  /**
   * Get statistics about the service
   *
   * @returns {Object} Service statistics
   */
  getStatistics() {
    return {
      cachedStates: this.agentStates.size,
      totalSubscribers: Array.from(this.subscribers.values())
        .reduce((sum, set) => sum + set.size, 0),
      subscribersByAdw: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([adwId, set]) => [adwId, set.size])
      )
    };
  }
}

// Create and export singleton instance
const agentStateStreamService = new AgentStateStreamService();
export default agentStateStreamService;
