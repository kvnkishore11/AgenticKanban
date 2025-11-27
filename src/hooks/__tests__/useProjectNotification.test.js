import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectNotification } from '../useProjectNotification';

// Mock the services
vi.mock('../../services/storage/projectNotificationService', () => {
  const mockService = {
    on: vi.fn(),
    off: vi.fn(),
    connectToProject: vi.fn(),
    disconnectFromProject: vi.fn(),
    sendTicketNotification: vi.fn(),
    testConnection: vi.fn(),
    discoverProjectPort: vi.fn(),
    getProjectStatus: vi.fn(() => ({
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    })),
  };
  return {
    default: mockService,
  };
});

vi.mock('../../services/storage/localStorage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import projectNotificationService from '../../services/storage/projectNotificationService';
import localStorageService from '../../services/storage/localStorage';

describe('useProjectNotification', () => {
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    localStorageService.getItem.mockReturnValue({});
    localStorageService.setItem.mockReturnValue(true);
    projectNotificationService.getProjectStatus.mockReturnValue({
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state when no projectId provided', () => {
      const { result } = renderHook(() => useProjectNotification());

      expect(result.current.connectionState).toMatchObject({
        connected: false,
        connecting: false,
        error: null,
      });
      expect(result.current.notifications).toEqual([]);
      expect(result.current.config).toBeNull();
    });

    it('should initialize with default state for valid projectId', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      expect(result.current.connectionState).toBeDefined();
      expect(result.current.notifications).toEqual([]);
      expect(result.current.config).toBeDefined();
    });

    it('should load configuration from localStorage', () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          autoDiscover: true,
          enabled: true,
        },
      };

      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      expect(localStorageService.getItem).toHaveBeenCalledWith(
        'project-notification-configs',
        {}
      );
      expect(result.current.config).toEqual(savedConfig[mockProjectId]);
    });

    it('should use default config when no saved config exists', () => {
      localStorageService.getItem.mockReturnValue({});

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      expect(result.current.config).toEqual({
        host: 'localhost',
        port: '',
        autoDiscover: true,
        enabled: true,
      });
    });

    it('should handle localStorage read errors gracefully', () => {
      localStorageService.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      expect(result.current.config).toEqual({
        host: 'localhost',
        port: '',
        autoDiscover: true,
        enabled: true,
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Event Listeners', () => {
    it('should register event listeners on mount', () => {
      renderHook(() => useProjectNotification(mockProjectId));

      expect(projectNotificationService.on).toHaveBeenCalledWith(
        mockProjectId,
        'connect',
        expect.any(Function)
      );
      expect(projectNotificationService.on).toHaveBeenCalledWith(
        mockProjectId,
        'disconnect',
        expect.any(Function)
      );
      expect(projectNotificationService.on).toHaveBeenCalledWith(
        mockProjectId,
        'error',
        expect.any(Function)
      );
      expect(projectNotificationService.on).toHaveBeenCalledWith(
        mockProjectId,
        'notification_sent',
        expect.any(Function)
      );
      expect(projectNotificationService.on).toHaveBeenCalledWith(
        mockProjectId,
        'notification_failed',
        expect.any(Function)
      );
    });

    it('should unregister event listeners on unmount', () => {
      const { unmount } = renderHook(() => useProjectNotification(mockProjectId));

      unmount();

      expect(projectNotificationService.off).toHaveBeenCalledWith(
        mockProjectId,
        'connect',
        expect.any(Function)
      );
      expect(projectNotificationService.off).toHaveBeenCalledWith(
        mockProjectId,
        'disconnect',
        expect.any(Function)
      );
      expect(projectNotificationService.off).toHaveBeenCalledWith(
        mockProjectId,
        'error',
        expect.any(Function)
      );
    });

    it('should handle connect event', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      // Get the connect handler
      const connectHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'connect'
      )[2];

      act(() => {
        connectHandler({
          projectId: mockProjectId,
          config: { host: 'localhost', port: 3000 },
        });
      });

      expect(result.current.connectionState.connected).toBe(true);
      expect(result.current.connectionState.connecting).toBe(false);
      expect(result.current.connectionState.error).toBeNull();
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
    });

    it('should handle disconnect event', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const disconnectHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'disconnect'
      )[2];

      act(() => {
        disconnectHandler({
          projectId: mockProjectId,
          code: 1000,
          reason: 'Normal closure',
        });
      });

      expect(result.current.connectionState.connected).toBe(false);
      expect(result.current.connectionState.connecting).toBe(false);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('info');
    });

    it('should handle error event', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const errorHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'error'
      )[2];

      act(() => {
        errorHandler({
          projectId: mockProjectId,
          error: 'Connection failed',
        });
      });

      expect(result.current.connectionState.connected).toBe(false);
      expect(result.current.connectionState.error).toBe('Connection failed');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
    });

    it('should handle notification_sent event', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const sentHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'notification_sent'
      )[2];

      act(() => {
        sentHandler({
          projectId: mockProjectId,
          ticketId: 'ticket-123',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].message).toContain('sent successfully');
    });

    it('should handle notification_failed event', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const failedHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'notification_failed'
      )[2];

      act(() => {
        failedHandler({
          projectId: mockProjectId,
          ticketId: 'ticket-123',
          error: 'Network error',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.notifications[0].message).toContain('Failed to send');
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration to localStorage', async () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const newConfig = {
        host: 'localhost',
        port: '5000',
        autoDiscover: false,
        enabled: true,
      };

      let success;
      await act(async () => {
        success = await result.current.saveConfiguration(newConfig);
      });

      expect(localStorageService.setItem).toHaveBeenCalledWith(
        'project-notification-configs',
        expect.objectContaining({
          [mockProjectId]: newConfig,
        })
      );
      expect(success).toBe(true);
      expect(result.current.config).toEqual(newConfig);
    });

    it('should return false when no projectId', async () => {
      const { result } = renderHook(() => useProjectNotification());

      let success;
      await act(async () => {
        success = await result.current.saveConfiguration({ enabled: true });
      });

      expect(success).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      localStorageService.setItem.mockReturnValue(false);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      let success;
      await act(async () => {
        success = await result.current.saveConfiguration({ enabled: true });
      });

      expect(success).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('connect', () => {
    it('should connect to project with valid config', async () => {
      projectNotificationService.connectToProject.mockResolvedValue(undefined);

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await act(async () => {
        await result.current.connect();
      });

      expect(projectNotificationService.connectToProject).toHaveBeenCalledWith(
        mockProjectId,
        {
          host: 'localhost',
          port: 3000,
        }
      );
    });

    it('should throw error when no projectId', async () => {
      const { result } = renderHook(() => useProjectNotification());

      await expect(async () => {
        await act(async () => {
          await result.current.connect();
        });
      }).rejects.toThrow('No project ID provided');
    });

    it('should throw error when notifications not enabled', async () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: false,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await expect(async () => {
        await act(async () => {
          await result.current.connect();
        });
      }).rejects.toThrow('Project notifications not enabled');
    });

    it('should throw error when no port configured', async () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await expect(async () => {
        await act(async () => {
          await result.current.connect();
        });
      }).rejects.toThrow('No port configured');
    });

    it('should handle connection errors', async () => {
      projectNotificationService.connectToProject.mockRejectedValue(
        new Error('Connection refused')
      );

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      let error;
      try {
        await act(async () => {
          await result.current.connect();
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe('Connection refused');
      expect(result.current.connectionState.connecting).toBe(false);
    });

    it('should accept custom config', async () => {
      projectNotificationService.connectToProject.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const customConfig = {
        host: 'example.com',
        port: '8080',
        enabled: true,
      };

      await act(async () => {
        await result.current.connect(customConfig);
      });

      expect(projectNotificationService.connectToProject).toHaveBeenCalledWith(
        mockProjectId,
        {
          host: 'example.com',
          port: 8080,
        }
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect from project', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      act(() => {
        result.current.disconnect();
      });

      expect(projectNotificationService.disconnectFromProject).toHaveBeenCalledWith(
        mockProjectId
      );
    });

    it('should handle disconnect without projectId', () => {
      const { result } = renderHook(() => useProjectNotification());

      act(() => {
        result.current.disconnect();
      });

      expect(projectNotificationService.disconnectFromProject).not.toHaveBeenCalled();
    });
  });

  describe('sendTicketNotification', () => {
    it('should send ticket notification when connected', async () => {
      projectNotificationService.sendTicketNotification.mockResolvedValue(undefined);
      projectNotificationService.getProjectStatus.mockReturnValue({
        connected: true,
        connecting: false,
        reconnectAttempts: 0,
      });

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      // Simulate connection
      const connectHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'connect'
      )[2];
      act(() => {
        connectHandler({ projectId: mockProjectId });
      });

      const ticketData = { id: 'ticket-123', title: 'Test ticket' };

      let success;
      await act(async () => {
        success = await result.current.sendTicketNotification(ticketData);
      });

      expect(projectNotificationService.sendTicketNotification).toHaveBeenCalledWith(
        mockProjectId,
        ticketData
      );
      expect(success).toBe(true);
    });

    it('should throw error when not connected', async () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '',
          enabled: false,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await expect(async () => {
        await act(async () => {
          await result.current.sendTicketNotification({ id: 'test' });
        });
      }).rejects.toThrow('Not connected to project');
    });

    it('should auto-connect if config is valid and not connected', async () => {
      projectNotificationService.connectToProject.mockResolvedValue(undefined);
      projectNotificationService.sendTicketNotification.mockResolvedValue(undefined);

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const ticketData = { id: 'ticket-123' };

      await act(async () => {
        await result.current.sendTicketNotification(ticketData);
      });

      expect(projectNotificationService.connectToProject).toHaveBeenCalled();
      expect(projectNotificationService.sendTicketNotification).toHaveBeenCalled();
    });

    it('should handle send errors', async () => {
      projectNotificationService.sendTicketNotification.mockRejectedValue(
        new Error('Send failed')
      );
      projectNotificationService.getProjectStatus.mockReturnValue({
        connected: true,
        connecting: false,
        reconnectAttempts: 0,
      });

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      // Simulate connection
      const connectHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'connect'
      )[2];
      act(() => {
        connectHandler({ projectId: mockProjectId });
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await act(async () => {
          await result.current.sendTicketNotification({ id: 'test' });
        });
      }).rejects.toThrow('Send failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('testConnection', () => {
    it('should test connection with current config', async () => {
      projectNotificationService.testConnection.mockResolvedValue(true);

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      let isConnectable;
      await act(async () => {
        isConnectable = await result.current.testConnection();
      });

      expect(projectNotificationService.testConnection).toHaveBeenCalledWith(
        'localhost',
        3000,
        5000
      );
      expect(isConnectable).toBe(true);
    });

    it('should test connection with custom config', async () => {
      projectNotificationService.testConnection.mockResolvedValue(false);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const testConfig = {
        host: 'example.com',
        port: '8080',
      };

      let isConnectable;
      await act(async () => {
        isConnectable = await result.current.testConnection(testConfig);
      });

      expect(projectNotificationService.testConnection).toHaveBeenCalledWith(
        'example.com',
        8080,
        5000
      );
      expect(isConnectable).toBe(false);
    });

    it('should throw error when no port configured', async () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '',
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await expect(async () => {
        await act(async () => {
          await result.current.testConnection();
        });
      }).rejects.toThrow('No port configured');
    });

    it('should handle test connection errors', async () => {
      projectNotificationService.testConnection.mockRejectedValue(
        new Error('Test failed')
      );

      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await act(async () => {
          await result.current.testConnection();
        });
      }).rejects.toThrow('Test failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('discoverPorts', () => {
    it('should discover available ports', async () => {
      projectNotificationService.discoverProjectPort.mockResolvedValue({
        host: 'localhost',
        port: 3000,
        discovered: true,
      });

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      let discoveryResult;
      await act(async () => {
        discoveryResult = await result.current.discoverPorts();
      });

      expect(projectNotificationService.discoverProjectPort).toHaveBeenCalledWith(
        mockProjectId,
        'localhost'
      );
      expect(discoveryResult).toEqual({
        host: 'localhost',
        port: 3000,
        discovered: true,
      });
    });

    it('should discover ports on custom host', async () => {
      projectNotificationService.discoverProjectPort.mockResolvedValue(null);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      await act(async () => {
        await result.current.discoverPorts('192.168.1.100');
      });

      expect(projectNotificationService.discoverProjectPort).toHaveBeenCalledWith(
        mockProjectId,
        '192.168.1.100'
      );
    });

    it('should throw error when no projectId', async () => {
      const { result } = renderHook(() => useProjectNotification());

      await expect(async () => {
        await act(async () => {
          await result.current.discoverPorts();
        });
      }).rejects.toThrow('No project ID provided');
    });

    it('should handle discovery errors', async () => {
      projectNotificationService.discoverProjectPort.mockRejectedValue(
        new Error('Discovery failed')
      );

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(async () => {
        await act(async () => {
          await result.current.discoverPorts();
        });
      }).rejects.toThrow('Discovery failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Notification Management', () => {
    it('should limit notification history to 50 items', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const errorHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'error'
      )[2];

      act(() => {
        for (let i = 0; i < 60; i++) {
          errorHandler({
            projectId: mockProjectId,
            error: `Error ${i}`,
          });
        }
      });

      expect(result.current.notifications).toHaveLength(50);
      expect(result.current.notifications[0].message).toContain('Error 59');
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const errorHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'error'
      )[2];

      act(() => {
        errorHandler({ projectId: mockProjectId, error: 'Error 1' });
        errorHandler({ projectId: mockProjectId, error: 'Error 2' });
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should remove specific notification', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const errorHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'error'
      )[2];

      act(() => {
        errorHandler({ projectId: mockProjectId, error: 'Error 1' });
        errorHandler({ projectId: mockProjectId, error: 'Error 2' });
        errorHandler({ projectId: mockProjectId, error: 'Error 3' });
      });

      expect(result.current.notifications).toHaveLength(3);

      const notificationToRemove = result.current.notifications[1];

      act(() => {
        result.current.removeNotification(notificationToRemove.id);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.find((n) => n.id === notificationToRemove.id)).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return combined status information', () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      // Simulate a connection event to update the state
      const connectHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'connect'
      )[2];

      act(() => {
        connectHandler({
          projectId: mockProjectId,
          config: { host: 'localhost', port: 3000 },
        });
      });

      const status = result.current.getStatus();

      expect(status).toMatchObject({
        connected: true,
        connecting: false,
        hasValidConfig: true,
      });
      expect(status.serviceStatus).toBeDefined();
      expect(status.config).toBeDefined();
    });
  });

  describe('Computed State', () => {
    it('should provide computed state properties', () => {
      const savedConfig = {
        [mockProjectId]: {
          host: 'localhost',
          port: '3000',
          enabled: true,
        },
      };
      localStorageService.getItem.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.isConfigured).toBe(true);
    });

    it('should reflect error state in hasError', () => {
      const { result } = renderHook(() => useProjectNotification(mockProjectId));

      const errorHandler = projectNotificationService.on.mock.calls.find(
        (call) => call[1] === 'error'
      )[2];

      act(() => {
        errorHandler({
          projectId: mockProjectId,
          error: 'Connection error',
        });
      });

      expect(result.current.hasError).toBe(true);
    });
  });
});
