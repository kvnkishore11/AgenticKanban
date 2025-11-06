# Feature: Fix Patch Workflow ADW ID Selection Error

## Metadata
issue_number: `61`
adw_id: `f7f76883`
issue_json: `{"number":61,"title":"when i click on patch and select some adw_id, idea...","body":"when i click on patch and select some adw_id, ideally it should apply the patch to that adw_id but inturn it is throwing this error. please ensure that the patch works as intended and expected.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/ce85c5fa-f06c-4b78-ae0a-f1aa9687d89d)\n\n"}`

## Feature Description
Fix the error that occurs when users attempt to trigger the "Patch (Isolated)" workflow (`adw_patch_iso`) with a selected ADW ID. Currently, when users click on a task, open the workflow trigger modal, select the "Patch" workflow type, and then select an existing ADW ID from the dropdown, the system throws an error instead of successfully triggering the patch workflow. This bug prevents users from applying patches to existing worktrees, blocking a critical workflow capability.

The error appears to occur during the workflow trigger process when the system attempts to validate and process the patch request with the selected ADW ID.

## User Story
As a developer using AgenticKanban
I want to trigger the Patch workflow with an existing ADW ID
So that I can apply quick fixes and updates to existing worktrees without having to re-run the entire SDLC pipeline

## Problem Statement
The patch workflow (`adw_patch_iso`) is failing when triggered with a selected ADW ID. The system is currently throwing an error (visible in the attached screenshot) during the workflow trigger process. This prevents users from:
1. Applying patches to existing worktrees
2. Making quick fixes to ongoing development work
3. Utilizing the patch workflow as intended

The root cause appears to be in the workflow trigger validation, ADW ID handling, or the communication between the frontend and WebSocket server when processing patch requests with existing ADW IDs.

## Solution Statement
Implement comprehensive error handling and validation for the patch workflow trigger process. The solution will:

1. **Validate ADW ID Selection**: Ensure the selected ADW ID exists and is in a valid state for patch operations
2. **Improve Error Messaging**: Replace generic errors with specific, actionable error messages that help users understand what went wrong
3. **Fix Backend Integration**: Ensure the WebSocket service correctly formats and sends patch requests with ADW IDs
4. **Add Validation Checks**: Implement proper validation before triggering the workflow to catch issues early
5. **Enhance User Feedback**: Provide clear status updates and error messages in the UI during the patch workflow trigger process
6. **Test E2E Flow**: Create comprehensive end-to-end tests to validate the entire patch workflow trigger process

## Relevant Files
Use these files to implement the feature:

- `src/components/forms/WorkflowTriggerModal.jsx` - Main UI component for triggering workflows, handles workflow type selection, ADW ID input, and patch request input. Contains the form submission logic that triggers the workflow (lines 18-425).

- `src/components/ui/AdwIdInput.jsx` - Component for ADW ID input with dropdown selection, validation, and autocomplete from existing ADWs. Manages ADW discovery and selection (lines 1-378).

- `src/utils/adwValidation.js` - Validation utilities for ADW ID format and workflow requirements. Defines which workflows require ADW IDs and validation rules (lines 1-293).

- `src/stores/kanbanStore.js` - Zustand store managing state and triggering workflows via WebSocket. Contains `triggerWorkflowForTask` function (lines 1112-1185) that orchestrates the workflow trigger process.

- `src/services/websocket/websocketService.js` - WebSocket service handling communication with the ADW trigger server. Contains `triggerWorkflowForTask` function (lines 668-690) that formats and sends workflow trigger requests.

- `src/services/api/adwDiscoveryService.js` - Service for discovering and listing available ADW IDs from the agents directory. Provides ADW ID validation and filtering capabilities.

- `src/services/adwCreationService.js` - Service for creating ADW configurations and generating workflow names. May need updates to properly handle patch workflows (lines 1-438).

- `app/server/api/websocket_handler.py` - Backend WebSocket handler that receives workflow trigger requests and processes them. May contain validation or error handling that needs updating.

- `adws/adw_patch_iso.py` - The actual patch workflow implementation that executes when triggered. Needs to properly handle ADW ID references and patch requests.

- `.claude/commands/conditional_docs.md` - To check if additional documentation is needed for this feature.
- `.claude/commands/test_e2e.md` - Template for creating E2E tests to validate the patch workflow functionality.
- `.claude/commands/e2e/test_basic_query.md` - Example E2E test structure to follow.

### New Files

- `.claude/commands/e2e/test_patch_workflow.md` - New E2E test file that validates the complete patch workflow trigger process, including:
  - Opening the workflow trigger modal
  - Selecting the "Patch (Isolated)" workflow type
  - Selecting an existing ADW ID from the dropdown
  - Entering patch request details
  - Triggering the workflow
  - Validating successful workflow initiation
  - Capturing screenshots at each step

## Implementation Plan

### Phase 1: Investigation and Root Cause Analysis
Investigate the exact error occurring during patch workflow triggers by:
1. Examining browser console logs and error messages
2. Tracing the data flow from WorkflowTriggerModal through kanbanStore to websocketService
3. Reviewing backend WebSocket handler logs
4. Identifying where the validation or processing is failing
5. Understanding the expected vs. actual data format for patch requests

### Phase 2: Core Implementation
Fix the identified issues in the workflow trigger pipeline:
1. Update validation logic in adwValidation.js if needed to properly handle patch workflows
2. Fix error handling in WorkflowTriggerModal.jsx to provide better error messages
3. Update triggerWorkflowForTask in kanbanStore.js to properly validate and format patch requests
4. Fix websocketService.js to correctly send patch requests with ADW IDs
5. Update backend websocket_handler.py to properly process patch workflow triggers
6. Add defensive checks and early validation to catch errors before sending requests

### Phase 3: Integration and Testing
Integrate all fixes and validate the complete flow:
1. Create E2E test to validate patch workflow trigger process
2. Test with various ADW ID selections (valid, invalid, non-existent)
3. Test with different patch request formats
4. Validate error messages are clear and actionable
5. Ensure successful patch workflow triggers move task to appropriate stage
6. Run full test suite to ensure no regressions

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Investigate the Error
- Read the issue description and analyze the attached screenshot to understand the specific error message
- Use browser developer tools or logs to identify the exact error stack trace
- Trace the code path from WorkflowTriggerModal submission through kanbanStore to websocketService
- Identify the specific line or function where the error is occurring
- Document the root cause in a comment or spec note

### 2. Review Current Patch Workflow Implementation
- Read `src/components/forms/WorkflowTriggerModal.jsx` focusing on the patch workflow handling (lines 356-374)
- Read `src/services/websocket/websocketService.js` focusing on the `triggerWorkflowForTask` function (lines 668-690)
- Read `src/stores/kanbanStore.js` focusing on the `triggerWorkflowForTask` function (lines 1112-1185)
- Review how patch_request is passed through the request chain
- Identify any validation or formatting issues in the request payload

### 3. Fix Validation and Error Handling
- Update `src/utils/adwValidation.js` if validation rules for patch workflows need adjustment
- Enhance error handling in `src/components/forms/WorkflowTriggerModal.jsx`:
  - Add specific error messages for patch workflow failures
  - Validate ADW ID exists before submission
  - Validate patch_request is properly formatted
  - Add try-catch blocks with detailed error logging
- Update `src/stores/kanbanStore.js` to add validation checks before triggering workflow:
  - Verify task exists and is in valid state
  - Validate ADW ID format and existence for patch workflows
  - Add detailed error logging for debugging
- Enhance error messages to be user-friendly and actionable

### 4. Fix WebSocket Service Request Formatting
- Update `src/services/websocket/websocketService.js` `triggerWorkflowForTask` function:
  - Ensure patch_request is correctly included in the request payload
  - Verify ADW ID is properly passed for patch workflows
  - Add validation before sending the WebSocket message
  - Improve error handling and logging for failed requests
- Ensure the request format matches what the backend expects for patch workflows

### 5. Review and Fix Backend Integration
- Read `app/server/api/websocket_handler.py` to understand backend expectations
- Verify the backend properly processes patch workflow trigger requests with ADW IDs
- Fix any backend validation or error handling issues
- Ensure proper error messages are returned to the frontend
- Add logging for debugging patch workflow triggers

### 6. Update ADW Patch Script if Needed
- Read `adws/adw_patch_iso.py` to understand the patch workflow implementation
- Verify it properly handles ADW ID references
- Fix any issues with ADW ID validation or worktree access
- Ensure proper error handling and reporting back to the WebSocket server

### 7. Create E2E Test File
- Read `.claude/commands/test_e2e.md` to understand the E2E test framework
- Read `.claude/commands/e2e/test_basic_query.md` as an example E2E test
- Create `.claude/commands/e2e/test_patch_workflow.md` with comprehensive test steps:
  - Navigate to the application
  - Create a test task or use existing task
  - Open the workflow trigger modal
  - Select "Patch (Isolated)" workflow type
  - Select an existing ADW ID from the dropdown
  - Enter patch request details
  - Click trigger workflow button
  - Verify no error occurs
  - Verify workflow starts successfully
  - Verify task moves to appropriate stage
  - Capture screenshots at each step
- Include clear success criteria and verification steps

### 8. Manual Testing
- Start the application (frontend and backend)
- Create a test task in the Kanban board
- Trigger a non-patch workflow (like adw_plan_iso) to create an ADW ID
- Wait for the workflow to complete or reach a stage where patch can be applied
- Open the workflow trigger modal for the task
- Select "Patch (Isolated)" workflow type
- Select the ADW ID from the dropdown
- Enter a patch request description
- Click trigger workflow button
- Verify the workflow triggers successfully without errors
- Check browser console for any errors or warnings
- Verify the task moves to the correct stage
- Check backend logs for successful workflow trigger

### 9. Test Edge Cases
- Test with an invalid ADW ID (should show validation error, not crash)
- Test with an empty patch request (should either use task description or show validation error)
- Test with a non-existent ADW ID (should show error before triggering)
- Test with special characters in patch request (should be properly escaped)
- Test when WebSocket is disconnected (should show connection error)
- Verify all error messages are clear and actionable

### 10. Run Validation Commands
- Execute all validation commands from the Validation Commands section
- Ensure all tests pass with zero errors
- Fix any failing tests or regressions
- Verify the E2E test passes successfully
- Review all error logs to ensure no warnings or errors remain

## Testing Strategy

### Unit Tests
- Add unit tests for `adwValidation.js` to verify patch workflow validation rules
- Add unit tests for `websocketService.js` to verify request formatting for patch workflows
- Add unit tests for error handling in `WorkflowTriggerModal.jsx`
- Test ADW ID validation with valid and invalid inputs
- Test patch_request formatting and validation

### Integration Tests
- Test the complete flow from WorkflowTriggerModal to websocketService
- Verify proper error propagation through the stack
- Test WebSocket communication with mock server
- Verify proper request/response handling for patch workflows

### Edge Cases
1. **Invalid ADW ID**: Selected ADW ID doesn't exist or is malformed
   - Expected: Clear error message, no workflow trigger
2. **Empty Patch Request**: No patch request provided
   - Expected: Either use task description or show validation error
3. **WebSocket Disconnected**: User tries to trigger while offline
   - Expected: Connection error message, request not sent
4. **Backend Error**: Backend rejects the patch request
   - Expected: Backend error message displayed to user
5. **Special Characters**: Patch request contains special characters or code snippets
   - Expected: Properly escaped and sent to backend
6. **Concurrent Workflows**: User triggers multiple patch workflows
   - Expected: All workflows trigger correctly without conflicts
7. **ADW ID in Use**: Selected ADW ID already has an active workflow
   - Expected: Clear message about workflow status

## Acceptance Criteria
- [ ] User can select "Patch (Isolated)" workflow type in the workflow trigger modal
- [ ] User can select an existing ADW ID from the dropdown
- [ ] User can enter patch request details in the text area
- [ ] Clicking "Trigger Workflow" successfully starts the patch workflow without errors
- [ ] Clear, actionable error messages are shown if validation fails
- [ ] Error messages specify exactly what went wrong (e.g., "ADW ID 'abc123' not found")
- [ ] The task moves to the appropriate stage after workflow trigger
- [ ] WebSocket communication works correctly for patch workflow triggers
- [ ] Backend properly processes patch workflow trigger requests
- [ ] E2E test validates the complete patch workflow trigger process
- [ ] All existing tests continue to pass (no regressions)
- [ ] Browser console shows no errors during patch workflow trigger
- [ ] Backend logs show successful workflow trigger with proper ADW ID

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md` to understand how to execute E2E tests
- Read and execute `.claude/commands/e2e/test_patch_workflow.md` to validate the patch workflow trigger functionality works correctly end-to-end
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `bun tsc --noEmit` - Run frontend type checking to validate the feature works with zero regressions
- `bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes

### Important Context
- The patch workflow (`adw_patch_iso`) is a dependent workflow that REQUIRES an existing ADW ID (see `src/utils/adwValidation.js:10-16`)
- The ADW ID must reference an existing worktree from a previous workflow execution
- The AdwIdInput component (line 88-92) has regex validation that only allows alphanumeric characters up to 8 characters
- The patch_request field in WorkflowTriggerModal is optional when an ADW ID is provided (line 359)
- The WebSocket service includes the patch_request in the issue_json payload (line 679)

### Likely Root Causes
Based on code analysis, the error could be caused by:
1. **ADW ID Validation**: The selected ADW ID might not exist in the agents directory, causing the backend to fail
2. **Request Formatting**: The patch_request might not be formatted correctly in the WebSocket payload
3. **Backend Processing**: The backend might be expecting a different request format for patch workflows
4. **Worktree Access**: The adw_patch_iso.py script might fail to access the worktree for the selected ADW ID
5. **Missing Validation**: The frontend might not validate that the ADW ID exists before sending the trigger request

### Debugging Steps
If the error persists after implementation:
1. Check browser console for JavaScript errors during workflow trigger
2. Check WebSocket messages in browser Network tab to see exact payload sent
3. Check backend logs for error messages from websocket_handler.py
4. Check adws/agents/<adw_id>/ directory exists for the selected ADW ID
5. Verify the ADW ID state file (state.json) is valid and accessible
6. Test with a freshly created ADW ID from a successful plan workflow

### Future Enhancements
- Add ability to browse and preview ADW ID states before selecting
- Show worktree status (active, idle, error) in ADW ID dropdown
- Validate ADW ID is in a "patchable" state before allowing selection
- Add "Recently Used" section in ADW ID dropdown
- Show last modified timestamp for each ADW ID
- Add filtering by workflow type (only show ADW IDs from compatible workflows)
