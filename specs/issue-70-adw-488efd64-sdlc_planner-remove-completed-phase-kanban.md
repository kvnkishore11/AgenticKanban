# Chore: Remove "Completed" Phase from Kanban Board UI

## Metadata
issue_number: `70`
adw_id: `488efd64`
issue_json: `{"number":70,"title":"the complete phase is preent in kanban board ui","body":"the complete phase is preent in kanban board ui. ideally this should not be. we had removed it and placed it in a tab on the navbar which can give access to all completed tickets. try to ensure it is gone.\ngoal: is to have all phases till read to merge in one single row. dual rows disturb the ux. right now if completed is present it is wrapping into 2nd row which is not good."}`

## Chore Description
The "Completed" phase is currently displayed as a column in the Kanban board UI, which causes the board to wrap into two rows and disrupts the user experience. The completed tasks functionality has already been implemented in a separate modal accessible via a "Completed" button in the navbar. The goal is to remove the "Completed" phase column from the Kanban board so all phases from "Backlog" to "Ready to Merge" fit in a single row.

**Current behavior:**
- The Kanban board displays 9 stages: Backlog, Plan, Build, Test, Review, Document, Ready to Merge, Completed, and Errored
- This causes the board to wrap into multiple rows on typical screen sizes
- Completed tasks have their own dedicated modal accessible from the navbar

**Expected behavior:**
- Remove the "Completed" stage column from the Kanban board
- Display only 8 stages: Backlog, Plan, Build, Test, Review, Document, Ready to Merge, and Errored
- All stages should fit in a single row for better UX
- Completed tasks remain accessible via the "Completed" button in the navbar (App.jsx:102-108)

## Relevant Files
Use these files to resolve the chore:

- **src/stores/kanbanStore.js** (lines 78-88)
  - Contains the `stages` array in `initialState` that defines all Kanban board stages
  - Line 86 defines the "Completed" stage: `{ id: 'completed', name: 'Completed', color: 'emerald' }`
  - This stage definition needs to be removed from the stages array
  - The store also contains logic for handling completed tasks via `getCompletedTasks()` method which should remain unchanged

- **src/components/kanban/KanbanBoard.jsx** (lines 89-93)
  - Contains logic for filtering and grouping stages to display
  - Line 90: `const sdlcStageIds = ['plan', 'build', 'test', 'review', 'document', 'errored'];`
  - Line 92: `const sdlcStages = stages.filter(stage => sdlcStageIds.includes(stage.id));`
  - Line 93: `const otherStages = stages.filter(stage => !sdlcStageIds.includes(stage.id) && stage.id !== 'backlog');`
  - The filtering logic should be reviewed to ensure "completed" stage is properly excluded after removal from the stages array
  - Note: The board also has a `ready-to-merge` stage that should be included in the display

- **src/styles/kanban.css** (lines 29-38)
  - Line 31: `.kanban-board-grid { grid-template-columns: repeat(8, minmax(220px, 1fr)); }`
  - Already configured for 8 columns, which matches the expected result after removing the "Completed" stage
  - No changes required to CSS as it's already set up correctly

- **src/components/kanban/CompletedTasksModal.jsx**
  - Modal component that displays completed tasks separately
  - Already implemented and functional
  - No changes required - this is the correct place for viewing completed tasks

- **src/App.jsx** (lines 102-108)
  - Contains the "Completed" button in the navbar that opens the CompletedTasksModal
  - Already implemented and functional
  - No changes required

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove "Completed" Stage from Store Configuration
- Open `src/stores/kanbanStore.js`
- Locate the `initialState` object (around line 68)
- Find the `stages` array within `initialState` (lines 78-88)
- Remove the line defining the "Completed" stage: `{ id: 'completed', name: 'Completed', color: 'emerald' },` (line 86)
- Ensure the stages array now contains only 8 stages: backlog, plan, build, test, review, document, ready-to-merge, and errored
- Verify that the `getCompletedTasks()` method remains unchanged as it determines completed tasks based on progress/status, not stage

### Step 2: Verify Stage Filtering Logic in KanbanBoard Component
- Open `src/components/kanban/KanbanBoard.jsx`
- Review the stage filtering logic (lines 89-93)
- Ensure that the stage filtering correctly handles the removal of the "completed" stage
- Verify that `sdlcStageIds` includes all necessary stages for proper display
- Consider adding 'ready-to-merge' to the `sdlcStageIds` array or ensuring it's properly handled in the rendering logic
- Confirm that the backlog, SDLC stages, and other stages (like ready-to-merge, errored) are all rendered correctly

### Step 3: Update Stage Icons Mapping (if necessary)
- In `src/components/kanban/KanbanBoard.jsx`, check the `stageIcons` object (lines 28-37)
- Verify that all remaining stages have appropriate icons
- Ensure 'ready-to-merge' has the GitMerge icon (line 36)
- No changes should be needed, but verify completeness

### Step 4: Review CSS Grid Configuration
- Open `src/styles/kanban.css`
- Verify that line 31 specifies `grid-template-columns: repeat(8, minmax(220px, 1fr));`
- This is already correct for 8 columns (the expected result after removing "Completed")
- No changes needed, but confirm the configuration is appropriate

### Step 5: Test Completed Tasks Functionality
- Verify that the CompletedTasksModal still works correctly
- Confirm that the "Completed" button in the navbar (App.jsx:102-108) opens the modal
- Ensure that `getCompletedTasks()` in kanbanStore.js still returns the correct tasks based on progress and status
- Verify tasks moved to the "completed" stage before this change are handled gracefully (they should still appear in the completed tasks modal)

### Step 6: Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any type errors or test failures that arise
- Verify the application runs without errors

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards
- `npm run build` - Build the application to ensure no build errors
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The "Completed" stage column is being removed from the Kanban board UI, but the completed tasks functionality remains fully accessible via the dedicated "Completed" button in the navbar
- Tasks that were previously in the "completed" stage should still be accessible via the CompletedTasksModal, which uses the `getCompletedTasks()` method to identify completed tasks based on their progress (100%) or workflow status
- The CSS grid is already configured for 8 columns, which will accommodate the 8 remaining stages perfectly
- After this change, the Kanban board will display: Backlog, Plan, Build, Test, Review, Document, Ready to Merge, and Errored - fitting in a single row for better UX
- The removal of the "Completed" stage from the stages array will automatically prevent it from being rendered since the KanbanBoard component iterates over the stages from the store
- Care should be taken when testing to ensure that tasks can still transition to their final state (ready-to-merge) and that the merge completion workflow (which may move tasks to "completed" stage) is updated to use an appropriate final state
