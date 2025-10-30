# Bug: Fix WebSocket Endpoint Configuration and UI Location

## Metadata
issue_number: `001`
adw_id: `002`
issue_json: `{"title": "WebSocket Endpoint Configuration Bug", "body": "WebSocket endpoint: ws://localhost:8002/ws/trigger this is how my endpoint connection looks like.. i think you need to configure accordingly.. by the way this information should not be part of the ticket creation.. it should be part of settings icon present for that project"}`

## Bug Description
The WebSocket notification system has two critical issues:
1. **Incorrect WebSocket URL Construction**: The system constructs WebSocket URLs as `ws://host:port` but the actual endpoint requires the path `/ws/trigger`, making the correct format `ws://host:port/ws/trigger`
2. **Incorrect UI Location**: Project notification settings are displayed in the task creation form, but they should only be accessible via the settings icon in the project selector

## Problem Statement
The WebSocket connection fails because the URL is missing the `/ws/trigger` path, and the notification configuration UI appears in the wrong location (task creation form) when it should only be in the project settings area.

## Solution Statement
1. Update the WebSocket URL construction to include the `/ws/trigger` path in both the connection and testing methods
2. Remove the notification configuration UI from the TaskInput component and ensure it's only accessible via the ProjectSelector settings icon

## Steps to Reproduce
1. Open the application and select a project
2. Click "Create New Task" to open the task creation form
3. Observe that notification settings appear in the task creation form (incorrect behavior)
4. Configure port 8002 in the notification settings
5. Click "Test Connection" or "Connect"
6. Observe connection error: "Unable to connect to localhost:8002" (missing `/ws/trigger` path)

## Root Cause Analysis
1. **WebSocket URL Issue**: In `projectNotificationService.js`, both `testConnection()` and `connectToProject()` methods construct URLs as `ws://${host}:${port}` without the required `/ws/trigger` endpoint path
2. **UI Location Issue**: The TaskInput component includes a full notification configuration section that duplicates functionality already available in ProjectSelector, violating the intended UX design where notifications should only be configured via project settings

## Relevant Files
Use these files to fix the bug:

- `src/services/projectNotificationService.js` - Contains WebSocket URL construction logic that needs to include `/ws/trigger` path
- `src/components/TaskInput.jsx` - Contains notification configuration UI that should be removed from task creation
- `src/components/ProjectSelector.jsx` - Contains correct notification settings location (reference for proper implementation)
- `src/components/ProjectPortConfiguration.jsx` - Configuration component that should only be used in ProjectSelector

### New Files
- `.claude/commands/e2e/test_websocket_endpoint_fix.md` - E2E test to validate WebSocket connection and UI location fixes

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Fix WebSocket URL Construction
- Update `testConnection()` method in `src/services/projectNotificationService.js` to construct URL as `ws://${host}:${port}/ws/trigger`
- Update `connectToProject()` method in `src/services/projectNotificationService.js` to construct URL as `ws://${host}:${port}/ws/trigger`
- Ensure both methods consistently use the correct endpoint path

### Task 2: Remove Notification Settings from Task Creation
- Remove the "Project Notifications" section from `src/components/TaskInput.jsx`
- Remove notification-related state variables and functions from TaskInput component
- Remove notification configuration imports and dependencies from TaskInput
- Ensure task creation still properly triggers notifications via the kanban store

### Task 3: Simplify Task Creation Notification UI
- Keep only a simple notification status indicator in TaskInput (if project has notifications enabled)
- Remove the full configuration panel and "Configure" button from TaskInput
- Direct users to project settings for notification configuration

### Task 4: Create E2E Test for Bug Fix
- Read `.claude/commands/e2e/test_basic_query.md` and create a new E2E test file in `.claude/commands/e2e/test_websocket_endpoint_fix.md` that validates:
  - WebSocket connection works with correct `/ws/trigger` endpoint
  - Notification settings are only accessible via ProjectSelector settings icon
  - Task creation form does not contain notification configuration UI
  - Notification functionality works end-to-end with proper endpoint

### Task 5: Run Validation Commands
- Execute all validation commands to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_websocket_endpoint_fix.md` test file to validate this functionality works
- `npm run lint` - Run linting to validate code quality standards
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions
- `npm run test` - Run frontend tests to validate the bug is fixed with zero regressions
- `npm start` - Start the development server and manually test WebSocket connection with port 8002
- Manually verify task creation form no longer shows notification configuration
- Manually verify notification settings are accessible only via ProjectSelector settings icon
- Test WebSocket connection to `ws://localhost:8002/ws/trigger` endpoint

## Notes
- The WebSocket endpoint path `/ws/trigger` is critical for the connection to work properly
- The ProjectSelector already has the correct notification settings implementation with a settings icon
- Task creation should remain focused on task details, not project configuration
- Ensure backward compatibility with existing notification functionality
- The fix should maintain separation between task creation and project configuration concerns