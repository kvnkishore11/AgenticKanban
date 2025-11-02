# Bug: Workflow Stages Disappear After Frontend Refresh

## Metadata
issue_number: `6`
adw_id: `5fcd1e80`
issue_json: `{"number":6,"title":"there si some bug","body":"there si some bug. as soon as we trigger the workflow, i immediately see the stages information withint eh card. good that now it is moving to plan immediately. but what i see is after sometime of triggering teh workflow the frontend refreshes and i dotn see those stages anymore on teh card. and they are appearing after long time. not sure what is the reason. try to fix the issue."}`

## Bug Description
When a workflow is triggered, the stage information appears immediately on the Kanban card, showing the correct stage (e.g., "plan") and progression details. However, after the frontend refreshes (either manually or automatically), the stage information disappears from the card. The stages reappear only after approximately 5 minutes. This creates a confusing user experience where workflow progress appears to be lost temporarily.

**Symptoms:**
- Workflow stages display correctly immediately after triggering
- After frontend refresh, stages disappear from cards
- Stages reappear after ~5 minutes
- No errors visible in console during this behavior
- Data loss appears temporary but impacts user confidence

**Expected vs Actual Behavior:**
- **Expected:** Workflow stages persist across page refreshes and remain visible continuously
- **Actual:** Stages vanish after refresh and only reappear after the 5-minute deduplication TTL expires

## Problem Statement
The frontend state management system is clearing critical workflow state data on page refresh, and the message deduplication system is preventing re-processing of stage transition messages when they are re-delivered by the WebSocket server after reconnection. This results in a temporary loss of stage visibility for approximately 5 minutes until the deduplication cache TTL expires.

## Solution Statement
Fix the bug by implementing three complementary changes:

1. **Persist workflow state to localStorage** - Add `taskWorkflowProgress`, `taskWorkflowMetadata`, and `taskWorkflowLogs` to the persist middleware so stage information survives page refreshes
2. **Improve deduplication fingerprinting** - Use client-side sequence numbers instead of server timestamps to create fingerprints that survive reconnections without causing false duplicate detections
3. **Add sequence tracking** - Implement message sequence numbering to handle reconnection scenarios where messages need to be re-processed

This surgical fix addresses the root cause without introducing unnecessary complexity or rework.

## Steps to Reproduce
1. Start the backend WebSocket server: `cd app/server && uv run python -m websocket_server`
2. Start the frontend: `cd app/client && bun run dev`
3. Navigate to `http://localhost:5173` (or port from `.ports.env`)
4. Create a new task or select an existing one
5. Trigger a workflow (e.g., `adw_plan_iso`)
6. **Observe:** Stage information appears on the card immediately (e.g., card shows "plan" stage)
7. **Action:** Refresh the browser page (F5 or Cmd+R)
8. **Bug:** Stage information disappears from the card
9. **Wait:** After ~5 minutes, the stage information reappears

## Root Cause Analysis

### Primary Cause: Message Deduplication Cache Cleared on Refresh
**File:** `src/stores/kanbanStore.js:1068-1137`

The deduplication system uses an in-memory Map (`processedMessages`) to track message fingerprints and prevent duplicate processing. The fingerprint is based on server-provided data including timestamp:

```javascript
const fingerprint = `${messageType}:${adw_id}:${timestamp}:${status}${level}:${progress}:${step}:${message}`;
```

**The Problem:**
1. When a workflow triggers, the server sends `status_update` messages with `current_step="Stage: plan"`
2. Frontend processes the message and stores the fingerprint in `processedMessages` Map
3. User refreshes the page → `processedMessages` Map is cleared (in-memory only)
4. WebSocket reconnects and server re-sends the same messages (with same timestamps)
5. New cache is empty, but `isDuplicateMessage()` adds the fingerprint immediately
6. Since the message uses the same server timestamp, if it arrives again within 5 minutes, it's marked as duplicate and skipped
7. The `task.stage` was reset on refresh (because workflow state wasn't persisted), so the stage information is lost
8. After 5 minutes, the TTL expires and messages can be processed again

### Secondary Cause: Workflow State Not Persisted
**File:** `src/stores/kanbanStore.js:2066-2078`

The persist middleware only saves basic task data:
```javascript
partialize: (state) => ({
  selectedProject: state.selectedProject,
  availableProjects: state.availableProjects,
  tasks: state.tasks,  // Contains task.stage, but NOT workflow progress
  taskIdCounter: state.taskIdCounter,
  projectNotificationEnabled: state.projectNotificationEnabled,
  projectNotificationConfigs: state.projectNotificationConfigs,
  notificationHistory: state.notificationHistory,
})
```

**Missing from persistence:**
- `taskWorkflowLogs` - Real-time workflow logs
- `taskWorkflowProgress` - Progress tracking data (includes current step, progress %, status)
- `taskWorkflowMetadata` - ADW metadata

Even though `tasks` is persisted (which includes `task.stage`), the workflow progress details are lost on refresh, so the UI doesn't know what stage the workflow is in until new messages arrive.

### Tertiary Cause: Server Timestamp-Based Fingerprinting
**File:** `src/stores/kanbanStore.js:1079`

Using server timestamps in fingerprints creates issues on reconnection:
- Server may re-send messages with identical timestamps
- Client has no way to distinguish between "legitimate duplicate" vs "reconnection re-delivery"
- Client-side sequence numbers would be more reliable for tracking processed messages across reconnections

## Relevant Files
Use these files to fix the bug:

- **`src/stores/kanbanStore.js`** (lines 100-117, 1068-1137, 1140-1232, 2066-2078) - Contains deduplication logic, workflow state management, and persist configuration. This is the primary file that needs fixes for both state persistence and deduplication improvements.

- **`src/services/websocket/websocketService.js`** (lines 310-340) - Handles WebSocket message routing and emits events. May need minor updates to support sequence numbering if we implement that approach.

- **`src/components/kanban/KanbanCard.jsx`** (lines 54-56, 614-627) - Displays workflow stage progression. Used for understanding how stage data is consumed by the UI.

### New Files
None required. This bug can be fixed by modifying existing state management and persistence logic.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Read and understand the deduplication system
- Read `src/stores/kanbanStore.js` lines 1068-1137 to understand `getMessageFingerprint()` and `isDuplicateMessage()`
- Read `src/stores/kanbanStore.js` lines 1140-1232 to understand how `handleWorkflowStatusUpdate()` uses deduplication
- Read `src/stores/kanbanStore.js` lines 100-117 to understand the state structure for workflow tracking
- Document current behavior in comments for reference

### 2. Fix persistence - Add workflow state to localStorage
- Read `src/stores/kanbanStore.js` lines 2066-2078 to understand the persist middleware configuration
- Add `taskWorkflowProgress`, `taskWorkflowMetadata`, and `taskWorkflowLogs` to the `partialize` function
- Ensure these fields are serializable (they are - they're plain objects/arrays)
- Test that workflow state persists across page refreshes

### 3. Improve deduplication to handle reconnections gracefully
- Modify `getMessageFingerprint()` to create more robust fingerprints that account for reconnection scenarios
- Option A (simpler): Add a TTL check that's more lenient for recent reconnections
- Option B (more robust): Implement client-side sequence tracking so reconnected messages can be identified
- For this bug fix, implement Option A: Reduce the aggressiveness of deduplication by checking if the message timestamp is recent (e.g., within last 30 seconds) and allowing re-processing if the task state indicates it hasn't been applied yet

### 4. Add defensive check in handleWorkflowStatusUpdate
- Before calling `moveTaskToStage()`, check if the task is already in the target stage
- This prevents unnecessary updates but allows re-processing when needed (e.g., after refresh when state was lost)
- Add logic: if task stage doesn't match target stage from `current_step`, allow the update even if it might be a "duplicate" message

### 5. Test the fix manually
- Start backend and frontend
- Trigger a workflow and verify stage appears
- Refresh the page
- Verify stage information persists immediately (from localStorage)
- Verify no errors in console
- Verify workflow messages continue to update the card correctly
- Trigger another workflow after refresh and verify it works

### 6. Run validation commands
- Execute all commands in the "Validation Commands" section below
- Ensure all tests pass with zero regressions
- Verify no TypeScript errors
- Verify frontend builds successfully

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

### Manual Reproduction Test
```bash
# 1. Start the application
cd app/server && uv run python -m websocket_server &
cd app/client && bun run dev

# 2. Open browser to http://localhost:5173
# 3. Trigger a workflow
# 4. Verify stage appears on card
# 5. Refresh page (F5)
# 6. VERIFY: Stage information still visible (should be persisted)
# 7. VERIFY: Workflow continues to update correctly
# 8. No errors in browser console
```

### Server Tests
```bash
cd app/server && uv run pytest
```
Expected: All tests pass with zero failures

### Frontend Type Check
```bash
cd app/client && bun tsc --noEmit
```
Expected: No TypeScript errors

### Frontend Build
```bash
cd app/client && bun run build
```
Expected: Build completes successfully without errors

### Verify Persistence
```bash
# Manual verification steps:
# 1. Open browser DevTools > Application > Local Storage
# 2. Find key: "agentic-kanban-storage"
# 3. Verify it contains taskWorkflowProgress, taskWorkflowMetadata, taskWorkflowLogs
# 4. Trigger workflow and refresh page
# 5. Check that localStorage still contains workflow state after refresh
```

### Verify Deduplication Still Works
```bash
# Manual verification steps:
# 1. Open browser DevTools > Console
# 2. Trigger workflow
# 3. Look for "[Deduplication] Ignoring duplicate" messages
# 4. Verify duplicates are still being caught (within same session)
# 5. Verify legitimate messages are NOT being incorrectly deduplicated
# 6. After page refresh, verify messages can be reprocessed correctly
```

## Notes

### Why 5 Minutes?
The deduplication TTL is set to `5 * 60 * 1000` (5 minutes) in `src/stores/kanbanStore.js:116`. This explains why stages reappear after approximately 5 minutes - the fingerprint expires from the cache and messages can be processed again.

### Recent Related Changes
- **Commit 2a9ce87**: Added stage progression feature (`parseWorkflowStages()`, `handleStageTransition()`)
- **Commit 28ce621**: Added deduplication to prevent duplicate workflow message processing (introduced the bug)
- **Commit d0f4d39**: Added specification for stage progression

The deduplication feature was added in commit 28ce621 to solve a legitimate problem (duplicate messages), but it didn't account for the page refresh scenario where the cache is cleared but the server still has messages to deliver.

### Alternative Solution Considered
Instead of improving deduplication, we could implement idempotent state updates where applying the same stage transition multiple times has no adverse effects. However, this doesn't solve the core issue of state loss on refresh, so persistence is still required. The chosen solution addresses both problems surgically.

### Message Flow
```
Server sends: { status_update, adw_id, current_step="Stage: plan", timestamp }
    ↓
WebSocket receives and emits event
    ↓
Store: handleWorkflowStatusUpdate() checks isDuplicateMessage()
    ↓
If NOT duplicate: moveTaskToStage(taskId, 'plan') updates task.stage
    ↓
React re-renders card with new stage
    ↓ (User refreshes page)
localStorage loads persisted state (including taskWorkflowProgress)
    ↓
Card displays with correct stage immediately
```

### Testing Strategy
This bug requires both automated validation (tests, type checking, build) and manual E2E testing because the issue is timing-based and involves user interaction (page refresh). The manual reproduction test is critical to verify the fix works in the real scenario.
