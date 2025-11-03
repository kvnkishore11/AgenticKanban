# E2E Test: Stage Persistence After Workflow Trigger

## Overview
End-to-end test to validate that stage information persists on task cards after triggering a workflow and does not disappear due to unexpected page reloads. This test specifically validates the fix for Issue #11.

## Bug Context
**Issue #11**: After triggering a workflow, stage information briefly appears on the task card but then disappears after 1-2 seconds, suspected to be caused by an unexpected frontend refresh.

**Root Cause**: Hard page reloads (`window.location.reload()`) were being triggered during workflow execution from:
1. `cleanupDummyData()` in kanbanStore.js
2. ErrorBoundary error handlers
3. Potential localStorage clearing operations

**Fix**: Removed all hard page reload calls and replaced with proper Zustand state management.

## Test Environment Setup

### Prerequisites
- WebSocket server running on backend port (from VITE_BACKEND_URL env var)
- Agentic Kanban frontend application running on port 5173
- Browser developer tools available
- At least one test task in the kanban board

### Environment Variables
```bash
VITE_BACKEND_URL=http://localhost:8002  # WebSocket server is on same port
```

## Test Scenarios

### Test 1: Verify No Page Reload After Workflow Trigger

**Purpose**: Verify that triggering a workflow does not cause any page reloads

**Steps**:
1. Open browser to `http://localhost:5173`
2. Open browser DevTools > Console
3. Open DevTools > Network tab
4. Create or select an existing task on the Kanban board
5. Click "Trigger Workflow" button on the task card
6. Immediately after clicking, observe:
   - Console for any `[RELOAD TRACKER]` log messages
   - Network tab for any navigation/reload events
   - Performance API navigation timing
7. Wait 5 seconds (longer than the reported 1-2 second disappearance window)
8. Check console again for reload-related logs
9. Check Network tab for any document/navigation requests

**Expected Results**:
- No `[RELOAD TRACKER]` messages appear in console
- No page reload/navigation events in Network tab
- Performance API shows only one navigation (initial page load)
- Page remains on same URL throughout test
- No flash/flicker indicating reload
- Console shows workflow trigger logs but no reload logs

**Validation Commands**:
```javascript
// Run in browser console to check navigation timing
performance.getEntriesByType('navigation').length
// Expected: 1 (only initial page load)

// Check for reload markers in console
// Expected: No "[RELOAD TRACKER]" messages after workflow trigger
```

**Screenshot Requirements**:
- Screenshot 1: Console showing workflow trigger with NO reload logs
- Screenshot 2: Network tab showing NO navigation/document requests after workflow trigger
- Screenshot 3: Performance navigation entries showing only 1 entry

---

### Test 2: Verify Stage Information Persistence

**Purpose**: Verify that stage information remains visible and does not disappear after workflow trigger

**Steps**:
1. Select a task in "backlog" stage
2. Take screenshot of task card (initial state)
3. Click "Trigger Workflow" button
4. Observe task card immediately:
   - Stage information should appear
   - Workflow status section should appear
   - Progress bar should appear
5. Take screenshot at T+0.5 seconds (immediately after trigger)
6. Wait 2 seconds (the critical window where bug occurred)
7. Take screenshot at T+2 seconds
8. **Verify** stage information is still visible
9. **Verify** workflow status is still visible
10. **Verify** progress updates are still displaying
11. Wait 3 more seconds (total 5 seconds)
12. Take screenshot at T+5 seconds
13. **Verify** all workflow information persists

**Expected Results**:
- Task moves from "backlog" to initial stage (e.g., "plan") immediately
- Stage information appears and remains visible
- Workflow status section appears and remains visible
- Progress bar appears and continues updating
- No disappearance of any UI elements
- No flashing or re-rendering artifacts
- All 4 screenshots show continuous progression without data loss

**Screenshot Requirements**:
- Screenshot 1: Initial state (task in backlog, before trigger)
- Screenshot 2: T+0.5s (stage and workflow status visible)
- Screenshot 3: T+2s (stage and workflow status STILL visible - critical test)
- Screenshot 4: T+5s (stage and workflow status STILL visible, may show progress)

---

### Test 3: Verify WebSocket Connection Stability

**Purpose**: Verify that WebSocket connection remains stable without reconnection during workflow

**Steps**:
1. Open DevTools > Network > WS tab
2. Verify WebSocket connection exists
3. Note the WebSocket connection ID
4. Trigger workflow
5. Monitor WS tab during workflow execution
6. Wait 5 seconds
7. **Verify** same WebSocket connection is still active
8. **Verify** no disconnection/reconnection occurred
9. **Verify** messages continue flowing through same connection

**Expected Results**:
- WebSocket connection remains open throughout
- No disconnection events (connection dropped)
- No reconnection events (new connection created)
- Same connection ID throughout test
- Status indicator shows "Connected" continuously
- Messages continue without interruption

**Screenshot Requirements**:
- Screenshot 1: WS tab showing single connection before trigger
- Screenshot 2: WS tab showing same connection after 5 seconds, still active

---

### Test 4: Verify Workflow Logs Persist

**Purpose**: Verify that workflow logs accumulate and persist without being cleared

**Steps**:
1. Expand "Workflow Logs" section on task card
2. Trigger workflow
3. Observe logs appearing in real-time
4. Count number of log entries at T+1 second
5. Wait until T+3 seconds
6. Count number of log entries at T+3 seconds
7. **Verify** log count increased (logs accumulated)
8. **Verify** earlier logs are still present (not cleared)
9. Wait until T+5 seconds
10. **Verify** all logs remain visible

**Expected Results**:
- Logs appear in real-time as workflow executes
- Log count increases over time
- Earlier logs remain visible (not cleared/lost)
- No sudden log clearing or reset
- Logs persist for entire workflow duration
- Log section remains expanded (doesn't collapse)

**Screenshot Requirements**:
- Screenshot 1: Log section with first few logs (T+1s)
- Screenshot 2: Log section with more accumulated logs (T+3s)
- Screenshot 3: Log section showing all logs persisted (T+5s)

---

### Test 5: Verify Progress Updates Continue

**Purpose**: Verify that progress percentage updates continuously without reset

**Steps**:
1. Trigger workflow
2. Note initial progress: 0%
3. Wait 1 second, observe progress (e.g., 10%)
4. Wait 1 more second (T+2s), observe progress (e.g., 20-40%)
5. **Verify** progress increased (did not reset to 0%)
6. Wait 1 more second (T+3s), observe progress
7. **Verify** progress continues to increase
8. **Verify** no sudden jumps backward or resets

**Expected Results**:
- Progress starts at 0%
- Progress increases monotonically (never decreases)
- No resets to 0% after starting
- Progress bar fills smoothly
- Percentage text updates continuously
- Final progress reaches 100% (or stays at last value if workflow ongoing)

**Screenshot Requirements**:
- Screenshot 1: Progress at ~10% (T+0.5s)
- Screenshot 2: Progress at ~30-40% (T+2s) - shows NO reset occurred
- Screenshot 3: Progress at higher value (T+5s) - shows continuous progression

---

### Test 6: Verify No ErrorBoundary Triggered

**Purpose**: Verify that no errors trigger the ErrorBoundary during workflow execution

**Steps**:
1. Load application
2. Trigger workflow
3. Monitor for ErrorBoundary UI
4. Wait 5 seconds
5. **Verify** no error screen appears
6. **Verify** no "Something went wrong" message
7. **Verify** console shows no uncaught errors
8. **Verify** console shows no React error boundaries triggered

**Expected Results**:
- Normal Kanban UI remains visible throughout
- No ErrorBoundary fallback UI appears
- No "Something went wrong" screen
- Console shows no uncaught errors
- Console shows no React error boundary logs
- All React components continue rendering normally

**Screenshot Requirements**:
- Screenshot 1: Normal Kanban UI at T+2s (no error screen)
- Screenshot 2: Console showing no errors at T+5s

---

### Test 7: Verify Multiple Workflow Triggers Don't Cause Reload

**Purpose**: Verify that triggering multiple workflows in succession doesn't trigger reload

**Steps**:
1. Create two tasks in Kanban board
2. Clear browser console
3. Trigger workflow for Task 1
4. Wait 1 second
5. Trigger workflow for Task 2
6. Wait 5 seconds
7. **Verify** no `[RELOAD TRACKER]` messages in console
8. **Verify** both tasks show active workflows
9. **Verify** both tasks' stage information persists
10. **Verify** no page reload occurred

**Expected Results**:
- Both workflows start successfully
- Both task cards show active workflow state
- Both task cards show stage information
- No reload logs in console
- No navigation events in Network tab
- Both workflows continue executing
- No cross-contamination between tasks

**Screenshot Requirements**:
- Screenshot 1: Both task cards showing active workflows
- Screenshot 2: Console showing NO reload logs after both triggers

---

### Test 8: Verify Page Refresh Recovery (Bonus Test)

**Purpose**: Verify that manually refreshing the page during workflow execution recovers state correctly

**Steps**:
1. Trigger workflow
2. Wait for first few status updates
3. Note current progress (e.g., 30%)
4. Manually refresh page (F5 or Cmd+R)
5. Wait for page to reload
6. **Verify** workflow state is restored from localStorage
7. **Verify** task still shows workflow in progress
8. **Verify** progress resumes from where it left off (or current server state)
9. **Verify** logs are restored (if persisted)

**Expected Results**:
- Page reloads successfully
- Workflow state restored from localStorage
- Task shows workflow still in progress
- WebSocket reconnects automatically
- Status updates resume
- No data loss on intentional reload
- Progress continues from last known state

**Note**: This test validates that intentional reloads (user-initiated) work correctly, while our fix prevents UNINTENTIONAL reloads during workflow execution.

**Screenshot Requirements**:
- Screenshot 1: Workflow state before manual reload
- Screenshot 2: Workflow state after manual reload (showing restoration)

---

## Validation Commands

Run these commands to verify the fix is working:

### Backend Validation
```bash
# Start WebSocket server
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac
cd adws/adw_triggers && uv run python trigger_websocket.py &
sleep 3

# Verify server is running
curl http://localhost:8002/health
# Expected: {"status":"healthy", ...}
```

### Frontend Validation
```bash
# Start frontend dev server
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/19ea9fac/app/client
bun run dev &
sleep 5

# Open browser to http://localhost:5173
# Perform manual tests listed above
```

### Console Log Validation
```bash
# In browser console, check for reload tracker logs
# Expected during normal workflow execution: NO [RELOAD TRACKER] messages

# To test that reload tracking still works, you can manually trigger:
# useKanbanStore.getState().cleanupDummyData()
# This should now NOT cause a reload, but should show the tracking log
```

### Manual Testing Checklist
- [ ] Trigger workflow from task card
- [ ] Verify no "[RELOAD TRACKER]" logs appear
- [ ] Verify stage information appears and persists
- [ ] Wait 5 seconds, stage information still visible
- [ ] Verify workflow progress updates continuously
- [ ] Verify workflow logs accumulate without clearing
- [ ] Verify WebSocket stays connected
- [ ] Verify no ErrorBoundary triggered
- [ ] Verify no page reload/navigation events
- [ ] Verify Performance API shows only 1 navigation
- [ ] Trigger second workflow, verify no reload
- [ ] Check console for any errors
- [ ] Verify all UI elements remain stable

## Success Criteria

All tests must pass with the following criteria:

### No Unintentional Reloads
- Zero page reloads during workflow execution
- Zero `[RELOAD TRACKER]` logs during normal operation
- Performance API shows only initial navigation
- Network tab shows no document/navigation requests

### Stage Persistence
- Stage information appears immediately after trigger
- Stage information persists for entire workflow duration
- No disappearance after 1-2 seconds
- No flashing or re-rendering artifacts

### Workflow State Continuity
- Progress increases monotonically (never resets)
- Logs accumulate continuously
- WebSocket connection remains stable
- No state loss during execution

### Error Handling
- No uncaught errors in console
- No ErrorBoundary triggered
- No React error boundary logs
- Graceful error handling if errors occur

### User Experience
- Smooth, continuous updates
- No UI flickering or layout shifts
- Clear visual feedback at all stages
- Professional, stable appearance

## Notes

### What Changed (Fix Summary)

1. **kanbanStore.js `cleanupDummyData()`**: Removed `window.location.reload()`, replaced with Zustand state refresh from localStorage while preserving workflow state.

2. **ErrorBoundary.jsx**: Added workflow state preservation in `handleClearData()` so that even if data clearing is needed, active workflows are not lost.

3. **localStorage.js `clear()`**: Added optional `preserveWorkflowState` parameter to selectively preserve workflow data during clear operations.

4. **WebSocket Event Handlers**: Added try-catch blocks to all event handlers to prevent errors from propagating to ErrorBoundary and triggering reloads.

5. **Workflow Trigger Flow**: Added defensive logging and error handling to prevent workflow errors from causing unintended side effects.

### Testing Strategy

This E2E test focuses on the specific symptom reported in Issue #11:
- Stage information appearing briefly then disappearing
- Suspected frontend refresh after 1-2 seconds

By waiting 5+ seconds and verifying persistence, we confirm the fix prevents the original bug while maintaining all functionality.

### Common Issues and Troubleshooting

**Issue**: Test fails because stage actually should disappear
- This is expected if workflow completes quickly
- Check workflow status - if "completed", stage persistence is correct behavior
- Test should focus on "in_progress" workflows

**Issue**: Can't reproduce original bug (stages don't disappear)
- This means the fix is working!
- Verify by checking console for no `[RELOAD TRACKER]` logs
- Original bug would show reload logs and navigation events

**Issue**: Workflow doesn't start
- Check WebSocket server is running
- Check WebSocket connection in DevTools
- Verify backend is accessible
- Check console for connection errors

### Performance Impact

The fix should have zero negative performance impact:
- Removed expensive page reloads (improvement!)
- Added lightweight try-catch blocks (negligible overhead)
- State management more efficient than full reload
- Expected improvement: faster, smoother UX

### Browser Compatibility

This test validates on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

All modern browsers support the APIs used in the fix.
