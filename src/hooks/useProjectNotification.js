import { useState, useEffect, useCallback, useRef } from 'react';
import projectNotificationService from '../services/storage/projectNotificationService';
import localStorageService from '../services/storage/localStorage';

/**
 * Custom hook for managing project notification connections
 * Provides state management, connection handling, and notification sending
 */
export const useProjectNotification = (projectId = null) => {
  const [connectionState, setConnectionState] = useState({
    connected: false,
    connecting: false,
    error: null,
    lastConnectedAt: null,
    reconnectAttempts: 0
  });

  const [notifications, setNotifications] = useState([]);
  const [config, setConfig] = useState(null);
  const maxNotificationHistory = 50;
  const configRef = useRef(config);

  // Keep config ref updated
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Load configuration from storage when projectId changes
  useEffect(() => {
    if (!projectId) {
      setConfig(null);
      return;
    }

    const loadConfiguration = () => {
      try {
        const savedConfigs = localStorageService.getItem('project-notification-configs', {});
        const projectConfig = savedConfigs[projectId];

        if (projectConfig) {
          setConfig(projectConfig);
        } else {
          // Set default configuration
          const defaultConfig = {
            host: 'localhost',
            port: '',
            autoDiscover: true,
            enabled: true
          };
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Failed to load project notification configuration:', error);
        setConfig({
          host: 'localhost',
          port: '',
          autoDiscover: true,
          enabled: true
        });
      }
    };

    loadConfiguration();
  }, [projectId]);

  // Save configuration to storage when it changes
  const saveConfiguration = useCallback(async (newConfig) => {
    if (!projectId || !newConfig) return false;

    try {
      const savedConfigs = localStorageService.getItem('project-notification-configs', {});
      savedConfigs[projectId] = newConfig;

      const success = localStorageService.setItem('project-notification-configs', savedConfigs);
      if (success) {
        setConfig(newConfig);
      }
      return success;
    } catch (error) {
      console.error('Failed to save project notification configuration:', error);
      return false;
    }
  }, [projectId]);

  // Set up event listeners for the project
  useEffect(() => {
    if (!projectId) return;

    const handleConnect = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        lastConnectedAt: new Date().toISOString(),
        reconnectAttempts: 0
      }));

      // Add connection success notification
      addNotification('success', 'Connected to project development server', {
        projectId: data.projectId,
        config: data.config
      });
    };

    const handleDisconnect = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false
      }));

      // Add disconnection notification
      addNotification('info', 'Disconnected from project development server', {
        projectId: data.projectId,
        code: data.code,
        reason: data.reason
      });
    };

    const handleError = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: data.error
      }));

      // Add error notification
      addNotification('error', `Connection error: ${data.error}`, {
        projectId: data.projectId
      });
    };

    const handleNotificationSent = (data) => {
      addNotification('success', `Ticket notification sent successfully`, {
        projectId: data.projectId,
        ticketId: data.ticketId
      });
    };

    const handleNotificationFailed = (data) => {
      addNotification('error', `Failed to send ticket notification: ${data.error}`, {
        projectId: data.projectId,
        ticketId: data.ticketId
      });
    };

    // Register event listeners
    projectNotificationService.on(projectId, 'connect', handleConnect);
    projectNotificationService.on(projectId, 'disconnect', handleDisconnect);
    projectNotificationService.on(projectId, 'error', handleError);
    projectNotificationService.on(projectId, 'notification_sent', handleNotificationSent);
    projectNotificationService.on(projectId, 'notification_failed', handleNotificationFailed);

    // Get initial connection state
    const status = projectNotificationService.getProjectStatus(projectId);
    setConnectionState(prev => ({
      ...prev,
      connected: status.connected,
      connecting: status.connecting,
      reconnectAttempts: status.reconnectAttempts
    }));

    // Cleanup on unmount
    return () => {
      projectNotificationService.off(projectId, 'connect', handleConnect);
      projectNotificationService.off(projectId, 'disconnect', handleDisconnect);
      projectNotificationService.off(projectId, 'error', handleError);
      projectNotificationService.off(projectId, 'notification_sent', handleNotificationSent);
      projectNotificationService.off(projectId, 'notification_failed', handleNotificationFailed);
    };
  }, [projectId]);

  // Helper function to add notifications
  const addNotification = useCallback((type, message, data = {}) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.slice(0, maxNotificationHistory);
    });
  }, []);

  // Connect to project
  const connect = useCallback(async (customConfig = null) => {
    if (!projectId) {
      throw new Error('No project ID provided');
    }

    const connectionConfig = customConfig || configRef.current;
    if (!connectionConfig || !connectionConfig.enabled) {
      throw new Error('Project notifications not enabled');
    }

    if (!connectionConfig.port) {
      throw new Error('No port configured for project notifications');
    }

    try {
      setConnectionState(prev => ({ ...prev, connecting: true, error: null }));

      await projectNotificationService.connectToProject(projectId, {
        host: connectionConfig.host || 'localhost',
        port: parseInt(connectionConfig.port)
      });

      return true;
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        connecting: false,
        error: error.message
      }));
      throw error;
    }
  }, [projectId]);

  // Disconnect from project
  const disconnect = useCallback(() => {
    if (!projectId) return;

    projectNotificationService.disconnectFromProject(projectId);
  }, [projectId]);

  // Send ticket notification
  const sendTicketNotification = useCallback(async (ticketData) => {
    if (!projectId) {
      throw new Error('No project ID provided');
    }

    if (!connectionState.connected) {
      // Try to connect first if auto-connect is enabled
      if (configRef.current?.enabled && configRef.current?.port) {
        try {
          await connect();
        } catch (error) {
          throw new Error(`Not connected to project and auto-connect failed: ${error.message}`);
        }
      } else {
        throw new Error('Not connected to project development server');
      }
    }

    try {
      await projectNotificationService.sendTicketNotification(projectId, ticketData);
      return true;
    } catch (error) {
      console.error('Failed to send ticket notification:', error);
      throw error;
    }
  }, [projectId, connectionState.connected, connect]);

  // Test connection
  const testConnection = useCallback(async (testConfig = null) => {
    const connectionConfig = testConfig || configRef.current;
    if (!connectionConfig?.port) {
      throw new Error('No port configured for testing');
    }

    try {
      const isConnectable = await projectNotificationService.testConnection(
        connectionConfig.host || 'localhost',
        parseInt(connectionConfig.port),
        5000
      );

      return isConnectable;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }, []);

  // Discover available ports
  const discoverPorts = useCallback(async (host = 'localhost') => {
    if (!projectId) {
      throw new Error('No project ID provided');
    }

    try {
      const result = await projectNotificationService.discoverProjectPort(projectId, host);
      return result;
    } catch (error) {
      console.error('Port discovery failed:', error);
      throw error;
    }
  }, [projectId]);

  // Auto-connect if configuration is available and enabled
  useEffect(() => {
    if (!projectId || !config?.enabled || !config?.port || connectionState.connected) {
      return;
    }

    // Only auto-connect if auto-discover is enabled or manual config is set
    if (config.autoDiscover || config.port) {
      const autoConnect = async () => {
        try {
          await connect();
        } catch (error) {
          console.warn('Auto-connect failed:', error.message);
        }
      };

      // Delay auto-connect to avoid immediate connection attempts
      const timer = setTimeout(autoConnect, 1000);
      return () => clearTimeout(timer);
    }
  }, [projectId, config, connectionState.connected, connect]);

  // Get connection status
  const getStatus = useCallback(() => {
    const serviceStatus = projectId ? projectNotificationService.getProjectStatus(projectId) : null;

    return {
      ...connectionState,
      serviceStatus,
      config,
      hasValidConfig: !!(config?.enabled && config?.port)
    };
  }, [projectId, connectionState, config]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  return {
    // State
    connectionState,
    notifications,
    config,

    // Connection methods
    connect,
    disconnect,
    testConnection,
    discoverPorts,

    // Notification methods
    sendTicketNotification,

    // Configuration methods
    saveConfiguration,

    // Status methods
    getStatus,

    // Notification management
    clearNotifications,
    removeNotification,

    // Computed state
    isConnected: connectionState.connected,
    isConnecting: connectionState.connecting,
    hasError: !!connectionState.error,
    isConfigured: !!(config?.enabled && config?.port)
  };
};

export default useProjectNotification;