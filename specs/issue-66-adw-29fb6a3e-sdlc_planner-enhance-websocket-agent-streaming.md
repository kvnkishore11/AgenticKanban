# Chore: Enhance WebSocket Agent Streaming

## Metadata
issue_number: `66`
adw_id: `29fb6a3e`
issue_json: `{"number":66,"title":"/Users/kvnkishore/WebstormProjects/multi-agent-orc...","body":"/Users/kvnkishore/WebstormProjects/multi-agent-orchestration/apps/orchestrator_3_stream/backend/modules/websocket_manager.py\n\ntake inspiration from this projects websocket manager and see if you can incorporate couple of things into our own codebase. especially agents/{adw_id} has lots of information you need to tap into to stream them to frontend from the websocket"}`

## Chore Description
Enhance the WebSocket agent streaming infrastructure by taking inspiration from the multi-agent-orchestration project's WebSocket manager. The goal is to tap into the rich agent state information available in the `agents/{adw_id}` directories and stream it to the frontend in real-time for better visibility into ADW workflow execution.

The reference WebSocket manager (`/Users/kvnkishore/WebstormProjects/multi-agent-orchestration/apps/orchestrator_3_stream/backend/modules/websocket_manager.py`) demonstrates several valuable patterns:

1. **Rich Event Broadcasting Methods**: Dedicated methods for different event types (agent creation, updates, status changes, logs, summaries)
2. **Agent-Specific Streaming**: Granular streaming of agent state updates including chat streams, typing indicators, and agent summary updates
3. **Connection Metadata Tracking**: Enhanced connection management with client metadata
4. **Heartbeat Mechanism**: Built-in heartbeat/ping functionality for connection health
5. **Comprehensive Event Types**: Multiple event types for different aspects of agent execution

Our current implementation already has a foundation for agent state streaming but can be enhanced with:
- Better integration with `agents/{adw_id}` directory structure to stream agent logs, state changes, and workflow progress
- More granular event types for different phases of ADW execution (planning, building, testing, reviewing, documenting)
- Enhanced connection metadata and health monitoring
- Improved error handling and client-specific messaging

## Relevant Files
Use these files to resolve the chore:

### Backend WebSocket Infrastructure
- **`server/core/websocket_manager.py`** (existing) - Core WebSocket manager that needs enhancement
  - Already has comprehensive streaming methods: `broadcast_agent_log()`, `broadcast_agent_summary_update()`, `broadcast_chat_stream()`, `broadcast_thinking_block()`, `broadcast_tool_use_pre()`, `broadcast_tool_use_post()`, `broadcast_file_changed()`, `broadcast_summary_update()`, `broadcast_text_block()`
  - Has connection management with metadata tracking
  - Needs better integration with agents directory structure
  - Could benefit from heartbeat/ping functionality

- **`server/api/agent_state_stream.py`** (existing) - API endpoints for receiving agent state updates
  - Already has endpoints for different event types: `/agent-state-update`, `/agent-log-entry`, `/file-operation`, `/agent-thinking`, `/tool-execution`, `/agent-state/{adw_id}`
  - Properly routes events to WebSocket manager broadcast methods
  - Minimal changes needed, possibly add new event types

- **`server/server.py`** (existing) - Main FastAPI server with WebSocket endpoint
  - Has `/ws` WebSocket endpoint for real-time event broadcasting
  - Stores `ws_manager` in `app.state` for route access
  - May need heartbeat/ping handling in WebSocket endpoint

### ADW WebSocket Client
- **`adws/adw_modules/websocket_client.py`** (existing) - HTTP-based client for ADW workflows to send updates
  - Has `WebSocketNotifier` class for sending workflow updates via HTTP
  - Already has granular agent state update methods: `send_agent_state_update()`, `send_agent_log_entry()`, `send_file_operation()`, `send_agent_thinking()`, `send_tool_execution()`, `send_text_block()`
  - Posts to `/api/agent-state-update` endpoint on WebSocket server
  - Should be enhanced to read from `agents/{adw_id}` directory structure

### Frontend WebSocket Service
- **`src/services/websocket/websocketService.js`** (existing) - Client-side WebSocket service
  - Already handles agent state streaming events: `agent_summary_update`, `agent_log`, `thinking_block`, `tool_use_pre`, `tool_use_post`, `file_changed`, `text_block`, `summary_update`
  - Has event listeners for all streaming event types
  - Has connection management with heartbeat, reconnection, and health monitoring
  - Minimal changes needed, ensure all new event types are handled

### Reference Documentation
- **`app_docs/feature-7b25b54d-workflow-log-handler.md`** (existing) - Documents WebSocket message handling patterns
  - Shows how to add new message type handlers in `websocketService.js`
  - Demonstrates event emission pattern

- **`README.md`** (existing) - Project overview and architecture
  - Documents WebSocket real-time communication in architecture section
  - Explains ADW automation layer and workflow stages

- **`adws/README.md`** (existing) - ADW system documentation
  - Explains agents directory structure and state management
  - Documents `agents/{adw_id}/adw_state.json` format and purpose
  - Describes isolated workflow execution and state tracking

### New Files
None - all enhancements will be made to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Analyze agents/{adw_id} Directory Structure
- Read the ADW README to understand the `agents/{adw_id}` directory structure
- Examine a sample `agents/{adw_id}/adw_state.json` file to understand available state data
- Identify what information is available but not currently streamed:
  - Workflow output structure (`planner/`, `implementor/`, `tester/`, `reviewer/`, `documenter/` directories)
  - Raw Claude Code session outputs (`raw_output.jsonl` files)
  - Review screenshots (`reviewer/review_img/` directory)
  - Patch resolution attempts
  - Plan specifications
- Document the gaps between available data and what's currently being streamed

### Step 2: Enhance WebSocket Manager with Additional Event Methods
- Add heartbeat/ping broadcast method to `server/core/websocket_manager.py`:
  - Implement `broadcast_heartbeat()` method for periodic connection health checks
  - Add timestamp and active connection count in heartbeat payload
- Add workflow phase transition event:
  - Implement `broadcast_workflow_phase_transition()` for plan → build → test → review → document transitions
  - Include phase name, timestamp, and ADW ID
- Add agent directory content streaming:
  - Implement `broadcast_agent_output_chunk()` for streaming raw_output.jsonl chunks
  - Implement `broadcast_screenshot_available()` for notifying when review screenshots are ready
  - Implement `broadcast_spec_created()` for notifying when plan spec is created
- Ensure all new methods follow existing patterns:
  - Use `datetime.utcnow().isoformat() + 'Z'` for timestamps
  - Include `adw_id` in all events
  - Use `await self._broadcast(event)` for broadcasting
  - Add proper error handling and logging

### Step 3: Add API Endpoints for New Event Types
- Add new endpoints to `server/api/agent_state_stream.py`:
  - `POST /workflow-phase-transition` - For phase transitions
  - `POST /agent-output-chunk` - For streaming raw output chunks
  - `POST /screenshot-available` - For screenshot notifications
  - `POST /spec-created` - For spec creation notifications
- Use Pydantic models for request validation:
  - Create `WorkflowPhaseTransitionRequest` model
  - Create `AgentOutputChunkRequest` model
  - Create `ScreenshotAvailableRequest` model
  - Create `SpecCreatedRequest` model
- Route each endpoint to appropriate WebSocket manager broadcast method
- Add proper error handling and HTTP response codes

### Step 4: Enhance ADW WebSocket Client to Stream Directory Data
- Enhance `adws/adw_modules/websocket_client.py` to read from agents directory:
  - Add `send_workflow_phase_transition()` method
  - Add `send_agent_output_chunk()` method for streaming raw_output.jsonl
  - Add `send_screenshot_available()` method
  - Add `send_spec_created()` method
- Add helper methods to read from agents directory:
  - `_read_raw_output_jsonl()` - Tail raw_output.jsonl files
  - `_check_for_screenshots()` - Check reviewer/review_img/ directory
  - `_check_for_spec()` - Check for plan spec file
- Ensure all methods properly handle file I/O errors and missing directories
- Add logging for debugging

### Step 5: Update Frontend WebSocket Service Event Handlers
- Add event listeners to `src/services/websocket/websocketService.js`:
  - Add `workflow_phase_transition` to `eventListeners` object
  - Add `agent_output_chunk` to `eventListeners` object
  - Add `screenshot_available` to `eventListeners` object
  - Add `spec_created` to `eventListeners` object
  - Add `heartbeat` to `eventListeners` object (if not already present)
- Add case handlers in `handleMessage()` switch statement:
  - Case for `workflow_phase_transition` - emit event with data
  - Case for `agent_output_chunk` - emit event with data
  - Case for `screenshot_available` - emit event with data
  - Case for `spec_created` - emit event with data
  - Case for `heartbeat` - emit event with data
- Follow the pattern from `app_docs/feature-7b25b54d-workflow-log-handler.md`
- Ensure no "Unknown message type" warnings are logged for new events

### Step 6: Add Heartbeat/Ping to WebSocket Endpoint
- Update `server/server.py` WebSocket endpoint (`/ws`):
  - Add ping/pong message handling in the receive loop
  - When client sends `{"type": "ping"}`, respond with `{"type": "pong", "timestamp": ...}`
  - Add periodic server-initiated heartbeat (optional, can be client-initiated only)
- Update `src/services/websocket/websocketService.js`:
  - Ensure heartbeat mechanism properly handles pong responses
  - Update connection quality metrics based on heartbeat latency

### Step 7: Enhance Connection Metadata Tracking
- Update `server/core/websocket_manager.py`:
  - Add more metadata fields to `connection_data` dictionary:
    - `user_agent`: Browser user agent string
    - `remote_address`: Client IP address (if available)
    - `subscribed_adw_ids`: List of ADW IDs the client is interested in
  - Add method to update client subscriptions: `subscribe_to_adw(connection_id, adw_id)`
  - Add method to get connections subscribed to specific ADW: `get_subscribers(adw_id)`
- Update broadcast methods to support targeted broadcasting:
  - Add optional `target_adw_subscribers` parameter to `_broadcast()`
  - Only send events to clients subscribed to the relevant ADW ID
  - Maintain backward compatibility with broadcasting to all clients

### Step 8: Add Error Handling and Client-Specific Messaging
- Enhance error handling in `server/core/websocket_manager.py`:
  - Add `send_error_to_client()` method for sending errors to specific clients
  - Add validation for event payloads before broadcasting
  - Add rate limiting detection and logging
- Add client-specific messaging in `server/core/websocket_manager.py`:
  - Add `send_to_client_by_id()` method to send messages to specific connection IDs
  - Update `broadcast_agent_log()` to support targeted delivery
- Update frontend to handle error messages:
  - Add error event listener in `websocketService.js`
  - Display user-friendly error notifications

### Step 9: Integration Testing
- Test heartbeat mechanism:
  - Start WebSocket server and connect frontend client
  - Verify ping/pong exchanges occur
  - Verify connection quality metrics update
- Test new event types:
  - Trigger an ADW workflow (e.g., `uv run adw_plan_iso.py <issue-number>`)
  - Verify `workflow_phase_transition` events are received
  - Verify `spec_created` event is received when plan is created
  - Verify `agent_output_chunk` events stream during execution
  - Verify `screenshot_available` events when review screenshots are taken
- Test targeted broadcasting:
  - Connect multiple clients
  - Subscribe different clients to different ADW IDs
  - Verify each client only receives events for subscribed ADWs
- Test error handling:
  - Simulate malformed event payloads
  - Verify errors are sent to specific clients
  - Verify other clients are not affected
- Check browser console for:
  - No "Unknown message type" warnings
  - Proper event logging
  - Connection status updates

### Step 10: Documentation and Code Quality
- Update `server/core/websocket_manager.py` docstrings:
  - Document all new broadcast methods with Args, Returns
  - Document new connection metadata fields
  - Document targeted broadcasting capability
- Update `adws/adw_modules/websocket_client.py` docstrings:
  - Document new send methods
  - Document agents directory integration
- Update `app_docs/` with new feature documentation:
  - Create feature documentation file describing enhancements
  - Include usage examples
  - Document event payload formats
- Add inline comments for complex logic:
  - Agents directory reading logic
  - Targeted broadcasting implementation

### Step 11: Validation Commands
Execute every command to validate the chore is complete with zero regressions.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && python -m pytest tests/ -v` - Run all server tests to ensure no regressions
- `npm run typecheck` - Verify TypeScript types are correct in frontend
- `npm run build` - Build frontend to catch any compilation errors
- `cd server && python -c "from core.websocket_manager import WebSocketManager; ws = WebSocketManager(); print('WebSocket manager imports successfully')"` - Verify WebSocket manager imports without errors
- `cd server && python -c "from api.agent_state_stream import router; print('Agent state stream API imports successfully')"` - Verify API endpoints import correctly
- `cd adws && python -c "from adw_modules.websocket_client import WebSocketNotifier; n = WebSocketNotifier('test1234'); print('WebSocket client imports successfully')"` - Verify ADW client imports correctly

## Notes

### Key Improvements from Reference Implementation
1. **Enhanced Event Granularity**: The reference WebSocket manager has dedicated methods for different agent lifecycle events. We should ensure our implementation has similar granularity for ADW-specific events.

2. **Connection Metadata**: The reference implementation tracks client metadata in `connection_metadata` dictionary. This is useful for debugging and targeted messaging.

3. **Heartbeat/Ping**: The reference has `send_heartbeat()` method. This is valuable for connection health monitoring and detecting stale connections.

4. **Typing Indicators**: The reference has `set_typing_indicator()` for chat applications. While not directly applicable, the pattern of real-time state indicators is useful for showing ADW execution progress.

5. **Client-Specific Messaging**: The reference has `send_to_client()` method for targeted delivery. This is valuable for sending errors or notifications to specific clients.

### Current State Analysis
Our codebase already has a strong foundation:
- `server/core/websocket_manager.py` has comprehensive broadcast methods for agent state streaming
- `server/api/agent_state_stream.py` has proper API endpoints for receiving state updates
- `adws/adw_modules/websocket_client.py` has granular methods for sending different event types
- `src/services/websocket/websocketService.js` has event listeners for all agent state events
- Frontend has connection management with heartbeat and reconnection logic

### Integration with agents/{adw_id}
The `agents/{adw_id}` directory structure contains rich information:
- `adw_state.json` - Persistent state tracking worktree, ports, issue info
- `{adw_id}_plan_spec.md` - Implementation plan
- `planner/raw_output.jsonl` - Planning agent Claude Code session
- `implementor/raw_output.jsonl` - Implementation agent session
- `tester/raw_output.jsonl` - Test agent session
- `reviewer/raw_output.jsonl` - Review agent session
- `reviewer/review_img/` - Screenshots directory
- `documenter/raw_output.jsonl` - Documentation agent session

This data should be streamed to the frontend for real-time visibility into ADW execution.

### Backward Compatibility
All enhancements must maintain backward compatibility:
- Existing event types must continue to work
- Existing API endpoints must remain functional
- Frontend must handle both old and new event formats
- No breaking changes to WebSocket protocol

### Performance Considerations
- Streaming large files (raw_output.jsonl) should be chunked to avoid overwhelming WebSocket connections
- Consider debouncing rapid agent state updates
- Rate limiting for malicious or misbehaving clients
- Efficient file watching for agents directory changes (don't poll, use file system events if possible)

### Security Considerations
- Validate all ADW IDs before reading from agents directory (must be 8 alphanumeric characters)
- Prevent path traversal attacks when reading agent files
- Sanitize file paths before broadcasting to clients
- Rate limit WebSocket connections and messages
