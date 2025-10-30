# Bug: WebSocket Server Rejecting ticket_notification Messages

## Metadata
issue_number: `websocket-message-validation`
adw_id: `fix-ticket-notification`
issue_json: `{"title": "WebSocket ticket_notification validation error", "body": "When creating a new ticket and sending it to the WebSocket server, the server returns a validation error: 'Unknown message type: ticket_notification'. The client is sending valid ticket_notification messages but the server doesn't recognize this message type."}`

## Bug Description
The WebSocket server (running on port 8002) is rejecting `ticket_notification` messages from the kanban client with the error: `"Unknown message type: ticket_notification"`. The client successfully connects to the WebSocket server and can send ping messages, but when it attempts to send ticket notification data after creating a task, the server responds with a validation error because it doesn't have a handler for the `ticket_notification` message type.

**Symptoms:**
- Client connects successfully to WebSocket server
- Ping/pong messages work correctly
- When sending `ticket_notification` messages, server responds with validation error
- Error message: `{error_type: 'validation_error', message: 'Unknown message type: ticket_notification', details: null, adw_id: null}`

**Expected Behavior:**
- Server should accept and process `ticket_notification` messages
- Server should respond with acknowledgment or success confirmation
- No validation errors should occur for valid `ticket_notification` messages

**Actual Behavior:**
- Server rejects `ticket_notification` messages as unknown message type
- Client receives validation error response
- Ticket notification flow is broken

## Problem Statement
The WebSocket server's message handling logic is incomplete. It only handles `trigger_workflow` and `ping` message types, but the kanban client is attempting to send `ticket_notification` messages which are not recognized by the server's message router.

## Solution Statement
Add support for the `ticket_notification` message type to the WebSocket server by:
1. Adding a new message handler for `ticket_notification` in the WebSocket endpoint
2. Implementing proper validation for ticket notification data
3. Adding appropriate response handling for successful ticket notifications
4. Ensuring the new handler follows the same patterns as existing handlers

## Steps to Reproduce
1. Start the kanban application and WebSocket server
2. Create a new ticket in the kanban board
3. Observe the browser console for WebSocket messages
4. Note the error response: `"Unknown message type: ticket_notification"`

## Root Cause Analysis
The root cause is in the WebSocket server's `websocket_endpoint()` function where the message routing logic only handles two message types:

```python
if message_type == "trigger_workflow":
    # Handle workflow trigger request
elif message_type == "ping":
    # Handle ping/pong for connection keepalive
else:
    # Unknown message type - THIS IS WHERE THE ERROR OCCURS
    error_response = WebSocketError(
        error_type="validation_error",
        message=f"Unknown message type: {message_type}"
    )
```

The `ticket_notification` message type is not included in the if/elif chain, so it falls through to the "unknown message type" error case.

## Relevant Files
Use these files to fix the bug:

- `agentics/adws/adw_triggers/trigger_websocket.py` - Main WebSocket server file containing the message routing logic that needs to be enhanced
- `agentics/adws/adw_triggers/websocket_models.py` - Contains data models for WebSocket messages; may need a new model for ticket notifications
- `src/services/storage/projectNotificationService.js` - Client-side service that sends the ticket_notification messages; reference for understanding expected message format

### New Files
- `.claude/commands/e2e/test_websocket_ticket_notification_fix.md` - E2E test to validate the bug fix

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Examine Current WebSocket Server Implementation
- Read `agentics/adws/adw_triggers/trigger_websocket.py` to understand current message handling structure
- Identify the exact location where message routing occurs
- Review existing message handlers (`trigger_workflow` and `ping`) to understand the pattern

### Task 2: Define Ticket Notification Message Model
- Review `agentics/adws/adw_triggers/websocket_models.py` to understand existing message models
- Create a new Pydantic model for ticket notification messages if needed
- Ensure the model matches the data structure being sent by the client

### Task 3: Implement ticket_notification Message Handler
- Add a new `elif message_type == "ticket_notification":` branch to the message routing logic
- Implement the handler function to process ticket notification data
- Add proper validation for incoming ticket notification messages
- Return appropriate success/acknowledgment response

### Task 4: Add Response Model for Ticket Notifications
- Create a response model for ticket notification acknowledgments
- Follow the same pattern as other response models in `websocket_models.py`
- Include relevant fields like success status, timestamp, received ticket data summary

### Task 5: Test the Fix Locally
- Start the WebSocket server
- Start the kanban application
- Create a new ticket and verify the WebSocket communication works without errors
- Confirm the server processes `ticket_notification` messages successfully

### Task 6: Create E2E Test for Bug Fix
- Read `.claude/commands/e2e/test_basic_query.md` and create a new E2E test file in `.claude/commands/e2e/test_websocket_ticket_notification_fix.md`
- Test the complete flow: create ticket → send ticket_notification → verify successful processing
- Include negative test cases to ensure proper error handling for malformed ticket notifications
- Verify that existing functionality (ping/pong, trigger_workflow) still works correctly

### Task 7: Run Validation Commands
- Execute all validation commands to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_websocket_ticket_notification_fix.md` test file to validate this functionality works
- `cd agentics/adws && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `npm run lint` - Run frontend linting to validate the bug is fixed with zero regressions
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The WebSocket server is a Python FastAPI application using uvicorn
- The server runs on port 8002 by default (configurable via WEBSOCKET_PORT environment variable)
- The client sends ticket notifications when tasks are created in the kanban board
- The fix should maintain backward compatibility with existing message types
- The solution should follow the existing code patterns and error handling conventions
- Consider adding logging for successful ticket notification processing to aid in debugging