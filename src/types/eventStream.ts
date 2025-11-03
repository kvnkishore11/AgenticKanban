/**
 * TypeScript Type Definitions for Event Stream
 *
 * Defines structured event types for real-time log streaming and
 * workflow status updates. Based on the multi-agent-orchestration app's
 * event stream architecture.
 */

/**
 * Base event stream entry
 */
export interface EventStreamEntry {
  id: string;
  sourceType: 'agent' | 'system' | 'orchestrator';
  eventType: string;
  timestamp: string;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Agent log event from workflow execution
 */
export interface AgentLogEvent {
  adw_id: string;
  timestamp: string;
  event_category: 'hook' | 'response' | 'status';
  event_type: 'PreToolUse' | 'ToolUseBlock' | 'TextBlock' | 'ThinkingBlock' | 'StatusUpdate';
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  summary?: string; // AI-generated 15-word summary
  current_step?: string;
  payload?: {
    tool?: string;
    parameters?: Record<string, any>;
    file_changes?: string[];
    [key: string]: any;
  };
}

/**
 * System log event
 */
export interface SystemLogEvent {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  details?: string;
  context?: Record<string, any>;
}

/**
 * Agent summary update event
 */
export interface AgentSummaryUpdateEvent {
  adw_id: string;
  timestamp: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress_percent?: number;
  current_step?: string;
  workflow_name?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Thinking block event (agent reasoning/planning)
 */
export interface ThinkingBlockEvent {
  adw_id: string;
  timestamp: string;
  content: string;
  reasoning_type?: 'planning' | 'analysis' | 'decision';
  metadata?: Record<string, any>;
}

/**
 * Tool use block event (tool execution details)
 */
export interface ToolUseBlockEvent {
  adw_id: string;
  timestamp: string;
  tool_name: string;
  tool_input?: Record<string, any>;
  tool_output?: any;
  status: 'started' | 'success' | 'failed';
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Orchestrator chat event (main output streaming)
 */
export interface OrchestratorChatEvent {
  timestamp: string;
  content: string;
  role: 'assistant' | 'user' | 'system';
  stream_type: 'text' | 'code' | 'markdown';
  is_complete: boolean;
}

/**
 * Chat stream event for real-time output
 */
export interface ChatStreamEvent {
  adw_id: string;
  timestamp: string;
  content: string;
  stream_type: 'text' | 'code' | 'markdown';
  is_complete: boolean;
}

/**
 * Union type for all event types
 */
export type Event =
  | { type: 'agent_log'; data: AgentLogEvent }
  | { type: 'system_log'; data: SystemLogEvent }
  | { type: 'agent_summary_update'; data: AgentSummaryUpdateEvent }
  | { type: 'thinking_block'; data: ThinkingBlockEvent }
  | { type: 'tool_use_block'; data: ToolUseBlockEvent }
  | { type: 'orchestrator_chat'; data: OrchestratorChatEvent }
  | { type: 'chat_stream'; data: ChatStreamEvent };

/**
 * Event filter options
 */
export interface EventFilterOptions {
  adw_id?: string;
  event_category?: 'hook' | 'response' | 'status';
  event_type?: string;
  level?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  search_query?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  total_events: number;
  by_type: Record<string, number>;
  by_level: Record<string, number>;
  by_category: Record<string, number>;
  time_range: {
    start: string;
    end: string;
  };
}
