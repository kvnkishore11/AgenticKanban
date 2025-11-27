# E2E Test: WebSocket Agent-Level Streaming

## Test Overview
This end-to-end test validates that the WebSocket manager and agent directory monitor correctly stream agent-level events in real-time by monitoring the `agents/{adw_id}` directory structure.

## Prerequisites
- WebSocket server running on port 8500
- Frontend application running
- Test environment with ability to trigger workflows

## Test Steps

### 1. Start WebSocket Server
```bash
cd adws
uv run python adw_triggers/trigger_websocket.py &
```
**Expected**: Server starts successfully on port 8500

### 2. Verify Server Health
```bash
curl http://localhost:8500/health
```
**Expected**: Returns healthy status with active connections count

### 3. Verify Module Imports
```bash
cd adws
uv run python -c "from adw_modules.websocket_manager import get_websocket_manager; print('WebSocket manager import successful')"
uv run python -c "from adw_modules.agent_directory_monitor import AgentDirectoryMonitor; print('Agent directory monitor import successful')"
```
**Expected**: Both imports succeed without errors

### 4. Connect WebSocket Client
Open browser console and connect to WebSocket:
```javascript
const ws = new WebSocket('ws://localhost:8500/ws/trigger');
const events = [];

ws.onopen = () => {
    console.log('WebSocket connected');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received event:', data.type, data);
    events.push(data);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('WebSocket closed');
};
```
**Expected**: Connection established successfully

### 5. Trigger Test Workflow
Create a simple test issue and trigger a workflow:
```javascript
// Via WebSocket
ws.send(JSON.stringify({
    type: 'trigger_workflow',
    data: {
        workflow_type: 'adw_plan_iso',
        issue_type: 'feature',
        issue_json: {
            title: 'Test WebSocket Agent Streaming',
            body: 'Simple test to validate agent-level event streaming',
            stage: 'backlog'
        },
        model_set: 'haiku'
    }
}));
```
**Expected**:
- Receive trigger_response with adw_id
- Receive status_update with "started" status
- Agent directory monitor starts for the adw_id

### 6. Verify ADW State Broadcasting
Monitor console for agent_updated events:
```javascript
// Filter for agent state updates
const stateUpdates = events.filter(e => e.type === 'agent_updated');
console.log('State updates:', stateUpdates);
```
**Expected**:
- Receive agent_updated events when adw_state.json changes
- Events contain state data and changed_fields
- State transitions visible in real-time

### 7. Verify JSONL Streaming
Monitor console for thinking_block events:
```javascript
// Filter for thinking blocks from JSONL parsing
const thinkingBlocks = events.filter(e => e.type === 'thinking_block');
console.log('Thinking blocks:', thinkingBlocks);
```
**Expected**:
- Receive thinking_block events as agent thinks
- Events contain content and reasoning_type
- Events streamed in real-time from raw_output.jsonl

### 8. Verify Tool Execution Events
Monitor console for tool_use_pre and tool_use_post events:
```javascript
// Filter for tool execution events
const toolEvents = events.filter(e => e.type.startsWith('tool_use_'));
console.log('Tool events:', toolEvents);
```
**Expected**:
- Receive tool_use_pre before tool execution
- Receive tool_use_post after tool execution
- Events contain tool_name, input/output, and status
- Events show tools like Read, Write, Bash, etc.

### 9. Verify File Change Events
Monitor console for file_changed events:
```javascript
// Filter for file changes
const fileChanges = events.filter(e => e.type === 'file_changed');
console.log('File changes:', fileChanges);
```
**Expected**:
- Receive file_changed events when agent modifies files
- Events contain file_path, operation, diff, summary
- Lines added/removed tracked correctly

### 10. Verify Text Block Events
Monitor console for text_block events:
```javascript
// Filter for text blocks
const textBlocks = events.filter(e => e.type === 'text_block');
console.log('Text blocks:', textBlocks);
```
**Expected**:
- Receive text_block events with agent responses
- Events contain content and sequence number
- Events streamed in order

### 11. Verify Execution Log Tailing
Monitor console for agent_log events from execution.log:
```javascript
// Filter for agent logs
const agentLogs = events.filter(e => e.type === 'agent_log' && e.data.source === 'execution.log');
console.log('Execution logs:', agentLogs);
```
**Expected**:
- Receive agent_log events from execution.log tailing
- Events contain message, level, and agent_role
- Log levels correctly identified (INFO, ERROR, WARNING, SUCCESS)

### 12. Verify Screenshot Detection
If workflow includes reviewer stage, monitor for screenshot events:
```javascript
// Filter for screenshot notifications
const screenshots = events.filter(e => e.type === 'screenshot_available');
console.log('Screenshots:', screenshots);
```
**Expected**:
- Receive screenshot_available when screenshots created
- Events contain screenshot_path and metadata
- File size and created_at timestamp included

### 13. Verify Spec Creation Events
Monitor for spec_created events:
```javascript
// Filter for spec creation
const specs = events.filter(e => e.type === 'spec_created');
console.log('Specs:', specs);
```
**Expected**:
- Receive spec_created when spec file written
- Events contain spec_path, spec_type, and metadata
- Spec type correctly identified (plan, patch, review)

### 14. Verify Heartbeat Mechanism
Monitor for heartbeat events:
```javascript
// Filter for heartbeats
const heartbeats = events.filter(e => e.type === 'heartbeat');
console.log('Heartbeats:', heartbeats);
```
**Expected**:
- Receive periodic heartbeat events
- Events contain active_connections count
- Server time included in heartbeat

### 15. Test Event Ordering and Completeness
```javascript
// Print all event types received
const eventTypes = events.map(e => e.type);
const uniqueTypes = [...new Set(eventTypes)];
console.log('Event types received:', uniqueTypes);
console.log('Total events:', events.length);

// Verify critical events present
const criticalEvents = [
    'agent_updated',
    'thinking_block',
    'tool_use_pre',
    'tool_use_post',
    'agent_log'
];

criticalEvents.forEach(eventType => {
    const count = events.filter(e => e.type === eventType).length;
    console.log(`${eventType}: ${count} events`);
});
```
**Expected**:
- All critical event types received
- Events ordered chronologically
- No gaps in event sequence

### 16. Take UI Screenshots
Take screenshots of the UI showing real-time agent activity:
- Screenshot of agent list with real-time status updates
- Screenshot of agent detail view with thinking blocks
- Screenshot of tool execution timeline
- Screenshot of file changes view
- Screenshot of execution logs streaming

**Expected**:
- UI updates in real-time as events arrive
- All agent-level details visible
- No lag or missed updates

### 17. Verify Monitor Cleanup
After workflow completes, verify monitor is cleaned up:
```bash
# Check server logs for cleanup messages
# Should see "Cleaned up directory monitor for ADW {adw_id}"
```
**Expected**:
- Monitor stops when workflow completes
- Resources freed properly
- No memory leaks

## Success Criteria

✅ WebSocket server starts and accepts connections
✅ Agent directory monitor starts when workflow triggered
✅ adw_state.json changes broadcast as agent_updated events
✅ raw_output.jsonl parsed and events broadcast (thinking, tool use, file changes, text)
✅ execution.log tailed and broadcast as agent_log events
✅ Screenshots detected and broadcast
✅ Spec files detected and broadcast
✅ Heartbeat mechanism working
✅ All events received in correct order
✅ UI updates in real-time
✅ Monitor cleanup works properly
✅ No errors or crashes during test
✅ Performance acceptable with high event frequency

## Validation Commands

```bash
# Verify imports work
cd adws && uv run python -c "from adw_modules.websocket_manager import get_websocket_manager; print('OK')"
cd adws && uv run python -c "from adw_modules.agent_directory_monitor import AgentDirectoryMonitor; print('OK')"

# Check WebSocket server health
curl http://localhost:8500/health

# Verify agents directory exists
ls -la agents/

# Check for test ADW directory (replace with actual adw_id from test)
ls -la agents/{adw_id}/

# Verify watchdog library available
cd adws && uv run python -c "import watchdog; print('Watchdog available')"
```

## Troubleshooting

### WebSocket not connecting
- Check server is running: `ps aux | grep trigger_websocket`
- Check port 8500 not in use: `lsof -i :8500`
- Check firewall settings

### No events received
- Check agent directory exists: `ls agents/{adw_id}`
- Check monitor started: Look for "Started directory monitoring" in logs
- Check file permissions on agents directory
- Verify watchdog library installed: `cd adws && uv pip list | grep watchdog`

### Events delayed or missing
- Check polling interval (default 1 second)
- Verify file system events triggering
- Check for errors in monitor logs
- Verify async event loop running

### Monitor not cleaning up
- Check workflow completion detection
- Verify cleanup_monitor called
- Check for exceptions in cleanup code
- Verify observer.stop() called

## Notes

- This test should take approximately 5-10 minutes for a simple workflow
- Use haiku model for faster test execution
- Monitor network tab in browser devtools for WebSocket frames
- Check browser console for JavaScript errors
- Review server logs for Python errors
- Test with multiple concurrent connections to verify broadcast works
- Consider testing with different workflow types (plan, build, test, review)
