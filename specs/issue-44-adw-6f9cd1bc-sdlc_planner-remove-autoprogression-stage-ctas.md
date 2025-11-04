# Chore: Remove Autoprogression and Stage Movement CTAs

## Metadata
issue_number: `44`
adw_id: `6f9cd1bc`
issue_json: `{"number":44,"title":"I dont need autoprogression and stage movement cta...","body":"I dont need autoprogression and stage movement ctas. feel free to remove them\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/b41eddab-f0bc-486e-8e89-be99cb56e334)\n\n"}`

## Chore Description
Remove all autoprogression controls and stage movement call-to-action (CTA) buttons from the Kanban card UI components. This includes:

1. **Autoprogression Controls**: The "Start Auto-Progression", "Pause", "Resume", and "Stop" buttons that allow automatic task progression through workflow stages
2. **Stage Movement CTAs**: The "Move to [Next Stage]" buttons that allow manual movement of tasks between stages

These features add unnecessary complexity to the UI and are not needed for the current workflow. The removal will simplify the card interface while maintaining core functionality like workflow triggers, logs viewing, and task editing.

## Relevant Files
Use these files to resolve the chore:

### Files to Modify

- **src/components/kanban/KanbanCard.jsx**
  - Contains the main card component with autoprogression status indicators
  - Has "Move to Next Stage" button in the dropdown menu (lines 279-291)
  - Shows autoprogression status via CSS classes and icons
  - Needs removal of stage movement CTA from menu

- **src/components/kanban/CardExpandModal.jsx**
  - Contains the expanded modal view with comprehensive autoprogression controls
  - Has "Automatic Progression" section with Start/Pause/Resume/Stop buttons (lines 530-584)
  - Has "Stage Movement" section with "Move to [Next Stage]" button (lines 586-598)
  - Imports autoprogression-related store functions (lines 38-41)
  - Both sections need complete removal

- **src/components/kanban/TaskDetailsModal.jsx**
  - Contains the task details modal with autoprogression controls
  - Has "Automatic Progression" section with Start/Pause/Resume/Stop buttons (lines 294-367)
  - Has "Move to [Next Stage]" button in Quick Actions section (lines 540-551)
  - Imports autoprogression-related store functions (lines 36-39)
  - Both sections need complete removal

- **src/stores/kanbanStore.js**
  - Contains autoprogression state management functions
  - Functions to remove/deprecate: `startTaskProgression`, `stopTaskProgression`, `pauseTaskProgression`, `resumeTaskProgression`, `getTaskProgressionStatus`
  - Functions to remove/deprecate: `moveTaskToStage`, `getNextStage`
  - These functions may be called from the components, so we need to ensure they're safely removed or deprecated

- **src/styles/kanban.css**
  - May contain CSS classes for autoprogression styling (e.g., `.auto-progress`)
  - Need to identify and optionally remove unused autoprogression-related CSS

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove Autoprogression and Stage Movement UI from KanbanCard
- Open `src/components/kanban/KanbanCard.jsx`
- Remove the "Move to Next Stage" button from the dropdown menu (lines 279-291)
- Remove or simplify the autoprogression status indicators and CSS classes that reference autoprogression
- Remove unused imports related to autoprogression (if any)
- Remove the `getNextStage()` function call and related logic
- Verify the card still renders correctly without these features

### Step 2: Remove Autoprogression and Stage Movement UI from CardExpandModal
- Open `src/components/kanban/CardExpandModal.jsx`
- Remove the entire "Automatic Progression" section (lines 529-584) including:
  - Section header
  - Start/Pause/Resume/Stop buttons
  - Auto-progression status display
  - Recover from Error button
- Remove the entire "Stage Movement" section (lines 586-598)
- Remove unused imports: `startTaskProgression`, `stopTaskProgression`, `pauseTaskProgression`, `resumeTaskProgression`, `recoverTaskFromError`
- Remove the `getNextStage()` function and `handleMoveToNextStage()` function
- Clean up the Actions section layout after removing these controls
- Verify the modal still renders correctly without these features

### Step 3: Remove Autoprogression and Stage Movement UI from TaskDetailsModal
- Open `src/components/kanban/TaskDetailsModal.jsx`
- Remove the entire "Automatic Progression" section (lines 294-367) including:
  - Section header
  - Start/Pause/Resume/Stop buttons
  - Auto-progression status display
  - Recover from Error button
- Remove the "Move to Next Stage" button from Quick Actions section (lines 540-551)
- Remove unused imports: `startTaskProgression`, `stopTaskProgression`, `pauseTaskProgression`, `resumeTaskProgression`, `recoverTaskFromError`, `ArrowRight` icon
- Remove the `getNextStage()` function and `handleMoveToNextStage()` function
- Clean up the Quick Actions section layout after removing the stage movement button
- Verify the modal still renders correctly without these features

### Step 4: Review and Update Kanban Store (Optional Cleanup)
- Open `src/stores/kanbanStore.js`
- Review the autoprogression-related functions that are no longer used:
  - `startTaskProgression`, `stopTaskProgression`, `pauseTaskProgression`, `resumeTaskProgression`
  - `getTaskProgressionStatus`
  - `moveTaskToStage` (if only used by the removed CTAs)
  - `recoverTaskFromError`
- Add deprecation comments or consider removing these functions if they're not used elsewhere
- Ensure no other components depend on these functions before removing

### Step 5: Clean Up CSS Styles (Optional)
- Open `src/styles/kanban.css`
- Search for autoprogression-related CSS classes (e.g., `.auto-progress`)
- Remove or comment out unused autoprogression CSS styles
- Verify the cards still render with proper styling

### Step 6: Run Validation Commands
- Execute all validation commands to ensure the chore is complete with zero regressions
- Verify the UI renders correctly without autoprogression and stage movement CTAs
- Ensure all other card functionality (workflow triggers, logs, editing) still works

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Ensure TypeScript/JSX type checking passes
- `npm run lint` - Ensure code linting passes
- `npm run build` - Ensure the frontend builds successfully
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The removal of these features should not affect core workflow functionality like triggering workflows, viewing logs, or editing tasks
- The kanban store functions may still be called from other parts of the application - verify dependencies before complete removal
- Consider leaving the store functions intact with deprecation warnings if unsure about other dependencies
- The UI should be cleaner and simpler after removing these controls
- Focus on maintaining the essential features: workflow triggers, log viewing, plan viewing, and task editing
