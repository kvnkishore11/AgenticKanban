# Workflow Duplicate Prevention E2E Test

## Overview
End-to-end test to validate that workflow triggers execute exactly once without duplications, even after page navigation or WebSocket reconnection.

## User Story
As a user of the Agentic Kanban application, when I trigger a workflow from the Kanban board, I expect the workflow to execute exactly once without duplicate processing, regardless of page navigation or WebSocket reconnection events.

## Test Environment Setup

### Prerequisites
- TAC-7 WebSocket service running on localhost:8002
- Agentic Kanban application running
- Test data populated in the kanban board
- Network connectivity to WebSocket service
- Browser developer tools available for monitoring console logs

### Environment Variables
```bash
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=8002
WEBSOCKET_PROTOCOL=ws
TEST_TIMEOUT=30000
```

## Test Scenarios

### Test 1: Verify Workflow Triggers Execute Exactly Once

**Purpose**: Verify that triggering a workflow from the Kanban board executes exactly once with no duplications

**Steps**:
1. Navigate to the kanban board application
2. Wait for application to fully load and WebSocket to connect
3. Open browser developer tools and navigate to Console tab
4. Clear console logs
5. Select a task from the backlog
6. Click "Trigger Workflow"
7. Choose a workflow type (e.g., "Plan")
8. Submit the workflow trigger
9. Immediately observe console logs
10. Count the number of log entries related to the workflow trigger
11. Verify only one instance of each handler execution

**Expected Results**:
- Console shows exactly one log entry for "handleTriggerResponse" being called
- Console shows exactly one log entry for "handleWorkflowStatusUpdate" being called
- Console shows "Processing new status update" or "Processing new trigger response" messages
- NO console messages showing "Ignoring duplicate status_update" or "Ignoring duplicate trigger_response"
- No duplicate workflow execution messages
- Task metadata updated exactly once
- Task status updated exactly once
- No warning logs about duplicate listener registration
- Message deduplication cache is working (no duplicate fingerprints processed)

**Validation Criteria**:
- `handleTriggerResponse` called: Exactly 1 time
- `handleWorkflowStatusUpdate` called: Exactly 1 time
- Duplicate listener warnings: 0
- Workflow execution count: 1
- Task updates: Single atomic update, no duplicates

**Screenshot Requirements**:
- Screenshot 1: Console logs showing single workflow trigger execution
- Screenshot 2: Task card showing correct single status update
- Screenshot 3: WebSocket DevTools showing single trigger message sent/received

---

### Test 2: Verify No Duplications After Page Navigation

**Purpose**: Test that workflow triggers don't duplicate after user navigates away and returns to the page

**Steps**:
1. Ensure WebSocket is connected on kanban board
2. Trigger a workflow and verify it executes once (from Test 1)
3. Navigate away from the kanban board to another view (e.g., settings or project selector)
4. Wait 3 seconds
5. Navigate back to the kanban board
6. Wait for page to fully load and WebSocket to reconnect
7. Open browser console and clear logs
8. Trigger another workflow on a different task
9. Observe console logs
10. Verify only one execution of each handler
11. Check for any "Listeners already registered" log messages

**Expected Results**:
- Console shows "[WebSocket] Listeners already registered, skipping re-initialization" message
- No duplicate listener registration occurs
- Workflow trigger executes exactly once
- No duplicate handler calls
- Task updates occur exactly once

**Validation Criteria**:
- Initialization guard triggered: Yes
- "Listeners already registered" log present: Yes
- `handleTriggerResponse` called: Exactly 1 time
- `handleWorkflowStatusUpdate` called: Exactly 1 time
- Duplicate listener warnings: 0

**Screenshot Requirements**:
- Screenshot 1: Console showing "Listeners already registered" message
- Screenshot 2: Console showing single workflow execution after navigation
- Screenshot 3: Task showing single status update

---

### Test 3: Verify No Duplications After WebSocket Reconnection

**Purpose**: Test that workflow triggers don't duplicate after WebSocket disconnects and reconnects

**Steps**:
1. Ensure WebSocket is connected on kanban board
2. Open browser DevTools > Network tab
3. Enable "Offline" mode to disconnect WebSocket
4. Observe status indicator changes to "Disconnected"
5. Wait 3 seconds
6. Disable "Offline" mode to allow reconnection
7. Wait for WebSocket to reconnect (status shows "Connected")
8. Open browser console and clear logs
9. Trigger a workflow on a task
10. Observe console logs
11. Verify only one execution of each handler
12. Check that listeners were not re-registered on reconnection

**Expected Results**:
- WebSocket disconnects cleanly
- WebSocket reconnects automatically
- Console shows "[WebSocket] Listeners already registered, skipping re-initialization" on reconnect
- Workflow trigger executes exactly once after reconnection
- No duplicate handler calls
- No duplicate listener registration

**Validation Criteria**:
- WebSocket disconnection detected: Yes
- WebSocket reconnection successful: Yes
- Initialization guard triggered on reconnect: Yes
- `handleTriggerResponse` called: Exactly 1 time
- `handleWorkflowStatusUpdate` called: Exactly 1 time
- Duplicate listener warnings: 0

**Screenshot Requirements**:
- Screenshot 1: Status indicator showing "Disconnected" state
- Screenshot 2: Status indicator showing "Connected" after reconnection
- Screenshot 3: Console showing guard preventing duplicate registration
- Screenshot 4: Console showing single workflow execution after reconnection

---

### Test 4: Verify Cleanup on Manual Disconnect

**Purpose**: Test that event listeners are properly cleaned up when user manually disconnects WebSocket

**Steps**:
1. Ensure WebSocket is connected on kanban board
2. Open browser console
3. Navigate to settings or find disconnect button (if available)
4. Manually disconnect WebSocket
5. Observe console logs for cleanup messages
6. Verify "[WebSocket] Disconnecting and cleaning up listeners" message appears
7. Manually reconnect WebSocket
8. Verify "[WebSocket] Initializing WebSocket with fresh listeners" message appears
9. Trigger a workflow
10. Verify single execution

**Expected Results**:
- Disconnect triggers cleanup logs
- All event listeners removed on disconnect
- Initialization flag reset to false
- Fresh listeners registered on reconnect
- Workflow executes exactly once after reconnect

**Validation Criteria**:
- Cleanup log present: Yes
- Listeners removed: All 6 listeners (connect, disconnect, error, status_update, workflow_log, trigger_response)
- Initialization flag reset: Yes
- Fresh initialization on reconnect: Yes
- Workflow execution count: 1

**Screenshot Requirements**:
- Screenshot 1: Console showing cleanup log on disconnect
- Screenshot 2: Console showing fresh initialization on reconnect
- Screenshot 3: Single workflow execution after reconnect

---

### Test 5: Verify Multiple Workflows Trigger Without Duplications

**Purpose**: Test that triggering multiple workflows in succession doesn't cause duplicate executions

**Steps**:
1. Ensure WebSocket is connected
2. Open browser console and clear logs
3. Create or select 3 different tasks
4. Trigger workflows for all 3 tasks in quick succession (within 10 seconds)
5. Observe console logs for each workflow trigger
6. Count handler executions for each workflow
7. Verify no duplicate executions for any workflow

**Expected Results**:
- All 3 workflows trigger successfully
- Each workflow executes exactly once
- Total `handleTriggerResponse` calls: 3 (one per workflow)
- Total `handleWorkflowStatusUpdate` calls: 3 (one per workflow)
- No duplicate executions for any workflow
- No cross-contamination between workflows

**Validation Criteria**:
- Total workflows triggered: 3
- `handleTriggerResponse` call count: 3 (exactly 1 per workflow)
- `handleWorkflowStatusUpdate` call count: 3 (exactly 1 per workflow)
- Duplicate listener warnings: 0
- Each task updated exactly once

**Screenshot Requirements**:
- Screenshot 1: Console showing 3 distinct workflow executions
- Screenshot 2: All 3 tasks showing single status updates
- Screenshot 3: Console summary showing no duplications

---

### Test 6: Verify Message Deduplication with Multiple Browser Tabs

**Purpose**: Verify that opening multiple browser tabs doesn't cause duplicate console logs due to message deduplication

**Steps**:
1. Open the kanban board in browser tab 1
2. Wait for WebSocket to connect
3. Open browser console in tab 1 and clear logs
4. Open the same kanban board URL in browser tab 2 (new tab/window)
5. Wait for WebSocket to connect in tab 2
6. Open browser console in tab 2 and clear logs
7. In tab 1, trigger a workflow on a task
8. Wait 10 seconds for workflow updates to be broadcast
9. Observe console logs in BOTH tab 1 and tab 2
10. Count occurrences of "Processing new status update" in each tab
11. Count occurrences of "Ignoring duplicate" messages in each tab
12. Verify that each tab shows unique messages being processed exactly once
13. Verify that if duplicates are received (from backend broadcasting to both tabs), they are caught by the deduplication cache
14. Close tab 2
15. In tab 1, trigger another workflow
16. Verify single execution in tab 1 only

**Expected Results**:
- Both tabs connect to WebSocket successfully
- Both tabs receive workflow update broadcasts from backend
- Tab 1 shows "Processing new status update" for each unique update
- If backend sends duplicates, tab 1 shows "Ignoring duplicate status_update" warnings
- Tab 2 may also receive broadcasts but they should be deduplicated
- Each unique status update is processed exactly once per tab
- After closing tab 2, tab 1 continues to work correctly
- Message deduplication cache prevents duplicate processing

**Validation Criteria**:
- Both tabs receive WebSocket broadcasts: Yes
- Each tab processes each unique update exactly once: Yes
- Deduplication cache catches any duplicates: Yes
- "Ignoring duplicate" warnings may appear (expected if backend broadcasts to multiple connections): Acceptable
- Each tab's console shows no duplicate processing of the same message: Confirmed
- Total unique updates processed in tab 1: Matches expected workflow events
- No duplicate task updates: Confirmed

**Screenshot Requirements**:
- Screenshot 1: Both tabs showing console logs with deduplication working
- Screenshot 2: Tab 1 showing "Processing new" messages
- Screenshot 3: Tab 2 showing received broadcasts (may show deduplication)
- Screenshot 4: Tab 1 working correctly after tab 2 is closed

---

### Test 7: Verify React useEffect Only Runs Once

**Purpose**: Verify that the App.jsx useEffect hook doesn't cause multiple WebSocket initializations

**Steps**:
1. Clear browser cache and reload page
2. Open browser console before page loads
3. Observe console logs as page loads
4. Count instances of "[WebSocket] Initializing WebSocket with fresh listeners"
5. Count instances of "AgenticKanban initialized"
6. Verify useEffect runs only once due to empty dependency array and useRef flag
7. Trigger a workflow to verify functionality

**Expected Results**:
- "AgenticKanban initialized" log appears exactly once
- "[WebSocket] Initializing WebSocket with fresh listeners" appears exactly once
- No multiple useEffect executions
- WebSocket initialized only once
- Workflow triggers work correctly

**Validation Criteria**:
- useEffect execution count: 1
- WebSocket initialization count: 1
- React re-renders don't trigger re-initialization: Confirmed
- Workflow functionality: Working correctly

**Screenshot Requirements**:
- Screenshot 1: Console showing single initialization on page load
- Screenshot 2: Console showing no re-initialization during app usage
- Screenshot 3: Successful workflow trigger after initialization

---

## Test Execution Commands

### Start Test Environment
```bash
# Navigate to project directory
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/8e939814

# Start the application (if not already running)
bash scripts/start.sh

# Wait for application to be ready
# Application should be accessible at configured URL
```

### Browser Console Commands

Open browser console and use these commands to inspect state:

```javascript
// Check WebSocket service state
websocketService._storeListenersRegistered  // Should be true after init

// Check event listeners count
Object.keys(websocketService.eventListeners).forEach(event => {
  console.log(`${event}: ${websocketService.eventListeners[event].length} listeners`);
});

// Should show exactly 1 listener per event type:
// connect: 1 listeners
// disconnect: 1 listeners
// error: 1 listeners
// status_update: 1 listeners
// workflow_log: 1 listeners
// trigger_response: 1 listeners
```

### Monitor Console Logs

Look for these specific log messages:

**On initial load:**
```
AgenticKanban initialized
[WebSocket] Initializing WebSocket with fresh listeners
```

**On subsequent initialization attempts:**
```
[WebSocket] Listeners already registered, skipping re-initialization
```

**On disconnect:**
```
[WebSocket] Disconnecting and cleaning up listeners
```

**If duplicate listener attempted (should NOT see this):**
```
[WebSocket] Duplicate listener detected for event 'trigger_response', skipping registration
```

## Success Criteria

### All Tests Must Pass
- ✅ Test 1: Workflow triggers execute exactly once on initial trigger
- ✅ Test 2: No duplications after page navigation
- ✅ Test 3: No duplications after WebSocket reconnection
- ✅ Test 4: Proper cleanup on manual disconnect
- ✅ Test 5: Multiple workflows trigger without duplications
- ✅ Test 6: React useEffect only runs once

### Guard Mechanism Validation
- Initialization guard prevents duplicate registration: Yes
- "Listeners already registered" log appears on re-init attempts: Yes
- WebSocket event deduplication works: Yes
- Event listener count remains constant at 1 per event: Yes
- Cleanup properly removes all listeners: Yes
- Initialization flag resets on disconnect: Yes

### Handler Execution Validation
- `handleTriggerResponse` execution count per workflow: Exactly 1
- `handleWorkflowStatusUpdate` execution count per workflow: Exactly 1
- `handleWorkflowLog` execution count per workflow: Exactly 1
- No duplicate task updates: Confirmed
- No duplicate metadata modifications: Confirmed

### Console Log Validation
- No duplicate listener warnings: Confirmed
- Cleanup logs appear on disconnect: Yes
- Fresh initialization logs appear only once: Yes
- Guard logs appear on re-init attempts: Yes
- No unhandled errors: Confirmed

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Duplicate Workflow Executions Still Occurring
**Symptoms**:
- Console shows multiple handler calls
- Task updates happen multiple times

**Troubleshooting Steps**:
1. Check if initialization guard is working: `websocketService._storeListenersRegistered`
2. Count listeners: Check if each event has only 1 listener
3. Clear browser cache and reload
4. Check for any code changes that bypass the guard

**Solution**:
- Verify guard code is present in `kanbanStore.js:844-851`
- Ensure deduplication code is in `websocketService.js:665-667`
- Clear React state and reload application

#### 2. Listeners Not Being Cleaned Up
**Symptoms**:
- Listener count keeps increasing
- Duplicate warnings appear

**Troubleshooting Steps**:
1. Manually disconnect and check for cleanup logs
2. Inspect `websocketService._storeListeners` object
3. Check if `disconnectWebSocket` is being called

**Solution**:
- Verify cleanup code in `kanbanStore.js:918-943`
- Ensure `websocketService.off()` removes listeners correctly
- Test manual disconnect/reconnect cycle

#### 3. Guard Not Preventing Re-initialization
**Symptoms**:
- Multiple "Initializing WebSocket" logs
- Listeners registered multiple times

**Troubleshooting Steps**:
1. Check if `websocketService._storeListenersRegistered` is set to true
2. Verify guard check at beginning of `initializeWebSocket()`
3. Check if flag is being reset unexpectedly

**Solution**:
- Ensure flag is set after listener registration: `kanbanStore.js:893`
- Verify guard check: `kanbanStore.js:845`
- Ensure flag only resets on intentional disconnect: `kanbanStore.js:935`

## Validation Checklist

Use this checklist to verify all requirements are met:

- [ ] Test 1: Single workflow execution on initial trigger
- [ ] Test 1: No duplicate handler calls
- [ ] Test 1: Single task update
- [ ] Test 2: Navigation doesn't cause duplicate registration
- [ ] Test 2: Guard log appears after navigation
- [ ] Test 2: Single workflow execution after navigation
- [ ] Test 3: Reconnection doesn't cause duplicate registration
- [ ] Test 3: Guard log appears after reconnection
- [ ] Test 3: Single workflow execution after reconnection
- [ ] Test 4: Cleanup logs appear on disconnect
- [ ] Test 4: All 6 listeners removed
- [ ] Test 4: Initialization flag reset
- [ ] Test 5: Multiple workflows execute correctly
- [ ] Test 5: Each workflow executes exactly once
- [ ] Test 5: No cross-contamination
- [ ] Test 6: useEffect runs only once
- [ ] Test 6: Single WebSocket initialization
- [ ] All required screenshots captured (20+ screenshots total)
- [ ] No duplicate listener warnings in console
- [ ] No unhandled errors during any test

## Output Format

```json
{
  "test_name": "Workflow Duplicate Prevention",
  "status": "passed|failed",
  "screenshots": [
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/01_initial_single_execution.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/02_task_single_update.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/03_websocket_messages.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/04_guard_after_navigation.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/05_single_execution_after_navigation.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/06_task_after_navigation.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/07_disconnected_state.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/08_connected_after_reconnect.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/09_guard_after_reconnect.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/10_single_execution_after_reconnect.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/11_cleanup_on_disconnect.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/12_fresh_init_after_reconnect.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/13_single_execution_after_cleanup.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/14_multiple_workflows_console.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/15_multiple_workflows_tasks.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/16_no_duplications_summary.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/17_useEffect_single_run.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/18_no_reinit_during_usage.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/19_workflow_after_init.png",
    "<absolute_path>/agents/<adw_id>/<agent_name>/img/workflow_duplicate_prevention/20_final_validation.png"
  ],
  "error": null,
  "details": {
    "total_workflows_triggered": 8,
    "duplicate_executions_detected": 0,
    "guard_activations": 3,
    "cleanup_executions": 1,
    "listener_count_per_event": 1,
    "handler_execution_counts": {
      "handleTriggerResponse": 8,
      "handleWorkflowStatusUpdate": 8,
      "handleWorkflowLog": 8
    }
  }
}
```

This comprehensive E2E test validates that the bug fix successfully prevents duplicate workflow executions under all scenarios: initial trigger, page navigation, WebSocket reconnection, manual disconnect/reconnect, multiple workflows, and React useEffect behavior.
