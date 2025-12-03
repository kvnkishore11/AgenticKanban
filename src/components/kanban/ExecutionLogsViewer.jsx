/**
 * @fileoverview Execution Logs Viewer Component
 *
 * Displays execution.log content from the ISO stage folders.
 * Shows stage orchestration logs with timestamps and log levels.
 * Features:
 * - Intelligently collapses large JSON objects into expandable blocks
 * - Renders markdown content for better readability
 *
 * @module components/kanban/ExecutionLogsViewer
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Check if a log message looks like part of a JSON structure
 */
const isJsonLine = (message) => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();

  return (
    trimmed.startsWith('{') ||
    trimmed.startsWith('}') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith(']') ||
    /^"[^"]+"\s*:\s*/.test(trimmed) ||
    /^\},?\s*$/.test(trimmed) ||
    /^\],?\s*$/.test(trimmed)
  );
};

/**
 * Check if message contains markdown that should be rendered
 */
const hasMarkdown = (message) => {
  if (!message || typeof message !== 'string') return false;
  // Check for common markdown patterns
  return /(\*\*|__|`|#{1,3}\s|^\s*[-*]\s|\[.*\]\(.*\))/.test(message);
};

/**
 * Detect JSON block type from content
 */
const detectJsonBlockType = (lines) => {
  const content = lines.join(' ').toLowerCase();

  if (content.includes('workflow_status') || content.includes('workflow_progress')) {
    return { type: 'state', label: 'State Update', icon: '📊' };
  }
  if (content.includes('outputs') && content.includes('logs_path')) {
    return { type: 'outputs', label: 'Output Config', icon: '📦' };
  }
  if (content.includes('error') || content.includes('failed')) {
    return { type: 'error', label: 'Error Details', icon: '❌' };
  }
  return { type: 'json', label: 'JSON Data', icon: '📋' };
};

/**
 * Extract a meaningful summary from JSON lines
 */
const extractJsonSummary = (lines) => {
  const summaryParts = [];

  for (const line of lines) {
    const statusMatch = line.match(/"workflow_status"\s*:\s*"([^"]+)"/);
    if (statusMatch) summaryParts.push(`status: ${statusMatch[1]}`);

    const stepMatch = line.match(/"workflow_step"\s*:\s*"([^"]+)"/);
    if (stepMatch) summaryParts.push(`step: ${stepMatch[1]}`);

    const progressMatch = line.match(/"workflow_progress"\s*:\s*(\d+)/);
    if (progressMatch) summaryParts.push(`${progressMatch[1]}%`);

    const stageMatch = line.match(/"stage"\s*:\s*"([^"]+)"/);
    if (stageMatch) summaryParts.push(`stage: ${stageMatch[1]}`);
  }

  return summaryParts.length > 0 ? summaryParts.slice(0, 3).join(' | ') : null;
};

/**
 * Group logs by detecting consecutive JSON lines
 */
const groupLogs = (logs) => {
  const groups = [];
  let currentJsonGroup = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const isJson = isJsonLine(log.message);

    if (isJson) {
      if (!currentJsonGroup) {
        currentJsonGroup = {
          type: 'json',
          startIndex: i,
          logs: [log],
          messages: [log.message]
        };
      } else {
        currentJsonGroup.logs.push(log);
        currentJsonGroup.messages.push(log.message);
      }
    } else {
      if (currentJsonGroup) {
        if (currentJsonGroup.logs.length >= 3) {
          const blockInfo = detectJsonBlockType(currentJsonGroup.messages);
          const summary = extractJsonSummary(currentJsonGroup.messages);
          groups.push({ ...currentJsonGroup, blockInfo, summary });
        } else {
          currentJsonGroup.logs.forEach(l => groups.push({ type: 'log', log: l }));
        }
        currentJsonGroup = null;
      }
      groups.push({ type: 'log', log });
    }
  }

  if (currentJsonGroup) {
    if (currentJsonGroup.logs.length >= 3) {
      const blockInfo = detectJsonBlockType(currentJsonGroup.messages);
      const summary = extractJsonSummary(currentJsonGroup.messages);
      groups.push({ ...currentJsonGroup, blockInfo, summary });
    } else {
      currentJsonGroup.logs.forEach(l => groups.push({ type: 'log', log: l }));
    }
  }

  return groups;
};

/**
 * Collapsible JSON Block Component
 */
const JsonBlock = ({ group, getLevelClass }) => {
  const [expanded, setExpanded] = useState(false);
  const { blockInfo, logs, summary } = group;

  return (
    <div className="execution-log-json-block">
      <button
        type="button"
        className="execution-log-json-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="execution-log-json-toggle">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="execution-log-json-icon">{blockInfo.icon}</span>
        <span className="execution-log-json-label">{blockInfo.label}</span>
        <span className="execution-log-json-count">({logs.length} lines)</span>
        {summary && <span className="execution-log-json-summary">{summary}</span>}
      </button>

      {expanded && (
        <div className="execution-log-json-content">
          {logs.map((log, index) => (
            <div key={index} className="execution-log-entry-nested">
              <span className={`execution-log-level ${getLevelClass(log.level)}`}>
                {log.level || 'INFO'}
              </span>
              <span className="execution-log-message">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

JsonBlock.propTypes = {
  group: PropTypes.object.isRequired,
  getLevelClass: PropTypes.func.isRequired
};

/**
 * Log Message Component - renders markdown if present
 */
const LogMessage = ({ message }) => {
  if (hasMarkdown(message)) {
    return (
      <span className="execution-log-message execution-log-message-markdown">
        <ReactMarkdown>{message}</ReactMarkdown>
      </span>
    );
  }
  return <span className="execution-log-message">{message}</span>;
};

LogMessage.propTypes = {
  message: PropTypes.string
};

const ExecutionLogsViewer = ({
  adwId,
  stage,
  autoScroll = true,
  maxHeight = '100%',
  onLogCountChange
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stageFolder, setStageFolder] = useState(null);
  const logsContainerRef = useRef(null);

  const groupedLogs = useMemo(() => groupLogs(logs), [logs]);

  useEffect(() => {
    if (!adwId || !stage) {
      setLogs([]);
      return;
    }

    const fetchLogs = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      setError(null);

      try {
        const wsPort = window.APP_CONFIG?.WS_PORT || import.meta.env.VITE_ADW_PORT || 8500;
        const response = await fetch(
          `http://localhost:${wsPort}/api/execution-logs/${adwId}/${stage}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }

        const data = await response.json();
        setLogs(data.logs || []);
        setStageFolder(data.stage_folder);

        if (onLogCountChange) {
          onLogCountChange(data.logs?.length || 0);
        }

        if (data.error) setError(data.error);
      } catch (err) {
        console.error('Error fetching execution logs:', err);
        setError(err.message);
        if (isInitial) setLogs([]);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchLogs(true);
    const pollInterval = setInterval(() => fetchLogs(false), 2000);
    return () => clearInterval(pollInterval);
  }, [adwId, stage, onLogCountChange]);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR': return 'log-level-error';
      case 'WARNING': return 'log-level-warning';
      case 'DEBUG': return 'log-level-debug';
      default: return 'log-level-info';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const parts = timestamp.split(' ');
    return parts.length > 1 ? parts[1] : timestamp;
  };

  if (loading) {
    return (
      <div className="execution-logs-loading">
        <div className="execution-logs-spinner"></div>
        <div className="execution-logs-loading-text">Loading execution logs...</div>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="execution-logs-empty">
        <div className="execution-logs-empty-icon">📭</div>
        <div className="execution-logs-empty-text">No Execution Logs</div>
        <div className="execution-logs-empty-subtext">{error}</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="execution-logs-empty">
        <div className="execution-logs-empty-icon">📭</div>
        <div className="execution-logs-empty-text">No Execution Logs</div>
        <div className="execution-logs-empty-subtext">
          Logs will appear when the {stage?.toUpperCase()} stage runs
        </div>
      </div>
    );
  }

  return (
    <div className="execution-logs-viewer" style={{ maxHeight }}>
      {stageFolder && (
        <div className="execution-logs-folder-badge">{stageFolder}</div>
      )}
      <div ref={logsContainerRef} className="execution-logs-container">
        {groupedLogs.map((group, index) => {
          if (group.type === 'json') {
            return <JsonBlock key={`json-${index}`} group={group} getLevelClass={getLevelClass} />;
          }

          const log = group.log;
          return (
            <div key={index} className={`execution-log-entry ${getLevelClass(log.level)}`}>
              <span className="execution-log-timestamp">{formatTimestamp(log.timestamp)}</span>
              <span className={`execution-log-level ${getLevelClass(log.level)}`}>
                {log.level || 'INFO'}
              </span>
              <LogMessage message={log.message} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

ExecutionLogsViewer.propTypes = {
  /** ADW identifier for the workflow */
  adwId: PropTypes.string,
  /** Stage name (plan, build, test, review, document) */
  stage: PropTypes.string,
  /** Whether to auto-scroll to bottom on new logs */
  autoScroll: PropTypes.bool,
  /** Maximum height for the logs container */
  maxHeight: PropTypes.string,
  /** Callback when log count changes */
  onLogCountChange: PropTypes.func
};

export default ExecutionLogsViewer;
