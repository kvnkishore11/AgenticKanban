# E2E Test: Card Logs Display

Test that workflow logs display correctly on frontend cards when WebSocket messages are received.

## User Story

As a user
I want to see real-time workflow logs in the card detail view
So that I can monitor the progress of my workflows

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the Kanban board is visible with columns (To Do, In Progress, Done)
4. **Verify** at least one task card is present in the board

5. Find a task card with an `adw_id` in its metadata (look for tasks that have been triggered)
   - If no tasks with `adw_id` exist, this test should be marked as skipped with appropriate message

6. Click on the task card to expand the CardExpandModal
7. Take a screenshot of the expanded card modal
8. **Verify** the modal displays the task details including:
   - Task title
   - Task description
   - WebSocket status indicator

9. Scroll to the "Workflow Logs" section in the modal
10. **Verify** the StageLogsViewer component is visible (even if no logs are present yet)
11. **Verify** the logs viewer shows tabs for different log views (all, stages, agent-state)
12. Take a screenshot of the logs viewer section

13. **Verify** either:
    - Logs are already displayed in the "all" tab (if workflow has already generated logs), OR
    - The logs viewer is mounted and ready to receive logs (showing "No logs available yet" or similar message)

14. If logs are displayed:
    - **Verify** logs appear in reverse chronological order (newest first)
    - **Verify** each log entry shows timestamp and message
    - **Verify** logs can be scrolled if many entries exist
    - Take a screenshot showing the log entries

15. Close the modal by clicking the X button or pressing Escape
16. **Verify** the modal closes and the Kanban board is visible again

## Success Criteria
- Kanban board loads successfully
- Task cards are clickable and expand to show details
- CardExpandModal displays correctly with all sections
- StageLogsViewer component is visible when task has `adw_id`
- Logs viewer shows appropriate message if no logs yet
- If logs exist, they display correctly with timestamps
- Modal closes properly
- At least 3 screenshots are taken

## Notes
- This test validates the fix for issue #83 where logs were not displaying despite WebSocket transmission
- The key fix was changing the conditional rendering from `workflowLogs.length > 0 || task.metadata?.adw_id` to just `task.metadata?.adw_id`
- This ensures the StageLogsViewer is always mounted for tasks with workflows, allowing it to react to incoming logs
