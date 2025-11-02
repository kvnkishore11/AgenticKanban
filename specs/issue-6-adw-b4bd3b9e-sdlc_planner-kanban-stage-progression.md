# Chore: Kanban Stage Progression

## Metadata
issue_number: `6`
adw_id: `b4bd3b9e`
issue_json: `{"number":6,"title":"i see the logs of teh adw within the card itself","body":"i see the logs of teh adw within the card itself. but i dont see them moving in teh kanban board ui stages. bascially as soon as you trigger the flow, it should go into the plan stage and once as the adw progresses it should progress in the kanban board along with the stages"}`

## Chore Description
Currently, when ADW workflows are triggered, the Kanban cards display real-time logs but do not automatically move through the Kanban board stages. The expected behavior is:

1. When a workflow is triggered, the card should immediately move to the appropriate starting stage (e.g., "plan" stage for planning workflows)
2. As the ADW workflow progresses through its phases, the card should automatically advance through corresponding Kanban stages
3. For composite workflows (e.g., `adw_plan_build_test_iso`), the card should progress: backlog → plan → build → test

**Current State:**
- Real-time WebSocket logs are displayed correctly in cards
- Cards remain in their initial stage (e.g., "backlog") when workflows are triggered
- Manual stage movement via dropdown menu works
- Only single-stage workflow completion triggers stage change (incomplete implementation)

**Root Cause:**
The stage progression logic in `kanbanStore.js` is incomplete:
- No immediate stage transition when workflow is triggered
- Hardcoded workflow-to-stage mapping only handles single-stage workflows
- No support for composite workflows that progress through multiple stages
- Stage transition events from workflows (`notify_stage_transition`) are not handled

## Relevant Files
Use these files to resolve the chore:

- **src/stores/kanbanStore.js** - Main state management for Kanban board
  - Line 946: `triggerWorkflowForTask()` - Needs to add immediate stage transition logic when workflow starts
  - Line 1005: `handleWorkflowStatusUpdate()` - Needs enhanced stage detection from `current_step` field
  - Line 1183: `handleWorkflowCompletion()` - Needs support for composite workflows with dynamic stage sequencing
  - Missing: Handler for stage transition events from composite workflows

- **src/services/websocket/websocketService.js** - WebSocket client communication
  - Line 694: `getWorkflowTypeForStage()` - Already maps stages to workflow types
  - Needs reverse mapping: workflow types to initial stages
  - Needs to parse composite workflow names to extract stage sequences

- **adws/adw_modules/websocket_client.py** - Python WebSocket client for workflows
  - Line 301-328: `notify_stage_transition()` - Already sends stage transition notifications
  - Currently sends as `current_step="Stage: {to_stage}"` which needs to be parsed on frontend

- **adws/adw_plan_build_test_iso.py** - Example composite workflow
  - Lines 54-99: Shows how composite workflows chain single-stage workflows together
  - Demonstrates the need for stage progression as each sub-workflow completes

### New Files
None - all changes are to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add Workflow-to-Stage Mapping Utility
- Create a utility function in `src/stores/kanbanStore.js` to parse workflow names and extract stage sequences
- Function should handle both single-stage workflows (e.g., `adw_plan_iso` → ["plan"]) and composite workflows (e.g., `adw_plan_build_test_iso` → ["plan", "build", "test"])
- Extract logic: remove `adw_` prefix, remove `_iso` suffix, split by `_` to get stage array
- Create reverse mapping to determine initial stage from workflow name
- Handle special cases: `adw_sdlc_iso` should map to ["plan", "build", "test", "review", "document"]

### Step 2: Implement Immediate Stage Transition on Workflow Trigger
- Modify `triggerWorkflowForTask()` in `src/stores/kanbanStore.js` (line 946)
- After workflow is triggered via WebSocket (line 971), determine the initial stage from workflow type
- If the card is in "backlog" stage, automatically move it to the workflow's starting stage
- Use the utility function from Step 1 to extract the first stage from the workflow name
- Ensure this happens before the task metadata is updated (before line 982)

### Step 3: Enhance Workflow Completion Handler for Composite Workflows
- Replace the hardcoded `workflowStageMap` in `handleWorkflowCompletion()` (lines 1192-1200)
- Use the utility function from Step 1 to parse the workflow name and extract stage sequence
- Find the current stage index in the sequence
- Move to the next stage in the sequence if one exists
- If the workflow is complete (no next stage), keep the card in final stage (e.g., "pr" or "document")
- Handle edge cases: single-stage workflows should still move to their completion stage

### Step 4: Add Real-time Stage Detection from current_step Field
- Enhance `handleWorkflowStatusUpdate()` in `src/stores/kanbanStore.js` (line 1005)
- Parse the `current_step` field to detect stage transitions
- Look for patterns like "Stage: {stage_name}" in `current_step` (sent by `notify_stage_transition()`)
- When detected, automatically move the card to the detected stage
- Only move forward through stages, never backward (validate stage progression order)
- Add this logic before the completion/failure checks (before line 1060)

### Step 5: Add Handler for Stage Transition Events
- Create new event handler `handleStageTransition()` in `src/stores/kanbanStore.js`
- Handler should accept stage transition data with `adw_id`, `from_stage`, `to_stage`
- Find the task by `adw_id` in metadata
- Move the card to `to_stage` using `moveTaskToStage()`
- Connect this handler to WebSocket service event listeners for stage transition messages

### Step 6: Update WebSocket Service to Emit Stage Transition Events
- Review `websocketService.js` message handling (around lines 300-400)
- Ensure `current_step` field in status_update messages is properly forwarded to event listeners
- Add special handling for `current_step` values that start with "Stage: " to emit dedicated stage transition events
- This provides a clean separation between status updates and explicit stage transitions

### Step 7: Test Single-Stage Workflow Progression
- Start the application server and client
- Create a test card in "backlog" stage
- Trigger a single-stage workflow (e.g., `adw_plan_iso`)
- Verify the card immediately moves to "plan" stage
- Verify the card moves to "build" stage when workflow completes
- Check that workflow logs are still displayed correctly
- Validate no regressions in existing functionality

### Step 8: Test Composite Workflow Stage Progression
- Create a test card in "backlog" stage
- Trigger a composite workflow (e.g., `adw_plan_build_test_iso`)
- Verify the card immediately moves to "plan" stage
- As the workflow progresses, verify the card automatically advances: plan → build → test
- Confirm stage transitions happen in real-time as each phase completes
- Verify final stage is correct when entire workflow completes

### Step 9: Test Error Handling and Edge Cases
- Test workflow failure scenarios - verify cards move to "errored" stage
- Test triggering workflows from stages other than "backlog"
- Test rapid workflow triggers (ensure state consistency)
- Test reconnection scenarios (ensure stage progression resumes correctly)
- Verify manual stage movement still works correctly
- Test with different workflow types (plan, build, test, review, document)

### Step 10: Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any test failures or errors that arise
- Verify both server and client start successfully
- Confirm no console errors or warnings in browser dev tools

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd app/client && npm run build` - Build client to validate no TypeScript/build errors
- `cd app/client && npm run lint` - Run linter to validate code quality
- `./scripts/start_server.sh` - Start server to validate it starts without errors
- `./scripts/start_client.sh` - Start client to validate it starts without errors (run in separate terminal)

## Notes
- The WebSocket infrastructure for real-time communication is already in place and working correctly
- The issue is purely a logic gap in the frontend state management, not an infrastructure problem
- All necessary data (workflow type, status, current_step, progress) is already flowing through WebSocket messages
- The Python backend already sends stage transition notifications via `notify_stage_transition()` - we just need to handle them
- Composite workflows like `adw_plan_build_test_iso` chain individual stage workflows, so stage detection must work across workflow boundaries
- The `StageProgressionViewer` component already exists and displays stage progression visually - it will automatically update once the state is correct
- Manual stage movement via dropdown should continue to work - don't remove or break this functionality
- Consider adding visual feedback (e.g., brief highlight/animation) when a card automatically transitions stages to make the progression visible to users
