# Bug: Test stage not transitioning to Ready to Merge (PR) after completion

## Metadata
issue_number: `25`
adw_id: `8accb5ef`
issue_json: `{"number":25,"title":"if you notice this adw_plan_build_test_iso \ni see...","body":"if you notice this adw_plan_build_test_iso \ni see that the test phase is also completed. it is still prseent in test phase. ideally this should have moved to Ready to Merge Phase. \nCan you please find what is the issue and try to fix this\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/a9441cc3-fe97-44c9-8048-687471cc18bf)\n\n"}`

## Bug Description
When running `adw_plan_build_test_iso` workflow, after the test phase completes successfully (status: 'completed'), the task remains stuck in the 'test' stage instead of automatically transitioning to the 'pr' (Ready to Merge) stage. The workflow completion notification is sent, but the kanban board UI does not reflect the expected stage progression.

## Problem Statement
The `handleWorkflowCompletion` function in `src/stores/kanbanStore.js` is responsible for determining the next stage when a workflow completes. For composite workflows like `adw_plan_build_test_iso`, the function correctly parses the workflow stages as `['plan', 'build', 'test']`. However, when the test stage completes (which is the last stage in this workflow), the logic enters the "else" branch that handles workflow completion.

The bug is in the `completionStageMap` at line 1435-1442 of `kanbanStore.js`. This map is missing an entry for `'test': 'pr'`, which means when a workflow ending with 'test' completes, `nextStage` is set to `undefined`, and no stage transition occurs.

## Solution Statement
Add the missing mapping for the 'test' stage in the `completionStageMap` within the `handleWorkflowCompletion` function. When a workflow's last stage is 'test', the task should transition to 'pr' (Ready to Merge) stage upon completion.

## Steps to Reproduce
1. Create a task with `adw_plan_build_test_iso` workflow
2. Trigger the workflow and let it run through plan, build, and test stages
3. Observe that when the test stage completes (receives status: 'completed'), the task remains in the 'test' stage
4. Expected: Task should automatically move to 'pr' stage
5. Actual: Task stays in 'test' stage with workflow status 'completed'

## Root Cause Analysis
The root cause is in `src/stores/kanbanStore.js` at lines 1409-1453, specifically in the `handleWorkflowCompletion` function.

When a composite workflow like `adw_plan_build_test_iso` completes:
1. The function parses the workflow name to extract stages: `['plan', 'build', 'test']`
2. It finds the current stage index in the workflow sequence (currentIndex = 2 for 'test')
3. Since currentIndex (2) is equal to stages.length - 1 (2), the condition `currentIndex < stages.length - 1` is false
4. The code enters the else block to handle workflow completion
5. It gets the last stage: `lastStage = 'test'`
6. It looks up `completionStageMap['test']` to find the next stage
7. **BUG**: The map doesn't have an entry for 'test', so `nextStage = undefined`
8. The condition `if (nextStage && task.stage !== nextStage)` fails
9. No stage transition occurs

The `completionStageMap` currently has:
```javascript
const completionStageMap = {
  'plan': 'build',
  'build': 'test',
  // 'test': 'pr',  // <-- MISSING!
  'review': 'document',
  'document': 'pr',
  'ship': 'pr',
};
```

## Relevant Files
Use these files to fix the bug:

- `src/stores/kanbanStore.js` (lines 1409-1453) - Contains the `handleWorkflowCompletion` function with the incomplete `completionStageMap`. This is where the fix needs to be applied.
- `src/stores/kanbanStore.js` (lines 31-54) - Contains `parseWorkflowStages` helper function used to extract stage sequence from workflow names.
- `adws/adw_plan_build_test_iso.py` (lines 101-103) - The composite workflow that completes after test phase. Used for understanding the workflow structure.
- `adws/adw_test_iso.py` (lines 865-891) - The test phase that sends completion notification. Used for understanding completion behavior.
- `adws/adw_modules/websocket_client.py` (lines 229-253) - The `notify_complete` method that sends the completion status. Used for understanding notification flow.

### New Files
None required - this is a simple bug fix in existing code.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add missing 'test' to 'pr' mapping in completionStageMap
- Open `src/stores/kanbanStore.js`
- Locate the `handleWorkflowCompletion` function (around line 1409)
- Find the `completionStageMap` object (around line 1435)
- Add the missing entry: `'test': 'pr',` to the map
- Ensure the map now includes all stage transitions: plan→build, build→test, test→pr, review→document, document→pr, ship→pr
- Verify the logic will now correctly determine the next stage when 'test' is the last stage in a workflow

### 2. Verify the fix handles all workflow combinations
- Review the `parseWorkflowStages` function to understand how workflow names are parsed
- Confirm that workflows ending with 'test' (like `adw_plan_build_test_iso`, `adw_test_iso`, `adw_build_test_iso`) will now correctly transition to 'pr'
- Ensure the fix doesn't break existing workflows that have stages beyond 'test' (like `adw_plan_build_test_review_iso`)

### 3. Run validation commands
- Execute all validation commands listed below to ensure the fix works correctly and no regressions are introduced

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- This is a minimal surgical fix - only one line needs to be added to the `completionStageMap`
- The bug affects any workflow that ends with 'test' as its final stage
- The fix ensures consistency with other stage transition mappings in the map
- No new dependencies or libraries are required
- The fix is backward compatible and won't affect existing functionality
- After this fix, when `adw_plan_build_test_iso` completes, tasks will correctly move from 'test' to 'pr' stage
