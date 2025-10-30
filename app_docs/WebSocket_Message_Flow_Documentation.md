# WebSocket Message Flow Documentation

## Current Message Flow Architecture

### Client → Server Messages (Outbound)

#### 1. Connection Management
```javascript
// Heartbeat/Ping
{
  "type": "ping"
}

// Manual Disconnect
// Uses ws.close(1000, 'Client disconnect')
```

#### 2. Workflow Triggering
```javascript
// Trigger Workflow
{
  "type": "trigger_workflow",
  "data": {
    "workflow_type": "adw_plan_iso" | "adw_build_iso" | "adw_test_iso" | "adw_review_iso" | "adw_document_iso" | "adw_ship_iso",
    "adw_id": "string|null",
    "issue_number": "string|null",
    "model_set": "base" | "heavy",
    "trigger_reason": "string"
  }
}
```

### Server → Client Messages (Inbound)

#### 1. Connection Management
```javascript
// Heartbeat Response
{
  "type": "pong",
  "timestamp": "number"
}
```

#### 2. Workflow Responses
```javascript
// Workflow Trigger Response
{
  "type": "trigger_response",
  "data": {
    "status": "accepted" | "rejected",
    "adw_id": "string",
    "workflow_name": "string",
    "logs_path": "string",
    "error": "string|null",
    "message": "string|null"
  }
}
```

#### 3. Workflow Status Updates
```javascript
// Status Update
{
  "type": "status_update",
  "data": {
    "adw_id": "string",
    "status": "started" | "running" | "completed" | "failed",
    "message": "string",
    "progress_percent": "number",
    "current_step": "string"
  }
}
```

#### 4. Error Messages
```javascript
// Error Response
{
  "type": "error",
  "data": {
    "message": "string",
    "code": "string|null",
    "details": "object|null"
  }
}
```

## Message Handler Mapping

### Current Handlers (websocketService.js)
```javascript
handleMessage(message) {
  const { type, data } = message;

  switch (type) {
    case 'trigger_response':
      this.emit('trigger_response', data);
      break;
    case 'status_update':
      this.emit('status_update', data);
      break;
    case 'error':
      this.emit('error', data);
      break;
    case 'pong':
      this.emit('pong', message);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
}
```

### Current Event Listeners (kanbanStore.js)
```javascript
// WebSocket Event Handlers
websocketService.on('connect', () => {
  // Update connection state
});

websocketService.on('disconnect', () => {
  // Update connection state
});

websocketService.on('error', (error) => {
  // Handle connection errors
});

websocketService.on('status_update', (statusUpdate) => {
  // Handle workflow status updates
});
```

## Missing Message Types (TAC-7 Compliance Gaps)

### 1. Enhanced Connection Management
```javascript
// Missing: Connection Quality Report
{
  "type": "connection_quality",
  "data": {
    "latency": "number",
    "bandwidth": "number",
    "reliability_score": "number",
    "last_measurement": "timestamp"
  }
}

// Missing: Server Health Status
{
  "type": "health_status",
  "data": {
    "status": "healthy" | "degraded" | "unhealthy",
    "load": "number",
    "memory_usage": "number",
    "active_connections": "number",
    "uptime": "number"
  }
}
```

### 2. Enhanced Workflow Management
```javascript
// Missing: Workflow Queue Status
{
  "type": "queue_status",
  "data": {
    "queue_length": "number",
    "estimated_wait_time": "number",
    "position": "number"
  }
}

// Missing: Workflow Metrics
{
  "type": "workflow_metrics",
  "data": {
    "adw_id": "string",
    "execution_time": "number",
    "resource_usage": "object",
    "performance_score": "number"
  }
}

// Missing: Workflow Cancellation
{
  "type": "cancel_workflow",
  "data": {
    "adw_id": "string",
    "reason": "string"
  }
}
```

### 3. Enhanced Error Handling
```javascript
// Missing: Detailed Error Reports
{
  "type": "error_report",
  "data": {
    "error_id": "string",
    "category": "connection" | "workflow" | "system",
    "severity": "low" | "medium" | "high" | "critical",
    "description": "string",
    "suggested_actions": ["string"],
    "recovery_options": ["string"],
    "timestamp": "string"
  }
}

// Missing: Recovery Instructions
{
  "type": "recovery_instructions",
  "data": {
    "error_id": "string",
    "steps": ["string"],
    "estimated_time": "number",
    "success_probability": "number"
  }
}
```

### 4. Security and Authentication
```javascript
// Missing: Authentication Challenge
{
  "type": "auth_challenge",
  "data": {
    "challenge": "string",
    "method": "token" | "oauth" | "api_key",
    "expires_in": "number"
  }
}

// Missing: Authentication Response
{
  "type": "auth_response",
  "data": {
    "token": "string",
    "user_id": "string",
    "permissions": ["string"],
    "expires_at": "timestamp"
  }
}
```

### 5. Advanced Monitoring
```javascript
// Missing: Performance Metrics
{
  "type": "performance_metrics",
  "data": {
    "cpu_usage": "number",
    "memory_usage": "number",
    "network_io": "object",
    "disk_io": "object",
    "timestamp": "string"
  }
}

// Missing: Alert Notifications
{
  "type": "alert",
  "data": {
    "alert_id": "string",
    "level": "info" | "warning" | "error" | "critical",
    "message": "string",
    "component": "string",
    "timestamp": "string",
    "actions_required": ["string"]
  }
}
```

## Protocol Flow Diagrams

### Current Workflow Trigger Flow
```
Client                          Server
  |                               |
  |-- trigger_workflow ---------->|
  |                               |
  |<------- trigger_response -----|
  |                               |
  |<------- status_update -------|  (multiple)
  |                               |
  |<------- status_update -------|  (completion)
```

### Missing Enhanced Flow (TAC-7 Compliant)
```
Client                          Server
  |                               |
  |-- auth_challenge ------------>| (if security enabled)
  |<------ auth_response ---------|
  |                               |
  |<------ health_status ---------|  (periodic)
  |<------ queue_status ----------|  (if queue exists)
  |                               |
  |-- trigger_workflow ---------->|
  |                               |
  |<------- trigger_response -----|
  |<------- workflow_metrics -----|
  |                               |
  |<------- status_update -------|  (with enhanced data)
  |<------- performance_metrics --|  (periodic)
  |                               |
  |<------- status_update -------|  (completion)
  |<------- workflow_metrics -----|  (final metrics)
```

## Message Validation Gaps

### Current Validation
- ✅ Basic JSON parsing with try/catch
- ✅ Message type checking (switch statement)
- ❌ Schema validation for message structure
- ❌ Data type validation for fields
- ❌ Required field validation
- ❌ Range/constraint validation

### Required Validation Schema
```javascript
// Example enhanced validation needed
const messageSchemas = {
  trigger_workflow: {
    type: "object",
    required: ["workflow_type"],
    properties: {
      workflow_type: {
        type: "string",
        enum: ["adw_plan_iso", "adw_build_iso", "adw_test_iso", "adw_review_iso", "adw_document_iso", "adw_ship_iso"]
      },
      model_set: {
        type: "string",
        enum: ["base", "heavy"],
        default: "base"
      },
      trigger_reason: {
        type: "string",
        maxLength: 500
      }
    }
  }
};
```

## Error Recovery Flows

### Current Error Recovery
```
Error Occurs → Log Error → Emit Error Event → UI Shows Error Message
```

### Missing Enhanced Error Recovery
```
Error Occurs → Classify Error → Check Recovery Options → Attempt Auto-Recovery →
  Success: Continue →
  Failure: Present User Options → User Chooses → Execute Recovery
```

## Integration Points

### Current Integration Points
1. **kanbanStore.js**: WebSocket state management and event handling
2. **KanbanCard.jsx**: Workflow triggering UI and status display
3. **stageProgressionService.js**: Automatic stage progression logic

### Missing Integration Points
1. **Global status indicator**: No dedicated WebSocket status component
2. **Drag-and-drop triggers**: No automatic workflow triggering on task movement
3. **Notification system**: No user notifications for connection changes
4. **Error dashboard**: No centralized error reporting interface

## Performance Considerations

### Current Performance Characteristics
- **Connection pooling**: Single connection per service
- **Message queuing**: No queuing (immediate send/fail)
- **Rate limiting**: No rate limiting implemented
- **Memory management**: Basic cleanup on disconnect

### Missing Performance Features
- **Message queuing** for offline scenarios
- **Rate limiting** to prevent server overload
- **Connection pooling** for multiple concurrent workflows
- **Message compression** for large payloads
- **Metrics collection** for performance analysis

## Security Analysis

### Current Security Features
- ❌ No authentication mechanism
- ❌ No message encryption
- ❌ No request signing
- ❌ No rate limiting
- ❌ No input sanitization beyond JSON parsing

### Required Security Features (TAC-7 Compliance)
- **Authentication**: Token-based or API key authentication
- **Authorization**: Permission-based access control
- **Input validation**: Comprehensive message validation
- **Rate limiting**: Prevent abuse and DoS attacks
- **Audit logging**: Track all WebSocket operations
- **Secure connection**: WSS (WebSocket Secure) support

## Next Steps for Implementation

### High Priority Message Handlers
1. Enhanced error handling with recovery instructions
2. Workflow queue status and management
3. Connection quality monitoring
4. Performance metrics collection

### Medium Priority Message Handlers
1. Authentication and authorization
2. Advanced workflow metrics
3. Alert notifications
4. Health status reporting

### Low Priority Message Handlers
1. Workflow cancellation
2. Advanced performance monitoring
3. Connection optimization suggestions
4. Advanced debugging information