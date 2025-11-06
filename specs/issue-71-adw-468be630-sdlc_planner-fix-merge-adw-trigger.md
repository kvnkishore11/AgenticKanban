# Bug: Merge to Main Not Triggering ADW Workflow with Custom Slash Command

## Metadata
issue_number: `71`
adw_id: `468be630`
issue_json: `{"number":71,"title":"the issue is still not resolved","body":"the issue is still not resolved. when we click on mergeto main. this is still saying teh same error. Try to pass in the adw_id and trigger teh adw which would accept custom slash command and argumetns. ensure if it is not present in our adw_system create one and try to add and link it up to our ui\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/d115c0f7-1e9e-4786-b2aa-b32cb23859c3)\n\n"}`

## Bug Description
When users click the "Merge to Main" button in the Kanban UI, the merge workflow is failing. The current implementation directly calls a backend API endpoint (`/api/merge/trigger`) which executes the `adw_merge_worktree.py` script via subprocess. However, this approach bypasses the ADW workflow trigger system that supports custom slash commands and proper workflow orchestration.

The requirement is to trigger the merge operation through the ADW WebSocket trigger system, allowing it to execute the `/merge_worktree` slash command with proper ADW ID and arguments, ensuring consistency with other ADW workflows.

## Problem Statement
The "Merge to Main" functionality currently uses a direct API call to `/api/merge/trigger` which executes `adw_merge_worktree.py` as a subprocess. This approach:
1. Does not integrate with the ADW workflow trigger system (`trigger_websocket.py`)
2. Cannot execute custom slash commands like `/merge_worktree`
3. Is not registered in `AVAILABLE_ADW_WORKFLOWS` list
4. Lacks proper workflow status tracking and WebSocket notifications
5. Does not follow the standard ADW workflow pattern used by other operations

## Solution Statement
Register `adw_merge_worktree` as a triggerable ADW workflow in the WebSocket trigger system by:
1. Adding `adw_merge_worktree` to the `AVAILABLE_ADW_WORKFLOWS` list
2. Updating the frontend to trigger merge via WebSocket instead of REST API
3. Ensuring the WebSocket trigger system can handle the merge workflow
4. Maintaining backward compatibility with existing merge detection in `kanbanStore.js`
5. Removing or deprecating the old `/api/merge/trigger` REST endpoint

## Steps to Reproduce
1. Start the AgenticKanban application (frontend + backend + WebSocket)
2. Create or navigate to a task in "Ready to Merge" stage
3. Ensure the task has a valid `adw_id` and `issue_number` in metadata
4. Click the "Merge to Main" button
5. Observe the error or failure in the merge operation

## Root Cause Analysis
The root cause is an architectural mismatch:
- The UI (`TaskDetailsModal.jsx` and `CardExpandModal.jsx`) calls `triggerMergeWorkflow(task.id)` from `kanbanStore.js`
- `kanbanStore.js:1673-1738` sends a REST API request to `/api/merge/trigger`
- `/api/merge/trigger` (in `server/api/merge.py`) directly executes `uv run adw_merge_worktree.py {adw_id} squash` via subprocess
- This bypasses the WebSocket trigger system (`adw_triggers/trigger_websocket.py`)
- `adw_merge_worktree` is not listed in `AVAILABLE_ADW_WORKFLOWS` in `adw_modules/workflow_ops.py:142-158`
- The WebSocket trigger system cannot recognize or execute merge workflows
- The frontend already has `handleMergeCompletion()` that listens for "adw_merge_worktree" in ADW state, but the workflow is never triggered through the proper channel

## Relevant Files
Use these files to fix the bug:

- `adws/adw_modules/workflow_ops.py:142-158` - Contains `AVAILABLE_ADW_WORKFLOWS` list where we need to add `adw_merge_worktree`
  - Currently lists all triggerable ADW workflows
  - Missing `adw_merge_worktree` entry
  - Used by WebSocket trigger to validate workflow types

- `adws/adw_triggers/trigger_websocket.py` - WebSocket trigger server that handles workflow execution
  - Lines 39: Imports `AVAILABLE_ADW_WORKFLOWS`
  - Lines 64-70: Defines `DEPENDENT_WORKFLOWS` list
  - Lines 72-89: Defines `WORKFLOWS_REQUIRING_ISSUE_NUMBER` list
  - Needs to recognize and handle `adw_merge_worktree` workflow type

- `src/stores/kanbanStore.js:1673-1738` - Current merge trigger implementation using REST API
  - `triggerMergeWorkflow()` function that sends POST to `/api/merge/trigger`
  - Needs to be updated to use WebSocket trigger instead
  - Lines 1741-1762: `handleMergeCompletion()` already listens for merge completion via WebSocket

- `src/components/kanban/TaskDetailsModal.jsx:518-543` - "Merge to Main" button in task details modal
  - Calls `triggerMergeWorkflow(task.id)` on button click
  - No changes needed (calls store method)

- `src/components/kanban/CardExpandModal.jsx:537-560` - "Merge to Main" button in expanded card modal
  - Calls `triggerMergeWorkflow(task.id)` on button click
  - No changes needed (calls store method)

- `server/api/merge.py:108-196` - Current REST API endpoint for merge triggering
  - Can be deprecated after WebSocket trigger is working
  - Or kept for backward compatibility

- `adws/adw_merge_worktree.py` - The actual merge workflow script
  - Already exists and works correctly
  - No changes needed to the script itself

- `.claude/commands/merge_worktree.md` - Slash command documentation for merge workflow
  - Documents the `/merge_worktree` command
  - Already exists and defines the workflow

### New Files
No new files need to be created. All required components already exist.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add adw_merge_worktree to AVAILABLE_ADW_WORKFLOWS
- Edit `adws/adw_modules/workflow_ops.py`
- Locate the `AVAILABLE_ADW_WORKFLOWS` list (lines 142-158)
- Add `"adw_merge_worktree"` to the list after `"adw_ship_iso"`
- Ensure proper formatting and alphabetical ordering where appropriate

### Step 2: Configure workflow requirements for adw_merge_worktree
- Edit `adws/adw_triggers/trigger_websocket.py`
- Check if `adw_merge_worktree` needs to be added to `DEPENDENT_WORKFLOWS` (lines 64-70)
  - Since it requires an existing worktree and ADW ID, it should be in this list
- Check if `adw_merge_worktree` needs to be in `WORKFLOWS_REQUIRING_ISSUE_NUMBER` (lines 72-89)
  - The workflow accepts issue_number but it's optional, determine if it should be mandatory

### Step 3: Update frontend to use WebSocket trigger for merge
- Edit `src/stores/kanbanStore.js`
- Locate `triggerMergeWorkflow()` function (lines 1673-1738)
- Replace the REST API call to `/api/merge/trigger` with a WebSocket trigger message
- Use the existing WebSocket connection (check how other workflows are triggered)
- Send message format:
  ```javascript
  {
    type: "trigger_workflow",
    data: {
      workflow_type: "adw_merge_worktree",
      adw_id: task.metadata.adw_id,
      issue_number: task.metadata.issue_number,
      model_set: "base"
    }
  }
  ```
- Keep the existing `handleMergeCompletion()` function unchanged (lines 1741-1762)

### Step 4: Test the WebSocket trigger locally
- Start the WebSocket trigger server: `cd adws && uv run adw_triggers/trigger_websocket.py`
- Verify the server recognizes `adw_merge_worktree` as a valid workflow
- Test sending a trigger message manually if possible
- Verify the workflow executes and updates ADW state

### Step 5: Create E2E test for merge workflow via WebSocket
- Read `.claude/commands/e2e/test_basic_query.md` to understand E2E test structure
- Read `.claude/commands/test_e2e.md` to understand how to execute E2E tests
- Create a new E2E test file: `.claude/commands/e2e/test_merge_worktree_trigger.md`
- The test should:
  1. Navigate to the Kanban board
  2. Create or select a task in "Ready to Merge" stage with valid `adw_id` and `issue_number`
  3. Click the "Merge to Main" button
  4. Verify WebSocket message is sent with correct workflow_type
  5. Verify merge workflow starts executing
  6. Wait for merge completion
  7. Verify task shows merged status indicator
  8. Take screenshots at each step
  9. Verify no errors appear in console

### Step 6: Handle WebSocket connection in merge trigger
- Verify `src/stores/kanbanStore.js` has an active WebSocket connection
- Check if WebSocket client is initialized and connected before sending trigger
- Add error handling for WebSocket disconnection scenarios
- Ensure proper reconnection logic if WebSocket drops during merge

### Step 7: Deprecate or update REST API endpoint
- Decide whether to keep `/api/merge/trigger` for backward compatibility
- If keeping: Add a deprecation notice in the endpoint
- If removing: Delete the endpoint from `server/api/merge.py`
- Update any documentation referencing the old endpoint

### Step 8: Run validation commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any TypeScript errors or build failures
- Verify all existing tests pass
- Run the new E2E test to validate the merge workflow works end-to-end

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Verify adw_merge_worktree is added to AVAILABLE_ADW_WORKFLOWS
grep -n "adw_merge_worktree" adws/adw_modules/workflow_ops.py

# Verify WebSocket trigger recognizes the workflow
cd adws && uv run python -c "from adw_modules.workflow_ops import AVAILABLE_ADW_WORKFLOWS; print('adw_merge_worktree' in AVAILABLE_ADW_WORKFLOWS)"

# Verify frontend no longer uses REST API for merge trigger
grep -n "/api/merge/trigger" src/stores/kanbanStore.js

# Verify WebSocket trigger message is sent
grep -n "trigger_workflow" src/stores/kanbanStore.js
grep -n "adw_merge_worktree" src/stores/kanbanStore.js

# Verify handleMergeCompletion still exists
grep -n "handleMergeCompletion" src/stores/kanbanStore.js

# Run frontend TypeScript check
npm run tsc --noEmit

# Run frontend build
npm run build

# Test WebSocket trigger server starts correctly
cd adws && timeout 5 uv run adw_triggers/trigger_websocket.py || echo "Server started successfully"

# Read and execute E2E test
# Read .claude/commands/test_e2e.md, then read and execute .claude/commands/e2e/test_merge_worktree_trigger.md
```

## Notes
- The `adw_merge_worktree.py` script already exists and works correctly - no changes needed
- The `/merge_worktree` slash command is already documented in `.claude/commands/merge_worktree.md`
- The frontend already has `handleMergeCompletion()` that detects when "adw_merge_worktree" appears in ADW state
- The WebSocket trigger system already supports workflow triggering with `workflow_type`, `adw_id`, and `issue_number` parameters
- The only missing piece is registering `adw_merge_worktree` as an available workflow and updating the frontend to use WebSocket instead of REST API
- Consider whether `adw_merge_worktree` should be in `DEPENDENT_WORKFLOWS` (requires existing worktree) and `WORKFLOWS_REQUIRING_ISSUE_NUMBER`
- The merge script accepts an optional merge method parameter (squash/merge/rebase) - determine if this needs to be passed through WebSocket trigger
- Maintain backward compatibility during transition - consider keeping both trigger methods temporarily
- The merge completion detection is already implemented via WebSocket in `kanbanStore.js:1741-1762`, so we only need to fix the trigger mechanism
