import { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Settings,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Save,
  RotateCcw
} from 'lucide-react';
import projectNotificationService from '../../services/storage/projectNotificationService';

const ProjectPortConfiguration = ({
  project,
  onConfigurationChange,
  onConnectionStatusChange,
  initialConfig = null,
  showAdvanced = false
}) => {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '',
    autoDiscover: true,
    enabled: true,
    ...initialConfig
  });

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [discoveredPorts, setDiscoveredPorts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const commonPorts = projectNotificationService.commonPorts;

  // Watch for configuration changes
  useEffect(() => {
    const hasConfigChanges = initialConfig && (
      config.host !== initialConfig.host ||
      config.port !== initialConfig.port ||
      config.autoDiscover !== initialConfig.autoDiscover ||
      config.enabled !== initialConfig.enabled
    );
    setHasChanges(hasConfigChanges);
  }, [config, initialConfig]);

  // Set up project notification service listeners
  useEffect(() => {
    if (!project?.id) return;

    const handleConnect = () => {
      setConnectionStatus('connected');
      setLastError(null);
      onConnectionStatusChange?.('connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      onConnectionStatusChange?.('disconnected');
    };

    const handleError = ({ error }) => {
      setConnectionStatus('error');
      setLastError(error);
      onConnectionStatusChange?.('error', error);
    };

    projectNotificationService.on(project.id, 'connect', handleConnect);
    projectNotificationService.on(project.id, 'disconnect', handleDisconnect);
    projectNotificationService.on(project.id, 'error', handleError);

    // Get initial status
    const status = projectNotificationService.getProjectStatus(project.id);
    setConnectionStatus(status.connected ? 'connected' : 'disconnected');

    return () => {
      projectNotificationService.off(project.id, 'connect', handleConnect);
      projectNotificationService.off(project.id, 'disconnect', handleDisconnect);
      projectNotificationService.off(project.id, 'error', handleError);
    };
  }, [project?.id, onConnectionStatusChange]);

  const handleConfigChange = (updates) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigurationChange?.(newConfig);
  };

  const discoverPorts = async () => {
    if (!project) return;

    setIsDiscovering(true);
    setDiscoveredPorts([]);
    setLastError(null);

    try {
      console.log(`Starting port discovery for project ${project.name}`);
      const activePorts = [];

      for (const port of commonPorts) {
        try {
          const isActive = await projectNotificationService.testConnection(config.host, port, 2000);
          if (isActive) {
            activePorts.push(port);
            console.log(`Found active service on port ${port}`);
          }
        } catch {
          // Continue checking other ports
          continue;
        }
      }

      setDiscoveredPorts(activePorts);

      if (activePorts.length > 0) {
        // Auto-select the first discovered port if auto-discover is enabled
        if (config.autoDiscover) {
          handleConfigChange({ port: activePorts[0].toString() });
        }
      } else {
        setLastError('No active development servers found on common ports');
      }

    } catch (error) {
      setLastError(`Port discovery failed: ${error.message}`);
      console.error('Port discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const testConnection = async () => {
    if (!project || !config.port) return;

    setIsTesting(true);
    setLastError(null);

    try {
      const isConnectable = await projectNotificationService.testConnection(
        config.host,
        parseInt(config.port),
        5000
      );

      if (isConnectable) {
        setConnectionStatus('test_success');
        setTimeout(() => setConnectionStatus('disconnected'), 3000);
      } else {
        setLastError(`Unable to connect to ${config.host}:${config.port}`);
        setConnectionStatus('test_failed');
        setTimeout(() => setConnectionStatus('disconnected'), 3000);
      }

    } catch (error) {
      setLastError(`Connection test failed: ${error.message}`);
      setConnectionStatus('test_failed');
      setTimeout(() => setConnectionStatus('disconnected'), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  const connectToProject = async () => {
    if (!project || !config.port) return;

    try {
      setLastError(null);
      await projectNotificationService.connectToProject(project.id, {
        host: config.host,
        port: parseInt(config.port)
      });
    } catch (error) {
      setLastError(`Connection failed: ${error.message}`);
      console.error('Connection error:', error);
    }
  };

  const disconnectFromProject = () => {
    if (!project) return;
    projectNotificationService.disconnectFromProject(project.id);
  };

  const resetConfiguration = () => {
    const defaultConfig = {
      host: 'localhost',
      port: '',
      autoDiscover: true,
      enabled: true
    };
    setConfig(defaultConfig);
    setLastError(null);
    setDiscoveredPorts([]);
    onConfigurationChange?.(defaultConfig);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'test_success': return 'text-green-600 bg-green-50 border-green-200';
      case 'test_failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'test_success': return <CheckCircle className="h-4 w-4" />;
      case 'test_failed': return <XCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'test_success': return 'Test Successful';
      case 'test_failed': return 'Test Failed';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Project Notification Settings
            </h3>
            {project && (
              <p className="text-sm text-gray-600">{project.name}</p>
            )}
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Enable project notifications
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Send ticket notifications to this project's development server
        </p>
      </div>

      {config.enabled && (
        <div className="space-y-6">
          {/* Auto-Discovery */}
          <div>
            <label className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                checked={config.autoDiscover}
                onChange={(e) => handleConfigChange({ autoDiscover: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-discover development server port
              </span>
            </label>

            {config.autoDiscover && (
              <div className="ml-6 space-y-3">
                <button
                  onClick={discoverPorts}
                  disabled={isDiscovering}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {isDiscovering ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>
                    {isDiscovering ? 'Discovering...' : 'Discover Ports'}
                  </span>
                </button>

                {discoveredPorts.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Found {discoveredPorts.length} active server(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {discoveredPorts.map((port) => (
                        <button
                          key={port}
                          onClick={() => handleConfigChange({ port: port.toString() })}
                          className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                            config.port === port.toString()
                              ? 'bg-blue-100 border-blue-300 text-blue-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          :{port}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">
              {config.autoDiscover ? 'Manual Override' : 'Server Configuration'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host */}
              {showAdvanced && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => handleConfigChange({ host: e.target.value })}
                    placeholder="localhost"
                    className="input-field"
                  />
                </div>
              )}

              {/* Port */}
              <div className={showAdvanced ? '' : 'md:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  value={config.port}
                  onChange={(e) => handleConfigChange({ port: e.target.value })}
                  placeholder="3000"
                  min="1"
                  max="65535"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Common ports: {commonPorts.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={testConnection}
                disabled={!config.port || isTesting}
                className="btn-secondary flex items-center space-x-2"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </span>
              </button>

              {connectionStatus === 'connected' ? (
                <button
                  onClick={disconnectFromProject}
                  className="btn-secondary text-red-600 hover:text-red-700"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectToProject}
                  disabled={!config.port || connectionStatus === 'connecting'}
                  className="btn-primary"
                >
                  Connect
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {hasChanges && (
                <span className="text-xs text-amber-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Unsaved changes</span>
                </span>
              )}

              <button
                onClick={resetConfiguration}
                className="btn-secondary flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-sm text-red-700">{lastError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Auto-discovery scans common development ports ({commonPorts.slice(0, 4).join(', ')}, etc.)</li>
                  <li>• Notifications are sent as WebSocket messages to your running development server</li>
                  <li>• Your project can receive real-time updates about new tickets and task changes</li>
                  <li>• Connection is automatically maintained with health checks and reconnection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPortConfiguration;