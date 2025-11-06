# Chore: Fix Frontend Logs Display - None of the Logs Are Being Displayed

## Metadata
issue_number: `64`
adw_id: `8c957869`
issue_json: `{"number":64,"title":"None of the logs are being displayed in the fronte...","body":"None of the logs are being displayed in the frontend. Please think hard and try to resolve this. \nneithere all logs aer working which used to work before. but now it is not working at all. I dont see the stage progression as well.. which used to work before. now that is also not working.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/888bd3d2-9c85-477d-960c-7265d442fd80)\n\n"}`

## Chore Description

The frontend is not displaying ANY logs, and stage progression is also not working. This is a CRITICAL system failure that prevents users from monitoring workflow progress. Despite recent fixes for the WebSocket logs race condition (commit ba7ef2e) and extensive diagnostic logging (commit d744e44), logs are still not appearing in the frontend.

Based on thorough investigation, the root cause has been identified as **CRITICAL BUGS in the message deduplication system** that are filtering out ALL logs:

### Critical Issues Identified:

1. **Map Serialization Bug**: The `processedMessages` Map in kanbanStore.js is being corrupted during localStorage serialization/deserialization by Zustand's persist middleware, causing `.has()`, `.get()`, and `.set()` Map methods to fail.

2. **Timestamp in Fingerprint**: The message fingerprint includes the timestamp field, making every single message "unique" and defeating deduplication purposes, while potentially causing cache bloat.

3. **No Cache Reset**: The deduplication cache is not cleared on page refresh or WebSocket reconnection, leading to stale fingerprints blocking legitimate new messages.

4. **Lack of Defensive Checks**: No type checking to detect when `processedMessages` becomes corrupted from a Map to a plain object.

These bugs combine to create unpredictable behavior where the deduplication system either blocks ALL logs or creates corrupted state that breaks the entire log delivery chain.

## Relevant Files

Use these files to resolve the chore:

### State Management - Core Issue
- `src/stores/kanbanStore.js` - Central Zustand store containing the broken deduplication system
  - Lines 118: Initial `processedMessages: new Map()` declaration
  - Lines 1208-1222: `getMessageFingerprint()` function that incorrectly includes timestamp
  - Lines 1225-1299: `isDuplicateMessage()` function that lacks defensive checks
  - Lines 1409-1457: `handleWorkflowLog()` function that calls isDuplicateMessage before processing logs
  - Lines 1303-1406: `handleWorkflowStatusUpdate()` function that also uses deduplication
  - Lines 2794-2806: Zustand persist `partialize` function that doesn't properly handle Maps

### WebSocket Communication - Working Correctly
- `src/services/websocket/websocketService.js` - WebSocket service that receives and emits messages
  - Lines 420-431: workflow_log case handler with extensive logging (WORKING)
  - Event emission and listener management (WORKING)

### UI Components - Working Correctly (When Logs Exist)
- `src/components/kanban/WorkflowLogViewer.jsx` - Displays workflow logs (WORKING)
- `src/components/kanban/StageLogsViewer.jsx` - Tabbed interface for stage logs (WORKING)

### Backend - Working Correctly
- `adws/adw_triggers/trigger_websocket.py` - WebSocket server broadcasts (WORKING)
- `adws/adw_modules/websocket_client.py` - Client sends logs with timestamps (WORKING)

### Documentation
- `app_docs/feature-6d3b1dfd-websocket-logs-debugging.md` - Previous WebSocket debugging documentation
- `app_docs/feature-7b25b54d-workflow-log-handler.md` - Previous workflow_log handler fix
- `.claude/commands/conditional_docs.md` - Conditional documentation guide

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Understand the Current System
- Read `src/stores/kanbanStore.js` lines 1208-1299 to understand the deduplication implementation
- Read lines 1409-1457 to see how handleWorkflowLog uses isDuplicateMessage
- Read lines 2794-2806 to understand the Zustand persist configuration
- Verify the race condition fix from commit ba7ef2e is still in place (lines 1145-1187)
- Review the extensive diagnostic logging added in previous fixes

### Fix Bug #1: Exclude processedMessages from Persistence
- Modify `src/stores/kanbanStore.js` persist configuration
- Add `onRehydrateStorage` callback to reset `processedMessages` to `new Map()` after rehydration
- This ensures the Map is always properly initialized after page reload
- Test that processedMessages is a Map instance after page refresh

### Fix Bug #2: Remove Timestamp from Fingerprint
- Modify `src/stores/kanbanStore.js` getMessageFingerprint function (lines 1208-1222)
- Remove the `timestamp` variable from the fingerprint calculation (line 1212)
- Update fingerprint string to exclude timestamp (line 1220)
- Add comment explaining why timestamp is excluded (makes every message unique)
- Keep other fields (adw_id, level, message, progress, step) for proper deduplication

### Fix Bug #3: Add Defensive Type Check for Map
- Modify `src/stores/kanbanStore.js` isDuplicateMessage function (lines 1225-1299)
- Add defensive check at the start to verify processedMessages is a Map instance
- If not a Map, log error, recreate the Map, and return false (allow message through)
- This prevents crashes when Map becomes corrupted

### Fix Bug #4: Clear Cache on WebSocket Reconnection
- Modify `src/stores/kanbanStore.js` connectWebSocket function (around line 929)
- Add logic to clear processedMessages Map when WebSocket reconnects
- This prevents stale fingerprints from blocking new messages after connection loss
- Log when cache is cleared for debugging

### Fix Bug #5: Add Cache Size Monitoring
- Modify `src/stores/kanbanStore.js` isDuplicateMessage function
- Add logging when cache reaches messageDeduplicationMaxSize (1000)
- Add logic to prevent cache from growing indefinitely
- Consider implementing LRU eviction when cache is full

### Verify Stage Progression Still Works
- Read `src/stores/kanbanStore.js` handleWorkflowStatusUpdate function (lines 1303-1406)
- Verify it also calls isDuplicateMessage (which we fixed)
- Ensure stage transitions are not blocked by the same deduplication bugs
- Check that stage extraction from current_step field still works

### Test the Complete Flow
- Start WebSocket server: `python start-websocket.py`
- Start backend: `cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Start frontend: `npm run dev`
- Open browser console to observe diagnostic logs
- Create a new task in the Kanban board
- Trigger a workflow (plan, build, or test)
- Verify logs appear in real-time in WorkflowLogViewer
- Verify stage progression occurs correctly
- Refresh the page and verify logs persist
- Trigger another workflow and verify new logs appear
- Check console for any error messages

### Run Validation Commands
- Execute all validation commands listed below
- Fix any test failures or errors
- Ensure zero regressions in existing functionality

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - TypeScript type checking for frontend
- `npm run build` - Build frontend to catch any errors
- `cd app/server && uv run pytest` - Run server tests to validate zero regressions

## Notes

### Why Previous Fixes Didn't Work
- **Commit ba7ef2e** (fix websocket logs race condition): Fixed the ADW ID assignment race, but logs were still being filtered by the deduplication system
- **Commit d744e44** (fix websocket logs display): Added plan document but no code changes, deduplication bugs remained
- **Feature 6d3b1dfd** (websocket logs debugging): Added extensive logging which revealed logs ARE being received, but then filtered out

### Root Cause Analysis
The deduplication system was added to prevent duplicate logs from appearing multiple times (common with WebSocket reconnections and multiple browser tabs). However, the implementation had critical flaws:

1. **Map Corruption**: Zustand's persist middleware doesn't properly serialize/deserialize Map objects, converting them to plain objects `{}` which break all Map methods
2. **Over-Aggressive Fingerprinting**: Including timestamp makes every message unique, defeating deduplication
3. **No Recovery**: No defensive checks to detect and recover from Map corruption
4. **Stale Cache**: Cache persists across page reloads and reconnections, blocking legitimate new messages

### Why Stage Progression Also Broke
Stage progression relies on `handleWorkflowStatusUpdate()` which also uses `isDuplicateMessage()`. The same Map corruption bug blocks status updates, preventing stage transitions from being processed.

### Design Decision: Keep Deduplication
The deduplication system is valuable for handling reconnection scenarios and multiple tabs. The fix preserves this functionality while correcting the implementation bugs:

- Remove timestamp from fingerprint (proper deduplication)
- Reset cache on page load and reconnection (prevent stale blocks)
- Add defensive checks (prevent crashes from corruption)
- Ensure Maps don't get persisted (prevent corruption)

### Testing Checklist
- [ ] Logs appear in real-time when workflow is triggered
- [ ] Stage progression works (tasks move through plan -> build -> test -> review)
- [ ] No duplicate logs appear
- [ ] Logs persist after page refresh
- [ ] Logs work after WebSocket reconnection
- [ ] Multiple workflows can run simultaneously with separate logs
- [ ] Console shows diagnostic logging with ✅/❌ indicators
- [ ] No errors in console related to Map methods
- [ ] TypeScript build passes
- [ ] Server tests pass

### Monitoring After Fix
After deploying this fix, monitor the console logs for:
- `[Deduplication] processedMessages is not a Map!` - Should NEVER appear after fix
- `[KanbanStore] ✅ FOUND task for log entry` - Should appear for every log
- `[KanbanStore] ❌ NO TASK FOUND` - Should only appear if workflow is triggered incorrectly
- `[WebSocketService] Number of listeners for workflow_log: 1` - Should always be 1
