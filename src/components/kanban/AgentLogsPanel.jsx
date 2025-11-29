/**
 * @fileoverview Agent Logs Panel Component
 *
 * Displays agent-specific logs (thinking blocks, tool usage, file changes, text blocks)
 * filtered from the general workflow logs. Uses AgentLogEntry component for specialized
 * rendering of different agent event types.
 *
 * @module components/kanban/AgentLogsPanel
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import AgentLogEntry from './AgentLogEntry';
import {
  Search,
  Filter,
  Trash2,
  ArrowDown,
  Wifi,
  WifiOff,
  Brain,
  Wrench,
  FileEdit,
  FileText
} from 'lucide-react';

const AGENT_EVENT_TYPES = ['ALL', 'THINKING', 'TOOL', 'FILE', 'TEXT'];

// Stage to agent role mapping for filtering logs by stage
const STAGE_TO_ROLES = {
  plan: ['planner', 'sdlc_planner'],
  build: ['implementor', 'sdlc_implementor', 'sdlc_implementor_committer'],
  test: ['tester', 'test_runner', 'e2e_test_runner', 'test_resolver'],
  review: ['reviewer', 'in_loop_review'],
  document: ['documenter', 'ops']
};

const AgentLogsPanel = ({
  taskId,
  stage = null,  // null = all stages, string = filter by stage
  maxHeight = '500px',
  autoScrollDefault = true,
  onLogCountChange
}) => {
  const { getWorkflowLogsForTask, clearWorkflowLogsForTask, getWebSocketStatus } = useKanbanStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const logsContainerRef = useRef(null);
  const bottomRef = useRef(null);

  // Get logs from store
  const allLogs = getWorkflowLogsForTask(taskId) || [];
  const websocketStatus = getWebSocketStatus();

  // Filter for agent-specific logs only, optionally by stage
  const agentLogs = useMemo(() => {
    return allLogs.filter(log => {
      // Filter for agent-specific entry types
      const entryType = log.entry_type;
      const subtype = log.subtype;

      // Include logs that are agent-specific:
      // - thinking blocks (entry_type: assistant, subtype: thinking)
      // - tool calls (entry_type: assistant, subtype: tool_call)
      // - tool results (entry_type: result, subtype: tool_result)
      // - text blocks (entry_type: assistant, subtype: text)
      // - file changes (entry_type: assistant, subtype: file_changed)
      const isAgentLog =
        (entryType === 'assistant' && ['thinking', 'tool_call', 'text', 'file_changed'].includes(subtype)) ||
        (entryType === 'result' && subtype === 'tool_result');

      if (!isAgentLog) return false;

      // If stage filter is provided, filter by agent role (if available)
      if (stage) {
        const roles = STAGE_TO_ROLES[stage.toLowerCase()] || [];
        const agentRole = (log.agent_role || log.source || '').toLowerCase();

        // If log has no agent_role/source, include it (don't filter out)
        // This ensures thinking_block, tool_use events without agent_role are shown
        if (!agentRole) {
          return true;
        }

        // Check if the log's agent role matches any of the stage's roles
        const matchesStage = roles.some(role =>
          agentRole.includes(role.toLowerCase())
        );

        return matchesStage;
      }

      return true;
    });
  }, [allLogs, stage]);

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
            return subtype === 'tool_call' || subtype === 'tool_result';
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
        {/* Left: Agent indicator, connection status and log count */}
        <div className="flex items-center space-x-2">
          {/* Agent Indicator */}
          <div className="flex items-center space-x-1 text-xs text-gray-700">
            <Brain className="h-3 w-3 text-purple-600" />
            <span className="font-medium">Agent Logs</span>
          </div>

          {/* Log Count */}
          <span className="text-xs text-gray-600 font-medium">
            {filteredLogs.length} {filteredLogs.length === agentLogs.length ? 'entries' : `/ ${agentLogs.length} entries`}
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
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Brain className="h-12 w-12 mb-3 text-gray-300" />
            <div className="text-sm font-medium">No Agent Logs</div>
            <div className="text-xs text-gray-400 mt-1">
              {agentLogs.length === 0
                ? 'Agent thinking and tool usage will appear here...'
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
