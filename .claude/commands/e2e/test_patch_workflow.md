# E2E Test: Patch Workflow Trigger

Test patch workflow trigger functionality in the AgenticKanban application.

## User Story

As a developer using AgenticKanban
I want to trigger the Patch workflow with an existing ADW ID
So that I can apply quick fixes and updates to existing worktrees without having to re-run the entire SDLC pipeline

## Prerequisites

- Application must be running (frontend and backend)
- WebSocket trigger service must be running
- At least one task should exist with an existing ADW ID (from a previous workflow)

## Test Steps

### Setup Phase

1. Navigate to the `Application URL` (typically http://localhost:5173)
2. Take a screenshot of the initial kanban board
3. **Verify** the kanban board is visible with columns: Backlog, Plan, Build, Test, Review, Document, Ship

### Create or Select Test Task

4. If no tasks exist with ADW IDs:
   - Create a new task or use an existing task
   - Trigger a "Plan (Isolated)" workflow to generate an ADW ID
   - Wait for the workflow to complete or reach a patchable state
5. Select a task that has an ADW ID in its metadata
6. Take a screenshot showing the selected task

### Open Workflow Trigger Modal

7. Click on the task card to open task details
8. Click the "Trigger Workflow" button or menu option
9. **Verify** the Workflow Trigger Modal opens
10. Take a screenshot of the modal

### Select Patch Workflow

11. In the "Workflow Type" section, select "Patch (Isolated)"
12. **Verify** the workflow description shows "Apply patch using existing plan or comments"
13. **Verify** the workflow category badge shows "ENTRY POINT" (blue)
14. Take a screenshot of the selected workflow type

### Select ADW ID

15. In the "ADW ID" input field:
    - If the task has an existing ADW ID, verify it's auto-populated
    - Or use the dropdown to select an existing ADW ID
16. **Verify** the ADW ID follows the format: 8 alphanumeric characters
17. Take a screenshot of the ADW ID selection

### Enter Patch Request

18. In the "Patch Request" text area, enter:
    ```
    Fix the validation error that occurs when triggering patch workflow.
    Ensure proper error handling and validation for ADW ID selection.
    ```
19. **Verify** the helper text shows the patch request is optional when ADW ID is provided
20. Take a screenshot of the patch request input

### Review Workflow Summary

21. Scroll down to the "Workflow Summary" section
22. **Verify** the summary shows:
    - Type: Patch (Isolated)
    - Category: entry point
    - ADW ID: (the selected ADW ID)
    - Model Set: Base Models
    - Issue: (the task number)
23. Take a screenshot of the workflow summary

### Trigger the Workflow

24. **Verify** the "Trigger Workflow" button is enabled
25. **Verify** the WebSocket connection status shows "Connected"
26. Click the "Trigger Workflow" button
27. Take a screenshot immediately after clicking

### Verify Workflow Trigger Success

28. **Verify** the modal closes after successful trigger
29. **Verify** no error messages are displayed
30. **Verify** the task moves to the appropriate stage (e.g., "Plan" or stays in current stage)
31. Take a screenshot of the updated kanban board

### Check Browser Console

32. Open browser developer tools console
33. **Verify** there are no error messages related to workflow trigger
34. **Verify** success logs show workflow was triggered correctly
35. Take a screenshot of the console logs

### Verify WebSocket Communication

36. In browser developer tools, go to Network tab
37. Filter for WebSocket connections
38. **Verify** a WebSocket message was sent with:
    - Type: "trigger_workflow"
    - workflow_type: "adw_patch_iso"
    - adw_id: (the selected ADW ID)
    - patch_request: (the entered text)
39. **Verify** a response was received with status "accepted"
40. Take a screenshot of the WebSocket messages

### Check Backend Logs

41. Check the WebSocket trigger service logs
42. **Verify** logs show:
    - Workflow trigger request received
    - ADW ID validation passed
    - Workflow process started
43. Take a screenshot of relevant backend logs

## Success Criteria

- [x] User can select "Patch (Isolated)" workflow type in the modal
- [x] User can select an existing ADW ID from dropdown or use auto-populated value
- [x] ADW ID validation works correctly (8 alphanumeric characters)
- [x] User can enter patch request details in the text area
- [x] Clicking "Trigger Workflow" successfully starts the patch workflow
- [x] No errors are displayed in the UI
- [x] Modal closes after successful trigger
- [x] Task remains on the board (moves to appropriate stage if needed)
- [x] WebSocket connection works correctly
- [x] WebSocket message contains correct workflow type and ADW ID
- [x] Backend receives and processes the request successfully
- [x] Browser console shows no errors
- [x] At least 10 screenshots are captured

## Edge Cases to Test

### Test Case 1: Empty Patch Request
1. Select patch workflow with valid ADW ID
2. Leave patch request field empty
3. Trigger workflow
4. **Verify** workflow triggers successfully (uses task description instead)

### Test Case 2: Invalid ADW ID Format
1. Select patch workflow
2. Enter an invalid ADW ID (e.g., "abc" - too short)
3. **Verify** validation error is shown: "ADW ID must be exactly 8 characters"
4. **Verify** trigger button is disabled or shows error before sending

### Test Case 3: Non-existent ADW ID
1. Select patch workflow
2. Enter a valid format but non-existent ADW ID (e.g., "zzzzzzzz")
3. Trigger workflow
4. **Verify** workflow creates new state for entry-point workflow (should succeed)

### Test Case 4: WebSocket Disconnected
1. Stop the WebSocket trigger service
2. Try to trigger patch workflow
3. **Verify** error message shows: "WebSocket connection required"
4. **Verify** user cannot trigger workflow while disconnected

### Test Case 5: Special Characters in Patch Request
1. Enter patch request with code snippets and special characters:
   ```
   Fix the function `handleSubmit()` to properly escape quotes "like this" and symbols <>&
   ```
2. Trigger workflow
3. **Verify** special characters are properly handled and not causing errors

## Expected Screenshots

1. Initial kanban board
2. Selected task
3. Workflow trigger modal opened
4. Patch workflow selected
5. ADW ID selected
6. Patch request entered
7. Workflow summary
8. After trigger button clicked
9. Updated kanban board
10. Browser console logs
11. WebSocket messages
12. Backend logs

## Notes

- This test validates the fix for issue #61 where patch workflow with ADW ID was throwing errors
- The patch workflow is an ENTRY POINT workflow, meaning it can work with or without an existing ADW ID
- When an ADW ID is provided, it should either load existing state or create new state (both are valid)
- The patch_request field should be passed through issue_json to the backend
- Backend should extract patch_request from issue_json and use it in the patch content extractor
