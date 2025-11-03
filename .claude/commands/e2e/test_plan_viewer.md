# E2E Test: Plan Viewer Functionality

Test the plan viewing functionality in the Kanban board application for ADW workflows.

## User Story

As a user viewing a Kanban card with an ADW workflow
I want to view the associated plan file
So that I can understand the workflow steps and implementation details

## Test Steps

1. Navigate to the Kanban board at `Application URL`
2. Take a screenshot of the initial Kanban board state
3. **Verify** the Kanban board is visible with stages
4. Find a card with ADW metadata (look for cards with "ADW ID" displayed)
5. Click on a card with ADW metadata to expand it
6. **Verify** the card expands and shows detailed information
7. **Verify** ADW metadata section is visible with:
   - ADW ID displayed
   - Status information
   - Logs path
8. Take a screenshot of the expanded card with ADW metadata
9. **Verify** "View Plan" button is present in the ADW metadata section
10. Click the "View Plan" button
11. **Verify** plan modal opens and displays
12. **Verify** modal header shows "Plan: {ADW_ID}"
13. **Verify** plan content is displayed with markdown rendering
14. **Verify** copy button is present in the modal header
15. **Verify** close button (X) is present in the modal header
16. Take a screenshot of the plan modal with content
17. Click the close button (X)
18. **Verify** modal closes and is no longer visible
19. Click on the same card again to re-expand it
20. Click "View Plan" button again
21. **Verify** modal opens again
22. Click outside the modal (on the backdrop)
23. **Verify** modal closes when clicking outside
24. Take a screenshot after modal closes

## Success Criteria

- Kanban board loads successfully
- Card with ADW metadata can be found and expanded
- ADW metadata section displays ADW ID, status, and logs path
- "View Plan" button is visible and clickable
- Plan modal opens when button is clicked
- Modal displays plan content with proper markdown rendering
- Modal has copy and close buttons
- Close button (X) successfully closes the modal
- Clicking outside the modal closes it
- 3 screenshots are captured at key points

## Notes

- If no cards with ADW metadata are found, the test should note this and mark as inconclusive
- Plan content should be rendered as markdown, not plain text
- Modal should appear centered on screen with overlay backdrop
- Modal should have proper z-index to appear above other UI elements
