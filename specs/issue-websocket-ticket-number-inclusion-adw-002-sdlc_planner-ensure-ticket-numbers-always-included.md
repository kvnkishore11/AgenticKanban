# Chore: Ensure Ticket Numbers Always Included in WebSocket Workflow Triggers

## Metadata
issue_number: `websocket-ticket-number-inclusion`
adw_id: `002`
issue_json: `{"title": "Ensure ticket numbers always included in WebSocket workflow triggers", "body": "I understand you want me to ensure that whenever creating or triggering tickets via WebSocket, a ticket number is always included since the real ADWs (Automated Development Workflows) won't trigger properly without it."}`

## Chore Description
The AgenticKanban application currently triggers ADW workflows via WebSocket without consistently passing ticket numbers (issue_number). The ADW system requires ticket numbers to properly identify and process workflow requests. Currently, the KanbanCard component calls `triggerWorkflowForTask(task.id)` without passing the task ID as the `issue_number` parameter, causing the issue_number to default to `null` in WebSocket requests. This prevents ADWs from functioning properly since they need ticket identification for proper workflow execution.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` - Contains the workflow trigger button that calls triggerWorkflowForTask without passing issue_number
- `src/stores/kanbanStore.js` - Contains the triggerWorkflowForTask store method that accepts issue_number in options
- `src/services/websocket/websocketService.js` - Contains the WebSocket service that sends issue_number to ADW triggers
- `src/services/storage/projectNotificationService.js` - Already has String() conversion for ticket ID type validation

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Modify KanbanCard to Pass Ticket Number
- Update the `triggerWorkflowForTask` call in `src/components/kanban/KanbanCard.jsx` around line 132
- Change from `await triggerWorkflowForTask(task.id);` to `await triggerWorkflowForTask(task.id, { issue_number: String(task.id) });`
- Ensure the task ID is converted to string to match ADW expectations and prevent type validation errors
- Add a comment explaining that issue_number is required for ADW proper workflow identification

### Verify WebSocket Service Configuration
- Review `src/services/websocket/websocketService.js` to confirm it properly passes issue_number in trigger requests
- Ensure the triggerWorkflowForTask method correctly forwards issue_number from options to the WebSocket request payload
- Verify that the request structure includes issue_number field for ADW consumption

### Test Workflow Triggering with Ticket Numbers
- Start the development environment and create a test task
- Trigger a workflow from the kanban card interface
- Verify in browser console/network logs that the WebSocket request includes a non-null issue_number field
- Confirm the issue_number matches the task ID and is formatted as a string

### Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start development server to test workflow triggering manually
- Manually test workflow triggering from kanban cards and verify issue_number is included in WebSocket requests
- Check browser developer tools Network tab for WebSocket messages containing issue_number field
- `npm run build` - Run frontend build to validate the chore is complete with zero regressions
- `npm run lint` - Run linting to ensure code quality standards are maintained

## Notes
- This change ensures ADW workflows receive proper ticket identification for all kanban-triggered workflows
- The task ID serves as the natural ticket number since each task represents a work item that ADWs need to track
- String conversion prevents type validation errors that could occur with integer IDs
- This is a minimal change that maintains backward compatibility while ensuring ADW compliance
- The projectNotificationService already handles String() conversion for ticket IDs, so this follows the same pattern