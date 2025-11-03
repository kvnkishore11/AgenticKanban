# Bug: Fix Stage Transition Logic for ADW Workflows

## Metadata
issue_number: `19`
adw_id: `d3bc9698`
issue_json: `{"number":19,"title":"if you notice this card","body":"if you notice this card. ideally this adw is for plan and build(Implement). but it went into the test phase. Ideally this should not have happened. It should trigger our complete stage and it should have shown in ready to merge phase. It then would have an extra cta of merge as well. try to fix this issue.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/1297713e-4378-43f5-80ac-2d0da567f6e1)\n\n"}`

## Bug Description
A task with the `adw_plan_build_iso` workflow (which only includes Plan and Build/Implement stages) is incorrectly transitioning to the Test stage after completing the Build stage. The workflow should recognize when it has completed all its defined stages and transition to a "Complete" or "Ready to Merge" state instead of continuing to stages not included in the workflow definition.

**Expected Behavior:**
- Task with `adw_plan_build_iso` workflow completes Plan stage
- Task transitions to Build/Implement stage
- Task completes Build/Implement stage
- Task recognizes the workflow is complete and transitions to "PR" or "Ready to Merge" stage
- Task shows a merge CTA

**Actual Behavior:**
- Task with `adw_plan_build_iso` workflow completes Plan stage
- Task transitions to Build/Implement stage
- Task completes Build/Implement stage
- Task incorrectly transitions to Test stage (which is not part of the workflow)
- Task does not show as ready to merge

## Problem Statement
The stage progression logic does not respect the workflow definition's stage boundaries. When a task completes a stage, the system uses a generic "next stage" progression that doesn't check if the next stage is actually part of the task's assigned workflow (e.g., `adw_plan_build_iso`, `adw_plan_build_test_iso`).

## Solution Statement
Implement workflow-aware stage transition logic that:
1. Parses the workflow name to extract the intended stages (e.g., `adw_plan_build_iso` → `['plan', 'build']`)
2. When a stage completes, checks if there's a next stage within the workflow definition
3. If the workflow is complete, transitions to a terminal stage (e.g., "pr" or "ready-to-merge")
4. Ensures the UI shows appropriate CTAs based on workflow completion status

## Steps to Reproduce
1. Create a task with workflow type `adw_plan_build_iso`
2. Trigger the workflow execution
3. Wait for Plan stage to complete
4. Wait for Build stage to complete
5. Observe that the task incorrectly moves to Test stage instead of completing

## Root Cause Analysis
The root cause is in the stage progression logic, specifically:

1. **In `stageProgressionService.js:153-182`**: The `checkProgression` method calls `adwService.getNextStage(pipelineId, stage)` which returns the next stage in the pipeline configuration, not the next stage in the task's workflow.

2. **In `kanbanStore.js:1413-1437`**: The `handleWorkflowComplete` action attempts to determine the next stage based on `task.metadata?.workflow_name`, but uses a hardcoded fallback mapping that doesn't respect workflow definitions.

3. **In `websocketService.js:724-759`**: The `getWorkflowTypeForStage` method maps stages to workflows but doesn't provide reverse mapping to determine valid stages for a workflow.

4. **Missing workflow stage parser**: There's a `parseWorkflowStages` function referenced in `kanbanStore.js:26-47` that should extract stages from workflow names, but it needs to be used consistently in stage transitions.

The system has the information it needs (the workflow name contains the stages), but the stage progression logic doesn't utilize this information when deciding transitions.

## Relevant Files
Use these files to fix the bug:

- **`src/utils/substages.js`** - Contains substage definitions and progression logic. Need to add workflow-aware stage boundary checking.

- **`src/services/websocket/stageProgressionService.js`** - Contains the automatic progression logic that needs to respect workflow stage boundaries (lines 130-203).

- **`src/stores/kanbanStore.js`** - Contains the `parseWorkflowStages` function (lines 26-47) that extracts stages from workflow names. Need to use this function in stage transitions (lines 1413-1437).

- **`src/services/api/adwService.js`** - Contains pipeline configuration and `getNextStage` method (lines 233-249). Need to add a workflow-aware version that respects task's workflow definition.

- **`src/services/websocket/websocketService.js`** - Contains `getWorkflowTypeForStage` method (lines 724-759). Need to add reverse mapping: given a workflow type, return its valid stages.

### New Files
None required - this is a logic fix to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add Workflow Stage Parser Utility
- Export the `parseWorkflowStages` function from `kanbanStore.js` as a standalone utility in `src/utils/workflowParser.js`
- Add comprehensive tests for parsing various workflow names:
  - `adw_plan_iso` → `['plan']`
  - `adw_plan_build_iso` → `['plan', 'build']`
  - `adw_plan_build_test_iso` → `['plan', 'build', 'test']`
  - `adw_sdlc_iso` → `['plan', 'build', 'test', 'review', 'document']`
- Handle edge cases (null, undefined, invalid formats)

### 2. Add Workflow Stage Validation Utilities
- Create `src/utils/workflowValidation.js` with functions:
  - `getWorkflowStages(workflowName)` - returns array of stages for a workflow
  - `isStageInWorkflow(workflowName, stage)` - checks if stage is part of workflow
  - `getNextStageInWorkflow(workflowName, currentStage)` - returns next stage or null if complete
  - `isWorkflowComplete(workflowName, currentStage)` - returns true if current stage is the last stage

### 3. Update `adwService.js` to Support Workflow-Aware Stage Transitions
- Add new method `getNextStageForWorkflow(workflowName, currentStage)` that:
  - Uses `getWorkflowStages` to extract stages from workflow name
  - Finds current stage index in the workflow's stage list
  - Returns next stage if it exists within the workflow, null otherwise
- Update existing `getNextStage` to optionally accept a `workflowName` parameter
- Maintain backward compatibility with existing pipeline-based logic

### 4. Fix Stage Progression Logic in `stageProgressionService.js`
- Update `checkProgression` method (lines 130-203) to:
  - Get the task's workflow name from `task.metadata?.workflow_name`
  - Use `getNextStageInWorkflow` instead of `getNextStage(pipelineId, stage)`
  - When workflow is complete (no next stage), transition to 'pr' stage
  - Add logging to indicate workflow completion vs. stage progression
- Update error handling to include workflow name in error messages

### 5. Fix Workflow Completion Logic in `kanbanStore.js`
- Update `handleWorkflowComplete` action (lines 1413-1437) to:
  - Use the imported `getNextStageInWorkflow` utility
  - Remove hardcoded stage mapping fallback
  - When workflow is complete, set stage to 'pr' and add appropriate metadata
  - Trigger UI update to show merge CTA when workflow is complete

### 6. Add Workflow Completion Indicators to UI
- Update `KanbanCard.jsx` to:
  - Detect when a task's workflow is complete using `isWorkflowComplete`
  - Show a "Ready to Merge" badge or indicator
  - Display merge CTA button when workflow is complete and task is in 'pr' stage
- Add visual distinction for workflow-complete tasks

### 7. Update WebSocket Message Handling
- Update `websocketService.js` status update handler to:
  - Check if status is "completed" and workflow name indicates all stages done
  - Set appropriate stage based on workflow completion
  - Include workflow_complete flag in status update messages

### 8. Add Comprehensive Unit Tests
- Test `workflowParser.js`:
  - Test parsing all workflow name formats
  - Test edge cases and error handling
- Test `workflowValidation.js`:
  - Test stage validation for different workflows
  - Test workflow completion detection
  - Test next stage calculation
- Test `adwService.js`:
  - Test `getNextStageForWorkflow` with various workflow types
  - Test workflow completion scenarios

### 9. Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify the bug is fixed by testing the specific scenario

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test the specific bug scenario
# 1. Start the development environment
cd app/server && uv run python -m app.main &
cd app/client && bun run dev &

# Wait for servers to start, then test the workflow progression

# 2. Create a test task with adw_plan_build_iso workflow and verify it doesn't transition to test stage after build completes

# 3. Run unit tests
cd app/server && uv run pytest
cd app/client && bun test

# 4. Run type checking
cd app/client && bun tsc --noEmit

# 5. Build frontend
cd app/client && bun run build
```

## Notes
- The core issue is that stage progression logic ignores the workflow definition encoded in the workflow name
- The `parseWorkflowStages` function already exists in `kanbanStore.js` but needs to be extracted and reused across the codebase
- The fix should maintain backward compatibility with existing tasks and workflows
- Consider adding workflow stage validation during task creation to prevent invalid stage assignments
- The UI should clearly indicate when a workflow is complete and ready for the next action (merge)
- This fix will benefit all composite workflows (plan_build, plan_build_test, etc.) by ensuring they respect their stage boundaries
