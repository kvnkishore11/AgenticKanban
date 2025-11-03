# Chore: Remove Completed Phase from Kanban UI Board

## Metadata
issue_number: `27`
adw_id: `5274858f`
issue_json: `{"number":27,"title":"now that we have completed in a tab cta","body":"now that we have completed in a tab cta. we can remove the completed phase in the Kanban UI board."}`

## Chore Description
Now that we have implemented a "Completed" tab with a CTA (Call-to-Action) button in the application header, the "Completed" phase column is no longer needed in the Kanban board UI. This chore involves removing the "completed" stage from the Kanban board display while preserving the completed tasks functionality through the dedicated Completed Tasks Modal that is accessible via the header button.

The application already has a CompletedTasksModal component and a "Completed" button in the header (App.jsx:101-108) that provides access to completed tasks. The completed phase in the kanban board is redundant and should be removed from the UI.

## Relevant Files
Use these files to resolve the chore:

- **src/stores/kanbanStore.js** (line 78-88) - Contains the stages array definition that includes the 'completed' stage. This stage needs to be removed from the stages array initialization.

- **src/components/kanban/KanbanBoard.jsx** (line 76) - Contains the sdlcStageIds array that may reference completed stage logic. The board rendering logic filters and displays stages, so we need to ensure completed stage is not rendered.

- **src/components/kanban/CompletedTasksModal.jsx** - This modal component provides the UI for viewing completed tasks, which is now the primary way users access completed tasks. This file should be reviewed to ensure it continues to work correctly after removing the completed phase.

- **src/App.jsx** (line 101-108) - Contains the "Completed" button in the header that triggers the CompletedTasksModal. This functionality should remain intact as it's the replacement for the completed phase.

- **src/styles/kanban.css** (line 29-51) - Contains Kanban board grid layout CSS that may have references to the completed stage styling. Should be reviewed for any completed-specific styling that can be cleaned up.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove completed stage from kanbanStore stages array
- Open `src/stores/kanbanStore.js`
- Locate the `stages` array in the `initialState` object (around line 78-88)
- Remove the completed stage entry: `{ id: 'completed', name: 'Completed', color: 'green' }`
- The stages array should only contain: backlog, plan, build, test, review, document, ready-to-merge, and errored
- Ensure the array syntax remains valid (proper commas, no trailing commas)

### Step 2: Update KanbanBoard component stage filtering
- Open `src/components/kanban/KanbanBoard.jsx`
- Review the `sdlcStageIds` array (line 76) to ensure it doesn't include 'completed'
- Review the `otherStages` filtering logic (line 79) to ensure completed stage won't be rendered even if it exists
- Verify that the board only renders: backlog, SDLC stages (plan, build, test, review, document, errored), and ready-to-merge
- No code changes should be needed here if the stage is removed from the store

### Step 3: Verify CompletedTasksModal still works correctly
- Open `src/components/kanban/CompletedTasksModal.jsx`
- Review the component to ensure it fetches completed tasks using `getCompletedTasks()` from the store
- Verify that the modal logic doesn't depend on the completed stage existing in the stages array
- The modal should work independently of the stages array since it uses task properties (progress, stage, workflow_status) to determine completion

### Step 4: Verify App.jsx Completed button functionality
- Open `src/App.jsx`
- Review the Completed button implementation (lines 101-108)
- Ensure the button correctly opens the CompletedTasksModal
- Verify that the showCompletedTasks state and modal rendering (lines 185-189) are working correctly
- No changes should be needed here

### Step 5: Clean up any completed stage specific CSS
- Open `src/styles/kanban.css`
- Search for any CSS rules that specifically target `.stage-completed` or similar selectors
- Remove any completed-stage-specific styling if found
- Update grid layout if the column count needs adjustment (though it should be dynamic based on stages)
- Review the kanban-board-grid layout to ensure it still displays properly with one fewer column

### Step 6: Update grid layout column count in CSS
- Review `src/styles/kanban.css` line 29-51 where the kanban-board-grid is defined
- Change `grid-template-columns: repeat(8, minmax(240px, 1fr))` to `repeat(7, minmax(240px, 1fr))` since we're removing one column
- Update all responsive breakpoints to use 7 columns instead of 8:
  - Line 41: Change from `repeat(8, minmax(250px, 1fr))` to `repeat(7, minmax(250px, 1fr))`
  - Line 48: Change from `repeat(8, minmax(220px, 1fr))` to `repeat(7, minmax(220px, 1fr))`

### Step 7: Run validation commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any errors or issues that arise from the changes
- Verify the UI renders correctly without the completed phase
- Confirm that completed tasks are still accessible via the Completed button in the header

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run build` - Build the client application to ensure no build errors from the changes
- `npm run lint` - Run linter to ensure code quality standards are met

## Notes
- The completed stage is being removed from the Kanban board UI, but completed tasks functionality remains intact through the CompletedTasksModal
- Tasks are marked as completed based on their properties (progress === 100 or stage === 'pr' && workflow_status === 'completed') as defined in kanbanStore.js getCompletedTasks() method (lines 663-673)
- The "Ready to Merge" stage serves as the final stage in the kanban board before tasks are considered complete
- The CompletedTasksModal provides a dedicated UI for viewing and managing completed tasks, which is a better UX than having them in a column on the board
- After this change, the kanban board will have 7 columns instead of 8: backlog, plan, build, test, review, document, ready-to-merge, and errored (completed removed)
- The grid layout needs to be updated from 8 columns to 7 columns to maintain proper spacing and visual balance
