# Feature: Real-Time Agent Log Streaming

## Metadata

issue_number: `21`
adw_id: `158e99e0`
issue_json: `{"number":21,"title":"So, I want to implement one feature","body":"So, I want to implement one feature. So, right now you see we are getting the stage logs like what is happening at the stage level. But right now I also want to see the agent logs like what's happening in each stage like the agents thinking and what is the agent doing like I want that to be streamed directly into the log so I can have visibility of everything that the agent is doing. So, I guess there are those are stored in the agents folder of the adw id. So, I want to implement that feature. So, I want you to ultra think and see how we can get that just see if you can use the same WebSocket for this or if you feel that we need to have a event stream protocol that should also be fine but whichever is I think already there is WebSocket just see if you can make use of it. If you feel that event streaming is good then you can make use of it. So, basically there is JSON L file that is like the constant streaming I guess and there is also a dot JSON file of the agent which has I think that happens at the end of the event. So, just see how you can implement that feature I am looking forward for that."}`

## Feature Description

Implement real-time streaming of agent logs to provide complete visibility into what agents are thinking and doing during workflow execution. Currently, the system displays stage-level logs (what stage is happening), but lacks detailed visibility into agent-level activities like thinking blocks, tool usage, file changes, and text responses. This feature will stream granular agent logs from the `agents/{adw_id}` directory (specifically `raw_output.jsonl` files) to the frontend UI in real-time via WebSocket.

## User Story

As a **developer using the Kanban board**
I want to **see real-time logs of what the AI agent is thinking and doing during each workflow stage**
So that **I can understand the agent's decision-making process, troubleshoot issues, and have complete visibility into automated workflows**

## Problem Statement

The current system provides high-level stage progression updates but lacks granular visibility into agent activities. Users cannot see:
- What the agent is thinking (reasoning blocks)
- Which tools the agent is using and why
- File operations being performed
- Real-time progress within a stage
- Detailed error messages and debugging information

Agent logs are stored in `agents/{adw_id}/sdlc_{role}/raw_output.jsonl` files (JSONL format for streaming) and `agents/{adw_id}/sdlc_{role}/raw_output.json` files (JSON format created at end), but these are not streamed to the frontend. This creates a visibility gap where users must manually inspect files or wait until workflow completion to understand what happened.

## Solution Statement

Leverage the existing WebSocket infrastructure to stream agent logs in real-time from the backend to the frontend. The solution uses the `AgentDirectoryMonitor` module (already implemented in `adws/adw_modules/agent_directory_monitor.py`) to watch `raw_output.jsonl` files and broadcast structured events via WebSocket. The frontend will consume these events and display them in the existing log viewer components with enhanced formatting for different event types (thinking blocks, tool usage, file changes, text blocks).

**Key Design Decisions:**
1. **Use existing WebSocket infrastructure** - No need for Server-Sent Events (SSE) or new protocols
2. **Leverage AgentDirectoryMonitor** - Module already monitors agent directories and parses JSONL
3. **Structured event types** - WebSocketManager already supports granular events (thinking_block, tool_use_pre, tool_use_post, file_changed, text_block)
4. **Real-time streaming** - Tail JSONL files as agents write them, not batch processing
5. **Backward compatible** - Enhance existing log viewers, don't break current functionality

## Relevant Files

Use these files to implement the feature:

- **Backend WebSocket Infrastructure:**
  - `server/core/websocket_manager.py` - WebSocket manager with broadcast methods for agent events (thinking_block, tool_use_pre/post, file_changed, text_block, agent_log)
  - `adws/adw_modules/agent_directory_monitor.py` - Already monitors agent directories, tails raw_output.jsonl, and broadcasts structured events via WebSocket
  - `adws/adw_triggers/trigger_websocket.py` - WebSocket trigger server that needs to integrate agent directory monitoring

- **Frontend WebSocket Service:**
  - `src/services/websocket/websocketService.js` - WebSocket client service with event listeners for agent events (already has handlers for thinking_block, tool_use_pre/post, file_changed, text_block, agent_log at lines 439-456)

- **Frontend UI Components:**
  - `src/components/kanban/WorkflowLogViewer.jsx` - Main log viewer component that displays workflow logs
  - `src/components/kanban/StageLogsViewer.jsx` - Stage-specific log viewer
  - `src/components/kanban/LiveLogsPanel.jsx` - Live logs panel component for real-time log streaming
  - `src/components/kanban/DetailedLogEntry.jsx` - Component for rendering individual log entries with rich formatting

- **State Management:**
  - `src/stores/kanbanStore.js` - Kanban store with handleWorkflowLog and appendWorkflowLog functions (lines 1388-1434)

- **Testing Documentation:**
  - `app_docs/feature-6d3b1dfd-websocket-logs-debugging.md` - Documents WebSocket log flow and debugging techniques

### New Files

#### Backend Integration
- `adws/adw_modules/agent_log_streamer.py` - Wrapper module to start/stop AgentDirectoryMonitor for active workflows

#### Frontend Components
- `src/components/kanban/AgentLogEntry.jsx` - Specialized component for rendering agent-specific log entries (thinking blocks, tool usage, file changes)

#### Tests
- `adws/adw_modules/tests/test_agent_log_streamer.py` - Unit tests for agent log streamer
- `server/tests/test_agent_directory_monitor.py` - Unit tests for agent directory monitor integration
- `src/components/kanban/__tests__/AgentLogEntry.test.jsx` - Unit tests for agent log entry component
- `src/test/integration/agent-log-streaming.integration.test.js` - Integration test for end-to-end agent log streaming
- `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md` - E2E test specification for agent log streaming

## Implementation Plan

### Phase 1: Backend Integration

Integrate the AgentDirectoryMonitor into the workflow orchestration system to automatically start monitoring when workflows begin and stop when they complete.

**Key Changes:**
1. Create agent log streamer module to manage lifecycle of AgentDirectoryMonitor instances
2. Modify workflow orchestrator to start monitoring when workflows begin
3. Ensure WebSocket manager is properly connected to AgentDirectoryMonitor broadcasts
4. Add cleanup logic to stop monitoring when workflows complete

### Phase 2: Frontend Event Handling

Enhance frontend WebSocket service and store to consume agent-specific events and store them alongside existing workflow logs.

**Key Changes:**
1. Add handlers for agent event types in WebSocketService (leverage existing event listeners)
2. Extend KanbanStore to handle agent log events and associate them with tasks
3. Add formatting and categorization logic for different agent event types
4. Implement log filtering and search capabilities for agent logs

### Phase 3: UI Enhancement

Update UI components to display agent logs with rich formatting and interactivity.

**Key Changes:**
1. Create AgentLogEntry component for specialized rendering of agent events
2. Enhance WorkflowLogViewer to toggle between stage logs and agent logs
3. Add visual indicators for different event types (icons, colors, expandable sections)
4. Implement log level filtering (INFO, DEBUG, ERROR, SUCCESS)
5. Add real-time streaming indicator and auto-scroll functionality

## Step by Step Tasks

### Create Agent Log Streamer Module

- Create `adws/adw_modules/agent_log_streamer.py` with `AgentLogStreamer` class
- Implement `start_monitoring(adw_id, websocket_manager)` to create and start AgentDirectoryMonitor instance
- Implement `stop_monitoring(adw_id)` to gracefully stop monitoring for a specific workflow
- Add global registry to track active monitors by adw_id
- Add error handling and logging for monitor lifecycle events
- Include thread-safety measures for concurrent workflow monitoring

### Integrate Monitoring into Workflow Orchestrator

- Modify `adws/adw_orchestrator.py` to import and use AgentLogStreamer
- Add monitoring startup at workflow initialization (after worktree creation, before first stage)
- Pass WebSocket manager instance to AgentLogStreamer
- Add monitoring cleanup in workflow completion/error handlers
- Ensure monitoring starts for all workflow entry points (plan_iso, patch_iso, etc.)
- Add state tracking to persist monitoring status in `adw_state.json`

### Create Unit Tests for Backend

- Create `adws/adw_modules/tests/test_agent_log_streamer.py` with pytest fixtures
- Test start_monitoring creates AgentDirectoryMonitor instance
- Test stop_monitoring cleans up resources
- Test concurrent monitoring of multiple workflows
- Test error handling for invalid adw_ids
- Mock WebSocket manager to verify broadcast calls

### Enhance Frontend WebSocket Event Handling

- Modify `src/services/websocket/websocketService.js` to verify all agent event handlers are properly registered
- Update event listener registration to handle thinking_block, tool_use_pre, tool_use_post, file_changed, text_block, agent_log events
- Add debugging logs for agent event reception (similar to workflow_log handler at lines 420-430)
- Ensure events include adw_id for task association

### Update KanbanStore to Handle Agent Events

- Modify `src/stores/kanbanStore.js` to add agent event handlers
- Create `handleAgentLog(data)` function similar to `handleWorkflowLog` (line 1388)
- Associate agent logs with tasks by matching `data.adw_id` to `task.metadata.adw_id`
- Store agent logs in separate array or with type flag to distinguish from stage logs
- Add log count limits per task to prevent memory issues (e.g., 1000 agent logs max)
- Add debugging logs to trace agent log association

### Create AgentLogEntry Component

- Create `src/components/kanban/AgentLogEntry.jsx` as specialized log entry renderer
- Implement rendering logic for thinking_block events (expandable reasoning content)
- Implement rendering logic for tool_use_pre events (tool name, input parameters as formatted JSON)
- Implement rendering logic for tool_use_post events (tool output, duration, success/error status)
- Implement rendering logic for file_changed events (file path, operation type, diff preview)
- Implement rendering logic for text_block events (formatted text content)
- Add icons and color coding for different event types
- Add expand/collapse functionality for detailed content
- Add timestamp formatting and duration display
- Add syntax highlighting for code/JSON content

### Enhance WorkflowLogViewer Component

- Modify `src/components/kanban/WorkflowLogViewer.jsx` to support agent logs
- Add toggle/tabs to switch between "Stage Logs" and "Agent Logs" views
- Filter logs by type when displaying agent logs
- Use AgentLogEntry component for agent-specific events
- Add search/filter controls (filter by event type, log level, time range)
- Add auto-scroll toggle with indicator when new logs arrive
- Maintain existing functionality for stage logs (backward compatible)

### Add Visual Indicators and Filtering

- Add icon library imports (use existing Lucide React icons)
- Create icon mapping for event types (Brain for thinking_block, Wrench for tool_use, File for file_changed, etc.)
- Add color coding for log levels (INFO: blue, ERROR: red, SUCCESS: green, WARNING: yellow, DEBUG: gray)
- Implement log level filter dropdown (All, INFO, ERROR, SUCCESS, WARNING, DEBUG)
- Implement event type filter dropdown (All, Thinking, Tool Usage, File Changes, Text)
- Add clear filters button
- Persist filter preferences in localStorage

### Create Frontend Unit Tests

- Create `src/components/kanban/__tests__/AgentLogEntry.test.jsx` with Vitest
- Test rendering of thinking_block events with expandable content
- Test rendering of tool_use_pre/post events with formatted JSON
- Test rendering of file_changed events with diff preview
- Test rendering of text_block events
- Test expand/collapse functionality
- Test timestamp and duration formatting
- Mock log data for all event types

### Create Integration Tests

- Create `src/test/integration/agent-log-streaming.integration.test.js`
- Test WebSocket event flow from backend to frontend
- Test KanbanStore agent log handling and task association
- Test log filtering and search functionality
- Test concurrent agent log streaming for multiple tasks
- Mock WebSocket server to send test agent events
- Verify UI updates when agent logs arrive

### Create E2E Test Specification

- Create `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md`
- Define test scenario: Create task → Trigger workflow → Verify agent logs appear in UI
- Specify steps for manual testing with browser DevTools
- Include verification steps for each agent event type
- Add screenshot capture points for visual verification
- Document expected console logs for debugging
- Include test data and mock scenarios

### Run Backend Unit Tests

- Execute `cd adws && uv run pytest adw_modules/tests/test_agent_log_streamer.py -v`
- Verify all tests pass with zero failures
- Check test coverage for agent log streamer module
- Fix any failing tests or implementation bugs
- Execute `cd server && uv run pytest tests/test_agent_directory_monitor.py -v` (if created)

### Run Frontend Unit Tests

- Execute `bun run test src/components/kanban/__tests__/AgentLogEntry.test.jsx`
- Verify all component tests pass
- Check test coverage for AgentLogEntry component
- Fix any failing tests or component bugs
- Execute `bun run test src/test/integration/agent-log-streaming.integration.test.js`

### Manual Testing and Validation

- Start backend server: `cd server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Start WebSocket server: `python start-websocket.py`
- Start frontend: `bun run dev`
- Create a test task in Kanban board
- Trigger a workflow (e.g., plan stage)
- Open browser DevTools console and verify:
  - WebSocket connection established
  - Agent events received (thinking_block, tool_use_pre/post, etc.)
  - KanbanStore associates logs with correct task
  - WorkflowLogViewer displays agent logs with proper formatting
- Test log filtering and search functionality
- Test expand/collapse for detailed log entries
- Verify auto-scroll behavior
- Test with multiple concurrent workflows
- Capture screenshots of UI showing agent logs

### Execute Validation Commands

- `cd server && uv run pytest` - Run all server tests to ensure zero regressions
- `bun run test` - Run all frontend tests to ensure zero regressions
- `bun tsc --noEmit` - TypeScript type checking to ensure no type errors
- `bun run build` - Frontend build to ensure production build succeeds
- Manual E2E test following `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md`

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

**File:** `adws/adw_modules/tests/test_agent_log_streamer.py`
- Test AgentLogStreamer.start_monitoring creates monitor instance
- Test AgentLogStreamer.stop_monitoring cleans up resources
- Test concurrent monitoring of multiple workflows
- Test error handling for invalid adw_ids
- Mock WebSocketManager to verify broadcast calls
- Test monitor registry tracks active monitors correctly

**File:** `server/tests/test_agent_directory_monitor.py` (optional, if integration testing needed)
- Test AgentDirectoryMonitor watches correct directories
- Test JSONL parsing and event extraction
- Test broadcast methods are called with correct data
- Test file tailing and position tracking

#### Frontend Unit Tests

**File:** `src/components/kanban/__tests__/AgentLogEntry.test.jsx`
- Test rendering thinking_block with expandable content
- Test rendering tool_use_pre with formatted input parameters
- Test rendering tool_use_post with output and duration
- Test rendering file_changed with diff preview
- Test rendering text_block with formatted content
- Test expand/collapse toggle functionality
- Test timestamp and duration formatting
- Test icon and color coding for different event types

#### Integration Tests

**File:** `src/test/integration/agent-log-streaming.integration.test.js`
- Test WebSocket event flow end-to-end (mock WebSocket server → WebSocketService → KanbanStore → UI)
- Test agent log association with tasks by adw_id
- Test log filtering by event type and log level
- Test search functionality
- Test concurrent log streaming for multiple tasks
- Test log count limits and memory management

### E2E Tests

**File:** `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md`

Scenario: User triggers workflow and sees real-time agent logs in the UI

Steps:
1. Start backend, WebSocket server, and frontend
2. Open browser and navigate to Kanban board
3. Create a new task with title "Test Agent Log Streaming"
4. Trigger a workflow (click "Start Planning" or similar)
5. Verify WebSocket connection established (check DevTools console)
6. Verify agent events appear in console (thinking_block, tool_use_pre, tool_use_post, etc.)
7. Open WorkflowLogViewer for the task
8. Switch to "Agent Logs" tab
9. Verify agent logs appear in real-time with proper formatting
10. Test expand/collapse for thinking blocks and tool usage
11. Test filtering by event type and log level
12. Verify auto-scroll follows new logs
13. Capture screenshots showing agent logs in UI

Expected Results:
- All agent events visible in UI within 2 seconds of backend broadcast
- Logs properly formatted with icons, colors, and timestamps
- Filtering and search work correctly
- No console errors or warnings
- UI remains responsive with 100+ agent logs

### Edge Cases

- **No agent directory exists yet** - Monitor should handle gracefully and wait for directory creation
- **JSONL file is empty or incomplete** - Parser should skip invalid lines and continue
- **WebSocket disconnection during workflow** - Frontend should reconnect and request missed logs
- **Multiple concurrent workflows** - Each workflow's logs should be isolated and associated with correct task
- **Very large log files (1000+ lines)** - Frontend should limit displayed logs and provide pagination or virtual scrolling
- **Agent crashes mid-workflow** - Monitor should detect and broadcast error event
- **Invalid JSONL format** - Parser should log error and skip malformed lines without crashing
- **User closes task card while logs streaming** - Event listeners should be cleaned up to prevent memory leaks
- **Workflow completes before user opens log viewer** - All historical agent logs should be loaded and displayed

## Acceptance Criteria

- [ ] AgentDirectoryMonitor automatically starts when workflows begin and stops when they complete
- [ ] Agent logs (thinking blocks, tool usage, file changes, text blocks) stream in real-time to frontend via WebSocket
- [ ] WorkflowLogViewer displays agent logs with rich formatting (icons, colors, expandable sections)
- [ ] Users can toggle between "Stage Logs" and "Agent Logs" views
- [ ] Users can filter agent logs by event type (thinking, tool usage, file changes, text) and log level (INFO, ERROR, SUCCESS, WARNING, DEBUG)
- [ ] Agent logs are associated with correct tasks via adw_id matching
- [ ] Multiple concurrent workflows can stream logs simultaneously without interference
- [ ] Agent logs display within 2 seconds of backend broadcast (real-time)
- [ ] Expand/collapse functionality works for detailed log entries (thinking blocks, tool outputs)
- [ ] Auto-scroll follows new logs with toggle to disable
- [ ] All backend unit tests pass with zero failures
- [ ] All frontend unit tests pass with zero failures
- [ ] TypeScript compilation succeeds with no errors
- [ ] Frontend production build succeeds
- [ ] E2E manual test passes with visual verification
- [ ] No regressions in existing stage log functionality
- [ ] Console shows no errors or warnings during agent log streaming
- [ ] UI remains responsive with 100+ agent logs streaming

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `cd adws && uv run pytest adw_modules/tests/test_agent_log_streamer.py -v` - Run agent log streamer unit tests
- `cd server && uv run pytest` - Run all server tests to validate zero regressions
- `bun run test` - Run all frontend tests to validate zero regressions
- `bun tsc --noEmit` - TypeScript type checking to ensure no type errors
- `bun run build` - Frontend production build to validate build succeeds
- Manual E2E test following `src/test/e2e/issue-21-adw-158e99e0-e2e-agent-log-streaming.md` - Validate end-to-end functionality with visual verification

## Notes

### Architecture Decisions

**Why use WebSocket instead of Server-Sent Events (SSE)?**
- WebSocket infrastructure already exists and is battle-tested
- Bi-directional communication may be needed in future (user → agent interaction)
- SSE would add complexity with another protocol to maintain
- WebSocketManager already has all necessary broadcast methods

**Why use AgentDirectoryMonitor instead of custom implementation?**
- AgentDirectoryMonitor already exists and handles file watching, JSONL parsing, and WebSocket broadcasting
- Proven to work with watchdog library for efficient file system monitoring
- Saves development time by reusing existing, tested code
- Maintains consistency with existing agent monitoring patterns

**Why separate AgentLogEntry component?**
- Agent logs have unique rendering requirements (expandable content, code formatting, diff previews)
- Keeps WorkflowLogViewer focused on orchestration, not rendering details
- Makes testing easier by isolating rendering logic
- Allows future enhancements without modifying core log viewer

### Performance Considerations

- **Log count limits**: KanbanStore should limit agent logs per task (e.g., 1000 max) to prevent memory issues
- **Virtual scrolling**: Consider react-window or react-virtualized for rendering 100+ logs efficiently
- **Debouncing**: Batch WebSocket events if they arrive faster than 100ms to reduce re-renders
- **Cleanup**: Remove event listeners when components unmount to prevent memory leaks

### Future Enhancements

- **Log export**: Export agent logs to JSON or text file for offline analysis
- **Log replay**: Replay agent thinking process step-by-step with timeline scrubber
- **Agent comparison**: Compare agent logs across multiple workflow runs to identify patterns
- **Real-time collaboration**: Allow multiple users to see same agent logs simultaneously
- **Agent feedback**: Allow users to provide feedback on agent decisions directly in log viewer

### Related Issues and PRs

- Issue #58 (ADW: 6d3b1dfd) - WebSocket logs debugging (documented in `app_docs/feature-6d3b1dfd-websocket-logs-debugging.md`)
- Issue #66 (ADW: 29fb6a3e) - Enhanced WebSocket agent streaming (spec: `specs/issue-66-adw-29fb6a3e-sdlc_planner-enhance-websocket-agent-streaming.md`)

### Dependencies

- **watchdog** library (already in `adws/adw_modules/agent_directory_monitor.py` dependencies)
- **Lucide React** icons (already used in frontend)
- **CodeMirror** or similar for syntax highlighting (already available in project)
