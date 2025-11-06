# E2E Test: Workflow Logs Display End-to-End

Test the complete log flow from WebSocket backend to frontend UI display, validating that workflow logs appear in real-time in the Kanban card's WorkflowLogViewer.

## User Story

As a user
I want to see real-time workflow logs in my Kanban cards
So that I can monitor the progress of my AI development workflows as they execute

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board state
3. **Verify** the page loads successfully with the kanban board visible
4. Open browser console to monitor WebSocket messages and log flow
5. **Verify** WebSocket connection is established (check for connection status indicator or console logs)

6. Create a new task with the following details:
   - Title: "Test Workflow Logs Display - Issue #58"
   - Description: "E2E test to validate logs flow from WebSocket to UI"
   - Queued stages: Plan, Build, Test, Review, Document
   - Take a screenshot after creating the task

7. **Verify** the new task appears on the board in the "Backlog" stage
8. **Verify** the task has an ADW ID assigned (check the task metadata in console or UI)
9. Note the task's ADW ID from the browser console logs

10. Click on the created task card to expand it
11. **Verify** the expanded modal opens successfully
12. **Verify** the modal contains a "Stage Logs" or "Workflow Logs" section
13. Take a screenshot of the expanded card modal

14. Check the "All Logs" tab in the logs viewer:
    - **Verify** the logs section is present
    - **Verify** it shows either:
      - Actual log entries (if workflow has started), OR
      - An informative empty state with debugging info (Task ID, ADW ID, WebSocket status)
    - Take a screenshot of the current logs state

15. Trigger the workflow for the task:
    - Click the "Start Plan" or "Trigger Workflow" button
    - **Verify** the trigger button is clicked successfully
    - Wait 2-3 seconds for the workflow to start

16. Monitor browser console for log flow:
    - **Verify** console shows "[WebSocket Server] workflow_log received" messages
    - **Verify** console shows "[WebSocketService] WORKFLOW_LOG RECEIVED" messages
    - **Verify** console shows "[KanbanStore] HANDLE WORKFLOW LOG" messages
    - **Verify** console shows "[KanbanStore] ✅ FOUND task for log entry" messages
    - **Verify** console shows "[KanbanStore] ✅ Appended log to store" messages
    - Take a screenshot of the browser console showing the log flow

17. Check the WorkflowLogViewer component:
    - **Verify** console shows "[WorkflowLogViewer] LOGS PROP CHANGED" messages
    - **Verify** the logs.length is greater than 0
    - **Verify** logs array contains log entries with proper structure (adw_id, level, message, timestamp)

18. Check the UI for real-time log display:
    - **Verify** workflow logs appear in the "All Logs" tab within 5 seconds of workflow start
    - **Verify** log entries are visible and readable
    - **Verify** each log entry shows:
      - Timestamp
      - Log level (INFO, SUCCESS, ERROR, WARNING)
      - Message content
      - Proper color coding based on level
    - Take a screenshot showing the logs displaying in real-time

19. **Verify** log count updates in the section header
20. **Verify** logs persist when switching between tabs (All Logs, Plan, Build, etc.)
21. **Verify** no duplicate log entries appear
22. Take a final screenshot of the complete logs display

23. Close the modal and re-open it:
    - Click outside the modal to close it
    - **Verify** modal closes successfully
    - Click on the task card again to re-open it
    - **Verify** logs are still present and not lost
    - Take a screenshot confirming logs persist

24. **Verify** WebSocket connection status indicator shows "Connected"
25. Take a final screenshot showing the complete working state

## Success Criteria

- Kanban board loads successfully
- Task can be created with ADW ID assigned
- Task card can be clicked to expand
- Expanded modal opens with logs section
- Workflow can be triggered successfully
- Console logs trace the complete log flow:
  - WebSocket Server receives workflow_log messages
  - WebSocketService emits workflow_log events
  - KanbanStore processes and stores logs
  - WorkflowLogViewer receives and renders logs
- Logs appear in real-time in the UI within 5 seconds of workflow start
- Log entries display correctly with:
  - Timestamps
  - Log levels
  - Messages
  - Color coding
- No duplicate logs appear
- Logs persist across modal close/re-open
- WebSocket connection status shows "Connected"
- At least 8 screenshots are captured documenting the complete flow

## Expected Console Log Flow

When logs are flowing correctly, you should see this sequence in the browser console:

```
[WebSocket Server] workflow_log received: adw_id=<id>, workflow=<name>, level=INFO, message=...
[WebSocket Server] Broadcasting workflow_log to N connections
[WebSocketService] ===== WORKFLOW_LOG RECEIVED =====
[WebSocketService] workflow_log data: {...}
[WebSocketService] Number of listeners for workflow_log: 1
[WebSocketService] workflow_log event emitted successfully
[KanbanStore] ===== HANDLE WORKFLOW LOG =====
[KanbanStore] Processing new log entry with adw_id: <id>
[KanbanStore] Total tasks in store: N
[KanbanStore] ✅ FOUND task for log entry
[KanbanStore] Calling appendWorkflowLog for taskId: <id>
[KanbanStore] ✅ Appended log to store. Previous logs: 0 → New logs: 1
[WorkflowLogViewer] ===== LOGS PROP CHANGED =====
[WorkflowLogViewer] logs.length: 1
[StageLogsViewer] Retrieved allLogs count: 1
```

## Debugging Information

If logs don't appear, check the console for these error patterns:

- "❌ NO TASK FOUND for log entry with adw_id" → ADW ID mismatch between task and log
- "Number of listeners for workflow_log: 0" → Event listener not registered
- "⚠️ NO LOGS found for taskId" → Logs not being stored in KanbanStore
- WebSocket disconnection errors → Network or server issues

## Notes

- This test validates the complete fix for Issue #58
- The test should be run with both backend WebSocket server and frontend running
- Comprehensive console logging helps trace the exact point of failure if logs don't appear
- The test ensures the disconnect between backend logs and frontend display is resolved
