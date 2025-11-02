# Bug: Fix Duplicate WebSocket Logs and Remove Ping/Pong Messages

## Metadata
issue_number: `5`
adw_id: `c67b4298`
issue_json: `{"number":5,"title":"I see there are issues with teh logs coming from w...","body":"I see there are issues with teh logs coming from websocket. basically i see some of the logs getting repeated twice or sometimes thrice. try to fix this. \n\n2. also the websocket messge ping and pong.. all the time. i dont think so I need them. try to clean that up.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5174/8ab85621-b1ec-43fe-a08e-9d22146a0fdf)\n\n![image.png](blob:http://localhost:5174/d6a7881c-60de-4e97-b63c-eea12ac6fa49)\n\n"}`

## Bug Description
The WebSocket connection is experiencing two issues:
1. **Duplicate logs**: Some log messages are appearing 2-3 times in the console, indicating multiple event handlers or broadcast duplication
2. **Excessive ping/pong messages**: Ping/pong heartbeat messages are cluttering the console logs and are not needed for debugging

## Problem Statement
The WebSocket implementation has duplicate event listeners causing logs to appear multiple times, and the ping/pong heartbeat mechanism is logging unnecessarily verbose console messages that reduce visibility of important workflow logs.

## Solution Statement
1. Add duplicate listener prevention in the WebSocketService `on()` method (already partially implemented but needs verification)
2. Implement session-based deduplication in server broadcasts to prevent multiple tabs from causing duplicate processing
3. Remove or suppress console.log statements for ping/pong messages in both client and server
4. Ensure only one connection per client session processes workflow updates

## Steps to Reproduce
1. Open the kanban application in the browser
2. Open browser console to view logs
3. Trigger a workflow from a kanban task
4. Observe duplicate log messages appearing 2-3 times
5. Observe constant ping/pong messages in the console every 15 seconds

## Root Cause Analysis

### Issue 1: Duplicate Logs
**Root Cause**: Multiple sources of duplication:
1. **Client-side duplication**: The `handleMessage()` method in `websocketService.js:306` logs every received message. If multiple listeners are registered for the same event, each will process the message.
2. **Server-side broadcast duplication**: In `trigger_websocket.py:976`, the `/api/workflow-updates` endpoint broadcasts to ALL active connections without session deduplication. If a user has multiple tabs open, each tab receives the same message.
3. **Health monitor additional logging**: `connectionHealthMonitor.js:313` tracks all received messages and logs them, potentially causing duplicate logging.

**Evidence from code**:
- `websocketService.js:306` - "console.log('Received WebSocket message:', type, data)"
- `websocketService.js:677-687` - Duplicate listener prevention exists but may not catch all cases
- `trigger_websocket.py:976` - `await manager.broadcast()` sends to all connections without deduplication option
- `connectionHealthMonitor.js:313-327` - Additional message logging for metrics

### Issue 2: Excessive Ping/Pong Logs
**Root Cause**: Console logging of heartbeat messages:
1. **Client ping logs**: `websocketService.js:285` sends ping every 15 seconds, logged at line 402
2. **Server pong logs**: `trigger_websocket.py:711-728` handles ping and responds with pong
3. **Client pong logs**: `websocketService.js:362-365` logs pong receipt
4. **Health monitor pong logs**: `connectionHealthMonitor.js:332-341` logs latency measurement

These are internal health check messages that should not appear in normal console output.

## Relevant Files
Use these files to fix the bug:

- **src/services/websocket/websocketService.js** (lines 306, 362-365, 402) - Remove/suppress ping/pong console logs, verify duplicate listener prevention
- **src/services/websocket/connectionHealthMonitor.js** (lines 313-327, 332-341) - Remove/suppress ping/pong and duplicate message logs
- **adws/adw_triggers/trigger_websocket.py** (lines 711-728, 976) - Suppress ping/pong logs, enable session-based deduplication for broadcasts
- **README.md** - Project overview for understanding the application structure

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Remove ping/pong console logs from client WebSocket service
- Open `src/services/websocket/websocketService.js`
- Remove or comment out `console.log('Received WebSocket message:', type, data)` at line 306 for ping/pong messages
- Replace with conditional logging that excludes ping/pong types
- Remove or suppress `console.log('Sent WebSocket message:', message.type)` at line 402 for ping messages
- Keep error logs and important status messages

### 2. Remove ping/pong console logs from connection health monitor
- Open `src/services/websocket/connectionHealthMonitor.js`
- Remove or suppress `console.log` at line 340 that logs "Latency measured"
- Keep the latency measurement functionality but remove the console output
- Ensure handleMessageEvent at line 313 doesn't log ping/pong related throughput updates to console

### 3. Remove ping/pong console logs from server
- Open `adws/adw_triggers/trigger_websocket.py`
- Remove any console output related to ping/pong message handling in the websocket_endpoint function (lines 711-728)
- Keep the ping/pong functionality but suppress verbose logging

### 4. Enable session-based deduplication for workflow broadcasts
- Open `adws/adw_triggers/trigger_websocket.py`
- Modify the `/api/workflow-updates` endpoint at line 976
- Change `await manager.broadcast()` to use `deduplicate_by_session=True` parameter
- This ensures workflow updates are sent to only one connection per unique browser session, preventing duplicate logs when multiple tabs are open

### 5. Verify duplicate listener prevention in WebSocketService
- Open `src/services/websocket/websocketService.js`
- Verify the `on()` method at lines 677-687 properly prevents duplicate listener registration
- Ensure the duplicate check uses strict equality and properly warns when duplicates are detected
- Test that event listeners are properly cleaned up and not re-added

### 6. Run validation commands
- Execute all validation commands listed below to ensure the bug is fixed with zero regressions
- Verify no duplicate logs appear in browser console
- Verify ping/pong messages no longer clutter the console
- Verify workflow functionality remains intact

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Manual Testing Steps:
1. Start the WebSocket server: `cd adws/adw_triggers && uv run trigger_websocket.py`
2. Start the client application: `cd app/client && bun run dev`
3. Open browser console and navigate to the application
4. Trigger a workflow from a kanban task
5. Verify workflow logs appear only ONCE (not 2-3 times)
6. Verify ping/pong messages do NOT appear in console
7. Open a second browser tab with the application
8. Trigger another workflow
9. Verify logs still appear only once in each tab
10. Close the second tab and verify original tab continues to work correctly

Automated Tests:
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The ping/pong heartbeat mechanism should remain functional (connection health monitoring depends on it), but the console logging should be removed
- Session-based deduplication requires that the client registers its session_id with the server on connection (this mechanism already exists in the codebase)
- Consider using browser DevTools filtering (e.g., filter by log level or message content) as a fallback if some debug logs are needed during development
- The duplicate listener prevention already exists in the code but should be thoroughly tested
- Be careful not to remove error logging or critical status updates that are needed for debugging real issues
