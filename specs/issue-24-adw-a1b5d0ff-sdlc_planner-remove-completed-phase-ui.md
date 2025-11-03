# Chore: Remove the Completed Phase from the Kanban UI

## Metadata
issue_number: `24`
adw_id: `a1b5d0ff`
issue_json: `{"number":24,"title":"Remove the Completed Phase from teh Kanban UI","body":"Remove the Completed Phase from teh Kanban UI. May in in teh ehader before after the settins cta we can have Completed Cta. When we click on completed cta we can have all the cards that are finished."}`

## Chore Description
Currently, the Kanban board displays 8 stages (Backlog, Plan, Build, Test, Review, Document, PR, Errored) but does not have a dedicated "Completed" phase where finished tasks are displayed. The requirement is to:

1. Remove any existing "Completed" phase from the main Kanban board view (if it exists - current analysis shows there is NO completed phase in the board)
2. Add a new "Completed" button/CTA in the header area (near the Settings button)
3. When the "Completed" button is clicked, display a modal or separate view showing all completed tasks (tasks that have reached 100% progress and completed all their stages)
4. The completed view should show cards in a similar format to the Kanban board, allowing users to review finished work

This change will declutter the main Kanban board by hiding completed tasks while still providing easy access to view them when needed.

## Relevant Files
Use these files to resolve the chore:

### Existing Files to Modify

- **src/App.jsx** (lines 1-188)
  - Main application component containing the header layout
  - Add new "Completed" button in the header next to Settings button (around line 100-112)
  - Add state management for showing/hiding the completed tasks view
  - Render the new CompletedTasksModal component

- **src/components/kanban/KanbanBoard.jsx** (lines 1-310)
  - Currently displays all 8 stages without a "Completed" phase
  - No changes needed to stage display logic since there's already no "Completed" phase
  - May need to verify tasks are properly filtered to exclude completed tasks from regular stages

- **src/stores/kanbanStore.js** (lines 1-100+)
  - Central Zustand store managing Kanban state
  - Currently defines 8 stages (no "Completed" phase exists)
  - Add a selector/getter function to retrieve all completed tasks
  - Define logic to determine when a task is "completed" (e.g., progress === 100, stage === 'pr', all substages completed)
  - Add state for showing/hiding the completed tasks view

- **src/styles/kanban.css** (lines 1-100+)
  - Contains Kanban board styling and grid layout
  - May need to add styles for the completed tasks modal/view
  - Ensure completed tasks display properly in modal format

- **src/index.css** (lines 1-52)
  - Global styles including button classes
  - May need to add styles for the new "Completed" button if not using existing btn-primary/btn-secondary classes

### New Files

- **src/components/kanban/CompletedTasksModal.jsx**
  - New modal component to display all completed tasks
  - Takes isOpen and onClose props from App.jsx
  - Fetches completed tasks from kanbanStore
  - Displays tasks in a grid or list format similar to Kanban board
  - Shows task details: title, ID, pipeline name, completion date/time
  - Allows closing the modal to return to main Kanban view
  - May include filtering/search functionality for completed tasks

- **src/components/kanban/CompletedTaskCard.jsx** (optional)
  - Simplified card component for displaying completed tasks
  - Similar to KanbanCard but optimized for read-only completed task display
  - Shows completion status, final stage, and summary information
  - May reuse existing KanbanCard component with a "completed" mode flag

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update Kanban Store with Completed Tasks Logic
- Open `src/stores/kanbanStore.js`
- Add a new state property: `showCompletedTasks: false` in initialState
- Create a selector function `getCompletedTasks()` that filters and returns all tasks where:
  - `progress === 100` OR
  - All substages are marked as completed OR
  - Task has reached the final stage ('pr') and is marked complete
- Add action `toggleCompletedTasksView()` to toggle the `showCompletedTasks` state
- Verify the `getTasksByStage()` function doesn't return completed tasks in regular stages (optional filter)

### 2. Create CompletedTasksModal Component
- Create new file `src/components/kanban/CompletedTasksModal.jsx`
- Import necessary dependencies: React, useKanbanStore, Lucide icons (X for close button, CheckCircle for completed status)
- Accept props: `isOpen` (boolean), `onClose` (function)
- Use `useKanbanStore` to get `getCompletedTasks()` selector
- Render a modal overlay with:
  - Header with "Completed Tasks" title and close button
  - Count of completed tasks
  - Grid layout displaying completed tasks (similar to Kanban board grid)
  - Empty state message if no completed tasks exist
- Display tasks using existing KanbanCard component or create simplified version
- Add modal backdrop click to close functionality
- Style with Tailwind classes matching existing modal patterns (reference TaskEditModal or SettingsModal)

### 3. Add Completed Button to App Header
- Open `src/App.jsx`
- Import the new CompletedTasksModal component
- Import CheckCircle icon from lucide-react for the Completed button
- Add state: `const [showCompletedTasks, setShowCompletedTasks] = useState(false)`
- In the header section (around line 100-112), add a new button after the "Commands" button and before the "Settings" button:
  - Button with CheckCircle icon
  - Label: "Completed"
  - onClick handler: `() => setShowCompletedTasks(true)`
  - Style similar to existing header buttons with btn-secondary class
  - Show only when `selectedProject` is truthy (same condition as New Task and Commands buttons)
- Render CompletedTasksModal at the bottom of the component (after SettingsModal around line 172):
  ```jsx
  <CompletedTasksModal
    isOpen={showCompletedTasks}
    onClose={() => setShowCompletedTasks(false)}
  />
  ```

### 4. Add Styling for Completed Tasks View
- Open `src/styles/kanban.css`
- Add CSS classes for completed tasks modal if needed:
  - `.completed-tasks-modal` - modal container styling
  - `.completed-tasks-grid` - grid layout for completed tasks (similar to kanban-board-grid)
  - `.completed-task-card` - card styling for completed tasks
- Ensure responsive design for completed tasks modal on mobile, tablet, and desktop
- Add animations for modal open/close transitions

### 5. Verify No "Completed" Phase Exists in Kanban Board
- Open `src/components/kanban/KanbanBoard.jsx`
- Verify that the stages array does not include any "Completed" or "Done" phase (current analysis confirms this is already the case)
- Ensure stage rendering logic only displays the 8 defined stages (Backlog, Plan, Build, Test, Review, Document, PR, Errored)
- No changes needed unless a "Completed" phase was added during development

### 6. Run Validation Commands
- Start the development server to test the changes
- Verify the UI renders correctly with the new Completed button
- Test clicking the Completed button opens the modal
- Test closing the modal works correctly
- Verify completed tasks are displayed in the modal
- Test responsive design on different screen sizes
- Run all validation commands listed below to ensure zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd app/client && npm run build` - Build the client to ensure no build errors
- `cd app/client && npm run lint` - Lint the client code to ensure code quality
- Manual testing:
  1. Start server: `cd app/server && ./start_server.sh`
  2. Start client: `cd app/client && npm run dev`
  3. Open browser to client URL
  4. Select a project
  5. Verify Completed button appears in header next to Settings
  6. Click Completed button and verify modal opens
  7. Verify completed tasks are displayed (or empty state if no completed tasks)
  8. Verify modal can be closed
  9. Verify main Kanban board still displays all active tasks correctly
  10. Test responsive design on mobile viewport

## Notes
- The current Kanban board does NOT have a "Completed" phase - tasks complete within their final stage (PR)
- Tasks are considered "completed" when they reach 100% progress, all substages are marked complete, or they've successfully completed the PR stage
- The CompletedTasksModal should provide a clean, organized view of historical completed work
- Consider adding a timestamp field to track when tasks were completed (may require backend changes)
- The Completed button should have a badge indicator showing the count of completed tasks (enhancement for future)
- Ensure the modal is accessible (keyboard navigation, screen reader support)
- Consider adding filters in the completed tasks view (by type, by date, by pipeline) as future enhancements
