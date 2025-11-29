import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Brain,
  Wrench,
  FileEdit,
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

/**
 * AgentLogEntry - Specialized component for rendering agent-specific log entries.
 *
 * Handles different event types:
 * - thinking_block: Agent's internal reasoning
 * - tool_use_pre: Pre-tool execution with input parameters
 * - tool_use_post: Post-tool execution with output and duration
 * - file_changed: File operations with diff preview
 * - text_block: Agent text responses
 *
 * Features:
 * - Expandable content for detailed information
 * - Syntax highlighting for code/JSON
 * - Icons and color coding by event type
 * - Duration display for tool executions
 */
const AgentLogEntry = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine event type
  const getEventType = () => {
    if (log.event_type) return log.event_type;
    if (log.type) return log.type;
    // Fallback: detect from log structure
    if (log.content && log.reasoning_type) return 'thinking_block';
    if (log.tool_name && log.tool_input) return 'tool_use_pre';
    if (log.tool_name && log.output) return 'tool_use_post';
    if (log.file_path && log.operation) return 'file_changed';
    if (log.content) return 'text_block';
    return 'agent_log';
  };

  const eventType = getEventType();

  // Icon mapping
  const getIcon = () => {
    switch (eventType) {
      case 'thinking_block':
        return <Brain className="w-4 h-4" />;
      case 'tool_use_pre':
      case 'tool_use_post':
        return <Wrench className="w-4 h-4" />;
      case 'file_changed':
        return <FileEdit className="w-4 h-4" />;
      case 'text_block':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Color coding
  const getColor = () => {
    const level = log.level?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'SUCCESS':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DEBUG':
        return 'text-gray-500 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Event-specific color override
  const getEventColor = () => {
    switch (eventType) {
      case 'thinking_block':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'tool_use_pre':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'tool_use_post':
        const status = log.status || 'success';
        return status === 'error'
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-green-600 bg-green-50 border-green-200';
      case 'file_changed':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'text_block':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return getColor();
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return timestamp;
    }
  };

  // Format duration
  const formatDuration = (durationMs) => {
    if (!durationMs) return '';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  // Render content based on event type
  const renderContent = () => {
    switch (eventType) {
      case 'thinking_block':
        return renderThinkingBlock();
      case 'tool_use_pre':
        return renderToolUsePre();
      case 'tool_use_post':
        return renderToolUsePost();
      case 'file_changed':
        return renderFileChanged();
      case 'text_block':
        return renderTextBlock();
      default:
        return renderGenericLog();
    }
  };

  const renderThinkingBlock = () => (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">Thinking</span>
        {log.reasoning_type && (
          <span className="text-xs px-2 py-0.5 bg-white rounded">
            {log.reasoning_type}
          </span>
        )}
        {log.duration_ms && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(log.duration_ms)}
          </span>
        )}
      </div>
      {isExpanded && log.content && (
        <div className="mt-2 p-3 bg-white rounded text-sm font-mono whitespace-pre-wrap border border-gray-200">
          {log.content}
        </div>
      )}
    </div>
  );

  const renderToolUsePre = () => (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">Calling tool:</span>
        <code className="text-sm px-2 py-0.5 bg-white rounded">{log.tool_name}</code>
      </div>
      {isExpanded && log.tool_input && (
        <div className="mt-2">
          <div className="text-xs text-gray-600 mb-1">Input parameters:</div>
          <pre className="p-3 bg-white rounded text-xs font-mono overflow-x-auto border border-gray-200">
            {JSON.stringify(log.tool_input || log.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  const renderToolUsePost = () => {
    const status = log.status || (log.error ? 'error' : 'success');
    const isSuccess = status === 'success';

    return (
      <div>
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className="font-medium">Tool completed:</span>
          <code className="text-sm px-2 py-0.5 bg-white rounded">{log.tool_name}</code>
          {log.duration_ms && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(log.duration_ms)}
            </span>
          )}
        </div>
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {log.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <div className="font-medium mb-1">Error:</div>
                {log.error}
              </div>
            )}
            {log.output && (
              <div>
                <div className="text-xs text-gray-600 mb-1">Output:</div>
                <div className="p-3 bg-white rounded text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-200">
                  {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFileChanged = () => (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{log.operation || 'modified'}:</span>
        <code className="text-sm px-2 py-0.5 bg-white rounded">{log.file_path}</code>
        {(log.lines_added > 0 || log.lines_removed > 0) && (
          <span className="text-xs text-gray-500">
            +{log.lines_added || 0} -{log.lines_removed || 0}
          </span>
        )}
      </div>
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {log.summary && (
            <div className="text-sm text-gray-700">{log.summary}</div>
          )}
          {log.diff && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Diff:</div>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                {log.diff}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderTextBlock = () => (
    <div>
      <div className="font-medium">Agent response</div>
      {isExpanded && log.content && (
        <div className="mt-2 p-3 bg-white rounded text-sm whitespace-pre-wrap border border-gray-200">
          {log.content}
        </div>
      )}
    </div>
  );

  const renderGenericLog = () => (
    <div>
      <div className="text-sm">
        {log.message || log.content || 'Agent log'}
      </div>
    </div>
  );

  // Determine if entry is expandable
  const isExpandable = () => {
    switch (eventType) {
      case 'thinking_block':
        return !!log.content;
      case 'tool_use_pre':
        return !!(log.tool_input || log.input);
      case 'tool_use_post':
        return !!(log.output || log.error);
      case 'file_changed':
        return !!(log.diff || log.summary);
      case 'text_block':
        return !!log.content;
      default:
        return false;
    }
  };

  const expandable = isExpandable();

  return (
    <div className={`border rounded-lg p-3 ${getEventColor()}`}>
      <div
        className={`flex items-start gap-2 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-grow min-w-0">
          {renderContent()}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {log.timestamp && (
            <span className="text-xs text-gray-500">
              {formatTimestamp(log.timestamp)}
            </span>
          )}
          {expandable && (
            <button
              className="p-1 hover:bg-white/50 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

AgentLogEntry.propTypes = {
  log: PropTypes.shape({
    // Common fields
    timestamp: PropTypes.string,
    level: PropTypes.string,
    message: PropTypes.string,
    content: PropTypes.string,
    event_type: PropTypes.string,
    type: PropTypes.string,
    adw_id: PropTypes.string,

    // thinking_block specific
    reasoning_type: PropTypes.string,
    duration_ms: PropTypes.number,

    // tool_use_pre/post specific
    tool_name: PropTypes.string,
    tool_input: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    input: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    output: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    status: PropTypes.string,
    error: PropTypes.string,
    tool_use_id: PropTypes.string,

    // file_changed specific
    file_path: PropTypes.string,
    operation: PropTypes.string,
    diff: PropTypes.string,
    summary: PropTypes.string,
    lines_added: PropTypes.number,
    lines_removed: PropTypes.number,

    // Sequence
    sequence: PropTypes.number
  }).isRequired
};

export default AgentLogEntry;
