# Bug: WebSocket Logs Not Displaying in Frontend Cards

## Metadata
issue_number: `62`
adw_id: `cce78e4e`
issue_json: `{"number":62,"title":"The logs given by websocket are not seen in our fr...","body":"The logs given by websocket are not seen in our frontend cards. can you try to fix them. It just shows empty logs. u aer missing out something critical. think harder ultra think to resolve this issue"}`

## Bug Description
Workflow logs sent from the backend via WebSocket are not appearing in the frontend Kanban cards. When users view workflow logs for tasks, they see an empty state instead of the log entries that should be streaming from the backend workflows. The backend is successfully sending `workflow_log` messages through the WebSocket server, but these logs are not being displayed in the WorkflowLogViewer and StageLogsViewer components.

## Problem Statement
The log display system has extensive diagnostic logging at every layer (backend broadcast, WebSocket service reception, KanbanStore storage, and UI rendering), but logs are still not appearing in the frontend cards. The root cause is most likely one of the following:
1. ADW ID mismatch between tasks and log entries
2. Log message structure incompatibility
3. WebSocket message handling issues in the frontend
4. State management problems in the KanbanStore

## Solution Statement
Systematically investigate each layer of the log flow from backend to frontend, identify where logs are being lost or filtered out, and fix the root cause. The solution will involve:
1. Verifying the log message structure matches what the frontend expects
2. Ensuring ADW IDs are properly set and matched between tasks and logs
3. Confirming WebSocket message handling is working correctly
4. Validating the KanbanStore's log storage and retrieval logic
5. Testing the complete flow end-to-end with real workflow logs

## Steps to Reproduce
1. Start the backend WebSocket server (`python start-websocket.py`)
2. Start the frontend application (`npm run dev`)
3. Create a new task in the Kanban board
4. Trigger a workflow (e.g., move task to 'plan' stage)
5. Open the task's workflow log viewer
6. Observe that no logs are displayed (empty state shown)
7. Check browser console for diagnostic logs showing where logs are being lost

## Root Cause Analysis
After analyzing the codebase, the log flow works as follows:

**Backend Flow:**
- ADW workflows call `notifier.send_log(workflow_name, message, level)` (websocket_client.py:152-177)
- This sends a POST request to `/api/workflow-updates` with structure:
  ```json
  {
    "type": "workflow_log",
    "data": {
      "adw_id": "...",
      "workflow_name": "...",
      "message": "...",
      "level": "INFO|SUCCESS|ERROR|WARNING",
      "timestamp": "2025-11-06T..."
    }
  }
  ```
- WebSocket server broadcasts this to all connected clients (trigger_websocket.py:1544-1551)

**Frontend Flow:**
- WebSocketService receives the message and emits `workflow_log` event (websocketService.js:420-431)
- KanbanStore's `handleWorkflowLog` listens for this event (kanbanStore.js:1394-1442)
- It finds the task by matching `task.metadata.adw_id === logEntry.adw_id` (kanbanStore.js:1426)
- If found, calls `appendWorkflowLog(task.id, logEntry)` to store the log
- WorkflowLogViewer retrieves logs using `getWorkflowLogsForTask(taskId)` and displays them

**Critical Issues Identified:**

1. **ADW ID Mismatch (MOST LIKELY)**: If `task.metadata.adw_id` is not set when the task is created, or if it doesn't match the `adw_id` in the log entries, the logs cannot be associated with the task. The handleWorkflowLog function will log "❌ NO TASK FOUND" and discard the log entry.

2. **Log Message Structure**: The frontend expects logs with fields: `message`, `level`, `timestamp`, `adw_id`, `workflow_name`. If any of these are missing or named differently, the logs may not display correctly.

3. **WebSocket Event Listener Registration**: If the `workflow_log` event listener is not properly registered in the KanbanStore, the logs will never be processed.

4. **Duplicate Message Filtering**: The KanbanStore has duplicate message detection (kanbanStore.js:1399-1402) which may incorrectly filter legitimate log messages.

5. **Component Prop Issues**: WorkflowLogViewer may not be receiving the correct `taskId` or `adwId` props, preventing it from retrieving the stored logs.

## Relevant Files
Use these files to fix the bug:

### Backend Files
- **adws/adw_triggers/trigger_websocket.py** (lines 1500-1571) - WebSocket server endpoint that broadcasts workflow_log messages. Need to verify the message structure being sent matches frontend expectations.
- **adws/adw_modules/websocket_client.py** (lines 152-177) - WebSocketNotifier.send_log() method that constructs and sends workflow_log messages. Need to ensure all required fields are included.

### Frontend Files
- **src/services/websocket/websocketService.js** (lines 420-431) - Handles incoming workflow_log messages and emits events. Need to verify the event is being emitted correctly with the right data structure.
- **src/stores/kanbanStore.js** (lines 1394-1442) - handleWorkflowLog function that matches logs to tasks by adw_id. This is the CRITICAL FILE where ADW ID matching happens.
- **src/stores/kanbanStore.js** (lines 1646-1688) - appendWorkflowLog function that stores logs in state. Need to verify logs are being stored correctly.
- **src/stores/kanbanStore.js** (lines 1719-1758) - getWorkflowLogsForTask function that retrieves logs for display. Need to ensure this returns the correct logs.
- **src/components/kanban/WorkflowLogViewer.jsx** (lines 27-450) - Component that displays logs. Need to verify it's receiving and rendering logs correctly.
- **src/components/kanban/StageLogsViewer.jsx** - Component that retrieves and displays workflow logs for tasks. Need to verify it's calling the right store methods.

### Test Files
- **.claude/commands/test_e2e.md** - E2E test runner documentation. Used to understand how to create E2E tests.
- **.claude/commands/e2e/test_basic_query.md** - Example E2E test. Used as template for creating workflow logs test.

### New Files
- **.claude/commands/e2e/test_workflow_logs_display.md** - New E2E test to validate that workflow logs appear in the frontend cards when a workflow is triggered.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Investigate the Complete Log Flow with Browser DevTools
- Start the backend WebSocket server and frontend application
- Open browser DevTools console
- Create a new task and trigger a workflow (move to 'plan' stage)
- Search console logs for:
  - `[WebSocket Server] workflow_log received:` - Verify backend is sending logs
  - `[WebSocketService] ===== WORKFLOW_LOG RECEIVED =====` - Verify frontend receives logs
  - `[KanbanStore] ===== HANDLE WORKFLOW LOG =====` - Verify store processes logs
  - `[KanbanStore] ✅ FOUND task` vs `[KanbanStore] ❌ NO TASK FOUND` - CRITICAL: This tells us if ADW ID matching is working
  - `[WorkflowLogViewer] logs.length:` - Verify component receives logs
- Document exactly where in the flow logs are being lost

### 2. Verify ADW ID Assignment and Matching
- Read `src/stores/kanbanStore.js` and find where `task.metadata.adw_id` is set when tasks are created or workflows are triggered
- Verify that ADW ID is set BEFORE any workflow logs are sent
- Check if there's a race condition where logs arrive before the task's ADW ID is set
- If ADW ID is not being set properly, fix the task creation/workflow trigger code to ensure `metadata.adw_id` is always set
- Add additional logging to show when ADW ID is assigned to tasks

### 3. Fix the Root Cause Based on Investigation Findings
Based on the console log analysis from Step 1, implement the appropriate fix:

**If logs are not reaching the frontend at all:**
- Check WebSocket connection status in the UI
- Verify the backend is broadcasting to the correct endpoint
- Ensure the WebSocketService is connected and listening for `workflow_log` events

**If logs reach KanbanStore but show "❌ NO TASK FOUND":**
- Fix ADW ID assignment in task creation/workflow trigger logic
- Ensure the ADW ID format matches between tasks and log entries
- Add validation to ensure ADW ID is never null/undefined

**If logs are being stored but not displayed:**
- Fix the WorkflowLogViewer props (ensure correct taskId and adwId)
- Verify `getWorkflowLogsForTask` is returning the correct logs
- Check if logs are being filtered out by duplicate detection incorrectly

**If log structure is incompatible:**
- Update the backend to send all required fields: `message`, `level`, `timestamp`, `adw_id`, `workflow_name`
- Ensure field names match exactly what the frontend expects
- Add validation in the backend to ensure required fields are present

### 4. Test the Fix Manually
- Clear browser console
- Create a fresh task
- Trigger a workflow
- Verify logs appear in real-time in the WorkflowLogViewer
- Check that all log levels (INFO, SUCCESS, ERROR, WARNING) display correctly
- Verify timestamps are shown if `showTimestamps` is enabled
- Test with multiple tasks to ensure logs don't get mixed up

### 5. Create E2E Test for Workflow Logs Display
- Read `.claude/commands/test_e2e.md` to understand the E2E test framework
- Read `.claude/commands/e2e/test_basic_query.md` as a template
- Create a new E2E test file: `.claude/commands/e2e/test_workflow_logs_display.md`
- The test should:
  1. Navigate to the application
  2. Create a new task with a unique title
  3. Verify the task appears in the backlog
  4. Move the task to the 'plan' stage (triggers workflow)
  5. Wait for workflow to start sending logs
  6. Open the task's workflow log viewer
  7. Verify that logs are displayed (not empty)
  8. Verify log entries have the expected structure (message, level, timestamp)
  9. Take screenshots showing logs appearing in the UI
  10. Verify at least one log entry with level "INFO" or "SUCCESS" is visible
- Include clear success criteria and validation steps
- Ensure the test is minimal and focused on proving logs display correctly

### 6. Run Validation Commands
- Execute all validation commands listed in the "Validation Commands" section below
- Ensure every command completes successfully with zero errors
- If any validation fails, fix the issues before proceeding

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Before the fix, reproduce the bug:
- `npm run dev` - Start the frontend in one terminal
- `python start-websocket.py` - Start WebSocket server in another terminal
- Manually create a task and trigger a workflow, verify logs do NOT appear (reproduce the bug)

After implementing the fix:
- Restart the frontend and WebSocket server
- Create a new task and trigger a workflow
- Open browser DevTools console and verify the log flow:
  - Look for `[KanbanStore] ✅ FOUND task for log entry` (should appear for every log)
  - Look for `[WorkflowLogViewer] logs.length: N` where N > 0 (logs are reaching the component)
  - Visually verify logs appear in the WorkflowLogViewer UI
- Test with multiple tasks to ensure logs are associated with the correct tasks
- Test all workflow stages (plan, build, test, review) to ensure logs appear for all of them

E2E test validation:
- Read `.claude/commands/test_e2e.md`
- Read and execute your new E2E test file `.claude/commands/e2e/test_workflow_logs_display.md` to validate logs appear correctly in the UI
- Verify all test steps pass
- Review screenshots to confirm logs are visible

Build and type check validation:
- `npm run tsc --noEmit` - Run TypeScript type checking to ensure no type errors
- `npm run build` - Run frontend build to validate the code compiles successfully

## Notes
- The codebase already has extensive diagnostic logging throughout the WebSocket log flow (added in feature-6d3b1dfd-websocket-logs-debugging). Use these logs to trace the exact point where logs are being lost.
- The most common issue is ADW ID mismatch. Check the console for `❌ NO TASK FOUND for log entry with adw_id:` messages.
- The `handleWorkflowLog` function in kanbanStore.js is the critical bottleneck where logs must match tasks by ADW ID. If this fails, logs are completely discarded.
- Duplicate message detection may filter legitimate repeated messages. Check the `isDuplicateMessage` function if logs are being filtered incorrectly.
- The WorkflowLogViewer component expects logs as an array with specific structure. Verify the log format matches what the component expects.
- WebSocket connection status is shown in the UI. If WebSocket is disconnected, no logs will be received at all.
- The backend uses the `WebSocketNotifier` class to send logs. All workflows should use this class consistently.
- Consider adding a visual indicator in the UI when logs are being received (e.g., a pulsing icon or "live" badge) to help users know the system is working.
