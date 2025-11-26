# Agents Directory Usage Guide

## Overview

The `agents/` directory is the heart of the ADW (AI Developer Workflow) system,
providing complete workflow execution history and real-time monitoring
capabilities through the filesystem. This guide explains how to leverage this
directory structure for debugging, monitoring, and building integrations.

**Key Insight**: The agents directory is the **primary source of truth** for
workflow state. WebSocket notifications are an optional convenience layer built
on top of this filesystem-based architecture.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Understanding JSONL Format](#understanding-jsonl-format)
3. [Filesystem vs WebSocket Approaches](#filesystem-vs-websocket-approaches)
4. [Filesystem Monitoring Patterns](#filesystem-monitoring-patterns)
5. [WebSocket Monitoring Patterns](#websocket-monitoring-patterns)
6. [Use Case Examples](#use-case-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Directory Structure

### Overview

Each ADW workflow creates an isolated directory structure under
`agents/{adw_id}/`:

```
agents/
├── 7b25b54d/                          # ADW ID (unique workflow instance)
│   ├── adw_state.json                 # Central state file (metadata)
│   ├── sdlc_planner/                  # Planning phase
│   │   ├── raw_output.jsonl           # Live execution logs (JSONL)
│   │   ├── raw_output.json            # Complete execution transcript
│   │   └── prompts/                   # Prompt files used
│   ├── sdlc_implementor/              # Implementation phase
│   │   ├── raw_output.jsonl
│   │   ├── raw_output.json
│   │   └── prompts/
│   ├── sdlc_planner_committer/        # Git operations for planning
│   ├── sdlc_implementor_committer/    # Git operations for implementation
│   ├── documenter/                    # Documentation phase
│   ├── documenter_committer/          # Git operations for documentation
│   └── ... (other phases)
```

### Key Files

#### `adw_state.json`

The single source of truth for workflow metadata. Contains:

```json
{
  "adw_id": "7b25b54d",
  "issue_number": "31",
  "branch_name": "bug-issue-31-adw-7b25b54d-fix-unknown-workflow-log-message",
  "plan_file": "specs/issue-31-adw-7b25b54d-sdlc_planner-fix-workflow-log-handler.md",
  "issue_class": "/bug",
  "worktree_path": "/path/to/worktree",
  "backend_port": 9113,
  "frontend_port": 9213,
  "model_set": "base",
  "all_adws": ["adw_plan_iso", "adw_build_iso", "adw_document_iso"],
  "data_source": "kanban",
  "completed": false
}
```

**Use this file to**:

- Get workflow status and metadata
- Find the worktree path
- Identify which phases have been executed
- Check completion status

#### `raw_output.jsonl`

Live execution logs in JSON Lines format. Each line is a complete JSON object
representing one event:

```jsonl
{"type":"system","subtype":"init","cwd":"/path","session_id":"...","tools":[...],...}
{"type":"assistant","message":{...},"session_id":"..."}
{"type":"tool_use","tool":"Read","input":{...},"session_id":"..."}
{"type":"tool_result","tool":"Read","output":"...","session_id":"..."}
```

**Use this file to**:

- Monitor live execution in real-time
- Debug tool usage and results
- Track what the AI agent is doing
- Analyze conversation flow

## Understanding JSONL Format

### What is JSONL?

JSONL (JSON Lines) is a format where each line is a complete, valid JSON object.
This enables:

1. **Streaming**: Lines can be read as they're written (live monitoring)
2. **Incremental parsing**: Process one event at a time without loading entire
   file
3. **Fault tolerance**: Corruption of one line doesn't affect others
4. **Simple tooling**: Standard Unix tools like `tail`, `grep`, `jq` work
   perfectly

### Event Types in raw_output.jsonl

#### System Init

```json
{
  "type": "system",
  "subtype": "init",
  "cwd": "/path/to/worktree",
  "session_id": "uuid",
  "tools": ["Task", "Bash", "Read", "Write", ...],
  "model": "claude-sonnet-4-5-20250929"
}
```

#### Assistant Messages

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{ "type": "text", "text": "I'll help you with that..." }]
  }
}
```

#### Tool Use

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_xxx",
        "name": "Read",
        "input": { "file_path": "/path/to/file" }
      }
    ]
  }
}
```

#### Tool Results

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_xxx",
  "content": "... file contents ..."
}
```

### Parsing JSONL

#### Using `jq` (shell)

```bash
# Get all tool uses
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq 'select(.type == "assistant") | .message.content[] | select(.type == "tool_use")'

# Count tool invocations by type
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name' | \
  sort | uniq -c

# Extract all assistant text responses
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text'
```

#### Using Python

```python
import json

def parse_jsonl(filepath):
    """Parse JSONL file line by line."""
    events = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                events.append(json.loads(line))
    return events

def get_tool_uses(events):
    """Extract all tool uses from events."""
    tool_uses = []
    for event in events:
        if event.get('type') == 'assistant':
            content = event.get('message', {}).get('content', [])
            for item in content:
                if item.get('type') == 'tool_use':
                    tool_uses.append(item)
    return tool_uses

# Usage
events = parse_jsonl('agents/7b25b54d/sdlc_planner/raw_output.jsonl')
tools = get_tool_uses(events)
print(f"Found {len(tools)} tool invocations")
```

#### Streaming Parser (Python)

```python
import json
import time

def tail_jsonl(filepath, callback):
    """Tail a JSONL file and call callback for each new line."""
    with open(filepath, 'r') as f:
        # Go to end of file
        f.seek(0, 2)

        while True:
            line = f.readline()
            if line:
                try:
                    event = json.loads(line)
                    callback(event)
                except json.JSONDecodeError:
                    pass
            else:
                time.sleep(0.1)

# Usage
def on_event(event):
    if event.get('type') == 'assistant':
        print(f"Assistant: {event['message']['content']}")

tail_jsonl('agents/7b25b54d/sdlc_planner/raw_output.jsonl', on_event)
```

## Filesystem vs WebSocket Approaches

### Filesystem Approach (Primary)

**How it works**: Directly read files from the `agents/` directory.

**Pros**:

- ✅ Simple - no server required
- ✅ Reliable - filesystem is always available
- ✅ Persistent - full execution history preserved
- ✅ Complete - every detail captured
- ✅ Works offline - no network dependencies
- ✅ Standard tools - `tail`, `grep`, `jq`, etc.

**Cons**:

- ❌ Polling required for real-time updates
- ❌ No push notifications
- ❌ Slightly higher latency for updates

**Best for**:

- Debugging workflow issues
- Historical analysis
- Simple monitoring scripts
- Command-line tools
- Offline analysis
- Any single-client scenario

### WebSocket Approach (Secondary)

**How it works**: Workflows POST updates to WebSocket server → Server broadcasts
to connected clients.

**Architecture**:

```
Workflow Process → HTTP POST → WebSocket Server → Broadcast → Connected Clients
                   (localhost:8500/api/workflow-updates)
```

**Pros**:

- ✅ Real-time push notifications
- ✅ Supports multiple concurrent clients
- ✅ Lower latency for updates
- ✅ Efficient for dashboards

**Cons**:

- ❌ Requires WebSocket server running
- ❌ More complex setup
- ❌ Transient (no persistence)
- ❌ Network dependency
- ❌ Can miss updates if disconnected

**Best for**:

- Live dashboards
- Frontend applications
- Multi-client scenarios
- Real-time UI updates

### Decision Tree

```
Do you need real-time push notifications for a dashboard?
├─ YES → Use WebSocket + Filesystem fallback
│         (WebSocket for live updates, Filesystem for history/missed updates)
│
└─ NO → Use Filesystem approach
         (Simpler, more reliable, sufficient for most needs)

Is the WebSocket server running?
├─ NO → Filesystem is your only option (and that's fine!)
└─ YES → Consider WebSocket for real-time features

Are you building a CLI tool or script?
└─ Use Filesystem (simpler, no dependencies)

Are you building a web application?
├─ Single user → Filesystem with periodic refresh
└─ Multiple users → WebSocket for efficiency
```

## Filesystem Monitoring Patterns

### Pattern 1: Check Workflow Status

**Use case**: "Is this workflow still running?"

```bash
# Check if workflow is complete
cd /path/to/AgenticKanban
cat agents/7b25b54d/adw_state.json | jq '.completed'

# Get workflow metadata
cat agents/7b25b54d/adw_state.json | jq '{
  adw_id,
  issue_number,
  branch_name,
  completed
}'
```

### Pattern 2: Monitor Live Execution

**Use case**: "What is the agent doing right now?"

```bash
# Watch live output from planning phase
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl

# Parse and display only assistant text
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text'

# Monitor tool usage in real-time
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | "\(.name): \(.input)"'
```

### Pattern 3: Debug Workflow Failures

**Use case**: "Why did this workflow fail?"

```bash
# Check which phases completed
ls -la agents/7b25b54d/

# Examine last few events in failing phase
tail -20 agents/7b25b54d/sdlc_implementor/raw_output.jsonl | jq .

# Search for errors
grep -i error agents/7b25b54d/sdlc_implementor/raw_output.jsonl

# Find failed tool invocations
cat agents/7b25b54d/sdlc_implementor/raw_output.jsonl | \
  jq 'select(.type == "tool_result" and .error != null)'
```

### Pattern 4: File Watching (Efficient)

Instead of polling with `tail`, use filesystem notifications:

#### Using `fswatch` (macOS)

```bash
# Install fswatch
brew install fswatch

# Watch for changes
fswatch -0 agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  while read -d "" event; do
    tail -1 "$event" | jq .
  done
```

#### Using `inotifywait` (Linux)

```bash
# Install inotify-tools
sudo apt-get install inotify-tools

# Watch for modifications
inotifywait -m -e modify agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  while read path action file; do
    tail -1 "$path$file" | jq .
  done
```

#### Python with watchdog

```python
import json
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class JSONLHandler(FileSystemEventHandler):
    def __init__(self, filepath):
        self.filepath = filepath
        self.file = open(filepath, 'r')
        self.file.seek(0, 2)  # Go to end

    def on_modified(self, event):
        if event.src_path == self.filepath:
            # Read new lines
            for line in self.file:
                if line.strip():
                    try:
                        event_data = json.loads(line)
                        self.handle_event(event_data)
                    except json.JSONDecodeError:
                        pass

    def handle_event(self, event_data):
        """Override this to handle events."""
        print(f"Event: {event_data.get('type')}")

# Usage
handler = JSONLHandler('agents/7b25b54d/sdlc_planner/raw_output.jsonl')
observer = Observer()
observer.schedule(handler, path='agents/7b25b54d/sdlc_planner', recursive=False)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

### Pattern 5: Historical Analysis

**Use case**: "What did the agent do during the entire workflow?"

```bash
# Generate summary report
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | jq -s '
{
  total_events: length,
  tool_uses: [.[] | select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name] | group_by(.) | map({tool: .[0], count: length}),
  session_duration: (last.timestamp - first.timestamp)
}'

# Extract conversation as text
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant" or .type == "user") |
    if .type == "assistant" then
      "Assistant: " + (.message.content[]? | select(.type == "text") | .text)
    else
      "User: " + .message
    end'
```

## WebSocket Monitoring Patterns

### Pattern 1: WebSocket Client Architecture

The WebSocket server runs on port 8500 (configurable via `WEBSOCKET_PORT`):

```
ws://localhost:8500/ws/trigger
```

### Pattern 2: Connecting to WebSocket

#### JavaScript (Frontend)

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:8500/ws/trigger");

// Handle connection events
ws.onopen = () => {
  console.log("Connected to ADW WebSocket");

  // Optional: Register session for deduplication
  ws.send(
    JSON.stringify({
      type: "register_session",
      data: {
        session_id: "unique-client-id",
        client_info: {
          user_agent: navigator.userAgent,
          page: window.location.href,
        },
      },
    })
  );
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "status_update":
      handleStatusUpdate(message.data);
      break;
    case "workflow_log":
      handleWorkflowLog(message.data);
      break;
    case "error":
      handleError(message.data);
      break;
  }
};

// Handle status updates
function handleStatusUpdate(data) {
  console.log(`Workflow ${data.workflow_name}: ${data.status}`);
  console.log(`Message: ${data.message}`);
  if (data.progress_percent !== null) {
    console.log(`Progress: ${data.progress_percent}%`);
  }
}

// Handle workflow logs
function handleWorkflowLog(data) {
  console.log(`[${data.level}] ${data.workflow_name}: ${data.message}`);
}
```

#### Python Client

```python
import asyncio
import json
import websockets

async def monitor_workflows():
    uri = "ws://localhost:8500/ws/trigger"

    async with websockets.connect(uri) as websocket:
        print("Connected to ADW WebSocket")

        # Send ping periodically to keep connection alive
        async def send_ping():
            while True:
                await asyncio.sleep(30)
                await websocket.send(json.dumps({
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }))

        # Start ping task
        ping_task = asyncio.create_task(send_ping())

        try:
            async for message in websocket:
                data = json.loads(message)
                message_type = data.get('type')

                if message_type == 'status_update':
                    payload = data['data']
                    print(f"Status: {payload['workflow_name']} - {payload['status']}")
                    print(f"  {payload['message']}")

                elif message_type == 'workflow_log':
                    payload = data['data']
                    print(f"[{payload['level']}] {payload['message']}")

                elif message_type == 'pong':
                    print(f"Pong received")

        finally:
            ping_task.cancel()

# Run
asyncio.run(monitor_workflows())
```

### Pattern 3: Triggering Workflows via WebSocket

```javascript
// Trigger a workflow
ws.send(
  JSON.stringify({
    type: "trigger_workflow",
    data: {
      workflow_type: "adw_plan_iso",
      issue_number: "42",
      model_set: "base",
      issue_type: "feature", // or 'bug', 'chore', 'patch'
    },
  })
);

// Handle response
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "trigger_response") {
    const response = message.data;
    console.log(`Workflow triggered: ${response.adw_id}`);
    console.log(`Status: ${response.status}`);
    console.log(`Logs: ${response.logs_path}`);
  }
};
```

### Pattern 4: Message Types

The WebSocket server supports these message types:

#### Client → Server

1. **trigger_workflow**: Trigger a new workflow
2. **ping**: Keepalive ping
3. **register_session**: Register client session for deduplication
4. **ticket_notification**: Send ticket notifications from Kanban

#### Server → Client

1. **trigger_response**: Response to trigger request
2. **status_update**: Workflow status update
3. **workflow_log**: Log message from workflow
4. **pong**: Response to ping
5. **error**: Error message

### Pattern 5: Hybrid Approach (Recommended)

Use WebSocket for live updates + Filesystem for reliability:

```javascript
class WorkflowMonitor {
  constructor(adwId) {
    this.adwId = adwId;
    this.ws = null;
    this.reconnectTimer = null;
    this.pollTimer = null;
  }

  // Start monitoring with WebSocket
  start() {
    this.connectWebSocket();

    // Fallback: Poll filesystem every 5 seconds
    this.pollTimer = setInterval(() => {
      this.checkFilesystem();
    }, 5000);
  }

  connectWebSocket() {
    this.ws = new WebSocket("ws://localhost:8500/ws/trigger");

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      // Sync with filesystem on connect
      this.checkFilesystem();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.data?.adw_id === this.adwId) {
        this.handleUpdate(message);
      }
    };

    this.ws.onerror = () => {
      console.log("WebSocket error, falling back to filesystem");
    };

    this.ws.onclose = () => {
      console.log("WebSocket closed, reconnecting...");
      this.reconnectTimer = setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    };
  }

  async checkFilesystem() {
    // Read adw_state.json via HTTP API or file read
    const state = await fetch(`http://localhost:8500/api/adws/${this.adwId}`)
      .then((r) => r.json())
      .catch(() => null);

    if (state) {
      this.handleFilesystemState(state);
    }
  }

  handleUpdate(message) {
    // Handle real-time WebSocket update
    console.log("Real-time update:", message);
  }

  handleFilesystemState(state) {
    // Handle filesystem state
    console.log("Filesystem state:", state);
  }

  stop() {
    if (this.ws) this.ws.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}

// Usage
const monitor = new WorkflowMonitor("7b25b54d");
monitor.start();
```

## Use Case Examples

### Use Case 1: Check Workflow Status

**Goal**: Quickly check if a workflow is complete and what it did.

**Solution**: Read `adw_state.json` directly (filesystem)

```bash
# Get basic status
jq '{adw_id, issue_number, completed}' agents/7b25b54d/adw_state.json

# Output:
# {
#   "adw_id": "7b25b54d",
#   "issue_number": "31",
#   "completed": false
# }
```

**Why filesystem**: One file read, instant result, no server needed.

### Use Case 2: Debug Workflow Failure

**Goal**: Find out why a workflow failed during implementation.

**Solution**: Examine `raw_output.jsonl` in the failing phase (filesystem)

```bash
# Find the failing phase
ls agents/7b25b54d/

# Check last 50 lines of implementor logs
tail -50 agents/7b25b54d/sdlc_implementor/raw_output.jsonl | jq .

# Search for errors
grep -i 'error\|fail\|exception' agents/7b25b54d/sdlc_implementor/raw_output.jsonl

# Extract error details
cat agents/7b25b54d/sdlc_implementor/raw_output.jsonl | \
  jq 'select(.error != null or (.message.content[]?.text? | contains("error")))'
```

**Why filesystem**: Complete history available, can search/filter, no
dependencies.

### Use Case 3: Monitor Live Execution

**Goal**: Watch what the agent is doing in real-time during planning.

**Solution**: Tail `raw_output.jsonl` with `jq` filtering (filesystem)

```bash
# Watch all events
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl | jq .

# Watch only assistant text
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text'

# Watch tool usage
tail -f agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | "\(.name)(\(.input | keys | join(", ")))"'
```

**Why filesystem**: Simple, works anywhere, no server required. Latency <1
second is fine for humans.

### Use Case 4: Build a Dashboard

**Goal**: Create a web dashboard showing all active workflows with live updates.

**Solution**: WebSocket for live updates + REST API for history

```javascript
// Connect to WebSocket for live updates
const ws = new WebSocket("ws://localhost:8500/ws/trigger");

// Get initial list of workflows
async function loadWorkflows() {
  const response = await fetch("http://localhost:8500/api/adws/list");
  const data = await response.json();
  return data.adws;
}

// Display workflows
async function initDashboard() {
  const workflows = await loadWorkflows();

  workflows.forEach((workflow) => {
    displayWorkflow(workflow);
  });

  // Listen for live updates
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "status_update") {
      updateWorkflowStatus(message.data);
    } else if (message.type === "workflow_log") {
      appendWorkflowLog(message.data);
    }
  };
}

initDashboard();
```

**Why WebSocket**: Multiple users need real-time updates, push is more efficient
than polling.

### Use Case 5: Historical Analysis

**Goal**: Analyze tool usage patterns across multiple workflows.

**Solution**: Parse all JSONL files with Python (filesystem)

```python
import json
import glob
from collections import Counter

def analyze_tool_usage():
    tool_counts = Counter()

    # Find all raw_output.jsonl files
    for jsonl_file in glob.glob('agents/*/*/raw_output.jsonl'):
        with open(jsonl_file, 'r') as f:
            for line in f:
                try:
                    event = json.loads(line)
                    if event.get('type') == 'assistant':
                        for item in event.get('message', {}).get('content', []):
                            if item.get('type') == 'tool_use':
                                tool_counts[item['name']] += 1
                except json.JSONDecodeError:
                    pass

    # Print results
    print("Tool Usage Statistics:")
    for tool, count in tool_counts.most_common():
        print(f"  {tool}: {count}")

analyze_tool_usage()
```

**Why filesystem**: Historical data only exists in files, complete analysis
requires all data.

### Use Case 6: Integration with CI/CD

**Goal**: Trigger workflow from Jenkins/GitHub Actions and wait for completion.

**Solution**: Trigger via WebSocket, poll filesystem for completion

```python
import requests
import time
import json

def trigger_and_wait(issue_number, workflow_type='adw_plan_build_test_iso'):
    """Trigger workflow and wait for completion."""

    # Trigger via HTTP POST (simpler than WebSocket for CI)
    # Note: You'd typically use WebSocket, but HTTP is simpler for one-shot triggers

    # Alternative: Use WebSocket client library
    import websockets
    import asyncio

    async def trigger():
        uri = "ws://localhost:8500/ws/trigger"
        async with websockets.connect(uri) as ws:
            # Send trigger request
            await ws.send(json.dumps({
                'type': 'trigger_workflow',
                'data': {
                    'workflow_type': workflow_type,
                    'issue_number': issue_number,
                    'model_set': 'base'
                }
            }))

            # Wait for response
            response = await ws.recv()
            data = json.loads(response)

            if data['type'] == 'trigger_response':
                return data['data']['adw_id']

    # Trigger workflow
    adw_id = asyncio.run(trigger())
    print(f"Triggered workflow: {adw_id}")

    # Poll filesystem for completion
    while True:
        try:
            with open(f'agents/{adw_id}/adw_state.json', 'r') as f:
                state = json.load(f)

            if state.get('completed'):
                print(f"Workflow {adw_id} completed!")
                return True

            print(f"Workflow {adw_id} still running...")
            time.sleep(10)

        except FileNotFoundError:
            print(f"Waiting for workflow {adw_id} to initialize...")
            time.sleep(5)

# Usage in CI/CD
trigger_and_wait('42', 'adw_plan_build_test_iso')
```

**Why hybrid**: WebSocket for triggering (immediate), filesystem for status
polling (reliable).

## Best Practices

### 1. Always Start with Filesystem

**Rule**: Use filesystem monitoring unless you have a specific need for
WebSocket.

**Rationale**:

- Simpler implementation
- No server dependencies
- More reliable
- Complete historical data

### 2. WebSocket is Optional

**Rule**: Design your system to work without WebSocket. Treat it as an
enhancement.

**Implementation**:

```javascript
// Good: Graceful degradation
async function getWorkflowStatus(adwId) {
  // Try WebSocket if connected
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    return await this.requestViaWebSocket(adwId);
  }

  // Fallback to filesystem/HTTP API
  return await this.requestViaHTTP(adwId);
}
```

### 3. Use Efficient File Watching

**Rule**: Use filesystem notifications (inotify/fswatch) instead of polling
loops.

**Bad**:

```bash
# Wasteful polling
while true; do
  cat agents/7b25b54d/adw_state.json
  sleep 1
done
```

**Good**:

```bash
# Event-driven
fswatch agents/7b25b54d/adw_state.json | \
  while read event; do
    cat "$event"
  done
```

### 4. Parse JSONL Incrementally

**Rule**: For large files, use streaming parsers instead of loading entire file.

**Bad**:

```python
# Loads entire file into memory
with open('raw_output.jsonl', 'r') as f:
    content = f.read()
    for line in content.split('\n'):
        process(json.loads(line))
```

**Good**:

```python
# Streams line by line
with open('raw_output.jsonl', 'r') as f:
    for line in f:
        if line.strip():
            process(json.loads(line))
```

### 5. Always Check adw_state.json First

**Rule**: Start debugging by reading the state file to understand context.

**Workflow**:

```bash
# 1. Get overview
cat agents/7b25b54d/adw_state.json | jq .

# 2. Identify which phases ran
ls agents/7b25b54d/

# 3. Examine specific phase logs
tail agents/7b25b54d/sdlc_implementor/raw_output.jsonl
```

### 6. WebSocket Efficiency Tips

**Rule**: When using WebSocket, implement these optimizations:

1. **Session deduplication**: Prevent duplicate messages when multiple tabs open
2. **Reconnection logic**: Handle disconnections gracefully
3. **Keepalive pings**: Prevent connection timeouts
4. **Rate limiting**: Prevent overwhelming the server

```javascript
class RobustWebSocketClient {
  constructor(url) {
    this.url = url;
    this.sessionId = this.generateSessionId();
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.pingInterval = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("Connected");
      this.reconnectDelay = 1000;

      // Register session for deduplication
      this.ws.send(
        JSON.stringify({
          type: "register_session",
          data: {
            session_id: this.sessionId,
            client_info: { page: window.location.href },
          },
        })
      );

      // Start keepalive
      this.startPing();
    };

    this.ws.onclose = () => {
      console.log("Disconnected, reconnecting...");
      this.stopPing();

      setTimeout(() => {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        );
        this.connect();
      }, this.reconnectDelay);
    };
  }

  startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "ping",
            timestamp: new Date().toISOString(),
          })
        );
      }
    }, this.pingInterval);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 7. Error Handling

**Rule**: Always handle missing files and malformed JSON gracefully.

```python
def safe_read_state(adw_id):
    """Safely read ADW state with error handling."""
    try:
        filepath = f'agents/{adw_id}/adw_state.json'
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ADW {adw_id} not found")
        return None
    except json.JSONDecodeError:
        print(f"Invalid JSON in state file for {adw_id}")
        return None
    except Exception as e:
        print(f"Error reading state: {e}")
        return None
```

### 8. Performance Considerations

**Guidelines**:

1. **For single workflow monitoring**: Filesystem with `tail -f` is sufficient
2. **For 10-50 concurrent workflows**: Filesystem with file watchers
3. **For 50+ concurrent workflows**: WebSocket becomes more efficient
4. **For dashboards with multiple users**: Always use WebSocket

### 9. Security Considerations

**Rule**: When exposing WebSocket server, implement proper authentication.

```python
# In trigger_websocket.py, add authentication
async def websocket_endpoint(websocket: WebSocket):
    # Validate authentication token
    token = websocket.query_params.get('token')
    if not validate_token(token):
        await websocket.close(code=4401, reason="Unauthorized")
        return

    await manager.connect(websocket)
    # ... rest of implementation
```

### 10. Logging Best Practices

**Rule**: When building tools, log what you're doing for debugging.

```python
import logging

logger = logging.getLogger('workflow_monitor')
logger.setLevel(logging.INFO)

def monitor_workflow(adw_id):
    logger.info(f"Starting monitoring for workflow {adw_id}")

    try:
        state = read_state(adw_id)
        logger.info(f"Current state: {state.get('completed')}")
    except Exception as e:
        logger.error(f"Failed to monitor workflow: {e}")
```

## Troubleshooting

### Problem: Can't find agents directory

**Symptom**: `agents/` directory doesn't exist

**Solution**:

```bash
# Check if you're in the right directory
pwd
# Should be in main workspace: /path/to/AgenticKanban

# Not in a worktree
cd /path/to/AgenticKanban
ls agents/
```

**Cause**: The agents directory is only in the main workspace, not in worktrees.

### Problem: Empty raw_output.jsonl

**Symptom**: File exists but has no content

**Possible causes**:

1. Workflow just started (hasn't written anything yet)
2. Workflow failed during initialization
3. File permissions issue

**Solution**:

```bash
# Check if workflow is running
ps aux | grep claude-code

# Check file permissions
ls -la agents/7b25b54d/sdlc_planner/raw_output.jsonl

# Wait a few seconds for initialization
sleep 5 && cat agents/7b25b54d/sdlc_planner/raw_output.jsonl
```

### Problem: WebSocket connection refused

**Symptom**: `Error: connect ECONNREFUSED localhost:8500`

**Solution**:

```bash
# Check if WebSocket server is running
curl http://localhost:8500/health

# If not running, start it
cd /path/to/AgenticKanban
uv run adws/adw_triggers/trigger_websocket.py

# Check the port
echo $WEBSOCKET_PORT
```

### Problem: Malformed JSON in JSONL

**Symptom**: `json.JSONDecodeError`

**Cause**: File might be corrupted or still being written

**Solution**:

```bash
# Validate each line
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  while IFS= read -r line; do
    echo "$line" | jq . >/dev/null 2>&1 || echo "Invalid: $line"
  done

# Skip invalid lines when parsing
cat agents/7b25b54d/sdlc_planner/raw_output.jsonl | \
  jq -R 'fromjson? | select(. != null)'
```

### Problem: Missing workflow phases

**Symptom**: Expected directory like `sdlc_implementor/` doesn't exist

**Cause**: Phase hasn't started yet or was skipped

**Solution**:

```bash
# Check which phases have run
ls agents/7b25b54d/

# Check state to see what's configured
cat agents/7b25b54d/adw_state.json | jq '.all_adws'

# Check if workflow is complete
cat agents/7b25b54d/adw_state.json | jq '.completed'
```

### Problem: Stale data when monitoring

**Symptom**: File hasn't updated in a while

**Cause**: Workflow might have crashed or completed

**Solution**:

```bash
# Check if workflow process is still running
ps aux | grep "7b25b54d"

# Check completion status
cat agents/7b25b54d/adw_state.json | jq '.completed'

# Check system logs
cat agents/7b25b54d/ops/execution.log
```

### Problem: Permission denied reading files

**Symptom**: `Permission denied` when accessing agents directory

**Solution**:

```bash
# Check permissions
ls -la agents/7b25b54d/

# Fix permissions if needed (be careful!)
chmod -R u+r agents/7b25b54d/

# Run as correct user
whoami
# Should match the user that runs ADW workflows
```

## Summary

### Quick Reference

| Task                | Method     | Command                                           |
| ------------------- | ---------- | ------------------------------------------------- |
| Check status        | Filesystem | `jq . agents/{id}/adw_state.json`                 |
| Monitor live        | Filesystem | `tail -f agents/{id}/*/raw_output.jsonl`          |
| Debug failure       | Filesystem | `tail -50 agents/{id}/*/raw_output.jsonl \| jq .` |
| Build dashboard     | WebSocket  | `ws://localhost:8500/ws/trigger`                  |
| Historical analysis | Filesystem | Parse all JSONL files with script                 |
| CI/CD integration   | Hybrid     | WebSocket trigger + filesystem polling            |

### Key Takeaways

1. **Filesystem is primary**: Always available, reliable, complete history
2. **WebSocket is secondary**: Optional layer for real-time push notifications
3. **Use the right tool**: Filesystem for debugging/scripts, WebSocket for
   dashboards
4. **JSONL is powerful**: Streaming, incremental parsing, works with standard
   tools
5. **Start simple**: Use `tail -f` and `jq` before building complex solutions
6. **Hybrid approach**: Combine both for robust production applications

### Next Steps

1. Try the basic commands in this guide
2. Build a simple monitoring script using filesystem
3. If needed, integrate WebSocket for real-time features
4. Share patterns that work well for your use case

---

**Remember**: The simplest solution that works is the best solution. Start with
filesystem monitoring and only add WebSocket complexity if you truly need
real-time push notifications.
