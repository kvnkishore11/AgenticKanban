# Chore: Enhanced ADW Delete with Backend Confirmation and Logs Cleanup

## Metadata
issue_number: `24`
adw_id: `8250f1e2`
issue_json: `{"number":24,"title":"Oh, within our adw system I want you to add someth...","body":"Oh, within our adw system I want you to add something like adw delete. So when I do that, technically I don't want the work tree to be there, remove the work tree and I also don't want agents logs as well. So I'm just trying to wipe out all the things related to that. That is something I want you to add within the backend and once it successfully deletes that, probably it should notify the frontend then the card should be gone. Not directly, right now when I click on delete it's directly vanishing from the frontend. Ideally this is what should happen and it should also show the notification that deleted successfully sort of thing."}`

## Chore Description
Enhance the existing ADW delete functionality to ensure proper backend-first deletion flow with comprehensive cleanup. Currently, the frontend card vanishes immediately when delete is clicked. The desired behavior is:

1. **Backend-first deletion**: When delete is triggered, call the backend DELETE endpoint first
2. **Comprehensive cleanup**: Backend removes worktree, agents logs, and all associated directories
3. **WebSocket notification**: Backend notifies frontend upon successful deletion
4. **Frontend UI update**: Card only disappears after receiving backend confirmation
5. **Success notification**: Display a toast/notification confirming successful deletion
6. **Loading state**: Show loading indicator while deletion is in progress
7. **Error handling**: Gracefully handle deletion failures with user-friendly error messages

This ensures data consistency and prevents orphaned state when deletion fails.

## Relevant Files
Use these files to resolve the chore:

- `server/api/adws.py` - Contains the DELETE `/api/adws/{adw_id}` endpoint (lines 440-598). Already implements worktree removal, agents directory cleanup, and port killing. We need to verify it properly cleans up all log directories and broadcasts the correct WebSocket event.

- `adws/adw_modules/worktree_ops.py` - Contains `remove_worktree()` function for git worktree cleanup. Already used by the backend endpoint.

- `adws/adw_modules/utils.py` - Contains logger setup that creates logs in `agents/{adw_id}/{trigger_type}/execution.log`. We need to ensure all these log directories are removed.

- `src/stores/kanbanStore.js` - Contains `deleteWorktree` action (around line 2337) that currently calls the backend but may also delete the task immediately. We need to modify this to only delete the task after receiving WebSocket confirmation.

- `src/services/api/adwService.js` - Contains `deleteWorktree()` method (around line 499) that calls the backend DELETE endpoint. This is already implemented correctly.

- `src/components/kanban/TaskDetailsModal.jsx` - Likely contains the delete button UI. We need to verify it shows proper loading state and doesn't optimistically remove the card.

- `src/components/kanban/KanbanCard.jsx` - May contain inline delete functionality. Need to verify proper loading states.

- `server/core/websocket_manager.py` - Handles WebSocket message broadcasting. Used by the delete endpoint to send notifications.

- `src/services/websocket/websocketService.js` - Frontend WebSocket service that receives messages. Need to ensure it properly handles `worktree_deleted` events.

### New Files

- `server/tests/test_adw_delete_enhanced.py` - Additional unit tests to verify comprehensive log cleanup and WebSocket notification flow
- `src/components/kanban/__tests__/DeleteWorkflowButton.test.jsx` - Frontend tests for delete button loading states and confirmation flow

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Verify and enhance backend delete endpoint cleanup

- Review `server/api/adws.py` DELETE endpoint (lines 440-598) to ensure it:
  - Removes the git worktree via `git worktree remove --force`
  - Deletes the entire `agents/{adw_id}` directory including all subdirectories (logs, state files, etc.)
  - Kills processes on websocket_port and frontend_port
  - Broadcasts `worktree_deleted` event via WebSocket with proper payload
- Add explicit log directory cleanup if not already covered by `shutil.rmtree(adw_dir)`
- Ensure the WebSocket broadcast includes all necessary context: `adw_id`, `event_type: "worktree_deleted"`, success message
- Add detailed logging for each cleanup step to aid debugging

### Step 2: Update frontend deleteWorktree action to wait for backend confirmation

- Locate the `deleteWorktree` action in `src/stores/kanbanStore.js` (around line 2337)
- Current behavior: Calls backend then immediately deletes task with `get().deleteTask(task.id)`
- New behavior:
  - Set a loading state for the specific ADW ID before calling backend
  - Call the backend DELETE endpoint via `adwService.deleteWorktree(adw_id)`
  - Do NOT immediately delete the task from state
  - Wait for the WebSocket `worktree_deleted` event to actually remove the task
  - Clear loading state when deletion completes (via WebSocket) or errors
- Add error handling for backend failures and display error notifications

### Step 3: Add WebSocket event handler for worktree_deleted

- Review `src/services/websocket/websocketService.js` to check if `worktree_deleted` event is already handled
- If not handled, add a handler in the WebSocket message switch/if-else logic
- The handler should:
  - Extract `adw_id` from the event payload
  - Find the task associated with this `adw_id` in kanbanStore
  - Remove the task from the board using `deleteTask(taskId)`
  - Display a success notification: "Worktree {adw_id} deleted successfully"
- Ensure this handler is registered before the deleteWorktree action is called

### Step 4: Update UI components to show loading state during deletion

- Review `src/components/kanban/TaskDetailsModal.jsx` for delete button implementation
- Add loading state indicator when delete is in progress (spinner icon or disabled button)
- Update button text to show "Deleting..." while loading
- Disable the delete button during deletion to prevent duplicate requests
- If using a confirmation modal, keep it open with loading state until WebSocket confirms deletion

### Step 5: Implement success notification toast

- When the `worktree_deleted` WebSocket event is received:
  - Display a toast notification (using existing notification system)
  - Message: "ADW {adw_id} deleted successfully"
  - Type: Success (green background)
  - Duration: 3-5 seconds auto-dismiss
- Ensure the notification appears even if the user has navigated away from the card

### Step 6: Add error handling and failure notifications

- Handle backend DELETE request failures (4xx, 5xx responses)
- Display error notification with specific message from backend
- Clear loading state and re-enable delete button on error
- Handle WebSocket `worktree_delete_failed` event if backend broadcasts it
- Handle timeout scenario if WebSocket confirmation doesn't arrive within 30 seconds
- Log all errors to console for debugging

### Step 7: Create comprehensive tests for backend log cleanup

- Create `server/tests/test_adw_delete_enhanced.py` with tests for:
  - Verify all subdirectories in `agents/{adw_id}/` are deleted (logs, state, etc.)
  - Test multiple trigger types with logs (adw_plan_build, trigger_webhook, etc.)
  - Verify WebSocket broadcast contains correct event_type and adw_id
  - Test deletion when agents directory has deeply nested log files
  - Test concurrent deletion requests for the same ADW (idempotency)

### Step 8: Create frontend tests for delete button behavior

- Create `src/components/kanban/__tests__/DeleteWorkflowButton.test.jsx` with tests for:
  - Delete button shows loading state when clicked
  - Task remains in board while deletion is in progress
  - Task is removed only after WebSocket confirmation
  - Error notification appears if backend deletion fails
  - Success notification appears on successful deletion
  - Confirmation modal closes after WebSocket confirmation

### Step 9: Run all validation commands

- Run backend tests with pytest to verify zero regressions
- Run frontend tests with npm to verify component behavior
- Manually test the complete delete flow end-to-end
- Verify logs, worktree, and agents directory are all cleaned up

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `uv run pytest adws/adw_tests/ -v --tb=short` - Run backend tests to validate the chore is complete with zero regressions
- `npm run test` - Run frontend tests to validate the chore is complete with zero regressions
- `uv run pytest server/tests/test_adw_delete_enhanced.py -v` - Run new enhanced delete tests
- Manual testing steps:
  1. Start the server: `cd server && uv run uvicorn server:app --reload --port 8001`
  2. Start the frontend: `npm run dev`
  3. Create a test ADW workflow to generate logs and state
  4. Verify `agents/{adw_id}/` directory exists with logs
  5. Verify `trees/{adw_id}/` worktree directory exists
  6. Click delete on the card in the Kanban UI
  7. Verify the card shows loading state (spinner, "Deleting..." text)
  8. Verify the card does NOT immediately disappear
  9. Wait for WebSocket notification (should be < 2 seconds)
  10. Verify success notification toast appears: "ADW {adw_id} deleted successfully"
  11. Verify the card now disappears from the board
  12. Verify `agents/{adw_id}/` directory is deleted
  13. Verify `trees/{adw_id}/` worktree directory is deleted
  14. Run `git worktree list` and verify the worktree is not listed
  15. Test error scenario: attempt to delete non-existent ADW, verify error notification

## Notes

- The backend DELETE endpoint in `server/api/adws.py` already exists (added in issue #4) and handles most of the cleanup
- The key change is in the frontend flow: wait for WebSocket confirmation before removing the card
- The `agents/{adw_id}/` directory contains all logs, including subdirectories like `adw_plan_build/`, `trigger_webhook/`, etc. - these are all removed by `shutil.rmtree(adw_dir)`
- WebSocket notifications are critical for real-time UI updates and prevent race conditions
- Loading states improve UX by showing the user that deletion is in progress
- Error handling prevents silent failures and helps users understand what went wrong
- The existing `deleteTask` action in kanbanStore should only be called from the WebSocket event handler, not directly from the deleteWorktree action
- Consider adding a cleanup timeout (e.g., 30 seconds) to handle cases where WebSocket notification never arrives
- The delete operation is idempotent - calling DELETE on the same ADW twice returns appropriate errors but doesn't crash
