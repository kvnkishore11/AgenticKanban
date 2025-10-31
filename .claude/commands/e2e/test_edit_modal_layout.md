# E2E Test: Edit Modal Layout and SDLC Grouping

Test edit modal overlay functionality and SDLC stage grouping in the Agentic Kanban application.

## User Story

As a user of the Agentic Kanban board
I want to edit cards with a proper modal overlay and see SDLC stages grouped together
So that I have a consistent editing experience and better visual organization of my workflow stages

## Test Steps

### Part 1: Test Edit Modal Overlay

1. Navigate to the `Application URL`
2. Take a screenshot of the initial board state
3. **Verify** the Kanban board is displayed with multiple stages
4. **Verify** at least one card is visible on the board

5. Click the three-dot menu on any Kanban card
6. **Verify** the dropdown menu appears with "Edit" option
7. Click the "Edit" option
8. Take a screenshot immediately after clicking Edit

9. **Verify** the edit modal appears as a full-screen overlay:
   - Modal has a dark backdrop covering the entire screen
   - Modal is centered on the screen
   - Modal has higher z-index than all other elements
   - Modal is NOT contained within the card's boundaries

10. **Verify** all edit form fields are accessible and visible:
    - Title input field
    - Description textarea
    - Stage selector
    - Save and Cancel buttons

11. Take a screenshot of the edit modal overlay
12. Press Escape key or click outside the modal
13. **Verify** the modal closes and returns to the board view

### Part 2: Test SDLC Stage Grouping

14. **Verify** SDLC stages appear grouped together:
    - Plan stage
    - Build stage
    - Test stage
    - Review stage
    - Document stage

15. **Verify** a visual separator appears after the SDLC stages

16. **Verify** other stages appear after the separator:
    - Backlog stage
    - PR stage
    - Errored stage

17. Take a screenshot of the stage grouping layout

### Part 3: Test Card Movement Between Groups

18. Drag a card from an SDLC stage to a non-SDLC stage
19. **Verify** the card moves successfully across the separator
20. Drag the card back to an SDLC stage
21. **Verify** the card returns successfully

## Success Criteria

### Edit Modal
- Edit modal opens as a full-screen overlay, not within the card
- Modal has proper backdrop and z-index
- Modal can be closed with Escape key or clicking outside
- All form fields are functional and accessible

### SDLC Grouping
- SDLC stages (Plan, Build, Test, Review, Document) are displayed together
- A clear visual separator appears between SDLC and other stages
- Other stages (Backlog, PR, Errored) appear after the separator
- Cards can be moved freely between all stages

### Screenshots Captured
- Initial board state
- Edit modal click moment
- Edit modal overlay display
- SDLC stage grouping with separator

## Edge Cases to Test

- Opening edit modal on cards with long descriptions
- Opening edit modal on cards with images
- Attempting to open multiple edit modals (should be prevented)
- Testing responsive layout on narrow screens
- Moving cards rapidly across the SDLC separator