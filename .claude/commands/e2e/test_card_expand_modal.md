# E2E Test: Card Expand Modal

Test that the card expand modal displays correctly as a full-screen overlay (not within the card itself) when a Kanban card is clicked.

## User Story

As a user
I want to click on a Kanban card to view detailed information
So that the card details open in a proper full-screen modal overlay

## Test Steps

1. Navigate to the `Application URL`
2. Take a screenshot of the initial Kanban board state
3. **Verify** the page is loaded and displays the Kanban board
4. **Verify** at least one Kanban card is visible on the board

5. Locate the first visible Kanban card element
6. Take a screenshot of the card before expanding
7. Click on the Kanban card to expand it

8. **Verify** the modal overlay is visible (backdrop covering the screen)
9. **Verify** the modal is displayed as a full-screen overlay (not within the card)
10. **Verify** the modal has the correct dimensions (approximately 70vw x 90vh)
11. **Verify** the modal backdrop is visible and covers the entire screen
12. Take a screenshot of the expanded modal

13. **Verify** the modal contains the following sections:
    - Header with card title and close button
    - Card Information section
    - Workflow Status section (if workflow data exists)
    - Workflow Logs section
    - Actions section with workflow controls

14. **Verify** the modal header displays the card title
15. **Verify** the close button (X icon) is visible in the header
16. Take a screenshot of the modal content

17. Click the close button (X icon) to close the modal
18. **Verify** the modal is no longer visible
19. **Verify** the backdrop is removed
20. Take a screenshot showing the modal is closed

21. Click on the same Kanban card again to re-open the modal
22. **Verify** the modal opens again as expected
23. Take a screenshot of the re-opened modal

24. Press the Escape key to close the modal
25. **Verify** the modal closes when Escape key is pressed
26. Take a screenshot confirming the modal closed via Escape key

27. Click on the card again to re-open the modal one more time
28. Click on the backdrop (outside the modal container) to close it
29. **Verify** the modal closes when clicking the backdrop
30. Take a screenshot confirming the modal closed via backdrop click

## Success Criteria
- Kanban board loads successfully with visible cards
- Card can be clicked to expand
- Modal opens as a full-screen overlay with backdrop (NOT within the card)
- Modal displays with correct dimensions (70vw x 90vh)
- Modal backdrop covers the entire screen
- Modal displays all expected sections: header, card info, workflow status, logs, actions
- Close button (X icon) closes the modal
- Escape key closes the modal
- Clicking the backdrop closes the modal
- Modal can be opened and closed multiple times
- 7 screenshots are taken showing the bug is fixed
