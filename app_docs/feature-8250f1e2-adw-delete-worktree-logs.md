# Enhanced ADW Delete with Backend Confirmation and Logs Cleanup

**ADW ID:** 8250f1e2
**Date:** 2025-11-29
**Specification:** specs/issue-24-adw-8250f1e2-sdlc_planner-delete-worktree-logs.md

## Overview

Enhanced the ADW deletion workflow to follow a backend-first approach with comprehensive cleanup and real-time UI feedback. The system now deletes worktrees, agent logs, and related directories on the backend, then notifies the frontend via WebSocket. The frontend displays loading states and success/error notifications, ensuring data consistency and preventing orphaned state when deletion fails.

## What Was Built

- **Backend-first deletion flow**: Frontend waits for WebSocket confirmation before removing tasks
- **Comprehensive cleanup**: Backend removes worktrees, agent logs (`agents/{adw_id}/`), and all associated directories
- **Real-time notifications**: WebSocket broadcasts `worktree_deleted` events with success messages
- **Loading state management**: Tracks deletion progress per ADW ID with loading indicators
- **Toast notification system**: New reusable `NotificationToast` component for user feedback
- **Error handling**: Graceful failure handling with user-friendly error messages and retry capability
- **Enhanced tests**: Comprehensive backend and frontend test coverage for deletion workflows

## Technical Implementation

### Files Modified

- `src/stores/kanbanStore.js`: Added deletion state tracking (`deletingAdws` map), WebSocket handler for `system_log` events with `worktree_deleted` type, notification system (`addNotification`, `removeNotification`), and refactored `deleteWorktree` to wait for backend confirmation instead of optimistically deleting tasks
- `src/components/common/NotificationToast.jsx`: New component that displays toast notifications with success/error/warning/info types, auto-dismiss functionality, and stacked positioning
- `src/components/kanban/TaskDetailsModal.jsx`: Updated delete button to show loading state from store, display deletion errors, and keep modal open until WebSocket confirms deletion
- `adws/adw_modules/agent_directory_monitor.py`: Minor logging improvements for consistency
- `adws/adw_triggers/trigger_websocket.py`: WebSocket trigger updates (configuration changes)
- `src/App.jsx`: Integrated `NotificationToast` component into the main app layout
- `src/styles/brutalist-theme.css`: Added styles for notification toast z-index and positioning
- `server/tests/test_adw_delete_enhanced.py`: Comprehensive test suite covering log cleanup, WebSocket broadcasts, and edge cases (269 lines of new tests)
- `src/components/kanban/__tests__/DeleteWorkflowButton.test.jsx`: Frontend tests for delete button loading states and confirmation flow (309 lines of new tests)
- Updated existing test files to accommodate new notification state

### Key Changes

1. **Deletion state management**: Added per-ADW tracking with `deletingAdws: { [adw_id]: { loading, error } }` to support multiple concurrent deletions
2. **WebSocket-driven UI updates**: Frontend tasks are only removed after receiving `system_log` event with `event_type: 'worktree_deleted'` and matching `adw_id`
3. **Notification system**: Global notification queue with auto-dismiss timers, type-based styling (success/error/warning/info), and manual dismissal
4. **Backend broadcast**: Existing DELETE endpoint in `server/api/adws.py` already broadcasts WebSocket events; frontend now properly listens and reacts
5. **Error resilience**: Handles backend failures, WebSocket failures, and displays specific error messages to users

## How to Use

### Deleting an ADW Workflow

1. Open any task card in the Kanban board
2. Click the "Delete Workflow" button in the task details modal
3. Confirm deletion in the confirmation dialog
4. Observe the following behavior:
   - Delete button shows loading state with spinner and "Deleting..." text
   - Button is disabled to prevent duplicate requests
   - Task card remains visible on the board
5. Wait for backend processing (typically < 2 seconds)
6. Backend deletes:
   - Git worktree directory (`trees/{adw_id}/`)
   - Agent logs and state (`agents/{adw_id}/`)
   - Kills processes on allocated ports
7. WebSocket broadcasts `worktree_deleted` event
8. Frontend receives event and:
   - Removes task card from the board
   - Displays success notification toast: "ADW {adw_id} deleted successfully"
   - Clears loading state
9. Notification auto-dismisses after 5 seconds (or manually close with X button)

### Error Handling

If deletion fails:
- Error notification appears with specific error message
- Delete button returns to normal state (re-enabled)
- Task card remains on the board
- Users can retry deletion or cancel the operation

## Configuration

No additional configuration required. The feature uses existing WebSocket infrastructure and backend DELETE endpoint.

### Notification Settings

Default notification durations:
- Success: 5000ms (5 seconds)
- Error: 7000ms (7 seconds)
- Warning: 5000ms
- Info: 5000ms

Notifications can be manually dismissed at any time using the close (X) button.

## Testing

### Backend Tests

Run backend tests to verify comprehensive cleanup:

```bash
uv run pytest server/tests/test_adw_delete_enhanced.py -v
```

Tests cover:
- All subdirectories in `agents/{adw_id}/` are deleted
- Multiple trigger types with logs are cleaned up
- WebSocket broadcasts contain correct `event_type` and `adw_id`
- Deletion with deeply nested log files
- Concurrent deletion requests (idempotency)

### Frontend Tests

Run frontend tests to verify UI behavior:

```bash
npm run test
```

Tests in `src/components/kanban/__tests__/DeleteWorkflowButton.test.jsx` cover:
- Delete button shows loading state when clicked
- Task remains on board while deletion is in progress
- Task is removed only after WebSocket confirmation
- Error notification appears if backend deletion fails
- Success notification appears on successful deletion
- Confirmation modal behavior during deletion

### Manual Testing

1. Start the server: `cd server && uv run uvicorn server:app --reload --port 8001`
2. Start the frontend: `npm run dev`
3. Create a test ADW workflow to generate logs
4. Verify `agents/{adw_id}/` and `trees/{adw_id}/` directories exist
5. Click delete on a task card
6. Verify loading state appears (spinner, "Deleting..." text)
7. Verify card does NOT immediately disappear
8. Wait for WebSocket notification (< 2 seconds)
9. Verify success toast appears: "ADW {adw_id} deleted successfully"
10. Verify card disappears from board
11. Verify `agents/{adw_id}/` and `trees/{adw_id}/` directories are deleted
12. Run `git worktree list` to confirm worktree removal

## Notes

- **Backend DELETE endpoint**: Existing endpoint in `server/api/adws.py` (lines 440-598) already handles comprehensive cleanup via `shutil.rmtree(adw_dir)` and `git worktree remove --force`
- **WebSocket reliability**: The system relies on WebSocket connection for UI updates. If WebSocket is disconnected, users may need to refresh the page to see the final deletion state
- **Idempotency**: Deletion operations are idempotent - attempting to delete a non-existent ADW returns appropriate error messages
- **Performance**: Deletion state is tracked per ADW ID, allowing multiple concurrent deletions without conflicts
- **Notification z-index**: Toast notifications use `z-index: 9999` to appear above all other UI elements, including modals
- **Future improvements**: Consider adding timeout handling (e.g., 30 seconds) if WebSocket confirmation never arrives, and retry mechanisms for failed deletions
