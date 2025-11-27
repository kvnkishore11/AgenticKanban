/**
 * @fileoverview Tests for AgentStateStreamService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock websocketService
vi.mock('../websocket/websocketService.js', () => ({
  default: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

import agentStateStreamService from '../agentStateStreamService.js';
import websocketService from '../websocket/websocketService.js';

describe('AgentStateStreamService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = agentStateStreamService;
    // Mock import.meta.env for the service
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:5001');
  });

  afterEach(() => {
    service.agentStates.clear();
    service.subscribers.clear();
  });

  describe('initialize', () => {
    it('should initialize service and register event listeners', () => {
      service.initialize();

      expect(websocketService.on).toHaveBeenCalledWith('agent_summary_update', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('agent_log', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('thinking_block', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('tool_use_pre', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('tool_use_post', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('file_changed', expect.any(Function));
      expect(websocketService.on).toHaveBeenCalledWith('text_block', expect.any(Function));
      expect(service.initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', () => {
      service.initialize();
      const callCount = websocketService.on.mock.calls.length;

      service.initialize();

      expect(websocketService.on).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('subscribeToAgentState', () => {
    it('should subscribe to agent state updates', () => {
      const adwId = 'test-adw-id';
      const callback = vi.fn();

      const unsubscribe = service.subscribeToAgentState(adwId, callback);

      expect(service.subscribers.has(adwId)).toBe(true);
      expect(service.subscribers.get(adwId).has(callback)).toBe(true);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should initialize service on first subscription', () => {
      const adwId = 'test-adw-id';
      const callback = vi.fn();

      service.subscribeToAgentState(adwId, callback);

      expect(service.initialized).toBe(true);
    });

    it('should send cached state immediately if available', () => {
      const adwId = 'test-adw-id';
      const callback = vi.fn();
      const cachedState = {
        adw_id: adwId,
        status: 'running',
        logs: []
      };

      service.agentStates.set(adwId, cachedState);
      service.subscribeToAgentState(adwId, callback);

      expect(callback).toHaveBeenCalledWith(cachedState);
    });

    it('should handle missing adwId', () => {
      const callback = vi.fn();

      const unsubscribe = service.subscribeToAgentState(null, callback);

      expect(service.subscribers.size).toBe(0);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle invalid callback', () => {
      const adwId = 'test-adw-id';

      const unsubscribe = service.subscribeToAgentState(adwId, 'not-a-function');

      expect(service.subscribers.size).toBe(0);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should support multiple subscribers for same adwId', () => {
      const adwId = 'test-adw-id';
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribeToAgentState(adwId, callback1);
      service.subscribeToAgentState(adwId, callback2);

      expect(service.subscribers.get(adwId).size).toBe(2);
    });
  });

  describe('unsubscribeFromAgentState', () => {
    it('should unsubscribe specific callback', () => {
      const adwId = 'test-adw-id';
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribeToAgentState(adwId, callback1);
      service.subscribeToAgentState(adwId, callback2);

      service.unsubscribeFromAgentState(adwId, callback1);

      expect(service.subscribers.get(adwId).size).toBe(1);
      expect(service.subscribers.get(adwId).has(callback2)).toBe(true);
    });

    it('should unsubscribe all callbacks when no callback specified', () => {
      const adwId = 'test-adw-id';
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribeToAgentState(adwId, callback1);
      service.subscribeToAgentState(adwId, callback2);

      service.unsubscribeFromAgentState(adwId);

      expect(service.subscribers.has(adwId)).toBe(false);
    });

    it('should clean up empty subscriber sets', () => {
      const adwId = 'test-adw-id';
      const callback = vi.fn();

      service.subscribeToAgentState(adwId, callback);
      service.unsubscribeFromAgentState(adwId, callback);

      expect(service.subscribers.has(adwId)).toBe(false);
    });
  });

  describe('getAgentState', () => {
    it('should return cached state', () => {
      const adwId = 'test-adw-id';
      const state = { adw_id: adwId, status: 'running' };

      service.agentStates.set(adwId, state);

      expect(service.getAgentState(adwId)).toEqual(state);
    });

    it('should return null when state not found', () => {
      expect(service.getAgentState('non-existent')).toBe(null);
    });
  });

  describe('fetchAgentState', () => {
    it('should fetch agent state from REST API', async () => {
      const adwId = 'test-adw-id';
      const mockResponse = {
        state: {
          status: 'running',
          progress: 50
        },
        timestamp: new Date().toISOString()
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.fetchAgentState(adwId);

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:5001/api/agent-state/${adwId}`
      );
      expect(result).toEqual(mockResponse);
      expect(service.agentStates.has(adwId)).toBe(true);
    });

    it('should handle fetch errors', async () => {
      const adwId = 'test-adw-id';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(service.fetchAgentState(adwId)).rejects.toThrow('Failed to fetch agent state');
    });

    it('should handle network errors', async () => {
      const adwId = 'test-adw-id';

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.fetchAgentState(adwId)).rejects.toThrow('Network error');
    });
  });

  describe('updateAgentState', () => {
    it('should update state with agent_summary_update', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'agent_summary_update',
        timestamp: new Date().toISOString(),
        data: {
          status: 'running',
          progress_percent: 50,
          current_step: 'testing',
          workflow_name: 'adw_sdlc_iso',
          message: 'Running tests'
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.status).toBe('running');
      expect(state.progress).toBe(50);
      expect(state.currentStep).toBe('testing');
      expect(state.workflowName).toBe('adw_sdlc_iso');
    });

    it('should update state with agent_log', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'agent_log',
        timestamp: new Date().toISOString(),
        data: {
          level: 'info',
          message: 'Test message',
          timestamp: new Date().toISOString()
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.logs).toHaveLength(1);
      expect(state.logs[0].message).toBe('Test message');
    });

    it('should limit log entries to 1000', () => {
      const adwId = 'test-adw-id';

      // Add 1001 logs
      for (let i = 0; i < 1001; i++) {
        service.updateAgentState(adwId, {
          type: 'agent_log',
          timestamp: new Date().toISOString(),
          data: {
            level: 'info',
            message: `Log ${i}`,
            timestamp: new Date().toISOString()
          }
        });
      }

      const state = service.agentStates.get(adwId);
      expect(state.logs).toHaveLength(1000);
    });

    it('should update state with thinking_block', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'thinking_block',
        timestamp: new Date().toISOString(),
        data: {
          content: 'Thinking...',
          duration_ms: 1000,
          sequence: 1,
          timestamp: new Date().toISOString()
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.thinking).toHaveLength(1);
      expect(state.thinking[0].content).toBe('Thinking...');
    });

    it('should update state with tool_use_pre', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'tool_use_pre',
        timestamp: new Date().toISOString(),
        data: {
          tool_name: 'test_tool',
          tool_use_id: 'tool-123',
          input: { param: 'value' },
          timestamp: new Date().toISOString()
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.toolExecutions).toHaveLength(1);
      expect(state.toolExecutions[0].phase).toBe('pre');
      expect(state.toolExecutions[0].toolName).toBe('test_tool');
    });

    it('should update matching tool_use_pre with tool_use_post', () => {
      const adwId = 'test-adw-id';
      const toolUseId = 'tool-123';

      // First add pre
      service.updateAgentState(adwId, {
        type: 'tool_use_pre',
        timestamp: new Date().toISOString(),
        data: {
          tool_name: 'test_tool',
          tool_use_id: toolUseId,
          input: { param: 'value' },
          timestamp: new Date().toISOString()
        }
      });

      // Then add post
      service.updateAgentState(adwId, {
        type: 'tool_use_post',
        timestamp: new Date().toISOString(),
        data: {
          tool_name: 'test_tool',
          tool_use_id: toolUseId,
          output: { result: 'success' },
          duration_ms: 500,
          success: true,
          timestamp: new Date().toISOString()
        }
      });

      const state = service.agentStates.get(adwId);
      expect(state.toolExecutions).toHaveLength(1);
      expect(state.toolExecutions[0].phase).toBe('complete');
      expect(state.toolExecutions[0].output).toEqual({ result: 'success' });
    });

    it('should update state with file_changed', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'file_changed',
        timestamp: new Date().toISOString(),
        data: {
          file_path: '/path/to/file.js',
          operation: 'modified',
          diff: '+ new line',
          lines_added: 1,
          lines_removed: 0,
          timestamp: new Date().toISOString()
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.files).toHaveLength(1);
      expect(state.files[0].filePath).toBe('/path/to/file.js');
    });

    it('should update state with text_block', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'text_block',
        timestamp: new Date().toISOString(),
        data: {
          content: 'Text content',
          sequence: 1,
          timestamp: new Date().toISOString()
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.textBlocks).toHaveLength(1);
      expect(state.textBlocks[0].content).toBe('Text content');
    });

    it('should handle state_snapshot update', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'state_snapshot',
        state: {
          status: 'completed',
          progress: 100,
          logs: [{ message: 'Done' }]
        }
      };

      service.updateAgentState(adwId, update);

      const state = service.agentStates.get(adwId);
      expect(state.status).toBe('completed');
      expect(state.progress).toBe(100);
    });

    it('should handle unknown update types', () => {
      const adwId = 'test-adw-id';
      const update = {
        type: 'unknown_type',
        data: {}
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      service.updateAgentState(adwId, update);

      expect(consoleSpy).toHaveBeenCalledWith('Unknown agent state update type:', 'unknown_type');

      consoleSpy.mockRestore();
    });
  });

  describe('notifySubscribers', () => {
    it('should notify all subscribers', () => {
      const adwId = 'test-adw-id';
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const state = { adw_id: adwId, status: 'running' };

      service.subscribeToAgentState(adwId, callback1);
      service.subscribeToAgentState(adwId, callback2);

      vi.clearAllMocks();

      service.notifySubscribers(adwId, state);

      expect(callback1).toHaveBeenCalledWith(state);
      expect(callback2).toHaveBeenCalledWith(state);
    });

    it('should handle callback errors gracefully', () => {
      const adwId = 'test-adw-id';
      const callback = vi.fn(() => {
        throw new Error('Callback error');
      });

      service.subscribeToAgentState(adwId, callback);

      const state = { adw_id: adwId };

      expect(() => {
        service.notifySubscribers(adwId, state);
      }).not.toThrow();
    });

    it('should do nothing when no subscribers', () => {
      expect(() => {
        service.notifySubscribers('non-existent', {});
      }).not.toThrow();
    });
  });

  describe('event handlers', () => {
    it('should handle agent_summary_update event', () => {
      const data = {
        adw_id: 'test-adw-id',
        status: 'running',
        timestamp: new Date().toISOString()
      };

      service.handleAgentSummaryUpdate(data);

      expect(service.agentStates.has('test-adw-id')).toBe(true);
    });

    it('should ignore events without adw_id', () => {
      service.handleAgentLog({});
      service.handleThinkingBlock({});
      service.handleToolUsePre({});

      expect(service.agentStates.size).toBe(0);
    });
  });

  describe('clearAgentState', () => {
    it('should clear cached state for specific adwId', () => {
      const adwId = 'test-adw-id';
      service.agentStates.set(adwId, { status: 'running' });

      service.clearAgentState(adwId);

      expect(service.agentStates.has(adwId)).toBe(false);
    });
  });

  describe('clearAllStates', () => {
    it('should clear all cached states', () => {
      service.agentStates.set('adw-1', { status: 'running' });
      service.agentStates.set('adw-2', { status: 'completed' });

      service.clearAllStates();

      expect(service.agentStates.size).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return service statistics', () => {
      const adwId1 = 'adw-1';
      const adwId2 = 'adw-2';

      service.agentStates.set(adwId1, { status: 'running' });
      service.agentStates.set(adwId2, { status: 'completed' });

      service.subscribeToAgentState(adwId1, vi.fn());
      service.subscribeToAgentState(adwId1, vi.fn());
      service.subscribeToAgentState(adwId2, vi.fn());

      const stats = service.getStatistics();

      expect(stats.cachedStates).toBe(2);
      expect(stats.totalSubscribers).toBe(3);
      expect(stats.subscribersByAdw[adwId1]).toBe(2);
      expect(stats.subscribersByAdw[adwId2]).toBe(1);
    });
  });
});
