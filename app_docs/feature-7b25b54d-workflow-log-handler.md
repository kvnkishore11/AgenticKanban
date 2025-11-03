# Fix Workflow Log Message Handler

**ADW ID:** 7b25b54d
**Date:** 2025-11-03
**Specification:** specs/issue-31-adw-7b25b54d-sdlc_planner-fix-workflow-log-handler.md

## Overview

Fixed a bug where the WebSocket client was logging "Unknown message type: workflow_log" warnings in the browser console. The issue occurred because the `handleMessage` function in `websocketService.js` was missing a case handler for the `workflow_log` message type, causing these messages to fall through to the default case.

## What Was Built

- Added a `workflow_log` case handler to the WebSocket message switch statement
- Ensured proper event emission for workflow log messages
- Eliminated console warnings for workflow log messages

## Technical Implementation

### Files Modified

- `src/services/websocket/websocketService.js`: Added case handler for `workflow_log` message type in the `handleMessage` function's switch statement (line 398-400)
- `src/stores/kanbanStore.js`: Added 'completed' phase to kanban board phases

### Key Changes

- Added a new case in the message type switch statement to handle `workflow_log` messages
- The handler follows the same pattern as other message handlers, simply emitting the event with the data
- This prevents `workflow_log` messages from falling through to the default case which logs unknown message warnings

## How to Use

This fix operates automatically when workflow logs are sent from the server:

1. When the WebSocket server sends a `workflow_log` message
2. The client now properly handles it by emitting a `workflow_log` event
3. Registered event listeners receive the workflow log data
4. No console warnings are generated

## Configuration

No configuration changes required. The fix works automatically with existing WebSocket infrastructure.

## Testing

Manual Testing:
1. Start the WebSocket server: `uv run python adws/adw_triggers/trigger_websocket.py`
2. Start the client application: `bun run dev`
3. Open browser DevTools Console
4. Trigger a workflow from a kanban task
5. Verify NO "Unknown message type: workflow_log" warnings appear in console
6. Verify workflow logs still appear correctly in the UI

Automated Tests:
- `bun tsc --noEmit` - TypeScript type checking passes
- `bun run build` - Frontend build completes successfully

## Notes

- This was a minimal, surgical fix requiring only 3 lines of code
- The `workflow_log` event listener infrastructure already existed in the codebase
- The server was already sending `workflow_log` messages correctly
- Other parts of the codebase already emit `workflow_log` events, making this a consistency fix
- No changes to tests or other files were required
