# Bug: WebSocket Connection Reliability Issues

## Metadata
issue_number: `3`
adw_id: `c855017b`
issue_json: `{"number":3,"title":"I still see there are some issues with the websock...","body":"I still see there are some issues with the websocket connection. it often breaks. I mean this is not perfect. can you please look into the issue and try to fix it. I am looking for strong reliable connection irrespective of what happens. Like adding more number of tickets etc."}`

## Bug Description
The WebSocket connection between the client and server is unreliable and frequently breaks, particularly when performing operations like adding more tickets. Users are experiencing intermittent disconnections that disrupt the real-time communication required for ADW workflow triggering and status updates. The connection does not maintain stability under load or during normal operations.

## Problem Statement
The current WebSocket implementation lacks robust connection management mechanisms to handle:
- Network interruptions and temporary disconnections
- Server-side connection drops or restarts
- High-load scenarios (e.g., adding multiple tickets rapidly)
- Proper error recovery and reconnection logic
- Connection state synchronization between client and server
- Heartbeat/ping-pong mechanism reliability

## Solution Statement
Implement a comprehensive WebSocket reliability enhancement that includes:
1. **Improved Reconnection Strategy**: Implement exponential backoff with jitter to prevent thundering herd problems and increase max reconnection attempts
2. **Enhanced Connection State Management**: Add proper connection state tracking, cleanup, and synchronization
3. **Robust Error Handling**: Implement comprehensive error categorization and recovery strategies
4. **Server-Side Connection Resilience**: Add connection validation, cleanup of stale connections, and proper disconnection handling
5. **Client-Side Connection Monitoring**: Enhance health monitoring with better metrics and automatic recovery
6. **Message Queue Management**: Add client-side message queuing to prevent message loss during reconnection
7. **Connection Lifecycle Management**: Properly handle connection initialization, reconnection, and cleanup scenarios

## Steps to Reproduce
1. Start the WebSocket server using `./start-websocket.py`
2. Open the Agentic Kanban application in a browser
3. Observe the WebSocket connection status indicator
4. Add multiple tickets rapidly (5-10 tickets in quick succession)
5. Observe connection status - it may show disconnections or become unstable
6. Leave the application idle for a few minutes
7. Try to trigger a workflow - connection may fail or be unreliable
8. Restart the WebSocket server while the client is connected
9. Observe that reconnection may not happen automatically or may fail

## Root Cause Analysis
After analyzing the codebase, the following issues have been identified:

1. **Client-Side Issues** (`src/services/websocket/websocketService.js`):
   - Limited reconnection attempts (maxReconnectAttempts: 5) are insufficient for production use
   - Reconnection delay calculation doesn't use jitter, which can cause thundering herd problems
   - No message queue for handling messages during disconnection/reconnection
   - Missing proper cleanup of event listeners during reconnection
   - Heartbeat mechanism (30s interval) may be too slow to detect connection issues
   - No handling of browser tab visibility or network status changes
   - Promise-based triggerWorkflow doesn't handle reconnection race conditions

2. **Server-Side Issues** (`adws/adw_triggers/trigger_websocket.py`):
   - No explicit connection timeout management
   - Limited validation of connection health
   - No rate limiting or connection throttling under high load
   - Broadcast mechanism doesn't validate connection state before sending
   - No cleanup of stale connections that may have disconnected ungracefully
   - Ping/pong messages lack timestamp validation for latency tracking

3. **Connection Health Monitor Issues** (`src/services/websocket/connectionHealthMonitor.js`):
   - Health check intervals may not detect rapid connection degradation
   - No automatic remediation actions when health degrades
   - Alert history is not persisted, losing diagnostic information on refresh
   - Latency measurement depends on manual ping, not automatic pong validation

4. **State Synchronization Issues**:
   - No mechanism to recover pending workflow triggers after reconnection
   - Client doesn't validate server state after reconnection
   - No session ID or connection ID to track connection continuity

## Relevant Files
Use these files to fix the bug:

- `src/services/websocket/websocketService.js` - Main WebSocket client service that handles connection, reconnection, and message sending/receiving. Needs enhanced reconnection logic, message queuing, and better connection state management.

- `src/services/websocket/connectionHealthMonitor.js` - Health monitoring service that tracks connection metrics and health status. Needs improved health checks, automatic remediation, and better alerting.

- `adws/adw_triggers/trigger_websocket.py` - WebSocket server implementation using FastAPI. Needs enhanced connection validation, stale connection cleanup, and better error handling.

- `src/components/ui/WebSocketStatusIndicator.jsx` - UI component that displays connection status. May need updates to show enhanced connection states and recovery actions.

- `src/stores/kanbanStore.js` - Central state management that integrates WebSocket service. Needs proper WebSocket lifecycle management and error handling integration.

- `.claude/commands/conditional_docs.md` - Documentation reference guide to ensure we're following project conventions.

### New Files
- `.claude/commands/e2e/test_websocket_reliability.md` - E2E test file to validate WebSocket connection reliability under various failure scenarios.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Enhance Client-Side WebSocket Service
- Update `src/services/websocket/websocketService.js`:
  - Increase `maxReconnectAttempts` from 5 to 20 for better production resilience
  - Add jitter to reconnection delay calculation to prevent thundering herd: `delay * (0.5 + Math.random() * 0.5)`
  - Implement client-side message queue to buffer messages during disconnection
  - Add message queue with retry logic that processes queued messages after reconnection
  - Reduce heartbeat interval from 30s to 15s for faster connection issue detection
  - Add browser visibility API integration to pause/resume heartbeats when tab is hidden/shown
  - Add online/offline event listeners to handle network status changes
  - Implement connection ID tracking to detect server restarts
  - Add proper cleanup of pending promises and event listeners during reconnection
  - Enhance triggerWorkflow to use message queue and handle reconnection scenarios
  - Add exponential timeout for pending workflow triggers to prevent infinite waiting
  - Implement connection drain logic before disconnect to ensure message delivery
  - Add connection quality metrics (message success rate, latency tracking)

### Enhance Server-Side WebSocket Implementation
- Update `adws/adw_triggers/trigger_websocket.py`:
  - Add connection timeout configuration (default: 300 seconds for idle connections)
  - Implement periodic stale connection cleanup (check every 60 seconds)
  - Add connection validation before broadcasting messages
  - Enhance ping/pong handling to include timestamp for accurate latency measurement
  - Add connection metadata tracking (connection time, last activity, message count)
  - Implement graceful connection closure with proper cleanup
  - Add rate limiting for workflow triggers per connection to prevent abuse
  - Enhance ConnectionManager with connection health tracking
  - Add connection draining during server shutdown to notify clients
  - Improve error responses with more detailed error information for client recovery
  - Add connection ID in pong responses for client validation

### Enhance Connection Health Monitor
- Update `src/services/websocket/connectionHealthMonitor.js`:
  - Reduce latency measurement interval from 5s to 3s for faster detection
  - Add automatic remediation: trigger reconnection when health degrades to UNHEALTHY
  - Implement progressive health degradation: HEALTHY -> DEGRADED -> UNHEALTHY -> CRITICAL
  - Add connection quality score based on multiple metrics (latency, reliability, uptime)
  - Persist alert history to localStorage (last 50 alerts) for diagnostics across sessions
  - Add server response time tracking for health endpoint
  - Implement adaptive health check intervals based on connection quality
  - Add connection recovery success tracking and reporting
  - Enhance alert system with actionable recovery suggestions
  - Add network quality estimation based on latency patterns

### Enhance WebSocket Integration in Kanban Store
- Update `src/stores/kanbanStore.js`:
  - Add WebSocket connection lifecycle management in store initialization
  - Implement automatic reconnection trigger from store level
  - Add pending workflow tracking and retry mechanism after reconnection
  - Enhance error handling to provide user-friendly error messages
  - Add connection status persistence to survive page refreshes
  - Implement workflow trigger queue that persists to localStorage
  - Add connection recovery notification to user
  - Integrate health monitor events with store state updates

### Update WebSocket Status Indicator UI
- Update `src/components/ui/WebSocketStatusIndicator.jsx`:
  - Add visual feedback for reconnection attempts (show attempt count)
  - Display connection quality score in detailed view
  - Add manual reconnection button that's always visible when disconnected
  - Show queued message count when connection is down
  - Add connection history timeline in detailed view (last 10 connection events)
  - Enhance error messages with recovery instructions
  - Add "Test Connection" button to verify connectivity on demand

### Create E2E Test for WebSocket Reliability
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/e2e/test_websocket_integration.md` to understand the E2E test format
- Create `.claude/commands/e2e/test_websocket_reliability.md` with comprehensive tests:
  - Test 1: Verify WebSocket connects successfully on application load
  - Test 2: Simulate network disconnection and verify automatic reconnection with exponential backoff
  - Test 3: Add 10 tickets rapidly and verify connection remains stable
  - Test 4: Restart WebSocket server and verify client reconnects automatically
  - Test 5: Trigger workflow during disconnection and verify it completes after reconnection
  - Test 6: Verify message queue functionality - queue messages when disconnected, process when reconnected
  - Test 7: Test heartbeat mechanism - verify pings are sent regularly and connection stays alive
  - Test 8: Simulate high latency (300ms+) and verify connection quality degradation alerts
  - Test 9: Test maximum reconnection attempts - verify proper error after exhausting retries
  - Test 10: Verify connection status indicator accurately reflects all connection states
  - Include screenshots showing: connected state, disconnected state, reconnecting state, connection quality metrics
  - Validation criteria: All tests pass, connection never permanently fails during normal operations, automatic recovery works in all scenarios

### Run Validation Commands
- Execute validation commands to ensure bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Start the WebSocket server: `./start-websocket.py` (run in background)
- Start the frontend: `npm run dev` (verify it starts without errors)
- Open browser to application URL and verify WebSocket connects
- Test 1: Add 15 tickets rapidly - verify connection remains stable
- Test 2: Restart WebSocket server while monitoring client - verify automatic reconnection
- Test 3: Simulate network disconnection (browser DevTools Network tab -> Offline) - verify reconnection after going back online
- Test 4: Leave application idle for 5 minutes - verify connection stays alive
- Test 5: Trigger workflow while disconnected - verify it queues and completes after reconnection
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_websocket_reliability.md` to validate comprehensive WebSocket reliability
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the bug is fixed with zero regressions (NOTE: This project uses JSX, so TypeScript check may not apply - verify project structure first)
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The WebSocket connection reliability is critical for the application's real-time functionality
- This fix focuses on making the connection "unbreakable" through multiple layers of resilience: client-side queuing, server-side validation, health monitoring, and automatic recovery
- The exponential backoff with jitter prevents thundering herd problems when multiple clients reconnect simultaneously
- Message queuing ensures no workflow triggers are lost during temporary disconnections
- Connection health monitoring provides early warning and automatic remediation
- The solution balances immediate reconnection attempts with resource conservation through progressive backoff
- Consider adding connection quality metrics to Prometheus/Grafana for production monitoring in future iterations
- The E2E test suite will serve as regression prevention for future changes to WebSocket implementation
- All changes should be backward compatible with existing workflow trigger implementations
- Testing should cover edge cases: server restarts, network switches, browser sleep/wake cycles, and high load scenarios
