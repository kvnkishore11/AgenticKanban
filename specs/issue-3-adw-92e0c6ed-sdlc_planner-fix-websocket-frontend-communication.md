# Feature: Fix WebSocket Frontend Communication and Stage Progression Visualization

## Metadata
issue_number: `3`
adw_id: `92e0c6ed`
issue_json: `{"number":3,"title":"i still dont see any correlation iwth ui and what...","body":"i still dont see any correlation iwth ui and what is happenign with my adw_id. ideally the websocket has to communicate everything to frontend. i dont see any of the details from websocket just for recieved only at the time of triggering workflow when sending teh ticket. after that there is no communication of any sort. u need to first figure out sending all the possible messages to frontend. and then next step to show the stage progression of the card in teh stages of the kanban ui.."}`

## Feature Description
Currently, the WebSocket server only sends minimal communication to the frontend when workflows are triggered. The frontend receives only the initial trigger confirmation but no subsequent status updates, progress information, or workflow logs during execution. This creates a disconnect between backend workflow execution and frontend visualization, making it impossible for users to track their ADW workflow progress in real-time.

This feature will establish comprehensive bidirectional WebSocket communication to send ALL workflow events, status updates, progress information, and logs from the backend to the frontend. It will also implement visual stage progression indicators in the Kanban UI to show cards moving through workflow stages (plan → build → test → review → document → PR) based on real-time WebSocket messages.

## User Story
As a kanban user
I want to see real-time updates of my workflow progress in the UI
So that I can track the status of my ADW workflows, understand what stage they're in, see detailed logs, and know when tasks are completed without having to check backend logs manually

## Problem Statement
The current implementation has a major gap in WebSocket communication:
1. **Limited Message Types**: Backend only sends `trigger_response` initially but no follow-up `status_update` or `workflow_log` messages during execution
2. **No Backend Integration**: ADW workflows (adw_plan_iso.py, adw_build_iso.py, etc.) don't emit WebSocket messages to communicate progress
3. **Missing Frontend Handlers**: Frontend has event listeners for `status_update` and `workflow_log` events but never receives these messages
4. **No Visual Feedback**: Kanban cards don't show stage progression, current step, progress percentage, or real-time logs
5. **Disconnected Experience**: User triggers a workflow but sees no indication of what's happening until it completes (or fails)

## Solution Statement
Implement a comprehensive WebSocket messaging system that:
1. **Backend Workflow Instrumentation**: Add WebSocket message emission to all ADW workflow scripts at key execution points (start, progress, completion, error)
2. **Message Broadcasting**: Enhance the WebSocket server to broadcast workflow events to connected clients
3. **Frontend Event Processing**: Ensure frontend properly receives and processes all message types (status_update, workflow_log, etc.)
4. **Visual Stage Progression**: Update Kanban card UI to show current stage, substage, progress bar, and real-time log viewer
5. **End-to-End Flow**: Complete the communication loop from backend execution → WebSocket server → frontend UI updates

## Relevant Files
Use these files to implement the feature:

### Backend WebSocket Server
- `adws/adw_triggers/trigger_websocket.py` - WebSocket server that manages connections and message routing. Currently sends trigger_response but needs to broadcast status updates and logs from workflows. Lines 491-514 have send_status_update function but it's only used internally, not from workflow execution.
- `adws/adw_triggers/websocket_models.py` - Pydantic models for WebSocket messages including WorkflowStatusUpdate and other message types. Already has comprehensive models defined.

### Backend ADW Workflows
- `adws/adw_plan_iso.py` - Plan workflow that needs instrumentation to emit status updates
- `adws/adw_build_iso.py` - Build workflow that needs instrumentation
- `adws/adw_test_iso.py` - Test workflow that needs instrumentation
- `adws/adw_review_iso.py` - Review workflow that needs instrumentation
- `adws/adw_document_iso.py` - Document workflow that needs instrumentation
- `adws/adw_ship_iso.py` - Ship/PR workflow that needs instrumentation
- `adws/adw_patch_iso.py` - Patch workflow that needs instrumentation
- All composite workflows (adw_plan_build_iso.py, adw_plan_build_test_iso.py, etc.) - Need instrumentation

### Backend Workflow Utilities
- `adws/adw_modules/utils.py` - Shared utilities for ADW workflows, may need WebSocket client helper functions
- `adws/adw_modules/state.py` - ADW state management, may need integration with WebSocket updates
- `adws/adw_modules/workflow_ops.py` - Workflow operations and coordination

### Frontend WebSocket Service
- `src/services/websocket/websocketService.js` - WebSocket client service. Already has event listeners for `status_update` and `workflow_log` (lines 869-875) but these are never triggered because backend doesn't send these messages.
- `src/services/websocket/connectionHealthMonitor.js` - Connection health monitoring

### Frontend State Management
- `src/stores/kanbanStore.js` - Central state management. Has handlers for WebSocket events (handleWorkflowStatusUpdate at line 963, handleWorkflowLog at line 1025) but they're never called because messages aren't sent from backend.

### Frontend UI Components
- `src/components/kanban/KanbanCard.jsx` - Kanban card component that displays task info. Lines 54-56 retrieve workflow logs/progress/metadata but these are always empty. Needs visual indicators for stage progression.
- `src/components/kanban/WorkflowLogViewer.jsx` - Component for viewing workflow logs (likely exists, need to verify)
- `src/components/kanban/StageProgressionViewer.jsx` - Component for viewing stage progression (likely exists, need to verify)
- `src/components/ui/WebSocketStatusIndicator.jsx` - WebSocket connection status indicator

### Frontend Utilities
- `src/utils/websocketErrorMapping.js` - Error mapping utilities for WebSocket errors

### Configuration & Environment
- `.ports.env` - Port configuration for frontend and backend services
- `.env` - Environment variables

### Documentation
- `app_docs/WebSocket_Message_Flow_Documentation.md` - WebSocket message flow documentation (if exists)
- `app_docs/TAC-7_WebSocket_Compliance_Checklist.md` - WebSocket compliance checklist (if exists)

### Testing
- `.claude/commands/test_e2e.md` - E2E test runner command documentation
- `.claude/commands/e2e/test_websocket_reliability.md` - Existing WebSocket reliability E2E test documentation

### New Files

#### E2E Test File
- `.claude/commands/e2e/test_websocket_stage_progression.md` - New E2E test to validate WebSocket communication sends all messages to frontend and stage progression visualization works correctly

## Implementation Plan

### Phase 1: Backend WebSocket Message Emission Infrastructure
Create the infrastructure for ADW workflows to emit WebSocket messages to connected clients. This includes:
- Creating a WebSocket client utility that workflows can use to send messages to the WebSocket server
- Adding helper functions for common message types (status updates, progress updates, log entries, stage transitions)
- Testing message emission from a simple workflow to verify the communication path works

### Phase 2: Instrument All ADW Workflows
Add WebSocket message emission at critical points in all ADW workflow scripts:
- Workflow start messages
- Stage transition messages (e.g., moving from plan → build)
- Progress update messages (with percentage completion)
- Detailed log messages for significant operations
- Completion and error messages
- Ensure messages include all required fields (adw_id, workflow_name, status, message, timestamp, progress_percent, current_step)

### Phase 3: Enhance WebSocket Server Broadcasting
Update the WebSocket server to properly broadcast workflow messages:
- Ensure server can receive messages from workflow processes
- Broadcast received messages to all connected clients (or specific client based on adw_id)
- Validate message format before broadcasting
- Add logging for troubleshooting message flow

### Phase 4: Frontend Message Processing
Verify and enhance frontend WebSocket event processing:
- Ensure all message types are properly handled
- Update Kanban store state with received workflow data
- Add debug logging to trace message flow from WebSocket to UI
- Test that messages trigger UI updates

### Phase 5: Kanban UI Stage Progression Visualization
Implement visual feedback in Kanban cards:
- Add progress bar showing completion percentage
- Display current stage and substage
- Show real-time status indicator (in progress, completed, failed)
- Implement collapsible log viewer for workflow logs
- Add visual stage progression timeline showing past, current, and upcoming stages
- Update card styling based on workflow status (active, success, error)

### Phase 6: End-to-End Integration Testing
Validate the complete communication flow:
- Trigger a workflow from the UI
- Verify all message types are received by frontend
- Confirm UI updates reflect real-time workflow progress
- Test stage progression visualization
- Validate error handling and recovery

## Step by Step Tasks

### 1. Create WebSocket Client Utility for Backend Workflows
- Create a new file `adws/adw_modules/websocket_client.py` with a WebSocketNotifier class
- Implement methods to send different message types: send_status_update(), send_progress_update(), send_log(), send_stage_transition()
- Add connection pooling and error handling for reliability
- Create helper functions to simplify usage: notify_start(), notify_progress(), notify_complete(), notify_error()
- Add configuration to read WebSocket server host/port from environment variables
- Test the utility by creating a simple test script that sends messages

### 2. Instrument adw_plan_iso.py with WebSocket Messages
- Import WebSocketNotifier at the top of the file
- Initialize notifier with adw_id at workflow start
- Add workflow start message: notifier.notify_start(workflow_name="adw_plan_iso", adw_id=adw_id)
- Add progress updates at key milestones (0%, 25%, 50%, 75%, 100%)
- Add log messages for significant operations (reading spec, creating plan, validating output)
- Add stage transition message when planning stage completes
- Add completion message with results
- Add error handling to send error messages on failure
- Test workflow execution and verify messages appear in WebSocket server logs

### 3. Instrument All Other Individual ADW Workflows
- Apply same instrumentation pattern to:
  - adw_build_iso.py (build stage workflow)
  - adw_test_iso.py (test stage workflow)
  - adw_review_iso.py (review stage workflow)
  - adw_document_iso.py (documentation stage workflow)
  - adw_ship_iso.py (PR/ship stage workflow)
  - adw_patch_iso.py (patch workflow)
- Ensure each workflow emits consistent message formats
- Test each workflow individually to verify message emission

### 4. Instrument Composite ADW Workflows
- Apply instrumentation to composite workflows:
  - adw_plan_build_iso.py
  - adw_plan_build_test_iso.py
  - adw_plan_build_test_review_iso.py
  - adw_plan_build_document_iso.py
  - adw_plan_build_review_iso.py
  - adw_sdlc_iso.py (full SDLC workflow)
  - adw_sdlc_zte_iso.py
- Ensure progress percentages are calculated across all sub-workflows
- Add stage transition messages between each sub-workflow
- Test composite workflows to verify continuous message stream

### 5. Enhance WebSocket Server Message Broadcasting
- Review trigger_websocket.py to understand current message handling
- Verify server can receive messages from workflow processes (may need to add HTTP endpoint or shared message queue)
- If needed, create an HTTP endpoint on the WebSocket server for workflows to POST messages to
- Implement broadcasting logic to send received workflow messages to all connected clients
- Add message validation before broadcasting
- Add comprehensive logging for message flow debugging
- Test message broadcasting with a simple workflow

### 6. Verify Frontend WebSocket Event Listeners
- Review websocketService.js event listener setup (lines 869-875)
- Verify all message types are registered: status_update, workflow_log, error, pong, trigger_response
- Add debug logging to each event listener to track message receipt
- Test event listeners by manually triggering them with mock data
- Ensure event listeners call the correct Kanban store handlers

### 7. Enhance Frontend State Management
- Review kanbanStore.js handlers: handleWorkflowStatusUpdate (line 963), handleWorkflowLog (line 1025)
- Verify handlers update state correctly with received data
- Add comprehensive logging to track state changes
- Ensure task metadata, logs, and progress are updated
- Test state updates with mock WebSocket messages
- Verify UI components re-render when state changes

### 8. Implement Progress Bar in KanbanCard Component
- Add progress bar component to KanbanCard.jsx
- Use workflowProgress data from store to display percentage
- Style progress bar with color coding: blue (in progress), green (complete), red (error)
- Add smooth animation for progress updates
- Display progress percentage text (e.g., "45%")
- Test progress bar with various progress values (0%, 50%, 100%)

### 9. Implement Current Stage/Substage Display in KanbanCard
- Add visual indicators for current stage and substage
- Display workflow_name, current_step from workflowProgress
- Add icon indicators for each stage (plan, build, test, review, document, PR)
- Highlight current stage in the stage progression timeline
- Display substage details below the main stage
- Test with workflows in different stages

### 10. Implement Real-time Log Viewer in KanbanCard
- Create collapsible log viewer section in KanbanCard
- Display logs from workflowLogs array in reverse chronological order
- Add log level indicators (INFO, SUCCESS, ERROR, WARNING)
- Add timestamp formatting for each log entry
- Implement auto-scroll to latest log entry
- Add clear logs button
- Style logs for readability (monospace font, color coding by level)
- Test log viewer with various log messages

### 11. Implement Stage Progression Timeline Visualization
- Create a visual timeline showing all workflow stages
- Mark past stages as completed (with checkmarks)
- Highlight current stage as in-progress (with spinner or pulse animation)
- Show future stages as pending (grayed out)
- Add tooltips with stage descriptions
- Display stage names and estimated completion times
- Test timeline with workflows at different stages

### 12. Add Visual Status Indicators to KanbanCard
- Add status badge showing workflow state: "In Progress", "Completed", "Failed", "Queued"
- Use color coding: blue (in progress), green (success), red (error), gray (queued)
- Add animated indicators for active workflows (pulse, spinner)
- Update card border or background based on status
- Add hover effects to show more details
- Test status indicators with different workflow states

### 13. Create E2E Test for WebSocket Stage Progression
- Create new file `.claude/commands/e2e/test_websocket_stage_progression.md`
- Define test scenarios:
  1. Trigger workflow and verify initial status_update message received
  2. Verify progress updates received at regular intervals
  3. Verify log messages appear in UI in real-time
  4. Verify stage transition messages update card stage
  5. Verify completion message moves card to completed state
  6. Verify error messages move card to error state
  7. Verify multiple concurrent workflows maintain separate state
  8. Verify UI updates are smooth without flickering
- Include screenshot requirements for each test step
- Follow the format of test_websocket_reliability.md

### 14. Validate WebSocket Message Flow End-to-End
- Start WebSocket server and frontend application
- Create a new kanban task
- Trigger a simple workflow (adw_plan_iso)
- Monitor browser DevTools Network > WS tab for incoming messages
- Verify sequence of messages: trigger_response → status_update (started) → progress updates → logs → status_update (completed)
- Check Kanban card UI updates in real-time
- Review browser console logs for event listener execution
- Verify store state contains all workflow data
- Take screenshots of message flow and UI updates

### 15. Test Error Handling and Edge Cases
- Test workflow failure scenario and verify error messages sent to UI
- Test WebSocket disconnection during workflow execution
- Verify message queuing works when disconnected
- Test reconnection and message delivery after connection restored
- Test multiple concurrent workflows with different stages
- Test rapid workflow triggers (stress test)
- Verify no memory leaks with long-running workflows
- Test workflow cancellation (if supported)

### 16. Run E2E Test Suite
- Read `.claude/commands/test_e2e.md` to understand E2E test execution
- Read and execute the new E2E test file `.claude/commands/e2e/test_websocket_stage_progression.md`
- Execute all test scenarios and capture screenshots
- Verify all success criteria are met
- Document any failures or issues
- Create test report with screenshots

### 17. Run Validation Commands
Execute all validation commands to ensure zero regressions:
- `cd app/server && uv run pytest` - Run backend tests
- Manual WebSocket message flow test using browser DevTools
- E2E test execution as defined in test_websocket_stage_progression.md
- Visual verification of Kanban UI updates
- Performance testing for message throughput

## Testing Strategy

### Unit Tests
- Test WebSocketNotifier class methods in isolation
- Test message formatting and validation
- Test frontend event listeners with mock messages
- Test Kanban store handlers with mock data
- Test UI components with mock props
- Verify edge cases: null values, missing fields, invalid formats

### Integration Tests
- Test WebSocket server receives messages from workflow scripts
- Test message broadcasting to connected clients
- Test frontend receives and processes messages correctly
- Test state updates trigger UI re-renders
- Test multiple concurrent workflows maintain separate state

### Edge Cases
- Workflow execution with no WebSocket connection
- Message delivery when client is temporarily disconnected
- Very long workflow execution (hours) with continuous updates
- Rapid message bursts (100+ messages in seconds)
- Large log messages (>10KB)
- Unicode and special characters in messages
- Invalid message formats and error recovery
- Server restart during active workflow execution
- Client page refresh during active workflow execution
- Multiple browser tabs/windows connected simultaneously

## Acceptance Criteria

### Backend Message Emission
- [ ] All ADW workflows emit status_update messages at start, progress milestones, and completion
- [ ] All ADW workflows emit workflow_log messages for significant operations
- [ ] All messages include required fields: adw_id, workflow_name, status, message, timestamp
- [ ] Progress updates include progress_percent (0-100) and current_step
- [ ] Error messages include error details and stack traces
- [ ] Messages are sent to WebSocket server successfully (verified in server logs)

### WebSocket Server Broadcasting
- [ ] Server receives messages from workflow processes
- [ ] Server validates message format before broadcasting
- [ ] Server broadcasts messages to all connected clients
- [ ] Server logs all message broadcasting activity
- [ ] Server handles message errors gracefully without crashing

### Frontend Message Processing
- [ ] Frontend receives all message types: trigger_response, status_update, workflow_log, error
- [ ] Event listeners process messages and update store state
- [ ] Store handlers update task metadata, logs, and progress
- [ ] UI components re-render when store state changes
- [ ] Browser console shows debug logs for message flow

### Kanban UI Visualization
- [ ] Progress bar displays current completion percentage (0-100%)
- [ ] Progress bar color changes based on status (blue/green/red)
- [ ] Current stage and substage are clearly displayed
- [ ] Stage progression timeline shows past/current/future stages
- [ ] Log viewer displays all workflow logs in real-time
- [ ] Logs are color-coded by level (INFO/SUCCESS/ERROR/WARNING)
- [ ] Status badge shows current workflow state
- [ ] Visual indicators animate for active workflows
- [ ] Card updates smoothly without flickering

### End-to-End Flow
- [ ] Triggering a workflow from UI sends trigger request via WebSocket
- [ ] Backend workflow receives trigger and starts execution
- [ ] Workflow emits messages during execution
- [ ] WebSocket server broadcasts messages to frontend
- [ ] Frontend receives messages and updates UI in real-time
- [ ] User sees complete workflow progress from start to finish
- [ ] Workflow completion updates card to final state
- [ ] Workflow errors move card to error state with details

### Performance & Reliability
- [ ] Message delivery latency < 100ms on average
- [ ] No message loss during normal operation
- [ ] Message queuing works during disconnection
- [ ] Reconnection delivers queued messages
- [ ] Multiple concurrent workflows maintain separate state
- [ ] No memory leaks with long-running workflows
- [ ] No UI freezing or performance degradation

### User Experience
- [ ] User can see what stage their workflow is in at a glance
- [ ] User can expand logs to see detailed execution information
- [ ] User can identify failed workflows immediately
- [ ] User understands workflow progress without technical knowledge
- [ ] Visual indicators provide clear feedback
- [ ] UI updates are smooth and professional

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

### Backend Validation
```bash
# Test WebSocket server starts successfully
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed
uv run start-websocket.py &
sleep 5
curl http://localhost:8002/health
# Expected: {"status":"healthy",...}

# Kill the background process
pkill -f start-websocket.py
```

### Workflow Message Emission Validation
```bash
# Trigger a workflow manually and observe WebSocket messages
# Start WebSocket server in one terminal
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed
uv run start-websocket.py

# In another terminal, trigger a test workflow
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed
uv run adws/adw_plan_iso.py 999 test-adw-id

# Monitor server terminal for broadcasted messages
# Should see: status_update (started), progress updates, logs, status_update (completed)
```

### E2E Test Validation
Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_stage_progression.md` to validate WebSocket communication and stage progression visualization works correctly.

### Frontend Build Validation
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed
npm run build
# Expected: Build completes successfully with no errors
```

### Type Checking Validation
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed
npm run type-check
# Expected: No type errors
```

### Backend Test Validation
```bash
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/92e0c6ed/app/server
uv run pytest
# Expected: All tests pass
```

### WebSocket Connection Test (Browser DevTools)
```
1. Start WebSocket server: uv run start-websocket.py
2. Start frontend: npm run dev
3. Open browser to http://localhost:5173
4. Open DevTools > Network > WS tab
5. Create a kanban task
6. Trigger a workflow
7. Observe WebSocket frames showing:
   - trigger_response
   - status_update (started)
   - Multiple progress updates
   - workflow_log messages
   - status_update (completed)
8. Verify Kanban card UI updates in real-time
9. Take screenshots of message flow and UI updates
```

### Visual Regression Testing
```
1. Compare Kanban card UI before and after workflow trigger
2. Verify progress bar animates smoothly
3. Verify logs appear in real-time
4. Verify stage progression timeline updates
5. Verify status indicators change appropriately
6. Verify no UI flickering or layout shifts
7. Capture screenshots for documentation
```

## Notes

### WebSocket Message Flow Architecture
The complete message flow should work as follows:

```
1. User triggers workflow in Kanban UI
   ↓
2. Frontend sends trigger_workflow message via WebSocket
   ↓
3. WebSocket server receives message and spawns workflow process
   ↓
4. WebSocket server sends trigger_response to frontend
   ↓
5. Workflow process starts execution
   ↓
6. Workflow sends status_update (started) to WebSocket server
   ↓
7. WebSocket server broadcasts status_update to all clients
   ↓
8. Frontend receives status_update, updates store, UI re-renders
   ↓
9. Workflow continues execution, sending periodic updates:
   - status_update with progress_percent
   - workflow_log messages with operation details
   - stage transition messages
   ↓
10. WebSocket server broadcasts all messages to clients
    ↓
11. Frontend receives all messages, updates UI in real-time
    ↓
12. Workflow completes
    ↓
13. Workflow sends status_update (completed) with final results
    ↓
14. WebSocket server broadcasts completion message
    ↓
15. Frontend updates card to completed state
```

### Key Technical Decisions

**1. Message Emission Mechanism:**
Since ADW workflows are spawned as separate processes, they cannot directly access the WebSocket server's connection manager. Two options:
- **Option A**: Create an HTTP endpoint on the WebSocket server that workflows can POST messages to
- **Option B**: Use a shared message queue (Redis, RabbitMQ) that the WebSocket server polls

**Recommendation**: Option A (HTTP endpoint) for simplicity and minimal dependencies.

**2. Message Broadcasting Strategy:**
- Broadcast all messages to all connected clients (simple, works for single-user scenarios)
- Filter messages by adw_id and only send to relevant clients (more complex, better for multi-user)

**Recommendation**: Start with broadcast to all clients, add filtering later if needed.

**3. Progress Calculation:**
Each workflow should emit progress updates at logical milestones:
- 0% - Workflow started
- 25% - Initial setup complete
- 50% - Main processing underway
- 75% - Processing complete, finalizing
- 100% - Workflow complete

Composite workflows should calculate overall progress across sub-workflows.

**4. Frontend State Management:**
Store workflow data at multiple levels:
- Global active workflows map (for all active workflows)
- Task-specific workflow data (workflowLogs, workflowProgress, workflowMetadata)
- Status update history (for debugging and analysis)

**5. UI Update Strategy:**
- Use React state updates to trigger re-renders
- Implement shouldComponentUpdate or React.memo to prevent excessive re-renders
- Use CSS transitions for smooth progress bar animations
- Debounce rapid message updates to prevent UI jank

### Future Enhancements
- Add workflow pause/resume functionality
- Add workflow cancellation
- Add workflow retry on failure
- Add workflow history and replay
- Add real-time collaboration (multiple users see same updates)
- Add notification system for workflow completion
- Add export workflow logs to file
- Add filter and search for workflow logs
- Add performance metrics (execution time, resource usage)
- Add workflow templates for common patterns

### Dependencies
This feature requires:
- FastAPI and uvicorn (already installed for WebSocket server)
- websockets library (already installed)
- React and Zustand (already installed for frontend)
- No new external dependencies needed

### Performance Considerations
- Limit log message size to prevent memory issues (max 10KB per message)
- Keep last 500 log messages per task in frontend state
- Implement message batching for high-frequency updates
- Use WebSocket compression for large messages
- Add rate limiting on message emission (max 10 messages/second per workflow)

### Security Considerations
- Validate all incoming messages on WebSocket server
- Sanitize log messages before displaying in UI (prevent XSS)
- Do not expose sensitive data in workflow messages
- Use authentication tokens for WebSocket connections (future enhancement)

### Accessibility Considerations
- Add ARIA labels to status indicators
- Ensure color coding is not the only means of conveying information
- Provide text alternatives for visual indicators
- Support keyboard navigation in log viewer
- Ensure sufficient color contrast for all UI elements
