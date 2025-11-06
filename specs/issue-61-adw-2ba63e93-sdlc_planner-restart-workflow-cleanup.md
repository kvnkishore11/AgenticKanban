# Chore: Workflow Restart - Clean Up Previous ADW and Force Stage Progression

## Metadata
issue_number: `61`
adw_id: `2ba63e93`
issue_json: `{"number":61,"title":"If for somereason u trigger the workflow not from...","body":"If for somereason u trigger the workflow not from the backlog stage but from either plan, build, test, review, document, errored stage, that means you are intending to restart the entire process. in that case i am noticing a new adw_id is crated but the stage progression is not happenign i.e it immediately has to go to plan phase and also that eariler adw_id worktree and agent/{adw_id} folder has to be deleted."}`

## Chore Description
When a workflow is triggered from any stage other than backlog (i.e., from plan, build, test, review, document, or errored stages), it indicates the user wants to restart the entire workflow from scratch. Currently, when this happens:

1. A new ADW ID is created (correct behavior)
2. **Problem 1**: The stage progression doesn't happen - the workflow doesn't immediately transition to the plan phase
3. **Problem 2**: The earlier ADW ID's worktree (`trees/<old_adw_id>/`) and agent folder (`agents/<old_adw_id>/`) are not cleaned up

This chore fixes both issues by:
- Detecting when a workflow restart is requested (trigger from non-backlog stage)
- Immediately transitioning the task to the plan phase
- Cleaning up the previous ADW ID's worktree and agent directories

## Relevant Files
Use these files to resolve the chore:

- **adws/adw_triggers/trigger_websocket.py** (lines 400-570) - WebSocket trigger handler that creates new ADW IDs and processes workflow trigger requests. This is where we need to:
  - Detect if the trigger is a restart (triggered from non-backlog stage)
  - Extract the old ADW ID from the ticket metadata
  - Clean up the old ADW ID's resources
  - Force immediate stage transition to plan

- **adws/adw_modules/worktree_ops.py** (lines 123-149) - Contains `remove_worktree()` function for cleaning up worktrees. We'll use this to delete the old worktree.

- **adws/adw_modules/state.py** (lines 16-256) - ADWState class that manages workflow state. We need to understand the state structure to properly clean up old state.

- **adws/adw_triggers/websocket_models.py** (lines 61-75) - TicketNotification model that receives ticket data from the Kanban client, including stage information.

- **adws/adw_modules/websocket_client.py** (lines 301-328) - WebSocketNotifier class with `notify_stage_transition()` method for sending stage transition notifications.

- **server/api/stage_logs.py** (lines 19-26) - STAGE_TO_FOLDERS mapping showing the valid workflow stages (plan, build, test, review, document).

### New Files
None - this chore only modifies existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add Helper Function to Detect Workflow Restart
- In `adws/adw_triggers/trigger_websocket.py`, add a helper function `is_workflow_restart()` that:
  - Takes a `TicketNotification` object as input
  - Returns `True` if the ticket's current stage is NOT "backlog" (i.e., it's in plan, build, test, review, document, or errored)
  - Returns `False` if the ticket is in backlog stage or if stage is None/empty

### 2. Add Cleanup Function for Old ADW Resources
- In `adws/adw_triggers/trigger_websocket.py`, add a helper function `cleanup_old_adw_resources()` that:
  - Takes `old_adw_id` and `logger` as parameters
  - Removes the old worktree using `worktree_ops.remove_worktree(old_adw_id, logger)`
  - Deletes the old agent directory at `agents/{old_adw_id}/` using `shutil.rmtree()`
  - Logs all cleanup actions (success and failures)
  - Handles errors gracefully (log warnings but don't fail the entire request)

### 3. Modify Ticket Notification Handler to Detect and Handle Restarts
- In `adws/adw_triggers/trigger_websocket.py`, locate the `handle_ticket_notification()` function
- After receiving the ticket notification but before creating/triggering the workflow:
  - Check if this is a restart using `is_workflow_restart(ticket)`
  - If it's a restart AND the ticket metadata contains an old ADW ID:
    - Extract the old ADW ID from ticket metadata
    - Log that a restart was detected
    - Call `cleanup_old_adw_resources()` to clean up old resources
    - Set a flag indicating this is a restart operation

### 4. Force Stage Transition to Plan Phase on Restart
- In the same `handle_ticket_notification()` function:
  - After the workflow is triggered successfully
  - If the restart flag is set:
    - Create a WebSocketNotifier instance with the new ADW ID
    - Call `notifier.notify_stage_transition()` to immediately transition from current stage to "plan"
    - Send a status update via WebSocket indicating the workflow has been restarted and transitioned to plan phase
    - Log the forced stage transition

### 5. Update TicketNotification Model to Include Old ADW ID
- In `adws/adw_triggers/websocket_models.py`, update the `TicketNotification` class:
  - Add an optional field `old_adw_id: Optional[str] = None` to capture the previous ADW ID from ticket metadata
  - This allows the Kanban client to explicitly pass the old ADW ID that needs cleanup

### 6. Add Import Statements
- In `adws/adw_triggers/trigger_websocket.py`:
  - Add `import shutil` for directory cleanup
  - Add `from adw_modules import worktree_ops` for worktree cleanup functions
  - Verify `WebSocketNotifier` is imported from `adw_modules.websocket_client`

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd adws && uv run python -m pytest adw_tests/` - Run ADW module tests to ensure no regressions in workflow logic
- `uv run python -c "from adw_triggers.trigger_websocket import is_workflow_restart, cleanup_old_adw_resources; print('Import successful')"` - Verify new helper functions are importable
- `uv run python -c "from adw_triggers.websocket_models import TicketNotification; t = TicketNotification(id='1', title='Test', stage='plan'); print(f'Stage: {t.stage}')"` - Verify TicketNotification model works correctly

## Notes
- The cleanup process should be fault-tolerant: if worktree cleanup fails, still attempt to clean up the agent directory, and vice versa
- Stage transition notification should be sent via WebSocket so the Kanban UI updates immediately
- Valid non-backlog stages that trigger restart: plan, build, test, review, document, errored
- The old ADW ID might not exist in some edge cases (e.g., manual ticket creation), so cleanup should handle missing directories gracefully
- Consider adding a delay between cleanup and stage transition to ensure cleanup completes
- Log all cleanup operations with INFO level for debugging and audit purposes
- The WebSocket notification for stage transition should include both the old and new ADW IDs in the message for traceability
