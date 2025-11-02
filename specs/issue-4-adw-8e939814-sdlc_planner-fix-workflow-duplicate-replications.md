# Bug: Fix Workflow Duplicate Replications on Trigger

## Metadata
issue_number: `4`
adw_id: `8e939814`
issue_json: `{"number":4,"title":"whenever i trigger a workflow","body":"whenever i trigger a workflow. not sure something weird is happening like multiple replications are seen as shown in the console logs in the image. try to fix this.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5174/952e5b5b-a894-4b0c-99bb-f4bc158fd727)\n\n"}`

## Bug Description
When a user triggers a workflow from the Kanban board, multiple replications of the workflow are being executed instead of a single workflow execution. The issue manifests as duplicate console logs and potentially multiple workflow status updates, suggesting that event handlers are being called multiple times for a single workflow trigger event.

Expected behavior: Triggering a workflow should execute exactly once, with a single set of console logs and status updates.

Actual behavior: Multiple replications are seen in the console logs, indicating that workflow trigger handlers are executing multiple times for a single trigger event.

## Problem Statement
The WebSocket event listener system in the Kanban store is registering duplicate event handlers every time `initializeWebSocket()` is called. Since React's `useEffect` hook in `App.jsx` can re-run when dependencies change, the event listeners get registered multiple times without cleanup. When a workflow is triggered and the server sends a `trigger_response` event, all registered listeners fire, causing duplicate workflow processing, status updates, and task metadata modifications.

## Solution Statement
Implement a guard mechanism to prevent duplicate event listener registration in the `initializeWebSocket()` method. Add an initialization flag to track whether WebSocket event listeners have already been registered, and skip re-registration if they exist. Additionally, implement proper cleanup of event listeners when the WebSocket disconnects or when the component unmounts to prevent listener accumulation over time.

## Steps to Reproduce
1. Start the Agentic Kanban application (frontend and backend)
2. Open the Kanban board in the browser
3. Ensure WebSocket is connected (check the status indicator)
4. Select a task and click "Trigger Workflow"
5. Choose a workflow type and submit
6. Observe the browser console logs
7. Notice multiple duplicate log entries for the same workflow trigger event
8. Optionally: Navigate away and back to the page, or trigger a WebSocket reconnection
9. Trigger another workflow and observe even more duplications

## Root Cause Analysis
The root cause is in the WebSocket event listener registration system:

1. **Missing Initialization Guard** (src/stores/kanbanStore.js:842-891): The `initializeWebSocket()` method registers 6 event listeners (`connect`, `disconnect`, `error`, `status_update`, `workflow_log`, `trigger_response`) every time it's called, without checking if listeners are already registered.

2. **React useEffect Re-execution** (src/App.jsx:36-44): The `useEffect` hook has `[initializeWebSocket]` as a dependency, which can cause the effect to re-run when the function reference changes during React re-renders.

3. **No Listener Cleanup** (src/services/websocket/websocketService.js:660-684): The WebSocket service's event system uses simple arrays to store listeners with no deduplication mechanism. The `on()` method (line 664) just pushes listeners to the array without checking for duplicates.

4. **Multiple Execution Path**: When a workflow is triggered:
   - Server sends `trigger_response` message
   - `emit()` method (line 675-684) calls **all** listeners in the array
   - If `initializeWebSocket()` was called twice, both sets of listeners execute
   - This causes `handleTriggerResponse()`, `handleWorkflowStatusUpdate()`, and other handlers to run multiple times
   - Task metadata gets duplicated, status updates are applied multiple times

5. **Compounding Issue**: Every WebSocket reconnection or page navigation potentially adds more duplicate listeners, making the problem worse over time.

## Relevant Files
Use these files to fix the bug:

- `src/stores/kanbanStore.js` (lines 842-891) - Contains the `initializeWebSocket()` method that registers event listeners without guards. This is the primary location of the bug where duplicate listeners are registered.

- `src/services/websocket/websocketService.js` (lines 660-684) - Contains the event listener system (`on()`, `off()`, `emit()` methods) that allows duplicate registrations. The `on()` method needs to check for existing listeners before adding new ones.

- `src/App.jsx` (lines 36-44) - Contains the `useEffect` hook that calls `initializeWebSocket()` with a dependency array that can trigger re-initialization. Needs to be updated to prevent unnecessary re-runs.

- `src/stores/kanbanStore.js` (lines 1044-1061) - Contains `handleTriggerResponse()` which gets called multiple times when duplicate listeners exist, causing duplicate task updates.

- `src/stores/kanbanStore.js` (lines 963-1024) - Contains `handleWorkflowStatusUpdate()` which processes workflow status updates and gets called multiple times with duplicate listeners.

- `src/stores/kanbanStore.js` (lines 893-900) - Contains `disconnectWebSocket()` method that should clean up event listeners but currently doesn't.

### New Files
- `.claude/commands/e2e/test_workflow_duplicate_prevention.md` - E2E test to validate that workflows trigger exactly once without duplications

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add initialization guard to prevent duplicate listener registration
- Modify `src/stores/kanbanStore.js` to add an initialization flag that tracks whether WebSocket event listeners have already been registered
- Add a check at the beginning of `initializeWebSocket()` to return early if listeners are already registered
- Use a property on the WebSocket service instance to track initialization state (e.g., `websocketService._storeListenersRegistered`)
- Ensure the flag is set to `true` after listeners are registered successfully

### 2. Add duplicate prevention to WebSocket event listener system
- Modify `src/services/websocket/websocketService.js` in the `on()` method to check if the listener already exists before adding it
- Implement listener deduplication by checking if the exact listener function reference is already in the array
- Optionally: Add a `once()` method for one-time event listeners that automatically clean up after execution

### 3. Implement proper cleanup of event listeners on disconnect
- Modify `src/stores/kanbanStore.js` in the `disconnectWebSocket()` method to remove all registered event listeners
- Store references to the listener functions so they can be passed to `websocketService.off()` for removal
- Add cleanup logic to remove listeners for: `connect`, `disconnect`, `error`, `status_update`, `workflow_log`, `trigger_response`
- Reset the initialization flag when disconnecting so listeners can be re-registered cleanly on reconnect

### 4. Fix React useEffect dependency to prevent unnecessary re-initialization
- Modify `src/App.jsx` to use `useRef` or `useState` to track if WebSocket has been initialized
- Change the `useEffect` dependency array to prevent re-runs when `initializeWebSocket` function reference changes
- Consider using an empty dependency array `[]` with a flag check, or moving initialization logic outside the effect

### 5. Add console logging for debugging listener registration
- Add console logs in `initializeWebSocket()` to track when it's called and whether it skips due to existing listeners
- Add console logs in the WebSocket service's `on()` method to warn about duplicate listener attempts
- Add console logs in `disconnectWebSocket()` to confirm cleanup is occurring
- These logs will help verify the fix and debug any future issues

### 6. Create E2E test for workflow duplicate prevention
- Read `.claude/commands/test_e2e.md` to understand the E2E test framework
- Read `.claude/commands/e2e/test_websocket_reliability.md` as an example of a WebSocket E2E test
- Create a new E2E test file `.claude/commands/e2e/test_workflow_duplicate_prevention.md`
- The test should:
  - Trigger a workflow from the Kanban board
  - Monitor console logs for duplicate messages
  - Verify that workflow handlers execute exactly once
  - Verify that task status updates occur exactly once
  - Test workflow triggering after page navigation/re-render
  - Test workflow triggering after WebSocket reconnection
  - Take screenshots showing single workflow execution confirmation

### 7. Run validation commands to ensure bug is fixed
- Execute all validation commands listed in the `Validation Commands` section
- Verify no test failures occur
- Verify no TypeScript compilation errors
- Verify frontend build succeeds
- Execute the new E2E test to validate workflow triggering works correctly

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Before running validation:
1. Start the application: `bash scripts/start.sh`
2. Trigger a workflow manually and verify in console logs that no duplications occur
3. Navigate away and back to the Kanban board
4. Trigger another workflow and verify still no duplications
5. Check browser console for any "duplicate listener" warnings

Automated validation:
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend TypeScript type checking to validate no type errors
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test file `.claude/commands/e2e/test_workflow_duplicate_prevention.md` to validate workflows trigger exactly once without duplications

## Notes
- This bug is classified as **CRITICAL** because it causes workflows to execute multiple times, which can lead to wasted resources, duplicate work, and confusing user experience
- The fix must be surgical - only prevent duplicate listener registration without changing the workflow trigger logic or WebSocket communication protocol
- The initialization guard approach is preferred over removing/re-adding listeners because it's more performant and cleaner
- Consider adding telemetry or metrics to track listener registration counts in production to detect if this issue recurs
- The `websocketService` is a singleton instance, so the initialization flag will persist across the application lifecycle
- After this fix, ensure the WebSocket connection can still be disconnected and reconnected cleanly when needed (e.g., user manually disconnects in settings)
- The E2E test should validate not just that workflows trigger, but that they trigger **exactly once** - this is the key success criterion
