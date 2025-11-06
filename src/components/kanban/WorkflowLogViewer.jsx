import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import DetailedLogEntry from './DetailedLogEntry';

/**
 * WorkflowLogViewer Component
 * Displays real-time workflow logs in a beautified, scrollable format
 * with filtering, auto-scroll, and syntax highlighting capabilities
 *
 * Log Ordering:
 * - Logs are displayed in reverse chronological order (newest first at the top)
 * - This provides better UX as users can see the latest updates immediately
 * - Auto-scroll scrolls to the top when new logs arrive
 * - Exported logs maintain chronological order (oldest first) for offline analysis
 */
const WorkflowLogViewer = ({
  logs = [],
  title = "Workflow Logs",
  maxHeight = "300px",
  onClear,
  showTimestamps = true,
  autoScroll = true,
  logsSource = 'all', // 'all' | 'plan' | 'build' | 'test' | 'review' | 'document'
  detailedView = false // Enable detailed log entry view
}) => {
  // Ensure logs is always an array, even if null/undefined is explicitly passed
  const safeLogs = Array.isArray(logs) ? logs : [];

  const [isExpanded, setIsExpanded] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(autoScroll);
  const logContainerRef = useRef(null);
  const prevLogsLengthRef = useRef(safeLogs.length);

  // Auto-scroll to top when new logs arrive (since logs are displayed in reverse order)
  useEffect(() => {
    if (isAutoScroll && logContainerRef.current && safeLogs.length > prevLogsLengthRef.current) {
      // Scroll to top where new logs appear (reversed order)
      logContainerRef.current.scrollTop = 0;
    }
    prevLogsLengthRef.current = safeLogs.length;
  }, [safeLogs, isAutoScroll]);

  // Get icon for log level
  const getLogLevelIcon = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'SUCCESS':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'INFO':
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  // Get color class for log level
  const getLogLevelColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'INFO':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Filter logs based on level and search query
  // Display logs in reverse chronological order (newest first) as requested by user
  const filteredLogs = safeLogs.filter(log => {
    const levelMatch = filterLevel === 'all' || log.level?.toUpperCase() === filterLevel.toUpperCase();
    const searchMatch = !searchQuery ||
      log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.current_step?.toLowerCase().includes(searchQuery.toLowerCase());
    return levelMatch && searchMatch;
  }).reverse(); // Reverse to show newest logs at the top

  // Export logs (text or JSON format)
  const handleExportLogs = (format = 'text') => {
    let content, mimeType, extension;

    // Export logs in chronological order (oldest first) for better readability
    // even though UI displays them reversed
    const exportLogs = [...filteredLogs].reverse();

    if (format === 'json') {
      // Export as JSON with full structure
      content = JSON.stringify(exportLogs, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      // Export as formatted text
      const logText = exportLogs.map(log => {
        const timestamp = showTimestamps ? `[${formatTimestamp(log.timestamp)}] ` : '';
        const level = log.level ? `[${log.level}] ` : '';
        const step = log.current_step ? `[${log.current_step}] ` : '';
        const type = log.entry_type ? `[${log.entry_type}] ` : '';
        const tool = log.tool_name ? `[Tool: ${log.tool_name}] ` : '';
        return `${timestamp}${type}${level}${step}${tool}${log.message}`;
      }).join('\n');
      content = logText;
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `workflow-logs-${logsSource}-${timestamp}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // State for export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Handle scroll event to detect manual scrolling
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop } = logContainerRef.current;
    // Since logs are reversed, new logs appear at the top
    const isAtTop = scrollTop < 10;

    // Only auto-scroll if user is at the top (where new logs appear)
    setIsAutoScroll(isAtTop);
  };

  // Get logs source badge
  const getLogsSourceBadge = () => {
    if (logsSource === 'all') {
      return (
        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-300">
          Real-time
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full border border-green-300">
        Historical
      </span>
    );
  };

  return (
    <div className="workflow-log-viewer border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse logs' : 'Expand logs'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </span>
          {getLogsSourceBadge()}
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isAutoScroll
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
            title={isAutoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            Auto-scroll
          </button>

          {/* Export logs */}
          {filteredLogs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Export logs"
              >
                <Download className="h-4 w-4 text-gray-600" />
              </button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        handleExportLogs('text');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
                    >
                      Export as Text
                    </button>
                    <button
                      onClick={() => {
                        handleExportLogs('json');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded-b-lg border-t border-gray-100"
                    >
                      Export as JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clear logs */}
          {onClear && safeLogs.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex items-center space-x-2 p-1.5 border-b border-gray-200 bg-gray-50">
            {/* Level Filter */}
            <div className="flex items-center space-x-1">
              <Filter className="h-3 w-3 text-gray-500" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="INFO">Info</option>
                <option value="SUCCESS">Success</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="h-3 w-3 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Log Container */}
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto font-mono text-xs kanban-scroll"
            style={{ maxHeight }}
          >
            {filteredLogs.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                {safeLogs.length === 0 ? 'No logs yet' : 'No logs match the current filter'}
              </div>
            ) : detailedView ? (
              // Detailed view with DetailedLogEntry component
              <div className="divide-y divide-gray-100">
                {filteredLogs.map((log, index) => (
                  <DetailedLogEntry
                    key={log.id || index}
                    log={log}
                    index={index}
                    showTimestamps={showTimestamps}
                  />
                ))}
              </div>
            ) : (
              // Simple view (original)
              <div className="divide-y divide-gray-100">
                {filteredLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className={`p-1.5 hover:bg-gray-50 transition-all duration-150 ease-in-out border-l-2 ${
                      getLogLevelColor(log.level)
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {/* Icon */}
                      <div className="mt-0.5">
                        {getLogLevelIcon(log.level)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          {/* Message */}
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-800 break-words">
                              {log.message}
                            </span>
                          </div>

                          {/* Timestamp */}
                          {showTimestamps && log.timestamp && (
                            <span className="text-gray-400 text-xs ml-2 whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          )}
                        </div>

                        {/* Additional Info */}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {log.current_step && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              Step: {log.current_step}
                            </span>
                          )}
                          {log.progress_percent !== undefined && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              Progress: {log.progress_percent}%
                            </span>
                          )}
                          {log.workflow_name && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {log.workflow_name}
                            </span>
                          )}
                        </div>

                        {/* Error Details */}
                        {log.details && (
                          <div className="mt-1 p-2 bg-gray-100 rounded text-gray-600 text-xs">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkflowLogViewer;
