/**
 * @fileoverview Application settings modal component
 *
 * Provides interface for managing application settings including current project
 * information and WebSocket connection configuration. Displays connection status,
 * allows users to connect/disconnect, and configure WebSocket server port settings.
 * Integrates with kanban store for WebSocket management.
 *
 * @module components/forms/SettingsModal
 */

import { useState, useEffect, useRef } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { X, Settings, Wifi, WifiOff, Play, Square, RefreshCw, CheckCircle, XCircle, AlertCircle, Folder } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const {
    getCurrentProject,
    getWebSocketStatus,
    initializeWebSocket,
    disconnectWebSocket,
  } = useKanbanStore();

  const modalRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [websocketPort, setWebsocketPort] = useState('3001');
  const [websocketStatus, setWebsocketStatus] = useState(null);

  const currentProject = getCurrentProject();

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Update WebSocket status
  useEffect(() => {
    if (isOpen) {
      const status = getWebSocketStatus();
      setWebsocketStatus(status);
    }
  }, [isOpen, getWebSocketStatus]);

  // Handle WebSocket connection
  const handleWebSocketConnect = async () => {
    setIsConnecting(true);
    try {
      await initializeWebSocket();
      const status = getWebSocketStatus();
      setWebsocketStatus(status);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle WebSocket disconnection
  const handleWebSocketDisconnect = () => {
    disconnectWebSocket();
    const status = getWebSocketStatus();
    setWebsocketStatus(status);
  };

  if (!isOpen) return null;

  // Helper functions for WebSocket status
  const getWebSocketStatusIcon = () => {
    if (isConnecting) {
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    }

    if (websocketStatus?.connected) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }

    if (websocketStatus?.error) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }

    return <WifiOff className="h-5 w-5 text-gray-400" />;
  };

  const getWebSocketStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (websocketStatus?.connected) return 'Connected';
    if (websocketStatus?.error) return 'Connection Error';
    return 'Disconnected';
  };

  const getWebSocketStatusColor = () => {
    if (isConnecting) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (websocketStatus?.connected) return 'text-green-600 bg-green-50 border-green-200';
    if (websocketStatus?.error) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="modal-content bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex="-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Project Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-2">
              <Folder className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Current Project</h3>
            </div>

            {currentProject ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{currentProject.name}</p>
                    <p className="text-sm text-gray-600">{currentProject.path}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                {currentProject.description && (
                  <p className="text-sm text-gray-500 mt-1">{currentProject.description}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No project currently selected</p>
                <p className="text-sm text-gray-400 mt-1">
                  Select a project from the project selector to see it here
                </p>
              </div>
            )}
          </div>

          {/* WebSocket Connection Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Wifi className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">WebSocket Server</h3>
              </div>

              {/* Connection Status Badge */}
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getWebSocketStatusColor()}`}>
                {getWebSocketStatusIcon()}
                <span>{getWebSocketStatusText()}</span>
              </div>
            </div>

            {/* Port Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server Port
                </label>
                <input
                  type="number"
                  value={websocketPort}
                  onChange={(e) => setWebsocketPort(e.target.value)}
                  placeholder="3001"
                  min="1"
                  max="65535"
                  className="input-field max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Port where the WebSocket server is running
                </p>
              </div>

              {/* Connection Controls */}
              <div className="flex items-center space-x-3 pt-2">
                {websocketStatus?.connected ? (
                  <button
                    onClick={handleWebSocketDisconnect}
                    className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <Square className="h-4 w-4" />
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    onClick={handleWebSocketConnect}
                    disabled={isConnecting || !websocketPort}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </span>
                  </button>
                )}
              </div>

              {/* Error Display */}
              {websocketStatus?.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Connection Error</p>
                      <p className="text-sm text-red-700">{websocketStatus.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">WebSocket Connection</p>
                    <p className="text-xs">
                      Connect to the WebSocket server to enable real-time task updates and workflow execution.
                      Make sure the server is running on the specified port.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;