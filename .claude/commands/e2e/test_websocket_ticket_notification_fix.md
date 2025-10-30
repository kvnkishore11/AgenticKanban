# E2E Test: WebSocket Ticket Notification Fix

Test that the WebSocket server correctly handles ticket_notification messages without returning validation errors.

## User Story

As a kanban application user
I want to create tickets that are sent to the WebSocket server via ticket_notification messages
So that the ADW system can receive and process ticket notifications without validation errors

## Prerequisites

1. **WebSocket Server**: ADW WebSocket server must be running on port 8002 (or configured port)
2. **Kanban Application**: AgenticKanban app must be running and connected to the WebSocket server
3. **WebSocket Connection**: Application must establish a successful WebSocket connection to the ADW server

## Test Steps

### Phase 1: WebSocket Server Verification

1. **Verify WebSocket server is running**
   - Check server health endpoint: `GET http://localhost:8002/health`
   - **Verify** response status is "healthy"
   - **Verify** service name is "adw-websocket-trigger"

2. **Verify WebSocket endpoint is accessible**
   - Test WebSocket connection to `ws://localhost:8002/ws/trigger`
   - **Verify** connection is accepted without errors

### Phase 2: Basic WebSocket Message Testing

3. **Test ping/pong functionality**
   - Send ping message: `{"type": "ping"}`
   - **Verify** server responds with pong message containing timestamp
   - **Verify** no validation errors occur

4. **Test unknown message type handling**
   - Send unknown message: `{"type": "unknown_test_type", "data": {}}`
   - **Verify** server responds with validation error
   - **Verify** error message contains "Unknown message type: unknown_test_type"

### Phase 3: Ticket Notification Testing (Main Fix)

5. **Test ticket_notification message handling**
   - Send ticket notification message:
     ```json
     {
       "type": "ticket_notification",
       "data": {
         "id": "test-ticket-001",
         "title": "E2E Test Ticket",
         "description": "Test ticket for WebSocket ticket notification fix validation",
         "workItemType": "bug",
         "queuedStages": ["plan", "implement", "test"],
         "stage": "implement",
         "substage": "coding",
         "progress": 50,
         "createdAt": "2025-10-27T06:00:00.000Z",
         "images": [],
         "metadata": {
           "adw_id": "test-adw-001",
           "workflow_name": "test-workflow"
         }
       }
     }
     ```
   - **Verify** server responds with ticket_notification_response message
   - **Verify** response status is "received"
   - **Verify** response contains correct ticket_id: "test-ticket-001"
   - **Verify** response message contains "E2E Test Ticket"
   - **Verify** response includes valid timestamp
   - **Verify** no validation errors occur

6. **Test ticket_notification with minimal data**
   - Send minimal ticket notification:
     ```json
     {
       "type": "ticket_notification",
       "data": {
         "id": "minimal-ticket-002",
         "title": "Minimal Test Ticket"
       }
     }
     ```
   - **Verify** server accepts and processes the message
   - **Verify** response status is "received"
   - **Verify** no validation errors occur

7. **Test ticket_notification with invalid data**
   - Send invalid ticket notification (missing required id field):
     ```json
     {
       "type": "ticket_notification",
       "data": {
         "title": "Invalid Test Ticket"
       }
     }
     ```
   - **Verify** server responds with error status
   - **Verify** error indicates validation failure

### Phase 4: Integration Testing

8. **Test multiple consecutive ticket notifications**
   - Send 3 ticket notification messages in sequence
   - **Verify** each message is processed successfully
   - **Verify** server maintains connection throughout
   - **Verify** all responses have "received" status

9. **Test mixed message types in single session**
   - Send ping message
   - Send ticket_notification message
   - Send trigger_workflow message (if available)
   - Send another ticket_notification message
   - **Verify** all messages are handled correctly
   - **Verify** server maintains connection throughout

### Phase 5: Kanban Application Integration

10. **Test via Kanban UI (if running)**
    - Navigate to the kanban application
    - **Verify** WebSocket connection status shows "connected"
    - Create a new ticket/task
    - **Verify** ticket creation completes without WebSocket errors
    - Check browser console for WebSocket communication logs
    - **Verify** no "Unknown message type: ticket_notification" errors appear

## Success Criteria

### Core Fix Validation
- ✅ WebSocket server accepts `ticket_notification` messages without validation errors
- ✅ Server responds with appropriate `ticket_notification_response` messages
- ✅ No "Unknown message type: ticket_notification" errors occur

### Backward Compatibility
- ✅ Existing message types (`ping`, `trigger_workflow`) continue to work
- ✅ Unknown message types still return appropriate validation errors
- ✅ Server maintains stable WebSocket connections

### Integration Success
- ✅ Kanban application can send ticket notifications without errors
- ✅ Multiple ticket notifications can be sent in the same session
- ✅ Mixed message types work correctly in single WebSocket session

## Expected Behavior Before Fix
- Server returns validation error: "Unknown message type: ticket_notification"
- Kanban application shows WebSocket communication errors
- Ticket creation may appear to fail or show errors

## Expected Behavior After Fix
- Server accepts ticket_notification messages and responds with acknowledgment
- Kanban application successfully sends ticket notifications
- No validation errors for ticket_notification message type
- Smooth ticket creation flow with WebSocket communication

## Troubleshooting

### If WebSocket server is not running:
```bash
cd /path/to/tac-7/adws
uv run adw_triggers/trigger_websocket.py --port 8002
```

### If connection fails:
- Check if port 8002 is available: `lsof -ti:8002`
- Try alternative port: `--port 8003`
- Verify server logs for startup errors

### If tests fail:
- Check server console for error messages
- Verify message format matches expected schema
- Ensure WebSocket connection is stable
- Check network connectivity to localhost