# E2E Test: Workflow Logs Display

Test that workflow logs display correctly in the expanded card modal, or show an informative empty state with debugging information.

## User Story

As a user
I want to view workflow logs in the expanded card view
So that I can monitor workflow execution and debug issues

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial kanban board state
3. **Verify** the page loads successfully with the kanban board visible
4. **Verify** at least one task card is present on the board
   - If no tasks exist, create a new task with title "Test Log Display Bug #56"
   - Wait for the task to appear on the board

5. Click on a task card to expand it
6. **Verify** the expanded modal opens successfully
7. **Verify** the expanded modal contains a "Workflow Logs" section
8. Take a screenshot of the expanded card modal

9. Check the "Workflow Logs" section content:
   - If logs exist:
     - **Verify** logs are displayed in the "All Logs" tab
     - **Verify** log entries are visible and readable
     - **Verify** each log entry shows timestamp and message
     - Take a screenshot of the logs display
   - If no logs exist:
     - **Verify** an informative empty state message is displayed
     - **Verify** the message is NOT just blank/empty space
     - **Verify** the empty state shows helpful debugging information:
       - Task ID is displayed
       - ADW ID is displayed (if available)
       - WebSocket connection status is shown
       - Clear explanation of why logs are not available
     - **Verify** the text is readable (not tiny gray text that's hard to see)
     - Take a screenshot of the informative empty state

10. **Verify** WebSocket status indicator is visible in the logs section
11. **Verify** the log count is displayed in the section header
12. Take a screenshot showing the complete logs section
13. Click outside the modal or press Escape to close it
14. **Verify** the modal closes successfully

## Success Criteria

- Kanban board loads and displays tasks
- Task card can be clicked to expand
- Expanded modal opens with "Workflow Logs" section
- Logs section is NOT blank/empty:
  - Either displays actual workflow logs with timestamps and messages
  - OR displays informative empty state with debugging info (Task ID, ADW ID, WebSocket status, helpful message)
- Empty state message is prominent and readable (NOT small gray text)
- WebSocket status indicator is visible and shows connection state
- Log count is displayed accurately
- Modal can be closed successfully
- At least 4 screenshots are captured:
  1. Initial kanban board state
  2. Expanded card modal showing logs section
  3. Either logs display OR informative empty state
  4. Complete logs section with all elements visible
