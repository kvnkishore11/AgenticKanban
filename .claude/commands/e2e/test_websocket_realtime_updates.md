# E2E Test: Real-Time WebSocket Updates and UI Integration

## User Story
As a developer using the Agentic Kanban system, I want to see real-time updates from ADW workflows displayed directly on my Kanban cards, so that I can monitor workflow progress, view stage transitions, and access detailed logs without leaving the Kanban board interface.

## Prerequisites
1. **Backend WebSocket Server Running**
   - Navigate to `adws` directory
   - Start the WebSocket server: `uv run adws/adw_triggers/trigger_websocket.py`
   - Verify server is running on port 8002
   - Expected output: "Starting ADW WebSocket Trigger on port 8002"

2. **Frontend Application Running**
   - Navigate to `app/client` directory
   - Start the development server: `bun run dev`
   - Verify application is running on http://localhost:5173
   - Browser should open automatically

3. **WebSocket Connection Established**
   - Open browser developer tools (F12)
   - Check console for WebSocket connection messages
   - Look for: "WebSocket connected successfully"
   - Status indicator should show "Connected" in green

## Test Steps

### Step 1: Verify Initial Setup
**Action:**
- Navigate to http://localhost:5173
- Open browser DevTools (F12) and go to Console tab
- Check WebSocket status indicator in the UI

**Expected Result:**
- Application loads without errors
- Console shows: "WebSocket connected successfully"
- WebSocket status indicator shows green "Connected" status
- No connection errors in console

**Screenshot Required:** `1-initial-setup.png`

---

### Step 2: Create a New Task
**Action:**
- Click the "+" button to create a new task
- Fill in task details:
  - Title: "Test Real-Time WebSocket Integration"
  - Description: "E2E test for real-time WebSocket UI updates"
  - Work Item Type: "Feature"
  - Select stages: Plan, Build, Test
- Click "Create Task"

**Expected Result:**
- Task card appears in the Backlog column
- Task shows correct title and description
- Task displays selected pipeline: "ADW: Plan → Build → Test"
- Task ID is generated (e.g., #1, #2, etc.)

**Screenshot Required:** `2-task-created.png`

---

### Step 3: Trigger ADW Workflow
**Action:**
- Click on the task card to expand it
- Scroll to "WebSocket Workflow" section
- Click the "Trigger Workflow" button
- Observe the Console tab in DevTools

**Expected Result:**
- Console shows: "Triggering workflow via WebSocket"
- Console shows: "Workflow triggered successfully"
- Trigger response appears with:
  - `status: "accepted"`
  - `adw_id: "some-generated-id"`
  - `workflow_name: "adw_plan_build_test_iso"`
  - `logs_path: "/path/to/logs"`
- ADW metadata section appears on card showing ADW ID and status

**Screenshot Required:** `3-workflow-triggered.png`

---

### Step 4: Verify Real-Time Status Updates
**Action:**
- Keep the task card expanded
- Watch for status updates in the "Enhanced Workflow Status" section
- Monitor the Console for WebSocket messages
- Observe status changes over time

**Expected Result:**
- Status updates appear in real-time without page refresh
- Console shows: "Received WebSocket message: status_update"
- Workflow status section shows:
  - Current status (started → in_progress → completed/failed)
  - Progress percentage with animated progress bar
  - Current step being executed
  - Status message describing current activity
- Status badge color changes based on workflow state:
  - Blue for "in_progress"
  - Green for "completed"
  - Red for "failed"

**Screenshot Required:** `4-status-updates.png`

---

### Step 5: Verify Real-Time Log Streaming
**Action:**
- Keep task card expanded
- Look for "Show Logs" button (appears when logs arrive)
- Click "Show Logs" button
- Watch the log viewer for new log entries

**Expected Result:**
- "Show Logs" button appears with log count badge
- Log viewer opens automatically when first log arrives
- Logs stream in real-time without manual refresh
- Each log entry shows:
  - Timestamp (HH:MM:SS.mmm)
  - Log level icon and color (INFO: blue, SUCCESS: green, WARNING: yellow, ERROR: red)
  - Log message
  - Current step (if available)
  - Progress percentage (if available)
- Auto-scroll keeps latest logs visible
- Log count updates dynamically

**Screenshot Required:** `5-log-streaming.png`

---

### Step 6: Verify Stage Progression Visualization
**Action:**
- Click "Show Stages" button in the workflow section
- Observe the stage progression timeline
- Watch for stage transitions as workflow progresses

**Expected Result:**
- Stage progression viewer displays all workflow stages
- Timeline shows:
  - Completed stages with green checkmarks
  - Current active stage with blue pulsing icon
  - Pending stages in gray
- Progress bar animates for active stage
- Stage transitions happen automatically based on WebSocket updates
- Overall progress percentage shown at bottom
- Visual indicators update in real-time

**Screenshot Required:** `6-stage-progression.png`

---

### Step 7: Test Log Filtering and Search
**Action:**
- In the log viewer, use the level filter dropdown
- Select "INFO" from the dropdown
- Type "workflow" in the search box
- Test different filter combinations

**Expected Result:**
- Level filter works correctly:
  - "INFO" shows only INFO level logs
  - "ERROR" shows only ERROR level logs
  - "All Levels" shows all logs
- Search filter works correctly:
  - Matching logs are shown
  - Non-matching logs are hidden
  - Search is case-insensitive
- Log count updates based on active filters
- Filters can be combined (level + search)

**Screenshot Required:** `7-log-filtering.png`

---

### Step 8: Test Log Export Functionality
**Action:**
- Click the download icon in log viewer header
- Check Downloads folder for exported file

**Expected Result:**
- File downloads with name format: `workflow-logs-YYYY-MM-DDTHH:MM:SS.sssZ.txt`
- File contains all filtered logs in plain text format
- Each log line includes:
  - Timestamp
  - Log level
  - Current step (if available)
  - Message
- File is readable and properly formatted

**Screenshot Required:** `8-log-export.png`

---

### Step 9: Test Auto-Scroll Toggle
**Action:**
- Scroll up in the log viewer while logs are streaming
- Observe auto-scroll behavior
- Click "Auto-scroll" toggle button
- Test scrolling with auto-scroll disabled and enabled

**Expected Result:**
- Auto-scroll is enabled by default (blue background)
- When user scrolls up manually, auto-scroll disables automatically
- Auto-scroll button shows current state (blue when enabled, gray when disabled)
- When at bottom of logs, auto-scroll re-enables automatically
- New logs appear without jumping when auto-scroll is disabled
- New logs auto-scroll when enabled

**Screenshot Required:** `9-autoscroll-toggle.png`

---

### Step 10: Verify Workflow Completion Handling
**Action:**
- Wait for workflow to complete (or trigger a quick workflow)
- Observe final status display
- Check task stage transition

**Expected Result:**
- Final status update shows "completed" or "failed"
- Progress bar shows 100% for completed workflows
- Status badge turns green for completed
- Task automatically moves to next stage if workflow completed successfully
- Task moves to "errored" stage if workflow failed
- Workflow metadata persists on card
- Final status message is clear and informative

**Screenshot Required:** `10-workflow-completion.png`

---

### Step 11: Test Connection Loss Recovery
**Action:**
- Stop the WebSocket server (Ctrl+C in terminal)
- Observe UI changes
- Restart the WebSocket server
- Wait for reconnection

**Expected Result:**
- Connection status changes to "Disconnected" (red)
- "Trigger Workflow" button becomes disabled and grayed out
- Console shows: "WebSocket connection closed"
- Console shows reconnection attempts
- After server restarts, connection auto-reconnects within 30 seconds
- Connection status returns to "Connected" (green)
- "Trigger Workflow" button becomes enabled
- Console shows: "WebSocket connected successfully"

**Screenshot Required:** `11-connection-recovery.png`

---

### Step 12: Test Multiple Concurrent Workflows
**Action:**
- Create 2-3 additional tasks
- Trigger workflows for all tasks
- Expand multiple cards simultaneously
- Observe real-time updates for each task

**Expected Result:**
- Each task receives its own workflow updates
- Logs are correctly associated with their respective tasks
- No log entries appear in wrong tasks
- Progress updates are independent per task
- All cards update simultaneously without lag
- WebSocket handles multiple workflows correctly
- No console errors or warnings

**Screenshot Required:** `12-multiple-workflows.png`

---

### Step 13: Test Clear Logs Functionality
**Action:**
- With logs displayed, click the trash icon in log viewer
- Confirm the action if prompted

**Expected Result:**
- All logs for that task are cleared
- Log viewer shows "No logs yet" message
- Log count resets to 0
- "Show Logs" button disappears
- Clearing logs doesn't affect other tasks
- New logs can still be received after clearing

**Screenshot Required:** `13-clear-logs.png`

---

### Step 14: Test Workflow Metadata Display
**Action:**
- Expand a task with active or completed workflow
- Examine the ADW Metadata section
- Click the "Copy" button next to ADW ID

**Expected Result:**
- ADW metadata section displays:
  - ADW ID (unique identifier)
  - Workflow status (current state)
  - Logs path (file system path)
- "Copy" button copies ADW ID to clipboard
- After copying, can paste ADW ID successfully
- All metadata fields are populated correctly
- Metadata updates in real-time as workflow progresses

**Screenshot Required:** `14-metadata-display.png`

---

### Step 15: Test UI Responsiveness and Performance
**Action:**
- Trigger a workflow that generates many log entries
- Monitor browser performance
- Check for UI lag or freezing
- Observe memory usage in DevTools Performance tab

**Expected Result:**
- UI remains responsive during heavy log streaming
- No noticeable lag when scrolling logs
- Task cards expand/collapse smoothly
- Log filtering happens instantly
- No memory leaks (memory stabilizes over time)
- Frame rate stays above 30 FPS
- Log limit (500 entries) prevents memory issues
- Browser doesn't slow down with multiple active workflows

**Screenshot Required:** `15-performance-test.png`

---

## Success Criteria Validation

### Functional Requirements
- [x] WebSocket service successfully parses and emits all message types
- [x] Kanban store receives and processes status_update messages in real-time
- [x] Workflow updates are correctly associated with tasks based on adw_id
- [x] KanbanCard displays real-time logs in beautified, scrollable format
- [x] Stage progression visualizes with progress indicators and updates automatically
- [x] Workflow metadata (ADW ID, status, timestamps) displays on cards
- [x] WebSocket connection health is visible with reconnection capabilities
- [x] Card UI remains performant with multiple concurrent workflows

### Error Handling
- [x] Error states handled gracefully with user-friendly messages
- [x] Connection loss triggers automatic reconnection
- [x] Malformed messages don't crash the application
- [x] Missing workflow data shows appropriate fallback UI

### User Experience
- [x] Expandable/collapsible sections work smoothly without layout shifts
- [x] Auto-scroll provides good UX for log viewing
- [x] Real-time updates don't disrupt user interaction
- [x] Visual feedback for all state changes
- [x] Responsive design works on different screen sizes

### Integration
- [x] E2E test validates entire real-time update flow
- [x] All existing tests pass with zero regressions
- [x] Frontend builds successfully without errors or warnings
- [x] Feature works seamlessly in connected and disconnected states

## Expected Console Output Examples

### Successful Workflow Trigger
```
WebSocket connected successfully
Triggering workflow via WebSocket: {workflow_type: "adw_plan_build_test_iso", ...}
Sent WebSocket message: trigger_workflow
Received WebSocket message: trigger_response {status: "accepted", adw_id: "2a14d4c3-xxx", ...}
Workflow triggered successfully: {status: "accepted", ...}
```

### Real-Time Status Updates
```
Received WebSocket message: status_update {adw_id: "2a14d4c3-xxx", status: "started", ...}
Received WebSocket message: status_update {adw_id: "2a14d4c3-xxx", status: "in_progress", progress_percent: 25, ...}
Received WebSocket message: status_update {adw_id: "2a14d4c3-xxx", status: "in_progress", progress_percent: 50, ...}
Received WebSocket message: status_update {adw_id: "2a14d4c3-xxx", status: "completed", progress_percent: 100, ...}
```

### Connection Events
```
WebSocket connection closed: 1006
Scheduling reconnect attempt 1 in 1000ms
Reconnect attempt 1/5
Connecting to WebSocket: ws://localhost:8002/ws/trigger
WebSocket connected successfully
```

## Troubleshooting

### WebSocket Won't Connect
- Verify backend server is running: `ps aux | grep trigger_websocket`
- Check port 8002 is not in use: `lsof -i :8002`
- Check firewall settings
- Verify backend logs for errors

### No Logs Appearing
- Check browser console for WebSocket messages
- Verify workflow is actually running (check backend logs)
- Confirm task ADW ID matches workflow ADW ID
- Check WebSocket message format matches expected structure

### UI Not Updating
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Check for JavaScript errors in console
- Verify React DevTools shows state updates

### Performance Issues
- Check number of active workflows (limit to 5-10 for testing)
- Clear old workflow logs
- Close unnecessary browser tabs
- Check browser memory usage
- Verify log limit (500) is enforced

## Notes
- All screenshots should be saved in `.claude/commands/e2e/screenshots/websocket_realtime_updates/`
- Include timestamp in screenshot filenames
- Capture full browser window including DevTools when relevant
- Test should be run in both Chrome and Firefox for compatibility
- Document any deviations from expected behavior
- Report bugs found during testing to issue tracker

## Related Documentation
- WebSocket Integration Guide: Understanding the communication protocol
- ADW Workflow Documentation: Understanding workflow lifecycle and stages
- Zustand Best Practices: Optimizing state management for real-time updates
- React Performance Optimization: Handling frequent re-renders efficiently
