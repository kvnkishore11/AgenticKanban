# Feature: Real-Time WebSocket to UI Integration with Enhanced Card Visualization

## Metadata
issue_number: `3`
adw_id: `2a14d4c3`
issue_json: `{"number":3,"title":"I see now that tehre is no connection between our...","body":"I see now that tehre is no connection between our websocket and our ui. We dont receive constant communications that are happening in teh websockt.I want each and everythig that is happening at the websocket to be communciated back to our frontend.\n\nthere by u need to accomodate teh frontend ui to have all those changes reflected like i should be able to see the stage progression on the ui. whith in each stage atleast i should be able to see the logs of that stage in a beautified manner if possible more details. reimagine the ui of the card for this."}`

## Feature Description
Establish real-time bidirectional communication between the WebSocket server (adws/adw_triggers/trigger_websocket.py) and the frontend UI. Currently, the WebSocket server sends status updates and workflow progress information, but the frontend does not receive or display these updates in real-time. This feature will bridge that gap by implementing comprehensive WebSocket message handling on the frontend and redesigning the KanbanCard UI to display stage progression, logs, and detailed workflow status updates in a beautiful and informative way.

## User Story
As a developer using the Agentic Kanban system
I want to see real-time updates from ADW workflows displayed directly on my Kanban cards
So that I can monitor workflow progress, view stage transitions, and access detailed logs without leaving the Kanban board interface

## Problem Statement
The current implementation has a disconnect between the backend WebSocket server and the frontend UI:
1. The WebSocket server (`trigger_websocket.py`) sends comprehensive status updates including workflow state, progress, stage transitions, and error messages
2. The frontend has basic WebSocket connection logic (`websocketService.js`) but does not fully handle or display all incoming messages
3. Kanban cards show limited workflow information and do not reflect real-time updates from the WebSocket
4. Users cannot see detailed logs, stage progression, or workflow status updates without manually checking log files
5. The UI does not provide visual feedback about what's happening during long-running ADW workflows

This creates a poor user experience where developers must leave the UI to check logs or status, defeating the purpose of having a unified Kanban interface.

## Solution Statement
Implement end-to-end WebSocket message handling that captures all server-sent events and displays them in real-time on the frontend. Redesign the KanbanCard component to feature:
- **Real-time stage progression visualization** showing the current stage and substage with progress indicators
- **Live log streaming** displaying workflow logs in a beautified, scrollable format directly on the card
- **Enhanced status indicators** showing workflow state (started, in_progress, completed, failed) with appropriate visual cues
- **Detailed workflow metadata** including ADW ID, model set, timestamps, and error information when applicable
- **Expandable/collapsible sections** for logs and details to maintain card density while providing access to deep information
- **WebSocket connection health monitoring** with visual indicators and reconnection capabilities

## Relevant Files
Use these files to implement the feature:

### Backend WebSocket Server
- **adws/adw_triggers/trigger_websocket.py** (lines 1-740) - WebSocket server that sends status updates, workflow responses, and progress information. Review the message formats sent by this server, particularly:
  - `WorkflowStatusUpdate` messages (lines 40-50, 375-388) containing adw_id, workflow_name, status, message, timestamp, progress_percent, current_step
  - `WorkflowTriggerResponse` messages (lines 29-37, 335-362) containing status, adw_id, workflow_name, message, logs_path
  - `WebSocketError` messages (lines 52-58, 468-516)
  - Message types: trigger_response, status_update, error, pong

- **adws/adw_triggers/websocket_models.py** (lines 1-118) - Pydantic models defining the structure of WebSocket messages. These models define exactly what data is available in each message type.

### Frontend WebSocket Service
- **src/services/websocket/websocketService.js** (lines 1-431) - WebSocket client service that connects to the server and handles basic message routing. Currently handles connection management and basic event emission but needs enhancement to:
  - Parse and emit all status_update messages to the store
  - Handle workflow progress updates with progress_percent and current_step
  - Track active workflows by adw_id
  - Provide detailed status information for UI consumption

### Frontend State Management
- **src/stores/kanbanStore.js** (lines 1-100+) - Zustand store managing application state. Currently has WebSocket state (websocketConnected, websocketConnecting, activeWorkflows, workflowStatusUpdates) but needs:
  - Actions to handle incoming status updates
  - Methods to associate workflow updates with specific tasks
  - State to track real-time logs for each task
  - Enhanced workflow status tracking with timestamps and progress

### UI Components
- **src/components/kanban/KanbanCard.jsx** (lines 1-567) - The Kanban card component that needs major UI/UX redesign to display:
  - Real-time stage progression with visual indicators
  - Live log streaming in a beautified format
  - Enhanced workflow status section with ADW metadata
  - Connection health indicators
  - Expandable sections for detailed information

- **src/components/ui/WebSocketStatusIndicator.jsx** (lines 1-538) - WebSocket connection status component that provides visual feedback about connection health. This can be used or referenced for connection status display on cards.

### New Files

#### E2E Test File
- **.claude/commands/e2e/test_websocket_realtime_updates.md** - New E2E test file to validate real-time WebSocket communication and UI updates. This test should verify:
  - WebSocket connection establishment
  - Workflow trigger via UI
  - Real-time status update reception and display
  - Log streaming to card UI
  - Stage progression visualization
  - Error handling and display
  - Screenshots demonstrating the enhanced UI

## Implementation Plan

### Phase 1: Foundation - WebSocket Message Handling Enhancement
Strengthen the WebSocket communication layer to capture, parse, and route all server messages to the appropriate frontend components. This involves:
- Enhancing `websocketService.js` to parse all message types from the server
- Adding event listeners for status_update messages with full data extraction
- Implementing message queuing for high-frequency updates
- Adding error handling and retry logic for failed message processing

### Phase 2: Core Implementation - State Management and Data Flow
Implement comprehensive state management for real-time workflow updates, logs, and status tracking:
- Extend `kanbanStore.js` with actions to handle status_update messages
- Create workflow-to-task association logic based on issue_number or adw_id
- Implement log aggregation and storage in task metadata
- Add real-time progress tracking with timestamp information
- Create selectors for accessing workflow data by task ID

### Phase 3: Integration - UI Redesign and Real-Time Display
Redesign the KanbanCard component to beautifully display all real-time information:
- Create expandable log viewer section with syntax highlighting and auto-scroll
- Implement real-time stage progression indicators with animation
- Add detailed workflow status panel with metadata display
- Integrate WebSocket connection health indicators
- Implement responsive design that works in both collapsed and expanded states
- Add loading states and skeleton screens for smooth UX

## Step by Step Tasks

### 1. Enhance WebSocket Service Message Handling
- Read and analyze `adws/adw_triggers/trigger_websocket.py` to understand all message formats sent by the server
- Read and analyze `adws/adw_triggers/websocket_models.py` to understand the exact data structure of each message type
- Update `src/services/websocket/websocketService.js` to:
  - Add comprehensive parsing for status_update messages
  - Extract and emit progress_percent, current_step, timestamp from status updates
  - Implement message validation using the server's Pydantic model structure
  - Add debug logging for all received messages
  - Implement message type-specific handlers for trigger_response, status_update, error
- Write unit tests for the enhanced message parsing logic

### 2. Extend Kanban Store with Real-Time Workflow State
- Update `src/stores/kanbanStore.js` to add new state properties:
  - `taskWorkflowLogs: Map<taskId, Array<logEntry>>` - Real-time logs per task
  - `taskWorkflowProgress: Map<taskId, progressData>` - Progress tracking per task
  - `taskWorkflowMetadata: Map<taskId, metadata>` - ADW metadata per task
- Add actions to handle WebSocket events:
  - `handleWorkflowStatusUpdate(statusUpdate)` - Process incoming status updates
  - `associateWorkflowWithTask(adw_id, taskId)` - Link workflow to task
  - `appendWorkflowLog(taskId, logEntry)` - Add log entry to task
  - `updateWorkflowProgress(taskId, progressData)` - Update task progress
- Implement workflow-to-task mapping logic using issue_number or adw_id from WebSocket messages
- Add selectors for accessing workflow data:
  - `getWorkflowLogsForTask(taskId)` - Get all logs for a task
  - `getWorkflowProgressForTask(taskId)` - Get current progress
  - `getWorkflowMetadataForTask(taskId)` - Get ADW metadata
- Write unit tests for new store actions and selectors

### 3. Initialize WebSocket Listeners in Store
- Update `src/stores/kanbanStore.js` initialization to:
  - Set up WebSocket event listeners on store mount
  - Connect status_update events to store actions
  - Connect trigger_response events to task metadata updates
  - Connect error events to error handling logic
- Implement cleanup on store unmount to prevent memory leaks
- Add connection state synchronization between websocketService and store
- Test WebSocket listener setup and teardown

### 4. Create Enhanced Log Viewer Component
- Create new component `src/components/kanban/WorkflowLogViewer.jsx`:
  - Display logs in a beautified, scrollable container
  - Implement syntax highlighting for log levels (INFO, WARNING, ERROR)
  - Add auto-scroll to latest log feature with manual override
  - Implement log filtering by level or keyword
  - Add timestamp display for each log entry
  - Create collapsible sections for different workflow stages
  - Style with Tailwind CSS for consistent look and feel
- Write component tests for log viewer functionality

### 5. Create Real-Time Stage Progression Component
- Create new component `src/components/kanban/StageProgressionViewer.jsx`:
  - Display current stage and substage with visual indicators
  - Show progress bar with percentage completion
  - Add transition animations when stage changes
  - Display stage timeline showing completed/current/upcoming stages
  - Highlight current_step from WebSocket updates
  - Use color coding for different stages (match existing stage colors)
  - Add tooltips showing detailed stage information
- Write component tests for stage progression display

### 6. Redesign KanbanCard Component for Real-Time Updates
- Update `src/components/kanban/KanbanCard.jsx` to:
  - Integrate WorkflowLogViewer component in expandable section
  - Integrate StageProgressionViewer in card header/body
  - Add real-time workflow status panel showing:
    - ADW ID with copy-to-clipboard functionality
    - Workflow name and type
    - Current status (started, in_progress, completed, failed)
    - Timestamp of last update
    - Logs path with link to external log viewer
  - Implement expandable/collapsible sections for logs and details
  - Add loading states during workflow execution
  - Add error state display with recovery options
  - Integrate WebSocket connection health indicator
  - Optimize re-renders using React.memo and useMemo for performance
- Update card styling to accommodate new sections while maintaining density
- Ensure responsive design works on different screen sizes

### 7. Implement Real-Time Updates in Card Component
- Connect KanbanCard to store selectors for real-time data:
  - Use `getWorkflowLogsForTask` to subscribe to log updates
  - Use `getWorkflowProgressForTask` to subscribe to progress updates
  - Use `getWorkflowMetadataForTask` to display ADW information
- Implement useEffect hooks to handle real-time updates:
  - Auto-expand card when new workflow starts
  - Highlight card when status changes
  - Show notification badge for new logs
  - Update progress indicators in real-time
- Add animations for state transitions (stage changes, log additions)
- Test real-time update behavior with mock WebSocket messages

### 8. Add WebSocket Connection Health Monitoring to Cards
- Update KanbanCard to show WebSocket connection status:
  - Use MinimalWebSocketStatus component for connection indicator
  - Disable workflow trigger button when disconnected
  - Show reconnection progress when attempting to reconnect
  - Display connection error messages
- Add reconnect button in card's workflow section
- Test connection state changes and UI updates

### 9. Create E2E Test for Real-Time WebSocket Updates
- Create `.claude/commands/e2e/test_websocket_realtime_updates.md` with:
  - User story describing real-time update feature
  - Test steps including:
    1. Navigate to application
    2. Verify WebSocket connection established
    3. Create new task
    4. Trigger ADW workflow from card
    5. Verify status update appears in real-time
    6. Verify logs stream to card in real-time
    7. Verify stage progression updates automatically
    8. Verify workflow completion reflected in card
    9. Verify error handling (simulate WebSocket disconnect)
    10. Take screenshots at each major step
  - Success criteria validating all real-time features work
  - Screenshot requirements for documentation
- Document expected WebSocket message flow
- Include test data for workflow trigger requests

### 10. Update Styles for Enhanced Card UI
- Update `src/App.css` or component-specific styles to:
  - Add animations for stage transitions
  - Style log viewer with monospace font and proper spacing
  - Add color coding for log levels (INFO: blue, WARNING: yellow, ERROR: red)
  - Style progress indicators with smooth transitions
  - Add hover effects for interactive elements
  - Ensure accessibility (proper contrast, focus indicators)
- Create consistent visual hierarchy for card sections
- Optimize for both light and dark themes (if applicable)

### 11. Add Error Handling and Edge Cases
- Implement comprehensive error handling for:
  - WebSocket connection failures during active workflow
  - Malformed messages from server
  - Missing or invalid workflow data
  - Task-to-workflow association failures
  - Log overflow (limit stored logs per task)
- Add user-friendly error messages in UI
- Implement fallback behavior when WebSocket is unavailable
- Add retry logic for failed message processing
- Test error scenarios and recovery mechanisms

### 12. Performance Optimization
- Optimize real-time update handling:
  - Implement message debouncing for high-frequency updates
  - Use virtual scrolling for log viewer if logs exceed threshold
  - Memoize expensive computations in components
  - Batch state updates to minimize re-renders
- Add performance monitoring for WebSocket message processing
- Test with high message volume to ensure smooth performance
- Profile component re-renders and optimize as needed

### 13. Run Validation Commands
- Execute all validation commands to ensure zero regressions:
  - Run server tests: `cd app/server && uv run pytest`
  - Run frontend type checking: `cd app/client && bun tsc --noEmit`
  - Run frontend build: `cd app/client && bun run build`
  - Execute E2E test: Read `.claude/commands/test_e2e.md`, then execute `.claude/commands/e2e/test_websocket_realtime_updates.md`
- Verify all tests pass
- Review and address any warnings or errors
- Ensure no existing functionality is broken

## Testing Strategy

### Unit Tests
- **WebSocket Service Tests**
  - Test message parsing for all server message types
  - Test event emission for status_update, trigger_response, error
  - Test connection state management
  - Test message validation and error handling

- **Store Tests**
  - Test workflow-to-task association logic
  - Test log aggregation and storage
  - Test progress tracking updates
  - Test selectors return correct data
  - Test cleanup on workflow completion

- **Component Tests**
  - Test WorkflowLogViewer renders logs correctly
  - Test log filtering and auto-scroll functionality
  - Test StageProgressionViewer displays stages accurately
  - Test KanbanCard integrates real-time data
  - Test expandable sections toggle correctly
  - Test connection status indicators

### Integration Tests
- **WebSocket-to-Store Integration**
  - Mock WebSocket messages and verify store updates
  - Test workflow association with tasks
  - Test real-time log streaming to store
  - Test multiple concurrent workflows

- **Store-to-UI Integration**
  - Verify UI updates when store state changes
  - Test multiple cards updating simultaneously
  - Test performance with multiple active workflows

### Edge Cases
- **Connection Edge Cases**
  - WebSocket disconnection during active workflow
  - Reconnection with missed messages
  - Multiple rapid connection/disconnection cycles
  - Server unavailable at application start

- **Data Edge Cases**
  - Workflow with no logs
  - Workflow with thousands of log entries
  - Malformed status update messages
  - Missing or null fields in messages
  - Workflow updates for non-existent tasks
  - Multiple workflows for the same task

- **UI Edge Cases**
  - Very long log messages
  - Rapid status updates
  - Card in collapsed state when update arrives
  - Multiple cards expanded simultaneously
  - Workflow completion while user is viewing logs

## Acceptance Criteria
1. WebSocket service successfully parses and emits all message types sent by the server
2. Kanban store receives and processes status_update messages in real-time
3. Workflow updates are correctly associated with tasks based on issue_number or adw_id
4. KanbanCard displays real-time logs in a beautified, scrollable format
5. Stage progression is visualized with progress indicators and updates automatically
6. Workflow metadata (ADW ID, status, timestamps) is displayed on cards
7. WebSocket connection health is visible with reconnection capabilities
8. Card UI remains performant with multiple concurrent workflows
9. Error states are handled gracefully with user-friendly messages
10. Expandable/collapsible sections work smoothly without layout shifts
11. E2E test validates entire real-time update flow with screenshots
12. All existing tests pass with zero regressions
13. Frontend builds successfully without errors or warnings
14. Feature works seamlessly in both connected and disconnected WebSocket states

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_realtime_updates.md` to validate real-time WebSocket communication and UI updates work correctly
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend type checking to validate the feature works with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes

### WebSocket Message Flow
The typical message flow for a workflow is:
1. User triggers workflow from UI → `trigger_workflow` message sent
2. Server responds → `trigger_response` with status="accepted" and adw_id
3. Server sends initial update → `status_update` with status="started"
4. Server sends progress updates → `status_update` with status="in_progress", progress_percent, current_step
5. Server sends completion → `status_update` with status="completed" or "failed"

### Key Design Considerations
- **Performance**: With multiple concurrent workflows, the UI must handle frequent updates without lag. Use React optimization techniques (memo, useMemo, useCallback) and consider message batching.
- **Scalability**: Design the log storage to handle potentially thousands of log entries per workflow. Consider pagination or virtual scrolling.
- **User Experience**: Auto-expanding cards on workflow start can be disruptive if user is focused elsewhere. Consider subtle notifications instead.
- **Data Persistence**: Decide whether workflow logs should persist after page reload. Consider storing recent logs in localStorage.
- **Accessibility**: Ensure real-time updates are announced to screen readers. Use ARIA live regions for status updates.

### Future Enhancements
- Implement log export functionality (download logs as text/JSON)
- Add log search across all tasks
- Implement workflow pause/resume from UI
- Add workflow timeline visualization showing all stages
- Implement notification system for workflow completion
- Add ability to view historical workflow runs for a task
- Implement log level filtering (INFO/WARNING/ERROR)
- Add real-time metrics dashboard for all active workflows

### Related Documentation
- WebSocket Integration Guide: Understanding the communication protocol
- ADW Workflow Documentation: Understanding workflow lifecycle and stages
- Zustand Best Practices: Optimizing state management for real-time updates
- React Performance Optimization: Handling frequent re-renders efficiently
