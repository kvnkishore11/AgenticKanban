# Bug: Fix Unknown Message Type: workflow_log

## Metadata
issue_number: `31`
adw_id: `7b25b54d`
issue_json: `{"number":31,"title":"fix the issue : Unknown message type: workflow_log...","body":"fix the issue : Unknown message type: workflow_log as shown in teh figure. This si what I am seeing in websocketService.js\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/fd8a91e3-7713-4bcc-b488-340c45d49959)\n\n"}`

## Bug Description
The WebSocket client is logging "Unknown message type: workflow_log" warnings in the browser console when the server sends `workflow_log` messages. This occurs because the `handleMessage` function in `websocketService.js` does not have a case handler for the `workflow_log` message type in its switch statement, causing these messages to fall through to the default case which logs the warning.

## Problem Statement
The `handleMessage` function in `src/services/websocket/websocketService.js` (lines 312-401) has a switch statement that handles the following message types:
- `trigger_response`
- `status_update`
- `error`
- `pong`

However, it is missing a case for `workflow_log`, even though:
1. The `workflow_log` event listener is registered in the event listeners initialization (line 40)
2. The WebSocket server sends `workflow_log` messages from workflows
3. The code already emits `workflow_log` events in other parts of the handler (lines 375 and 391)

When a `workflow_log` message arrives from the server, it falls through to the default case (line 398-399) which logs: `console.warn('Unknown message type:', type)`.

## Solution Statement
Add a case handler for `workflow_log` message type in the `handleMessage` function's switch statement that:
1. Emits the `workflow_log` event with the message data
2. Follows the same pattern as other message type handlers
3. Ensures `workflow_log` messages are properly handled without warnings

This is a minimal, surgical fix that adds one case statement to handle the missing message type.

## Steps to Reproduce
1. Start the WebSocket server: `cd /path/to/repo && uv run python adws/adw_triggers/trigger_websocket.py`
2. Start the client application: `cd app/client && bun run dev`
3. Open browser and navigate to http://localhost:5173
4. Open browser DevTools Console
5. Trigger a workflow from a kanban task
6. Observe browser console logs
7. See warning: "Unknown message type: workflow_log"

## Root Cause Analysis
The root cause is that when the `workflow_log` message type handler was added to the server side (in `adws/adw_triggers/trigger_websocket.py:770-793`), the corresponding client-side case handler was not added to the `handleMessage` function's switch statement in `websocketService.js`.

**Evidence**:
- `src/services/websocket/websocketService.js:320-400` - The switch statement in `handleMessage` has cases for `trigger_response`, `status_update`, `error`, and `pong`, but NOT for `workflow_log`
- `src/services/websocket/websocketService.js:398-399` - The default case logs "Unknown message type" for any unhandled message type
- `src/services/websocket/websocketService.js:40` - The event listener for `workflow_log` is registered, indicating this message type is expected
- `adws/adw_triggers/trigger_websocket.py:770-793` - The server sends `workflow_log` messages
- `src/services/websocket/websocketService.js:375, 391` - Other parts of the code emit `workflow_log` events, showing it's a valid event type

The message falls through to the default case because there is no explicit handler for it in the switch statement.

## Relevant Files
Use these files to fix the bug:

- **src/services/websocket/websocketService.js** (lines 320-400) - Add a case handler for `workflow_log` message type in the `handleMessage` function's switch statement. This is the only file that needs to be modified.

### New Files
None - this is a one-line bug fix to an existing file.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add workflow_log case handler to handleMessage function
- Open `src/services/websocket/websocketService.js`
- Locate the `handleMessage` function (around line 312)
- Find the switch statement that handles different message types (around line 320)
- Add a new case for `workflow_log` after the `pong` case and before the default case
- The handler should simply emit the `workflow_log` event with the data, following the same pattern as `trigger_response`:
  ```javascript
  case 'workflow_log':
    this.emit('workflow_log', data);
    break;
  ```
- This will prevent `workflow_log` messages from falling through to the default case

### 2. Run validation commands
- Execute all validation commands listed below
- Verify NO "Unknown message type: workflow_log" warnings appear in browser console
- Verify workflow logs are still processed correctly and appear in the UI
- Verify all tests pass with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Manual Testing Steps:
1. Start the WebSocket server: `cd /path/to/repo && uv run python adws/adw_triggers/trigger_websocket.py`
2. Start the client application: `cd app/client && bun run dev`
3. Open browser and navigate to the application (check `.ports.env` for FRONTEND_PORT or use default http://localhost:5173)
4. Open browser DevTools Console
5. Trigger a workflow from a kanban task
6. Monitor console logs for any "Unknown message type: workflow_log" warnings
7. **VERIFY**: NO "Unknown message type: workflow_log" warnings appear
8. **VERIFY**: Workflow logs still appear correctly in the kanban task UI
9. **VERIFY**: The workflow executes successfully and all logs are displayed
10. Trigger multiple workflows to test concurrent scenarios
11. **VERIFY**: No warnings appear for any workflow_log messages

Automated Tests:
- `cd app/client && bun tsc --noEmit` - Run TypeScript type checking to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- This is a minimal, surgical bug fix that adds exactly one case handler to the switch statement
- The fix is 3 lines of code (case statement, emit call, and break)
- The `workflow_log` event listener is already registered (line 40), so the infrastructure to handle these events already exists
- The server already sends `workflow_log` messages correctly (trigger_websocket.py:770-793)
- Other parts of the codebase already emit `workflow_log` events (lines 375, 391), so the event type is well-established
- This fix ensures consistency between the server-side message types and client-side handlers
- After this fix, `workflow_log` messages will be handled silently and properly, without console warnings
- The fix does not require any changes to tests, documentation, or other files
