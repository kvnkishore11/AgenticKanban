# Feature: Fix WebSocket Logs Disconnect Between Backend and Frontend

## Metadata
issue_number: `58`
adw_id: `6d3b1dfd`
issue_json: `{"number":58,"title":"its still not able to get the logs","body":"its still not able to get the logs. although there are logs started. disconnect between the logs sent by websocket and the frontend cards nto able to show the logs\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7f9f1559-f363-41ee-9c70-351684633501)\n\n"}`

## Feature Description
Fix the disconnect between WebSocket logs sent by the backend and the frontend's ability to display these logs in the Kanban cards. The issue indicates that workflows are starting and logs are being generated, but the frontend cards are not showing these logs. This suggests a problem in the data flow from the WebSocket server through the WebSocket service to the Kanban store and finally to the UI components.

## User Story
As a user
I want to see real-time workflow logs in my Kanban cards
So that I can monitor the progress of my AI development workflows as they execute

## Problem Statement
There is a disconnect in the log delivery chain between the WebSocket server sending workflow logs and the frontend Kanban cards displaying them. The workflow logs are being generated and sent via WebSocket (as evidenced by "there are logs started"), but the frontend components (WorkflowLogViewer, StageLogsViewer) are not receiving or displaying them. This creates a blind spot where users cannot monitor their workflow progress in real-time.

## Solution Statement
Investigate and fix the complete log delivery chain:
1. Verify WebSocket server is broadcasting `workflow_log` messages correctly
2. Verify WebSocketService is receiving and emitting these messages
3. Verify KanbanStore's `handleWorkflowLog` is processing messages and storing them
4. Verify task-to-ADW ID mapping is correct for log association
5. Verify WorkflowLogViewer and StageLogsViewer are properly reading from the store
6. Add comprehensive logging and debugging to track the entire flow
7. Create E2E test to validate the complete log flow

## Relevant Files
Use these files to implement the feature:

### WebSocket Communication Layer
- `adws/adw_triggers/trigger_websocket.py` - WebSocket server that broadcasts workflow_log messages. Review the `/api/workflow-updates` endpoint (lines 1474-1559) that receives logs from workflow processes and broadcasts them. Verify it's correctly broadcasting with type="workflow_log".

- `adws/adw_modules/websocket_client.py` - Client used by workflows to send logs. Verify it's sending logs to the correct endpoint with correct format.

- `adws/adw_modules/agent_directory_monitor.py` - Monitors agent directories for real-time updates. May be generating logs that need to be sent.

### Frontend WebSocket Layer
- `src/services/websocket/websocketService.js` - WebSocket client service. Review `handleMessage` function (lines 334-521) to ensure workflow_log case (lines 420-423) is properly emitting events. Verify event listeners are registered correctly.

### State Management Layer
- `src/stores/kanbanStore.js` - Central state store. Review:
  - `taskWorkflowLogs` state (line 105) - stores logs per task
  - `handleWorkflowLog` function (lines 1388-1414) - processes incoming workflow logs and finds the matching task by adw_id
  - `appendWorkflowLog` function (lines 1621-1650) - adds logs to the store
  - `getWorkflowLogsForTask` function (lines 1681-1720) - retrieves logs for display, includes fallback logic to find logs by ADW ID

### UI Components
- `src/components/kanban/WorkflowLogViewer.jsx` - Displays workflow logs. Review:
  - Props: `logs`, `taskId`, `adwId`, `websocketConnected` (lines 27-39)
  - Empty state handling (lines 320-352) - shows debugging info when no logs present
  - Log filtering and display logic

- `src/components/kanban/StageLogsViewer.jsx` - Tabbed interface for stage-specific logs. Review:
  - `getWorkflowLogsForTask` call (line 69) - fetches real-time logs for "All" tab
  - Passes logs to WorkflowLogViewer (lines 294-307)

- `src/components/kanban/KanbanCard.jsx` - Individual task cards that should display log counts/status

- `src/components/kanban/TaskDetailsModal.jsx` - Modal that likely contains the log viewers

### Documentation
- `app_docs/feature-7b25b54d-workflow-log-handler.md` - Previous fix for workflow_log message handling. Shows the workflow_log case was added to handle these messages correctly.

### New Files
- `.claude/commands/e2e/test_workflow_logs_display.md` - E2E test to validate logs flow from trigger to display

## Implementation Plan

### Phase 1: Investigation & Root Cause Analysis
Add comprehensive logging to trace the log flow through the entire system:
- Add debug logging in WebSocket server broadcast
- Add debug logging in WebSocketService message handling
- Add debug logging in KanbanStore handleWorkflowLog
- Add debug logging in UI components when logs are received
- Verify task ADW ID assignments and mappings

### Phase 2: Fix Core Issues
Based on investigation findings, fix identified issues:
- Ensure WebSocket server properly broadcasts workflow_log messages
- Ensure WebSocketService properly emits workflow_log events
- Ensure KanbanStore properly maps logs to tasks using adw_id
- Ensure UI components properly subscribe to and display logs
- Fix any race conditions in task creation vs log arrival

### Phase 3: Validation & Testing
- Create comprehensive E2E test for log display flow
- Test with real workflow execution
- Verify logs appear in real-time
- Verify logs persist across component re-renders
- Ensure no duplicate logs appear

## Step by Step Tasks

### Investigate the log flow chain
- Read the WebSocket server code to understand how logs are broadcast
- Read the WebSocketService to understand event handling
- Read the KanbanStore to understand log processing and storage
- Read the UI components to understand log display
- Add console.log statements throughout the chain to trace a single log message
- Test with a simple workflow trigger and observe the console logs

### Add diagnostic logging to WebSocket server
- In `adws/adw_triggers/trigger_websocket.py`, add detailed logging to the `/api/workflow-updates` endpoint
- Log when workflow_log messages are received
- Log when broadcast is called for workflow_log
- Log the number of active connections receiving the broadcast
- Log the complete message structure being broadcast

### Add diagnostic logging to WebSocketService
- In `src/services/websocket/websocketService.js`, enhance logging in `handleMessage`
- Log every workflow_log message received with full data
- Log the emit call with event type and data
- Log the number of registered listeners for workflow_log events
- Verify the workflow_log event listener is properly registered in connectWebSocket

### Add diagnostic logging to KanbanStore
- In `src/stores/kanbanStore.js`, enhance logging in `handleWorkflowLog`
- Log every incoming log entry with adw_id
- Log all tasks and their adw_ids when searching for a match
- Log when a task match is found or not found
- Log when appendWorkflowLog is called
- Verify the workflow_log event listener is properly connected

### Add diagnostic logging to UI components
- In `src/components/kanban/StageLogsViewer.jsx`, log when logs are retrieved
- In `src/components/kanban/WorkflowLogViewer.jsx`, log when logs prop changes
- Log the logs array length and contents when rendering
- Log taskId, adwId, and websocketConnected status

### Verify task ADW ID assignment
- Review task creation in KanbanStore's `createTask` function
- Ensure adw_id is properly set in task.metadata.adw_id
- Verify adw_id is passed through when triggering workflows
- Check for any race conditions where logs arrive before task is fully created

### Fix identified issues based on logs
- If WebSocket server not broadcasting: Fix broadcast logic
- If WebSocketService not emitting: Fix event emission
- If KanbanStore not finding task: Fix ADW ID matching logic
- If UI not rendering: Fix component props/state connection
- Document each fix with clear comments

### Test the complete flow
- Start the WebSocket server
- Start the frontend
- Create a new task in the Kanban board
- Trigger a workflow (e.g., plan stage)
- Observe console logs at each step
- Verify logs appear in the WorkflowLogViewer in real-time
- Take screenshots showing logs appearing

### Create E2E test for log display
- Read `.claude/commands/test_e2e.md` to understand E2E test execution
- Read `.claude/commands/e2e/test_basic_query.md` to understand E2E test structure
- Create `.claude/commands/e2e/test_workflow_logs_display.md`
- Include steps to create task, trigger workflow, verify logs appear
- Include screenshot capture of logs display
- Document expected log fields and format

### Run validation commands
- Execute all validation commands listed below
- Fix any test failures or errors
- Ensure zero regressions

## Testing Strategy

### Unit Tests
- Test WebSocket server broadcast function with mock connections
- Test WebSocketService handleMessage with workflow_log messages
- Test KanbanStore handleWorkflowLog with various adw_id scenarios
- Test WorkflowLogViewer rendering with various log arrays

### Integration Tests
- Test complete flow from WebSocket message to UI display
- Test task creation with ADW ID assignment
- Test log association with correct tasks
- Test multiple tasks receiving logs simultaneously

### Edge Cases
- No tasks exist when log arrives (should store log for future task)
- Multiple tasks with same ADW ID (should not happen, but handle gracefully)
- Log arrives before task creation completes (race condition)
- WebSocket disconnects and reconnects while logs are flowing
- Large volume of logs (test performance and memory limits)
- Empty log messages
- Malformed log data

## Acceptance Criteria
- Workflow logs appear in real-time in the Kanban card's WorkflowLogViewer
- Logs are correctly associated with their tasks using adw_id
- Logs persist across component re-renders and page refreshes
- No duplicate logs appear
- Empty state shows helpful debugging information (taskId, adwId, WebSocket status)
- Console logging clearly traces log flow through the system
- E2E test validates end-to-end log display functionality
- All existing tests pass with zero regressions

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute the new `.claude/commands/e2e/test_workflow_logs_display.md` E2E test file to validate log display works end-to-end
- `cd server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `bun tsc --noEmit` - Run frontend tests to validate the feature works with zero regressions
- `bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes
- The issue mentions "there are logs started" which suggests logs ARE being generated, just not displayed
- Previous fix (7b25b54d) added workflow_log case handler to WebSocketService, so that part should work
- Focus investigation on the task-to-log association via adw_id
- KanbanStore has fallback logic to find logs by ADW ID even if stored under wrong taskId
- WorkflowLogViewer has excellent empty state with debugging info - use this during investigation
- Consider that the attached image (blob URL) cannot be viewed, so rely on the description
- The WebSocket server uses session-based deduplication for broadcasts - ensure this isn't blocking logs
- AgentDirectoryMonitor may be generating logs via file watching - verify this path works
