# Feature: Fix Missing Logs and Stage Progression

## Metadata
issue_number: `37`
adw_id: `01254dbb`
issue_json: `{"number":37,"title":"> [Image #1] not sure suddently what happened","body":"> [Image #1] not sure suddently what happened. I dont see any logs on my card and also there is no progression of the stage. did we miss out something. it was working perfectly well before. now it is not working for some reason. try to find teh\n  rootcause fo this behaviour. did any of our previous chna"}`

## Feature Description
This feature ensures that task logs are visible on Kanban cards and stage progression works correctly. After recent changes to separate WebSocket and backend ports (commits 56d61c3 and 8421eae), the `.env` configuration file contains duplicate and conflicting `VITE_BACKEND_URL` entries, causing the frontend to potentially connect to the wrong WebSocket port. This prevents logs from being displayed and stage progression from updating in real-time.

## User Story
As a user viewing tasks on the Kanban board
I want to see workflow logs displayed on my task cards and watch stages progress in real-time
So that I can monitor the status of my automated workflows and understand what's happening

## Problem Statement
The application is not displaying logs on Kanban cards and stage progression is not updating. Investigation reveals:

1. **Root Cause**: The `.env` file has duplicate `VITE_BACKEND_URL` entries:
   - Line 32: `VITE_BACKEND_URL=http://localhost:8002`
   - Line 36: `VITE_BACKEND_URL=http://localhost:8502` (correct WebSocket port)

2. **Recent Changes**: Commits 56d61c3 and 8421eae separated WebSocket and backend ports, introducing `WEBSOCKET_PORT=8502` configuration

3. **Impact**: The frontend's WebSocket client (`src/services/websocket/websocketService.js`) uses `VITE_BACKEND_URL` to connect (line 47-55), but the duplicate entries create ambiguity about which port to use

4. **Previous Fix**: Issue #35 (commit 7d93b50) fixed stage logs visibility by correcting the `isEmpty` check in `StageLogsViewer.jsx`, but logs still won't appear if the WebSocket connection is broken

## Solution Statement
Clean up the `.env` configuration to remove duplicate entries and ensure the frontend consistently connects to the correct WebSocket port (8502). Additionally, verify that all WebSocket message handlers are working correctly and add validation to confirm logs and stage transitions are being received and processed.

## Relevant Files
Use these files to implement the feature:

- `.env` (lines 32, 34, 36) - Contains duplicate and conflicting `VITE_BACKEND_URL` entries that need to be cleaned up. The `WEBSOCKET_PORT=8502` should be used.

- `src/services/websocket/websocketService.js` (lines 45-62) - WebSocket client configuration that reads `VITE_BACKEND_URL` to determine connection port. Comment on line 55 is outdated: "WebSocket server is on same port as backend" should be updated.

- `src/stores/kanbanStore.js` (lines 964-1205) - Contains WebSocket message handlers for `workflow_log`, `status_update`, and `stage_transition` events. Includes deduplication logic and error handling.

- `src/components/kanban/StageLogsViewer.jsx` (lines 151-154) - Stage logs display component, recently fixed in issue #35 to check actual log data instead of flags.

- `src/components/kanban/WorkflowLogViewer.jsx` - Renders individual log entries with filtering and search capabilities.

- `src/components/kanban/KanbanCard.jsx` - Task card component that integrates the StageLogsViewer to display logs.

- `adws/adw_triggers/trigger_websocket.py` (lines 56-57) - WebSocket server that reads `WEBSOCKET_PORT` from environment (default 8500, configured as 8502).

- `README.md` (lines 320-325) - Documents port configuration, needs update to clarify WebSocket port separation.

### New Files
- `.claude/commands/e2e/test_logs_and_progression.md` - E2E test to validate logs appear and stages progress correctly

## Implementation Plan

### Phase 1: Foundation
1. **Clean up environment configuration** - Remove duplicate `VITE_BACKEND_URL` entries and ensure consistent port configuration
2. **Update documentation** - Clarify WebSocket vs backend port separation in code comments and README
3. **Verify WebSocket connection** - Confirm frontend connects to correct port and receives messages

### Phase 2: Core Implementation
1. **Fix .env configuration** - Remove duplicate entry on line 32, keep only the correct configuration
2. **Update websocketService.js comments** - Fix outdated comment about port sharing
3. **Add connection diagnostics** - Enhance logging to show which port WebSocket connects to

### Phase 3: Integration
1. **Test WebSocket message flow** - Verify `workflow_log`, `status_update`, and `stage_transition` messages are received
2. **Validate log display** - Confirm logs appear in StageLogsViewer after WebSocket messages arrive
3. **Validate stage progression** - Confirm stages update when `stage_transition` messages are received

## Step by Step Tasks

### 1. Audit Current Configuration
- Read `.env` file to document current configuration state
- Read `src/services/websocket/websocketService.js` to understand connection logic
- Read `adws/adw_triggers/trigger_websocket.py` to confirm WebSocket server port
- Document the discrepancy between duplicate entries

### 2. Fix Environment Configuration
- Remove duplicate `VITE_BACKEND_URL=http://localhost:8002` entry from `.env` line 32
- Keep `VITE_BACKEND_URL=http://localhost:8502` to match `WEBSOCKET_PORT=8502`
- Ensure `.env` file has clear comments explaining the port separation
- Add comment: `# WebSocket server port (separate from backend API which runs on different port)`

### 3. Update Code Documentation
- Update comment in `src/services/websocket/websocketService.js` line 55 from "WebSocket server is on same port as backend" to "WebSocket server port from VITE_BACKEND_URL"
- Update comment on line 46 to clarify: "WebSocket server runs on VITE_BACKEND_URL port (separate from HTTP backend which runs on port 8001)"

### 4. Add Connection Diagnostics
- Enhance `websocketService.js` connect method to log the exact WebSocket URL being used
- Add console log showing: "Connecting to WebSocket at ws://{host}:{port}"
- This helps developers verify the correct port is being used

### 5. Create E2E Test
- Read `.claude/commands/test_e2e.md` to understand E2E test structure
- Read `.claude/commands/e2e/test_basic_query.md` as an example
- Create `.claude/commands/e2e/test_logs_and_progression.md` to validate:
  - Create a task with ADW workflow
  - Trigger the workflow
  - Verify logs appear on the card within 10 seconds
  - Verify stage progresses from initial stage to next stage
  - Capture screenshot showing logs and stage progression
  - This provides visual proof the feature works

### 6. Test WebSocket Connection
- Start the WebSocket server using `python start-websocket.py`
- Start the frontend using `npm run dev`
- Open browser developer console
- Look for "Connecting to WebSocket at ws://localhost:8502" log message
- Verify WebSocket connection shows as "Connected" in the UI
- Check for any connection errors or warnings

### 7. Test Logs Display
- Create a test task on the Kanban board
- Trigger a workflow (e.g., `adw_plan_iso`)
- Expand the task card logs section
- Verify logs appear in the "All Logs" tab within 10 seconds
- Verify stage-specific logs appear when clicking stage tabs (Plan, Build, Test, etc.)
- Check browser console for any `workflow_log` message handling errors

### 8. Test Stage Progression
- Create a test task in "Backlog" stage
- Trigger a multi-stage workflow (e.g., `adw_plan_build_test_iso`)
- Verify task automatically moves to "Plan" stage when workflow starts
- Verify task moves to "Build" stage after plan completes
- Verify task moves to "Test" stage after build completes
- Check browser console for any `stage_transition` message handling errors

### 9. Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- All commands must pass without errors
- If any command fails, investigate and fix before proceeding

## Testing Strategy

### Unit Tests
Since this is primarily a configuration fix, unit tests are not required. However, we should verify:
- WebSocket connection establishment works correctly
- Message handlers (`workflow_log`, `status_update`, `stage_transition`) process messages without errors
- Deduplication logic prevents duplicate log entries

### Edge Cases
- **WebSocket server not running**: Frontend should show "Disconnected" status and attempt reconnection
- **Port mismatch**: If `.env` has wrong port, connection should fail with clear error message
- **Message flood**: Deduplication logic (5-minute cache in `kanbanStore.js` lines 1114-1205) should prevent duplicate processing
- **Stage transition without logs**: Stage should still progress even if no logs are received
- **Logs without stage transition**: Logs should display even if stage doesn't change

## Acceptance Criteria
1. **Configuration is clean**: `.env` file has no duplicate `VITE_BACKEND_URL` entries
2. **WebSocket connects successfully**: Frontend connects to WebSocket server on port 8502
3. **Logs are visible**: Workflow logs appear on task cards within 10 seconds of being sent
4. **Stages progress**: Tasks move through stages (Plan → Build → Test → Review → Document) automatically
5. **Console is clean**: No WebSocket connection errors or message handling errors in browser console
6. **Code is documented**: Comments in `websocketService.js` accurately describe port configuration
7. **Tests pass**: All validation commands execute without errors
8. **E2E test passes**: New E2E test validates logs and progression work end-to-end

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `cat .env | grep VITE_BACKEND_URL` - Verify only one VITE_BACKEND_URL entry exists (should show only port 8502)
- `cat .env | grep WEBSOCKET_PORT` - Verify WEBSOCKET_PORT is set to 8502
- `grep -n "WebSocket server is on same port" src/services/websocket/websocketService.js || echo "Comment updated"` - Verify outdated comment is removed
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_logs_and_progression.md` to validate logs and progression work end-to-end
- `cd server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `bun tsc --noEmit` - Run frontend tests to validate the feature works with zero regressions
- `bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes

### Context from Recent Changes
- **Issue #35** (commit 7d93b50, ec1b2b1): Fixed stage logs visibility by correcting `isEmpty` check in `StageLogsViewer.jsx`. Changed from checking flags (`hasStreamingLogs`, `hasResult`) to checking actual log data.
- **Port Separation** (commits 56d61c3, 8421eae): Separated WebSocket server (port 8502) from backend API (port 8001) to avoid conflicts during isolated worktree testing.

### WebSocket Message Types
The application uses three key WebSocket message types for logs and progression:
1. **`workflow_log`**: Real-time log entries sent during workflow execution
2. **`status_update`**: Status changes that can trigger stage transitions (checks for "Stage: {stage}" in `current_step`)
3. **`stage_transition`**: Explicit stage change events sent by the server

### Deduplication Logic
`kanbanStore.js` implements a 5-minute cache (lines 1114-1205) to prevent duplicate message processing. This is important for preventing log entries from appearing multiple times.

### Future Considerations
- Consider adding health check endpoint to WebSocket server to verify it's running
- Consider adding UI indicator showing WebSocket connection quality (latency, message rate)
- Consider adding retry logic for failed log fetches from backend API
- Consider adding user notification when WebSocket connection is lost (currently only logged to console)
