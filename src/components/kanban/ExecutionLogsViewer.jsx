/**
 * @fileoverview Execution Logs Viewer Component
 *
 * Displays execution.log content from the ISO stage folders.
 * Shows stage orchestration logs with timestamps and log levels.
 *
 * @module components/kanban/ExecutionLogsViewer
 */

import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

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

  // Fetch execution logs when adwId or stage changes, with polling
  useEffect(() => {
    if (!adwId || !stage) {
      setLogs([]);
      return;
    }

    const fetchLogs = async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
      }
      setError(null);

      try {
        const wsPort = window.APP_CONFIG?.WS_PORT || 8501;
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

        if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error fetching execution logs:', err);
        setError(err.message);
        // Don't clear logs on polling error, only on initial load
        if (isInitial) {
          setLogs([]);
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchLogs(true);

    // Poll every 2 seconds for new logs
    const pollInterval = setInterval(() => fetchLogs(false), 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [adwId, stage, onLogCountChange]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return 'log-level-error';
      case 'WARNING':
        return 'log-level-warning';
      case 'DEBUG':
        return 'log-level-debug';
      case 'INFO':
      default:
        return 'log-level-info';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    // Format: "2025-11-28 21:49:19" -> "21:49:19"
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
        <div className="execution-logs-folder-badge">
          {stageFolder}
        </div>
      )}
      <div
        ref={logsContainerRef}
        className="execution-logs-container"
      >
        {logs.map((log, index) => (
          <div key={index} className={`execution-log-entry ${getLevelClass(log.level)}`}>
            <span className="execution-log-timestamp">
              {formatTimestamp(log.timestamp)}
            </span>
            <span className={`execution-log-level ${getLevelClass(log.level)}`}>
              {log.level || 'INFO'}
            </span>
            <span className="execution-log-message">
              {log.message}
            </span>
          </div>
        ))}
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
