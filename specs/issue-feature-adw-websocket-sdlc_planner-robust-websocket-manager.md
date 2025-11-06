# Feature: Robust WebSocket Manager with Detailed Agent-Level Streaming

## Metadata
issue_number: `feature`
adw_id: `websocket`
issue_json: `{"title": "Implement robust WebSocket manager with detailed agent-level streaming", "body": "this projects websocket manager seems to be so robust. I want to have similar websocket manager especially giving into details of not just logs of high level stage transitions but also what is happening at the agent level the streaming etc."}`

## Feature Description
Implement a comprehensive Python-based WebSocket manager similar to the reference implementation that handles WebSocket connections and event broadcasting for real-time updates. The manager will provide granular visibility into agent-level operations including thinking blocks, tool executions, file changes, and streaming responses by actively monitoring the `agents/{adw_id}` directory structure. This includes real-time streaming of raw_output.jsonl files, adw_state.json monitoring, execution log tailing, and screenshot detection. This will replace or enhance the current WebSocket infrastructure to provide detailed real-time insights into AI agent workflows beyond just high-level stage transitions.

## User Story
As a developer monitoring AI agent workflows
I want a robust WebSocket manager that broadcasts detailed agent-level events in real-time by monitoring the agents/{adw_id} directory
So that I can observe granular agent operations including thinking, tool usage, file modifications, streaming outputs, state changes, and screenshots with proper connection management and error handling

## Problem Statement
The current WebSocket infrastructure may lack the granularity and robustness needed to provide detailed insights into agent operations. Developers need visibility into:
- Agent thinking/reasoning blocks
- Tool execution (pre/post events)
- File operations with diffs
- Text block streaming
- Agent status updates with summaries
- Real-time streaming of raw_output.jsonl files from agents/{adw_id}/sdlc_{role}/
- Monitoring of adw_state.json for state changes in agents/{adw_id}/
- Detection of new screenshots in agents/{adw_id}/sdlc_reviewer/review_img/
- Tailing of execution.log files for each agent phase
- Detection of new spec files in specs/ directory
- Connection health monitoring
- Proper error handling and reconnection logic

## Solution Statement
Create a Python-based WebSocket manager module (`websocket_manager.py`) and agent directory monitor (`agent_directory_monitor.py`) that:
1. Manages WebSocket connections with metadata tracking
2. Provides specific broadcast methods for different event types (agent_created, agent_updated, agent_log, thinking_block, tool_use, file_changed, etc.)
3. Monitors the agents/{adw_id} directory structure for real-time changes:
   - Watches adw_state.json for state changes
   - Tails raw_output.jsonl files for streaming agent output
   - Monitors execution.log files for detailed execution logs
   - Detects new screenshots in review_img directories
   - Detects new spec files in specs/ directory
4. Parses JSONL files and broadcasts structured events to WebSocket clients
5. Handles connection lifecycle (connect, disconnect, heartbeat)
6. Implements error handling and connection health monitoring
7. Broadcasts events to all connected clients with proper JSON formatting
8. Integrates with the existing ADW trigger WebSocket server
9. Uses file watchers or background polling threads to monitor directory changes

## Relevant Files
Use these files to implement the feature:

- `adws/adw_triggers/trigger_websocket.py` - Main WebSocket server that will integrate the new manager
  - Contains ConnectionManager class that can be enhanced or replaced
  - Handles WebSocket endpoint /ws/trigger
  - Already broadcasts workflow logs and status updates

- `adws/adw_modules/websocket_client.py` - WebSocket client/notifier used by workflows
  - Provides methods to send various event types to WebSocket server
  - Already has granular agent state update methods (send_agent_log_entry, send_file_operation, send_agent_thinking, send_tool_execution, send_text_block)
  - Needs to integrate with new broadcast event types

- `src/services/websocket/websocketService.js` - Frontend WebSocket client
  - Receives and handles events from WebSocket server
  - Already handles agent_summary_update, agent_log, thinking_block, tool_use_pre, tool_use_post, file_changed, text_block events
  - May need to add handlers for new event types

- `src/services/agentStateStreamService.js` - Frontend service for managing agent state subscriptions
  - Subscribes to agent state updates for specific ADW IDs
  - Caches agent states and notifies subscribers
  - Handles various agent event types (logs, thinking, tool executions, file changes)

- `src/types/eventStream.ts` - TypeScript type definitions for event streams
  - Defines structured event types for log streaming and workflow updates
  - Contains interfaces for AgentLogEvent, ThinkingBlockEvent, ToolUseBlockEvent, FileOperationEvent, etc.

- `agents/{adw_id}/` - Agent directory structure to monitor
  - `adw_state.json` - State file tracking workflow progress, issue info, branch name, completion status
  - `sdlc_planner/raw_output.jsonl` - JSONL file with planner agent output
  - `sdlc_implementor/raw_output.jsonl` - JSONL file with implementor agent output
  - `sdlc_tester/raw_output.jsonl` - JSONL file with tester agent output
  - `sdlc_reviewer/raw_output.jsonl` - JSONL file with reviewer agent output
  - `sdlc_reviewer/review_img/` - Directory containing review screenshots
  - `sdlc_documenter/raw_output.jsonl` - JSONL file with documenter agent output
  - `{workflow_name}/execution.log` - Execution logs for each workflow phase

### New Files
- `adws/adw_modules/websocket_manager.py` - New WebSocket manager module inspired by reference implementation
- `adws/adw_modules/agent_directory_monitor.py` - Agent directory monitoring module that watches agents/{adw_id} for changes
- `.claude/commands/e2e/test_websocket_agent_streaming.md` - E2E test to validate agent-level event streaming works correctly

## Implementation Plan

### Phase 1: Foundation
Create the core WebSocket manager module with connection management capabilities:
- Set up module structure with proper imports
- Implement WebSocketManager class with connection tracking
- Add metadata storage for each connection
- Implement connection/disconnection handlers
- Add logging utilities

### Phase 2: Core Implementation
Implement the event broadcasting system with specific methods for each event type:
- Add base broadcast method with JSON serialization
- Implement agent-specific broadcast methods (agent_created, agent_updated, agent_deleted, agent_status_change)
- Add agent log broadcasting (broadcast_agent_log, broadcast_agent_summary_update)
- Implement detailed agent operation broadcasts (thinking_block, tool_use, file_changed, text_block)
- Add orchestrator update broadcasting
- Implement system log and error broadcasting
- Add chat streaming methods (broadcast_chat_stream, set_typing_indicator)
- Add heartbeat mechanism

### Phase 3: Agent Directory Monitoring
Create agent directory monitoring module to watch agents/{adw_id} for real-time changes:
- Implement AgentDirectoryMonitor class with file watching capabilities
- Add methods to monitor adw_state.json for state changes
- Implement JSONL file tailing for raw_output.jsonl files (planner, implementor, tester, reviewer, documenter)
- Add execution.log monitoring for each agent phase
- Implement screenshot detection in review_img directories
- Add spec file detection in specs/ directory
- Parse JSONL lines and extract structured data (thinking blocks, tool use, file changes, text blocks)
- Use watchdog library or polling mechanism for file monitoring
- Integrate with WebSocketManager to broadcast detected events

### Phase 4: Integration
Integrate the new WebSocket manager and directory monitor with existing infrastructure:
- Replace or enhance ConnectionManager in trigger_websocket.py
- Start AgentDirectoryMonitor background tasks when workflows are triggered
- Update websocket_client.py to use new broadcast methods
- Add new HTTP endpoints for agent state updates (/api/agent-state-update, /api/workflow-phase-transition, etc.)
- Ensure frontend websocketService.js can receive new event types
- Update agentStateStreamService.js to handle new events
- Add type definitions to eventStream.ts if needed

## Step by Step Tasks

### 1. Create WebSocket Manager Module
- Create `adws/adw_modules/websocket_manager.py` file
- Implement `WebSocketManager` class with `__init__` method
- Add `active_connections` list and `connection_metadata` dictionary
- Import required dependencies (FastAPI WebSocket, datetime, typing, logging)

### 2. Implement Connection Management
- Add `connect(websocket, client_id)` async method to accept connections
- Add `disconnect(websocket)` method to remove connections
- Add `send_to_client(websocket, data)` async method for single client messaging
- Add `get_connection_count()` and `get_all_client_ids()` helper methods
- Implement connection metadata tracking (client_id, connected_at timestamp)

### 3. Implement Base Broadcasting
- Add `broadcast(data, exclude)` async method to send to all clients
- Implement timestamp auto-injection if not present
- Add error handling for failed sends with disconnection cleanup
- Add logging for broadcast operations

### 4. Add Agent Event Broadcasting Methods
- Implement `broadcast_agent_created(agent_data)` method
- Implement `broadcast_agent_updated(agent_id, agent_data)` method
- Implement `broadcast_agent_deleted(agent_id)` method
- Implement `broadcast_agent_status_change(agent_id, old_status, new_status)` method
- Implement `broadcast_agent_log(log_data)` method with detailed event information
- Implement `broadcast_agent_summary_update(agent_id, summary)` method

### 5. Add Detailed Agent Operation Broadcasting
- Implement `broadcast_thinking_block(adw_id, content, reasoning_type)` method
- Implement `broadcast_tool_use_pre(adw_id, tool_name, tool_input)` method
- Implement `broadcast_tool_use_post(adw_id, tool_name, tool_output, status, error)` method
- Implement `broadcast_file_changed(adw_id, file_path, operation, diff, summary, lines_added, lines_removed)` method
- Implement `broadcast_text_block(adw_id, content, sequence)` method

### 6. Add System and Chat Broadcasting
- Implement `broadcast_orchestrator_updated(orchestrator_data)` method
- Implement `broadcast_system_log(log_data)` method
- Implement `broadcast_error(error_message, details)` method
- Implement `broadcast_chat_message(message_data)` method
- Implement `broadcast_chat_stream(orchestrator_agent_id, chunk, is_complete)` method
- Implement `set_typing_indicator(orchestrator_agent_id, is_typing)` method

### 7. Add Heartbeat Mechanism
- Implement `send_heartbeat()` async method
- Send heartbeat with timestamp, active_connections count
- Include connection quality metrics if available

### 8. Create Global Manager Instance
- Create global `ws_manager` instance of WebSocketManager
- Add `get_websocket_manager()` function to return singleton
- Add proper module exports

### 9. Create Agent Directory Monitor Module
- Create `adws/adw_modules/agent_directory_monitor.py` file
- Implement `AgentDirectoryMonitor` class with `__init__` method
- Add parameters: adw_id, agents_base_dir (default: "agents"), websocket_manager reference
- Import watchdog library or implement polling mechanism for file watching
- Add logger setup for monitoring operations

### 10. Implement ADW State Monitoring
- Add `monitor_adw_state()` method to watch `agents/{adw_id}/adw_state.json`
- Detect file creation, modification, deletion events
- Parse JSON and extract: issue_number, issue_class, branch_name, completed status, workflow_step
- Broadcast state changes via websocket_manager.broadcast_agent_updated()
- Track previous state to identify what changed (changed_fields list)

### 11. Implement JSONL File Streaming
- Add `tail_raw_output_jsonl(agent_role)` method for each agent role (planner, implementor, tester, reviewer, documenter)
- Monitor `agents/{adw_id}/sdlc_{role}/raw_output.jsonl` files
- Parse each new JSONL line as it's written
- Extract event type from JSONL structure (thinking_block, tool_use, text_block, etc.)
- Broadcast appropriate event via websocket_manager (broadcast_thinking_block, broadcast_tool_use_pre, broadcast_tool_use_post, broadcast_text_block)
- Track file position to only read new lines (tail behavior)
- Handle file rotation and creation

### 12. Implement Execution Log Monitoring
- Add `monitor_execution_log(workflow_name)` method
- Watch `agents/{adw_id}/{workflow_name}/execution.log` files
- Tail new log lines as they're written
- Parse log level and message from each line
- Broadcast via websocket_manager.broadcast_agent_log()
- Support multiple concurrent workflow logs

### 13. Implement Screenshot Detection
- Add `monitor_screenshots()` method
- Watch `agents/{adw_id}/sdlc_reviewer/review_img/` directory
- Detect new .png, .jpg, .jpeg, .gif files
- Extract metadata (file size, creation time, file name)
- Broadcast via websocket_manager.broadcast_screenshot_available()
- Track already-detected screenshots to avoid duplicates

### 14. Implement Spec File Detection
- Add `monitor_spec_files()` method
- Watch `specs/` directory for files matching pattern `*{adw_id}*.md`
- Detect new spec file creation
- Extract metadata (file path, creation time, file size)
- Read first few lines to extract spec type (plan, patch, review)
- Broadcast via websocket_manager.broadcast_spec_created()

### 15. Implement File Watcher Integration
- Add `start_monitoring()` method to start all file watchers
- Use watchdog library's Observer pattern or implement polling threads
- Create separate watchers for: adw_state.json, each raw_output.jsonl, execution logs, screenshots, spec files
- Add `stop_monitoring()` method to gracefully stop all watchers
- Handle watcher errors and restart watchers if they fail

### 16. Add JSONL Parser Helper Methods
- Add `parse_jsonl_line(line)` helper method
- Extract event_type, timestamp, content from JSONL structure
- Handle different JSONL formats (thinking blocks, tool use, text blocks, file changes)
- Return structured dict ready for WebSocket broadcasting
- Handle malformed JSONL with error logging

### 17. Integrate with trigger_websocket.py
- Import new websocket_manager module
- Replace or enhance existing ConnectionManager with new WebSocketManager
- Update WebSocket endpoint handlers to use new manager methods
- Ensure all existing broadcast calls work with new manager

### 18. Start Directory Monitoring on Workflow Trigger
- In trigger_websocket.py's `trigger_workflow()` function, after starting workflow process
- Create AgentDirectoryMonitor instance for the adw_id
- Start background monitoring task: `monitor.start_monitoring()`
- Store monitor instance in global registry keyed by adw_id
- Add cleanup on workflow completion or error

### 19. Add Agent State Update HTTP Endpoints
- Add `/api/agent-state-update` POST endpoint to trigger_websocket.py
- Handle event types: state_change, log_entry, file_operation, thinking, tool_execution, text_block
- Validate required fields based on event type
- Broadcast events to WebSocket clients using appropriate manager methods
- Return success/error response

### 20. Add Enhanced Agent Directory Streaming Endpoints
- Add `/api/workflow-phase-transition` POST endpoint for phase transitions
- Add `/api/agent-output-chunk` POST endpoint for raw_output.jsonl streaming
- Add `/api/screenshot-available` POST endpoint for screenshot notifications
- Add `/api/spec-created` POST endpoint for spec file notifications
- Each endpoint should broadcast to all connected WebSocket clients

### 21. Update websocket_client.py Integration
- Verify all existing send methods in websocket_client.py work with new endpoints
- Test send_agent_log_entry, send_file_operation, send_agent_thinking, send_tool_execution, send_text_block
- Test send_workflow_phase_transition, send_agent_output_chunk, send_screenshot_available, send_spec_created
- Ensure proper error handling and connection failure resilience

### 22. Verify Frontend Integration
- Verify websocketService.js handles all event types
- Check that agentStateStreamService.js properly processes new events
- Ensure eventStream.ts type definitions cover all event types
- Test real-time updates in UI for agent-level operations

### 23. Create E2E Test File
- Create `.claude/commands/e2e/test_websocket_agent_streaming.md`
- Define test steps to:
  1. Start WebSocket server and frontend
  2. Connect WebSocket client
  3. Trigger a test workflow (e.g., adw_plan_iso on a simple issue)
  4. Verify adw_state.json changes are broadcast (agent_state_update events)
  5. Verify raw_output.jsonl streaming works (agent_log events from JSONL parsing)
  6. Verify thinking_block events are received from JSONL
  7. Verify tool_use_pre and tool_use_post events are received from JSONL
  8. Verify file_changed events are received from JSONL
  9. Verify text_block events are received from JSONL
  10. Verify execution.log tailing broadcasts agent_log events
  11. Verify screenshot_available events when screenshots are created
  12. Verify spec_created events when spec files are written
  13. Verify heartbeat mechanism works
  14. Take screenshots of UI showing real-time agent activity from directory monitoring
- Include success criteria and validation commands

### 24. Add Monitor Cleanup and Resource Management
- Add method to stop monitoring for a specific adw_id when workflow completes
- Implement `cleanup_monitor(adw_id)` in trigger_websocket.py
- Call cleanup on workflow completion, failure, or timeout
- Remove monitor from global registry
- Stop all file watchers and close file handles
- Free up resources to prevent memory leaks

### 25. Run Validation Commands
- Execute all validation commands to ensure feature works correctly with zero regressions
- Run E2E test to validate agent-level streaming works end-to-end
- Verify WebSocket connection health and reconnection logic
- Test with multiple concurrent connections
- Validate all event types are properly broadcast and received

## Testing Strategy

### Unit Tests
- Test WebSocketManager connection management (connect, disconnect)
- Test broadcast methods for each event type
- Test error handling for failed sends
- Test metadata tracking for connections
- Test heartbeat mechanism
- Mock WebSocket connections for isolated testing
- Test AgentDirectoryMonitor file watching (with temp files)
- Test JSONL parsing with sample JSONL lines
- Test adw_state.json change detection
- Test screenshot detection logic
- Test spec file detection logic

### Integration Tests
- Test WebSocket server with real connections
- Test HTTP endpoints posting to WebSocket broadcasts
- Test websocket_client.py sending events through new endpoints
- Test frontend receiving and processing events
- Test connection lifecycle (connect, disconnect, reconnect)
- Test AgentDirectoryMonitor with real agents/{adw_id} directory
- Test JSONL streaming with real raw_output.jsonl files
- Test execution.log tailing with real log files
- Test directory monitoring across full workflow execution

### Edge Cases
- Multiple concurrent WebSocket connections
- Connection drops during broadcast
- Malformed event data
- Missing required fields in events
- Server restart with active connections
- Network interruptions and reconnection
- High-frequency event streaming (performance)
- WebSocket buffer overflow with rapid events
- Missing agents/{adw_id} directory when monitoring starts
- JSONL files created after monitor starts
- Malformed JSONL lines (incomplete, invalid JSON)
- File rotation or truncation during monitoring
- Multiple workflows for same adw_id
- Concurrent file writes to raw_output.jsonl
- Screenshot files deleted or moved while monitoring
- Spec files modified after creation
- File system errors (permissions, disk full)
- Monitor cleanup while files are being watched

## Acceptance Criteria
- WebSocket manager successfully manages multiple concurrent connections
- All agent-level events (thinking, tool use, file changes, text blocks) are broadcast in real-time
- AgentDirectoryMonitor successfully watches agents/{adw_id} directory and detects all changes
- adw_state.json changes are detected and broadcast as agent state updates
- raw_output.jsonl files are tailed in real-time and JSONL lines are parsed and broadcast
- Execution logs are monitored and new log entries are broadcast
- Screenshots are detected when created in review_img directories
- Spec files are detected when created in specs/ directory
- Frontend receives and displays detailed agent operation logs from directory monitoring
- Connection health monitoring and heartbeat mechanism works correctly
- Error handling properly catches and logs failures without crashing
- Existing high-level stage transition functionality continues to work
- New HTTP endpoints accept agent state updates and broadcast to clients
- Monitor cleanup properly stops watchers and frees resources when workflows complete
- E2E test validates end-to-end agent streaming from directory monitoring works correctly
- Documentation clearly explains how to use each broadcast method and monitor
- Performance remains acceptable with multiple connections, monitors, and high event frequency

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cd adws && uv run pytest adw_tests/` - Run ADW tests to ensure WebSocket integration works
- `cd adws && uv run python adw_triggers/trigger_websocket.py &` - Start WebSocket server in background
- `curl http://localhost:8500/health` - Verify WebSocket server is running and healthy
- `cd adws && uv run python -c "from adw_modules.websocket_manager import get_websocket_manager; print('WebSocket manager import successful')"` - Verify WebSocket manager module can be imported
- `cd adws && uv run python -c "from adw_modules.agent_directory_monitor import AgentDirectoryMonitor; print('Agent directory monitor import successful')"` - Verify agent directory monitor module can be imported
- `ls -la agents/` - Verify agents directory exists and has proper permissions
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_agent_streaming.md` test file to validate agent-level streaming from directory monitoring works correctly
- `bun tsc --noEmit` - Run frontend TypeScript type checking
- `bun run build` - Run frontend build to validate no compilation errors

## Notes

### Key Design Decisions
1. **Python-based Manager**: Use Python for the WebSocket manager to integrate seamlessly with existing FastAPI WebSocket server in trigger_websocket.py
2. **Event Type Granularity**: Provide specific broadcast methods for each event type rather than generic broadcasting to ensure type safety and clear intent
3. **Connection Metadata**: Track detailed metadata for each connection (client_id, connection time, activity) to enable health monitoring and debugging
4. **Error Resilience**: Implement comprehensive error handling to ensure one failed connection doesn't affect others
5. **Heartbeat Mechanism**: Include heartbeat to detect stale connections and maintain connection health
6. **Directory Monitoring**: Use watchdog library (or polling) to monitor agents/{adw_id} directory for real-time file changes
7. **JSONL Streaming**: Tail raw_output.jsonl files and parse each line as structured events for granular agent visibility
8. **Monitor Lifecycle**: Create monitor instances per adw_id when workflow starts, cleanup when workflow completes
9. **File Watching vs Polling**: Prefer watchdog file system events for efficiency, fall back to polling if watchdog unavailable

### Integration with Existing Code
- The new WebSocketManager should enhance or replace the existing ConnectionManager in trigger_websocket.py
- websocket_client.py already has granular methods (send_agent_thinking, send_tool_execution, etc.) that will work with new HTTP endpoints
- Frontend websocketService.js and agentStateStreamService.js already handle many agent event types, minimal changes needed

### Reference Implementation Notes
The reference WebSocket manager provides inspiration for:
- Connection management with metadata tracking
- Specific broadcast methods for different event types
- Heartbeat mechanism for connection health
- Error handling and automatic disconnection cleanup
- Global singleton instance pattern

### Performance Considerations
- Use async/await for all WebSocket operations to avoid blocking
- Implement efficient broadcast that only iterates active connections once
- Consider rate limiting or throttling for high-frequency events if needed
- Monitor memory usage with connection metadata to prevent leaks
- Use watchdog for efficient file system monitoring instead of polling when possible
- Tail files efficiently by tracking file position, not re-reading entire file
- Limit JSONL parsing batch size to avoid blocking event loop
- Clean up monitors and file handles when workflows complete to prevent resource exhaustion
- Consider debouncing rapid file changes (e.g., multiple JSONL writes in quick succession)
- Use background threads for blocking I/O (file reading) to keep async event loop responsive

### Future Enhancements
- Add WebSocket connection pooling for scalability
- Implement message queuing for offline clients
- Add event filtering so clients can subscribe to specific event types
- Implement connection authentication and authorization
- Add metrics and monitoring for WebSocket health
- Consider using Redis pub/sub for multi-server WebSocket broadcasting
- Implement intelligent file watching with inotify on Linux for better performance
- Add replay capability to stream historical JSONL events when client connects late
- Implement compression for large JSONL payloads before WebSocket transmission
- Add configurable monitoring granularity (full vs summary mode)
- Support real-time diff generation for file changes detected in agents directory
- Implement monitor health checks and automatic restart on failure

### Agent Directory Structure Reference
```
agents/
  {adw_id}/                           # Workflow instance directory
    adw_state.json                    # State tracking file (monitor for changes)
    sdlc_planner/                     # Planner agent directory
      raw_output.jsonl                # Agent output in JSONL format (tail this)
      execution.log                   # Execution logs (tail this)
    sdlc_implementor/                 # Implementor agent directory
      raw_output.jsonl                # Agent output in JSONL format (tail this)
      execution.log                   # Execution logs (tail this)
    sdlc_tester/                      # Tester agent directory
      raw_output.jsonl                # Agent output in JSONL format (tail this)
      execution.log                   # Execution logs (tail this)
    sdlc_reviewer/                    # Reviewer agent directory
      raw_output.jsonl                # Agent output in JSONL format (tail this)
      execution.log                   # Execution logs (tail this)
      review_img/                     # Screenshots directory (watch for new files)
        *.png                         # Screenshot files
    sdlc_documenter/                  # Documenter agent directory
      raw_output.jsonl                # Agent output in JSONL format (tail this)
      execution.log                   # Execution logs (tail this)
```

### JSONL Event Format Examples
The raw_output.jsonl files contain events in JSON Lines format. Each line represents an event:

```jsonl
{"type":"thinking_block","timestamp":"2025-01-05T10:30:00Z","content":"Planning the implementation approach...","reasoning_type":"planning"}
{"type":"tool_use_pre","timestamp":"2025-01-05T10:30:05Z","tool_name":"Read","tool_input":{"file_path":"src/app.js"}}
{"type":"tool_use_post","timestamp":"2025-01-05T10:30:06Z","tool_name":"Read","tool_output":"file contents...","status":"success"}
{"type":"text_block","timestamp":"2025-01-05T10:30:10Z","content":"I'll start by reading the main application file...","sequence":1}
{"type":"file_changed","timestamp":"2025-01-05T10:30:15Z","file_path":"src/app.js","operation":"modify","diff":"...","lines_added":10,"lines_removed":5}
```

The AgentDirectoryMonitor will parse these lines and broadcast appropriate events via WebSocketManager.
