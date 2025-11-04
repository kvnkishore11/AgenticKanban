import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  CheckCircle,
  AlertCircle,
  User,
  Cpu,
  Settings,
  Terminal
} from 'lucide-react';

/**
 * DetailedLogEntry Component
 * Displays a single detailed log entry with collapsible sections
 * for tool calls, metadata, and raw JSON
 */
const DetailedLogEntry = ({ log, showTimestamps = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get icon based on entry type
  const getEntryTypeIcon = (type) => {
    switch (type) {
      case 'system':
        return <Settings className="h-3.5 w-3.5" />;
      case 'assistant':
        return <Cpu className="h-3.5 w-3.5" />;
      case 'user':
        return <User className="h-3.5 w-3.5" />;
      case 'result':
        return <CheckCircle className="h-3.5 w-3.5" />;
      default:
        return <Terminal className="h-3.5 w-3.5" />;
    }
  };

  // Get color based on entry type
  const getEntryTypeColor = (type) => {
    switch (type) {
      case 'system':
        return 'bg-purple-50 border-purple-300 text-purple-700';
      case 'assistant':
        return 'bg-blue-50 border-blue-300 text-blue-700';
      case 'user':
        return 'bg-green-50 border-green-300 text-green-700';
      case 'result':
        return 'bg-amber-50 border-amber-300 text-amber-700';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-700';
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

  // Copy to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format tool input for display
  const formatToolInput = (input) => {
    return JSON.stringify(input, null, 2);
  };

  return (
    <div className="detailed-log-entry border-l-4 border-gray-200 hover:border-blue-400 transition-colors">
      {/* Main Entry Header */}
      <div
        className="p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-2">
          {/* Expand/Collapse Icon */}
          <button
            className="mt-0.5 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Entry Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              {/* Entry Type Badge */}
              {log.entry_type && (
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded border ${getEntryTypeColor(log.entry_type)}`}>
                  {getEntryTypeIcon(log.entry_type)}
                  <span className="uppercase">{log.entry_type}</span>
                </span>
              )}

              {/* Subtype Badge */}
              {log.subtype && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded border border-gray-300">
                  {log.subtype}
                </span>
              )}

              {/* Tool Name Badge */}
              {log.tool_name && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded border border-indigo-300">
                  <Code className="h-3 w-3" />
                  <span>{log.tool_name}</span>
                </span>
              )}

              {/* Timestamp */}
              {showTimestamps && log.timestamp && (
                <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
              )}
            </div>

            {/* Message */}
            <div className="text-sm text-gray-800 break-words">
              {log.message}
            </div>

            {/* Session ID and Model */}
            {(log.session_id || log.model) && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {log.session_id && (
                  <span className="font-mono">
                    Session: {log.session_id.substring(0, 8)}...
                  </span>
                )}
                {log.model && (
                  <span>
                    Model: {log.model}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-3">
          {/* Tool Input */}
          {log.tool_input && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1 flex items-center space-x-1">
                <Code className="h-3 w-3" />
                <span>Tool Input</span>
              </h4>
              <div className="bg-white border border-gray-200 rounded p-2 text-xs font-mono overflow-auto max-h-48">
                <pre className="text-gray-800 whitespace-pre-wrap break-words">
                  {formatToolInput(log.tool_input)}
                </pre>
              </div>
            </div>
          )}

          {/* Usage Statistics */}
          {log.usage && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Token Usage</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {log.usage.input_tokens !== undefined && (
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Input:</span>{' '}
                    <span className="font-semibold">{log.usage.input_tokens.toLocaleString()}</span>
                  </div>
                )}
                {log.usage.output_tokens !== undefined && (
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Output:</span>{' '}
                    <span className="font-semibold">{log.usage.output_tokens.toLocaleString()}</span>
                  </div>
                )}
                {log.usage.cache_read_input_tokens !== undefined && (
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Cache Read:</span>{' '}
                    <span className="font-semibold text-green-600">{log.usage.cache_read_input_tokens.toLocaleString()}</span>
                  </div>
                )}
                {log.usage.cache_creation_input_tokens !== undefined && (
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Cache Creation:</span>{' '}
                    <span className="font-semibold text-blue-600">{log.usage.cache_creation_input_tokens.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          <div className="flex flex-wrap gap-2 text-xs">
            {log.stop_reason && (
              <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                Stop Reason: <span className="font-semibold">{log.stop_reason}</span>
              </span>
            )}
            {log.current_step && (
              <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                Step: <span className="font-semibold">{log.current_step}</span>
              </span>
            )}
          </div>

          {/* Raw Data Toggle */}
          <div>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              {showRawData ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Hide Raw JSON</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>Show Raw JSON</span>
                </>
              )}
            </button>

            {showRawData && log.raw_data && (
              <div className="mt-2 relative">
                <button
                  onClick={() => handleCopy(JSON.stringify(log.raw_data, null, 2))}
                  className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono overflow-auto max-h-64">
                  <pre className="text-green-400 whitespace-pre-wrap break-words">
                    {JSON.stringify(log.raw_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedLogEntry;
