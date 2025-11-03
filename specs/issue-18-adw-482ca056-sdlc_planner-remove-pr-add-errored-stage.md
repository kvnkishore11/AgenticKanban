# Chore: Remove PR Stage and Add Errored Stage to Kanban UI

## Metadata
issue_number: `18`
adw_id: `482ca056`
issue_json: `{"number":18,"title":"feel free to remove the PR stage in the ui kanba","body":"feel free to remove the PR stage in the ui kanba. lets add Errored stage just after Document stage before the Ready to Merge stage.\n\nwhen we create the ticket input modal, you can remove the PR stage from the queued stages"}`

## Chore Description
This chore involves updating the Kanban board UI to remove the PR (Pull Request) stage and add an Errored stage in its place. The changes include:

1. Removing the PR stage from the Kanban board display
2. Adding an Errored stage positioned after the Document stage and before Ready to Merge
3. Updating the ticket creation modal (TaskInput) to remove PR from the available queued stages
4. Ensuring all stage-related constants, utilities, and services reflect these changes
5. Maintaining backward compatibility with existing tasks that may reference the PR stage

## Relevant Files
Use these files to resolve the chore:

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/constants/workItems.js`** - Contains QUEUEABLE_STAGES array that defines which stages appear in the ticket creation modal. Remove PR stage from this array.

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/stores/kanbanStore.js`** - Central state management for Kanban operations. The `stages` array already includes the Errored stage but needs PR stage removed. Update stage ordering to place Errored after Document.

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/kanban/KanbanBoard.jsx`** - Main Kanban board component. Update stage rendering logic to exclude PR and include Errored in the correct position. Update stage icon mapping (remove GitPullRequest icon for PR, ensure Errored has AlertTriangle icon).

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/forms/TaskInput.jsx`** - Ticket creation modal. Remove PR from stage selection checkboxes and update UI to reflect new stage options.

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/utils/substages.js`** - Defines substages for each main stage. Remove PR stage substages (create → review → merge) and ensure Errored stage substages (identify → debug → resolve) are properly defined.

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/services/api/adwService.js`** - Pipeline and workflow configuration management. Update default pipelines to remove PR stage references and ensure Errored stage is handled appropriately.

- **`/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/services/websocket/stageProgressionService.js`** - Manages automatic task progression through stages. Update progression logic to skip PR stage and handle transitions to Errored stage correctly.

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update Stage Constants and Definitions
- Remove the PR stage from the QUEUEABLE_STAGES array in `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/constants/workItems.js`
- Verify the PR stage entry is completely removed: `{ id: 'pr', name: 'PR', color: 'pink' }`
- Ensure the QUEUEABLE_STAGES array maintains proper ordering with Document as the last stage

### 2. Update Kanban Store Stage Configuration
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/stores/kanbanStore.js`, update the `stages` array
- Remove the PR stage entry: `{ id: 'pr', name: 'PR', color: 'pink' }`
- Verify the Errored stage is positioned after Document stage in the array
- Expected stage order: backlog → plan → build → test → review → document → errored
- Update any methods that reference 'pr' stage to handle its removal gracefully

### 3. Update Substages Utility
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/utils/substages.js`, remove the PR stage substages definition
- Remove the `pr` key from the substages object (substages: create → review → merge)
- Verify the Errored stage substages are properly defined (identify → debug → resolve)
- Ensure `getSubstages()` and related functions handle the removal of PR stage

### 4. Update KanbanBoard Component
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/kanban/KanbanBoard.jsx`, update stage rendering
- Remove GitPullRequest icon import if it's only used for PR stage
- Update the stage icon mapping to remove the PR stage entry
- Ensure Errored stage displays with AlertTriangle icon
- Verify stage groups render correctly: Backlog | Plan/Build/Test/Review/Document | Errored
- Update any conditional logic that specifically checks for PR stage

### 5. Update TaskInput Component (Ticket Creation Modal)
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/forms/TaskInput.jsx`, update stage selection UI
- Remove PR stage from the queued stages checkboxes/selection interface
- Verify the component correctly displays only the remaining QUEUEABLE_STAGES
- Update default queuedStages if it includes 'pr' (current default appears to be ['plan', 'implement'])
- Ensure pipeline name generation excludes PR stage references

### 6. Update ADW Service Pipelines
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/services/api/adwService.js`, update default pipeline configurations
- Remove 'pr' from all pipeline stage arrays:
  - Full Stack Development: plan → build → test → review → document → ~~pr~~
  - Frontend Only: plan → build → test → review → ~~pr~~
  - Backend Only: plan → build → test → review → document → ~~pr~~
  - Hotfix: build → test → ~~pr~~
  - Code Refactoring: plan → build → test → review → ~~pr~~
- Ensure pipelines end at Document stage or other appropriate final stage
- Update any pipeline-related logic that expects PR as a terminal stage

### 7. Update Stage Progression Service
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/services/websocket/stageProgressionService.js`, update progression logic
- Remove any specific handling for PR stage in progression methods
- Ensure `checkProgression()` method doesn't attempt to advance to PR stage
- Update error handling to properly transition tasks to Errored stage
- Verify `forceAdvanceToStage()` and `recoverFromError()` work correctly without PR stage
- Ensure the service correctly identifies Document as a potential final stage

### 8. Update KanbanCard Component
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/kanban/KanbanCard.jsx`, update stage references
- Verify `getNextStage()` function doesn't return PR as a next stage option
- Ensure manual stage progression controls don't offer PR as a destination
- Update any conditional rendering that checks for PR stage

### 9. Update StageProgressionViewer Component
- In `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/components/kanban/StageProgressionViewer.jsx`, update stage visualization
- Remove PR stage from stage timeline rendering
- Ensure Errored stage displays correctly with appropriate color (red) and visual indicators
- Update progress calculations to exclude PR from total stage count

### 10. Verify WebSocket Service Compatibility
- Review `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/482ca056/src/services/websocket/websocketService.js`
- Ensure stage transition event parsing doesn't break when PR stage is removed
- Verify auto-transition detection handles the absence of PR stage
- Confirm the service correctly routes tasks to Errored stage on workflow failures

### 11. Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any errors or warnings that appear during validation
- Verify the application starts correctly and displays the updated Kanban board
- Test creating a new task and verify PR is not in the queued stages options
- Manually test stage progression to confirm smooth transitions without PR stage

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run lint` - Run ESLint to check for code quality issues
- `npm run build` - Build the client application to ensure no build errors
- `npm run dev` - Start the development server to manually verify UI changes

## Notes
- The Errored stage already exists in the kanbanStore stages array (added as part of branch chore-issue-18-adw-482ca056-remove-pr-add-errored-stage), so the main focus is removing PR stage references
- Ensure backward compatibility: existing tasks with `stage: 'pr'` or `queuedStages` containing 'pr' should not break the application
- Consider adding migration logic or fallback handling if tasks in the database reference the PR stage
- The stage order should logically flow: backlog → plan → build → test → review → document → errored
- Errored stage should be visually distinct (red color, AlertTriangle icon) to clearly indicate tasks requiring attention
- Document stage becomes the implied final stage for successful task completion, while Errored handles failures
- Test the ticket creation modal thoroughly to ensure the PR checkbox is removed and UI remains clean
