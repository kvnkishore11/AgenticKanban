# Chore: Fix Logs Display and Reverse Log Order

## Metadata
issue_number: `76`
adw_id: `60fc5163`
issue_json: `{"number":76,"title":"I am not able to see my logs now after some recent...","body":"I am not able to see my logs now after some recent changes. can you try to fix this issue. also One more change I want is that the older logs should show at the bottom and the latest logs should be on the top..\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/eb8a2b83-01ac-443e-9c6d-17382a1e31eb)\n\n"}`

## Chore Description
The user is experiencing two issues with the workflow log viewer:

1. **Logs not displaying**: After recent changes (specifically commit 62b4551 - "feat: implement robust WebSocket manager with agent-level streaming"), logs are no longer visible in the workflow log viewer
2. **Log ordering**: The user wants newer logs at the top and older logs at the bottom (reversed from current behavior)

Based on code analysis, the logs are currently being appended to the array in chronological order (oldest first), and the UI displays them in the same order. The user wants the display order reversed so that the most recent log entries appear at the top of the viewer.

The root cause of logs not displaying could be:
- Changes in the WebSocket message handling from the recent streaming implementation
- Changes in how logs are stored or retrieved from the kanbanStore
- Issues with the log viewer component not receiving or rendering logs properly

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/WorkflowLogViewer.jsx:90-96` - Contains the `filteredLogs` logic that determines which logs are displayed. This is where we need to add `.reverse()` to change the display order.
- `src/components/kanban/WorkflowLogViewer.jsx:302-309, 314-373` - The two map functions that render the logs in both detailed and simple view modes.
- `src/components/kanban/StageLogsViewer.jsx:125-149` - Component that uses WorkflowLogViewer and may need updates to ensure logs are properly formatted and passed through.
- `src/stores/kanbanStore.js:1389-1408` - The `appendWorkflowLog` function that adds new log entries to the task's log array. Currently appends to the end (chronological order).
- `src/stores/kanbanStore.js:1315-1334` - The `handleWorkflowLog` function that processes incoming WebSocket log events and calls `appendWorkflowLog`.
- `src/stores/kanbanStore.js:1439-1442` - The `getWorkflowLogsForTask` function that retrieves logs for display.
- `src/stores/kanbanStore.js:105` - The `taskWorkflowLogs` state property definition (Map of taskId -> Array<logEntry>).
- `src/services/websocket/websocketService.js:41` - The `workflow_log` event listener registration.
- `src/services/websocket/websocketService.js:397, 413, 420-421` - Three locations where `workflow_log` events are emitted.
- `adws/adw_triggers/trigger_websocket.py:1004-1027` - WebSocket server handler for `workflow_log` message type.
- `adws/adw_triggers/trigger_websocket.py:1476-1530` - HTTP endpoint `receive_workflow_update` that handles workflow log broadcasts.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Investigate Current Log Flow and Identify Display Issues
- Read the recent git commits to understand what changed in the WebSocket streaming implementation
- Test the current application to verify if logs are actually not displaying or if there's a UI rendering issue
- Check browser console for any JavaScript errors related to log rendering
- Verify that WebSocket connections are working and `workflow_log` events are being received
- Check if the `taskWorkflowLogs` state is being populated correctly in the kanbanStore
- Trace the data flow: WebSocket event → `handleWorkflowLog` → `appendWorkflowLog` → `getWorkflowLogsForTask` → WorkflowLogViewer component

### Step 2: Fix Log Display Issues (if logs are not appearing)
- If logs are not being received via WebSocket:
  - Verify the WebSocket connection is established in `src/services/websocket/websocketService.js`
  - Check that `workflow_log` event listeners are properly registered in `src/stores/kanbanStore.js:973`
  - Ensure the server-side is broadcasting workflow logs correctly in `adws/adw_triggers/trigger_websocket.py`
- If logs are received but not displayed:
  - Check the `filteredLogs` logic in `src/components/kanban/WorkflowLogViewer.jsx:90-96`
  - Verify the WorkflowLogViewer component is receiving the logs prop correctly
  - Check for any filtering logic that might be hiding logs
  - Verify the StageLogsViewer is passing logs correctly to WorkflowLogViewer
- Add console.log statements to trace where the logs are getting lost in the chain
- Fix any identified issues with log display

### Step 3: Implement Reverse Log Order (Latest First)
- Modify `src/components/kanban/WorkflowLogViewer.jsx:90-96` to reverse the filtered logs before rendering:
  ```javascript
  // Current code:
  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'all' || log.level?.toUpperCase() === filterLevel.toUpperCase();
    const searchMatch = !searchQuery ||
      log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.current_step?.toLowerCase().includes(searchQuery.toLowerCase());
    return levelMatch && searchMatch;
  });

  // Change to:
  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'all' || log.level?.toUpperCase() === filterLevel.toUpperCase();
    const searchMatch = !searchQuery ||
      log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.current_step?.toLowerCase().includes(searchQuery.toLowerCase());
    return levelMatch && searchMatch;
  }).reverse(); // Add reverse() to show newest logs first
  ```
- Update the auto-scroll behavior in `src/components/kanban/WorkflowLogViewer.jsx:39-44` since we reversed the order:
  - With reversed order, new logs appear at the top, so we may want to scroll to the top instead of bottom
  - OR keep scrolling to bottom but adjust the logic since the newest entry is now at index 0
  - Consider if auto-scroll should scroll to top (where new logs appear) or maintain current viewport position
- Update the scroll detection logic in `src/components/kanban/WorkflowLogViewer.jsx:138-146` to work correctly with reversed order
- Test that the log export functionality still works correctly with reversed display order (the exported logs should maintain chronological order for readability)

### Step 4: Update Auto-Scroll Behavior for Reversed Order
- Modify `src/components/kanban/WorkflowLogViewer.jsx:39-44` to handle auto-scroll with reversed order:
  - Since new logs now appear at the top, decide whether to:
    - Scroll to top (scrollTop = 0) when new logs arrive
    - OR disable auto-scroll by default since users typically read from top to bottom
  - Update the implementation accordingly
- Update `src/components/kanban/WorkflowLogViewer.jsx:138-146` scroll detection:
  - Change "isAtBottom" check to "isAtTop" check if scrolling to top
  - Adjust the logic: `const isAtTop = scrollTop < 10;`
- Test that manual scrolling doesn't interfere with reading older logs

### Step 5: Add Documentation and Comments
- Add a comment in `WorkflowLogViewer.jsx` explaining that logs are displayed in reverse chronological order (newest first)
- Add inline comments explaining the auto-scroll behavior with reversed logs
- Document the reasoning for the display order choice in code comments

### Step 6: Run Validation Commands
- Start the development server and test the log viewer
- Verify logs are displayed correctly in the UI
- Verify logs appear in reverse chronological order (newest at top)
- Test that filtering still works correctly
- Test that search functionality still works correctly
- Test that auto-scroll behavior works as expected
- Test that log export (both text and JSON) works correctly
- Test with both simple and detailed view modes
- Test the StageLogsViewer tabs to ensure all log views work correctly
- Run all validation commands listed below

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are correct
- `npm run lint` - Verify no linting errors were introduced
- Manual testing in browser:
  - Start a workflow and verify logs appear in real-time
  - Verify newest logs appear at the top
  - Verify older logs appear at the bottom
  - Test log filtering by level
  - Test log search functionality
  - Test auto-scroll behavior
  - Test log export (text and JSON formats)
  - Test both simple and detailed view modes
  - Test all stage log tabs (All, Plan, Build, Test, Review, Document)

## Notes
- The reversal should be done in the UI layer (WorkflowLogViewer component) rather than in the store, to keep the underlying data in chronological order for consistency
- The store should continue to maintain logs in chronological order (oldest to newest) for easier appending and data consistency
- Only the display order in the UI should be reversed
- Consider the user experience: most log viewers show newest entries at the top, which aligns with the user's request
- The auto-scroll behavior needs careful consideration: with reversed order, should we scroll to top (where new logs appear) or keep scrolling to bottom?
- Export functionality should maintain chronological order in the exported file for better readability when analyzing logs offline
- The recent WebSocket streaming changes (commit 62b4551) added new event types but shouldn't have broken existing `workflow_log` events - investigate if there's a configuration or initialization issue
