# Bug: Fix Workflow Duplicate Replications

## Metadata
issue_number: `5`
adw_id: `186eaf57`
issue_json: `{"number":5,"title":"whenever i trigger a workflow","body":"whenever i trigger a workflow. not sure something weird is happening like multiple replications are seen as shown in the console logs. try to fix this"}`

## Bug Description
When a user triggers a workflow from the Kanban board, multiple replications of workflow status updates are being seen in the console logs. The issue manifests as duplicate console log messages for workflow status updates, even though issue #4 (adw-8e939814) previously implemented frontend listener deduplication guards.

Expected behavior: Triggering a workflow should show each status update exactly once in the console logs.

Actual behavior: Multiple duplicate console log messages appear for the same workflow events, suggesting that workflow updates are being processed multiple times.

## Problem Statement
The frontend listener deduplication from issue #4 prevents duplicate event listener registration, but there is a separate source of duplication: **backend broadcast behavior combined with multiple WebSocket connections**. The WebSocket server broadcasts workflow updates to ALL connected clients via `manager.broadcast()` (trigger_websocket.py:867). If a user has multiple browser tabs/windows open, or if WebSocket reconnections create lingering connections, each connection receives the broadcast independently, resulting in multiple status updates appearing in the same client's console logs. Additionally, the frontend may not properly deduplicate received status updates by their unique identifiers (adw_id + timestamp + status).

## Solution Statement
Implement a multi-layered deduplication strategy:

1. **Backend Connection Deduplication**: Modify the ConnectionManager to track and prevent duplicate connections from the same client (based on session/client ID)
2. **Frontend Message Deduplication**: Add a message deduplication cache in the frontend event handlers to ignore duplicate status updates based on unique message identifiers (adw_id + message_type + timestamp + content hash)
3. **Debug Logging**: Add comprehensive logging to identify the source of duplicates (multiple connections vs. duplicate broadcasts vs. other causes)

This surgical approach ensures workflow updates are processed exactly once per unique update, regardless of connection topology.

## Steps to Reproduce
1. Start the Agentic Kanban application (frontend and backend)
2. Open the Kanban board in a browser
3. Optionally: Open the same Kanban board in a second browser tab to simulate multiple connections
4. Ensure WebSocket is connected (check the status indicator)
5. Select a task and click "Trigger Workflow"
6. Choose a workflow type and submit
7. Observe the browser console logs in the first tab
8. Notice multiple duplicate log entries for the same workflow status updates
9. If using two tabs, observe that both tabs receive the same broadcasts

## Root Cause Analysis
The root cause is a combination of backend broadcast behavior and missing frontend deduplication:

1. **Backend Broadcasts to All Connections** (trigger_websocket.py:867): When a workflow subprocess sends status updates via HTTP POST to `/api/workflow-updates`, the server calls `manager.broadcast()` which sends the message to **all active WebSocket connections** in the `active_connections` set.

2. **Multiple Connections Per Client**: If a user opens multiple browser tabs/windows, each creates its own WebSocket connection. All connections are stored in `manager.active_connections` as separate entries. When a workflow update is broadcast, **each tab receives the same message**.

3. **No Frontend Message Deduplication**: The frontend event handlers in `kanbanStore.js` (lines 1006-1104) process every received message without checking if the exact same update was already processed. The handlers immediately log and update state for every incoming message, even if it's a duplicate broadcast.

4. **Connection Lifecycle Issues**: If WebSocket connections don't cleanly disconnect (e.g., network issues, rapid page refreshes), stale connections may linger in `active_connections` for up to 5 minutes (connection_timeout = 300s), continuing to receive broadcasts.

5. **Execution Flow**:
   - User triggers workflow in Tab A
   - Workflow subprocess sends status update via HTTP POST
   - Backend `receive_workflow_update()` broadcasts to all connections
   - Tab A's connection receives message → logs to console
   - Tab B's connection receives message → logs to console (if open)
   - Lingering stale connection receives message → may cause issues
   - Result: Same status update appears 2+ times in console logs

## Relevant Files
Use these files to fix the bug:

- `adws/adw_triggers/trigger_websocket.py` (lines 242-263) - Contains the `broadcast()` method that sends messages to all connections. Need to add logic to track unique client sessions and prevent broadcasting duplicate messages to the same logical client.

- `adws/adw_triggers/trigger_websocket.py` (lines 114-130) - Contains the `connect()` method that accepts new connections. Need to add client session tracking to identify when the same client opens multiple connections.

- `adws/adw_triggers/trigger_websocket.py` (lines 806-890) - Contains the `/api/workflow-updates` endpoint that broadcasts updates. Need to ensure broadcasts are deduplicated before sending.

- `src/stores/kanbanStore.js` (lines 1006-1067) - Contains `handleWorkflowStatusUpdate()` which processes workflow status updates. Need to add deduplication logic to ignore duplicate updates based on message fingerprint.

- `src/stores/kanbanStore.js` (lines 1070-1084) - Contains `handleWorkflowLog()` which processes workflow logs. Need to add deduplication logic.

- `src/stores/kanbanStore.js` (lines 1087-1104) - Contains `handleTriggerResponse()` which processes trigger responses. Need to add deduplication logic.

- `src/stores/kanbanStore.js` (state initialization) - Need to add a message deduplication cache to track recently processed message fingerprints.

- `src/services/websocket/websocketService.js` (lines 1-50) - Contains WebSocket initialization. Consider adding a unique client session ID that persists across page navigation within the same browser session.

### New Files
- `.claude/commands/e2e/test_workflow_duplicate_prevention.md` - E2E test to validate that workflows trigger exactly once without duplications, even with multiple browser tabs open

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add message deduplication cache to frontend Kanban store
- Modify `src/stores/kanbanStore.js` to add a message deduplication cache in the store state
- Create a `processedMessages` Set to track message fingerprints (limited to last 1000 messages to prevent memory leak)
- Add a helper function `getMessageFingerprint(messageType, data)` that creates a unique hash from: `adw_id + message_type + timestamp + status/level + message`
- Implement a cleanup mechanism to remove old fingerprints after 5 minutes

### 2. Implement deduplication in handleWorkflowStatusUpdate
- Modify `src/stores/kanbanStore.js` in the `handleWorkflowStatusUpdate()` method (line 1006)
- At the beginning of the handler, calculate the message fingerprint
- Check if the fingerprint exists in `processedMessages` cache
- If duplicate detected, log a warning and return early without processing
- If new message, add fingerprint to cache and process normally
- Add debug logging to track: "Processing new status update" vs "Ignoring duplicate status update"

### 3. Implement deduplication in handleWorkflowLog
- Modify `src/stores/kanbanStore.js` in the `handleWorkflowLog()` method (line 1070)
- Apply the same fingerprint-based deduplication as step 2
- Check fingerprint cache before processing
- Log duplicates and skip processing if already seen

### 4. Implement deduplication in handleTriggerResponse
- Modify `src/stores/kanbanStore.js` in the `handleTriggerResponse()` method (line 1087)
- Apply the same fingerprint-based deduplication as steps 2-3
- Check fingerprint cache before processing
- Log duplicates and skip processing if already seen

### 5. Add connection session tracking to backend WebSocket server
- Modify `adws/adw_triggers/trigger_websocket.py` in the `ConnectionManager.__init__()` method
- Add a `client_sessions` dictionary to track unique client session IDs
- Add a `session_connections` dictionary to map session IDs to their active connections

### 6. Implement client session identification on connection
- Modify `adws/adw_triggers/trigger_websocket.py` in the `websocket_endpoint()` function (line 570)
- Expect clients to send a `client_session_id` in their initial connection handshake or first message
- Store the session ID in connection metadata
- Track multiple connections per session in `session_connections` mapping
- Add logging to identify when the same session has multiple active connections

### 7. Add broadcast deduplication option (optional enhancement)
- Modify `adws/adw_triggers/trigger_websocket.py` in the `broadcast()` method (line 242)
- Add an optional parameter `deduplicate_by_session=False`
- When enabled, only send to one connection per unique client session
- For workflow updates, this ensures each logical client receives updates exactly once regardless of open tabs

### 8. Add comprehensive debug logging
- Add console logs in `handleWorkflowStatusUpdate()`, `handleWorkflowLog()`, and `handleTriggerResponse()` to show:
  - Message fingerprint
  - Whether message is new or duplicate
  - Current cache size
- Add backend logging in `broadcast()` to show:
  - Number of active connections
  - Number of unique client sessions
  - Which connections receive the broadcast
- This logging helps diagnose the source of duplicates

### 9. Create E2E test for workflow duplicate prevention
- Read `.claude/commands/test_e2e.md` to understand the E2E test framework
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/e2e/test_complex_query.md` as examples
- Create a new E2E test file `.claude/commands/e2e/test_workflow_duplicate_prevention.md`
- The test should:
  - Open the Kanban board in the first browser context
  - Trigger a workflow
  - Monitor console logs to verify status updates appear exactly once
  - Open the same Kanban board in a second browser context (simulating multiple tabs)
  - Trigger another workflow
  - Verify both contexts receive updates but neither shows duplicates in console
  - Take screenshots showing single execution confirmation in both tabs
  - Verify the message deduplication cache is working correctly

### 10. Run validation commands to ensure bug is fixed
- Execute all validation commands listed in the `Validation Commands` section
- Verify no test failures occur
- Verify no TypeScript compilation errors
- Verify frontend build succeeds
- Execute the new E2E test to validate workflow triggering works correctly without duplicates

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

Before running validation:
1. Start the application: `bash scripts/start.sh`
2. Open the Kanban board in a browser
3. Open browser DevTools console
4. Trigger a workflow and observe console logs - verify no duplications appear
5. Open the same board in a second browser tab
6. Trigger another workflow
7. Verify both tabs show updates but neither has duplicate log messages
8. Check console for "Ignoring duplicate" messages (should see them if broadcasting to multiple connections)
9. Close one tab and verify workflow updates still work correctly in the remaining tab

Automated validation:
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend TypeScript type checking to validate no type errors
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test file `.claude/commands/e2e/test_workflow_duplicate_prevention.md` to validate workflows trigger exactly once without duplications across multiple browser contexts

## Notes
- This bug is classified as **MEDIUM** priority - it causes duplicate console logs which are confusing but doesn't break core functionality
- The previous fix in issue #4 (adw-8e939814) addressed frontend event listener duplication, which was critical
- This issue #5 addresses a different source: backend broadcasting to multiple connections + missing frontend message deduplication
- The frontend message deduplication (steps 1-4) is the **surgical minimal fix** that solves the user's immediate complaint
- The backend session tracking (steps 5-7) is an optional enhancement that improves efficiency but adds complexity
- Recommend implementing steps 1-4 first, then evaluating if steps 5-7 are necessary based on testing results
- Message fingerprints should use a combination of fields to ensure uniqueness: `${adw_id}:${type}:${timestamp}:${status||level}:${message_hash}`
- The deduplication cache should have a maximum size (1000 entries) and auto-cleanup to prevent memory leaks
- After this fix, users can safely open multiple tabs without seeing duplicate console logs
- The E2E test should validate the most common scenario: single tab workflow triggering (most important) and multi-tab behavior (nice to have)
