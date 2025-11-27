# WebSocket Integration E2E Test

## Overview
Comprehensive end-to-end test suite for WebSocket integration compliance with TAC-7 integration guide requirements.

## Test Environment Setup

### Prerequisites
- TAC-7 WebSocket service running on localhost:8002
- Agentic Kanban application running
- Test data populated in the kanban board
- Network connectivity to WebSocket service

### Environment Variables
```bash
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=8002
WEBSOCKET_PROTOCOL=ws
TEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=5000
```

## Test Scenarios

### 1. Connection Management Tests

#### Test 1.1: Basic Connection Establishment
**Purpose**: Verify basic WebSocket connection can be established

**Steps**:
1. Navigate to kanban board
2. Verify WebSocket status indicator shows "Disconnected"
3. Click "Connect" or wait for auto-connection
4. Verify connection status changes to "Connecting" then "Connected"
5. Verify WebSocket status indicator shows green/healthy status

**Expected Results**:
- Connection establishes within 5 seconds
- Status indicator updates correctly
- No error messages displayed
- Console logs show successful connection

**Validation Command**:
```bash
# Check WebSocket connection via browser console
console.log(window.websocketService?.getStatus())
```

#### Test 1.2: Connection Retry Logic
**Purpose**: Test exponential backoff retry mechanism

**Steps**:
1. Establish WebSocket connection
2. Stop WebSocket service (simulate server down)
3. Observe reconnection attempts
4. Verify exponential backoff timing (1s, 2s, 4s, 8s, 16s)
5. Restart WebSocket service
6. Verify automatic reconnection

**Expected Results**:
- Retry attempts follow exponential backoff pattern
- Maximum retry attempts respected (5 attempts)
- Automatic reconnection when service available
- User-friendly error messages displayed

#### Test 1.3: Graceful Disconnection
**Purpose**: Test clean disconnection process

**Steps**:
1. Establish WebSocket connection
2. Click disconnect button or trigger manual disconnect
3. Verify clean disconnection (close code 1000)
4. Verify no automatic reconnection attempts
5. Verify UI updates to show disconnected state

**Expected Results**:
- Clean disconnection with proper close code
- No error messages for manual disconnect
- UI reflects disconnected state
- No background reconnection attempts

### 2. Message Protocol Tests

#### Test 2.1: Workflow Trigger Message
**Purpose**: Test workflow triggering via WebSocket

**Steps**:
1. Create a new task in backlog
2. Move task to "plan" stage
3. Click "Trigger Workflow" button
4. Verify trigger_workflow message sent with correct format
5. Verify trigger_response received
6. Verify workflow status updates

**Expected Message Format**:
```json
{
  "type": "trigger_workflow",
  "data": {
    "workflow_type": "adw_plan_iso",
    "adw_id": null,
    "issue_number": null,
    "model_set": "base",
    "trigger_reason": "Kanban task: Test Task"
  }
}
```

**Expected Results**:
- Message sent with correct structure
- Response received within 10 seconds
- Workflow status updates in UI
- Task metadata updated with ADW information

#### Test 2.2: Status Update Handling
**Purpose**: Test real-time status update processing

**Steps**:
1. Trigger a workflow
2. Monitor for status_update messages
3. Verify UI updates for each status change
4. Verify progress indicators update
5. Verify final completion status

**Expected Message Format**:
```json
{
  "type": "status_update",
  "data": {
    "adw_id": "adw_12345",
    "status": "running",
    "message": "Processing workflow step 2 of 5",
    "progress_percent": 40,
    "current_step": "analysis"
  }
}
```

**Expected Results**:
- Real-time UI updates for each status change
- Progress bars update correctly
- Status text updates appropriately
- No UI lag or missing updates

#### Test 2.3: Error Message Handling
**Purpose**: Test error message processing and user-friendly display

**Steps**:
1. Trigger a workflow that will fail (invalid parameters)
2. Verify error message received
3. Verify user-friendly error displayed
4. Verify recovery suggestions shown
5. Test error recovery actions

**Expected Message Format**:
```json
{
  "type": "error",
  "data": {
    "message": "Invalid workflow type specified",
    "code": "invalid_workflow_type",
    "details": {
      "provided": "invalid_type",
      "valid_types": ["adw_plan_iso", "adw_build_iso"]
    }
  }
}
```

**Expected Results**:
- User-friendly error message displayed
- Recovery suggestions provided
- Error mapped through error mapping utility
- Option to retry or get help

### 3. Health Monitoring Tests

#### Test 3.1: Heartbeat Mechanism
**Purpose**: Test ping/pong heartbeat functionality

**Steps**:
1. Establish WebSocket connection
2. Monitor network traffic for ping messages
3. Verify ping sent every 30 seconds
4. Verify pong responses received
5. Test heartbeat timeout handling

**Expected Results**:
- Ping messages sent at 30-second intervals
- Pong responses received for each ping
- Connection maintained during idle periods
- Timeout detection if pongs not received

#### Test 3.2: Health Status Monitoring
**Purpose**: Test comprehensive health monitoring

**Steps**:
1. Open WebSocket status indicator detailed view
2. Verify health metrics displayed
3. Monitor metrics updates in real-time
4. Test different health states (healthy, degraded, unhealthy)
5. Verify alerts generated for health issues

**Expected Results**:
- Real-time health metrics displayed
- Latency measurements accurate
- Reliability scores calculated correctly
- Health status changes reflected in UI

#### Test 3.3: Server Health Checks
**Purpose**: Test server health endpoint integration

**Steps**:
1. Verify health check requests sent periodically
2. Check health endpoint response format
3. Verify server metrics displayed in UI
4. Test health check failure handling

**Expected Health Response**:
```json
{
  "status": "healthy",
  "load": 0.3,
  "memory_usage": 0.45,
  "active_connections": 12,
  "uptime": 86400
}
```

**Expected Results**:
- Health checks sent every 60 seconds
- Server metrics displayed accurately
- Health degradation detected and reported
- UI updates based on server health

### 4. User Interface Integration Tests

#### Test 4.1: Status Indicator Component
**Purpose**: Test WebSocket status indicator functionality

**Steps**:
1. Verify status indicator visible in UI
2. Test different display modes (minimal, compact, normal, detailed)
3. Verify status changes reflected immediately
4. Test click actions (expand, retry, disconnect)
5. Verify tooltips and help text

**Expected Results**:
- Status indicator visible and responsive
- Accurate status representation
- Interactive elements work correctly
- Accessibility features functional

#### Test 4.2: Kanban Card Integration
**Purpose**: Test WebSocket integration in kanban cards

**Steps**:
1. Create a task and select it
2. Verify WebSocket controls in expanded card view
3. Test workflow triggering from card
4. Verify workflow status updates in card
5. Test connection status display in card

**Expected Results**:
- WebSocket controls accessible in cards
- Workflow triggering works from cards
- Real-time updates reflected in cards
- Connection status visible when needed

#### Test 4.3: Error Display and Recovery
**Purpose**: Test error handling in UI components

**Steps**:
1. Simulate various error conditions
2. Verify error messages displayed appropriately
3. Test error recovery actions
4. Verify error clearing after recovery
5. Test error persistence across page refresh

**Expected Results**:
- Errors displayed with clear messaging
- Recovery actions provided and functional
- Errors clear after successful recovery
- Persistent errors remembered appropriately

### 5. Performance and Reliability Tests

#### Test 5.1: Connection Under Load
**Purpose**: Test WebSocket performance under load

**Steps**:
1. Create multiple concurrent connections (simulate multiple tabs)
2. Send high volume of messages
3. Monitor connection stability
4. Verify message delivery reliability
5. Test resource cleanup on disconnect

**Expected Results**:
- Connections remain stable under load
- All messages delivered successfully
- No memory leaks detected
- Clean resource cleanup

#### Test 5.2: Network Resilience
**Purpose**: Test behavior under poor network conditions

**Steps**:
1. Simulate network interruptions
2. Test connection recovery
3. Simulate high latency conditions
4. Test message queuing during disconnection
5. Verify data integrity after reconnection

**Expected Results**:
- Automatic recovery from network issues
- Graceful handling of high latency
- No message loss during brief disconnections
- Data consistency maintained

#### Test 5.3: Browser Compatibility
**Purpose**: Test WebSocket integration across browsers

**Steps**:
1. Test in Chrome, Firefox, Safari, Edge
2. Verify consistent behavior across browsers
3. Test mobile browsers (iOS Safari, Android Chrome)
4. Verify fallback mechanisms if needed

**Expected Results**:
- Consistent functionality across browsers
- No browser-specific issues
- Mobile compatibility maintained
- Appropriate fallbacks available

### 6. Security and Validation Tests

#### Test 6.1: Message Validation
**Purpose**: Test message validation and sanitization

**Steps**:
1. Send malformed JSON messages
2. Send messages with invalid schemas
3. Send oversized messages
4. Test XSS prevention in message content
5. Verify validation error handling

**Expected Results**:
- Malformed messages rejected gracefully
- Invalid schemas caught and reported
- Oversized messages handled appropriately
- XSS attacks prevented
- Clear validation error messages

#### Test 6.2: Rate Limiting
**Purpose**: Test rate limiting functionality

**Steps**:
1. Send messages rapidly to trigger rate limiting
2. Verify rate limit enforcement
3. Test rate limit recovery
4. Verify user notification of rate limiting

**Expected Results**:
- Rate limiting enforced consistently
- User notified of rate limit status
- Automatic recovery after cooldown
- No service disruption from rate limiting

### 7. Edge Cases and Error Scenarios

#### Test 7.1: Service Unavailable
**Purpose**: Test behavior when WebSocket service is completely unavailable

**Steps**:
1. Stop WebSocket service completely
2. Attempt to connect
3. Verify appropriate error handling
4. Test fallback mechanisms
5. Verify graceful degradation

**Expected Results**:
- Clear error message about service unavailability
- Fallback options provided where possible
- No application crashes or freezes
- Retry options available

#### Test 7.2: Partial Message Loss
**Purpose**: Test handling of incomplete or corrupted messages

**Steps**:
1. Simulate network issues causing partial message loss
2. Send incomplete JSON messages
3. Test handling of out-of-order messages
4. Verify error recovery mechanisms

**Expected Results**:
- Incomplete messages handled gracefully
- Out-of-order messages managed correctly
- Error recovery mechanisms activated
- No data corruption

#### Test 7.3: Session Persistence
**Purpose**: Test connection state persistence across browser sessions

**Steps**:
1. Establish WebSocket connection
2. Configure connection settings
3. Refresh browser page
4. Verify connection state restored
5. Test across browser restart

**Expected Results**:
- Connection settings persisted
- Automatic reconnection after page refresh
- State restoration works correctly
- User preferences maintained

## Test Execution Commands

### Run All Tests
```bash
# Navigate to project directory
cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban

# Start the application (if not already running)
npm run dev

# Run the WebSocket integration tests
npm run test:e2e:websocket

# Or run with specific test patterns
npm run test:e2e -- --grep "WebSocket"
```

### Individual Test Categories
```bash
# Connection management tests
npm run test:e2e -- --grep "Connection Management"

# Message protocol tests
npm run test:e2e -- --grep "Message Protocol"

# Health monitoring tests
npm run test:e2e -- --grep "Health Monitoring"

# UI integration tests
npm run test:e2e -- --grep "User Interface Integration"

# Performance tests
npm run test:e2e -- --grep "Performance and Reliability"

# Security tests
npm run test:e2e -- --grep "Security and Validation"

# Edge case tests
npm run test:e2e -- --grep "Edge Cases"
```

### Manual Test Verification
```bash
# Check WebSocket service health
curl http://localhost:8002/health

# Verify WebSocket endpoint
wscat -c ws://localhost:8002/ws/trigger

# Monitor WebSocket traffic in browser
# Open Developer Tools > Network > WS tab
```

## Test Data Requirements

### Sample Tasks for Testing
```json
[
  {
    "title": "Test Task 1",
    "description": "Basic workflow test task",
    "workItemType": "feature",
    "queuedStages": ["plan", "build", "test"]
  },
  {
    "title": "Error Test Task",
    "description": "Task for testing error scenarios",
    "workItemType": "bug",
    "queuedStages": ["build"]
  },
  {
    "title": "Complex Workflow Task",
    "description": "Multi-stage workflow test",
    "workItemType": "feature",
    "queuedStages": ["plan", "build", "test", "review", "document", "pr"]
  }
]
```

### Mock WebSocket Server (for offline testing)
```javascript
// mock-websocket-server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8002 });

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);

    if (data.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }

    if (data.type === 'trigger_workflow') {
      // Simulate workflow response
      ws.send(JSON.stringify({
        type: 'trigger_response',
        data: {
          status: 'accepted',
          adw_id: 'test_' + Date.now(),
          workflow_name: data.data.workflow_type,
          logs_path: '/tmp/test_logs'
        }
      }));

      // Simulate status updates
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'status_update',
          data: {
            adw_id: 'test_' + Date.now(),
            status: 'completed',
            message: 'Workflow completed successfully',
            progress_percent: 100,
            current_step: 'finished'
          }
        }));
      }, 2000);
    }
  });

  ws.on('close', function() {
    console.log('Client disconnected');
  });
});
```

## Success Criteria

### All Tests Must Pass
- ✅ Connection establishment and management
- ✅ Message protocol compliance
- ✅ Health monitoring functionality
- ✅ UI integration responsiveness
- ✅ Performance under normal load
- ✅ Security validation measures
- ✅ Error handling and recovery

### Performance Benchmarks
- Connection establishment: < 2 seconds
- Message round-trip: < 100ms average
- UI updates: < 50ms after message received
- Memory usage: No leaks after 1 hour operation
- CPU usage: < 5% during normal operation

### Quality Metrics
- Test coverage: > 90% of WebSocket-related code
- Error recovery: 100% of recoverable errors handled
- User experience: No unhandled errors in UI
- Documentation: All features documented with examples

## Troubleshooting Guide

### Common Issues and Solutions

1. **Connection Timeout**
   - Check WebSocket service is running
   - Verify firewall settings
   - Check network connectivity

2. **Message Format Errors**
   - Validate JSON structure
   - Check required fields presence
   - Verify data types match schema

3. **Performance Issues**
   - Monitor network latency
   - Check server resource usage
   - Verify client-side performance

4. **UI Update Delays**
   - Check React re-render efficiency
   - Verify state management optimization
   - Monitor JavaScript execution time

## Continuous Integration

### Automated Test Execution
```yaml
# .github/workflows/websocket-e2e.yml
name: WebSocket E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  websocket-tests:
    runs-on: ubuntu-latest

    services:
      websocket-server:
        image: websocket-test-server:latest
        ports:
          - 8002:8002

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Wait for WebSocket service
      run: npx wait-on ws://localhost:8002/ws/trigger

    - name: Run WebSocket E2E tests
      run: npm run test:e2e:websocket

    - name: Generate test report
      run: npm run test:report:websocket
```

This comprehensive E2E test suite ensures full TAC-7 WebSocket integration compliance and provides confidence in the reliability and functionality of the WebSocket implementation.