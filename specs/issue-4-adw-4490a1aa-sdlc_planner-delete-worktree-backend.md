# Chore: Delete Worktree Backend Implementation

## Metadata
issue_number: `4`
adw_id: `4490a1aa`
issue_json: `{"number":4,"title":"when i click on delete","body":"when i click on delete. that particular worktree has to be deleted and also it should be removed from agents/{adw_id} as well.. u need to have this implementation from the backend. i should get a notification once successfully done.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/6a8e5b6e-6121-4136-92e9-b841db8c30f5)\n\n"}`

## Chore Description
Implement a backend API endpoint to delete worktrees when triggered from the frontend. When a user clicks the delete button on a worktree/ADW, the system should:
1. Remove the worktree from git using `git worktree remove`
2. Delete the associated agents/{adw_id} directory containing state files
3. Clean up any running processes on the worktree's allocated ports
4. Send a WebSocket notification to the frontend confirming successful deletion
5. Properly handle errors and edge cases (non-existent worktrees, locked files, etc.)

## Relevant Files
Use these files to resolve the chore:

- `server/api/adws.py` - ADW management API endpoints. This file already has endpoints for listing ADWs and getting ADW details. We'll add a new DELETE endpoint here for deleting worktrees.

- `adws/adw_modules/worktree_ops.py` - Contains worktree management utilities including `remove_worktree()` function which handles git worktree removal. We'll use this existing function in our endpoint.

- `scripts/purge_tree.sh` - Existing bash script that demonstrates the complete cleanup logic including killing processes on ports, removing worktrees, and cleaning up directories. We'll replicate this logic in Python for the backend API.

- `server/server.py` - Main FastAPI server file that registers API routes. We'll need to verify our new endpoint is properly registered through the existing adws router.

- `server/core/websocket_manager.py` - WebSocket manager for broadcasting notifications. We'll use this to send deletion success/failure notifications to connected clients.

- `adws/adw_modules/state.py` - ADW state management module for handling adw_state.json files. We may need to use this to read state before deletion.

### New Files

- `server/tests/test_adw_delete.py` - Unit tests for the new delete endpoint to ensure proper worktree deletion, error handling, and notification broadcasting.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create the delete worktree endpoint in server/api/adws.py

- Add a new DELETE endpoint `/api/adws/{adw_id}` that accepts an ADW ID
- Validate the ADW ID format (8 alphanumeric characters)
- Check if the ADW directory exists in agents/{adw_id}
- Read the adw_state.json to get worktree_path and port information
- Return 404 if ADW doesn't exist

### Step 2: Implement the cleanup logic in the delete endpoint

- Kill any processes running on the worktree's allocated ports (websocket_port and frontend_port from state)
- Use the existing `remove_worktree()` function from `adw_modules/worktree_ops.py` to remove the git worktree
- Handle the case where the worktree might not exist in git but the agents directory does
- Delete the agents/{adw_id} directory and all its contents using shutil.rmtree()
- Implement proper error handling for each step (permission errors, locked files, etc.)

### Step 3: Add WebSocket notification broadcasting

- Import WebSocketManager from server.core.websocket_manager
- Access the ws_manager from app.state in the endpoint
- Broadcast a "worktree_deleted" event with the adw_id on successful deletion
- Broadcast a "worktree_delete_failed" event with error details on failure
- Ensure the notification format matches existing WebSocket message patterns used in the app

### Step 4: Add frontend service integration

- Create a new method `deleteWorktree(adw_id)` in `src/services/api/adwService.js`
- This method should make a DELETE request to `/api/adws/{adw_id}`
- Return a promise that resolves with the deletion result
- Handle HTTP errors and network failures gracefully

### Step 5: Update kanbanStore to handle worktree deletion

- Add a `deleteWorktree(adw_id)` action in `src/stores/kanbanStore.js`
- Call the adwService.deleteWorktree() method
- Update the local state to remove tasks associated with the deleted ADW
- Subscribe to WebSocket "worktree_deleted" events to update UI in real-time
- Show a success notification when deletion completes

### Step 6: Add delete button UI in the appropriate component

- Identify where worktrees/ADWs are displayed in the UI (likely in AgentStateViewer or a worktree list component)
- Add a delete button (trash icon) with appropriate styling
- Add a confirmation modal to prevent accidental deletions
- Wire up the button to call kanbanStore.deleteWorktree(adw_id)
- Show loading state while deletion is in progress
- Display the success notification received via WebSocket

### Step 7: Write comprehensive tests

- Create unit tests in `server/tests/test_adw_delete.py` for:
  - Successful deletion flow
  - Deleting non-existent ADW (404 error)
  - Deleting with invalid ADW ID format (400 error)
  - Handling locked worktree directories
  - Verifying WebSocket notifications are sent
  - Testing port cleanup functionality
- Run all tests to ensure no regressions

### Step 8: Run validation commands to ensure zero regressions

- Run backend tests with pytest
- Manually test the delete functionality in the UI
- Verify WebSocket notifications work correctly
- Test edge cases (deleting already-deleted worktrees, permission errors, etc.)

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest tests/test_adw_delete.py -v` - Run the new delete endpoint tests
- `cd server && uv run pytest` - Run all server tests to ensure no regressions
- Manual UI testing:
  - Start the server and navigate to a page displaying worktrees/ADWs
  - Click the delete button on a test worktree
  - Verify the confirmation modal appears
  - Confirm deletion and verify the worktree is removed from UI
  - Check that WebSocket notification appears
  - Verify agents/{adw_id} directory is deleted
  - Verify `git worktree list` no longer shows the deleted worktree
  - Test deleting a non-existent worktree and verify proper error handling

## Notes
- The existing `scripts/purge_tree.sh` provides a good reference for the cleanup logic we need to implement in Python
- Port cleanup is critical - we need to kill processes on websocket_port and frontend_port to free up resources
- The worktree removal must handle cases where the worktree exists in the filesystem but not in git's worktree list (or vice versa)
- WebSocket notifications ensure the UI updates in real-time even if multiple users are viewing the same data
- Consider implementing a "soft delete" flag in adw_state.json as a future enhancement for recovery purposes
- The delete operation should be idempotent - calling it multiple times on the same ADW should not cause errors
