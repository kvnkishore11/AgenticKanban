# Feature: Add Stage-Specific Logs with Tabbed Interface

## Metadata
issue_number: `9`
adw_id: `7aa4a506`
issue_json: `{"number":9,"title":"All the logs of only plan and build are only seen...","body":"All the logs of only plan and build are only seen within the cards. u should also add logs of every stage. may be with in teh card u can have some thing like tabbed (P | B | T| R | D) So I cna click on each tab to see more details. \n\nto give you more information agents/{adw_id} has lot of information of what is happenign. you can refer to any successful agent to see what all details you can actually show up from the websocket. they are foldres of each stage. with in each stage there is jsonl -> streaming data as well and json gives what happened there as well. see if that is of some help"}`

## Feature Description
This feature enhances the kanban card log viewer to display stage-specific logs for all ADW workflow stages (Plan, Build, Test, Review, Deploy/Document) in a tabbed interface. Currently, the WorkflowLogViewer only shows combined logs from the WebSocket stream. This feature will allow users to click on individual stage tabs (P | B | T | R | D) to view detailed logs from each stage, including both streaming logs (.jsonl) and final results (.json) stored in the agents/{adw_id} directory structure.

## User Story
As a user viewing an ADW workflow
I want to see logs for each specific stage (Plan, Build, Test, Review, Deploy) in separate tabs
So that I can quickly navigate to and inspect the details of any particular stage without scrolling through all combined logs

## Problem Statement
The current log viewer shows only real-time WebSocket logs in a single view, which makes it difficult to:
- Isolate logs from specific workflow stages
- Access historical logs for completed stages
- Understand which stage produced which log entries
- Navigate efficiently to troubleshoot stage-specific issues
- View structured output from each stage's .json files

The agents/{adw_id} directory contains rich stage-specific data (each stage has its own folder with .jsonl streaming logs and .json result files), but this data is not accessible through the UI.

## Solution Statement
Implement a tabbed log viewer that:
1. Adds tabs for each workflow stage (Plan, Build, Test, Review, Deploy/Document)
2. Fetches and displays stage-specific logs from the agents/{adw_id}/{stage_folder} directory
3. Shows both streaming logs (.jsonl) and final results (.json) for each stage
4. Maintains the existing real-time log viewer as an "All" or "Live" tab
5. Provides a clean, intuitive UI to switch between stages

## Relevant Files
Use these files to implement the feature:

### Frontend Components
- **src/components/kanban/KanbanCard.jsx** (671 lines) - Main card component that renders the WorkflowLogViewer. Need to enhance to pass stage information and handle tabbed interface.
- **src/components/kanban/WorkflowLogViewer.jsx** (301 lines) - Current log viewer with filtering, search, and export. This will be enhanced to support tabbed interface with stage-specific logs.
- **src/stores/kanbanStore.js** (lines 1259-1406) - Zustand store that manages workflow logs. Need to add state for stage-specific logs and methods to fetch them.

### Backend API
- **app/server/api/adws.py** - Contains ADW discovery endpoints. Need to add new endpoint to fetch stage-specific logs from agents/{adw_id}/{stage_folder} directories.

### WebSocket Integration
- **src/services/websocket/websocketService.js** - Handles WebSocket messages and log streaming. May need to enhance to identify stage information from current_step field for better categorization.

### Data Source
- **agents/{adw_id}/adw_state.json** - Contains workflow state including which stages have been executed
- **agents/{adw_id}/{stage_folder}/raw_output.jsonl** - Streaming logs for each stage (e.g., sdlc_planner, sdlc_implementor, etc.)
- **agents/{adw_id}/{stage_folder}/raw_output.json** - Final structured output for each stage

### Configuration and Documentation
- **adws/README.md** - Contains ADW architecture documentation explaining the agents directory structure and stage folders

### New Files

#### API Endpoint File
- **app/server/api/stage_logs.py** - New API endpoint to fetch stage-specific logs from agents/{adw_id}/{stage_folder} directories, parse .jsonl and .json files, and return structured log data

#### Component Files
- **src/components/kanban/StageLogsViewer.jsx** - New component implementing the tabbed interface for stage-specific logs, wrapping the existing WorkflowLogViewer for each tab

#### E2E Test File
- **.claude/commands/e2e/test_stage_logs_tabs.md** - E2E test to validate the tabbed stage logs interface works correctly

## Implementation Plan

### Phase 1: Foundation
1. **Research and map the agents directory structure** - Understand how stage folders map to workflow stages (plan → sdlc_planner, build → sdlc_implementor, test → tester, review → reviewer, document → documenter)
2. **Design the API contract** - Define request/response format for fetching stage-specific logs including both .jsonl streaming data and .json final results
3. **Design the component architecture** - Plan how tabs will be organized, how data flows from API to components, and how to reuse existing WorkflowLogViewer

### Phase 2: Core Implementation
1. **Create backend API endpoint** (app/server/api/stage_logs.py) to:
   - Accept adw_id and stage parameters
   - Read from agents/{adw_id}/{stage_folder} directories
   - Parse .jsonl files for streaming logs
   - Parse .json files for final results
   - Return structured log data with timestamps and metadata
2. **Update kanbanStore** to:
   - Add state for stage-specific logs (stageLogsCache: { [taskId]: { [stage]: logs } })
   - Add action fetchStageLogsForTask(taskId, adwId, stage)
   - Add getter getStageLogsForTask(taskId, stage)
3. **Create StageLogsViewer component** that:
   - Renders tabs for Plan, Build, Test, Review, Deploy/Document
   - Shows "All Logs" tab for current real-time combined view
   - Fetches stage-specific logs when tab is clicked
   - Reuses WorkflowLogViewer for displaying logs within each tab
   - Handles loading states and empty states
   - Maps stage names to folder names (Plan → sdlc_planner, etc.)

### Phase 3: Integration
1. **Update KanbanCard** to:
   - Replace WorkflowLogViewer with StageLogsViewer
   - Pass adw_id from task metadata to StageLogsViewer
   - Ensure proper task ID and workflow context is available
2. **Style the tabbed interface** using existing Tailwind CSS patterns from the codebase
3. **Add error handling** for cases where stage folders don't exist or logs are incomplete
4. **Update WorkflowLogViewer** to accept a `logsSource` prop to distinguish between "all" logs and stage-specific logs

## Step by Step Tasks

### 1. Research ADW Directory Structure and Stage Mapping
- Read adws/README.md to understand the complete ADW architecture
- Examine the agents/{adw_id} directory structure for a completed workflow
- Map stage names to folder names:
  - Plan → sdlc_planner, adw_plan_iso
  - Build → sdlc_implementor, adw_build_iso
  - Test → tester, adw_test_iso
  - Review → reviewer, adw_review_iso
  - Deploy/Document → documenter, adw_document_iso, ops
- Document the .jsonl and .json file formats for each stage
- Identify how to extract adw_id from task metadata in the kanban store

### 2. Create Backend API Endpoint for Stage Logs
- Create app/server/api/stage_logs.py with endpoint GET /api/stage-logs/<adw_id>/<stage>
- Implement logic to:
  - Validate adw_id and stage parameters
  - Map stage name to folder name (support multiple folder patterns per stage)
  - Read agents/{adw_id}/{stage_folder}/raw_output.jsonl
  - Read agents/{adw_id}/{stage_folder}/raw_output.json
  - Parse JSONL streaming data line by line
  - Combine streaming logs with final result
  - Return JSON response with { stage, logs: [], result: {} }
- Add error handling for missing directories or files
- Add unit tests in app/server/tests/ for the new endpoint

### 3. Update Kanban Store for Stage-Specific Logs
- Add stageLogsCache state: { [taskId]: { [stage]: { logs: [], result: {}, loading: boolean } } }
- Implement fetchStageLogsForTask(taskId, adwId, stage) action:
  - Set loading state
  - Call /api/stage-logs/<adw_id>/<stage>
  - Update cache with results
  - Handle errors gracefully
- Implement getStageLogsForTask(taskId, stage) selector
- Add clearStageLogsCache(taskId) for cleanup

### 4. Create E2E Test File
- Create .claude/commands/e2e/test_stage_logs_tabs.md based on test_basic_query.md and test_websocket_integration.md
- Define test steps to:
  - Navigate to kanban board
  - Find a card with completed ADW workflow
  - Click on the log viewer
  - Verify tabs are visible (All, Plan, Build, Test, Review, Deploy)
  - Click on each tab and verify logs appear
  - Verify tab content is different for each stage
  - Take screenshots of each tab
- Define success criteria

### 5. Create StageLogsViewer Component
- Create src/components/kanban/StageLogsViewer.jsx
- Implement tabbed interface with tabs: All | Plan | Build | Test | Review | Deploy
- Use Lucide icons for stage indicators (FileText for Plan, Hammer for Build, etc.)
- Connect to kanbanStore to fetch stage-specific logs on tab click
- Show loading spinner while fetching stage logs
- Show empty state if no logs exist for a stage
- Pass stage-specific logs to WorkflowLogViewer component
- Add tab highlighting for active stage
- Implement keyboard navigation (arrow keys to switch tabs)

### 6. Update WorkflowLogViewer for Stage-Specific Display
- Add logsSource prop to WorkflowLogViewer ('all' | 'plan' | 'build' | 'test' | 'review' | 'deploy')
- Update header to show stage name when displaying stage-specific logs
- Enhance log formatting to handle .json result data (pretty print JSON objects)
- Add indicator showing if logs are from real-time stream or historical stage data

### 7. Update KanbanCard to Use StageLogsViewer
- Import StageLogsViewer instead of WorkflowLogViewer
- Extract adw_id from task metadata (check task.metadata, task.workflow_info, or derive from logs)
- Pass taskId and adwId to StageLogsViewer
- Update prop passing to support new component interface
- Ensure backward compatibility for tasks without adw_id

### 8. Style the Tabbed Interface
- Use Tailwind CSS classes consistent with existing codebase style
- Style tabs with hover effects, active state highlighting
- Ensure responsive design for mobile/tablet views
- Add smooth transitions when switching tabs
- Use color coding for different stages (optional, based on existing style)

### 9. Add Error Handling and Edge Cases
- Handle missing adw_id gracefully (show "All Logs" tab only)
- Handle API errors when fetching stage logs
- Handle empty stage folders
- Handle malformed .jsonl or .json files
- Show user-friendly error messages
- Add retry mechanism for failed API calls

### 10. Integration Testing
- Test with various workflow states:
  - Workflow in progress (only Plan completed)
  - Workflow with multiple stages completed
  - Workflow with all stages completed
  - Workflow with failed stages
- Verify tab states update correctly as workflow progresses
- Verify real-time logs still work in "All Logs" tab

### 11. Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any failing tests
- Verify E2E test passes

## Testing Strategy

### Unit Tests

#### Backend Tests (app/server/tests/test_stage_logs.py)
- Test GET /api/stage-logs/<adw_id>/<stage> returns correct data
- Test with missing adw_id returns 404
- Test with invalid stage parameter returns 400
- Test with missing directory returns appropriate response
- Test parsing of .jsonl files with various formats
- Test parsing of .json result files
- Test stage name to folder name mapping

#### Frontend Tests
- Test StageLogsViewer renders tabs correctly
- Test tab switching updates displayed logs
- Test loading states while fetching stage logs
- Test empty states when no logs exist
- Test error states when API fails
- Test kanbanStore stage logs actions and selectors

### Edge Cases
- Card without adw_id (should show only "All Logs" tab)
- Workflow with only some stages completed (should disable/hide incomplete stage tabs)
- Very large .jsonl files (should implement pagination or virtual scrolling)
- Concurrent API requests for different stages (should handle race conditions)
- Real-time logs arriving while viewing stage-specific tab (should update "All Logs" but not current stage view)
- Malformed JSON in .jsonl or .json files (should show parsing error)
- Missing raw_output.jsonl but raw_output.json exists (should show only final result)
- Multiple stage folders for same stage (e.g., both sdlc_planner and planner folders - should combine logs)

## Acceptance Criteria
- Users can see tabs for Plan, Build, Test, Review, and Deploy/Document stages in the card log viewer
- Clicking on a stage tab displays logs specific to that stage from the agents/{adw_id}/{stage_folder} directory
- Stage-specific logs include both streaming logs (.jsonl) and final results (.json)
- The "All Logs" tab maintains the current real-time log viewer functionality
- Empty or incomplete stages show appropriate empty state messages
- The tabbed interface is responsive and works on all screen sizes
- Loading states are shown while fetching stage-specific logs
- Error states are handled gracefully with user-friendly messages
- The UI follows existing design patterns and styling from the codebase
- All existing log viewer features (search, filter, export) work within each tab
- No regressions in existing functionality

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test `.claude/commands/e2e/test_stage_logs_tabs.md` to validate this functionality works
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd app/server && uv run pytest tests/test_stage_logs.py -v` - Run specific tests for the new stage logs endpoint
- `cd app/client && bun tsc --noEmit` - Run frontend type checking to validate no TypeScript errors
- `cd app/client && bun run build` - Run frontend build to validate the feature works with zero regressions
- Manually test the tabbed interface with a completed ADW workflow to ensure all tabs display correctly
- Verify that stage tabs show correct logs from agents/{adw_id} directories
- Verify that the "All Logs" tab still shows real-time WebSocket logs
- Verify error handling for missing or incomplete workflows

## Notes

### Stage to Folder Mapping
Based on the ADW architecture, the stage names should map to these folder patterns:
- **Plan**: `sdlc_planner`, `adw_plan_iso`, `planner`
- **Build**: `sdlc_implementor`, `adw_build_iso`, `implementor`, `sdlc_implementor_committer`
- **Test**: `tester`, `adw_test_iso`, `e2e_test_runner_*`, `test_resolver_*`
- **Review**: `reviewer`, `adw_review_iso`, `in_loop_review_*`
- **Deploy/Document**: `documenter`, `adw_document_iso`, `ops`, `ship`

Some workflows may have multiple folders per stage (e.g., planner and sdlc_planner), so the implementation should check for all possible folder patterns and combine logs.

### WebSocket Enhancement (Future Consideration)
Currently, the WebSocket sends a `current_step` field that indicates the active stage. A future enhancement could use this to automatically highlight the active tab in real-time. This is not required for the initial implementation but should be considered for the architecture.

### Performance Considerations
For workflows with large .jsonl files (10,000+ lines), consider:
- Implementing pagination on the backend API
- Adding a "Load More" button in the UI
- Using virtual scrolling for very long log lists
- Caching parsed logs to avoid re-parsing on tab switches

### Accessibility
- Ensure tabs are keyboard navigable (Tab key to focus, Arrow keys to switch)
- Add ARIA labels for screen readers
- Ensure sufficient color contrast for tab states

### Future Enhancements
- Add download button to export stage-specific logs
- Add stage duration/timing information from .json files
- Add stage status indicators (success, failure, in-progress)
- Add ability to compare logs across stages
- Add search across all stages simultaneously
