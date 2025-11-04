# Chore: Show Detailed Agent Logs

## Metadata
issue_number: `46`
adw_id: `895b643e`
issue_json: `{"number":46,"title":"I want to see even more detailed logs","body":"I want to see even more detailed logs. If you can have access to teh files system. the agent logs are present in the folder agents/{adw_id}. There are great details in it. like there are streams of what is happenign currenlty in jsonl of the subagent folder. see the image for reference. also visit those files to see how they can be accomplished.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/734bd899-3083-4ac8-bcce-afd134be68a7)\n\n"}`

## Chore Description
The user wants to see more detailed agent logs from the ADW (AI Developer Workflow) execution. Currently, the system displays real-time logs via WebSocket and stage-specific logs from `raw_output.jsonl` files, but there are additional valuable log sources in the `agents/{adw_id}` directory that are not being surfaced to the user.

The agent folders contain:
- **raw_output.jsonl** - Stream of all agent activity (tool calls, responses, errors) in JSONL format
- **prompts/** folder - Contains the prompts sent to the agent
- **adw_state.json** - Contains workflow state metadata
- Multiple subagent folders (sdlc_planner, sdlc_implementor, branch_generator, ops, etc.) - Each with their own raw_output.jsonl streams

These detailed logs would provide users with:
- Complete visibility into agent decision-making
- Tool calls and responses from Claude Code
- Prompts sent to the agent
- Session metadata
- Error details and stack traces
- Token usage statistics

This chore will enhance the existing StageLogsViewer component to:
1. Display the full raw_output.jsonl stream in a more detailed format
2. Show additional metadata from each JSONL entry (type, subtype, session_id, usage stats)
3. Provide access to the prompts sent to agents
4. Display adw_state.json information
5. Add export functionality for detailed debugging

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/StageLogsViewer.jsx** - Main component that displays stage-specific logs with tabs for Plan, Build, Test, Review, Document. This component fetches stage logs from the backend API and displays them using WorkflowLogViewer. We'll enhance this to show more detailed information from the raw_output.jsonl stream.

- **src/components/kanban/WorkflowLogViewer.jsx** - Log viewer component with filtering, search, auto-scroll, and export capabilities. Currently displays formatted log entries with level, timestamp, and message. We'll extend this to handle the richer JSONL data format.

- **server/api/stage_logs.py** - Backend API endpoint that reads logs from `agents/{adw_id}/{stage_folder}/raw_output.jsonl`. Currently parses basic fields (timestamp, level, message). We'll enhance to parse and return the full JSONL structure including metadata, tool calls, and session information.

- **src/stores/kanbanStore.js** - Zustand store that manages application state including log fetching. Contains `fetchStageLogsForTask` and `getStageLogsForTask` functions. We may need to update state management to handle richer log data.

- **src/components/kanban/TaskDetailsModal.jsx** - Modal that displays task details including the StageLogsViewer. This is where users access the stage logs. May need minor updates to handle new log detail features.

- **src/components/kanban/CardExpandModal.jsx** - Another location where stage logs are displayed via StageLogsViewer.

### New Files
- **src/components/kanban/DetailedLogEntry.jsx** - New component to display a single detailed log entry with collapsible sections for tool calls, metadata, and raw JSON. This component will handle the rich JSONL format and provide expand/collapse functionality for complex entries.

- **src/components/kanban/AgentStateViewer.jsx** - New component to display the adw_state.json information including workflow metadata, ports, model configuration, and execution status.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Enhance Backend API to Parse Full JSONL Structure
Update the stage logs API endpoint to extract and return the complete JSONL data structure instead of just basic fields.

- Edit `server/api/stage_logs.py:parse_jsonl_logs()` function to extract all fields from JSONL entries:
  - Parse `type` field (system, assistant, user)
  - Parse `subtype` field (init, tool_use, tool_result, etc.)
  - Extract tool call information (tool name, parameters)
  - Extract usage statistics (input_tokens, output_tokens, cache info)
  - Parse message content and format appropriately
  - Keep the full `raw_data` for detailed view
- Update `LogEntry` Pydantic model to include new fields:
  - `entry_type: Optional[str]` - The type field from JSONL
  - `subtype: Optional[str]` - The subtype field
  - `tool_name: Optional[str]` - Name of tool being called
  - `tool_input: Optional[Dict[str, Any]]` - Tool call parameters
  - `usage: Optional[Dict[str, Any]]` - Token usage statistics
  - `session_id: Optional[str]` - Agent session identifier
- Test the updated endpoint with curl to verify all fields are returned

### 2. Create Detailed Log Entry Component
Build a new component to display individual log entries with rich formatting and collapsible sections.

- Create `src/components/kanban/DetailedLogEntry.jsx`
- Design the component to show:
  - Entry type badge (system/assistant/user)
  - Timestamp and session ID
  - Tool call information with syntax highlighting
  - Message content with markdown rendering
  - Usage statistics (tokens, cache hits)
  - Collapsible raw JSON viewer
- Add expand/collapse functionality for long entries
- Style with appropriate colors for different entry types
- Add copy-to-clipboard functionality for debugging

### 3. Add Agent State Viewer Component
Create a component to display the adw_state.json information.

- Create new backend endpoint `GET /api/agent-state/{adw_id}` in `server/api/stage_logs.py`
  - Read `agents/{adw_id}/adw_state.json`
  - Return parsed JSON with metadata
- Create `src/components/kanban/AgentStateViewer.jsx`
  - Display adw_id, issue_number, branch_name
  - Show model_set configuration
  - Display port assignments (frontend, backend, websocket)
  - Show workflow stages completed (all_adws)
  - Add timestamp for when state was last updated
- Add this viewer as a tab or section in StageLogsViewer

### 4. Update Kanban Store to Handle Detailed Logs
Enhance the Zustand store to manage the richer log data structure.

- Update `src/stores/kanbanStore.js:fetchStageLogsForTask()` to handle new log fields
- Add state for agent metadata (adw_state.json data)
- Create action `fetchAgentState(taskId, adwId)` to retrieve adw_state.json
- Update log storage to preserve full JSONL structure
- Ensure backward compatibility with existing log display

### 5. Enhance Stage Logs Viewer
Update the StageLogsViewer to display detailed logs with the new components.

- Edit `src/components/kanban/StageLogsViewer.jsx`:
  - Add "Detailed View" toggle option
  - When detailed view is enabled, use DetailedLogEntry component instead of basic log display
  - Add "Agent State" tab to show adw_state.json information
  - Add "Prompts" section to display prompts sent to agent (if available in prompts/ folder)
  - Maintain backward compatibility with simple log view
  - Update formatStageLogsForViewer to handle new fields
- Update WorkflowLogViewer to optionally render DetailedLogEntry components

### 6. Add Export Functionality for Detailed Logs
Enhance log export to include all detailed information.

- Update `src/components/kanban/WorkflowLogViewer.jsx:handleExportLogs()`:
  - Add option to export as JSON (full JSONL structure)
  - Add option to export as formatted text (human-readable)
  - Include session metadata in exports
  - Add timestamp and adw_id to export filename
- Add export button for agent state JSON
- Test export functionality with large log files

### 7. Update UI Components to Use Enhanced Logs
Update the components that display logs to leverage the new detailed view.

- Update `src/components/kanban/TaskDetailsModal.jsx` to pass detailed view settings to StageLogsViewer
- Update `src/components/kanban/CardExpandModal.jsx` to use detailed log display
- Add user preference for default log view (simple vs detailed) - store in localStorage
- Ensure loading states work correctly with detailed logs

### 8. Add Documentation and Help Text
Provide users with information about the new detailed log features.

- Add tooltip/help text to explain what each log field means
- Add documentation for:
  - Entry types (system, assistant, user)
  - Tool call format
  - Usage statistics
  - Session IDs
- Add inline help in the UI for interpreting JSONL data
- Consider adding a "Log Legend" expandable section

### 9. Performance Optimization
Ensure the detailed logs display performs well with large log files.

- Implement virtualization for long log lists (use react-window or similar)
- Add pagination option for logs (show 50/100/all entries)
- Lazy load detailed view components (only expand when user clicks)
- Add debouncing to search/filter operations
- Test with large JSONL files (1000+ entries)
- Monitor and optimize re-render performance

### 10. Run Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- Start the application and manually test:
  - View detailed logs for a completed workflow
  - Toggle between simple and detailed log views
  - Export logs in JSON and text formats
  - View agent state information
  - Verify loading states and error handling
  - Test with different workflow stages (plan, build, test, etc.)
  - Ensure existing functionality still works (real-time logs, basic stage logs)

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards
- Manual testing checklist:
  - Start application (frontend + backend + websocket)
  - Trigger a workflow and view real-time logs
  - View detailed logs for completed workflow stages
  - Toggle between simple and detailed log views
  - Export logs in both JSON and text formats
  - View agent state JSON
  - Test with multiple concurrent workflows
  - Verify performance with large log files
  - Ensure no regressions in existing log viewing features

## Notes
- The `agents/{adw_id}` directory is located at the project root, not in the worktree
- Each subagent folder (sdlc_planner, sdlc_implementor, etc.) has its own raw_output.jsonl file with detailed execution logs
- The JSONL format contains entries with different types:
  - `type: "system"` - System initialization and configuration
  - `type: "assistant"` - Agent responses and tool calls
  - `type: "user"` - User messages and tool results
- The `prompts/` folder structure varies by subagent - some may not have prompts saved
- Consider adding a "raw view" mode that shows the JSONL exactly as stored on disk for advanced debugging
- Token usage statistics are valuable for understanding performance and cost
- Session IDs help correlate log entries from the same agent execution
- The existing stage logs API already handles the main project vs worktree path resolution correctly
- Ensure the detailed log view doesn't overwhelm users - provide progressive disclosure with expand/collapse
- Consider adding a search feature that searches across all subagent logs for a workflow
- Future enhancement: Add live-streaming of raw_output.jsonl during active workflows
