# Bug: WebSocket Ticket ID Type Validation Error

## Metadata
issue_number: `websocket-ticket-id-validation`
adw_id: `001`
issue_json: `{"title": "WebSocket ticket notification failing due to ID type mismatch", "body": "AgenticKanban is sending integer ticket IDs to TAC-7 WebSocket but TAC-7 expects string IDs, causing validation errors and failed ticket notifications"}`

## Bug Description
The WebSocket ticket notification system is failing when sending ticket notifications from AgenticKanban to TAC-7. The error shows: "1 validation error for TicketNotification\nid\n    Input should be a valid string [type=string_type, input_value=18, input_type=int]". This indicates that AgenticKanban is sending ticket IDs as integers (18) but the TAC-7 backend expects them as strings ("18").

## Problem Statement
There is a data type mismatch between the AgenticKanban frontend and TAC-7 backend in the WebSocket ticket notification protocol. AgenticKanban stores and sends ticket IDs as integers, but TAC-7's Pydantic validation schema requires ticket IDs to be strings, causing all ticket notifications to fail with validation errors.

## Solution Statement
Convert ticket IDs to strings in the AgenticKanban `formatTicketNotification` function before sending them to TAC-7 via WebSocket. This ensures data type compatibility between the frontend and backend while maintaining the existing integer-based ID system in the kanban application.

## Steps to Reproduce
1. Start AgenticKanban application (npm run dev)
2. Start TAC-7 WebSocket trigger service
3. Create or select a task with ID 18 in the kanban board
4. Attempt to send a ticket notification via WebSocket
5. Observe the validation error in the console/logs

## Root Cause Analysis
The root cause is in the `formatTicketNotification` function in `src/services/storage/projectNotificationService.js` at line 576. The function sets `id: ticketData.id` without converting the integer ID to a string. The TAC-7 backend uses a Pydantic model (`TicketNotification`) that explicitly requires the `id` field to be of type `str`, and includes a validator that converts values to strings. However, the initial Pydantic validation fails before the validator can run because the type doesn't match the expected string type.

## Relevant Files
Use these files to fix the bug:

- `src/services/storage/projectNotificationService.js` - Contains the `formatTicketNotification` function that needs to convert ID to string
- `../tac-7/adws/adw_triggers/websocket_models.py` - Contains the TAC-7 Pydantic validation schema for TicketNotification
- `.claude/commands/conditional_docs.md` - For checking documentation requirements
- `.claude/commands/test_e2e.md` - For understanding E2E test execution format
- `.claude/commands/e2e/test_basic_query.md` - Example E2E test file format

### New Files
- `.claude/commands/e2e/test_websocket_ticket_notification_fix.md` - E2E test to validate the bug fix

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Fix WebSocket Ticket ID Type Conversion
- Modify the `formatTicketNotification` function in `src/services/storage/projectNotificationService.js` line 576
- Change `id: ticketData.id` to `id: String(ticketData.id)` to ensure the ID is always sent as a string
- Ensure this conversion handles null/undefined values gracefully

### Create E2E Test for Ticket Notification
Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/test_e2e.md` and create a new E2E test file in `.claude/commands/e2e/test_websocket_ticket_notification_fix.md` that validates the bug is fixed. The test should:
- Connect to the WebSocket
- Send a ticket notification with an integer ID
- Verify the notification is accepted without validation errors
- Take screenshots of the successful notification process

### Validate Fix with Manual Testing
- Start both AgenticKanban and TAC-7 services
- Attempt to send a ticket notification for a task with integer ID
- Verify the notification succeeds without validation errors
- Check WebSocket logs for successful message processing

### Run Validation Commands
Execute the `Validation Commands` to validate the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Test ticket notification manually with integer ID (should succeed without validation errors)
- Check WebSocket connection logs for successful ticket_notification processing
- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_websocket_ticket_notification_fix.md` test file to validate this functionality works
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- This is a minimal surgical fix that only affects the data type conversion without changing the underlying ID system
- The fix ensures backward compatibility with existing integer-based task IDs in the kanban application
- The TAC-7 Pydantic validator will handle the string conversion on the backend side once the initial type validation passes
- No additional libraries are required for this fix as it uses native JavaScript String() conversion