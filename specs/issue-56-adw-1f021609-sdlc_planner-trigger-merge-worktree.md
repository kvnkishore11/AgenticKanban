# Chore: Trigger merge_worktree ADW on Merge to Main click

## Metadata
issue_number: `56`
adw_id: `1f021609`
issue_json: `{"number":56,"title":"once the task is ready in ready to merge stage","body":"once the task is ready in ready to merge stage. it shows merge to main. \nUpon clicking that it should trigger soem adw. check if there is some adw that can trigger a custom slash command. if so it should trigger /merge_worktree {adw_id}. It should pass the adw_id as parameter so that the slash command would be triggered. once successful. it should automatically go to completed stage and out of ready to merge stage."}`

## Chore Description

Currently, when a task is in the "Ready to Merge" stage and the user clicks the "Merge to Main" button, it calls `triggerMergeWorkflow` which uses the existing merge API endpoint. The requirement is to instead trigger the `adw_merge_worktree.py` ADW script (which can trigger the `/merge_worktree {adw_id}` slash command) to perform the actual merge operation. Once the merge is successful and completed, the task should automatically transition to a "completed" stage and be removed from the "Ready to Merge" stage.

Key requirements:
1. Modify the merge button click handler to trigger the `adw_merge_worktree` ADW workflow instead of the current merge API
2. Pass the `adw_id` from the task metadata to the ADW workflow
3. The ADW workflow should execute the `/merge_worktree {adw_id}` slash command with the appropriate merge method (default: "squash")
4. Upon successful merge completion, automatically move the task to a "completed" stage
5. Remove the task from the "Ready to Merge" stage visibility

## Relevant Files

Use these files to resolve the chore:

- **src/components/kanban/CardExpandModal.jsx** (lines 113-119) - Contains the `handleMerge` function that is called when "Merge to Main" button is clicked. Currently calls `triggerMergeWorkflow(task.id)`. This needs to be modified to trigger the ADW workflow instead.

- **src/components/kanban/TaskDetailsModal.jsx** (lines 520-528) - Contains another "Merge to Main" button that also needs to be updated to trigger the ADW workflow consistently.

- **src/stores/kanbanStore.js** (lines 1663-1732) - Contains the `triggerMergeWorkflow` function that handles the current merge logic. This function should be modified or a new function should be created to trigger the `adw_merge_worktree` ADW workflow. The function should also handle moving tasks to "completed" stage upon successful merge.

- **src/services/api/adwService.js** - Service layer for ADW API calls. Need to verify if there's an existing method to trigger ADW workflows, or create a new method to trigger the `adw_merge_worktree` workflow with the adw_id parameter.

- **adws/adw_merge_worktree.py** (existing file) - The ADW script that performs the merge worktree operation. This script already exists and can be triggered via the ADW workflow system. It accepts `adw_id` and optional `merge_method` as parameters.

- **.claude/commands/merge_worktree.md** (existing file) - The slash command definition that the ADW can invoke. This already exists and accepts `{adw_id}` and `{merge_method}` parameters.

- **app/server/api/adw_trigger.py** or similar backend endpoint - Need to investigate if there's a backend API endpoint that can trigger ADW workflows dynamically. If not, this may need to be created.

- **src/services/websocket/websocketService.js** - May need to handle WebSocket messages related to merge workflow completion to trigger the stage transition.

### New Files

- **app/server/api/merge_worktree.py** - If needed, create a new backend endpoint to trigger the `adw_merge_worktree` workflow via the ADW trigger system.

## Step by Step Tasks

### Step 1: Investigate ADW Workflow Triggering Mechanism
- Read `src/services/api/adwService.js` to understand existing ADW workflow triggering methods
- Check if there's a generic method to trigger ADW workflows by name (e.g., `triggerAdwWorkflow(workflow_name, params)`)
- Read backend API files in `app/server/api/` to find existing ADW workflow trigger endpoints
- Determine if we need to create a new API endpoint or can use an existing one

### Step 2: Create or Identify Backend API Endpoint for ADW Merge Worktree Trigger
- If no generic ADW workflow trigger endpoint exists, create `app/server/api/merge_worktree.py` that:
  - Accepts `adw_id` as a required parameter
  - Optionally accepts `merge_method` (default: "squash")
  - Calls the ADW trigger system to execute `uv run adw_merge_worktree.py {adw_id} {merge_method}`
  - Returns success/failure status and relevant metadata
- If a generic endpoint exists, document how to use it for the merge_worktree workflow

### Step 3: Update Frontend ADW Service
- Modify `src/services/api/adwService.js` to add a new method:
  - `triggerMergeWorktree(adw_id, merge_method = 'squash')` that calls the backend endpoint
  - Handle response and error cases appropriately
  - Return a promise with success/failure status

### Step 4: Add "Completed" Stage to Kanban Board (if not exists)
- Check `src/stores/kanbanStore.js` for stage definitions
- Verify if "completed" stage exists in the stages array
- If not, add "completed" stage to the board configuration
- Ensure the stage is properly configured with appropriate styling and ordering

### Step 5: Modify Merge Workflow Handler in Store
- Update `src/stores/kanbanStore.js`:
  - Modify `triggerMergeWorkflow` function or create a new `triggerMergeWorktreeWorkflow` function
  - Call the new ADW service method `triggerMergeWorktree(adw_id, merge_method)`
  - On successful trigger, update task metadata to indicate merge is in progress
  - Set up listener or polling to detect when merge completes
  - When merge completes successfully, call `moveTaskToStage(taskId, 'completed')`
  - Handle error cases by updating task with error metadata

### Step 6: Update CardExpandModal Merge Handler
- Modify `src/components/kanban/CardExpandModal.jsx`:
  - Update `handleMerge` function (line 113-119) to:
    - Extract `adw_id` from `task.metadata?.adw_id`
    - Validate that `adw_id` exists
    - Call the updated store method (e.g., `triggerMergeWorktreeWorkflow(task.id)`)
    - Show loading/success/error feedback to user
    - Handle errors gracefully with user-friendly messages

### Step 7: Update TaskDetailsModal Merge Handler
- Modify `src/components/kanban/TaskDetailsModal.jsx`:
  - Update the merge button click handler (line 520-528) to use the same logic as CardExpandModal
  - Ensure consistent behavior between both merge buttons
  - Extract common merge logic into a shared function if needed

### Step 8: Handle Merge Completion via WebSocket
- Check `src/services/websocket/websocketService.js` for existing workflow completion handlers
- Add or update message handler to detect `adw_merge_worktree` workflow completion
- When completion message is received:
  - Extract task ID and merge status from message
  - If successful, call `moveTaskToStage(taskId, 'completed')`
  - Update task metadata with merge completion timestamp and other relevant info

### Step 9: Update Merge Completion Metadata
- Ensure that when merge completes successfully, the task metadata is updated with:
  - `merge_completed: true`
  - `merge_completed_at: timestamp`
  - `merged_branch: branch_name`
  - `merge_method: 'squash'` (or whichever method was used)
- Remove or update the existing `merge_triggered` metadata handling to align with new workflow

### Step 10: Run Validation Commands
- Execute all validation commands listed below to ensure the chore is complete with zero regressions
- Fix any issues that arise during validation
- Ensure all tests pass and the build completes successfully

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `grep -n "triggerMergeWorktree" src/services/api/adwService.js` - Verify new ADW service method exists
- `grep -n "triggerMergeWorktreeWorkflow\|triggerMergeWorkflow" src/stores/kanbanStore.js` - Verify updated store function exists
- `grep -n "handleMerge" src/components/kanban/CardExpandModal.jsx` - Verify CardExpandModal merge handler updated
- `grep -n "handleMerge\|Merge to Main" src/components/kanban/TaskDetailsModal.jsx` - Verify TaskDetailsModal merge handler updated
- `grep -n "completed" src/stores/kanbanStore.js` - Verify "completed" stage exists in store configuration
- `grep -n "adw_merge_worktree" src/services/websocket/websocketService.js` - Verify WebSocket handler for merge completion
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run typecheck` - Ensure TypeScript types are correct
- `npm run build` - Ensure the frontend builds without errors

## Notes

- The `adw_merge_worktree.py` script already exists and handles the actual merge operation, including conflict resolution with Claude Code
- The `/merge_worktree` slash command is already defined in `.claude/commands/merge_worktree.md`
- According to `app_docs/feature-2c334efc-merge-to-main-fix.md`, the "completed" stage was intentionally removed in a previous commit (a464380) to maintain a cleaner 7-stage board. However, the issue description explicitly requests moving tasks to a "completed" stage. This should be discussed with the user or the "completed" stage should be re-added as part of this chore.
- The current implementation keeps merged tasks in "ready-to-merge" stage with a `merge_completed` metadata flag. The new implementation should move them to "completed" stage as requested.
- Need to ensure proper error handling and user feedback throughout the merge workflow
- Consider adding a visual indicator or progress bar while the merge is in progress
- The ADW workflow system may already have a generic trigger mechanism via WebSocket (see `adws/README.md` section on `trigger_websocket.py`) - investigate if this can be leveraged instead of creating a new HTTP endpoint
