# E2E Test: Merge to Main Workflow

Test the merge to main workflow functionality in the Kanban board application.

## User Story

As a user
I want to merge completed work to main
So that changes are integrated into the main branch and the task remains visible with merged status

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial Kanban board state
3. **Verify** a task exists in "Ready to Merge" stage
4. **Verify** the task has an ADW ID displayed
5. Click on the task card to expand it
6. Take a screenshot of the expanded task showing the "Merge to Main" button
7. **Verify** "Merge to Main" button is visible on the task
8. Click the "Merge to Main" button
9. Wait for merge to complete (watch for loading state to finish)
10. **Verify** the task still exists in "Ready to Merge" stage (did not disappear)
11. **Verify** "Merged" status indicator is displayed with checkmark icon
12. **Verify** "Merged" status shows a timestamp
13. **Verify** "Merge to Main" button is no longer visible/clickable
14. Take a screenshot of the merged task with status indicator
15. **Verify** the merged status indicator has green background color (bg-green-50)
16. **Verify** the task metadata shows merge completion (check visually that the "Merged" label and timestamp are present)

## Success Criteria
- Task remains visible in "Ready to Merge" stage after merge
- Merged status is clearly indicated with checkmark icon
- Merge button is hidden after successful merge
- Merged timestamp is displayed
- Green color styling is applied to merged status indicator
- 3 screenshots captured showing before/during/after states
