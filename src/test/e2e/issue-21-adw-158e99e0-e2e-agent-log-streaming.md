# E2E Test: Agent Log Streaming (Issue #21, ADW: 158e99e0)

## Overview

End-to-end test specification for real-time agent log streaming from backend to frontend via WebSocket.

## Test Scenario

**Title:** User triggers workflow and sees real-time agent logs in the UI

**User Story:** As a developer using the Kanban board, I want to see real-time logs of what the AI agent is thinking and doing during each workflow stage, so that I can understand the agent's decision-making process and have complete visibility into automated workflows.

## Prerequisites

- Backend server running on port 8001
- WebSocket server running on port 8500
- Frontend running on port 5173 (or configured port)
- Test environment with valid GitHub PAT and Claude Code setup

## Test Steps

### 1. Start Services

```bash
# Terminal 1 - Start backend server
cd server
uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Start WebSocket server
cd adws
python start-websocket.py

# Terminal 3 - Start frontend
cd /path/to/frontend
bun run dev
```

### 2. Open Browser and Navigate

1. Open browser (Chrome/Firefox recommended)
2. Navigate to `http://localhost:5173`
3. Open DevTools (F12)
4. Go to Console tab
5. Go to Network tab → Filter by "WS" (WebSocket)

### 3. Create Test Task

1. On Kanban board, create a new task:
   - Title: "Test Agent Log Streaming"
   - Description: "E2E test for issue #21"
   - Stage: Backlog
2. Note the task ID displayed
3. Verify task card appears in Backlog column

### 4. Trigger Workflow

1. Click on the task card to open details modal
2. Click "Start Planning" or trigger a workflow
3. Observe console for WebSocket connection messages

**Expected Console Output:**
```
[WebSocketService] WebSocket connected
[WebSocketService] Connection established
```

### 5. Verify WebSocket Events

Monitor console for incoming agent events:

**Expected Event Sequence:**
1. `workflow_log` - Workflow started message
2. `stage_transition` - Transition to plan stage
3. `thinking_block` - Agent reasoning events
4. `tool_use_pre` - Before tool execution
5. `tool_use_post` - After tool execution
6. `file_changed` - File modification events
7. `text_block` - Agent text responses
8. `agent_log` - General agent logs

**Verification Commands in Console:**
```javascript
// Check WebSocket connection
websocketService.isConnected

// Check received events
// Look for console logs like:
// [WebSocketService] Received message: thinking_block
// [KanbanStore] Handling thinking block: {...}
```

### 6. Verify UI Updates

1. Open the task details modal (if not already open)
2. Navigate to the "Logs" tab
3. Verify logs appear in real-time

**Expected UI Behavior:**
- Agent logs appear within 2 seconds of backend broadcast
- Logs display with proper formatting:
  - Icons for different event types (Brain, Wrench, File icons)
  - Color coding by log level (INFO=blue, ERROR=red, SUCCESS=green)
  - Timestamps formatted correctly
- Expandable entries work (click to expand/collapse)
- Auto-scroll follows new logs

### 7. Test Event Types

Verify each agent event type displays correctly:

#### Thinking Block Event
- **Icon:** Brain (purple background)
- **Content:** Expandable reasoning text
- **Duration:** Displayed if available
- **Expand:** Click to see full reasoning

#### Tool Use Pre Event
- **Icon:** Wrench (indigo background)
- **Content:** Tool name and "Calling tool" message
- **Input:** Expandable JSON parameters
- **Expand:** Click to see formatted input

#### Tool Use Post Event
- **Icon:** Wrench with status icon (green=success, red=error)
- **Content:** Tool name and "Tool completed" message
- **Duration:** Execution time displayed
- **Output:** Expandable tool output
- **Expand:** Click to see output/error details

#### File Changed Event
- **Icon:** File Edit (orange background)
- **Content:** Operation type and file path
- **Stats:** Lines added/removed count
- **Diff:** Expandable diff preview
- **Expand:** Click to see diff and summary

#### Text Block Event
- **Icon:** File Text (blue background)
- **Content:** "Agent response" message
- **Text:** Expandable agent text
- **Expand:** Click to see full text

### 8. Test Filtering and Search

1. Use the filter dropdown to filter by log level:
   - Select "ERROR" - verify only error logs show
   - Select "INFO" - verify only info logs show
   - Select "All" - verify all logs show

2. Use the search box:
   - Type a keyword from a log message
   - Verify matching logs are highlighted/filtered
   - Clear search - verify all logs return

### 9. Test Auto-Scroll

1. Scroll up in the log viewer (away from latest)
2. Wait for new logs to arrive
3. Verify auto-scroll indicator shows "Paused"
4. Scroll back to latest logs
5. Verify auto-scroll indicator shows "Active"

### 10. Test Expand/Collapse

For each expandable log entry:
1. Click to expand
2. Verify detailed content displays
3. Verify syntax highlighting (for code/JSON)
4. Click again to collapse
5. Verify content hides

### 11. Test Multiple Concurrent Workflows

1. Create another test task
2. Trigger workflow for second task
3. Open both task details in separate browser tabs
4. Verify each tab shows only logs for its task
5. Verify no cross-contamination of logs

### 12. Test Workflow Completion

1. Wait for workflow to complete
2. Verify final logs appear
3. Verify all agent events were captured
4. Check console for no errors or warnings

### 13. Capture Screenshots

Take screenshots showing:
1. WorkflowLogViewer with agent logs displayed
2. Expanded thinking block with reasoning
3. Expanded tool use with formatted JSON
4. Expanded file change with diff
5. Filter/search functionality
6. Multiple log entries with different icons/colors

## Expected Results

### Success Criteria

- ✅ WebSocket connection establishes successfully
- ✅ All agent event types received in console
- ✅ Agent logs appear in UI within 2 seconds
- ✅ Logs properly formatted with icons and colors
- ✅ Timestamps display correctly
- ✅ Expand/collapse works for all event types
- ✅ Filtering by log level works
- ✅ Search functionality works
- ✅ Auto-scroll follows new logs (with toggle)
- ✅ Multiple concurrent workflows isolated
- ✅ No console errors or warnings
- ✅ UI remains responsive with 100+ agent logs

### Performance Metrics

- **Log latency:** < 2 seconds from backend broadcast to UI display
- **UI responsiveness:** No lag with 100+ logs streaming
- **WebSocket stability:** Connection remains stable throughout workflow
- **Memory usage:** No memory leaks after multiple workflows

## Edge Cases to Test

### 1. No Agent Directory Exists Yet
**Steps:**
1. Trigger workflow for brand new task
2. Verify monitoring handles gracefully
3. Verify logs appear once directory created

**Expected:** No errors, logs stream once agent starts

### 2. WebSocket Disconnect During Workflow
**Steps:**
1. Start workflow
2. Stop WebSocket server mid-workflow
3. Restart WebSocket server
4. Verify frontend reconnects

**Expected:** Reconnection message, logs resume streaming

### 3. Very Large Log Files (1000+ lines)
**Steps:**
1. Run a workflow that generates many logs
2. Verify UI performance with 1000+ logs
3. Check virtual scrolling or pagination

**Expected:** UI remains responsive, no crashes

### 4. Invalid JSONL Format
**Steps:**
1. Manually corrupt `raw_output.jsonl` during workflow
2. Verify parser skips invalid lines
3. Verify valid lines still processed

**Expected:** Error logged, valid logs continue streaming

### 5. Multiple Browser Tabs
**Steps:**
1. Open same task in two browser tabs
2. Verify both receive agent events
3. Verify session deduplication if implemented

**Expected:** Both tabs update, or deduplication prevents duplicates

### 6. Workflow Completes Before User Opens Log Viewer
**Steps:**
1. Trigger workflow
2. Wait for completion (don't open logs)
3. Open log viewer after workflow done

**Expected:** All historical agent logs loaded and displayed

## Debugging Tips

### Console Checks
```javascript
// Check WebSocket service state
console.log(websocketService.isConnected);
console.log(websocketService.reconnectAttempts);

// Check Kanban store state
console.log(useKanbanStore.getState().tasks);
console.log(useKanbanStore.getState().workflowLogs);

// Listen for specific events
websocketService.on('thinking_block', (data) => {
  console.log('Thinking block received:', data);
});
```

### Network Tab Checks
1. Filter by "WS" to see WebSocket frames
2. Click on WebSocket connection
3. View "Messages" tab
4. Verify events flowing: thinking_block, tool_use_pre, etc.

### Backend Checks
```bash
# Check agent directory exists
ls -la agents/{adw_id}/

# Check raw_output.jsonl being written
tail -f agents/{adw_id}/sdlc_planner/raw_output.jsonl

# Check AgentDirectoryMonitor logs
# Look for: "Started directory monitoring for {adw_id}"
```

## Test Data

### Sample Thinking Block Event
```json
{
  "type": "thinking_block",
  "data": {
    "adw_id": "test-adw-123",
    "timestamp": "2025-01-28T10:30:00.000Z",
    "content": "I need to analyze the specification and create a comprehensive implementation plan...",
    "duration_ms": 1500,
    "sequence": 1
  }
}
```

### Sample Tool Use Pre Event
```json
{
  "type": "tool_use_pre",
  "data": {
    "adw_id": "test-adw-123",
    "timestamp": "2025-01-28T10:30:02.000Z",
    "tool_name": "Read",
    "input": {
      "file_path": "/path/to/spec.md"
    },
    "tool_use_id": "toolu_123"
  }
}
```

### Sample Tool Use Post Event
```json
{
  "type": "tool_use_post",
  "data": {
    "adw_id": "test-adw-123",
    "timestamp": "2025-01-28T10:30:03.500Z",
    "tool_name": "Read",
    "tool_use_id": "toolu_123",
    "output": "# Specification\n\n...",
    "duration_ms": 1500,
    "success": true
  }
}
```

### Sample File Changed Event
```json
{
  "type": "file_changed",
  "data": {
    "adw_id": "test-adw-123",
    "timestamp": "2025-01-28T10:30:05.000Z",
    "file_path": "src/components/Example.jsx",
    "operation": "modified",
    "lines_added": 25,
    "lines_removed": 10,
    "diff": "@@ -1,5 +1,5 @@\n...",
    "summary": "Added new component for agent log display"
  }
}
```

## Test Report Template

```markdown
## Test Execution Report

**Date:** {date}
**Tester:** {name}
**Environment:** {dev/staging/production}
**Browser:** {Chrome 120 / Firefox 121 / etc}

### Results Summary
- Total Steps: 13
- Passed: {number}
- Failed: {number}
- Skipped: {number}

### Detailed Results
| Step | Status | Notes | Screenshot |
|------|--------|-------|------------|
| 1. Start Services | ✅/❌ | | |
| 2. Navigate Browser | ✅/❌ | | |
| ... | | | |

### Issues Found
1. {Issue description}
   - Severity: {Critical/High/Medium/Low}
   - Steps to reproduce: {...}
   - Expected: {...}
   - Actual: {...}

### Screenshots
- {link to screenshot 1}
- {link to screenshot 2}

### Recommendations
- {recommendation 1}
- {recommendation 2}
```

## Success Metrics

- **Test Pass Rate:** 100% of steps pass
- **Log Latency:** Average < 1 second, Max < 2 seconds
- **UI Performance:** No lag with 500+ logs
- **Error Rate:** 0 console errors during normal operation
- **User Experience:** Testers rate ease of understanding agent behavior ≥ 4/5

## Notes

- This is a manual E2E test specification
- For automated testing, consider using Playwright or Cypress
- Screenshots should be saved in `docs/e2e-screenshots/issue-21/`
- Update this spec as new features are added
