# E2E Test: SDLC ISO Label and Workflow Mapping

Test the bug fix for SDLC ISO label and workflow mapping in the Agentic Kanban application.

## User Story

As a user
I want to click on "SDLC" button to select full SDLC stages
So that the system correctly maps to 'adw_sdlc_iso' workflow with proper UI labels

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial state
3. **Verify** the page title is "Agentic Kanban"
4. **Verify** core UI elements are present:
   - Add task button (+ button)
   - Kanban board with columns
   - Project selection area

5. Click the "+" button to open the task creation form
6. Take a screenshot of the task creation form
7. **Verify** the task creation modal opens with:
   - Task Title field
   - Work Item Type selection
   - Queue Stages section
   - Description field
   - Create Task button

8. **Verify** the Full SDLC button shows "SDLC" text (not "Select Full SDLC")
9. Take a screenshot of the initial SDLC button state
10. **Verify** the button styling indicates it's not selected
11. Click the "SDLC" button
12. **Verify** the button text changes to "✓ SDLC Selected"
13. Take a screenshot of the selected SDLC button state
14. **Verify** all SDLC stage checkboxes are selected:
    - Plan checkbox is checked
    - Implement checkbox is checked
    - Test checkbox is checked
    - Review checkbox is checked
    - Document checkbox is checked

15. Enter task description: "Test SDLC workflow mapping"
16. Take a screenshot before task creation
17. Click "Create Task" button
18. **Verify** task is created successfully
19. **Verify** in browser console/network logs that workflow name generated is "adw_sdlc_iso"
20. Take a screenshot of the created task

21. Test deselection behavior:
    - Click the "+" button again to open task creation form
    - Click the "SDLC" button to select all stages
    - **Verify** button shows "✓ SDLC Selected"
    - Click the "✓ SDLC Selected" button again
    - **Verify** button text returns to "SDLC"
    - **Verify** all SDLC stage checkboxes are deselected
    - Take a screenshot of the deselected state

22. Test partial SDLC selection:
    - Select only Plan, Implement, and Test stages manually
    - **Verify** the button still shows "SDLC" (not "✓ SDLC Selected")
    - Enter description: "Test partial SDLC workflow"
    - Create the task
    - **Verify** workflow name is NOT "adw_sdlc_iso" (should be "adw_plan_build_test_iso")

## Success Criteria
- SDLC button displays "SDLC" when not selected
- SDLC button displays "✓ SDLC Selected" when all stages are selected
- Clicking SDLC button selects all 5 SDLC stages (plan, implement, test, review, document)
- Clicking "✓ SDLC Selected" deselects all SDLC stages
- Full SDLC selection generates "adw_sdlc_iso" workflow name
- Partial SDLC selection does NOT generate "adw_sdlc_iso" workflow name
- Task creation works correctly with SDLC stages
- 6 screenshots are taken
- No UI elements reference old "Select Full SDLC" or "✓ Full SDLC Selected" text

## Notes
- This test validates the fix for issue #3 where:
  1. UI label was showing "Select Full SDLC" instead of "SDLC"
  2. Selected state was showing "✓ Full SDLC Selected" instead of "✓ SDLC Selected"
  3. Workflow mapping was potentially generating wrong identifier
- The workflow name can be verified through browser developer tools network tab or console logs
- SDLC stages are defined as: ['plan', 'implement', 'test', 'review', 'document']