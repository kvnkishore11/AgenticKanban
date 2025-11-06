# Bug: Fix Blank Logs Display in Expanded Card State

## Metadata
issue_number: `56`
adw_id: `64aca425`
issue_json: `{"number":56,"title":"For some reason logs are not visible on the fronte...","body":"For some reason logs are not visible on the frontend. it appears blank within the card in expanded state. seems like u are missing some critical thing. try to fix it"}`

## Bug Description
Logs are not visible on the frontend within the expanded card state. When users expand a card to view workflow logs, the logs section appears blank even though logs should be present. This affects the user's ability to monitor workflow execution and debug issues.

The bug manifests as:
- Empty/blank log display area in the expanded card modal
- "No logs yet" message appearing in gray text that is hard to see
- Logs not appearing even when WebSocket is connected and logs are being received
- The "All Logs" tab showing no content despite logs being present in the store

## Problem Statement
The CardExpandModal component renders a StageLogsViewer component that displays workflow logs. However, logs are appearing blank in the expanded state. The root cause is likely one or more of the following:
1. The `getWorkflowLogsForTask(taskId)` method returns an empty array even when logs exist
2. The task-to-logs mapping is not working correctly (logs arrive before task is initialized)
3. The WebSocket log handling is not properly appending logs to the correct task
4. The visual feedback for "no logs" state is too subtle (small gray text)
5. The conditional rendering logic in StageLogsViewer may be hiding the WorkflowLogViewer when it shouldn't

## Solution Statement
Investigate and fix the log display pipeline from WebSocket message receipt through to final rendering:
1. Add comprehensive logging to trace log flow through the system
2. Verify that `taskWorkflowLogs[taskId]` is properly populated in the Kanban store
3. Ensure logs are correctly associated with tasks by ADW ID
4. Improve visual feedback when logs are empty or loading
5. Fix any conditional rendering issues in StageLogsViewer that prevent logs from displaying
6. Add defensive checks to handle edge cases (missing ADW ID, uninitialized task, etc.)

## Steps to Reproduce
1. Start the WebSocket server, backend API, and frontend dev server
2. Create a new task or select an existing task with an ADW ID
3. Trigger a workflow for that task (e.g., /plan, /build, etc.)
4. Click on the task card to expand it into CardExpandModal
5. Navigate to the "Workflow Logs" section
6. Observe the "All Logs" tab - it appears blank or shows "No logs yet"
7. Check browser console for any errors or warnings
8. Verify WebSocket connection status shows "Connected"

## Root Cause Analysis
Based on code analysis, the issue stems from multiple potential points of failure in the log display pipeline:

**1. Log Storage in Kanban Store (src/stores/kanbanStore.js:1618-1640)**
- `appendWorkflowLog(taskId, logEntry)` stores logs in `taskWorkflowLogs[taskId]`
- If `taskId` is incorrect or task doesn't exist yet, logs won't be stored
- The `handleWorkflowLog()` method (line 1388-1414) tries to find task by ADW ID but may fail if task not initialized

**2. Log Retrieval (src/stores/kanbanStore.js:1671-1674)**
- `getWorkflowLogsForTask(taskId)` returns `taskWorkflowLogs[taskId] || []`
- If taskId is wrong or logs stored under different taskId, returns empty array

**3. StageLogsViewer Rendering (src/components/kanban/StageLogsViewer.jsx:66-67)**
- Gets logs via `const allLogs = getWorkflowLogsForTask(taskId);`
- Console logs show: `[StageLogsViewer] Retrieved allLogs for taskId: ... count: 0`
- If allLogs is empty, `getLogsToDisplay()` returns empty array (line 143-144)

**4. WorkflowLogViewer Empty State (src/components/kanban/WorkflowLogViewer.jsx:317-320)**
- When `filteredLogs.length === 0`, shows subtle gray "No logs yet" message
- This message is easy to miss and doesn't indicate why logs are missing

**5. CardExpandModal Integration (src/components/kanban/CardExpandModal.jsx:498-514)**
- Only renders StageLogsViewer if `task.metadata?.adw_id` exists
- Otherwise shows "No logs available yet"
- Passes `task.id` to StageLogsViewer but logs might be stored under different ID

**Critical Issue:**
The most likely root cause is that logs are being appended to `taskWorkflowLogs` with one task ID, but when CardExpandModal calls `getWorkflowLogsForTask(task.id)`, it's using a different task ID. This mismatch causes logs to exist in the store but not be retrievable.

Specifically, in `handleWorkflowLog()` (line 1388-1414), the code finds a task by ADW ID:
```javascript
const task = tasks.find(t => t.metadata?.adw_id === logEntry.adw_id);
if (task) {
  appendWorkflowLog(task.id, logEntry);
}
```

If the task's ID has changed (e.g., due to task updates, project switching, or state rehydration), the stored logs won't match the current task ID.

## Relevant Files
Use these files to fix the bug:

- `src/components/kanban/CardExpandModal.jsx` (lines 478-514)
  - Renders the expanded card view with workflow logs section
  - Gets logs via `getWorkflowLogsForTask(task.id)` and passes to StageLogsViewer
  - Should add defensive checks and better error messaging

- `src/components/kanban/StageLogsViewer.jsx` (lines 60-82, 141-152, 290-312)
  - Retrieves logs from store via `getWorkflowLogsForTask(taskId)`
  - Implements tabbed interface for different log sources
  - Contains conditional rendering that may hide logs incorrectly
  - Should add comprehensive logging and fix empty state handling

- `src/components/kanban/WorkflowLogViewer.jsx` (lines 27-60, 310-320)
  - Renders individual log entries
  - Shows "No logs yet" when array is empty
  - Should improve empty state messaging with debugging info

- `src/stores/kanbanStore.js` (lines 1388-1414, 1618-1640, 1671-1674)
  - `handleWorkflowLog()` - Receives logs from WebSocket and appends to store
  - `appendWorkflowLog()` - Stores logs in `taskWorkflowLogs[taskId]` array
  - `getWorkflowLogsForTask()` - Retrieves logs for a given task ID
  - Should add logging to track task ID consistency and log storage

- `src/services/websocket/websocketService.js` (lines 204-211, 334-521)
  - Receives WebSocket messages and emits 'workflow_log' events
  - Handles various message types: workflow_log, status_update, error, etc.
  - Should verify log messages include correct ADW ID

### New Files

None required - this is a bug fix in existing components.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add Comprehensive Logging to Trace Log Flow
- Add detailed console logging in `kanbanStore.js`:
  - In `handleWorkflowLog()`: Log received log entry with ADW ID, found task ID, and whether task was found
  - In `appendWorkflowLog()`: Log taskId, current log count, and new log being added
  - In `getWorkflowLogsForTask()`: Log taskId and number of logs returned
- Add logging in `CardExpandModal.jsx`:
  - Log task.id, task.metadata?.adw_id, and workflowLogs.length when rendering
  - Log the full workflowLogs array structure
- Add logging in `StageLogsViewer.jsx`:
  - Already has logging at line 67, verify it's working correctly
  - Add additional logging to show when logs are empty vs. loading vs. error state

### 2. Improve Empty State Messaging
- Update `WorkflowLogViewer.jsx` empty state (line 317-320):
  - Make "No logs yet" message more prominent (larger text, better color contrast)
  - Add helpful debugging information: taskId, WebSocket connection status, ADW ID if available
  - Add a visual indicator (icon) to make the empty state more noticeable
- Update `CardExpandModal.jsx` no-logs fallback (line 511-513):
  - Add more specific messaging about why logs aren't available
  - Show whether it's due to missing ADW ID, no logs received yet, or other issues
- Update `StageLogsViewer.jsx` empty state for stage tabs (line 270-282):
  - Already has good empty state, verify it displays correctly

### 3. Fix Task ID Mapping Issues
- Review `handleWorkflowLog()` in `kanbanStore.js` (line 1388-1414):
  - Add fallback logic if task is not found by ADW ID
  - Log warning with all available task IDs and ADW IDs to help diagnose mapping issues
  - Consider storing logs by ADW ID as well as task ID to handle ID changes
- Add validation in `appendWorkflowLog()` (line 1618-1640):
  - Verify taskId is valid and task exists before appending logs
  - Log error if task not found
- Update `getWorkflowLogsForTask()` (line 1671-1674):
  - Add logging to show which taskId was requested and what was returned
  - Consider adding fallback to search by ADW ID if task ID lookup fails

### 4. Add Defensive Checks in CardExpandModal
- Update log section rendering in `CardExpandModal.jsx` (line 478-514):
  - Add explicit check: if workflowLogs is empty, show informative message
  - Display task.id and task.metadata?.adw_id for debugging
  - Show WebSocket connection status more prominently
  - Add a "Refresh" button to manually trigger log retrieval
  - Add timestamp of last log received (if any)

### 5. Verify StageLogsViewer Conditional Rendering
- Review conditional rendering in `StageLogsViewer.jsx` (line 290-312):
  - Ensure `WorkflowLogViewer` is rendered when `activeTab === 'all'` regardless of log count
  - The current logic looks correct: `activeTab === 'all' ? <WorkflowLogViewer ... />` should always render
  - Verify that `getLogsToDisplay()` is returning the correct logs array
  - Check that `allLogs` variable contains the expected data

### 6. Test Log Display End-to-End
- Manually test the complete flow:
  - Start WebSocket server, backend, and frontend
  - Create a new task with a unique title
  - Note the task ID from the store
  - Trigger a workflow (e.g., /plan) for that task
  - Monitor browser console for log messages from steps 1-5
  - Expand the card and verify logs appear in the "All Logs" tab
  - Check that subsequent logs arrive in real-time
  - Test with multiple tasks to ensure no cross-contamination
- Verify WebSocket message handling:
  - Use browser DevTools Network tab to inspect WebSocket messages
  - Confirm workflow_log messages include correct adw_id
  - Verify messages are being emitted to the 'workflow_log' event

### 7. Create E2E Test File
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/test_e2e.md` to understand the E2E test format
- Create a new E2E test file in `.claude/commands/e2e/test_logs_display.md` that validates the bug is fixed
- Test steps should include:
  1. Navigate to application URL
  2. Take screenshot of initial kanban board
  3. Create a new task with title "Test Log Display Bug #56"
  4. Verify task appears on the board
  5. Take screenshot of created task
  6. Click on the task to expand it
  7. Verify expanded modal appears with "Workflow Logs" section
  8. Take screenshot of expanded card showing logs section
  9. Verify either logs are displayed OR clear "No logs yet" message with helpful info is shown
  10. If no logs, verify the message explains why (e.g., "No workflow triggered yet", "WebSocket disconnected", etc.)
  11. Take screenshot proving logs display correctly or empty state is informative
- Success criteria:
  - Expanded card modal opens successfully
  - Workflow Logs section is visible and not blank
  - If logs exist, they are displayed correctly
  - If no logs exist, an informative message with debugging info is shown
  - 4 screenshots are captured to document the test

### 8. Run Validation Commands
- Execute all validation commands listed below to confirm the bug is fixed with zero regressions
- If any command fails, investigate and fix before proceeding
- Document any errors or warnings encountered

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run tsc --noEmit` - Run TypeScript type checking to ensure no type errors
- `npm run build` - Run frontend build to validate no build errors
- Manually test: Start the app, create a task, trigger workflow, expand card, verify logs display correctly or show informative empty state
- Check browser console for the new logging statements added in Step 1
- Verify task ID mapping: Check console logs show consistent task IDs from WebSocket → store → display
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_logs_display.md` test file to validate this functionality works

## Notes
- The bug is critical for user experience as workflow monitoring depends on log visibility
- The fix should be surgical - only change what's necessary to fix log display
- Preserve existing functionality for stage-specific logs (Plan, Build, Test, etc.)
- Maintain the detailed/simple view toggle functionality
- Keep the auto-scroll, filtering, and export features intact
- The WebSocket connection must be working for logs to arrive - verify connection status first
- Task ID consistency is crucial - if task IDs change between log storage and retrieval, logs will be lost
- Consider adding a migration path if old logs are stored under outdated task IDs
- The recent commit c787dba added log display infrastructure - verify it's working correctly
- Watch out for timing issues: logs may arrive before task is fully initialized in the store
- Test with multiple concurrent workflows to ensure logs don't cross-contaminate between tasks
