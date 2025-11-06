# WebSocket Logs Debugging and Flow Enhancement

**ADW ID:** 6d3b1dfd
**Date:** 2025-11-06
**Specification:** specs/issue-58-adw-6d3b1dfd-sdlc_planner-fix-websocket-logs-disconnect.md

## Overview

Enhanced the WebSocket logging system with comprehensive diagnostic logging throughout the entire log flow chain, from the backend WebSocket server through the frontend service layer to the Kanban store and UI components. This resolves the disconnect between workflow logs being sent by the backend and not appearing in the frontend Kanban cards by adding detailed tracing and visibility at every layer.

## What Was Built

- **Comprehensive diagnostic logging system** across the entire WebSocket log delivery chain
- **Enhanced WebSocket server logging** to track log broadcasts and connection counts
- **Detailed WebSocketService logging** with listener tracking and message flow visibility
- **Extensive KanbanStore logging** for task-log association and state changes
- **UI component logging** in WorkflowLogViewer and StageLogsViewer for render debugging
- **E2E test suite** for validating the complete log display workflow

## Technical Implementation

### Files Modified

- `adws/adw_triggers/trigger_websocket.py`: Added detailed logging to the `/api/workflow-updates` endpoint to trace incoming workflow_log messages, validate required fields, and track broadcast operations to active connections with session deduplication
- `src/services/websocket/websocketService.js`: Enhanced workflow_log case handler with comprehensive logging of incoming messages, ADW IDs, workflow names, levels, and added `listenerCount()` method to track event listener registration
- `src/stores/kanbanStore.js`: Added extensive logging in `handleWorkflowLog()` and `appendWorkflowLog()` to trace task-log association by adw_id, track all tasks in store, and monitor log storage with before/after counts
- `src/components/kanban/WorkflowLogViewer.jsx`: Added useEffect hook to log whenever logs prop changes, tracking taskId, adwId, logs array length, websocket connection status, and sample log entries
- `src/components/kanban/StageLogsViewer.jsx`: Enhanced logging when retrieving workflow logs, showing taskId, adwId, log counts, and sample/latest logs with clear warnings when no logs are found
- `.claude/commands/e2e/test_workflow_logs_display.md`: Created comprehensive E2E test suite for validating log display flow from trigger to UI

### Key Changes

1. **Backend Logging**: WebSocket server now logs all incoming workflow_log requests with full details (adw_id, workflow_name, level, message preview) and tracks broadcast operations to all active connections
2. **Service Layer Logging**: WebSocketService logs each workflow_log message with structured JSON output and tracks the number of registered event listeners for the workflow_log event
3. **State Management Logging**: KanbanStore provides detailed visibility into task-log matching, showing all tasks with their adw_ids, indicating success/failure with ✅/❌ icons, and tracking log count changes
4. **UI Component Logging**: Both WorkflowLogViewer and StageLogsViewer log prop changes and data retrieval with clear visual separators (=====) for easy console scanning
5. **Listener Tracking**: Added `listenerCount()` method to WebSocketService to verify event listeners are properly registered

## How to Use

### Debugging WebSocket Log Flow

1. **Enable Console Logging**: Open browser developer tools console
2. **Trigger a Workflow**: Create or update a task to trigger a workflow (e.g., plan, implement, review)
3. **Monitor Console Output**: Look for clearly marked sections:
   - `[WebSocket Server]` - Backend broadcast tracking
   - `[WebSocketService]` - Frontend message reception
   - `[KanbanStore]` - Task-log association and storage
   - `[StageLogsViewer]` - Log retrieval from store
   - `[WorkflowLogViewer]` - Log rendering in UI
4. **Trace a Single Log**: Follow a specific adw_id through the entire chain to identify where logs may be getting lost

### Reading Diagnostic Output

The logging system uses visual indicators for quick scanning:
- `=====` section markers for major events
- `✅` for successful operations
- `❌` for failures or missing data
- `⚠️` for warnings

Example log flow for a successful workflow log:
```
[WebSocket Server] workflow_log received: adw_id=abc123...
[WebSocket Server] Broadcasting workflow_log to 2 connections...
[WebSocketService] ===== WORKFLOW_LOG RECEIVED =====
[WebSocketService] adw_id: abc123
[WebSocketService] workflow_log event emitted successfully
[KanbanStore] ===== HANDLE WORKFLOW LOG =====
[KanbanStore] ✅ FOUND task for log entry: {taskId: "task-456", adw_id: "abc123"}
[KanbanStore] ✅ Appended log to store. Previous logs: 5 → New logs: 6
[StageLogsViewer] Retrieved allLogs count: 6
[WorkflowLogViewer] logs.length: 6
```

## Configuration

No configuration changes are required. The logging system is always active in development mode and will automatically appear in the browser console.

## Testing

### Manual Testing
1. Start the backend server and frontend
2. Open browser console
3. Create a new task in the Kanban board
4. Trigger a workflow (plan, implement, or review stage)
5. Verify console logs show the complete flow from server to UI
6. Check that logs appear in the WorkflowLogViewer component

### E2E Testing
Run the comprehensive E2E test suite:
```bash
# Read the test instructions
cat .claude/commands/test_e2e.md

# Execute the workflow logs display test
cat .claude/commands/e2e/test_workflow_logs_display.md
```

The E2E test validates:
- Task creation with ADW ID assignment
- Workflow triggering
- Log message flow through WebSocket
- UI display of logs in real-time
- Screenshot capture for visual verification

## Notes

- **Session Deduplication**: The WebSocket server uses session-based deduplication for broadcasts to prevent duplicate logs when multiple browser tabs are open
- **Log Limits**: KanbanStore maintains a maximum of 500 logs per task to prevent memory issues
- **ADW ID Matching**: Task-log association relies on matching `task.metadata.adw_id` with `logEntry.adw_id` - any mismatch will result in logs not appearing
- **Race Conditions**: If logs arrive before a task is fully created, they will be stored but may not be immediately associated with the task
- **Empty State**: WorkflowLogViewer includes helpful debugging information (taskId, adwId, WebSocket status) in the empty state to aid troubleshooting
- **Listener Tracking**: The new `listenerCount()` method helps verify that event listeners are properly registered for the workflow_log event
- **Previous Fix**: This work builds on feature 7b25b54d which added the workflow_log case handler to WebSocketService
- **Performance**: The extensive logging may impact performance during development; consider adding a debug flag to enable/disable in production

## Related Documentation

- `app_docs/feature-7b25b54d-workflow-log-handler.md` - Previous fix for workflow_log message handling
- `.claude/commands/e2e/test_workflow_logs_display.md` - E2E test suite for log display validation
- `src/services/websocket/websocketService.js:420-430` - workflow_log event handler with diagnostic logging
- `src/stores/kanbanStore.js:1388-1434` - handleWorkflowLog function with task-log association logic
- `adws/adw_triggers/trigger_websocket.py:1506-1549` - WebSocket server broadcast endpoint
