/**
 * WebSocket Status Indicator Component
 * Provides visual feedback about WebSocket connection status and health
 * Compliant with TAC-7 WebSocket Integration Guide requirements
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Signal,
  Zap,
  AlertCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useKanbanStore } from '../../stores/kanbanStore';

/**
 * Connection status types
 */
const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting'
};

/**
 * Health status types
 */
const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown'
};

/**
 * Display modes for the indicator
 */
const DISPLAY_MODES = {
  COMPACT: 'compact',      // Just icon with tooltip
  NORMAL: 'normal',        // Icon with status text
  DETAILED: 'detailed',    // Full status with metrics
  MINIMAL: 'minimal'       // Tiny dot indicator
};

const WebSocketStatusIndicator = ({
  mode = DISPLAY_MODES.NORMAL,
  showMetrics = false,
  showRetryButton = true,
  className = '',
  onClick = null
}) => {
  const { getWebSocketStatus, initializeWebSocket, disconnectWebSocket } = useKanbanStore();
  const [status, setStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const wsStatus = getWebSocketStatus();
      setStatus(wsStatus);
      setLastUpdate(new Date());
    };

    // Initial update
    updateStatus();

    // Set up periodic updates
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [getWebSocketStatus]);

  if (!status) {
    return null;
  }

  /**
   * Get connection status based on WebSocket state
   */
  const getConnectionStatus = () => {
    if (status.connected) {
      return CONNECTION_STATUS.CONNECTED;
    } else if (status.connecting) {
      return CONNECTION_STATUS.CONNECTING;
    } else if (status.error) {
      return CONNECTION_STATUS.ERROR;
    } else {
      return CONNECTION_STATUS.DISCONNECTED;
    }
  };

  /**
   * Get health status from server status or estimate from connection
   */
  const getHealthStatus = () => {
    const connectionStatus = getConnectionStatus();
    const serverStatus = status.serverStatus;

    // Use server health if available
    if (serverStatus?.status) {
      return serverStatus.status;
    }

    // Estimate based on connection state
    switch (connectionStatus) {
      case CONNECTION_STATUS.CONNECTED:
        return HEALTH_STATUS.HEALTHY;
      case CONNECTION_STATUS.CONNECTING:
        return HEALTH_STATUS.UNKNOWN;
      case CONNECTION_STATUS.ERROR:
        return HEALTH_STATUS.UNHEALTHY;
      default:
        return HEALTH_STATUS.DISCONNECTED;
    }
  };

  /**
   * Get appropriate icon based on status
   */
  const getStatusIcon = () => {
    const connectionStatus = getConnectionStatus();
    const healthStatus = getHealthStatus();

    switch (connectionStatus) {
      case CONNECTION_STATUS.CONNECTED:
        if (healthStatus === HEALTH_STATUS.HEALTHY) {
          return <Wifi className="h-4 w-4 text-green-500" />;
        } else if (healthStatus === HEALTH_STATUS.DEGRADED) {
          return <Signal className="h-4 w-4 text-yellow-500" />;
        } else {
          return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        }

      case CONNECTION_STATUS.CONNECTING:
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;

      case CONNECTION_STATUS.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;

      case CONNECTION_STATUS.DISCONNECTED:
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    const connectionStatus = getConnectionStatus();
    const healthStatus = getHealthStatus();

    switch (connectionStatus) {
      case CONNECTION_STATUS.CONNECTED:
        if (healthStatus === HEALTH_STATUS.HEALTHY) {
          return 'Connected';
        } else if (healthStatus === HEALTH_STATUS.DEGRADED) {
          return 'Connected (Slow)';
        } else {
          return 'Connected (Issues)';
        }

      case CONNECTION_STATUS.CONNECTING:
        return 'Connecting...';

      case CONNECTION_STATUS.ERROR:
        return 'Connection Error';

      case CONNECTION_STATUS.DISCONNECTED:
      default:
        return 'Disconnected';
    }
  };

  /**
   * Get status color classes
   */
  const getStatusColorClasses = () => {
    const connectionStatus = getConnectionStatus();
    const healthStatus = getHealthStatus();

    switch (connectionStatus) {
      case CONNECTION_STATUS.CONNECTED:
        if (healthStatus === HEALTH_STATUS.HEALTHY) {
          return 'bg-green-100 text-green-800 border-green-200';
        } else if (healthStatus === HEALTH_STATUS.DEGRADED) {
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else {
          return 'bg-orange-100 text-orange-800 border-orange-200';
        }

      case CONNECTION_STATUS.CONNECTING:
        return 'bg-blue-100 text-blue-800 border-blue-200';

      case CONNECTION_STATUS.ERROR:
        return 'bg-red-100 text-red-800 border-red-200';

      case CONNECTION_STATUS.DISCONNECTED:
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Handle retry connection
   */
  const handleRetry = async (e) => {
    e.stopPropagation();
    try {
      await initializeWebSocket();
    } catch (error) {
      console.error('Failed to retry WebSocket connection:', error);
    }
  };

  /**
   * Handle disconnect
   */
  const handleDisconnect = (e) => {
    e.stopPropagation();
    disconnectWebSocket();
  };

  /**
   * Toggle expanded view
   */
  const handleToggleExpanded = () => {
    if (onClick) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  /**
   * Format uptime
   */
  const formatUptime = (uptime) => {
    if (!uptime) return 'Unknown';

    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Suppress unused variable warning for formatUptime - it's used in future iterations
  void formatUptime;

  /**
   * Render minimal mode (tiny dot)
   */
  if (mode === DISPLAY_MODES.MINIMAL) {
    const connectionStatus = getConnectionStatus();
    const healthStatus = getHealthStatus();

    let dotColor = 'bg-gray-400';
    if (connectionStatus === CONNECTION_STATUS.CONNECTED) {
      if (healthStatus === HEALTH_STATUS.HEALTHY) {
        dotColor = 'bg-green-500';
      } else if (healthStatus === HEALTH_STATUS.DEGRADED) {
        dotColor = 'bg-yellow-500';
      } else {
        dotColor = 'bg-orange-500';
      }
    } else if (connectionStatus === CONNECTION_STATUS.CONNECTING) {
      dotColor = 'bg-blue-500 animate-pulse';
    } else if (connectionStatus === CONNECTION_STATUS.ERROR) {
      dotColor = 'bg-red-500';
    }

    return (
      <div
        className={`w-2 h-2 rounded-full ${dotColor} ${className}`}
        title={getStatusText()}
      />
    );
  }

  /**
   * Render compact mode (icon with tooltip)
   */
  if (mode === DISPLAY_MODES.COMPACT) {
    return (
      <div
        className={`flex items-center justify-center p-1 rounded cursor-pointer hover:bg-gray-100 ${className}`}
        title={getStatusText()}
        onClick={handleToggleExpanded}
      >
        {getStatusIcon()}
      </div>
    );
  }

  /**
   * Render normal mode (icon with text)
   */
  const normalMode = (
    <div
      className={`flex items-center space-x-2 px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors duration-200 hover:opacity-80 ${getStatusColorClasses()} ${className}`}
      onClick={handleToggleExpanded}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>

      {/* Retry button */}
      {showRetryButton && getConnectionStatus() !== CONNECTION_STATUS.CONNECTED && (
        <button
          onClick={handleRetry}
          className="ml-1 p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
          title="Retry connection"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  if (mode === DISPLAY_MODES.NORMAL && !isExpanded) {
    return normalMode;
  }

  /**
   * Render detailed mode or expanded normal mode
   */
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main status indicator */}
      {normalMode}

      {/* Detailed information */}
      {(mode === DISPLAY_MODES.DETAILED || isExpanded) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">WebSocket Status</h3>
            <div className="flex items-center space-x-2">
              {showRetryButton && getConnectionStatus() !== CONNECTION_STATUS.CONNECTED && (
                <button
                  onClick={handleRetry}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              )}

              {getConnectionStatus() === CONNECTION_STATUS.CONNECTED && (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <WifiOff className="h-3 w-3" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection info */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Connection</div>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Health</div>
              <div className="flex items-center space-x-2">
                {getHealthStatus() === HEALTH_STATUS.HEALTHY && <CheckCircle className="h-4 w-4 text-green-500" />}
                {getHealthStatus() === HEALTH_STATUS.DEGRADED && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {getHealthStatus() === HEALTH_STATUS.UNHEALTHY && <AlertCircle className="h-4 w-4 text-red-500" />}
                {getHealthStatus() === HEALTH_STATUS.UNKNOWN && <Clock className="h-4 w-4 text-gray-500" />}
                <span className="text-sm font-medium capitalize">{getHealthStatus()}</span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          {showMetrics && status.serverStatus && (
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-500 mb-2">Server Metrics</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {status.serverStatus.responseTime && (
                  <div>
                    <span className="text-gray-500">Response Time:</span>
                    <span className="ml-1 font-medium">{status.serverStatus.responseTime}ms</span>
                  </div>
                )}

                {status.serverStatus.activeConnections && (
                  <div>
                    <span className="text-gray-500">Connections:</span>
                    <span className="ml-1 font-medium">{status.serverStatus.activeConnections}</span>
                  </div>
                )}

                {status.serverStatus.load && (
                  <div>
                    <span className="text-gray-500">Server Load:</span>
                    <span className="ml-1 font-medium">{(status.serverStatus.load * 100).toFixed(1)}%</span>
                  </div>
                )}

                {status.serverStatus.memoryUsage && (
                  <div>
                    <span className="text-gray-500">Memory:</span>
                    <span className="ml-1 font-medium">{(status.serverStatus.memoryUsage * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error information */}
          {status.error && (
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-500 mb-2">Last Error</div>
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {status.error}
              </div>
            </div>
          )}

          {/* Connection details */}
          {status.serverStatus?.config && (
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs text-gray-500 mb-2">Connection Details</div>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-500">Host:</span>
                  <span className="ml-1 font-mono">{status.serverStatus.config.host || 'localhost'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Port:</span>
                  <span className="ml-1 font-mono">{status.serverStatus.config.port || 8002}</span>
                </div>
                <div>
                  <span className="text-gray-500">Protocol:</span>
                  <span className="ml-1 font-mono">{status.serverStatus.config.protocol || 'ws'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Last update */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Unknown'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Header WebSocket Status - For use in headers/navbars
 */
export const HeaderWebSocketStatus = ({ showLabel = true }) => {
  return (
    <WebSocketStatusIndicator
      mode={showLabel ? DISPLAY_MODES.NORMAL : DISPLAY_MODES.COMPACT}
      showRetryButton={false}
      className="mr-2"
    />
  );
};

/**
 * Footer WebSocket Status - For use in footers
 */
export const FooterWebSocketStatus = () => {
  return (
    <WebSocketStatusIndicator
      mode={DISPLAY_MODES.DETAILED}
      showMetrics={true}
      showRetryButton={true}
    />
  );
};

/**
 * Minimal WebSocket Status - For use in tight spaces
 */
export const MinimalWebSocketStatus = ({ className = '' }) => {
  return (
    <WebSocketStatusIndicator
      mode={DISPLAY_MODES.MINIMAL}
      className={className}
    />
  );
};

/**
 * WebSocket Status Card - For dedicated status displays
 */
export const WebSocketStatusCard = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">WebSocket Connection</h3>
        <Activity className="h-5 w-5 text-gray-400" />
      </div>

      <WebSocketStatusIndicator
        mode={DISPLAY_MODES.DETAILED}
        showMetrics={true}
        showRetryButton={true}
        className="border-0 p-0"
      />
    </div>
  );
};

export default WebSocketStatusIndicator;