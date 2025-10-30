# Feature: WebSocket Ticket Notification System

## Metadata
issue_number: `001`
adw_id: `001`
issue_json: `{"title": "WebSocket Ticket Notification to Running Project", "body": "After creating a ticket from create ticket, it should send the information of the ticket to the websocket connection where the project you have loaded is running. You need to find the way which port this is running and you should be sending to that particular port. If no port may be you have some input field of the port where this project is running and then pass the information needed for that."}`

## Feature Description
Implement a WebSocket notification system that automatically sends newly created ticket information to the running project's WebSocket connection. This enables real-time communication between the Agentic Kanban board and the development project being managed, allowing the running project to receive immediate notifications about new tickets, updates, and task information.

## User Story
As a developer using the Agentic Kanban board
I want newly created tickets to be automatically sent to my running project's WebSocket connection
So that my development environment can receive real-time notifications about new tasks and integrate them into my workflow

## Problem Statement
Currently, when tickets are created in the Agentic Kanban board, they only trigger ADW workflows through the ADW WebSocket trigger server. However, there's no mechanism to notify the actual running development project about these new tickets. This creates a disconnect between the kanban board management and the live development environment.

## Solution Statement
Create a secondary WebSocket notification system that:
1. Detects or allows configuration of the target project's WebSocket port
2. Automatically sends ticket information to the running project when tickets are created
3. Provides fallback configuration options when auto-detection fails
4. Maintains separation between ADW workflow triggers and project notifications

## Relevant Files
Use these files to implement the feature:

- `src/services/websocketService.js` - Existing WebSocket service for ADW integration (reference architecture)
- `src/stores/kanbanStore.js` - Main store where `createTask()` function needs enhancement
- `src/components/TaskInput.jsx` - Task creation form where port configuration UI may be needed
- `src/components/ProjectSelector.jsx` - Project selection component for port management
- `src/services/localStorage.js` - For persisting project port configurations
- `server.js` - Current Express server that could provide port discovery
- `package.json` - For adding any new dependencies if needed

### New Files
- `src/services/projectNotificationService.js` - New service for project WebSocket notifications
- `src/components/ProjectPortConfiguration.jsx` - UI component for managing project port settings
- `src/hooks/useProjectNotification.js` - Custom hook for managing project notification state

## Implementation Plan
### Phase 1: Foundation
Create the core project notification service architecture and establish the secondary WebSocket connection management system that operates independently from the existing ADW WebSocket service.

### Phase 2: Core Implementation
Implement the ticket notification logic that triggers when tickets are created, including port discovery mechanisms and configuration management for target project WebSocket connections.

### Phase 3: Integration
Integrate the notification system with the existing task creation workflow and provide UI for port configuration and connection status monitoring.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Create Project Notification Service
- Create `src/services/projectNotificationService.js` with WebSocket client functionality
- Implement connection management for project WebSocket endpoints
- Add port discovery mechanisms (try common development ports: 3000, 4000, 5000, 8080, etc.)
- Include connection health checking and retry logic
- Implement ticket data formatting for project consumption

### Task 2: Create Project Port Configuration Component
- Create `src/components/ProjectPortConfiguration.jsx` for managing project WebSocket settings
- Include auto-detection functionality with manual override option
- Add connection testing capabilities
- Implement save/load of port configurations per project
- Design responsive UI that integrates with existing design system

### Task 3: Create Project Notification Hook
- Create `src/hooks/useProjectNotification.js` custom hook
- Manage project notification connection state
- Handle automatic reconnection and error states
- Provide methods for sending notifications and checking connection status

### Task 4: Enhance Kanban Store with Project Notifications
- Modify `createTask()` function in `src/stores/kanbanStore.js` to trigger project notifications
- Add project notification configuration state management
- Implement notification sending logic after successful task creation
- Add error handling for failed project notifications

### Task 5: Integrate Port Configuration in Project Selector
- Enhance `src/components/ProjectSelector.jsx` to include port configuration options
- Add visual indicators for project notification connection status
- Implement quick port testing functionality
- Provide clear feedback on connection states

### Task 6: Update Task Input with Notification Options
- Modify `src/components/TaskInput.jsx` to include notification preferences
- Add toggle for enabling/disabling project notifications per task
- Show connection status and allow inline port configuration
- Provide preview of notification data that will be sent

### Task 7: Implement Port Discovery and Auto-Detection
- Enhance project notification service with port scanning capabilities
- Implement smart detection for common development server patterns
- Add caching of successful port configurations
- Create fallback mechanisms when auto-detection fails

### Task 8: Add Project Notification Settings Persistence
- Utilize `src/services/localStorage.js` for storing project-specific port configurations
- Implement project-to-port mapping storage
- Add settings export/import functionality
- Ensure graceful handling of missing or invalid configurations



### Task 10: Run Validation Commands
- Execute all validation commands to ensure feature works correctly with zero regressions

## Testing Strategy
### Unit Tests
- Test project notification service connection management
- Test port discovery and auto-detection algorithms
- Test notification data formatting and sending
- Test error handling and retry logic
- Test configuration persistence and retrieval

### Edge Cases
- Handle cases where no WebSocket server is running on detected ports
- Manage scenarios where project WebSocket connection drops during notification
- Test behavior when multiple projects are configured with different ports
- Handle invalid port configurations and malformed WebSocket URLs
- Test notification sending when project is not currently running

## Acceptance Criteria
- When a ticket is created, it is automatically sent to the configured project WebSocket connection
- Port auto-detection successfully identifies common development server ports (3000, 4000, 5000, 8080)
- Manual port configuration is available when auto-detection fails
- Project-specific port configurations are persisted and restored across sessions
- Connection status is clearly displayed in the UI with real-time updates
- Failed notifications are handled gracefully with retry mechanisms
- The system maintains separation between ADW workflow triggers and project notifications
- Users can enable/disable project notifications per ticket or globally per project
- Notification data includes comprehensive ticket information (title, description, work item type, queued stages, images)
- The feature works seamlessly with existing ADW WebSocket functionality without conflicts

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_websocket_ticket_notification.md` test file to validate this functionality works
- `npm run lint` - Run linting to validate code quality standards
- `npm run build` - Run frontend build to validate the feature works with zero regressions
- `npm run test` - Run frontend tests to validate the feature works with zero regressions
- `npm start` - Start the development server and verify WebSocket connections
- Manually test ticket creation with various port configurations
- Manually test auto-detection functionality with running development servers
- Verify notification data is correctly formatted and delivered to target projects

## Notes
- This feature creates a secondary WebSocket notification system that operates independently from the existing ADW WebSocket service
- The existing ADW WebSocket functionality should remain completely unaffected
- Port auto-detection should be smart but not intrusive, providing clear feedback about discovery attempts
- Consider implementing a notification queue for cases where the project WebSocket is temporarily unavailable
- The notification data format should be standardized to allow easy integration by receiving projects
- Future considerations: Support for multiple project environments (dev, staging, prod) with different ports
- Security consideration: Validate that WebSocket connections are made only to localhost or configured safe endpoints