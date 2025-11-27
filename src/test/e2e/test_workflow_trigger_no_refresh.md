# E2E Test: Workflow Trigger No Page Refresh

Test that triggering a workflow from the Kanban board does not cause the frontend application to refresh or reload.

## User Story

As a user
I want to trigger workflows from the Kanban board
So that I can execute automated tasks without losing my current page state

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial Kanban board
3. **Verify** the page title contains "AgenticKanban" or "Kanban"
4. **Verify** the Kanban board is visible with columns (To Do, In Progress, etc.)

5. Create a new task or select an existing task:
   - If creating new: Click "Add Task" button, fill in title "Test Workflow Trigger", and save
   - If using existing: Identify a task card on the board

6. Take a screenshot showing the task on the board

7. Click on the task card to open the CardExpandModal
8. **Verify** the modal opens and displays task details
9. Take a screenshot of the expanded card modal

10. Store the current page URL before triggering workflow
11. **Verify** the "Trigger Workflow" button is visible in the modal
12. **Verify** the WebSocket status shows "Connected" (or wait for connection)

13. Click the "Trigger Workflow" button
14. Take a screenshot immediately after clicking (showing any feedback)

15. Wait 2-3 seconds for workflow to be triggered

16. **Verify** the page URL has NOT changed (compare with stored URL from step 10)
17. **Verify** the CardExpandModal is still open and visible
18. **Verify** the task card is still visible on the board (modal should still be open)
19. Take a screenshot showing the modal is still open

20. Close the modal by clicking the Close button
21. **Verify** the Kanban board is still visible with all tasks intact
22. Take a screenshot of the final state

## Success Criteria
- Page does not refresh or reload when triggering workflow
- Page URL remains unchanged after workflow trigger
- Modal remains open after triggering workflow
- No navigation occurs
- User stays on the same page
- Task state is preserved
- 6 screenshots are taken at key points
