# Chore: Display WebSocket Logs on Frontend Cards

## Metadata
issue_number: `53`
adw_id: `6630e591`
issue_json: `{"number":53,"title":"I dont see the logs on my frontend cards","body":"I dont see the logs on my frontend cards. \nthere are great details right now we are getting from the websocket. ensure that all of them are captured and used in our frontend."}`

## Chore Description
The frontend is currently not displaying the rich log data being sent through WebSocket connections. The WebSocket service is receiving various event types including:
- `agent_log` - Individual log entries with detailed context
- `thinking_block` - Claude Code thinking blocks
- `tool_use_pre` / `tool_use_post` - Tool execution events with inputs/outputs
- `text_block` - Text blocks from agent output
- `agent_output_chunk` - Raw output chunks
- `file_changed` - File operation notifications
- `agent_summary_update` - Agent state summaries

While the WebSocket infrastructure is properly configured to receive these events, the frontend components need to be enhanced to:
1. Properly capture all WebSocket event types in the store
2. Display detailed log information in the card components
3. Show rich metadata like tool names, usage statistics, thinking blocks, and file changes
4. Utilize the existing `DetailedLogEntry` component for enhanced log display

## Relevant Files
Use these files to resolve the chore:

- **src/stores/kanbanStore.js** (lines 105, 1314-1417, 1448-1451)
  - Central state management for workflow logs
  - Contains `taskWorkflowLogs` mapping and `handleWorkflowLog` function
  - Already has event listeners registered for various WebSocket events
  - Needs enhancement to capture and store all rich log data from WebSocket events

- **src/services/websocket/websocketService.js** (lines 334-521)
  - Handles all incoming WebSocket messages via `handleMessage` function
  - Already has cases for: `agent_log`, `thinking_block`, `tool_use_pre`, `tool_use_post`, `text_block`, `file_changed`, `summary_update`
  - These events are being emitted but not fully captured in the store
  - Properly configured to receive detailed log events

- **src/components/kanban/WorkflowLogViewer.jsx** (entire file)
  - Displays workflow logs with filtering, search, and export
  - Has `detailedView` prop that enables `DetailedLogEntry` component
  - Currently displays basic log information only
  - Needs to be configured to use detailed view for richer display

- **src/components/kanban/DetailedLogEntry.jsx** (entire file)
  - Already built to display rich log metadata including:
    - Entry type badges (system, assistant, user, result)
    - Tool names and inputs
    - Token usage statistics (input, output, cache read/write)
    - Raw JSON data with collapsible sections
  - Currently available but not utilized
  - Ready to display the enhanced log data

- **src/components/kanban/CardExpandModal.jsx** (lines 479-515)
  - Modal that displays expanded card details
  - Contains `StageLogsViewer` which wraps `WorkflowLogViewer`
  - Currently passes standard props to the viewer
  - Needs to enable detailed view mode

- **src/components/kanban/KanbanCard.jsx** (lines 342-348)
  - Card component showing task summary
  - Displays log count but not detailed log information
  - Could benefit from showing recent log indicators

- **.claude/commands/conditional_docs.md** (lines 65-78)
  - Documentation about WebSocket message handling
  - References the `workflow_log` event handling feature
  - Provides context on the infrastructure already in place

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Enhance Store to Capture Rich WebSocket Event Data
- Update `src/stores/kanbanStore.js` to add event handlers that capture all WebSocket event types beyond just `workflow_log`
- Add handlers for: `agent_log`, `thinking_block`, `tool_use_pre`, `tool_use_post`, `text_block`, `file_changed`, `agent_summary_update`
- Transform these events into enriched log entries with the full payload structure expected by `DetailedLogEntry` component
- Store the enriched log entries in `taskWorkflowLogs` alongside existing workflow logs
- Ensure all log entries have required fields: `entry_type`, `subtype`, `message`, `timestamp`, `tool_name` (if applicable), `tool_input`, `usage`, `raw_data`
- Map WebSocket event types to appropriate `entry_type` values:
  - `agent_log` → "system" or based on log level
  - `thinking_block` → "assistant"
  - `tool_use_pre` → "assistant" with subtype "tool_call"
  - `tool_use_post` → "result"
  - `text_block` → "assistant"
  - `file_changed` → "system" with subtype "file_operation"

### Step 2: Enable Detailed Log View in WorkflowLogViewer
- Update `src/components/kanban/WorkflowLogViewer.jsx` to default `detailedView` prop to `true` or add logic to detect when rich log data is present
- Ensure the detailed view properly renders all enhanced log properties
- Verify that the log filtering, searching, and export functions work with the enriched data structure
- Test that performance remains acceptable with larger log datasets

### Step 3: Update CardExpandModal to Show Detailed Logs
- Modify `src/components/kanban/CardExpandModal.jsx` to pass `detailedView={true}` to the `StageLogsViewer` component
- Ensure the modal properly displays the enhanced log entries with all metadata
- Verify that collapsible sections in `DetailedLogEntry` work correctly within the modal scroll container
- Test the log viewer within the modal with real WebSocket data

### Step 4: Enhance KanbanCard with Log Indicators
- Update `src/components/kanban/KanbanCard.jsx` to show visual indicators when rich logs are available
- Display the most recent log entry type or severity level as a badge
- Consider adding a small preview of the latest log message
- Ensure the indicators are visually distinct and don't clutter the card UI

### Step 5: Test WebSocket Integration End-to-End
- Start the WebSocket server and trigger workflows
- Verify that all WebSocket event types are properly captured in the store
- Confirm that the frontend displays all log details including:
  - Tool names and inputs
  - Token usage statistics
  - Thinking blocks
  - File changes
  - Raw event data
- Test log filtering, searching, and export with the enhanced data
- Verify that the UI remains responsive with multiple concurrent workflows

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards
- `npm run build` - Build the frontend to ensure no build errors
- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The WebSocket infrastructure is already properly configured and emitting all event types
- The `DetailedLogEntry` component is already built and ready to display rich log data
- The main work is connecting the WebSocket events to the store and enabling the detailed view
- Performance considerations: The store already limits logs to 500 entries per task to prevent memory issues
- The enhanced log data will significantly improve debugging and monitoring capabilities
- Consider adding a toggle in the UI to switch between simple and detailed log views for user preference
- The server is sending detailed structured data including token usage, tool executions, and thinking blocks - all of this should now be visible
