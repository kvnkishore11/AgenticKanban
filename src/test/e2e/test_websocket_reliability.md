# WebSocket Reliability E2E Test

## Overview
Comprehensive end-to-end test suite for WebSocket connection reliability features including automatic reconnection, exponential backoff, message queuing, heartbeat monitoring, and connection health tracking.

## Test Environment Setup

### Prerequisites
- TAC-7 WebSocket service running on localhost:8002
- Agentic Kanban application running
- Test data populated in the kanban board
- Network connectivity to WebSocket service
- Browser developer tools available for network simulation

### Environment Variables
```bash
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=8002
WEBSOCKET_PROTOCOL=ws
TEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=5000
MAX_RECONNECTION_ATTEMPTS=20
HEARTBEAT_INTERVAL=15000
```

## Test Scenarios

### Test 1: Verify WebSocket Connects Successfully on Application Load

**Purpose**: Verify that WebSocket connection is established automatically when the application loads

**Steps**:
1. Clear browser cache and local storage
2. Navigate to the kanban board application
3. Wait for application to fully load
4. Observe the WebSocket status indicator in the UI
5. Open browser developer tools and check the Network > WS tab
6. Verify WebSocket connection is established

**Expected Results**:
- WebSocket connection establishes within 5 seconds of page load
- Status indicator shows "Connected" or green/healthy status
- No error messages displayed in UI or console
- Console logs show successful connection establishment
- WebSocket handshake completes with HTTP 101 status

**Validation Criteria**:
- Connection status: CONNECTED
- Connection health: HEALTHY
- No reconnection attempts required
- Initial connection latency < 2000ms

**Screenshot Requirements**:
- Screenshot 1: Initial page load with status indicator showing "Connected"
- Screenshot 2: Browser DevTools Network > WS tab showing successful connection
- Screenshot 3: Browser console showing connection success logs

---

### Test 2: Simulate Network Disconnection and Verify Automatic Reconnection with Exponential Backoff

**Purpose**: Test automatic reconnection mechanism with exponential backoff and jitter when network connection is lost

**Steps**:
1. Establish WebSocket connection (should be connected from Test 1)
2. Open browser DevTools > Network tab
3. Enable "Offline" mode to simulate network disconnection
4. Observe status indicator changes to "Disconnected"
5. Observe reconnection attempts in the UI and console
6. Monitor the timing of reconnection attempts
7. After 3-4 attempts, disable "Offline" mode
8. Verify automatic reconnection succeeds
9. Verify exponential backoff pattern in attempt timing

**Expected Results**:
- Status immediately changes to "Disconnected" when network is lost
- Automatic reconnection attempts begin within 1 second
- Exponential backoff pattern observed:
  - Attempt 1: ~1 second delay
  - Attempt 2: ~2 seconds delay
  - Attempt 3: ~4 seconds delay
  - Attempt 4: ~8 seconds delay
  - Attempts continue up to maximum of 20 attempts
- Jitter randomization adds ±25% variation to backoff times
- Connection restores immediately when network is available
- Reconnection counter resets after successful connection

**Validation Criteria**:
- Maximum reconnection attempts: 20
- Backoff formula: min(baseDelay * (2 ^ attemptNumber), maxDelay)
- Base delay: 1000ms
- Max delay: 30000ms
- Jitter: ±25% random variation
- Successful reconnection within 2 seconds of network restoration

**Screenshot Requirements**:
- Screenshot 1: Status indicator showing "Disconnected" state
- Screenshot 2: Status indicator showing "Reconnecting (Attempt 3/20)"
- Screenshot 3: Console logs showing exponential backoff timing pattern
- Screenshot 4: Status indicator showing "Connected" after successful reconnection

---

### Test 3: Add 10 Tickets Rapidly and Verify Connection Remains Stable

**Purpose**: Test WebSocket connection stability under high-frequency message load

**Steps**:
1. Ensure WebSocket is connected
2. Navigate to the kanban board backlog
3. Rapidly create 10 new tickets in succession (< 10 seconds total)
4. For each ticket, trigger a workflow immediately after creation
5. Monitor WebSocket status indicator throughout the process
6. Monitor browser console for errors
7. Verify all messages are sent successfully
8. Verify all workflow responses are received

**Expected Results**:
- Connection remains in "Connected" state throughout rapid additions
- All 10 tickets created successfully
- All 10 workflow triggers sent via WebSocket
- All 10 workflow responses received
- No connection drops or reconnection attempts
- No message queue buildup
- Message delivery latency remains < 100ms average
- No rate limiting triggered

**Validation Criteria**:
- Connection status: CONNECTED throughout test
- Connection health: HEALTHY or DEGRADED (acceptable under load)
- All 10 workflow trigger messages sent successfully
- All 10 workflow response messages received
- No dropped messages
- Average message round-trip time < 150ms
- No errors in console or UI

**Screenshot Requirements**:
- Screenshot 1: Kanban board with all 10 tickets created
- Screenshot 2: Status indicator showing stable connection under load
- Screenshot 3: Browser DevTools showing all WebSocket messages sent/received
- Screenshot 4: Connection health metrics showing stable performance

---

### Test 4: Restart WebSocket Server and Verify Client Reconnects Automatically

**Purpose**: Test automatic reconnection when server restarts unexpectedly

**Steps**:
1. Ensure WebSocket is connected
2. Create a test ticket and trigger a workflow to establish active communication
3. Stop the WebSocket server (simulate server crash/restart)
4. Observe client-side reconnection attempts
5. Wait for 5-10 seconds
6. Restart the WebSocket server
7. Verify client automatically reconnects
8. Trigger another workflow to verify functionality restored
9. Verify no data loss or corruption

**Expected Results**:
- Client immediately detects server disconnection
- Status changes to "Disconnected" or "Reconnecting"
- Automatic reconnection attempts begin immediately
- Exponential backoff retry pattern followed
- Client reconnects within 2 seconds of server availability
- Connection health status updates appropriately
- Pending messages in queue are sent after reconnection
- No workflow data is lost

**Validation Criteria**:
- Disconnection detected within 2 seconds of server shutdown
- Reconnection attempts continue until server is available
- Successful reconnection within 2 seconds of server restart
- Message queue preserved during disconnection
- Queued messages delivered after reconnection
- No data corruption or loss

**Screenshot Requirements**:
- Screenshot 1: Status indicator showing "Disconnected" after server shutdown
- Screenshot 2: Console showing reconnection attempts while server is down
- Screenshot 3: Status indicator showing "Reconnecting" state
- Screenshot 4: Status indicator showing "Connected" after server restart
- Screenshot 5: Successful workflow trigger after reconnection

---

### Test 5: Trigger Workflow During Disconnection and Verify It Completes After Reconnection

**Purpose**: Test message queuing functionality and workflow completion after reconnection

**Steps**:
1. Ensure WebSocket is connected
2. Open browser DevTools > Network tab
3. Enable "Offline" mode to disconnect
4. Create a new ticket in the kanban board
5. Attempt to trigger a workflow on the ticket
6. Observe that the trigger request is queued (not sent immediately)
7. Verify UI shows pending/queued state
8. Wait 5 seconds
9. Disable "Offline" mode to reconnect
10. Observe automatic reconnection
11. Verify queued message is sent automatically
12. Verify workflow trigger response is received
13. Verify workflow completes successfully

**Expected Results**:
- Workflow trigger action is queued when disconnected
- UI shows visual indication of queued/pending state
- No error message displayed to user
- Automatic reconnection occurs when network restored
- Queued message sent immediately after reconnection
- Workflow trigger response received
- Workflow executes and completes normally
- UI updates to show workflow progress and completion

**Validation Criteria**:
- Message queued when disconnected: Yes
- Queue persistence: Maintained across disconnection period
- Automatic queue processing: Triggered on reconnection
- Message order preserved: FIFO (First In, First Out)
- Workflow completion: Successful
- UI state: Accurately reflects queued, sending, and completed states

**Screenshot Requirements**:
- Screenshot 1: UI showing workflow trigger while disconnected (queued state)
- Screenshot 2: Status indicator showing "Disconnected" with queue indicator
- Screenshot 3: Status indicator showing "Connected" after reconnection
- Screenshot 4: Console showing queued message being sent after reconnection
- Screenshot 5: Workflow completion confirmation in UI

---

### Test 6: Verify Message Queue Functionality

**Purpose**: Test comprehensive message queuing behavior with multiple queued messages

**Steps**:
1. Ensure WebSocket is connected
2. Enable "Offline" mode in browser DevTools
3. Create 5 different tickets in the kanban board
4. Trigger workflows for all 5 tickets while disconnected
5. Verify UI shows all 5 triggers as queued/pending
6. Wait 10 seconds while disconnected
7. Disable "Offline" mode to reconnect
8. Observe automatic reconnection
9. Monitor message queue processing
10. Verify all 5 messages are sent in correct order (FIFO)
11. Verify all 5 workflow responses are received
12. Verify all 5 workflows complete successfully

**Expected Results**:
- All 5 workflow triggers queued successfully while disconnected
- Queue persists during disconnection period
- No messages lost from queue
- Messages sent in FIFO order after reconnection
- All 5 workflow trigger responses received
- All 5 workflows complete successfully
- Queue clears after all messages processed
- UI updates correctly for each workflow

**Validation Criteria**:
- Queue capacity: ≥ 5 messages (test with 5)
- Message ordering: FIFO strictly enforced
- Message persistence: Maintained during disconnection
- Message delivery: 100% success rate (5/5 delivered)
- Queue processing speed: All messages sent within 5 seconds of reconnection
- No duplicate messages sent

**Screenshot Requirements**:
- Screenshot 1: UI showing 5 queued workflow triggers while disconnected
- Screenshot 2: Queue status indicator showing "5 messages queued"
- Screenshot 3: Console logs showing queue contents before reconnection
- Screenshot 4: Console logs showing messages being sent in order after reconnection
- Screenshot 5: UI showing all 5 workflows completed successfully

---

### Test 7: Test Heartbeat Mechanism

**Purpose**: Test ping/pong heartbeat functionality that keeps connection alive and detects timeouts

**Steps**:
1. Ensure WebSocket is connected
2. Open browser DevTools > Network > WS tab
3. Click on the WebSocket connection to view frames
4. Monitor WebSocket frames for ping/pong messages
5. Verify ping messages sent every 15 seconds by client
6. Verify pong messages received from server
7. Let connection idle for 2 minutes
8. Verify connection stays alive via heartbeats
9. Simulate heartbeat timeout by blocking pong responses (if possible)
10. Verify timeout detection and reconnection attempt

**Expected Results**:
- Ping messages sent by client every 15 seconds (±1 second)
- Pong messages received from server for each ping
- Connection remains alive during idle periods (2+ minutes)
- No disconnection during normal heartbeat operation
- Heartbeat timeout detected if pongs not received
- Automatic reconnection triggered on heartbeat timeout
- Heartbeat mechanism resumes after reconnection

**Validation Criteria**:
- Heartbeat interval: 15000ms (15 seconds)
- Heartbeat timeout: 30000ms (30 seconds without pong)
- Ping message format: `{"type": "ping", "timestamp": <milliseconds>}`
- Pong message format: `{"type": "pong", "timestamp": <milliseconds>}`
- Timeout detection: Triggers reconnection if pong not received within 30s
- Idle connection maintenance: Connection stable for 2+ minutes

**Screenshot Requirements**:
- Screenshot 1: DevTools WS frames showing ping message sent
- Screenshot 2: DevTools WS frames showing pong message received
- Screenshot 3: DevTools WS frames showing multiple ping/pong cycles over time
- Screenshot 4: Console logs showing heartbeat monitoring activity
- Screenshot 5: Connection maintained for 2+ minutes with heartbeat logs

---

### Test 8: Simulate High Latency (300ms+) and Verify Connection Quality Degradation Alerts

**Purpose**: Test connection health monitoring and degradation alerts under high latency conditions

**Steps**:
1. Ensure WebSocket is connected with HEALTHY status
2. Open browser DevTools > Network tab
3. Enable network throttling: "Custom" profile with 300ms latency
4. Trigger a workflow to generate WebSocket traffic
5. Observe connection health status changes
6. Verify status indicator shows degraded connection quality
7. Monitor latency metrics in UI or console
8. Increase latency to 500ms
9. Verify further degradation or UNHEALTHY status
10. Remove throttling
11. Verify connection quality returns to HEALTHY

**Expected Results**:
- Initial connection health: HEALTHY (latency < 100ms)
- At 300ms latency: Health degrades to DEGRADED
- At 500ms+ latency: Health may degrade to UNHEALTHY
- Status indicator reflects health changes with visual cues
- Alerts or warnings displayed to user about degraded quality
- Connection quality metrics visible (latency, reliability score)
- Health restores to HEALTHY when latency improves
- No disconnection due to high latency alone

**Validation Criteria**:
- Health status thresholds:
  - HEALTHY: latency < 100ms, reliability > 0.95
  - DEGRADED: latency 100-300ms, reliability 0.80-0.95
  - UNHEALTHY: latency > 300ms, reliability < 0.80
- Latency measurement: Rolling average over last 10 messages
- Health status updates: Within 10 seconds of latency change
- User alerts: Displayed when health degrades to DEGRADED or UNHEALTHY
- Visual indicators: Color coding (green/yellow/red)

**Screenshot Requirements**:
- Screenshot 1: Connection health showing HEALTHY status with metrics
- Screenshot 2: Network throttling enabled at 300ms latency
- Screenshot 3: Connection health showing DEGRADED status with alert
- Screenshot 4: Connection health showing UNHEALTHY status at 500ms
- Screenshot 5: Connection quality metrics dashboard showing latency graph
- Screenshot 6: Connection health restored to HEALTHY after removing throttling

---

### Test 9: Test Maximum Reconnection Attempts

**Purpose**: Test behavior when maximum reconnection attempts (20) are exhausted

**Steps**:
1. Ensure WebSocket is connected
2. Stop the WebSocket server (do not restart)
3. Observe automatic reconnection attempts
4. Monitor reconnection counter incrementing
5. Wait for all 20 reconnection attempts to be exhausted
6. Verify appropriate error message displayed
7. Verify manual reconnection option provided
8. Restart the WebSocket server
9. Click manual reconnection button
10. Verify successful manual reconnection

**Expected Results**:
- Automatic reconnection attempts begin immediately after disconnection
- Reconnection counter increments with each attempt (1/20, 2/20, ... 20/20)
- Exponential backoff followed for all attempts
- After 20 failed attempts, automatic reconnection stops
- Clear error message displayed: "Unable to connect after 20 attempts"
- Manual reconnection button or option provided
- Manual reconnection succeeds when server is available
- Reconnection counter resets after successful connection

**Validation Criteria**:
- Maximum reconnection attempts: Exactly 20
- Automatic reconnection stops: After attempt 20
- Error message displayed: Clear and user-friendly
- Manual reconnection option: Available and functional
- Reconnection counter: Accurate throughout process
- Total time for 20 attempts: ~10-15 minutes (due to exponential backoff)
- User can retry manually: Yes, unlimited manual attempts

**Screenshot Requirements**:
- Screenshot 1: Reconnection attempt counter showing "Attempt 5/20"
- Screenshot 2: Reconnection attempt counter showing "Attempt 15/20"
- Screenshot 3: Reconnection attempt counter showing "Attempt 20/20"
- Screenshot 4: Error message showing "Unable to connect after 20 attempts"
- Screenshot 5: Manual reconnection button visible in UI
- Screenshot 6: Successful manual reconnection after clicking button

---

### Test 10: Verify Connection Status Indicator Accurately Reflects All Connection States

**Purpose**: Test that connection status indicator accurately represents all possible connection states

**Steps**:
1. Test CONNECTED state:
   - Start with established WebSocket connection
   - Verify status indicator shows "Connected" or green indicator
   - Verify connection quality score displayed
   - Take screenshot
2. Test DISCONNECTED state:
   - Enable "Offline" mode in browser
   - Verify status indicator shows "Disconnected" or red indicator
   - Verify disconnection reason displayed if available
   - Take screenshot
3. Test CONNECTING state:
   - Clear browser cache and reload page
   - Immediately observe status during initial connection
   - Verify status indicator shows "Connecting..." or yellow indicator
   - Take screenshot (may require quick action)
4. Test RECONNECTING state:
   - Enable "Offline" mode, then quickly disable it
   - Observe status during reconnection attempt
   - Verify status indicator shows "Reconnecting (Attempt X/20)"
   - Verify reconnection counter displayed
   - Take screenshot
5. Verify additional status information:
   - Connection quality score (0-100)
   - Current latency measurement
   - Reconnection attempt counter (when reconnecting)
   - Queued message count (when messages queued)
   - Last successful connection timestamp
6. Test status indicator interactivity:
   - Click on status indicator to expand details
   - Verify detailed connection information displayed
   - Verify manual reconnect button available when disconnected

**Expected Results**:
- CONNECTED state: Green indicator, "Connected", quality score, latency shown
- DISCONNECTED state: Red indicator, "Disconnected", reason shown
- CONNECTING state: Yellow/orange indicator, "Connecting..." shown
- RECONNECTING state: Yellow/orange indicator, "Reconnecting (X/20)", counter shown
- Status updates in real-time: < 500ms after state change
- All metrics accurately reflect current connection state
- Interactive details available on click
- Visual design clear and accessible

**Validation Criteria**:
- State accuracy: 100% (status matches actual connection state)
- Update latency: < 500ms for state changes
- Visual indicators: Distinct colors for each state
- Connection quality score: 0-100 scale, updated every 10 seconds
- Latency display: Rolling average of last 10 messages
- Reconnection counter: Accurate during reconnection attempts
- Queue counter: Shows number of queued messages
- Timestamp: Last successful connection time in human-readable format

**Screenshot Requirements**:
- Screenshot 1: Status indicator in CONNECTED state with all metrics
- Screenshot 2: Status indicator in DISCONNECTED state
- Screenshot 3: Status indicator in CONNECTING state (initial connection)
- Screenshot 4: Status indicator in RECONNECTING state with attempt counter
- Screenshot 5: Expanded status details showing all connection information
- Screenshot 6: Status indicator showing connection quality score and latency
- Screenshot 7: Status indicator showing queued messages count
- Screenshot 8: Status indicator color transitions (before/after state change)

---

## Test Execution Commands

### Start Test Environment
```bash
# Navigate to project directory
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban

# Start the WebSocket server (if not already running)
# This would typically be done in a separate terminal
# or as a background service

# Start the application
npm run dev

# Wait for application to be ready
# Open browser to http://localhost:3000 (or configured port)
```

### Manual Test Execution
```bash
# The tests in this suite are primarily manual tests
# that require user interaction and observation

# Open browser developer tools before starting tests
# Recommended: Chrome DevTools or Firefox Developer Tools

# Follow test scenarios 1-10 in order
# Take screenshots as specified in each test
# Record observations and results
```

### Network Simulation Commands (Browser DevTools)

**Chrome DevTools**:
```
1. Open DevTools (F12 or Cmd+Option+I on Mac)
2. Go to Network tab
3. Enable "Offline" to simulate disconnection
4. Use "Throttling" dropdown for latency simulation:
   - Slow 3G: ~300ms latency
   - Custom: Configure custom latency/bandwidth
5. Go to Application tab > Service Workers to control network programmatically
```

**Firefox Developer Tools**:
```
1. Open Developer Tools (F12 or Cmd+Option+I on Mac)
2. Go to Network tab
3. Click settings icon > Enable throttling
4. Select or create throttling profiles
5. Use "Work Offline" option to simulate disconnection
```

### Verify WebSocket Server Health
```bash
# Check WebSocket service is running
curl http://localhost:8002/health

# Expected response:
# {"status": "healthy", "load": <number>, "memory_usage": <number>, ...}

# Test WebSocket endpoint connectivity (requires wscat)
# Install wscat if needed: npm install -g wscat
wscat -c ws://localhost:8002/ws/trigger

# Should connect successfully and allow message exchange
```

### Monitor WebSocket Traffic
```bash
# In browser DevTools:
# 1. Open Network tab
# 2. Filter by "WS" to show only WebSocket connections
# 3. Click on the WebSocket connection
# 4. View "Messages" or "Frames" tab to see all traffic
# 5. Monitor ping/pong heartbeats, trigger messages, responses

# Console logging:
# The application should log WebSocket events to console
# Look for connection state changes, errors, latency metrics
```

## Success Criteria

### All Tests Must Pass
- ✅ Test 1: Initial connection establishes successfully
- ✅ Test 2: Automatic reconnection with exponential backoff works
- ✅ Test 3: Connection stable under rapid message load (10 tickets)
- ✅ Test 4: Automatic reconnection after server restart
- ✅ Test 5: Workflow completion after reconnection from queued state
- ✅ Test 6: Message queue preserves and delivers all messages (FIFO)
- ✅ Test 7: Heartbeat mechanism keeps connection alive
- ✅ Test 8: Connection quality alerts under high latency
- ✅ Test 9: Maximum reconnection attempts (20) handled correctly
- ✅ Test 10: Status indicator accurately reflects all states

### Connection Reliability Metrics
- Initial connection success rate: > 99%
- Automatic reconnection success rate: > 95%
- Average reconnection time: < 5 seconds
- Message queue reliability: 100% (no lost messages)
- Heartbeat reliability: > 99% (pongs received)
- Maximum reconnection attempts: Exactly 20
- Exponential backoff compliance: 100%

### Performance Benchmarks
- Initial connection establishment: < 2 seconds
- Reconnection after network restoration: < 2 seconds
- Message round-trip time (normal): < 100ms average
- Message round-trip time (degraded): 100-300ms
- Heartbeat interval: 15 seconds ± 1 second
- Heartbeat timeout detection: 30 seconds
- UI status update latency: < 500ms

### Health Monitoring Accuracy
- Connection quality score accuracy: ± 5%
- Latency measurement accuracy: ± 10ms
- Health status thresholds:
  - HEALTHY: latency < 100ms, reliability > 95%
  - DEGRADED: latency 100-300ms, reliability 80-95%
  - UNHEALTHY: latency > 300ms, reliability < 80%
- Status indicator update frequency: Real-time (< 500ms)

### User Experience Requirements
- Status indicator visible at all times
- Clear visual distinction between connection states
- User-friendly error messages (no technical jargon)
- Manual reconnection option always available when disconnected
- No unhandled errors in UI or console
- Smooth state transitions without UI freezing

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Connection Fails to Establish
**Symptoms**:
- Status shows "Disconnected" or "Connecting..." indefinitely
- Console shows connection errors

**Troubleshooting Steps**:
1. Verify WebSocket server is running: `curl http://localhost:8002/health`
2. Check firewall settings allow WebSocket connections on port 8002
3. Verify correct WebSocket URL in application configuration
4. Check browser console for CORS errors or security blocks
5. Try different browser or disable browser extensions
6. Verify network connectivity to localhost

**Solution**:
- Start or restart WebSocket server
- Configure firewall to allow port 8002
- Update WebSocket URL in application settings
- Add CORS headers to server if needed

#### 2. Reconnection Attempts Fail Repeatedly
**Symptoms**:
- Reconnection counter increments but never succeeds
- Exponential backoff timing seems incorrect

**Troubleshooting Steps**:
1. Check if WebSocket server is actually running and accessible
2. Monitor server logs for connection rejections
3. Check for rate limiting on server side
4. Verify exponential backoff timing in console logs
5. Check if maximum attempts is reached (20)

**Solution**:
- Ensure server is running and not rejecting connections
- Disable or adjust server-side rate limiting for testing
- If max attempts reached, use manual reconnection
- Check server logs for specific error reasons

#### 3. Heartbeat Mechanism Not Working
**Symptoms**:
- No ping/pong messages visible in DevTools
- Connection drops during idle periods

**Troubleshooting Steps**:
1. Open DevTools > Network > WS and view message frames
2. Check if heartbeat interval is configured correctly (15s)
3. Verify server supports ping/pong messages
4. Check console for heartbeat timeout errors

**Solution**:
- Verify HEARTBEAT_INTERVAL environment variable set to 15000
- Ensure server responds to ping with pong messages
- Check server supports WebSocket ping/pong protocol
- Update heartbeat configuration if needed

#### 4. Message Queue Not Processing
**Symptoms**:
- Messages queued while disconnected are not sent after reconnection
- Queue counter doesn't decrease

**Troubleshooting Steps**:
1. Check console for queue processing errors
2. Verify queue persistence in localStorage or memory
3. Check if reconnection actually succeeds
4. Monitor network tab for outgoing messages after reconnection

**Solution**:
- Clear browser cache and localStorage, retry test
- Ensure reconnection completes successfully
- Check queue processing logic in application code
- Verify message format is valid before queuing

#### 5. Connection Quality Alerts Not Appearing
**Symptoms**:
- High latency does not trigger degraded status
- Health metrics not updating

**Troubleshooting Steps**:
1. Verify network throttling is actually applied in DevTools
2. Check health monitoring configuration
3. Monitor console for health calculation logs
4. Verify health status thresholds are configured correctly

**Solution**:
- Ensure throttling profile applies to WebSocket connections
- Check HEALTH_CHECK_INTERVAL and threshold configurations
- Update health monitoring logic if thresholds incorrect
- Verify latency calculation uses rolling average

#### 6. Status Indicator Not Updating
**Symptoms**:
- Status indicator stuck on one state
- State changes not reflected in UI

**Troubleshooting Steps**:
1. Check browser console for React rendering errors
2. Verify WebSocket event listeners are registered
3. Check if state management is working (Redux/Context)
4. Monitor connection state changes in console logs

**Solution**:
- Check React component for state update issues
- Ensure WebSocket events trigger UI state updates
- Verify state management store is updating correctly
- Refresh page to reset UI state

#### 7. Screenshots Not Capturing All States
**Symptoms**:
- Difficult to capture CONNECTING state
- State transitions too fast to screenshot

**Troubleshooting Steps**:
1. Use browser DevTools to slow down network (throttling)
2. Add artificial delays in code for testing (temporarily)
3. Use video recording and extract frames
4. Use browser screenshot automation tools

**Solution**:
- Enable network throttling to slow state transitions
- Record video of test execution, extract screenshots
- Use browser automation (Puppeteer, Playwright) for automated screenshots
- Take multiple attempts to capture transient states

## Test Data Requirements

### Sample Test Tickets
```json
[
  {
    "title": "WebSocket Connection Test - Ticket 1",
    "description": "Test ticket for WebSocket reliability testing",
    "workItemType": "feature",
    "queuedStages": ["plan"]
  },
  {
    "title": "WebSocket Connection Test - Ticket 2",
    "description": "Test ticket for rapid creation test",
    "workItemType": "feature",
    "queuedStages": ["plan"]
  },
  {
    "title": "WebSocket Connection Test - Ticket 3",
    "description": "Test ticket for message queuing test",
    "workItemType": "bug",
    "queuedStages": ["build"]
  },
  {
    "title": "WebSocket Connection Test - Ticket 4",
    "description": "Test ticket for reconnection test",
    "workItemType": "feature",
    "queuedStages": ["plan", "build"]
  },
  {
    "title": "WebSocket Connection Test - Ticket 5",
    "description": "Test ticket for stability test",
    "workItemType": "feature",
    "queuedStages": ["plan", "build", "test"]
  }
]
```

### Expected WebSocket Message Formats

**Ping Message** (Client → Server):
```json
{
  "type": "ping",
  "timestamp": 1699564800000
}
```

**Pong Message** (Server → Client):
```json
{
  "type": "pong",
  "timestamp": 1699564800000
}
```

**Trigger Workflow Message** (Client → Server):
```json
{
  "type": "trigger_workflow",
  "data": {
    "workflow_type": "adw_plan_iso",
    "adw_id": null,
    "issue_number": null,
    "model_set": "base",
    "trigger_reason": "Kanban task: WebSocket Test"
  }
}
```

**Trigger Response Message** (Server → Client):
```json
{
  "type": "trigger_response",
  "data": {
    "status": "accepted",
    "adw_id": "test_123456",
    "workflow_name": "adw_plan_iso",
    "logs_path": "/tmp/adw_logs/test_123456"
  }
}
```

**Status Update Message** (Server → Client):
```json
{
  "type": "status_update",
  "data": {
    "adw_id": "test_123456",
    "status": "running",
    "message": "Executing workflow step 2 of 5",
    "progress_percent": 40,
    "current_step": "analysis"
  }
}
```

## Validation Checklist

Use this checklist to verify all requirements are met:

- [ ] Test 1: Initial connection successful (< 2 seconds)
- [ ] Test 2: Automatic reconnection with exponential backoff (20 max attempts)
- [ ] Test 2: Exponential backoff timing verified (1s, 2s, 4s, 8s, ...)
- [ ] Test 2: Jitter randomization applied (±25%)
- [ ] Test 3: Connection stable during rapid operations (10 tickets)
- [ ] Test 3: No dropped messages under load
- [ ] Test 4: Reconnection after server restart (< 2 seconds)
- [ ] Test 5: Message queuing during disconnection
- [ ] Test 5: Queued messages sent after reconnection
- [ ] Test 6: Multiple messages queued and delivered in FIFO order
- [ ] Test 6: 100% message delivery (5/5 delivered)
- [ ] Test 7: Heartbeat ping sent every 15 seconds
- [ ] Test 7: Heartbeat pong received from server
- [ ] Test 7: Connection maintained during idle (2+ minutes)
- [ ] Test 8: Connection quality degrades at 300ms+ latency
- [ ] Test 8: Health alerts displayed for degraded connection
- [ ] Test 8: Health status: HEALTHY, DEGRADED, UNHEALTHY
- [ ] Test 9: Maximum 20 reconnection attempts enforced
- [ ] Test 9: Error message after max attempts exhausted
- [ ] Test 9: Manual reconnection option available
- [ ] Test 10: Status indicator shows CONNECTED state accurately
- [ ] Test 10: Status indicator shows DISCONNECTED state accurately
- [ ] Test 10: Status indicator shows CONNECTING state accurately
- [ ] Test 10: Status indicator shows RECONNECTING state accurately
- [ ] Test 10: Connection quality score displayed (0-100)
- [ ] Test 10: Reconnection attempt counter displayed
- [ ] Test 10: Queued message count displayed
- [ ] All required screenshots captured (50+ screenshots total)
- [ ] No console errors during any test
- [ ] All tests completed successfully

## Test Report Template

Use this template to document test execution results:

```markdown
# WebSocket Reliability E2E Test Execution Report

**Test Date**: [Date]
**Tester**: [Name]
**Application Version**: [Version]
**Browser**: [Browser name and version]
**WebSocket Server Version**: [Version]

## Test Results Summary

| Test # | Test Name | Status | Duration | Notes |
|--------|-----------|--------|----------|-------|
| 1 | Initial Connection | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 2 | Automatic Reconnection | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 3 | Rapid Ticket Addition | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 4 | Server Restart | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 5 | Workflow During Disconnection | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 6 | Message Queue | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 7 | Heartbeat Mechanism | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 8 | High Latency Alerts | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 9 | Max Reconnection Attempts | ✅ PASS / ❌ FAIL | [time] | [notes] |
| 10 | Status Indicator States | ✅ PASS / ❌ FAIL | [time] | [notes] |

## Performance Metrics

- Initial connection time: [X] seconds (target: < 2s)
- Average reconnection time: [X] seconds (target: < 5s)
- Average message round-trip: [X] ms (target: < 100ms)
- Heartbeat interval: [X] seconds (target: 15s ± 1s)
- Message delivery success rate: [X]% (target: 100%)

## Issues Found

1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Steps to reproduce: [steps]
   - Expected vs Actual: [comparison]

## Screenshots

[Attach all screenshots organized by test number]

## Overall Assessment

- [ ] All tests passed
- [ ] Some tests failed (see details above)
- [ ] Tests blocked (explain reason)

**Recommendation**: [PASS / FAIL / RETEST]

**Additional Notes**: [Any other observations]
```

This comprehensive E2E test suite ensures full validation of WebSocket connection reliability features including automatic reconnection, exponential backoff, message queuing, heartbeat monitoring, connection health tracking, and accurate status indication across all connection states.
