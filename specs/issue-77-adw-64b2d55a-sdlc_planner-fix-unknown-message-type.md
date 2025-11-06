# Bug: Fix Unknown Message Type Warnings

## Metadata
issue_number: `77`
adw_id: `64b2d55a`
issue_json: `{"number":77,"title":"Fix the issue Unkown message type","body":"Fix the issue Unkown message type.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7e533b6a-a4a5-4114-b623-ffd4db24392d)\n\n"}`

## Bug Description
The WebSocket client is logging "Unknown message type" warnings in the browser console when the server sends message types that are not handled in the client's `websocketService.js`. Based on commit 62b4551 which implemented "robust WebSocket manager with agent-level streaming", several new message types were added to the backend servers but the corresponding client-side handlers are missing.

When the WebSocket server sends these unhandled message types, they fall through to the default case in the `handleMessage` function (line 478 of `websocketService.js`) which logs: `console.warn('Unknown message type:', type)`.

## Problem Statement
The WebSocket client (`src/services/websocket/websocketService.js`) is missing handlers for several message types that are being sent by the backend servers:
- `agent_created` - sent when a new agent is created
- `agent_updated` - sent when agent state changes
- `agent_deleted` - sent when an agent is deleted
- `agent_status_change` - sent when agent status transitions
- `orchestrator_updated` - sent when orchestrator state changes
- `system_log` - sent for system-level log messages
- `session_registered` - sent to confirm session registration
- `ticket_notification_response` - sent in response to ticket notifications
- `subscription_ack` - sent to acknowledge subscriptions

These missing handlers cause "Unknown message type" warnings in the browser console and prevent the UI from receiving and displaying real-time agent state updates, system logs, and other important events.

## Solution Statement
Add case handlers for all missing message types in the `handleMessage` function's switch statement in `websocketService.js`. Each handler will follow the existing pattern: emit an event with the data payload so that UI components can register listeners to receive these events.

This is a minimal, surgical fix that adds the missing case statements to prevent console warnings and enable proper event handling in the UI.

## Steps to Reproduce
1. Start the WebSocket server: `cd adws && uv run python adw_triggers/trigger_websocket.py`
2. Start the frontend application: `npm run dev`
3. Open browser DevTools Console
4. Trigger a workflow from a kanban task
5. Observe the "Unknown message type" warnings in the console for various message types
6. Note that these warnings appear when the server sends agent state updates, system logs, or other unhandled message types

## Root Cause Analysis
The root cause is a mismatch between the backend and frontend after the WebSocket manager enhancement (commit 62b4551). The backend servers (`adws/adw_modules/websocket_manager.py`, `adws/adw_triggers/trigger_websocket.py`, and `server/server.py`) were enhanced to send additional message types for agent-level streaming, but the frontend client's `handleMessage` function was not updated to handle all of these new message types.

Specifically:
- `adws/adw_modules/websocket_manager.py` sends: `agent_created`, `agent_updated`, `agent_deleted`, `agent_status_change`, `orchestrator_updated`, `system_log`, `chat_message`, `chat_stream`, `typing_indicator`
- `adws/adw_triggers/trigger_websocket.py` sends: `session_registered`, `ticket_notification_response`
- `server/server.py` sends: `subscription_ack`

The client's switch statement in `websocketService.js` (lines 342-479) only handles a subset of these message types, causing unhandled types to fall through to the default case which logs the warning.

## Relevant Files
Use these files to fix the bug:

- **src/services/websocket/websocketService.js** (lines 334-480) - The `handleMessage` function contains the switch statement that needs additional case handlers for the missing message types. This is the primary file that needs to be modified.

- **adws/adw_modules/websocket_manager.py** (lines 199-545) - Contains the server-side code that sends the unhandled message types. Reference this to understand the structure and purpose of each message type.

- **adws/adw_triggers/trigger_websocket.py** (lines 975, 1000) - Contains additional server-side message types (`session_registered`, `ticket_notification_response`). Reference this to understand these message types.

- **server/server.py** (lines 115, 128) - Contains the `subscription_ack` message type. Reference this to understand its structure.

- **app_docs/feature-7b25b54d-workflow-log-handler.md** - Documentation of a similar fix that added the `workflow_log` message type handler. Use this as a reference for the pattern to follow.

- **.claude/commands/conditional_docs.md** - To check if additional documentation is needed.

### New Files
No new files need to be created. This is a modification to existing files only.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add case handlers for agent management message types
- Locate the switch statement in `handleMessage` function (around line 342-479 in `src/services/websocket/websocketService.js`)
- Add case handlers for agent management events after the existing `agent_output_chunk` handler (around line 468):
  - `agent_created` - emit event with agent data
  - `agent_updated` - emit event with agent state updates
  - `agent_deleted` - emit event with deleted agent info
  - `agent_status_change` - emit event with status change data
- Follow the same pattern as existing handlers: `case 'type': this.emit('type', data); break;`

### 2. Add case handlers for orchestrator and system message types
- Add case handlers after the agent management handlers:
  - `orchestrator_updated` - emit event with orchestrator state
  - `system_log` - emit event with system log data
- Use the same event emission pattern

### 3. Add case handlers for session and subscription message types
- Add case handlers after the system message handlers:
  - `session_registered` - emit event with session confirmation
  - `ticket_notification_response` - emit event with ticket notification response
  - `subscription_ack` - emit event with subscription acknowledgment
- Use the same event emission pattern

### 4. Add case handlers for chat-related message types (future-proofing)
- Add case handlers for chat features after the subscription handlers:
  - `chat_message` - emit event with chat message data
  - `chat_stream` - emit event with streaming chat data
  - `typing_indicator` - emit event with typing indicator status
- Use the same event emission pattern
- Note: These handlers enable future chat features without requiring additional frontend changes

### 5. Run validation commands to ensure the bug is fixed
- Execute all commands in the "Validation Commands" section below
- Verify no "Unknown message type" warnings appear
- Verify frontend builds successfully
- Verify TypeScript type checking passes

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

**Manual Testing:**
1. Start the WebSocket server: `cd adws && uv run python adw_triggers/trigger_websocket.py`
2. Start the frontend: `npm run dev`
3. Open browser DevTools Console
4. Trigger a workflow from a kanban task
5. **VERIFY**: NO "Unknown message type" warnings appear in the console
6. **VERIFY**: Agent state updates appear in the UI (if applicable)
7. **VERIFY**: System logs are received (if applicable)

**Automated Testing:**
- `npm run tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- This fix is similar to the previous fix for `workflow_log` message type (documented in `app_docs/feature-7b25b54d-workflow-log-handler.md`)
- The fix is minimal and surgical - only adding case handlers to match the existing pattern
- No changes to the server-side code are needed
- No changes to TypeScript types are needed (the event emitter can handle dynamic event types)
- Some of these message types (like `chat_message`, `chat_stream`, `typing_indicator`) may not be actively used yet, but adding handlers now prevents future warnings when these features are implemented
- After this fix, UI components can register listeners for these new event types to display real-time agent state, system logs, and other information
- The fix maintains backward compatibility - existing message handlers continue to work as before
