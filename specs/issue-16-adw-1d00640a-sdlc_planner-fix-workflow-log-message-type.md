# Bug: Fix Unknown Message Type: workflow_log

## Metadata
issue_number: `16`
adw_id: `1d00640a`
issue_json: `{"number":16,"title":"can you fix teh unkonwn message type: workflow_log...","body":"can you fix teh unkonwn message type: workflow_log\n\nAlso I sometimes see duplication of logs from the websocket server. try to find if there is some bug and try to fix this.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/387bb6fe-c4da-434e-86fa-72138a1279ad)\n\n"}`

## Bug Description
The WebSocket server is rejecting `workflow_log` messages with the error "Unknown message type: workflow_log". Additionally, there are reports of duplicate log messages appearing from the WebSocket server, indicating a potential issue with message deduplication or duplicate event handling.

## Problem Statement
1. **Unknown Message Type Error**: The WebSocket server (`adws/adw_triggers/trigger_websocket.py`) does not have a handler for the `workflow_log` message type in the direct WebSocket endpoint, even though it handles this message type in the broadcast endpoint (`/api/workflow-updates`). When workflows send `workflow_log` messages directly via WebSocket, they are rejected as unknown message types.

2. **Duplicate Log Messages**: Log messages sometimes appear 2-3 times, indicating potential issues with:
   - Server-side broadcast duplication (multiple connections receiving the same message)
   - Client-side duplicate event listeners
   - Missing or ineffective message deduplication

## Solution Statement
1. Add a handler for the `workflow_log` message type in the WebSocket endpoint to accept and broadcast workflow log messages
2. Verify that session-based deduplication is properly implemented on the server side
3. Verify that client-side message deduplication cache is working correctly
4. Ensure duplicate listener prevention is functioning properly

## Steps to Reproduce
1. Start the WebSocket server and kanban client
2. Trigger a workflow from a kanban task
3. Observe browser console logs
4. See error: "Unknown message type: workflow_log"
5. Notice some log messages appearing 2-3 times

## Root Cause Analysis

### Issue 1: Missing workflow_log Handler
**Root Cause**: The WebSocket endpoint in `trigger_websocket.py` has handlers for:
- `trigger_workflow` (line 670)
- `ping` (line 711)
- `register_session` (line 730)
- `ticket_notification` (line 757)

However, it does NOT have a handler for `workflow_log`, even though:
- The WebSocket client (`adws/adw_modules/websocket_client.py:177`) sends `workflow_log` messages via `_send_message("workflow_log", data)`
- The broadcast endpoint (`/api/workflow-updates` at line 959) explicitly handles `workflow_log` message types
- The frontend WebSocket service (`src/services/websocket/websocketService.js:38`) has an event listener registered for `workflow_log` events

**Evidence**:
- `adws/adw_modules/websocket_client.py:177` - `return self._send_message("workflow_log", data)`
- `adws/adw_triggers/trigger_websocket.py:770-779` - Falls through to "Unknown message type" error
- `adws/adw_triggers/trigger_websocket.py:959-960` - Broadcast endpoint validates `workflow_log` type

### Issue 2: Duplicate Log Messages
**Root Cause**: Multiple potential sources:
1. **Server-side**: The `/api/workflow-updates` endpoint broadcasts to all active connections. If deduplication is not working, multiple tabs or connections will all receive and log the same message.
2. **Client-side deduplication**: The kanban store has message deduplication logic (`kanbanStore.js:1067-1159`), but it may not be catching all duplicates if fingerprints are not properly generated or if the cache is being cleared prematurely.
3. **Duplicate listeners**: While there is duplicate listener prevention (`websocketService.js:694-699`), there may be scenarios where listeners are still being registered multiple times.

**Evidence**:
- `src/stores/kanbanStore.js:1067-1159` - Message deduplication implementation
- `src/services/websocket/websocketService.js:694-699` - Duplicate listener prevention
- `adws/adw_triggers/trigger_websocket.py:977-980` - Broadcast with `deduplicate_by_session=True`

## Relevant Files
Use these files to fix the bug:

- **adws/adw_triggers/trigger_websocket.py** (lines 670-779) - Add handler for `workflow_log` message type in WebSocket endpoint
- **src/services/websocket/websocketService.js** (lines 310-379, 690-719) - Verify message handling and duplicate listener prevention
- **src/stores/kanbanStore.js** (lines 1067-1159, 1259-1278) - Verify message deduplication logic for workflow_log
- **adws/adw_modules/websocket_client.py** (lines 152-177) - Understand how workflow_log messages are sent

### New Files
None - this is a bug fix that only requires modifications to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add workflow_log handler to WebSocket endpoint
- Open `adws/adw_triggers/trigger_websocket.py`
- Locate the message type handling section (around line 757, after the `ticket_notification` handler)
- Add a new `elif` branch to handle `workflow_log` message type
- Extract log data from `message.get("data", {})`
- Broadcast the workflow_log message to all connected clients using `manager.broadcast()` with `deduplicate_by_session=True`
- Follow the same pattern as the `ticket_notification` handler
- Ensure proper error handling for validation failures

### 2. Verify server-side session deduplication
- Open `adws/adw_triggers/trigger_websocket.py`
- Verify that the `/api/workflow-updates` endpoint at line 977 is using `deduplicate_by_session=True`
- Verify that both `status_update` and `workflow_log` broadcasts use session deduplication
- Confirm that the new `workflow_log` handler in the WebSocket endpoint also uses session deduplication

### 3. Verify client-side message deduplication
- Open `src/stores/kanbanStore.js`
- Verify the `isDuplicateMessage` function (lines 1084-1159) properly handles `workflow_log` message types
- Ensure the `getMessageFingerprint` function (lines 1068-1081) includes all relevant fields for `workflow_log` messages
- Verify that `handleWorkflowLog` (lines 1259-1278) calls `isDuplicateMessage` before processing
- Confirm that the deduplication cache is not being cleared prematurely

### 4. Verify duplicate listener prevention
- Open `src/services/websocket/websocketService.js`
- Verify the `on()` method (lines 690-700) properly prevents duplicate listener registration
- Ensure the duplicate check at line 695 uses strict equality (`===`)
- Confirm the warning message at line 696 is logging when duplicates are detected
- Verify that the `workflow_log` event listener is in the `eventListeners` initialization (line 38)

### 5. Run validation commands
- Execute all validation commands listed below
- Verify no "Unknown message type: workflow_log" errors appear
- Verify workflow logs appear only once (not 2-3 times)
- Verify deduplication warnings appear if expected (multiple tabs scenario)
- Verify all tests pass with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Manual Testing Steps:
1. Start the WebSocket server: `uv run python adws/adw_triggers/trigger_websocket.py`
2. Start the client application: `cd app/client && bun run dev`
3. Open browser console and navigate to the application
4. Trigger a workflow from a kanban task
5. Verify NO "Unknown message type: workflow_log" errors appear in console
6. Verify workflow logs appear exactly ONCE (not 2-3 times)
7. Open a second browser tab with the application
8. Trigger another workflow
9. Verify logs still appear only once in each tab
10. Close the second tab and verify original tab continues to work correctly
11. Check server console output for any errors related to workflow_log handling

Automated Tests:
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The `workflow_log` message type is already handled in the `/api/workflow-updates` broadcast endpoint (line 959), so the fix is primarily about adding the same handling to the direct WebSocket endpoint
- Session-based deduplication (`deduplicate_by_session=True`) is already implemented and should prevent duplicate logs when multiple tabs are open
- The client-side deduplication cache in `kanbanStore.js` provides an additional layer of protection against duplicate message processing
- The duplicate listener prevention in `websocketService.js` ensures event listeners aren't registered multiple times
- After this fix, workflows will be able to send log messages directly via WebSocket without getting "Unknown message type" errors
- The bug fix should be minimal and surgical - just adding one message type handler to match the existing pattern
