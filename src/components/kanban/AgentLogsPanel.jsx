/**
 * @fileoverview Agent Logs Panel Component
 *
 * Displays agent-specific logs (thinking blocks, tool usage, file changes, text blocks)
 * fetched from the stage-specific API endpoint. This ensures proper isolation of logs
 * per stage (plan shows only plan logs, build shows only build logs, etc.)
 *
 * @module components/kanban/AgentLogsPanel
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import AgentLogEntry from './AgentLogEntry';
import {
  Search,
  Filter,
  Trash2,
  ArrowDown,
  RefreshCw,
  Brain,
  Wrench,
  FileEdit,
  FileText,
  Loader2
} from 'lucide-react';

const AGENT_EVENT_TYPES = ['ALL', 'THINKING', 'TOOL', 'FILE', 'TEXT'];

const AgentLogsPanel = ({
  taskId,
  adwId = null,  // ADW ID for fetching stage-specific logs
  stage = null,  // Stage to fetch logs for (plan, build, test, review, document)
  maxHeight = '500px',
  autoScrollDefault = true,
  onLogCountChange
}) => {
  const { getWebSocketStatus } = useKanbanStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // API-based logs state
  const [stageLogs, setStageLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const logsContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const websocketStatus = getWebSocketStatus();

  // Fetch stage-specific logs from API
  const fetchStageLogs = useCallback(async () => {
    if (!adwId || !stage) {
      setStageLogs([]);
      return;
    }

    try {
      const wsPort = import.meta.env.VITE_ADW_PORT || 8500;
      const response = await fetch(`http://localhost:${wsPort}/api/stage-logs/${adwId}/${stage}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stage logs: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.logs) {
        // Transform logs to match expected format for AgentLogEntry
        const transformedLogs = data.logs.map((log, index) => ({
          id: `${adwId}-${stage}-${index}-${log.timestamp || Date.now()}`,
          entry_type: log.entry_type || 'system',
          subtype: log.subtype || 'info',
          message: log.message || '',
          content: log.message || log.details || '',
          timestamp: log.timestamp || new Date().toISOString(),
          tool_name: log.tool_name,
          tool_input: log.tool_input,
          usage: log.usage,
          level: log.level,
          raw_data: log.raw_data || log,
          stage: stage,
          adw_id: adwId,
        }));

        setStageLogs(transformedLogs);
        setLastFetchTime(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching stage logs:', err);
      setError(err.message);
    }
  }, [adwId, stage]);

  // Initial fetch and polling
  useEffect(() => {
    // Initial fetch
    if (adwId && stage) {
      setIsLoading(true);
      fetchStageLogs().finally(() => setIsLoading(false));
    }

    // Set up polling for updates (every 3 seconds)
    pollIntervalRef.current = setInterval(() => {
      if (adwId && stage) {
        fetchStageLogs();
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [adwId, stage, fetchStageLogs]);

  // Filter for agent-specific logs only
  const agentLogs = useMemo(() => {
    return stageLogs.filter(log => {
      // Filter for agent-specific entry types
      const entryType = log.entry_type;
      const subtype = log.subtype;

      // Include logs that are agent-specific:
      // - thinking blocks (entry_type: assistant, subtype: thinking)
      // - tool calls (entry_type: assistant, subtype: tool_use or tool_call)
      // - tool results (entry_type: result, subtype: tool_result OR entry_type: user with tool_result content)
      // - text blocks (entry_type: assistant, subtype: text)
      // - file changes (entry_type: assistant, subtype: file_changed)
      // Also include init and system messages for context
      //
      // Note: The backend derives subtypes from content blocks for assistant entries
      // (text, tool_use, thinking, tool_result) to enable proper filtering here.
      const isAgentLog =
        // Assistant messages with derived subtypes
        (entryType === 'assistant' && ['thinking', 'tool_use', 'tool_call', 'text', 'file_changed'].includes(subtype)) ||
        // Result messages
        (entryType === 'result' && subtype === 'tool_result') ||
        // User messages containing tool results (tool_result subtype from content blocks)
        (entryType === 'user' && subtype === 'tool_result') ||
        // System init messages for context
        (entryType === 'system' && subtype === 'init');

      return isAgentLog;
    });
  }, [stageLogs]);

  // Apply event type filter and search
  const filteredLogs = useMemo(() => {
    let logs = [...agentLogs];

    // Apply event type filter
    if (eventFilter !== 'ALL') {
      logs = logs.filter(log => {
        const subtype = log.subtype;
        switch (eventFilter) {
          case 'THINKING':
            return subtype === 'thinking';
          case 'TOOL':
            return subtype === 'tool_call' || subtype === 'tool_use' || subtype === 'tool_result';
          case 'FILE':
            return subtype === 'file_changed';
          case 'TEXT':
            return subtype === 'text';
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => {
        const message = (log.message || '').toLowerCase();
        const content = (log.content || '').toLowerCase();
        const toolName = (log.tool_name || '').toLowerCase();
        const filePath = (log.file_path || '').toLowerCase();
        return message.includes(query) || content.includes(query) ||
               toolName.includes(query) || filePath.includes(query);
      });
    }

    return logs;
  }, [agentLogs, eventFilter, searchQuery]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, autoScroll]);

  // Notify parent of log count changes
  useEffect(() => {
    if (onLogCountChange) {
      onLogCountChange(agentLogs.length);
    }
  }, [agentLogs.length, onLogCountChange]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchStageLogs().finally(() => setIsLoading(false));
  };

  const handleJumpToLatest = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
    }
  };

  const getFilterIcon = (filter) => {
    switch (filter) {
      case 'THINKING':
        return <Brain className="h-3 w-3" />;
      case 'TOOL':
        return <Wrench className="h-3 w-3" />;
      case 'FILE':
        return <FileEdit className="h-3 w-3" />;
      case 'TEXT':
        return <FileText className="h-3 w-3" />;
      default:
        return <Filter className="h-3 w-3" />;
    }
  };

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        {/* Left: Agent indicator, stage badge, and log count */}
        <div className="flex items-center space-x-2">
          {/* Agent Indicator */}
          <div className="flex items-center space-x-1 text-xs text-gray-700">
            <Brain className="h-3 w-3 text-purple-600" />
            <span className="font-medium">Agent Logs</span>
          </div>

          {/* Stage Badge */}
          {stage && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium uppercase">
              {stage}
            </span>
          )}

          {/* Log Count */}
          <span className="text-xs text-gray-600 font-medium">
            {filteredLogs.length} {filteredLogs.length === agentLogs.length ? 'entries' : `/ ${agentLogs.length} entries`}
          </span>

          {/* Loading indicator */}
          {isLoading && (
            <Loader2 className="h-3 w-3 text-purple-600 animate-spin" />
          )}
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
              placeholder="Search agent logs..."
              className="pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              style={{ width: '150px' }}
            />
          </div>

          {/* Filter by event type */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center space-x-1 px-2 py-1 border rounded text-xs transition-colors ${
                eventFilter !== 'ALL'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Filter by event type"
            >
              {getFilterIcon(eventFilter)}
              <span>{eventFilter}</span>
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[120px]">
                  {AGENT_EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setEventFilter(type);
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center space-x-2 w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 ${
                        eventFilter === type ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {getFilterIcon(type)}
                      <span>{type}</span>
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
                ? 'bg-purple-600 text-white border-purple-600'
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

          {/* Refresh logs */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight }}
      >
        {isLoading && stageLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Loader2 className="h-12 w-12 mb-3 text-purple-300 animate-spin" />
            <div className="text-sm font-medium">Loading Logs...</div>
            <div className="text-xs text-gray-400 mt-1">
              Fetching {stage ? `${stage.toUpperCase()} stage` : ''} agent logs...
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Brain className="h-12 w-12 mb-3 text-red-300" />
            <div className="text-sm font-medium text-red-600">Error Loading Logs</div>
            <div className="text-xs text-red-400 mt-1">{error}</div>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Retry
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Brain className="h-12 w-12 mb-3 text-gray-300" />
            <div className="text-sm font-medium">No Agent Logs</div>
            <div className="text-xs text-gray-400 mt-1">
              {agentLogs.length === 0
                ? stage
                  ? `No ${stage.toUpperCase()} stage logs yet...`
                  : 'Agent thinking and tool usage will appear here...'
                : 'No logs match the current filters'}
            </div>
          </div>
        ) : (
          <>
            {filteredLogs.map((log, index) => (
              <AgentLogEntry key={log.id || index} log={log} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default AgentLogsPanel;
