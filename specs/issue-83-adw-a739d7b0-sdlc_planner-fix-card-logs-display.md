# Bug: Logs Not Displaying on Frontend Card Despite WebSocket Transmission

## Metadata
issue_number: `83`
adw_id: `a739d7b0`
issue_json: `{"number":83,"title":"i still dont see the logs on the forntned card","body":"i still dont see the logs on the forntned card. I see the logs are begin sent by my websocket though. try to fix this issue."}`

## Bug Description
Users report that workflow logs are not displaying on the frontend Kanban cards even though the logs are being transmitted via WebSocket. The WebSocket connection is active and sending `workflow_log` messages, but these logs are not appearing in the card's expanded view in the StageLogsViewer component.

Recent attempts (commit 743ec3b) added null-safety checks to the log viewer components, but the fundamental issue preventing logs from displaying persists.

## Problem Statement
The StageLogsViewer component in CardExpandModal is not showing real-time logs even when the WebSocket is successfully transmitting `workflow_log` messages and the kanbanStore is receiving them. The conditional rendering logic in CardExpandModal may be preventing the component from being displayed, or there may be an issue with how logs are being stored/retrieved from the store.

## Solution Statement
Debug and fix the complete flow from WebSocket message reception to log display by:
1. Verifying WebSocket messages are being received and emitted correctly
2. Confirming the kanbanStore handlers are processing logs and storing them properly
3. Ensuring the CardExpandModal conditional logic allows StageLogsViewer to render
4. Validating that StageLogsViewer correctly retrieves and displays logs from the store
5. Adding comprehensive console logging to trace the data flow
6. Creating an E2E test to validate the fix and prevent regressions

## Steps to Reproduce
1. Start the WebSocket server: `python start-websocket.py`
2. Start the backend API: `cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
3. Start the frontend: `npm run dev`
4. Open the application at http://localhost:5173
5. Trigger a workflow that generates logs (e.g., run an ADW workflow)
6. Observe WebSocket console logs showing `workflow_log` messages being sent
7. Click on a task card to expand it
8. Navigate to the "Workflow Logs" section
9. **BUG**: Logs are not displayed even though WebSocket is transmitting them

## Root Cause Analysis
Based on code analysis, the issue likely stems from one or more of the following:

1. **Conditional Rendering Issue (Most Likely)**: In `CardExpandModal.jsx:496`, the StageLogsViewer only renders if `workflowLogs.length > 0 || task.metadata?.adw_id`. If `workflowLogs` is initially empty and the component doesn't re-render when logs arrive, the viewer won't appear.

2. **Store Update Not Triggering Re-render**: The `handleWorkflowLog` function in `kanbanStore.js:1315-1334` appends logs to `taskWorkflowLogs[taskId]`, but the Zustand store update might not be triggering React re-renders properly.

3. **Task Matching Issue**: The log handler finds tasks by matching `task.metadata?.adw_id` with the log's `adw_id` (line 1327). If the task doesn't have this metadata or it doesn't match, logs won't be associated with the task.

4. **Duplicate Message Filtering**: The `isDuplicateMessage` check (line 1317) might be incorrectly filtering out legitimate log messages as duplicates.

5. **Timing Issue**: If the CardExpandModal is opened before any logs arrive, it may not update when logs start coming in via WebSocket.

The fix requires ensuring that:
- The conditional rendering logic always shows StageLogsViewer when an `adw_id` exists
- Store updates properly trigger component re-renders
- Comprehensive logging helps diagnose the exact failure point

## Relevant Files
Use these files to fix the bug:

- **src/components/kanban/CardExpandModal.jsx** (lines 496-507) - Contains the conditional rendering logic that controls whether StageLogsViewer is displayed. The condition `workflowLogs.length > 0 || task.metadata?.adw_id` needs review to ensure the viewer is shown even when logs array is initially empty.

- **src/stores/kanbanStore.js** (lines 1315-1334, 1389-1407, 1439-1442) - Contains the log handling logic including `handleWorkflowLog`, `appendWorkflowLog`, and `getWorkflowLogsForTask`. Need to verify that store updates trigger re-renders and logs are being stored correctly.

- **src/components/kanban/StageLogsViewer.jsx** (lines 50-79, 285-311) - The component that displays logs in tabs. Line 65 retrieves logs using `getWorkflowLogsForTask(taskId)`. Recent fixes added null-safety but need to ensure the component properly reacts to store updates.

- **src/components/kanban/WorkflowLogViewer.jsx** (lines 34-54) - The actual log rendering component. Recent fixes added `safeLogs` array handling (lines 37-38) but need to verify it displays logs correctly when they exist.

- **src/services/websocket/websocketService.js** (lines 420-421) - Handles incoming `workflow_log` messages and emits them to listeners. Need to verify these events are being fired correctly.

### New Files

- **.claude/commands/e2e/test_card_logs_display.md** - E2E test file to validate that logs display correctly on frontend cards when WebSocket messages are received.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add Comprehensive Debugging Logs to Trace Data Flow

- Add console.log statements in `websocketService.js` at line 421 to log when `workflow_log` events are emitted with the full message payload
- Add console.log statements in `kanbanStore.js` in `handleWorkflowLog` (line 1323) to show when logs are received, before the duplicate check
- Add console.log statements in `kanbanStore.js` in `appendWorkflowLog` (after line 1390) to confirm logs are being added to the store
- Add console.log statements in `CardExpandModal.jsx` at line 54 to log the `workflowLogs` array length and contents whenever the component renders
- Add console.log statements in `StageLogsViewer.jsx` at line 65 to log the retrieved `allLogs` array

### 2. Fix Conditional Rendering in CardExpandModal

- Review the conditional logic at `CardExpandModal.jsx:496`
- Change the condition to always show StageLogsViewer when `task.metadata?.adw_id` exists, regardless of `workflowLogs.length`
- Update to: `{task.metadata?.adw_id ? (` instead of `{workflowLogs.length > 0 || task.metadata?.adw_id ? (`
- This ensures the logs viewer is mounted and can react to incoming logs even if none exist initially

### 3. Verify Store Update Triggers React Re-renders

- In `kanbanStore.js`, review the `appendWorkflowLog` function (lines 1389-1407)
- Ensure that the `set()` call properly updates the `taskWorkflowLogs` object in a way that triggers Zustand subscribers
- Verify that we're creating a new object reference for `taskWorkflowLogs` when updating, not mutating the existing one
- Update the set call to use: `set({ taskWorkflowLogs: { ...get().taskWorkflowLogs, [taskId]: updatedLogs } })` to ensure proper reactivity

### 4. Add Task Metadata Validation

- In `kanbanStore.js` in `handleWorkflowLog` (line 1327), add a console warning if the task is found but doesn't have matching `adw_id`
- Add a console log showing all tasks and their `adw_id` metadata to help debug matching issues
- Ensure the log clearly states when a task is found vs not found, and why

### 5. Review Duplicate Message Detection

- Review the `isDuplicateMessage` implementation in `kanbanStore.js` to ensure it's not incorrectly filtering valid log messages
- Add console logs showing when messages are filtered as duplicates
- Consider if the duplicate detection logic needs to be refined for `workflow_log` message types

### 6. Test the Fix Manually

- Start all servers (WebSocket, backend, frontend)
- Open browser console to view debug logs
- Trigger a workflow that generates logs
- Open a task card and verify logs appear in the StageLogsViewer
- Verify the console logs show the complete data flow from WebSocket → store → component

### 7. Create E2E Test for Log Display Validation

- Read `.claude/commands/e2e/test_basic_query.md` to understand the E2E test format
- Read `.claude/commands/test_e2e.md` to understand how E2E tests are executed
- Create a new E2E test file `.claude/commands/e2e/test_card_logs_display.md` that:
  - Navigates to the application
  - Triggers a workflow that generates logs (or simulates WebSocket log messages)
  - Opens a task card with the `adw_id` matching the logs
  - Verifies the StageLogsViewer component is visible
  - Verifies logs are displayed in the "all" tab
  - Takes screenshots showing: initial state, card expanded view, logs displayed
  - Validates that at least one log entry is visible in the viewer

### 8. Run Validation Commands

- Execute all validation commands listed in the "Validation Commands" section below
- Ensure zero errors and zero regressions
- Verify logs display correctly on cards in both manual testing and E2E test

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Open browser console and verify debug logs show the complete flow: WebSocket → emit → handleWorkflowLog → appendWorkflowLog → component render
- Manually verify that opening a task card with an active workflow shows real-time logs in the StageLogsViewer
- Verify that logs continue to update in real-time as new WebSocket messages arrive
- Verify that the "all" tab shows all logs, and they are displayed in reverse chronological order
- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test `.claude/commands/e2e/test_card_logs_display.md` to validate this functionality works
- `npm run tsc --noEmit` - Run TypeScript type checking to validate no type errors were introduced
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes

- The recent commit 743ec3b attempted to fix this by adding null-safety checks, but the root cause is likely the conditional rendering logic preventing the component from mounting
- The key insight is that if `workflowLogs.length` is 0 when the component first renders, the StageLogsViewer never gets mounted, so it can't react to new logs arriving via WebSocket
- The fix should ensure StageLogsViewer is always mounted when an `adw_id` exists, allowing it to be reactive to store updates
- Consider that this is a common React pattern issue: conditional rendering preventing reactive updates
- The debugging logs added in step 1 should remain in the code temporarily to help diagnose any future similar issues, but can be removed in a follow-up cleanup task
- The E2E test will serve as a regression prevention mechanism for this critical feature
