# Chore: Hook "Start Immediately" to Trigger Workflow on Task Creation

## Metadata
issue_number: `6`
adw_id: `cd484dfc`
issue_json: `{"number":6,"title":"when i click on start immediately while creation i...","body":"when i click on start immediately while creation it should directly trigger as well. it should not be placed in backlogs column. this functinality has to be hooked.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/98332c67-c392-4785-98db-1adbcf7fec5d)\n\n"}`

## Chore Description
Currently, the "Start Immediately" button exists in the task creation modal (TaskInput.jsx) but is not connected to any backend functionality. When a user clicks "Start Immediately" during task creation:
- The UI shows the button as active (green)
- A toast notification appears saying "Will start immediately"
- **BUT**: The task is still placed in the backlog column
- **BUT**: No workflow is triggered

This chore implements the missing functionality to:
1. Pass the `startImmediately` flag from the frontend to the backend
2. Automatically trigger the appropriate workflow when `startImmediately` is true
3. Move the task directly to the first workflow stage instead of placing it in backlog
4. Ensure the workflow starts executing immediately after task creation

## Relevant Files
Use these files to resolve the chore:

**Frontend:**
- `src/components/forms/TaskInput.jsx` (lines 52, 240-284, 541-556)
  - Contains the "Start Immediately" button UI component
  - Contains the `handleSubmit` function that creates task data
  - Currently does NOT pass `startImmediately` flag to backend
  - **Modification needed**: Add `startImmediately` to the `taskData` object in `handleSubmit`

**Backend/Store:**
- `src/stores/kanbanStore.js` (lines 504-604, 1288-1385)
  - Contains the `createTask` function that processes new tasks
  - Currently places all new tasks in 'backlog' stage
  - Contains the `triggerWorkflowForTask` function that handles workflow triggering
  - **Modification needed**: Check `startImmediately` flag after task creation and call `triggerWorkflowForTask` if true

**Service Layer:**
- `src/services/websocketService.js`
  - Contains `getWorkflowTypeForStage` to determine appropriate workflow type
  - Contains `getModelSetForWorkItem` to determine model set based on work item type
  - Used by `triggerWorkflowForTask` to set up workflow configuration
  - **No modifications needed**: Existing functions will be called by kanbanStore.js

### New Files
No new files need to be created. All modifications are to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Pass `startImmediately` Flag from Frontend to Backend
- Open `src/components/forms/TaskInput.jsx`
- Locate the `handleSubmit` function (around line 240)
- Find the `taskData` object construction (lines 243-253)
- Add `startImmediately: startImmediately` to the `taskData` object
- This ensures the flag is passed to the backend `createTask` function
- Verify that the `startImmediately` state variable is already defined (line 52)

### Step 2: Implement Workflow Auto-Trigger in `createTask`
- Open `src/stores/kanbanStore.js`
- Locate the `createTask` function (lines 504-604)
- Find the section after `get().sendProjectNotification(newTask)` (around line 567)
- Add logic to check if `taskData.startImmediately` is true
- If true AND `taskData.queuedStages` exists with stages:
  - Use a `setTimeout` with 100ms delay to call `get().triggerWorkflowForTask(newTask.id)` asynchronously
  - Pass minimal options object (the function auto-determines workflow type and model set)
  - Wrap in try-catch to handle errors gracefully without blocking task creation
  - Log any errors to console for debugging
- The existing `triggerWorkflowForTask` function will:
  - Determine the appropriate workflow type from queued stages
  - Move the task from 'backlog' to the first workflow stage
  - Set up ADW configuration
  - Send the workflow trigger request via WebSocket

### Step 3: Verify Existing Infrastructure
- Review `src/stores/kanbanStore.js` lines 1288-1385 to understand `triggerWorkflowForTask`
- Confirm that `triggerWorkflowForTask`:
  - Auto-determines workflow type using `websocketService.getWorkflowTypeForStage`
  - Auto-determines model set using `websocketService.getModelSetForWorkItem`
  - Moves task from 'backlog' to appropriate stage (lines 1330-1331)
  - Sends WebSocket message to trigger workflow
- Review `src/services/websocketService.js` to confirm helper functions exist:
  - `getWorkflowTypeForStage(currentStage, queuedStages)` - maps stages to workflow type
  - `getModelSetForWorkItem(workItemType)` - determines model set
- No modifications needed to these functions - they already provide the required functionality

### Step 4: Test the Implementation Manually
- Start the development servers (WebSocket, backend, frontend)
- Open the application in a browser
- Create a new task with the following steps:
  1. Click "Add Task" button
  2. Fill in task title and description
  3. Select queued stages (e.g., Plan, Build, Test)
  4. Click the "Start Immediately" button (verify it turns green)
  5. Submit the task
- Verify the following behavior:
  - Task is created successfully
  - Task does NOT appear in the 'backlog' column
  - Task appears in the first workflow stage (e.g., 'Planning')
  - Workflow logs start appearing in real-time
  - Stage progression indicator shows active stage
- Test edge cases:
  - Create task WITHOUT clicking "Start Immediately" - should go to backlog
  - Create task with no queued stages - should go to backlog even if "Start Immediately" is clicked
  - Create task with different work item types (Feature, Bug, Chore, Patch)

### Step 5: Run Validation Commands
- Execute all validation commands to ensure no regressions
- Fix any errors or test failures that occur
- Verify TypeScript types are correct
- Verify ESLint passes with no errors

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct with no errors
- `npm run lint` - Verify ESLint passes with no linting errors
- `npm run build` - Verify production build succeeds without errors
- `cd app/server && uv run pytest` - Run server tests to validate no backend regressions

## Notes
- The `startImmediately` flag is purely a frontend state variable that needs to be passed to the backend
- The infrastructure for workflow triggering already exists - we just need to call it conditionally
- Using `setTimeout` with 100ms delay ensures the task is fully created before triggering workflow
- The `triggerWorkflowForTask` function handles all the complexity of:
  - Determining the correct workflow type from queued stages
  - Moving the task to the appropriate starting stage
  - Setting up ADW configuration
  - Triggering the workflow via WebSocket
- Error handling is important - workflow trigger failures should NOT prevent task creation
- The existing `getWorkflowTypeForStage` function in websocketService.js handles the mapping:
  - All SDLC stages selected → `adw_sdlc_iso`
  - Partial stages → dynamic pipeline like `adw_plan_build_test_iso`
- Manual testing is critical because this involves real-time workflow triggering
- Consider adding a visual indicator (toast notification) when workflow auto-triggers successfully
