# Chore: WebSocket Agent State Streaming Service

## Metadata
issue_number: `52`
adw_id: `c0a43f47`
issue_json: `{"number":52,"title":"agents/{adw_id}\nis a great resource to know what i...","body":"agents/{adw_id}\nis a great resource to know what is happenig in each agent state.\nWe need some service for the websocket to stream this information so that we can display so much information on the frontned.\n\nthink harder and come up with a solution on both the adw sytem side and also frontend side."}`

## Chore Description
The `agents/{adw_id}/` directory contains valuable agent state information that tracks workflow execution in real-time. Currently, this information is only accessible by reading files directly from the filesystem. We need to implement a WebSocket streaming service that:

1. **Backend Side**: Monitors agent state changes in the `agents/{adw_id}/` directory and broadcasts them via WebSocket to connected clients
2. **Frontend Side**: Connects to the WebSocket stream and displays real-time agent state information in the UI

The solution should provide granular streaming of:
- Agent state changes from `adw_state.json`
- Workflow stage transitions
- Real-time log entries from agent executions
- File modifications and changes
- Progress updates and status changes

This will enable the frontend to display rich, real-time information about what's happening in each agent workflow, similar to advanced agent orchestration systems.

## Relevant Files
Use these files to resolve the chore:

### Backend Files

- **`server/core/websocket_manager.py`** (exists)
  - Already implements comprehensive WebSocket broadcasting infrastructure
  - Has methods for `broadcast_agent_log`, `broadcast_agent_summary_update`, `broadcast_thinking_block`, `broadcast_tool_use_pre`, `broadcast_tool_use_post`, `broadcast_file_changed`, `broadcast_summary_update`, `broadcast_text_block`
  - Provides connection management and real-time event broadcasting
  - Will be used as the foundation for agent state streaming

- **`server/server.py`** (exists)
  - Main FastAPI server with WebSocket endpoint at `/ws`
  - Already has `ws_manager` instance available in `app.state.ws_manager`
  - Will need new endpoint for receiving agent state updates from ADW workflows

- **`server/api/adws.py`** (exists)
  - Handles ADW-related API endpoints
  - Has `get_agents_directory()` function to locate agents
  - Has `read_adw_state()` function to parse agent state
  - Will be used for serving current agent state snapshots

- **`adws/adw_modules/websocket_client.py`** (exists)
  - Provides `WebSocketNotifier` class for workflows to send updates
  - Already sends status updates and logs to WebSocket server
  - Currently targets `/api/workflow-updates` endpoint
  - Will be enhanced to send more granular agent state information

- **`adws/adw_modules/state.py`** (exists)
  - Manages ADW state with `adw_state.json` file
  - Has `save()` method that writes state to disk
  - Will be enhanced to trigger WebSocket notifications on state changes

### Frontend Files

- **`src/services/websocket/websocketService.js`** (exists)
  - Comprehensive WebSocket client with connection management
  - Already handles `trigger_response`, `status_update`, `workflow_log`, `stage_transition` events
  - Has event listener system with `on()`, `off()`, `emit()` methods
  - Has connection quality metrics and auto-reconnection
  - Will be enhanced to handle new agent state streaming events

- **`src/components/kanban/AgentStateViewer.jsx`** (exists)
  - Currently fetches agent state via REST API at `/api/agent-state/{adwId}`
  - Displays workflow metadata, ports, model configuration, execution status
  - Will be enhanced to use WebSocket streaming for real-time updates

- **`src/types/eventStream.ts`** (exists)
  - TypeScript type definitions for event streaming
  - Will need new types for agent state streaming events

### New Files

- **`server/api/agent_state_stream.py`** (new)
  - New API endpoint to receive agent state updates from ADW workflows
  - Forwards updates to WebSocket manager for broadcasting
  - Provides REST endpoint for current state snapshot

- **`server/modules/agent_state_monitor.py`** (new)
  - Optional file watcher service to monitor `agents/{adw_id}/` directories
  - Detects changes to `adw_state.json` and other agent files
  - Automatically broadcasts updates via WebSocket manager
  - Alternative to push-based updates from workflows

- **`src/services/agentStateStreamService.js`** (new)
  - Frontend service to manage agent state WebSocket subscriptions
  - Provides high-level API for components to subscribe to agent state updates
  - Handles state aggregation and caching

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Agent State Streaming Backend API
- Create `server/api/agent_state_stream.py` with the following:
  - `POST /api/agent-state-update` endpoint to receive updates from ADW workflows
  - Accept JSON payload with agent state data (adw_id, state_changes, event_type)
  - Use `app.state.ws_manager` to broadcast state updates to WebSocket clients
  - Add endpoint to retrieve full agent state snapshot: `GET /api/agent-state/{adw_id}`
  - Use existing functions from `server/api/adws.py` to read agent state
- Register the new router in `server/server.py`:
  - Import the new `agent_state_stream` router
  - Add `app.include_router(agent_state_stream.router)` with appropriate prefix

### Step 2: Enhance ADW State Module to Trigger WebSocket Notifications
- Modify `adws/adw_modules/state.py`:
  - Import `WebSocketNotifier` from `websocket_client.py`
  - In the `save()` method, after writing to file, send agent state update via WebSocket
  - Create new method `notify_state_change()` that sends detailed state information
  - Include: adw_id, changed fields, current state snapshot, timestamp
  - Ensure backward compatibility (WebSocket notifications should be optional/failsafe)

### Step 3: Enhance WebSocket Client for Granular Agent State Updates
- Modify `adws/adw_modules/websocket_client.py`:
  - Add new method `send_agent_state_update()` to send full state changes
  - Add method `send_agent_log_entry()` for detailed log streaming
  - Add method `send_file_operation()` to notify file reads/writes/modifications
  - Add method `send_agent_thinking()` to stream Claude Code thinking blocks
  - Add method `send_tool_execution()` to stream tool use (pre/post execution)
  - Target the new `/api/agent-state-update` endpoint
  - Include comprehensive payload: event_type, adw_id, data, timestamp

### Step 4: Integrate Agent State Notifications in ADW Workflows
- Identify key integration points in ADW workflow scripts (example: `adw_plan_iso.py`, `adw_build_iso.py`):
  - After state.save() calls - trigger state change notifications
  - Before/after Claude Code agent execution - stream thinking and tool use
  - On file operations - notify file read/write/modify events
  - On stage transitions - broadcast detailed stage information
- This step should be implemented carefully to avoid breaking existing workflows
- Test with a single workflow first before applying to all workflows

### Step 5: Create Frontend Agent State Stream Service
- Create `src/services/agentStateStreamService.js`:
  - Build on top of existing `websocketService.js`
  - Provide `subscribeToAgentState(adwId, callback)` method
  - Provide `unsubscribeFromAgentState(adwId)` method
  - Maintain in-memory cache of agent states keyed by adw_id
  - Handle multiple subscribers per adw_id
  - Aggregate incoming WebSocket events into structured state objects
  - Provide `getAgentState(adwId)` for current cached state
  - Handle connection failures gracefully with local cache

### Step 6: Add Agent State Streaming Event Types to TypeScript Definitions
- Modify `src/types/eventStream.ts`:
  - Add TypeScript interfaces for agent state streaming events:
    - `AgentStateUpdateEvent`: Full state update
    - `AgentLogEntryEvent`: Individual log entry
    - `FileOperationEvent`: File read/write/modify event
    - `AgentThinkingEvent`: Claude Code thinking block
    - `ToolExecutionEvent`: Tool use pre/post execution
  - Add union type for all agent state event types
  - Export types for use in components and services

### Step 7: Enhance WebSocket Service to Handle Agent State Events
- Modify `src/services/websocket/websocketService.js`:
  - Add event handlers in `handleMessage()` for new event types:
    - `agent_state_update`
    - `agent_log_entry`
    - `file_operation`
    - `agent_thinking`
    - `tool_execution`
  - Add corresponding event listener arrays in `eventListeners` object
  - Emit events to registered listeners
  - Ensure backward compatibility with existing event handlers

### Step 8: Enhance AgentStateViewer Component with Real-Time Updates
- Modify `src/components/kanban/AgentStateViewer.jsx`:
  - Import and use `agentStateStreamService`
  - On component mount, subscribe to agent state updates: `agentStateStreamService.subscribeToAgentState(adwId, handleStateUpdate)`
  - On component unmount, unsubscribe: `agentStateStreamService.unsubscribeFromAgentState(adwId)`
  - Update component state when real-time updates arrive
  - Add visual indicators for real-time updates (e.g., pulse animation, "Live" badge)
  - Keep fallback to REST API if WebSocket is unavailable
  - Display live log entries in a scrollable section
  - Show file operations in real-time
  - Display thinking blocks and tool executions

### Step 9: Create Agent State Detail View Modal (Optional Enhancement)
- Create `src/components/kanban/AgentStateDetailModal.jsx`:
  - Modal component for detailed agent state viewing
  - Tabs for different information types:
    - Overview: Current state snapshot
    - Logs: Real-time log stream
    - Files: File operations history
    - Thinking: Claude Code reasoning
    - Tools: Tool execution history
  - Auto-scroll to latest entries
  - Search/filter functionality
  - Export logs to file
- Integrate modal into `AgentStateViewer` with "View Details" button

### Step 10: Test and Validate Agent State Streaming
- Create test script `server/tests/test_agent_state_stream.py`:
  - Test REST endpoint for agent state updates
  - Test WebSocket broadcasting of agent state changes
  - Verify state persistence and retrieval
  - Test concurrent updates from multiple workflows
- Create integration test in `adws/adw_tests/`:
  - Test end-to-end flow: ADW workflow → WebSocket → Frontend
  - Verify state updates are received in real-time
  - Test failure scenarios (WebSocket down, network issues)
- Manual testing checklist:
  - Start WebSocket server and frontend
  - Trigger ADW workflow (e.g., `uv run adw_plan_iso.py 123`)
  - Verify real-time updates appear in AgentStateViewer
  - Check browser console for WebSocket events
  - Verify state persistence after reconnection

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd server && uv run pytest tests/test_agent_state_stream.py -v` - Run specific tests for agent state streaming
- `npm run typecheck` - Verify TypeScript types are correct
- `npm run lint` - Verify code style and linting passes
- `npm run test` - Run frontend tests
- Manual verification checklist:
  - Start backend server: `cd server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
  - Start frontend: `npm run dev`
  - Open browser to http://localhost:5173
  - Trigger a test workflow: `cd adws && uv run adw_plan_iso.py 999`
  - Verify real-time updates in AgentStateViewer component
  - Check browser DevTools console for WebSocket events
  - Verify no errors in server logs

## Notes

### Architecture Decisions

**Push vs Pull Model:**
- Primary approach: Push-based updates from ADW workflows using `WebSocketNotifier`
- ADW workflows explicitly notify the backend when state changes
- More reliable and immediate than file watching
- Alternative approach (optional): File system watcher for passive monitoring

**WebSocket Event Schema:**
All agent state events follow this structure:
```json
{
  "type": "agent_state_update",
  "data": {
    "adw_id": "c0a43f47",
    "timestamp": "2024-01-15T10:30:00Z",
    "event_type": "state_change",
    "payload": { /* event-specific data */ }
  }
}
```

**Event Types:**
- `agent_state_update`: Full agent state change (from adw_state.json)
- `agent_log_entry`: Individual log entry from workflow execution
- `file_operation`: File read/write/modify notification
- `agent_thinking`: Claude Code thinking block (extended reflection)
- `tool_execution`: Tool use notification (pre/post execution)

**Frontend State Management:**
- `agentStateStreamService` maintains in-memory cache of agent states
- Multiple components can subscribe to same adw_id
- Cache survives WebSocket reconnections
- Falls back to REST API if WebSocket unavailable

**Performance Considerations:**
- Throttle high-frequency updates (e.g., file operations during build)
- Limit log buffer size to prevent memory bloat
- Use compression for large payloads
- Implement pagination for historical data

**Security:**
- WebSocket connections should validate authentication
- Limit access to agent state based on user permissions
- Sanitize file paths before sending to frontend
- Rate limit WebSocket connections

**Error Handling:**
- WebSocket notifications are non-blocking (workflows continue if notification fails)
- Frontend degrades gracefully to polling if WebSocket unavailable
- Log errors but don't crash workflows
- Implement retry logic with exponential backoff

**Testing Strategy:**
- Unit tests for WebSocket notification methods
- Integration tests for end-to-end flow
- Load tests for multiple concurrent workflows
- UI tests for real-time updates in components
- Manual testing with actual ADW workflows

### Implementation Order Rationale

1. Backend first: Create API endpoints and WebSocket infrastructure
2. ADW integration: Modify state management to trigger notifications
3. Frontend service: Create abstraction layer for WebSocket consumption
4. UI components: Update existing components to use real-time data
5. Testing: Validate entire flow works correctly

This order ensures we build from the ground up, testing each layer before moving to the next.

### Backward Compatibility

- All WebSocket notifications should be optional/failsafe
- If WebSocket server is down, workflows continue normally
- Frontend falls back to REST API polling if WebSocket unavailable
- Existing agent state REST endpoints remain functional
- No breaking changes to existing ADW workflow scripts

### Future Enhancements

- Implement agent state persistence to database for historical queries
- Add agent state search and filtering
- Create dashboards for monitoring multiple workflows
- Add real-time performance metrics (CPU, memory, disk usage)
- Implement agent state replay functionality
- Add collaborative features (multiple users watching same workflow)
