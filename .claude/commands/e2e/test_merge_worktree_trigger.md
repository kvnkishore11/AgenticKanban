# E2E Test: Merge Worktree Workflow Trigger

Test that the "Merge to Main" button properly triggers the adw_merge_worktree workflow via WebSocket instead of the deprecated REST API.

## User Story

As a user
I want to merge my completed work from a worktree to the main branch
So that my changes are integrated into the main codebase through the ADW workflow system

## Prerequisites

- A task must exist in the "Ready to Merge" stage with:
  - Valid `adw_id` in task metadata
  - Valid `issue_number` in task metadata (optional but recommended)
  - The task should have been created through a previous ADW workflow

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the Kanban board initial state
3. **Verify** the page title contains "AgenticKanban" or "Kanban Board"
4. **Verify** the "Ready to Merge" column is visible

5. Look for a task in the "Ready to Merge" stage
   - If no task exists, create one manually or skip to failure
6. Click on the task to open the task details modal
7. Take a screenshot of the task details modal
8. **Verify** the task details modal is open
9. **Verify** the "Merge to Main" button is visible

10. Open browser console to monitor WebSocket messages
11. Click the "Merge to Main" button
12. Take a screenshot immediately after clicking
13. **Verify** WebSocket connection is active (check console for WebSocket messages)
14. **Verify** A WebSocket message with type "trigger_workflow" is sent
15. **Verify** The workflow_type in the message is "adw_merge_worktree"
16. **Verify** The message includes the task's adw_id
17. **Verify** No REST API call to "/api/merge/trigger" is made (check network tab)

18. Wait for workflow trigger response (up to 10 seconds)
19. **Verify** A trigger_response event is received via WebSocket
20. **Verify** The response indicates success or workflow is starting
21. Take a screenshot of the task after trigger response

22. **Verify** The task metadata is updated with merge_triggered: true
23. **Verify** No errors appear in the browser console
24. **Verify** The task does not move to "errored" stage immediately

## Success Criteria

- "Merge to Main" button is visible in task details
- Clicking the button triggers a WebSocket message, not REST API
- WebSocket message type is "trigger_workflow"
- workflow_type in message is "adw_merge_worktree"
- Message includes correct adw_id from task metadata
- No REST API call to /api/merge/trigger is made
- Trigger response is received via WebSocket
- Task metadata is updated correctly
- No console errors occur
- At least 3 screenshots are taken

## Expected WebSocket Message Format

The trigger message should look like:
```json
{
  "type": "trigger_workflow",
  "data": {
    "workflow_type": "adw_merge_worktree",
    "adw_id": "<task's adw_id>",
    "issue_number": "<task's issue_number or null>",
    "issue_type": "<task's workItemType or null>",
    "issue_json": {
      "title": "<task title>",
      "body": "<task description>",
      "number": "<task id>",
      "images": []
    },
    "model_set": "base",
    "trigger_reason": "Kanban task: <task title>"
  }
}
```

## Failure Scenarios

- If REST API call to /api/merge/trigger is detected → FAIL (using deprecated endpoint)
- If WebSocket is not connected → FAIL (WebSocket not initialized)
- If workflow_type is not "adw_merge_worktree" → FAIL (wrong workflow)
- If adw_id is missing from message → FAIL (missing required parameter)
- If trigger_response indicates error → FAIL (workflow trigger failed)
- If task moves to "errored" stage → FAIL (error handling triggered)

## Notes

- This test validates the migration from REST API to WebSocket trigger
- The actual merge operation may take several minutes - we only test the trigger
- The test focuses on the trigger mechanism, not the merge outcome
- WebSocket connection should be established when the Kanban board loads
