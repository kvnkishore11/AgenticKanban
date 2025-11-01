# Chore: Reposition Backlog to First Stage

## Metadata
issue_number: `2`
adw_id: `04564c88`
issue_json: `{"number":2,"title":"Right now the backlog stage was misplaced by this...","body":"Right now the backlog stage was misplaced by this adw. You need to position back to first stage (where it was initially)"}`

## Chore Description
The backlog stage has been misplaced in the kanban board layout. Currently, the backlog stage appears after the SDLC stages (plan, build, test, review, document) due to recent changes in commit `0bbf4ba`. The backlog stage needs to be repositioned back to its original position as the first stage on the kanban board, before all other stages.

The issue is in the `KanbanBoard.jsx` component where stages are being filtered and grouped. The backlog stage is currently being placed in the "otherStages" group which renders after the SDLC stages, when it should be the very first stage displayed.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanBoard.jsx` - The main kanban board component that renders stages. Currently filters stages into SDLC stages and other stages, causing backlog to be misplaced. The backlog stage needs to be explicitly rendered first, before the SDLC stages.

- `src/stores/kanbanStore.js` (lines 33-42) - Contains the stages array definition where backlog is correctly defined as the first stage in the data structure. This file is correct and should not be modified.

- `src/constants/workItems.js` - Contains stage constants and definitions. Verify if any constants reference stage ordering.

- `src/styles/kanban.css` - Contains kanban board styling including the grid layout. May need adjustments if the layout changes affect styling.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Analyze Current Stage Rendering Logic
- Read `src/components/kanban/KanbanBoard.jsx` to understand how stages are currently being filtered and rendered
- Identify where the stage grouping logic splits stages into SDLC and other stages (lines 77-80)
- Understand the current rendering order and why backlog appears after SDLC stages

### 2. Reposition Backlog Stage to First Position
- Modify the stage rendering logic in `src/components/kanban/KanbanBoard.jsx` to explicitly render backlog first
- Separate backlog stage from the otherStages array
- Ensure backlog renders before the SDLC stages group
- Maintain the same visual styling and icon for the backlog stage
- Preserve all existing functionality for the backlog stage (task display, drag-and-drop, etc.)

### 3. Update Stage Ordering Logic
- Ensure the stage grouping logic in `KanbanBoard.jsx` correctly orders stages as:
  1. Backlog (first)
  2. SDLC Stages (plan, build, test, review, document)
  3. Other Stages (pr, errored)
- Verify that the visual layout maintains proper spacing and grid alignment
- Ensure no duplicate rendering of the backlog stage

### 4. Verify Stage Icons and Styling
- Confirm the backlog stage icon (Inbox) is properly displayed
- Verify the gray color scheme for backlog is correctly applied
- Test that the stage header, task count, and add button render correctly for backlog

### 5. Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify the kanban board displays correctly with backlog in the first position
- Test that all stage interactions work properly

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start the development server and manually verify backlog appears first
- `npm run build` - Build the project to ensure no build errors
- `npm run lint` - Run linting to check for code quality issues

## Notes
- The backlog stage data is correctly defined in `kanbanStore.js` as the first element of the stages array, so no changes are needed there
- The issue was introduced in commit `0bbf4ba` where stage grouping logic was added to `KanbanBoard.jsx`
- Focus only on the visual rendering order in the component, not the underlying data structure
- The fix should be a simple reordering of how stages are rendered in the JSX, ensuring backlog renders first
- Maintain backward compatibility with existing task management functionality
- Do not modify the stages array order in `kanbanStore.js` - it is already correct
