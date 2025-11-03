# Chore: Add Merge Completion Workflow Support

## Metadata
issue_number: `13`
adw_id: `12444360`
issue_json: `{"number":13,"title":"whenever we are done with teh work i","body":"whenever we are done with teh work i.e the adw stages of that particular adw_id. with in the adw_stage json of the adw system there should be a state ; completed. so with in the pipeline we can have a stage called Ready to Merge. this can go into that stage.\n\nwhen the cards are in that stage. we can have one more cta. Merge. Upon clickign Merge, this should merge the branch to main and then clear the worktree. \nwe can at the end send to the final stage COMPLETED (we can have a minimal version of teh card just with adw id -> can see the information if clicked though)\nmake sure that our adw system support this."}`

## Chore Description
Add support for a merge completion workflow to the ADW (AI Developer Workflow) system. When ADW stages for a particular adw_id are completed, the system should:

1. Track completion state in the adw_stage JSON within the ADW system
2. Add a "Ready to Merge" stage in the Kanban pipeline for completed work
3. Provide a "Merge" CTA (call-to-action) button when cards are in the "Ready to Merge" stage
4. Upon clicking Merge, trigger merging of the branch to main and clear the worktree
5. Move the card to a final "Completed" stage with minimal card display (only adw_id visible, full info on click)
6. Ensure the ADW system properly supports this workflow end-to-end

## Relevant Files
Use these files to resolve the chore:

### Backend/ADW System Files

- `adws/adw_modules/data_types.py` - Contains `ADWStateData` model that tracks workflow state. Need to add `completed` field to track completion status.
- `adws/adw_modules/state.py` - Contains `ADWState` class for state management. Need to add methods to mark workflow as completed.
- `adws/adw_ship_iso.py` - Existing shipping workflow that merges branches. Need to extend this to:
  - Clear the worktree after merge
  - Mark the ADW state as completed
  - Support triggering from WebSocket/API
- `adws/adw_modules/worktree_ops.py` - Contains worktree operations. Need to add function to clear/remove worktree after merge.
- `app/server/api/adws.py` - API endpoints for ADW data. Need to add endpoint to trigger merge workflow and expose completion status.

### Frontend/Client Files

- `src/stores/kanbanStore.js` - Main Kanban state management. Need to:
  - Add "Ready to Merge" and "Completed" stages to the stages array
  - Add action to trigger merge workflow via API/WebSocket
  - Handle completion status updates
- `src/components/kanban/KanbanCard.jsx` - Kanban card component. Need to:
  - Add "Merge" button when task is in "Ready to Merge" stage
  - Show minimal card view for "Completed" stage
  - Handle merge action clicks
- `src/services/api/adwService.js` - ADW API service. Need to add function to call merge endpoint.
- `src/services/websocket/stageProgressionService.js` - WebSocket stage progression service. Need to handle "Ready to Merge" → "Completed" transition.

### New Files

#### `adws/adw_complete_iso.py`
New isolated workflow script that:
- Takes issue_number and adw_id as arguments
- Validates state and worktree exist
- Calls adw_ship_iso logic to merge branch to main
- Clears the worktree after successful merge
- Marks the ADW state as completed
- Posts completion message to issue/kanban

#### `app/server/api/merge.py`
New API router for merge operations:
- POST `/api/merge/trigger` - Trigger merge workflow for an adw_id
- GET `/api/merge/status/{adw_id}` - Get merge status for an adw_id

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update ADW Data Types and State Management
- Add `completed` field to `ADWStateData` model in `adws/adw_modules/data_types.py` (Optional[bool] with default False)
- Add `mark_completed()` method to `ADWState` class in `adws/adw_modules/state.py` to set completed=True and save state
- Add `is_completed()` method to `ADWState` class to check if workflow is completed
- Update `format_adw_for_response()` in `app/server/api/adws.py` to include `completed` field in API response

### 2. Add Worktree Cleanup Functionality
- Add `remove_worktree()` function to `adws/adw_modules/worktree_ops.py` that:
  - Takes adw_id and worktree_path as parameters
  - Runs `git worktree remove <worktree_path>` command
  - Handles errors gracefully and logs results
  - Returns success/failure status

### 3. Create ADW Complete Workflow Script
- Create `adws/adw_complete_iso.py` script that:
  - Accepts issue_number and adw_id as required arguments
  - Loads ADW state and validates all fields are populated
  - Validates worktree exists
  - Calls the merge logic (reuse from adw_ship_iso.py or import as function)
  - After successful merge, calls `remove_worktree()` to clear the worktree
  - Marks the workflow as completed using `state.mark_completed()`
  - Posts completion message to GitHub issue
  - Saves final state

### 4. Create Merge API Endpoints
- Create `app/server/api/merge.py` with FastAPI router
- Add POST `/api/merge/trigger` endpoint that:
  - Accepts JSON body with `adw_id` and `issue_number`
  - Validates the ADW exists and is ready to merge
  - Triggers `adw_complete_iso.py` workflow using subprocess
  - Returns success/failure response with workflow status
- Add GET `/api/merge/status/{adw_id}` endpoint that:
  - Returns merge/completion status for the given adw_id
  - Includes completed flag, branch_name, and merge timestamp
- Register merge router in `app/server/main.py` or `app/server/server.py`

### 5. Update Frontend Kanban Stages
- Update `stages` array in `src/stores/kanbanStore.js` initial state to include:
  - `{ id: 'ready-to-merge', name: 'Ready to Merge', color: 'teal' }` (after 'document' stage)
  - `{ id: 'completed', name: 'Completed', color: 'green' }` (after 'ready-to-merge' stage)
- Ensure stages are in correct order: backlog → plan → build → test → review → document → ready-to-merge → completed → pr → errored

### 6. Add Merge Action to Kanban Store
- Add `triggerMergeWorkflow` action to `src/stores/kanbanStore.js` that:
  - Takes taskId as parameter
  - Gets task's adw_id and issue_number from task metadata
  - Calls ADW service to trigger merge
  - Handles success by moving task to 'completed' stage
  - Handles errors by moving task to 'errored' stage with error message

### 7. Create Merge Service Function
- Add `triggerMerge(adw_id, issue_number)` function to `src/services/api/adwService.js` that:
  - Makes POST request to `/api/merge/trigger` endpoint
  - Returns promise with merge result
  - Handles errors and network issues

### 8. Update KanbanCard Component for Merge Button
- In `src/components/kanban/KanbanCard.jsx`, add conditional "Merge" button that:
  - Only shows when `task.stage === 'ready-to-merge'`
  - Has merge icon and "Merge to Main" label
  - Calls `triggerMergeWorkflow(task.id)` when clicked
  - Shows loading state during merge operation
  - Positioned alongside other card action buttons

### 9. Update KanbanCard Component for Completed Stage
- In `src/components/kanban/KanbanCard.jsx`, add conditional rendering for completed stage:
  - When `task.stage === 'completed'`, show minimal card view:
    - Display only adw_id prominently
    - Show completion checkmark icon
    - Hide progress bar and detailed information in collapsed state
    - On click/expand, show full task details including:
      - Original title and description
      - Branch name that was merged
      - Completion timestamp
      - Link to merged PR/commits

### 10. Update Stage Progression Service
- In `src/services/websocket/stageProgressionService.js`:
  - Add support for automatic progression from 'document' to 'ready-to-merge' when all stages complete successfully
  - Add handler for 'completed' status updates from backend
  - Ensure WebSocket messages about completion properly update task stage

### 11. Testing and Validation
- Run `Validation Commands` to ensure zero regressions
- Test the complete flow:
  1. Create a test ADW workflow through all stages
  2. Verify card moves to "Ready to Merge" stage when all ADW stages complete
  3. Click "Merge" button and verify branch merges to main
  4. Verify worktree is cleaned up
  5. Verify card moves to "Completed" stage with minimal view
  6. Verify clicking completed card shows full details
  7. Test error scenarios (merge conflicts, missing worktree, etc.)

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd app/server && uv run python -m pytest tests/test_main.py -v` - Test main API endpoints including new merge endpoints
- `cd adws && uv run python adw_modules/state.py` - Validate ADWState changes don't break existing functionality
- `cd adws && uv run python -m pytest adw_tests/ -v` - Run ADW system tests to ensure no regressions
- `npm test` - Run frontend tests to validate kanban store and component changes
- `npm run build` - Ensure frontend builds successfully without errors

## Notes
- The "Ready to Merge" stage should be reached either manually (by moving a card) or automatically when ADW determines all stages are completed successfully
- The merge operation should be idempotent - if triggered multiple times, it should handle gracefully
- Worktree cleanup is critical to prevent disk space issues - ensure it always runs after successful merge
- The completed stage should preserve all task data even though the display is minimal - this allows full audit trail
- Consider adding a confirmation dialog before merge to prevent accidental merges
- The merge workflow should update the ADW state in the main repository (agents/{adw_id}/adw_state.json), not in the worktree, since the worktree will be deleted
- WebSocket notifications should inform connected clients when a merge completes so the UI updates in real-time
- Error handling is critical - if merge fails, the worktree should NOT be deleted to allow for debugging and retry
