# E2E Test: Task Logs Display and Stage Progression

Test that workflow logs appear on Kanban cards and stage progression works correctly.

## User Story

As a user viewing tasks on the Kanban board
I want to see workflow logs displayed on my task cards and watch stages progress in real-time
So that I can monitor the status of my automated workflows and understand what's happening

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial Kanban board state
3. **Verify** the Kanban board is visible with at least the "Backlog" column

4. Create a new test task:
   - Click the "Add Task" button or equivalent
   - Enter title: "E2E Test - Logs and Progression"
   - Enter description: "Testing that logs appear and stages progress correctly"
   - Select work item type: "feature"
   - Save the task
5. Take a screenshot of the created task

6. **Verify** the task card appears in the Backlog column
7. Locate the newly created task card

8. Trigger a workflow on the task:
   - Open the task card (click to expand)
   - Find and click the workflow trigger button (e.g., "Run Workflow", "Trigger ADW")
   - Select workflow type: "adw_plan_iso" (or similar single-stage workflow)
   - Confirm workflow trigger
9. Take a screenshot after triggering the workflow

10. Wait for WebSocket connection and logs to appear (max 15 seconds):
    - **Verify** the WebSocket status shows "Connected" in the UI
    - **Verify** the task card shows workflow logs section (may be expandable)
    - Look for "All Logs" tab or similar logs display area

11. Expand the logs section if not already expanded:
    - Click on the logs viewer/expander if needed
    - **Verify** logs appear within 10 seconds of workflow trigger
    - **Verify** at least one log entry is visible (e.g., "Starting workflow", "Stage: Plan")
12. Take a screenshot showing the logs displayed on the card

13. Verify stage progression:
    - **Verify** the task has moved from "Backlog" to "Plan" stage (or the stage corresponding to the workflow)
    - Check the Kanban board columns to confirm task location
14. Take a screenshot showing the task in the new stage

15. Verify log content:
    - **Verify** logs contain workflow-related information (stage transitions, progress updates)
    - **Verify** timestamps are present on log entries
    - **Verify** no JavaScript errors appear in the browser console

## Success Criteria
- WebSocket connection establishes successfully (shows "Connected" status)
- Task card displays logs section
- Workflow logs appear on the card within 10 seconds of triggering
- Logs contain relevant workflow information (stages, progress, timestamps)
- Task automatically moves from initial stage to the workflow target stage
- Stage progression is visible on the Kanban board
- No errors in browser console related to WebSocket or log handling
- 5 screenshots are captured showing the full workflow
