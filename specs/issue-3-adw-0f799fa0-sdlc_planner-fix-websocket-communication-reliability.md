# Feature: Fix WebSocket Communication Reliability and Real-Time UI Updates

## Metadata
issue_number: `3`
adw_id: `0f799fa0`
issue_json: `{"number":3,"title":"i still dont see any correlation iwth ui and what...","body":"i still dont see any correlation iwth ui and what is happenign with my adw_id. ideally the websocket has to communicate everything to frontend. i dont see any of the details from websocket just for recieved only at the time of triggering workflow when sending teh ticket. after that there is no communication of any sort. u need to first figure out sending all the possible messages to frontend. and then next step to show the stage progression of the card in teh stages of the kanban ui.."}`

## Feature Description
This feature implements comprehensive WebSocket communication between the backend ADW workflows and the frontend Kanban UI to provide real-time visibility into workflow execution. Currently, the WebSocket only sends a single "received" message when triggering a workflow, with no subsequent updates about the workflow's progress, stage transitions, or completion status. This leaves users blind to what's happening with their ADW workflows.

The solution establishes a complete bidirectional communication system where:
1. Backend ADW workflows send real-time progress updates, log messages, and stage transitions to the frontend via WebSocket
2. Frontend displays these updates in the Kanban card UI with live stage progression visualization
3. Cards automatically move through Kanban stages (Plan → Build → Test → Review → Document → PR) based on actual ADW workflow progress
4. Users can see detailed logs, current substage, progress percentage, and workflow metadata in real-time

## User Story
As a Kanban user triggering ADW workflows
I want to see real-time updates about workflow execution directly in the Kanban UI
So that I can track progress, understand what stage the workflow is in, see detailed logs, and know when the workflow completes without having to check external logs or guess at the workflow's status

## Problem Statement
The current WebSocket implementation has a critical gap in communication:
- When a workflow is triggered via WebSocket, only an initial acknowledgment ("received") is sent to the frontend
- After the initial trigger, there is no subsequent communication about workflow progress, stage changes, or completion
- Users cannot correlate the ADW ID they receive with actual workflow execution status
- The Kanban card UI shows static state and doesn't reflect real-time workflow execution
- Stage progression in the Kanban board is not synchronized with actual ADW workflow stages
- Users have no visibility into logs, errors, or detailed progress information
- The workflow execution appears to be a "black box" after triggering

This creates a poor user experience where users trigger workflows but have no feedback about what's happening, leading to confusion and inability to monitor or debug workflow execution.

## Solution Statement
Implement a comprehensive WebSocket messaging system that provides continuous real-time updates from ADW workflows to the frontend:

1. **Backend Enhancement**: Modify ADW workflow scripts to send status updates at key points:
   - Workflow initialization and stage entry
   - Progress updates during execution (percentage completion, current substage)
   - Log messages from the ADW execution
   - Stage transitions (Plan → Build → Test, etc.)
   - Completion or failure notifications
   - Error details when failures occur

2. **Message Broadcasting**: Implement a message queue or broadcasting system in the WebSocket trigger service to relay messages from running ADW workflows to connected clients

3. **Frontend Reception**: Enhance the WebSocket service to receive and process all message types:
   - Status updates
   - Progress notifications
   - Log entries
   - Stage progression events
   - Error messages

4. **UI Visualization**: Update the Kanban card UI to display real-time information:
   - Live progress bars showing workflow completion percentage
   - Current stage and substage indicators that auto-update
   - Real-time log viewer showing workflow execution logs
   - Stage progression visualization showing movement through Kanban stages
   - ADW metadata display (ADW ID, workflow name, status)
   - Automatic card movement between Kanban stages based on workflow progress

5. **State Synchronization**: Ensure the Kanban store properly tracks and updates workflow state based on WebSocket messages

## Relevant Files
Use these files to implement the feature:

### Backend WebSocket Communication
- `adws/adw_triggers/trigger_websocket.py:1-901` - WebSocket trigger service that manages connections and message routing. Currently handles initial trigger but needs message broadcasting capability from running workflows.
- `adws/adw_triggers/websocket_models.py:1-118` - Pydantic models for WebSocket messages. Contains WorkflowStatusUpdate model that needs to be utilized for progress updates.
- `adws/adw_plan_iso.py:1-381` - Example ADW workflow that needs to send status updates during execution.
- `adws/adw_modules/state.py` - ADW state management that tracks workflow progress and metadata.
- `adws/adw_modules/workflow_ops.py` - Workflow operations module that orchestrates ADW execution.
- `adws/adw_modules/utils.py` - Utility functions including logger setup that can be enhanced for WebSocket message sending.

### Frontend WebSocket Communication
- `src/services/websocket/websocketService.js:1-778` - WebSocket service managing connection and message handling. Already has infrastructure for status_update and workflow_log events but needs proper integration.
- `src/services/websocket/stageProgressionService.js:1-380` - Service for automatic stage progression. Needs to be integrated with real WebSocket updates instead of simulation.
- `src/services/websocket/connectionHealthMonitor.js` - Connection health monitoring service.

### Frontend UI Components
- `src/components/kanban/KanbanCard.jsx:1-673` - Kanban card component that displays task information. Already has workflow status display (lines 548-616) but needs real-time update integration.
- `src/components/kanban/StageProgressionViewer.jsx` - Component for visualizing stage progression that needs real data.
- `src/components/kanban/WorkflowLogViewer.jsx` - Component for displaying workflow logs in real-time.
- `src/components/ui/WebSocketStatusIndicator.jsx` - WebSocket connection status indicator.

### State Management
- `src/stores/kanbanStore.js:1-100` - Kanban store managing application state. Has WebSocket state tracking (lines 54-62) that needs proper update handlers.

### Utilities
- `src/utils/websocketErrorMapping.js` - Error message mapping for user-friendly display.
- `src/utils/substages.js` - Substage definitions and utilities for progress tracking.

### New Files
- `adws/adw_modules/websocket_messenger.py` - **NEW**: Utility module for sending WebSocket messages from ADW workflows to the trigger service for broadcasting to clients.
- `.claude/commands/e2e/test_websocket_realtime_ui_updates.md` - **NEW**: E2E test validating real-time UI updates from WebSocket messages.

## Implementation Plan

### Phase 1: Backend Message Broadcasting Infrastructure
Establish the foundation for ADW workflows to send messages to the WebSocket service for broadcasting to clients.

Key objectives:
- Create a messaging interface between ADW workflows and WebSocket trigger service
- Implement message queuing/routing in the trigger service
- Enable workflows to send status updates without blocking execution

### Phase 2: ADW Workflow Integration
Integrate message sending into existing ADW workflows so they broadcast progress, stage changes, and logs.

Key objectives:
- Add status update calls at key workflow checkpoints
- Implement progress tracking and percentage calculation
- Send log messages to WebSocket clients
- Report stage transitions and completion

### Phase 3: Frontend Message Processing and State Updates
Enhance the frontend WebSocket service and Kanban store to properly receive, process, and store all message types.

Key objectives:
- Implement handlers for all WebSocket message types
- Update Kanban store state based on messages
- Track workflow metadata (ADW ID, status, progress)
- Maintain real-time log history per task

### Phase 4: Real-Time UI Visualization
Update the Kanban card and related UI components to display live workflow data.

Key objectives:
- Show live progress bars and percentages
- Display current stage and substage with auto-updates
- Render real-time log viewer with scrolling and auto-expansion
- Visualize stage progression through Kanban board
- Auto-move cards between stages based on workflow progress

### Phase 5: Testing and Validation
Create comprehensive E2E tests to validate the entire real-time communication flow.

Key objectives:
- Test message flow from backend to frontend
- Verify UI updates correctly
- Validate stage progression automation
- Test error scenarios and recovery

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create WebSocket Messenger Module for ADW Workflows
- Create `adws/adw_modules/websocket_messenger.py` with functions to send messages to the WebSocket trigger service
- Implement `send_status_update(adw_id, workflow_name, status, message, progress_percent=None, current_step=None)` function
- Implement `send_log_message(adw_id, level, message, workflow_name=None)` function
- Implement `send_stage_transition(adw_id, workflow_name, from_stage, to_stage, progress_percent)` function
- Use HTTP POST requests to a new endpoint in the WebSocket trigger service for message broadcasting
- Handle connection errors gracefully (log but don't fail workflow if WebSocket unavailable)

### Step 2: Add Message Broadcasting Endpoint to WebSocket Trigger Service
- Add new POST endpoint `/api/broadcast` in `adws/adw_triggers/trigger_websocket.py` to receive messages from ADW workflows
- Implement message validation using existing Pydantic models
- Broadcast received messages to all connected WebSocket clients (or filter by ADW ID if needed)
- Add authentication/authorization (shared secret token) to prevent unauthorized message injection
- Log all broadcast operations for debugging

### Step 3: Integrate Message Sending into ADW Plan Workflow
- Modify `adws/adw_plan_iso.py` to send status updates at key points:
  - Send "started" status when workflow begins (after line 98)
  - Send "in_progress" updates with progress percentage during major steps
  - Send stage transition when moving to planning (before line 276)
  - Send log messages for important operations (issue classification, branch creation, plan generation)
  - Send "completed" status at successful completion (before line 365)
  - Send "failed" status with error details on exceptions
- Calculate and send progress percentages based on workflow steps (e.g., 20% after classification, 40% after branch creation, 60% during planning, 80% after commit, 100% on completion)
- Include current substage information (e.g., "classify", "create_branch", "generate_plan", "commit", "push_pr")

### Step 4: Enhance Frontend WebSocket Service Message Handlers
- Update `src/services/websocket/websocketService.js` to properly process all status_update messages
- Ensure `status_update` handler (line 312) triggers state updates in Kanban store
- Enhance `workflow_log` event emission (line 326) to include all log metadata
- Add specific handlers for stage transition events
- Implement message deduplication to prevent duplicate UI updates

### Step 5: Implement Kanban Store State Update Handlers
- Add action `updateTaskFromWorkflowStatus(taskId, statusUpdate)` in `src/stores/kanbanStore.js`
- Implement logic to update task progress, substage, and metadata based on status messages
- Add action `moveTaskBasedOnWorkflowStage(taskId, workflowStage)` to automatically move cards between Kanban stages
- Map ADW workflow stages to Kanban stages (e.g., "adw_plan_iso" → Plan stage, "adw_build_iso" → Build stage)
- Ensure workflow metadata (ADW ID, status, logs_path) is stored in task metadata
- Add action `appendWorkflowLog(taskId, logEntry)` to maintain log history per task

### Step 6: Connect WebSocket Events to Kanban Store Updates
- In WebSocket service event listeners, call Kanban store actions when messages arrive
- On `status_update` event, call `updateTaskFromWorkflowStatus` with message data
- On `workflow_log` event, call `appendWorkflowLog` to add log entry
- Ensure ADW ID is used to find the correct task in the store
- Handle cases where task might not exist (log warning but don't crash)

### Step 7: Enhance Kanban Card Real-Time Display
- Update `src/components/kanban/KanbanCard.jsx` to use real-time workflow data from store
- Ensure progress bar (lines 563-574) updates automatically when workflow progress changes
- Ensure current step display (lines 576-579) updates with workflow substage
- Ensure workflow message display (lines 581-585) shows latest status update
- Auto-expand logs section (lines 630-641) when new log entries arrive
- Add visual indicators (pulsing, color changes) when workflow is actively running

### Step 8: Implement Automatic Stage Progression
- Update `src/services/websocket/stageProgressionService.js` to trigger on real WebSocket events instead of simulation
- Remove simulated substage execution (lines 89-128) and replace with real workflow status monitoring
- Implement `onWorkflowStageTransition(taskId, newStage)` handler that moves cards when ADW workflows report stage changes
- Ensure progression service updates task substage and progress based on real status updates
- Handle workflow completion by moving card to final stage (PR) or error stage on failure

### Step 9: Create Backend Integration Tests
- Create unit tests for `websocket_messenger.py` module functions
- Test message sending, error handling, and retry logic
- Verify message format compliance with Pydantic models
- Test broadcast endpoint authentication and authorization
- Validate message routing to correct WebSocket clients

### Step 10: Create E2E Test for Real-Time UI Updates
- Create `.claude/commands/e2e/test_websocket_realtime_ui_updates.md` based on `.claude/commands/e2e/test_websocket_integration.md`
- Define test scenarios:
  1. Trigger workflow and verify initial "started" status appears in UI
  2. Monitor for progress updates and verify progress bar updates in real-time
  3. Verify log messages appear in the log viewer as they're sent
  4. Verify stage transitions move the card between Kanban stages automatically
  5. Verify completion status updates the card to 100% and final stage
  6. Verify error scenarios properly display in UI with error details
- Include screenshot capture at each verification point
- Define success criteria requiring all status updates to be visible in UI within 2 seconds of being sent

### Step 11: Run Validation Commands
- Execute E2E test to validate real-time UI updates work correctly
- Verify WebSocket messages flow from backend to frontend
- Confirm UI components update in response to messages
- Validate stage progression automation
- Test error scenarios and recovery

## Testing Strategy

### Unit Tests
**Backend Unit Tests**:
- `adws/adw_modules/websocket_messenger.py`:
  - Test `send_status_update()` constructs correct message format
  - Test `send_log_message()` handles different log levels
  - Test `send_stage_transition()` includes all required fields
  - Test error handling when WebSocket service is unavailable
  - Test retry logic for failed message sends

**Frontend Unit Tests**:
- `src/services/websocket/websocketService.js`:
  - Test `handleMessage()` properly routes different message types
  - Test event emission triggers registered listeners
  - Test message deduplication prevents duplicate processing
- `src/stores/kanbanStore.js`:
  - Test `updateTaskFromWorkflowStatus()` correctly updates task state
  - Test `appendWorkflowLog()` maintains log history
  - Test `moveTaskBasedOnWorkflowStage()` maps stages correctly

### Integration Tests
- Test full message flow: ADW workflow → WebSocket trigger → Frontend WebSocket service → Kanban store → UI component
- Test multiple concurrent workflows with different ADW IDs
- Test message ordering and sequencing
- Test reconnection scenarios (what happens to messages sent while disconnected)

### Edge Cases
- **WebSocket Disconnection During Workflow**: Verify messages are queued and delivered on reconnection
- **Multiple Clients**: Test that all connected clients receive broadcast messages
- **Rapid Status Updates**: Verify UI can handle high-frequency updates without performance degradation
- **Invalid ADW ID**: Test handling of status updates for non-existent tasks
- **Workflow Failure Mid-Execution**: Verify proper error status display and card movement to error stage
- **Message Loss**: Test graceful degradation if some messages are lost
- **Out-of-Order Messages**: Verify system handles messages arriving in incorrect order
- **Large Log Messages**: Test performance with very long log messages or many log entries
- **Concurrent Stage Transitions**: Verify correct handling when multiple workflows transition simultaneously

## Acceptance Criteria
1. **Initial Status Update**: When a workflow is triggered, the Kanban card displays "started" status within 2 seconds
2. **Progress Updates**: Progress bar in Kanban card updates in real-time as workflow sends progress updates (20%, 40%, 60%, 80%, 100%)
3. **Log Visibility**: All log messages from ADW workflow execution appear in the card's log viewer in real-time
4. **Stage Progression**: Cards automatically move between Kanban stages (Plan → Build → Test → Review → Document → PR) based on workflow stage transitions
5. **Substage Display**: Current substage (e.g., "classify", "generate_plan", "commit") displays and updates in real-time
6. **Completion Status**: When workflow completes, card shows 100% progress and moves to PR stage with "completed" status
7. **Error Handling**: If workflow fails, card moves to Errored stage with error details displayed in UI
8. **ADW ID Correlation**: User can see the ADW ID in the card and correlate it with workflow execution
9. **Multi-Client Support**: Multiple browser tabs/clients receive the same real-time updates simultaneously
10. **Reconnection Recovery**: If WebSocket disconnects and reconnects, UI catches up with current workflow status
11. **Performance**: UI updates occur within 500ms of status update being sent from backend
12. **No Black Box**: User has complete visibility into what the workflow is doing at any given moment

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

### Backend Validation
- `cd adws && uv run python -m pytest adw_modules/test_websocket_messenger.py -v` - Test WebSocket messenger module functions
- `cd adws && uv run python -c "from adw_modules.websocket_messenger import send_status_update; send_status_update('test_id', 'test_workflow', 'started', 'Testing message')"` - Manually test message sending

### WebSocket Service Validation
- `curl http://localhost:8002/health` - Verify WebSocket trigger service is healthy
- Start WebSocket service: `cd adws && uv run adws/adw_triggers/trigger_websocket.py`
- In browser console: `window.websocketService.getStatus()` - Verify connection status
- In browser console: `window.websocketService.triggerWorkflowForTask({id: 'test', title: 'Test Task', workItemType: 'feature'}, 'adw_plan_iso')` - Trigger test workflow and monitor messages

### E2E Validation
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_realtime_ui_updates.md` to validate real-time UI updates work correctly
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_integration.md` to validate WebSocket integration compliance

### Frontend Build Validation
- `cd app/client && bun tsc --noEmit` - Run frontend TypeScript validation
- `cd app/client && bun run build` - Build frontend to ensure no build errors

### Server Test Validation
- `cd app/server && uv run pytest` - Run server tests to ensure no regressions

### Manual Testing Checklist
1. Start WebSocket service and Kanban application
2. Create a new task in Backlog
3. Trigger workflow for the task
4. Observe:
   - Initial "started" status appears within 2 seconds
   - Progress bar updates through 20%, 40%, 60%, 80%, 100%
   - Log messages appear in real-time in the log viewer
   - Current substage updates (classify → create_branch → generate_plan → commit → push_pr)
   - Card automatically moves from Backlog to Plan stage when planning begins
   - Card shows 100% progress and "completed" status when workflow finishes
   - ADW ID is visible and clickable (copy to clipboard)
5. Test error scenario:
   - Trigger workflow with invalid parameters
   - Verify card moves to Errored stage
   - Verify error details are displayed
6. Test reconnection:
   - Disconnect WebSocket while workflow is running
   - Reconnect WebSocket
   - Verify UI catches up with current workflow status

## Notes

### Implementation Considerations
- **Performance**: Sending too many messages could overwhelm the WebSocket connection. Consider message batching or throttling if more than 10 messages per second.
- **Message Persistence**: Consider storing workflow messages in the state file so they can be recovered after browser refresh or reconnection.
- **Authentication**: The broadcast endpoint should use a shared secret token to prevent unauthorized message injection. Store this token in environment variables.
- **Scalability**: If multiple WebSocket trigger services are run (load balancing), implement a message broker (Redis Pub/Sub) for cross-service broadcasting.
- **Message Format**: Ensure all messages conform to existing Pydantic models to maintain type safety and validation.

### Future Enhancements
- Implement message history/replay functionality so users can see past workflow executions
- Add filtering options to log viewer (by level, search by keyword)
- Implement workflow pause/resume functionality via WebSocket commands
- Add real-time metrics dashboard showing active workflows, completion rates, average duration
- Implement WebSocket message compression for large log payloads
- Add GraphQL subscription as alternative to WebSocket for more flexible querying
- Implement message acknowledgments to ensure critical messages are received

### User Experience Improvements
- Add sound notifications for workflow completion or errors
- Implement browser notifications when workflows complete (with user permission)
- Add export functionality for workflow logs (download as file)
- Implement workflow timeline visualization showing duration of each stage
- Add estimated completion time based on historical data

### Dependencies
- No new external dependencies required (using existing FastAPI, WebSocket, Pydantic on backend; existing WebSocket API on frontend)
- Uses existing WebSocket infrastructure and message models
- Leverages existing Kanban store and UI components

### Breaking Changes
- None - this is purely additive functionality
- Existing WebSocket trigger functionality remains unchanged
- Backward compatible with workflows that don't send status updates (they just won't show progress)

### Documentation
- Add WebSocket message protocol documentation to `app_docs/`
- Document the broadcast endpoint API
- Create developer guide for adding status updates to new ADW workflows
- Update user documentation to explain real-time UI features
