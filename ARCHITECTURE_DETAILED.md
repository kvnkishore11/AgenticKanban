# AgenticKanban Architecture and Integration Overview

## Executive Summary

AgenticKanban is a three-layer, real-time collaborative development workflow management system that integrates a React frontend, FastAPI backend, and Python-based ADW (Agent-Driven Workflow) automation. The system uses WebSocket for real-time communication, Zustand for state management, and git worktrees for isolated task execution.

---

## 1. CURRENT WEBSOCKET IMPLEMENTATION & STREAMING PATTERNS

### 1.1 WebSocket Architecture

**Frontend WebSocket Service** (`src/services/websocket/websocketService.js`):
- **Class**: `WebSocketService` (singleton pattern)
- **Port Configuration**: Uses `VITE_BACKEND_URL` environment variable
- **Path**: `/ws/trigger` endpoint for workflow triggers
- **Connection Management**:
  - Auto-reconnect with exponential backoff (1s → 30s max)
  - Max 20 reconnection attempts
  - Jitter-based delay to prevent thundering herd
  - Message queuing (max 100 queued messages)
  - Heartbeat mechanism (15-second interval)

**Backend WebSocket Manager** (`server/core/websocket_manager.py`):
- **Class**: `WebSocketManager` (manages multiple client connections)
- **Broadcast Methods**:
  - `broadcast_agent_log()`: Agent execution logs
  - `broadcast_system_log()`: System-level messages
  - `broadcast_agent_summary_update()`: Progress and status
  - `broadcast_chat_stream()`: Real-time output streaming
  - `ping_all()`: Connection health checks

### 1.2 Message Flow Patterns

**Trigger Request Message**:
```javascript
{
  type: 'trigger_workflow',
  data: {
    workflow_type: 'adw_plan_build_test_iso',
    adw_id: 'optional_custom_id',
    issue_number: 123,
    issue_type: 'feature',
    issue_json: {
      title: 'Task Title',
      body: 'Task Description',
      number: 1,
      images: [] // Support for uploaded images
    },
    model_set: 'base' | 'heavy',
    trigger_reason: 'Kanban task'
  }
}
```

**Status Update Message**:
```javascript
{
  type: 'status_update',
  data: {
    adw_id: 'workflow_id',
    status: 'started' | 'in_progress' | 'completed' | 'failed',
    progress_percent: 25,
    current_step: 'Stage: Build',
    message: 'Status update message',
    timestamp: '2025-01-01T12:00:00Z',
    workflow_name: 'adw_plan_build_iso'
  }
}
```

**Workflow Log Entry**:
```javascript
{
  type: 'workflow_log',
  data: {
    adw_id: 'workflow_id',
    timestamp: '2025-01-01T12:00:00Z',
    level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG',
    message: 'Log message',
    event_category: 'hook' | 'response' | 'status',
    event_type: 'PreToolUse' | 'ToolUseBlock' | 'TextBlock' | 'ThinkingBlock',
    summary: 'Optional 15-word summary',
    current_step: 'Stage: Plan',
    payload: {
      tool_names: ['tool1', 'tool2'],
      parameters: {},
      file_changes: []
    }
  }
}
```

**Stage Transition Event**:
```javascript
{
  type: 'stage_transition',
  data: {
    adw_id: 'workflow_id',
    from_stage: 'plan',
    to_stage: 'build',
    workflow_name: 'adw_plan_build_test_iso',
    workflow_complete: false,
    timestamp: '2025-01-01T12:00:00Z'
  }
}
```

### 1.3 Event Listener Setup

Frontend registers listeners in `kanbanStore.js`:
```javascript
// Available events:
websocketService.on('connect', handler)
websocketService.on('disconnect', handler)
websocketService.on('trigger_response', handler)
websocketService.on('status_update', handler)
websocketService.on('error', handler)
websocketService.on('pong', handler)
websocketService.on('workflow_log', handler)
websocketService.on('stage_transition', handler)
websocketService.on('reconnecting', handler)
```

### 1.4 Message Deduplication

The store implements message fingerprinting to prevent duplicate processing:
- **Fingerprint Components**: `messageType:adw_id:timestamp:status:level:progress:step:message`
- **TTL**: 5 minutes for cached fingerprints
- **Cache Size**: Max 1000 fingerprints with 20% cleanup when exceeded
- **Smart Reprocessing**: Allows reprocessing if task state differs from message state

---

## 2. CURRENT UI STRUCTURE & COMPONENTS

### 2.1 Component Hierarchy

```
App.jsx (Main Application)
├── Header
│   ├── Project Selector / Name
│   ├── Action Buttons (New Task, Commands, Completed)
│   └── Settings Button
├── Error Display Banner
├── Loading Overlay
├── Main Content Area
│   ├── ProjectSelector (when no project selected)
│   └── When Project Selected:
│       ├── TaskInput (floating form)
│       └── KanbanBoard
│           ├── Backlog Column
│           ├── SDLC Pipeline Columns (Plan → Build → Test → Review → Document)
│           ├── Ready to Merge Column
│           └── Errored Column
├── Modals
│   ├── CommandsPalette (Keyboard shortcuts)
│   ├── SettingsModal (Configuration)
│   └── CompletedTasksModal (Completed tasks view)
└── Footer

KanbanBoard.jsx
├── Stage Groups
│   ├── Backlog Stage Column
│   ├── SDLC Stages (5 columns)
│   ├── Ready to Merge Column
│   └── Errored Column
└── Per Stage:
    ├── Stage Header with Icon and Count
    └── Task Cards
        ├── KanbanCard (basic view)
        │   ├── Title and Description Preview
        │   ├── Timestamps (created, updated)
        │   ├── Pipeline Name Display
        │   ├── Status Indicators
        │   ├── Progress Bar
        │   ├── Action Menu (Edit, Delete, Expand)
        │   └── Workflow Status Badge
        └── CardExpandModal (detailed view)
            ├── Full Task Details
            ├── Workflow Status Section
            ├── Log Viewers
            │   ├── StageLogsViewer
            │   ├── WorkflowLogViewer
            │   └── DetailedLogEntry (with syntax highlighting)
            ├── Agent State Viewer
            ├── Stage Progression Viewer
            └── Action Buttons
```

### 2.2 Key Components

**TaskInput.jsx**:
- Form for creating new tasks
- Fields: Title, Description, Work Item Type, Queued Stages, Images
- Validation: Description required, stages required
- Supports image upload via drag-and-drop
- Auto-generates ADW configurations

**KanbanCard.jsx**:
- Compact task display
- Status indicators (paused, running, completed, errored)
- Quick actions menu
- Workflow trigger capability
- Pipeline name formatting (dynamic)
- Expand to detailed modal

**StageLogsViewer.jsx**:
- Fetches stage-specific logs from `/api/stage-logs/{adw_id}/{stage}`
- Handles both streaming and result files
- Displays log structure and folder information

**WorkflowLogViewer.jsx**:
- Real-time log streaming from WebSocket
- Filters by ADW ID and stage
- Keyword search and filtering
- Log level indicators

**DetailedLogEntry.jsx**:
- Renders individual log entries with full structure
- Shows session ID, model, token usage
- Displays tool calls and parameters
- Syntax highlighting for code blocks

**AgentStateViewer.jsx**:
- Fetches from `/api/agent-state/{adw_id}`
- Displays agent metadata and configuration
- Shows execution context

### 2.3 Modal System

**CardExpandModal**:
- Portal-based overlay
- Multiple tabs for different views
- Handles both task and workflow state
- Streaming log updates

**TaskEditModal**:
- Edit task properties
- Inline validation
- Updates persisted through store

**SettingsModal**:
- WebSocket configuration
- Project notification settings
- Data export/import
- Port configuration for project discovery

---

## 3. CURRENT FILE HANDLING & NAVIGATION

### 3.1 File System Paths

**ADW Output Structure**:
```
agents/
├── {adw_id}/
│   ├── sdlc_planner/          # Plan stage output
│   │   ├── logs.jsonl         # Streaming logs
│   │   └── output.md          # Result file
│   ├── sdlc_implementor/       # Build stage output
│   │   ├── logs.jsonl
│   │   └── output.md
│   ├── tester/                # Test stage output
│   │   ├── logs.jsonl
│   │   └── output.md
│   ├── reviewer/              # Review stage output
│   │   ├── logs.jsonl
│   │   └── output.md
│   └── documenter/            # Document stage output
│       ├── logs.jsonl
│       └── output.md
```

### 3.2 Backend File APIs

**Stage Logs API** (`server/api/stage_logs.py`):
```python
GET /api/stage-logs/{adw_id}/{stage}

Response:
{
  "adw_id": "workflow_id",
  "stage": "plan",
  "logs": [LogEntry, ...],
  "result": {"content": "...", "path": "..."},
  "stage_folder": "/path/to/sdlc_planner",
  "has_streaming_logs": true,
  "has_result": true,
  "error": null
}
```

**Stage to Folder Mapping**:
```python
{
  "plan": ["sdlc_planner", "adw_plan_iso", "planner"],
  "build": ["sdlc_implementor", "adw_build_iso", "implementor", "sdlc_implementor_committer"],
  "test": ["tester", "adw_test_iso"],
  "review": ["reviewer", "adw_review_iso"],
  "document": ["documenter", "adw_document_iso", "ops"]
}
```

**Log Entry Structure**:
```python
class LogEntry:
  timestamp: str
  level: str  # INFO, SUCCESS, WARNING, ERROR, DEBUG
  message: str
  current_step: str
  event_category: str  # hook, response, status
  event_type: str  # PreToolUse, ToolUseBlock, TextBlock, ThinkingBlock
  summary: str  # 15-word AI summary
  payload: dict  # tool_names, parameters, file_changes
  session_id: str  # Agent session identifier
  model: str  # Model used
  tool_name: str  # Current tool being called
  tool_input: dict  # Tool parameters
  usage: dict  # Token usage
  stop_reason: str  # Reason for message stop
```

### 3.3 Frontend File Operations

**Store-based Fetching**:
```javascript
// Fetches stage logs
await store.fetchStageLogsForTask(taskId, adwId, stage)

// Returns cached logs
store.getStageLogsForTask(taskId, stage)

// Fetches agent state
await store.fetchAgentState(taskId, adwId)

// Returns cached agent state
store.getAgentState(taskId)
```

**Plan File Access**:
```javascript
// Get workflow plan file path
const planPath = store.getWorkflowPlanForTask(taskId)
// Returns: response.plan_file from trigger response
```

---

## 4. CURRENT SESSION TRACKING & OUTPUT MANAGEMENT

### 4.1 Session Tracking

**Kanban Store Session State**:
```javascript
// Connection tracking
websocketConnected: boolean
websocketConnecting: boolean
websocketError: string | null
connectionId: string  // Unique per connection

// Active workflow tracking
activeWorkflows: Map<adw_id, {
  taskId: number,
  workflowName: string,
  status: 'started' | 'in_progress' | 'completed' | 'failed',
  logsPath: string,
  startedAt: ISO8601,
  updatedAt: ISO8601,
  message: string,
  progress: number,
  currentStep: string
}>
```

**WebSocket Service Metrics**:
```javascript
connectionMetrics: {
  messageSuccessCount: number,
  messageFailureCount: number,
  lastLatency: number | null,
  connectionStartTime: number | null
}

getConnectionQuality(): {
  successRate: number,
  totalMessages: number,
  lastLatency: number | null,
  uptime: number,
  queueSize: number
}
```

### 4.2 Output Management

**Workflow Output Tracking**:
```javascript
// Store maintains per-task workflow data
taskWorkflowLogs: {
  [taskId]: [
    {
      id: string,
      adw_id: string,
      timestamp: ISO8601,
      level: string,
      message: string,
      event_category: string,
      event_type: string,
      summary: string,
      current_step: string,
      payload: object
    },
    ... (max 500 logs per task)
  ]
}

taskWorkflowProgress: {
  [taskId]: {
    status: string,
    progress: number,
    currentStep: string,
    message: string,
    timestamp: ISO8601,
    updatedAt: ISO8601
  }
}

taskWorkflowMetadata: {
  [taskId]: {
    adw_id: string,
    workflow_name: string,
    logs_path: string,
    plan_file: string,
    status: string,
    triggeredAt: ISO8601,
    updatedAt: ISO8601
  }
}

taskStageLogs: {
  [taskId]: {
    [stage]: {
      logs: LogEntry[],
      result: object | null,
      loading: boolean,
      error: string | null,
      stageFolder: string,
      hasStreamingLogs: boolean,
      hasResult: boolean,
      fetchedAt: ISO8601
    }
  }
}
```

### 4.3 Notification and History

**Project Notification System**:
```javascript
projectNotificationEnabled: boolean

projectNotificationConfigs: {
  [projectId]: {
    enabled: boolean,
    host: string,  // 'localhost'
    port: number,
    autoDiscover: boolean,
    lastUpdated: ISO8601
  }
}

projectNotificationStatus: {
  [projectId]: {
    connected: boolean,
    connecting: boolean,
    error: string | null,
    lastUpdated: ISO8601
  }
}

notificationHistory: [
  {
    taskId: number,
    projectId: string,
    status: 'success' | 'failed',
    timestamp: ISO8601,
    message: string,
    error?: string
  },
  ... (max 100 entries)
]
```

### 4.4 Data Persistence

**Zustand Persist Configuration**:
```javascript
{
  name: 'agentic-kanban-storage',
  version: 1,
  partialize: (state) => ({
    selectedProject,
    availableProjects,
    tasks,
    taskIdCounter,
    projectNotificationEnabled,
    projectNotificationConfigs,
    notificationHistory,
    // Persists workflow state (survives page refresh)
    taskWorkflowProgress,
    taskWorkflowMetadata,
    taskWorkflowLogs
  })
}
```

**localStorage Keys**:
- `agentic-kanban-storage`: Main state (Zustand)
- `project-notification-configs`: Notification settings
- `notification-settings-backup`: Backup of settings
- `agentic-kanban-store`: Legacy backup format
- `backup`: Export data
- `notification-backup-{timestamp}`: Periodic backups

---

## 5. DATA FLOW ARCHITECTURE

### 5.1 Task Creation Flow

```
User Input (TaskInput.jsx)
    ↓
validateTask() [kanbanStore]
    ↓
createTask() [kanbanStore]
    ↓
adwCreationService.createAdwConfiguration()
    ↓ (generates ADW ID, workflow name, metadata)
    ↓
Store update: tasks[], taskIdCounter++
    ↓
sendProjectNotification() (async, doesn't block)
    ↓
✓ Task created and displayed in Backlog
```

### 5.2 Workflow Trigger Flow

```
User clicks "Trigger Workflow" [KanbanCard]
    ↓
triggerWorkflowForTask() [kanbanStore]
    ↓
websocketService.triggerWorkflowForTask()
    ↓
WebSocket message sent: { type: 'trigger_workflow', data: {...} }
    ↓
Backend receives → Creates ADW workflow
    ↓
Backend sends: { type: 'trigger_response', data: { adw_id, workflow_name, ... } }
    ↓
Frontend receives → handleTriggerResponse()
    ↓
Store update: trackActiveWorkflow(), updateTask() metadata
    ↓
Task auto-moves from backlog to initial stage
    ↓
✓ Workflow started, real-time updates via WebSocket
```

### 5.3 Real-Time Update Flow

```
ADW execution generates log events
    ↓
Backend WebSocket broadcasts (agent_log, agent_summary_update, chat_stream)
    ↓
Frontend WebSocket receives → handleMessage()
    ↓
Store handlers:
  - handleWorkflowStatusUpdate() → Updates progress, stage, metadata
  - handleWorkflowLog() → Appends to taskWorkflowLogs
  - handleStageTransition() → Moves task to new stage
    ↓
UI components re-render with new state
    ↓
✓ Real-time UI updates
```

### 5.4 Stage Log Fetching

```
User clicks "View Stage Logs" [CardExpandModal]
    ↓
fetchStageLogsForTask(taskId, adwId, stage) [kanbanStore]
    ↓
HTTP GET /api/stage-logs/{adw_id}/{stage}
    ↓
Backend:
  - Locates stage folder in agents/{adw_id}/
  - Reads logs.jsonl file
  - Parses result file (if exists)
  - Returns logs[] and result object
    ↓
Frontend stores in taskStageLogs[taskId][stage]
    ↓
StageLogsViewer renders logs and result
    ↓
✓ Stage-specific output displayed
```

---

## 6. INTEGRATION POINTS FOR NEW FEATURES

### 6.1 WebSocket Integration Points

**Adding New Event Types**:
1. Define message structure in backend broadcast method
2. Add event type to `eventListeners` in WebSocketService
3. Register handler in kanbanStore `initializeWebSocket()`
4. Implement handler function in store

**Example**:
```javascript
// In webSocketService
this.eventListeners.my_custom_event = []

// In kanbanStore
websocketService.on('my_custom_event', (data) => {
  get().handleMyCustomEvent(data)
})
```

### 6.2 File System Integration Points

**Adding New Output Types**:
1. Update STAGE_TO_FOLDERS in `server/api/stage_logs.py` if new stage/folder
2. Update LogEntry schema if new fields needed
3. Ensure logs.jsonl follows expected format
4. Frontend automatically displays via StageLogsViewer

**Adding New File APIs**:
1. Create new router in `server/api/` (e.g., `plans.py`, `artifacts.py`)
2. Register router in `server/server.py`
3. Call from appropriate component or store handler
4. Cache results in store if needed

### 6.3 UI Component Integration Points

**Adding New Modal**:
1. Create component in `src/components/`
2. Add state management in App.jsx or directly in component
3. Add to appropriate parent component or modals section
4. Wire up open/close handlers

**Adding New Card Action**:
1. Add button to KanbanCard action menu
2. Implement handler that calls store action
3. Add corresponding store method if needed
4. Handle loading/error states

### 6.4 Store Integration Points

**Adding New Workflow Handler**:
```javascript
handleMyWorkflowEvent: (data) => {
  // Process event data
  // Update relevant state
  // Move task if needed
  // Emit notifications
}

// Register in initializeWebSocket()
websocketService.on('my_event_type', (data) => {
  try {
    get().handleMyWorkflowEvent(data)
  } catch (error) {
    console.error('[WORKFLOW ERROR]', error)
  }
})
```

---

## 7. KEY ARCHITECTURAL PATTERNS

### 7.1 State Management Pattern
- **Zustand Store**: Single source of truth
- **Persist Middleware**: Auto-save to localStorage
- **Devtools**: Enable Redux DevTools
- **Deduplication**: Built-in message fingerprinting

### 7.2 Real-Time Update Pattern
- **WebSocket Events**: Type-based message routing
- **Store Handlers**: Event-specific processing
- **State Updates**: Atomic, immutable updates
- **UI Rerender**: Automatic via Zustand subscriptions

### 7.3 Error Handling Pattern
- **Network Errors**: Auto-reconnect with exponential backoff
- **Message Errors**: Logged but don't propagate to UI (prevent ErrorBoundary triggers)
- **Duplicate Messages**: Fingerprint-based deduplication
- **Failed Messages**: Queued for retry on reconnect

### 7.4 Performance Patterns
- **Log Limiting**: 500 logs max per task
- **History Limiting**: 100 status updates max
- **Notification History**: 100 entries max
- **Stage Logs Caching**: Fetched on-demand, cached
- **Agent State Caching**: Fetched on-demand, cached

---

## 8. ENVIRONMENT CONFIGURATION

**Frontend (.env or .env.local)**:
```
VITE_BACKEND_URL=http://localhost:8500
# WebSocket will connect to ws://{host}:{port}/ws/trigger
```

**Backend (.env)**:
```
BACKEND_HOST=0.0.0.0
BACKEND_PORT=9104
FRONTEND_PORT=9204
```

**Expected Services**:
- Frontend Dev: http://localhost:5173 (Vite) or http://localhost:9204 (custom)
- Backend HTTP API: http://localhost:9104
- WebSocket Server: ws://localhost:8500 (configured by VITE_BACKEND_URL)
- ADW Automation: Python-based, integrates with Claude Code CLI

---

## Summary Table

| Area | Technology | Key Files | Patterns |
|------|-----------|-----------|----------|
| **Frontend** | React 19, Zustand | `src/App.jsx`, `src/stores/kanbanStore.js` | Component hierarchy, store-based state |
| **WebSocket** | Python (FastAPI), JS | `websocketService.js`, `websocket_manager.py` | Event emitter, message handler |
| **File I/O** | FastAPI routes | `server/api/stage_logs.py` | REST API, async fetch |
| **UI State** | React hooks, Zustand | `src/components/kanban/` | Modal overlays, component rerender |
| **Session** | Zustand persist | `kanbanStore.js` | localStorage-backed state |
| **Notifications** | WebSocket broadcast | `projectNotificationService.js` | Async notification system |

