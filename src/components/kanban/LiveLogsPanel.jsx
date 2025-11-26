/**
 * @fileoverview Live Logs Panel Component
 *
 * Displays real-time log streaming from WebSocket connections with filtering,
 * search, auto-scroll, and connection status features.
 *
 * @module components/kanban/LiveLogsPanel
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import {
  Search,
  Filter,
  Trash2,
  ArrowDown,
  Circle,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Wifi,
  WifiOff,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const LOG_LEVELS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'DEBUG', 'SUCCESS'];

const LiveLogsPanel = ({ taskId, maxHeight = '500px', autoScrollDefault = true }) => {
  const { getWorkflowLogsForTask, clearWorkflowLogsForTask, getWebSocketStatus } = useKanbanStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const logsContainerRef = useRef(null);
  const bottomRef = useRef(null);

  // Get logs from store
  const allLogs = getWorkflowLogsForTask(taskId) || [];
  const websocketStatus = getWebSocketStatus();

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let logs = [...allLogs];

    // Apply level filter
    if (levelFilter !== 'ALL') {
      logs = logs.filter(log => {
        const logLevel = (log.level || 'INFO').toUpperCase();
        return logLevel === levelFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => {
        const message = (log.message || '').toLowerCase();
        const currentStep = (log.current_step || '').toLowerCase();
        const toolName = (log.tool_name || '').toLowerCase();
        return message.includes(query) || currentStep.includes(query) || toolName.includes(query);
      });
    }

    return logs;
  }, [allLogs, levelFilter, searchQuery]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, autoScroll]);

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      clearWorkflowLogsForTask(taskId);
    }
  };

  const handleJumpToLatest = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    // Relative time for recent logs
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    // Absolute time for older logs
    return date.toLocaleTimeString();
  };

  const getLogLevelIcon = (level) => {
    const levelUpper = (level || 'INFO').toUpperCase();
    switch (levelUpper) {
      case 'ERROR':
        return '❌';
      case 'WARNING':
        return '⚠️';
      case 'SUCCESS':
        return '✅';
      case 'DEBUG':
        return '🔍';
      default:
        return 'ℹ️';
    }
  };

  const getLogLevelClass = (level) => {
    const levelUpper = (level || 'INFO').toUpperCase();
    switch (levelUpper) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'SUCCESS':
        return 'success';
      default:
        return 'info';
    }
  };

  const getLogLevelColor = (level) => {
    const levelUpper = (level || 'INFO').toUpperCase();
    switch (levelUpper) {
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'DEBUG':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const renderLogEntry = (log) => {
    const isExpanded = expandedLogs.has(log.id);
    const levelIcon = getLogLevelIcon(log.level);
    const levelClass = getLogLevelClass(log.level);

    // Determine if log message is long (needs expand/collapse)
    const messageLength = (log.message || '').length;
    const isLongMessage = messageLength > 200;

    return (
      <div key={log.id} className="log-entry">
        {/* Timeline Icon */}
        <div className={`log-entry-icon ${levelClass}`}>
          {levelIcon}
        </div>

        {/* Log Content */}
        <div className="log-entry-content">
          {/* Header: Timestamp, Level Badge, Copy Button */}
          <div className="log-entry-header">
            <div className="log-entry-header-left">
              <span className="log-entry-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className={`log-entry-level ${levelClass}`}>
                {(log.level || 'INFO').toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyToClipboard(log.message || '')}
              className="log-entry-copy-btn"
              title="Copy log message"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Current Step (Title) */}
          {log.current_step && (
            <div className="log-entry-title">
              {log.current_step}
            </div>
          )}

          {/* Message (Description) */}
          <div className="log-entry-description">
            {isLongMessage && !isExpanded ? (
              <div>
                <p className="line-clamp-3">{log.message}</p>
                <button
                  type="button"
                  onClick={() => toggleLogExpansion(log.id)}
                  className="flex items-center text-blue-600 hover:text-blue-800 mt-1 text-xs"
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  <span>Show more</span>
                </button>
              </div>
            ) : (
              <div>
                <p className="whitespace-pre-wrap">{log.message}</p>
                {isLongMessage && (
                  <button
                    type="button"
                    onClick={() => toggleLogExpansion(log.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 mt-1 text-xs"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    <span>Show less</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metadata Badges (Progress, Workflow info) */}
          {(log.progress_percent !== undefined || log.workflow_name) && (
            <div className="log-entry-meta">
              {log.progress_percent !== undefined && (
                <span className="log-entry-progress">{log.progress_percent}%</span>
              )}
              {log.workflow_name && (
                <span className="log-entry-agent">{log.workflow_name}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        {/* Left: Streaming indicator, connection status and log count */}
        <div className="flex items-center space-x-2">
          {/* Streaming Indicator */}
          <div className="flex items-center space-x-1 text-xs text-gray-700">
            <span>📡</span>
            <span className="font-medium">Streaming</span>
          </div>

          {/* Log Count */}
          <span className="text-xs text-gray-600 font-medium">
            {filteredLogs.length} {filteredLogs.length === allLogs.length ? 'entries' : `/ ${allLogs.length} entries`}
          </span>

          {/* Connection Status */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
            websocketStatus.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {websocketStatus.connected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center space-x-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ width: '150px' }}
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center space-x-1 px-2 py-1 border rounded text-xs transition-colors ${
                levelFilter !== 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Filter by level"
            >
              <Filter className="h-3 w-3" />
              <span>{levelFilter}</span>
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[100px]">
                  {LOG_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setLevelFilter(level);
                        setShowFilterMenu(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 ${
                        levelFilter === level ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center space-x-1 px-2 py-1 border rounded text-xs transition-colors ${
              autoScroll
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle auto-scroll"
          >
            <ArrowDown className="h-3 w-3" />
            <span>Auto</span>
          </button>

          {/* Jump to latest */}
          <button
            type="button"
            onClick={handleJumpToLatest}
            className="p-1 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Jump to latest"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          {/* Clear logs */}
          <button
            type="button"
            onClick={handleClearLogs}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear all logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        className="logs-container flex-1"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="empty-logs">
            <div className="empty-logs-icon">📭</div>
            <div className="empty-logs-text">No Logs Available</div>
            <div className="empty-logs-subtext">
              {allLogs.length === 0
                ? 'Waiting for workflow to start...'
                : 'No logs match the current filters'}
            </div>
          </div>
        ) : (
          <>
            {filteredLogs.map(renderLogEntry)}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default LiveLogsPanel;
