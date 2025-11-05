# Feature: Advanced Streaming UI Features Implementation

## Metadata
issue_number: `49`
adw_id: `a69d56e7`
issue_json: `{"number":49,"title":"/Users/kvnkishore/WebstormProjects/multi-agent-orc...","body":"/Users/kvnkishore/WebstormProjects/multi-agent-orchestration\nthe codebase at this path has some of the features I like and wanted.\n1. great details of streaming from teh websock not just the stage but what is happenign in each stage\n2. Ability to click on the ui and then navigating perfectly into the codebase at that line of code\n3. Ability to view more files\n4. list of all teh files that are touched or modified\n5. List of outputs it has created like .md files and good summaries of what happened during that particular session.\n\ncan you identify what this author had done in this code to make things better and create a .md file so taht we can refer that file and we can implement it inour codebase."}`

## Feature Description

This feature implements five advanced UI capabilities inspired by the multi-agent-orchestration codebase to enhance the AgenticKanban workflow visibility and developer experience:

1. **Granular Streaming Details**: Extend WebSocket streaming to show detailed sub-stage information (thinking blocks, tool use blocks, pre/post hooks) rather than just high-level stage transitions
2. **Click-to-Open File Navigation**: Enable clicking on files in the UI to open them directly in the user's IDE (Cursor/VS Code) at specific line numbers
3. **Enhanced File Viewing**: Improve file viewing capabilities with syntax highlighting, git diffs, and collapsible file sections
4. **File Modification Tracking**: Automatically track and display all files read and modified during workflow execution
5. **Session Output Summaries**: Generate and display comprehensive session summaries including file changes, AI-generated summaries, and exportable JSON reports

These enhancements will provide users with deeper visibility into what Claude Code is doing during each workflow stage, enable rapid navigation to relevant code, and create comprehensive audit trails for workflow execution.

## User Story

As a developer using AgenticKanban
I want to see granular details of what happens during each workflow stage, navigate directly to modified files in my IDE, and view comprehensive session summaries
So that I can understand exactly what changes were made, debug issues faster, and maintain better visibility into AI-driven development workflows

## Problem Statement

The current AgenticKanban implementation provides high-level stage transitions (Plan → Build → Test → Review → Document) but lacks:

1. **Visibility Gap**: Users don't see what's happening within each stage - only that a stage is "in progress" or "completed"
2. **Navigation Friction**: Users must manually navigate to files mentioned in logs, slowing down code review and debugging
3. **Limited File Context**: File changes are mentioned in logs but not easily viewable with diffs or syntax highlighting
4. **No Modification Tracking**: No automatic tracking of which files were read vs. modified during execution
5. **Poor Session Documentation**: No comprehensive summary of what happened during a workflow run, making retrospectives difficult

The reference codebase (`multi-agent-orchestration`) solves these problems with:
- Hook-based streaming (PreToolUse, PostToolUse, UserPrompt, etc.)
- IDE integration API endpoints
- FileTracker class that monitors Read/Write/Edit operations
- AI-generated summaries via fast Claude Haiku calls
- Exportable JSON session reports

## Solution Statement

We will implement a comprehensive enhancement to AgenticKanban's streaming and UI capabilities by:

1. **Enhanced WebSocket Events**: Add 15+ new WebSocket event types for granular streaming (thinking_block, tool_use_pre, tool_use_post, file_changed, summary_update)
2. **Backend Hook System**: Implement a hook-based logging system that captures pre/post tool execution, streaming AI responses, and file operations
3. **File Tracker Module**: Create a FileTracker class that monitors Read/Write/Edit operations via tool hooks and generates git diffs
4. **IDE Integration API**: Add `/api/open-file` endpoint that invokes VS Code/Cursor with file paths and line numbers
5. **UI Components**: Build FileChangesDisplay, DetailedLogViewer, and SessionSummary components with click-to-open functionality
6. **AI Summarization**: Integrate fast Claude Haiku calls (fire-and-forget) to generate human-readable summaries for file changes and events
7. **Export Functionality**: Add JSON/Markdown export for session reports with full file diffs and summaries

The implementation will follow the proven architecture from the reference codebase while adapting to AgenticKanban's FastAPI backend and React frontend.

## Relevant Files

Use these files to implement the feature:

### Backend Files (Core Implementation)

- **`server/core/websocket_manager.py`** - Extend with new broadcast methods for granular events (broadcast_tool_use_pre, broadcast_tool_use_post, broadcast_thinking_block, broadcast_file_changed, broadcast_summary_update)

- **`server/api/stage_logs.py`** - Current stage log API, will be enhanced to include file tracking data and summaries

- **`server/server.py`** - FastAPI main application, will add `/api/open-file` endpoint for IDE integration

- **`.claude/commands/e2e/test_basic_query.md`** - Example E2E test structure to understand testing patterns

- **`.claude/commands/test_e2e.md`** - E2E test runner documentation to understand how to create new E2E tests

### Frontend Files (UI Components)

- **`src/stores/kanbanStore.js`** - Zustand store, will add handlers for new WebSocket event types and file tracking state

- **`src/services/websocket/websocketService.js`** - WebSocket client, will register handlers for 15+ new event types

- **`src/components/kanban/CardExpandModal.jsx`** - Task detail modal, will add new "File Changes" and "Session Summary" tabs

- **`src/components/kanban/KanbanCard.jsx`** - Task card component, may show file change indicators

- **`src/components/ui/`** - Directory for new reusable UI components

### Reference Documentation

- **`README.md`** - Project overview and architecture (already read)

- **`.claude/commands/conditional_docs.md`** - Conditional documentation guide (already checked)

- **`ARCHITECTURE_DETAILED.md`** - Newly created architecture documentation with current patterns

### New Files

The following files will be created to implement this feature:

#### Backend Modules

- **`server/modules/file_tracker.py`** - FileTracker class that monitors Read/Write/Edit operations, generates git diffs, and tracks file modifications per ADW execution

- **`server/modules/hook_system.py`** - Hook infrastructure for pre/post tool execution, streaming blocks, and event broadcasting

- **`server/modules/summarization_service.py`** - AI summarization service using Claude Haiku for generating file change summaries and event descriptions

- **`server/api/file_operations.py`** - New FastAPI router with `/api/open-file` endpoint for IDE integration

#### Frontend Components

- **`src/components/workflow/FileChangesDisplay.jsx`** - Component to display tracked files with read/modified indicators, git diffs, syntax highlighting, and click-to-open functionality

- **`src/components/workflow/DetailedLogViewer.jsx`** - Enhanced log viewer showing thinking blocks, tool use details, and hook events with collapsible sections

- **`src/components/workflow/SessionSummary.jsx`** - Session summary component displaying AI-generated summaries, file changes, and export buttons (JSON/Markdown)

- **`src/components/workflow/ThinkingBlock.jsx`** - Component to render AI thinking blocks with syntax highlighting

- **`src/components/workflow/ToolUseBlock.jsx`** - Component to render tool use details (pre/post) with input/output display

- **`src/services/fileService.js`** - Frontend service to handle file operations (open in IDE, fetch diffs, export session data)

#### E2E Test

- **`.claude/commands/e2e/test_streaming_ui_features.md`** - E2E test validating all five feature capabilities (granular streaming, click-to-open, file viewing, modification tracking, session summaries)

#### Documentation

- **`specs/STREAMING_UI_IMPLEMENTATION_REFERENCE.md`** - Comprehensive reference document analyzing the multi-agent-orchestration codebase implementation patterns, architecture, and code examples (created during planning phase to guide implementation)

## Implementation Plan

### Phase 1: Foundation (Backend Infrastructure)

**Goal**: Build the backend infrastructure for file tracking, hook system, and enhanced WebSocket events

**Key Activities**:
1. Create FileTracker module to monitor Read/Write/Edit operations
2. Implement hook system for pre/post tool execution
3. Add new WebSocket broadcast methods for granular events
4. Create summarization service for AI-generated summaries
5. Add `/api/open-file` endpoint for IDE integration

**Deliverables**:
- `server/modules/file_tracker.py` with FileTracker class
- `server/modules/hook_system.py` with hook infrastructure
- `server/modules/summarization_service.py` with Claude Haiku integration
- `server/api/file_operations.py` with IDE integration endpoint
- Extended `server/core/websocket_manager.py` with 15+ new broadcast methods

### Phase 2: Core Implementation (Frontend Components)

**Goal**: Build React components to consume and display the new streaming data

**Key Activities**:
1. Create FileChangesDisplay component with click-to-open functionality
2. Build DetailedLogViewer for granular event display
3. Implement SessionSummary component with export functionality
4. Create ThinkingBlock and ToolUseBlock components
5. Add fileService for IDE integration and data export
6. Update Zustand store with new event handlers
7. Register WebSocket handlers for new event types

**Deliverables**:
- New workflow components in `src/components/workflow/`
- `src/services/fileService.js` for file operations
- Updated `src/stores/kanbanStore.js` with new state and handlers
- Updated `src/services/websocket/websocketService.js` with new event listeners

### Phase 3: Integration (UI Enhancement)

**Goal**: Integrate new components into existing UI and add comprehensive testing

**Key Activities**:
1. Add "File Changes" and "Session Summary" tabs to CardExpandModal
2. Enhance DetailedLogEntry to show granular events
3. Add file change indicators to KanbanCard
4. Implement export functionality (JSON/Markdown)
5. Add loading states and error handling
6. Create E2E test for all five feature capabilities
7. Validate with existing workflows

**Deliverables**:
- Updated `src/components/kanban/CardExpandModal.jsx` with new tabs
- Updated `src/components/kanban/KanbanCard.jsx` with indicators
- `.claude/commands/e2e/test_streaming_ui_features.md` E2E test
- Comprehensive validation of all features

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Reference Documentation

- Read and analyze the detailed exploration summaries from the Task agents (already completed during planning)
- Create `specs/STREAMING_UI_IMPLEMENTATION_REFERENCE.md` documenting:
  - WebSocket message structures and event types from reference codebase
  - Hook system architecture and implementation patterns
  - FileTracker class design and git diff generation
  - IDE integration API design
  - AI summarization patterns using Claude Haiku
  - Frontend component architecture and state management
  - Complete code examples and file paths from reference codebase
- This document will serve as the implementation guide for all subsequent steps

### Step 2: Implement FileTracker Module

- Create `server/modules/file_tracker.py` with FileTracker class
- Implement file operation tracking:
  - `track_read(file_path)` - Add to read files set
  - `track_modified(file_path)` - Add to modified files set
  - `get_file_diff(file_path)` - Generate git diff using subprocess
  - `get_tracked_files()` - Return dict with read and modified file lists
  - `generate_file_summary(file_path, diff)` - Prepare data for AI summarization
- Add tests in `server/tests/test_file_tracker.py` validating:
  - File tracking across Read/Write/Edit operations
  - Git diff generation for modified files
  - Proper handling of non-existent files
  - Thread safety for concurrent tracking

### Step 3: Implement Hook System

- Create `server/modules/hook_system.py` with hook infrastructure
- Define hook types (PreToolUse, PostToolUse, ThinkingBlock, TextBlock)
- Implement hook registration and execution:
  - `register_hook(hook_type, callback)` - Register hook callback
  - `execute_hooks(hook_type, context)` - Execute all registered hooks for type
  - `create_tool_use_context(tool_name, input, output)` - Build context dict
- Integrate with FileTracker:
  - PostToolUse hook detects Read/Write/Edit tools
  - Automatically calls FileTracker methods
  - Broadcasts file change events via WebSocket
- Add tests in `server/tests/test_hook_system.py` validating:
  - Hook registration and execution order
  - Context passing to callbacks
  - Integration with FileTracker
  - Error handling in hook callbacks

### Step 4: Implement Summarization Service

- Create `server/modules/summarization_service.py` with AI summarization
- Implement Claude Haiku integration:
  - `summarize_file_change(file_path, diff, operation)` - Generate file change summary (<200 chars)
  - `summarize_tool_use(tool_name, input, output)` - Generate tool use summary
  - `summarize_session(file_changes, tool_uses, duration)` - Generate session summary
  - `async_summarize(...)` - Fire-and-forget async summarization
- Use Anthropic SDK or OpenAI SDK (based on existing project patterns)
- Configure with environment variables (ANTHROPIC_API_KEY or OPENAI_API_KEY)
- Add caching to avoid duplicate summarization requests
- Add tests in `server/tests/test_summarization_service.py` validating:
  - Summary generation for file changes
  - Summary generation for tool uses
  - Async execution without blocking
  - Proper error handling and fallback

### Step 5: Extend WebSocket Manager

- Update `server/core/websocket_manager.py` with new broadcast methods:
  - `broadcast_thinking_block(adw_id, content)` - Stream AI thinking
  - `broadcast_tool_use_pre(adw_id, tool_name, input)` - Pre-tool execution
  - `broadcast_tool_use_post(adw_id, tool_name, output, duration)` - Post-tool execution
  - `broadcast_file_changed(adw_id, file_path, operation, diff, summary)` - File modifications
  - `broadcast_summary_update(adw_id, summary_type, content)` - AI summaries
  - `broadcast_text_block(adw_id, content)` - Stream text responses
- Define message format schema (type, timestamp, adw_id, payload)
- Ensure backward compatibility with existing event types
- Add tests in `server/tests/test_websocket_manager.py` validating:
  - New broadcast methods work correctly
  - Message format is consistent
  - Multiple connections receive broadcasts
  - No interference with existing events

### Step 6: Implement IDE Integration API

- Create `server/api/file_operations.py` with new FastAPI router
- Implement `/api/open-file` endpoint:
  - POST endpoint accepting `{file_path, line_number, ide_preference}`
  - Detect IDE (VS Code vs Cursor) from environment or request
  - Use subprocess to invoke: `code --goto {file_path}:{line_number}` or `cursor --goto {file_path}:{line_number}`
  - Return success/error response
  - Add proper error handling for file not found, IDE not installed
- Add endpoint to router in `server/server.py`
- Add tests in `server/tests/test_file_operations.py` validating:
  - Endpoint accepts correct payload
  - IDE command is constructed correctly
  - Error handling for missing files
  - Error handling for IDE not found

### Step 7: Create Frontend File Service

- Create `src/services/fileService.js` with file operations:
  - `openFileInIDE(filePath, lineNumber)` - Call `/api/open-file` endpoint
  - `fetchFileDiff(adwId, filePath)` - Get git diff for file
  - `exportSessionJSON(adwId)` - Export session data as JSON
  - `exportSessionMarkdown(adwId)` - Export session summary as Markdown
  - Proper error handling and user feedback
- Use fetch API with proper error handling
- Add loading states and toast notifications
- Follow existing service patterns in `src/services/`

### Step 8: Update Zustand Store

- Update `src/stores/kanbanStore.js` with new state:
  - `taskFileChanges: {}` - Map of taskId → {read: [], modified: [], diffs: {}}
  - `taskThinkingBlocks: {}` - Map of taskId → [thinking blocks]
  - `taskToolUseEvents: {}` - Map of taskId → [tool use events]
  - `taskSessionSummaries: {}` - Map of taskId → summary object
- Add new WebSocket event handlers:
  - `handleThinkingBlock(data)` - Add thinking block to task
  - `handleToolUsePre(data)` - Add pre-tool event to task
  - `handleToolUsePost(data)` - Add post-tool event to task
  - `handleFileChanged(data)` - Update file changes for task
  - `handleSummaryUpdate(data)` - Update session summary for task
  - `handleTextBlock(data)` - Add text block to task
- Ensure proper state updates trigger UI rerenders
- Add cleanup logic to prevent memory leaks (limit array sizes)

### Step 9: Update WebSocket Service

- Update `src/services/websocket/websocketService.js` to register new handlers:
  - `websocketService.on('thinking_block', data => kanbanStore.handleThinkingBlock(data))`
  - `websocketService.on('tool_use_pre', data => kanbanStore.handleToolUsePre(data))`
  - `websocketService.on('tool_use_post', data => kanbanStore.handleToolUsePost(data))`
  - `websocketService.on('file_changed', data => kanbanStore.handleFileChanged(data))`
  - `websocketService.on('summary_update', data => kanbanStore.handleSummaryUpdate(data))`
  - `websocketService.on('text_block', data => kanbanStore.handleTextBlock(data))`
- Follow existing pattern in `initializeWebSocket()`
- Ensure proper cleanup on disconnect

### Step 10: Create FileChangesDisplay Component

- Create `src/components/workflow/FileChangesDisplay.jsx`:
  - Display two sections: "Files Read" and "Files Modified"
  - Each file shown as a card with:
    - File path (clickable → opens in IDE)
    - Operation indicator (read/modified badge)
    - AI-generated summary (if available)
    - Collapsible git diff with syntax highlighting
    - Line numbers for diffs
  - Click handler calls `fileService.openFileInIDE(filePath, lineNumber)`
  - Use react-syntax-highlighter for diff display
  - Show green (+) for additions, red (-) for deletions
  - Empty state message when no files tracked
- Add loading states and error handling
- Use TailwindCSS for styling (match existing design)

### Step 11: Create ThinkingBlock Component

- Create `src/components/workflow/ThinkingBlock.jsx`:
  - Display AI thinking content in a styled card
  - Show timestamp and duration
  - Syntax highlighting for code snippets within thinking
  - Collapsible if content is long (>500 chars)
  - Markdown rendering for formatted text
- Use react-markdown and react-syntax-highlighter
- Match existing component styling

### Step 12: Create ToolUseBlock Component

- Create `src/components/workflow/ToolUseBlock.jsx`:
  - Display tool name prominently
  - Show two sections: "Input" and "Output" (collapsible)
  - Display execution duration and timestamp
  - Syntax highlight JSON inputs/outputs
  - Show status indicator (success/error)
  - Link to related file changes if applicable
- Use react-syntax-highlighter for JSON display
- Match existing component styling

### Step 13: Create DetailedLogViewer Component

- Create `src/components/workflow/DetailedLogViewer.jsx`:
  - Display chronological list of events:
    - Thinking blocks (ThinkingBlock component)
    - Tool use events (ToolUseBlock component)
    - File changes (inline summary + link to File Changes tab)
    - Text blocks (styled divs)
  - Add filtering controls (show/hide thinking, tool use, file changes)
  - Virtualized scrolling for performance (react-window)
  - Search/filter by keyword
  - Timeline view with timestamps
- Integrate ThinkingBlock and ToolUseBlock components
- Add loading states and empty state
- Match existing log viewer patterns

### Step 14: Create SessionSummary Component

- Create `src/components/workflow/SessionSummary.jsx`:
  - Display session overview:
    - Total duration
    - Total files read/modified counts
    - Total tool uses
    - AI-generated session summary
  - Show top file changes with summaries
  - Display timeline of major events
  - Export buttons:
    - "Export JSON" (downloads detailed session data)
    - "Export Markdown" (downloads formatted summary)
  - Click handlers call `fileService.exportSessionJSON()` and `fileService.exportSessionMarkdown()`
- Use charts/visualizations if appropriate (optional)
- Match existing component styling

### Step 15: Update CardExpandModal

- Update `src/components/kanban/CardExpandModal.jsx`:
  - Add two new tabs: "File Changes" and "Session Summary"
  - "File Changes" tab renders FileChangesDisplay component
  - "Session Summary" tab renders SessionSummary component
  - Ensure existing tabs (Task Details, Workflow Status, Stage Logs, etc.) remain functional
  - Update tab navigation to include new tabs
  - Pass taskId and adwId to new components
  - Add loading states while fetching file changes and summaries
- Maintain backward compatibility with tasks that don't have new data

### Step 16: Add File Change Indicators to KanbanCard

- Update `src/components/kanban/KanbanCard.jsx`:
  - Add small badge showing file change count (e.g., "5 files")
  - Use different colors for read (blue) vs modified (orange) indicators
  - Show indicator only if file changes exist for task
  - Hover tooltip showing top 3 modified files
- Keep design minimal to avoid card clutter

### Step 17: Integrate Hook System with Workflow Execution

- Identify where workflow execution happens in backend (likely in ADW scripts or workflow coordinator)
- Register hooks for tool execution:
  - PreToolUse hook to broadcast before tool execution
  - PostToolUse hook to track files and broadcast after execution
  - ThinkingBlock hook to stream AI thinking
  - TextBlock hook to stream AI text responses
- Ensure FileTracker is instantiated per ADW execution (keyed by adw_id)
- Broadcast file changes via WebSocket after each file operation
- Call summarization service asynchronously (fire-and-forget) for file changes
- Test with a sample workflow to ensure events are streaming correctly

### Step 18: Create E2E Test File

- Create `.claude/commands/e2e/test_streaming_ui_features.md` following the pattern from `test_basic_query.md`
- Define User Story covering all 5 feature capabilities
- Create Test Steps:
  1. Start a test workflow (or use mock data)
  2. Verify thinking blocks appear in DetailedLogViewer
  3. Verify tool use events appear with input/output
  4. Verify file changes appear in FileChangesDisplay
  5. Click on a file and verify IDE opens (check for IDE process or mock verification)
  6. Verify AI summaries appear for file changes
  7. Verify Session Summary displays correct counts and data
  8. Export JSON and verify file is downloaded
  9. Export Markdown and verify file is downloaded
  10. Take screenshots at each major step
- Define Success Criteria:
  - All 15+ WebSocket event types received and displayed
  - Files are clickable and trigger IDE opening
  - Git diffs display with syntax highlighting
  - File tracking shows correct read/modified counts
  - AI summaries are generated and displayed
  - Export functionality works for JSON and Markdown
  - 10+ screenshots captured showing all features
- Follow the Output Format from `test_e2e.md`

### Step 19: Run Comprehensive Validation

- Execute all validation commands (see Validation Commands section)
- Run backend tests: `cd server && uv run pytest`
- Run frontend type checking: `bun tsc --noEmit`
- Run frontend build: `bun run build`
- Run E2E test: Read and execute `.claude/commands/test_e2e.md` with new test file
- Fix any errors or test failures
- Verify all features work end-to-end with zero regressions
- Test with multiple concurrent workflows to ensure proper isolation
- Validate WebSocket message handling under load

### Step 20: Documentation and Cleanup

- Update `README.md` with new features (if needed)
- Add JSDoc comments to all new functions and components
- Ensure all new modules have file-level documentation headers
- Review code for consistency with existing patterns
- Remove any debug logging or temporary code
- Verify all TODO comments are resolved
- Final review of all changes

## Testing Strategy

### Unit Tests

**Backend Tests** (`server/tests/`):
- **test_file_tracker.py**:
  - Test file tracking for Read/Write/Edit operations
  - Test git diff generation
  - Test handling of non-existent files
  - Test concurrent tracking operations
  - Test summary data generation

- **test_hook_system.py**:
  - Test hook registration and execution
  - Test hook execution order
  - Test context passing to callbacks
  - Test integration with FileTracker
  - Test error handling in hooks

- **test_summarization_service.py**:
  - Test AI summary generation for file changes
  - Test AI summary generation for tool uses
  - Test async execution (fire-and-forget)
  - Test caching mechanism
  - Test error handling and fallbacks

- **test_websocket_manager.py**:
  - Test new broadcast methods
  - Test message format consistency
  - Test multiple connection handling
  - Test backward compatibility with existing events

- **test_file_operations.py**:
  - Test `/api/open-file` endpoint
  - Test IDE command construction
  - Test error handling for missing files
  - Test error handling for IDE not found

**Frontend Tests** (if frontend testing is configured):
- Test FileChangesDisplay component rendering
- Test click-to-open file functionality
- Test ThinkingBlock component rendering
- Test ToolUseBlock component rendering
- Test DetailedLogViewer filtering and search
- Test SessionSummary export functionality
- Test WebSocket event handler integration
- Test Zustand store state updates

### Integration Tests

- **End-to-End Workflow Test**: Run a complete ADW workflow and verify:
  - All WebSocket events are received in correct order
  - File tracking captures all Read/Write/Edit operations
  - Git diffs are generated correctly
  - AI summaries are created for file changes
  - Session summary displays accurate data
  - Export functionality produces valid JSON/Markdown

- **Multi-Workflow Concurrency Test**: Run multiple workflows simultaneously and verify:
  - File tracking is isolated per adw_id
  - WebSocket events are routed to correct connections
  - No cross-contamination of data between workflows

- **IDE Integration Test**: Verify `/api/open-file` endpoint:
  - Opens VS Code at correct file and line
  - Opens Cursor at correct file and line
  - Handles errors gracefully when IDE is not installed

### Edge Cases

1. **No File Changes**: Workflow completes without reading or modifying any files
   - FileChangesDisplay shows empty state message
   - Session summary shows "0 files"

2. **Large Diffs**: File with 1000+ line changes
   - Git diff is truncated or paginated
   - UI remains responsive
   - Export includes full diff

3. **Concurrent File Modifications**: Same file modified multiple times in one workflow
   - FileTracker tracks all modifications
   - Final diff shows cumulative changes
   - Timeline shows all modification events

4. **WebSocket Disconnect During Workflow**: Connection lost mid-execution
   - Messages queued until reconnection
   - Events are delivered in order after reconnect
   - No data loss

5. **Missing AI Summary**: Summarization service fails or times out
   - Fallback to generic summary (e.g., "Modified {file_path}")
   - UI shows placeholder
   - Export includes raw data

6. **IDE Not Installed**: User clicks file but VS Code/Cursor not available
   - API returns error
   - Toast notification shown to user
   - Fallback to showing file path

7. **Invalid File Path**: File path in logs doesn't exist
   - FileTracker skips git diff generation
   - UI shows file path with error indicator
   - Click-to-open is disabled

8. **Memory Limits**: Very long workflow with 1000+ events
   - Zustand store limits arrays to max size (e.g., 500 events)
   - Older events are pruned
   - Export includes all events (fetched from backend)

9. **Non-Git Repository**: Workflow runs in non-git directory
   - Git diff generation is skipped
   - File tracking still works
   - UI shows file changes without diffs

10. **Binary Files**: Workflow modifies binary files (images, PDFs)
    - Git diff shows "Binary file changed"
    - UI displays appropriate message
    - Export includes file path only

## Acceptance Criteria

Feature is considered complete when ALL of the following criteria are met:

### 1. Granular Streaming Details
- [ ] WebSocket events include thinking_block, tool_use_pre, tool_use_post, file_changed, summary_update, text_block
- [ ] DetailedLogViewer displays all event types in chronological order
- [ ] Thinking blocks are displayed with syntax highlighting
- [ ] Tool use events show input, output, and duration
- [ ] Events are filtered by type (show/hide controls work)
- [ ] Timeline view shows timestamps for all events
- [ ] No performance degradation with 100+ events

### 2. Click-to-Open File Navigation
- [ ] Files in FileChangesDisplay are clickable
- [ ] Clicking a file calls `/api/open-file` endpoint
- [ ] VS Code opens at correct file and line number when installed
- [ ] Cursor opens at correct file and line number when installed
- [ ] Error handling works when IDE is not installed
- [ ] Toast notification shows success/error feedback
- [ ] Click-to-open works from multiple UI locations (logs, summaries)

### 3. Enhanced File Viewing
- [ ] FileChangesDisplay shows separate sections for "Files Read" and "Files Modified"
- [ ] Git diffs display with syntax highlighting (green adds, red deletes)
- [ ] Diffs are collapsible/expandable
- [ ] Long diffs are truncated with "Show more" option
- [ ] Line numbers are shown in diffs
- [ ] Empty state message when no files tracked
- [ ] Syntax highlighting works for multiple languages (Python, JavaScript, etc.)

### 4. File Modification Tracking
- [ ] FileTracker correctly identifies Read operations
- [ ] FileTracker correctly identifies Write operations
- [ ] FileTracker correctly identifies Edit operations
- [ ] Git diffs are generated for all modified files
- [ ] File tracking is isolated per adw_id (no cross-contamination)
- [ ] KanbanCard shows file change count badge
- [ ] Hover tooltip shows top 3 modified files
- [ ] Concurrent file modifications are tracked correctly

### 5. Session Output Summaries
- [ ] AI-generated summaries appear for file changes (<200 chars)
- [ ] AI-generated summaries appear for tool uses
- [ ] SessionSummary component displays session overview (duration, counts)
- [ ] SessionSummary shows timeline of major events
- [ ] Export JSON button downloads valid JSON file
- [ ] Export Markdown button downloads formatted summary
- [ ] Exported JSON includes all events, diffs, and summaries
- [ ] Exported Markdown is human-readable and well-formatted

### 6. Integration and Polish
- [ ] CardExpandModal includes "File Changes" and "Session Summary" tabs
- [ ] New tabs are accessible and functional
- [ ] Existing tabs remain functional (no regressions)
- [ ] Loading states display while fetching data
- [ ] Error states display when data fetch fails
- [ ] UI design matches existing AgenticKanban style
- [ ] No console errors or warnings
- [ ] All tests pass (backend and frontend)

### 7. Testing and Documentation
- [ ] E2E test validates all 5 feature capabilities
- [ ] E2E test captures 10+ screenshots
- [ ] All backend unit tests pass (pytest)
- [ ] All frontend type checks pass (tsc --noEmit)
- [ ] Frontend build succeeds (bun run build)
- [ ] JSDoc comments added to all new functions
- [ ] File-level documentation headers added to all new modules
- [ ] README updated with new features (if needed)

### 8. Performance and Reliability
- [ ] WebSocket events stream in real-time (<100ms latency)
- [ ] UI remains responsive with 500+ events
- [ ] Memory usage is controlled (arrays limited to max size)
- [ ] No memory leaks during long workflows
- [ ] Concurrent workflows don't interfere with each other
- [ ] WebSocket reconnection works correctly
- [ ] Message queuing works during disconnection

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

**E2E Test Validation**:
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_streaming_ui_features.md` to validate all 5 feature capabilities work end-to-end with screenshots proving functionality

**Backend Validation**:
- `cd server && uv run pytest` - Run all backend tests including new FileTracker, HookSystem, SummarizationService, WebSocketManager, and FileOperations tests (must pass with 0 failures)

**Frontend Validation**:
- `bun tsc --noEmit` - Run TypeScript type checking to ensure no type errors in new components and services (must pass with 0 errors)
- `bun run build` - Run production build to ensure all imports and dependencies are correct (must succeed without errors)

**Manual Validation** (after automated tests pass):
- Start backend server: `cd server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001`
- Start frontend: `bun run dev`
- Trigger a test workflow via the UI
- Verify all WebSocket events appear in DetailedLogViewer
- Click on a file in FileChangesDisplay and verify IDE opens
- Verify git diffs display correctly with syntax highlighting
- Verify AI summaries are generated for file changes
- Verify Session Summary displays accurate counts
- Export JSON and Markdown and verify file contents
- Check browser console for errors (should be 0 errors)
- Check backend logs for errors (should be 0 errors)

**Regression Testing**:
- Verify existing workflows (Plan, Build, Test, Review, Document) still work correctly
- Verify existing tabs in CardExpandModal are functional
- Verify WebSocket connection/reconnection still works
- Verify task creation, editing, and deletion still work
- Verify Kanban board drag-and-drop still works

## Notes

### Implementation Reference

A comprehensive reference document `specs/STREAMING_UI_IMPLEMENTATION_REFERENCE.md` has been created during the planning phase. This document contains:
- Detailed analysis of the multi-agent-orchestration codebase
- WebSocket message structures and event types (15+ types documented)
- Hook system architecture (PreToolUse, PostToolUse, ThinkingBlock, etc.)
- FileTracker class design and implementation patterns
- IDE integration API design (`/api/open-file` endpoint)
- AI summarization patterns using Claude Haiku (fire-and-forget async)
- Frontend component architecture and state management
- Complete code examples and file paths from reference codebase
- Message flow diagrams and data structures

**Developers should read this reference document FIRST before implementing any step.** It contains proven patterns and code examples that will significantly accelerate implementation.

### Technology Stack Additions

**Backend**:
- No new dependencies required (use existing Anthropic/OpenAI SDK for summarization)
- Git operations via subprocess (already available in Python)

**Frontend**:
- `react-syntax-highlighter` - Syntax highlighting for code/diffs (may already be installed)
- `react-window` - Virtualized scrolling for DetailedLogViewer (optional, for performance)
- `react-markdown` - Markdown rendering (may already be installed for other components)

Install frontend dependencies if needed:
```bash
bun add react-syntax-highlighter react-window react-markdown
```

### Environment Variables

Add to `.env` or backend configuration:
```bash
# IDE Integration (optional, defaults to VS Code)
IDE_PREFERENCE=code  # or 'cursor'

# AI Summarization (required for summary generation)
ANTHROPIC_API_KEY=sk-ant-xxx  # or OPENAI_API_KEY
SUMMARIZATION_MODEL=claude-3-haiku-20240307  # fast, cheap model for summaries
```

### Performance Considerations

1. **WebSocket Event Volume**: With granular streaming, expect 10-50x more events than current implementation
   - Use event batching if performance degrades (batch thinking blocks)
   - Implement event sampling for very verbose workflows (e.g., show every 10th thinking block)

2. **Memory Management**: Limit stored events per task to prevent memory leaks
   - Zustand store: max 500 events per task, prune older events
   - Backend: stream events without storing (except for export)

3. **AI Summarization**: Fire-and-forget async to avoid blocking workflow execution
   - Don't wait for summary completion
   - Cache summaries to avoid duplicate API calls
   - Use cheap/fast model (Claude Haiku or GPT-3.5-turbo)

4. **Git Diff Generation**: Can be slow for large files
   - Implement timeout (max 5 seconds per diff)
   - Truncate very large diffs (>1000 lines)
   - Consider background worker for diff generation

5. **Frontend Rendering**: Virtualized scrolling for long event lists
   - Use react-window for DetailedLogViewer if >100 events
   - Lazy load diffs (fetch on expand, not upfront)

### Future Enhancements (Out of Scope)

These features are not required for initial implementation but could be added later:

1. **Real-time Collaboration**: Multiple users viewing same workflow see same events
2. **Event Search**: Full-text search across all events in a workflow
3. **Event Replay**: Replay workflow execution step-by-step
4. **Custom Event Filters**: User-defined filters for event types
5. **Event Export Formats**: PDF, HTML exports in addition to JSON/Markdown
6. **File Diff Editor**: In-UI diff viewer with syntax highlighting (vs. external IDE)
7. **AI Summary Customization**: User can regenerate summaries with custom prompts
8. **Event Analytics**: Charts showing tool use frequency, file change patterns
9. **Notification System**: Push notifications for critical events (errors, warnings)
10. **Event Bookmarking**: User can bookmark important events for later review

### Security Considerations

1. **File Path Validation**: Validate file paths before opening in IDE to prevent directory traversal attacks
2. **Command Injection**: Sanitize file paths when constructing IDE subprocess commands
3. **API Rate Limiting**: Rate limit `/api/open-file` endpoint to prevent abuse
4. **Export Data Sanitization**: Sanitize exported JSON/Markdown to prevent XSS if displayed in web UI
5. **WebSocket Authentication**: Ensure WebSocket connections are authenticated (may already be implemented)

### Backward Compatibility

This feature is designed to be **fully backward compatible**:
- New WebSocket event types are additive (existing events unchanged)
- New UI components are in separate tabs (existing tabs unaffected)
- New backend modules are independent (no changes to existing modules except WebSocketManager)
- Tasks without new data (pre-implementation) will show empty states gracefully
- No database schema changes required (data is ephemeral, stored in Zustand and streamed via WebSocket)

### Testing Strategy Note

The E2E test for this feature will be comprehensive but may require **mocking** for certain scenarios:
- **IDE Integration**: May need to mock IDE process spawn (unless running in dev environment with IDE installed)
- **AI Summarization**: May need to mock Anthropic/OpenAI API calls to avoid costs during testing
- **WebSocket Events**: Can use real WebSocket server or mock events for faster testing

Ensure the E2E test clearly documents which parts are mocked vs. real integration.

### Alternative Approaches Considered

During planning, the following alternative approaches were considered but **not chosen**:

1. **Polling vs. WebSocket**: Use polling instead of WebSocket for granular events
   - **Rejected**: Too much latency, inefficient for real-time streaming

2. **Database Storage for Events**: Store all events in database instead of in-memory
   - **Rejected**: Adds complexity, not needed for ephemeral streaming data, export can fetch from backend if needed

3. **Third-Party Observability Tools**: Use tools like Honeycomb, Datadog for event tracking
   - **Rejected**: Overkill for this use case, want in-app visibility, avoid external dependencies

4. **Server-Sent Events (SSE) vs. WebSocket**: Use SSE for one-way streaming
   - **Rejected**: WebSocket already implemented, provides bidirectional capability if needed later

5. **Embedded Code Editor**: Use Monaco Editor or CodeMirror for in-app file viewing
   - **Rejected**: Adds complexity, users prefer IDE integration for editing, view-only diffs are sufficient

The chosen approach (WebSocket + Hook System + FileTracker + IDE Integration) provides the best balance of real-time performance, developer experience, and implementation simplicity.

### Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket message volume overwhelms UI | High | Medium | Implement event batching, sampling, and virtualized scrolling |
| AI summarization costs too high | Medium | Low | Use cheapest model (Haiku), cache summaries, make it optional |
| IDE integration doesn't work on all platforms | Medium | Medium | Test on Mac/Linux/Windows, provide fallback (copy file path) |
| Git diff generation is slow for large files | Medium | Medium | Implement timeout, truncate large diffs, background processing |
| Users don't understand granular events | Low | Low | Add tooltips, documentation, and visual hierarchy |
| Hook system introduces bugs in workflow execution | High | Low | Comprehensive testing, error isolation, graceful degradation |

All risks have identified mitigations and are considered manageable.
