# Bug: Stage Display Disappears After Workflow Trigger

## Metadata
issue_number: `11`
adw_id: `19ea9fac`
issue_json: `{"number":11,"title":"after we trigger the workflow, after 1 or 2 second...","body":"after we trigger the workflow, after 1 or 2 seconds for some reason the frontend is getting refershed i guess..  because of this i could see the stages for a short while on the card and then they disappear since it got refreshed. thsi is what I think. just see if htere is any bug of any sort and try to fix that.."}`

## Bug Description
After triggering a workflow from the Kanban UI, the stage information briefly appears on the task card but then disappears after 1-2 seconds. The user suspects the frontend is being refreshed, causing the visible stage information to vanish. This affects the user's ability to see real-time workflow progress and stage transitions.

**Symptoms:**
- Stage information displays correctly initially when workflow is triggered
- After 1-2 seconds, stage information disappears from the task card
- Suspected cause: frontend refresh/reload

**Expected Behavior:**
- Stage information should persist and update in real-time as workflow progresses
- No unexpected page refreshes should occur
- Task card should continuously display current stage and workflow progress

**Actual Behavior:**
- Stage appears briefly then disappears
- Frontend appears to refresh or reset state
- Loss of visible workflow progress

## Problem Statement
The Kanban UI is experiencing unexpected behavior where stage information displayed on task cards disappears shortly after workflow triggering. This prevents users from monitoring workflow progress and defeats the purpose of real-time status updates. The root cause needs to be identified and eliminated to ensure stable, persistent stage display during workflow execution.

## Solution Statement
Identify and remove all code paths that trigger hard page reloads (`window.location.reload()`) during workflow execution. Replace page reload logic with proper Zustand store state management. Implement defensive checks to prevent ErrorBoundary from triggering full page reloads on recoverable errors. Add logging to track any unexpected state resets or cleanup operations that might be interfering with workflow state persistence.

## Steps to Reproduce
1. Start the application (frontend on port 5173, WebSocket server on port 8002)
2. Navigate to the Kanban board
3. Create or select an existing task
4. Click "Trigger Workflow" button on the task card
5. Observe the task card immediately after triggering - stage information should appear
6. Wait 1-2 seconds
7. **BUG:** Stage information disappears from the card
8. Check browser console and network tab for evidence of page reload

## Root Cause Analysis

After comprehensive codebase analysis, three critical code paths were identified that cause hard page reloads:

### 1. **Primary Culprit: cleanupDummyData() in kanbanStore.js**
**Location:** `src/stores/kanbanStore.js:2014`

The `cleanupDummyData()` function contains a `window.location.reload()` call that forces a full page refresh. While this function is intended for data migration cleanup, it may be invoked during initialization or as a side effect of other operations, causing the observed behavior.

```javascript
cleanupDummyData: () => {
  // ... cleanup logic ...
  window.location.reload(); // Force reload to ensure clean state
}
```

**Impact:** If this executes during or shortly after workflow triggering, all in-memory state is lost and the page reloads, causing stages to disappear.

### 2. **ErrorBoundary Reload Handlers**
**Location:** `src/components/ui/ErrorBoundary.jsx:38, 60`

The ErrorBoundary component has two handlers that trigger page reloads:
- `handleReload()` - direct reload
- `handleClearData()` - clears localStorage and reloads

If any unhandled error occurs during workflow triggering or WebSocket message processing, the ErrorBoundary catches it and forces a page reload, destroying workflow state.

### 3. **Potential localStorage Clearing**
**Location:** `src/services/storage/localStorage.js:73-89`

The localStorage service has a `clear()` method that removes all persisted app data. If invoked during workflow operations, all workflow metadata, progress, and logs would be lost.

### Why Stages Disappear

The sequence appears to be:
1. User triggers workflow
2. WebSocket connection established, workflow starts
3. Backend sends stage transition messages via WebSocket
4. Frontend receives messages and updates Zustand store
5. Task card displays stage information (briefly visible)
6. **One of the reload paths executes** (within 1-2 seconds)
7. Page reloads, all in-memory state lost
8. After reload, workflow state may not be fully restored
9. Stage information disappears

## Relevant Files
Use these files to fix the bug:

### Core Files to Modify

- **src/stores/kanbanStore.js** (Lines 2004-2031, specifically 2014)
  - Contains the problematic `window.location.reload()` call in `cleanupDummyData()`
  - Needs to be replaced with proper state management instead of hard reload
  - This is the PRIMARY FIX location

- **src/components/ui/ErrorBoundary.jsx** (Lines 37-39, 49-65)
  - Contains `handleReload()` and `handleClearData()` that force page reloads
  - Need to make error recovery non-destructive
  - Should attempt graceful recovery instead of wiping all state

- **src/services/storage/localStorage.js** (Lines 73-89)
  - Contains `clear()` method that removes all app data
  - Need to verify it's not being called during workflow operations
  - Consider adding safeguards or logging

### Files to Review for Context

- **src/components/forms/WorkflowTriggerModal.jsx**
  - Understand workflow triggering flow
  - Ensure no reload logic exists in modal handlers
  - Verify proper state updates after triggering

- **src/services/websocket/websocketService.js**
  - Review WebSocket connection and message handling
  - Ensure no reload triggers in error handlers
  - Verify message processing doesn't cause state corruption

- **src/components/kanban/KanbanCard.jsx**
  - Review how stage information is displayed
  - Understand real-time update subscriptions
  - Verify component doesn't remount unnecessarily

- **src/components/kanban/KanbanBoard.jsx**
  - Review board-level rendering logic
  - Ensure no board-wide refreshes interfere with workflow state

### Documentation Files

- **README.md**
  - Project overview and setup instructions
  - Understand application architecture

- **.claude/commands/conditional_docs.md**
  - Check if additional documentation is needed

- **.claude/commands/test_e2e.md**
  - Understand E2E testing framework
  - Will be used to create validation test

- **.claude/commands/e2e/test_basic_query.md**
  - Example E2E test structure
  - Template for creating new E2E test

- **.claude/commands/e2e/test_websocket_stage_progression.md**
  - Existing test for stage progression
  - Reference for workflow behavior validation

### New Files

- **.claude/commands/e2e/test_stage_persistence_after_workflow.md**
  - New E2E test to validate the bug is fixed
  - Will test that stage information persists after workflow triggering
  - Will verify no unexpected page reloads occur

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add Logging to Track Reload Triggers
- Add console logging to `cleanupDummyData()` to track when it's called
- Add logging to ErrorBoundary handlers to track error-triggered reloads
- Add logging to localStorage `clear()` method
- This will help confirm the root cause during testing

### Step 2: Fix Primary Issue - Remove Hard Reload from cleanupDummyData()
- Locate `cleanupDummyData()` in `src/stores/kanbanStore.js:2004-2031`
- Remove the `window.location.reload()` call on line 2014
- Replace with proper Zustand state update that refreshes from localStorage
- Test that cleanup still works without forcing page reload
- Ensure the persist middleware properly rehydrates state

### Step 3: Make ErrorBoundary Recovery Non-Destructive
- Modify `src/components/ui/ErrorBoundary.jsx`
- Update `handleReload()` to attempt state recovery instead of full reload
- Update `handleClearData()` to be more selective about what gets cleared
- Preserve workflow state (taskWorkflowProgress, taskWorkflowMetadata, taskWorkflowLogs) during error recovery
- Consider showing error UI without destroying app state

### Step 4: Add Safeguards to localStorage Clear Method
- Add parameter to `localStorage.clear()` to optionally preserve workflow state
- Add logging when clear is called to track invocations
- Consider adding a confirmation or safety check before clearing during active workflows

### Step 5: Verify WebSocket Error Handling Doesn't Trigger Reloads
- Review `src/services/websocket/websocketService.js` error handlers
- Ensure connection errors trigger reconnection, not page reload
- Verify message processing errors are logged but don't crash the app
- Test that WebSocket disconnection/reconnection preserves workflow state

### Step 6: Add Defensive Checks in Workflow Triggering Flow
- Review `triggerWorkflowForTask()` in kanbanStore.js
- Add try-catch blocks around critical operations
- Ensure errors during triggering don't propagate to ErrorBoundary
- Log errors locally without causing state loss

### Step 7: Create E2E Test to Validate Fix
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/e2e/test_websocket_stage_progression.md` as examples
- Create `.claude/commands/e2e/test_stage_persistence_after_workflow.md`
- Test should:
  1. Load the Kanban board
  2. Create or select a task
  3. Trigger a workflow
  4. Wait 5 seconds (longer than the reported 1-2 second disappearance)
  5. **Verify** stage information is still visible on the card
  6. **Verify** no page reload occurred (check navigation performance timing)
  7. **Verify** workflow progress updates are displaying
  8. Take screenshots at: initial state, after trigger, after 2 seconds, after 5 seconds
- Include specific assertions to detect page reloads
- Verify workflow logs and progress persist throughout execution

### Step 8: Run All Validation Commands
- Execute all commands in the Validation Commands section
- Ensure no regressions in existing functionality
- Verify the bug is fixed with zero side effects

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

### Reproduce Bug Before Fix
```bash
# Start the application
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac
# Start WebSocket server (in background)
cd adws/adw_triggers && uv run python trigger_websocket.py &
sleep 3
# Start frontend dev server (in background)
cd ../../app/client && bun run dev &
sleep 5
# Manual test: Open http://localhost:5173, trigger workflow, observe stages disappear
```

### Verify Fix Works
```bash
# After implementing fixes, manually test:
# 1. Trigger workflow
# 2. Wait 5+ seconds
# 3. Verify stages remain visible
# 4. Check console for NO reload-related logs
# 5. Check Network tab for NO navigation/reload events
```

### Run E2E Test
- Read `.claude/commands/test_e2e.md`
- Execute the new E2E test: `.claude/commands/e2e/test_stage_persistence_after_workflow.md`
- Verify all assertions pass
- Review screenshots to confirm visual persistence

### Run Server Tests
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac/app/server
uv run pytest
```

### Run Frontend Type Check
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac/app/client
bun tsc --noEmit
```

### Run Frontend Build
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac/app/client
bun run build
```

### Manual Regression Testing
- Test cleanupDummyData still works (if needed)
- Test ErrorBoundary still catches and displays errors appropriately
- Test localStorage clear functionality in settings
- Test multiple concurrent workflows don't interfere
- Test WebSocket reconnection preserves workflow state
- Test full workflow lifecycle from trigger to completion

## Notes

### Key Insights
- The bug is caused by hard page reloads (`window.location.reload()`) during workflow execution
- Zustand persist middleware already saves workflow state, but page reloads interrupt active workflows
- WebSocket messages arriving during reload are lost
- The fix is to eliminate all hard reloads and rely on proper state management

### Why Stage Information Disappears
1. Workflow triggers successfully
2. WebSocket messages start arriving with stage information
3. Store updates, React re-renders, stages appear
4. Hard reload executes (from one of the identified code paths)
5. Page reloads, all subscriptions/connections reset
6. After reload, workflow may still be running on backend, but frontend loses context
7. Stage information not restored because active workflow context was lost

### Alternative Approaches Considered
1. **Fix page reload timing** - Too fragile, doesn't address root cause
2. **Persist more aggressively** - Doesn't help if page reloads during active workflow
3. **Restore state after reload** - Complex, better to prevent reload entirely
4. **Selected approach: Eliminate hard reloads** - Clean, addresses root cause, leverages existing state management

### Testing Strategy
- E2E test will provide regression protection
- Manual testing required to verify user experience
- Console logging will help debug any remaining issues
- Performance testing to ensure no memory leaks from removed cleanup

### Potential Risks
- Removing `window.location.reload()` from cleanup might leave stale data if cleanup logic is flawed
- ErrorBoundary changes might affect error recovery UX
- Need to ensure alternative state refresh mechanisms work correctly

### Success Metrics
- Stage information remains visible for entire workflow duration
- No page reloads during workflow execution
- WebSocket connection remains stable
- Workflow progress updates display continuously
- E2E test passes consistently
