# AgenticKanban Architecture

This document provides a comprehensive overview of the AgenticKanban system architecture, including its three-layer design, data flow patterns, and key design decisions.

## Table of Contents

- [System Overview](#system-overview)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [ADW Automation Layer](#adw-automation-layer)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Security Architecture](#security-architecture)
- [Design Decisions](#design-decisions)

## System Overview

AgenticKanban is built on a three-layer architecture that separates concerns and enables scalability:

1. **Frontend Layer**: React-based user interface for task and project management
2. **Backend Layer**: FastAPI server providing REST API and WebSocket real-time communication
3. **ADW Automation Layer**: AI-driven workflow orchestration using isolated git worktrees

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│              Browser (React Application)                    │
└─────────────────────────────────────────────────────────────┘
         │                                            │
         │ HTTP REST API                              │ WebSocket
         ↓                                            ↓
┌──────────────────────────┐         ┌──────────────────────────┐
│   Backend API Server     │←────────│  WebSocket Server        │
│   (FastAPI - Port 8001)  │         │  (Python - Port 3000)    │
└──────────────────────────┘         └──────────────────────────┘
         │                                            │
         │ Python API Calls                           │
         ↓                                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ADW Automation System                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Worktree 1 │  │ Worktree 2 │  │ Worktree N │            │
│  │ (ADW ID 1) │  │ (ADW ID 2) │  │ (ADW ID N) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
         ↓                                            ↓
┌──────────────────────────┐         ┌──────────────────────────┐
│   GitHub Repository      │         │   Claude Code CLI        │
│   (Issues, PRs, Code)    │         │   (AI Agent)             │
└──────────────────────────┘         └──────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **React 19**: UI framework
- **Zustand**: Lightweight state management
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type safety (with JSDoc in .jsx files)
- **WebSocket Client**: Real-time communication

### Component Structure

```
src/
├── App.jsx                      # Main application component
├── components/
│   ├── forms/                   # Form and modal components
│   │   ├── TaskInput.jsx        # Task creation form
│   │   ├── TaskEditModal.jsx    # Task editing modal
│   │   ├── SettingsModal.jsx    # Application settings
│   │   ├── WorkflowTriggerModal.jsx  # ADW workflow trigger
│   │   ├── PlanViewerModal.jsx  # View implementation plans
│   │   └── ProjectPortConfiguration.jsx  # Port settings
│   ├── kanban/                  # Kanban board components
│   │   ├── KanbanBoard.jsx      # Main board container
│   │   ├── KanbanCard.jsx       # Individual task card
│   │   ├── CompletedTasksModal.jsx  # Completed tasks view
│   │   ├── StageProgressionViewer.jsx  # Workflow stages
│   │   ├── StageLogsViewer.jsx  # Stage-specific logs
│   │   └── WorkflowLogViewer.jsx  # Complete workflow logs
│   ├── ui/                      # Reusable UI components
│   │   ├── LoadingSpinner.jsx   # Loading indicator
│   │   ├── ErrorBoundary.jsx    # Error handling
│   │   ├── Toast.jsx            # Notification toasts
│   │   ├── AdwIdInput.jsx       # ADW ID input field
│   │   └── WebSocketStatusIndicator.jsx  # Connection status
│   ├── ProjectSelector.jsx      # Project selection dropdown
│   └── CommandsPalette.jsx      # Keyboard shortcuts palette
├── stores/
│   └── kanbanStore.js           # Centralized Zustand store (2382 lines)
├── utils/                       # Utility functions
└── styles/                      # CSS styles
```

### State Management Strategy

The frontend uses **Zustand** for state management, chosen for its:
- Minimal boilerplate compared to Redux
- No context providers needed
- Excellent TypeScript support
- Built-in devtools integration
- Simple mental model

#### Current Store Structure (kanbanStore.js)

The monolithic store manages:
1. **Project State**: Selected project, project list, CRUD operations
2. **Task State**: Tasks array, CRUD operations, filtering, searching
3. **WebSocket State**: Connection, message handling, reconnection logic
4. **Notification State**: Toast messages, error handling
5. **Configuration State**: Backend URL, WebSocket URL, ports

**Note**: This monolithic structure is planned for refactoring into focused stores:
- `projectStore.js` - Project management
- `taskStore.js` - Task CRUD operations
- `websocketStore.js` - WebSocket connection management
- `notificationStore.js` - Notifications and toasts
- `configStore.js` - Application settings

### Component Communication

```
┌───────────────────────────────────────────────────────────┐
│                        App.jsx                            │
│  - Top-level UI state (modals, palettes)                 │
│  - WebSocket initialization                               │
└───────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ↓               ↓               ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│ ProjectSelector │ │ KanbanBoard │ │ TaskInput   │
│                 │ │             │ │             │
│ - Select/Create │ │ - Display   │ │ - Create    │
│   projects      │ │   tasks     │ │   tasks     │
│                 │ │ - Drag/drop │ │             │
└─────────────────┘ └─────────────┘ └─────────────┘
         │                   │               │
         └───────────────────┼───────────────┘
                             │
                      useKanbanStore()
                             │
         ┌───────────────────┴───────────────────┐
         │         Zustand Store                  │
         │  - Projects, Tasks, WebSocket, etc.   │
         └────────────────────────────────────────┘
```

### WebSocket Communication

Real-time updates use WebSocket connection:

```javascript
// Frontend sends messages:
{
  action: "project_selected",
  projectId: "project-uuid"
}

// Backend broadcasts updates:
{
  type: "project_data",
  data: { /* project data */ }
}

{
  type: "task_created",
  data: { /* new task */ }
}

{
  type: "workflow_status_update",
  data: { adw_id, status, stage }
}
```

## Backend Architecture

### Technology Stack

- **FastAPI**: Modern Python web framework
- **WebSockets**: Real-time bidirectional communication
- **Pydantic**: Data validation and serialization
- **Python 3.10+**: Language runtime

### API Structure

```
app/server/
├── server.py              # Main FastAPI application
├── api/                   # API endpoint modules
│   ├── projects.py        # Project management endpoints
│   ├── tasks.py           # Task CRUD endpoints
│   ├── workflows.py       # Workflow trigger endpoints
│   └── health.py          # Health check endpoints
├── core/                  # Core utilities
│   ├── utils.py           # Helper functions
│   ├── config.py          # Configuration management
│   └── logger.py          # Centralized logging (planned)
└── tests/                 # Backend test suite
```

### Key API Endpoints

#### REST API (Port 8001)

```
GET    /api/projects              # List all projects
POST   /api/projects              # Create project
GET    /api/projects/{id}         # Get project details
PUT    /api/projects/{id}         # Update project
DELETE /api/projects/{id}         # Delete project

GET    /api/tasks                 # List tasks (with filters)
POST   /api/tasks                 # Create task
PUT    /api/tasks/{id}            # Update task
DELETE /api/tasks/{id}            # Delete task

POST   /api/workflows/trigger     # Trigger ADW workflow
GET    /api/workflows/{adw_id}    # Get workflow status
GET    /api/workflows/{adw_id}/logs  # Get workflow logs

GET    /health                    # Health check
```

#### WebSocket Server (Port 3000)

Handles:
- Project selection broadcasts
- Task creation/update/deletion notifications
- Workflow status updates
- Real-time log streaming
- Connection status management

### Request/Response Flow

```
┌──────────┐                    ┌──────────┐
│  Client  │                    │  Server  │
└────┬─────┘                    └────┬─────┘
     │                               │
     │  POST /api/tasks              │
     │  { title, description }       │
     ├──────────────────────────────>│
     │                               │
     │                          Validate input
     │                          Create task
     │                          Save to storage
     │                               │
     │  201 Created                  │
     │  { task object }              │
     │<──────────────────────────────┤
     │                               │
     │                          Broadcast via WS
     │                               │
     │  WebSocket: task_created      │
     │  { task object }              │
     │<══════════════════════════════┤
     │                               │
```

### Data Storage

Currently uses **file-based storage**:
- Projects stored in `localStorage` (frontend) and synced via WebSocket
- Tasks stored in project data files
- Workflow state stored in `agents/{adw_id}/adw_state.json`

**Future**: Planned migration to PostgreSQL/SQLite for:
- Better data integrity
- Query performance
- Transaction support
- Concurrent access handling

## ADW Automation Layer

The ADW (AI Developer Workflow) system automates the software development lifecycle using isolated git worktrees and AI agents.

### Core Concepts

#### 1. Isolated Execution

Each workflow runs in a separate git worktree:

```
AgenticKanban/                    # Main repository
├── trees/                        # Isolated worktrees
│   ├── a1b2c3d4/                # ADW ID: a1b2c3d4
│   │   ├── src/                 # Complete repo copy
│   │   ├── app/
│   │   ├── .env                 # Ports: 9100, 9200
│   │   └── ...
│   ├── e5f6g7h8/                # ADW ID: e5f6g7h8
│   │   ├── src/                 # Complete repo copy
│   │   ├── app/
│   │   ├── .env                 # Ports: 9101, 9201
│   │   └── ...
│   └── ...                      # Up to 15 concurrent workflows
└── agents/                      # Workflow state storage
    ├── a1b2c3d4/
    │   └── adw_state.json       # Persistent state
    └── e5f6g7h8/
        └── adw_state.json
```

#### 2. SDLC Phases

ADW supports a complete SDLC workflow:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  Plan   │───>│  Build  │───>│  Test   │───>│ Review  │───>│ Document │───>│   Ship   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └──────────┘    └──────────┘
    │              │              │              │               │               │
    ↓              ↓              ↓              ↓               ↓               ↓
 Create        Implement      Run tests      Review PR       Generate       Merge to
  spec            code         & fixes       & address       docs &          main
  file                                       feedback       update README    branch
```

**Phase Details:**

1. **Plan**: Analyze GitHub issue, create detailed implementation spec
2. **Build**: Implement changes based on spec, commit to branch
3. **Test**: Run validation commands, fix any failures
4. **Review**: Create PR, perform automated code review
5. **Document**: Generate/update documentation
6. **Ship**: Approve and merge PR (with optional zero-touch mode)

#### 3. ADW ID System

8-character hex identifier (e.g., `a1b2c3d4`):
- Tracks entire workflow lifecycle
- Deterministic port allocation
- Worktree path: `trees/{adw_id}/`
- State file: `agents/{adw_id}/adw_state.json`
- Git branch: `feature-issue-{issue_num}-adw-{adw_id}-{title}`

#### 4. Port Allocation

Deterministic port assignment based on ADW ID:

```python
def get_port_offset(adw_id: str) -> int:
    """Convert ADW ID to port offset (0-14)"""
    return int(adw_id[:2], 16) % 15

backend_port = 9100 + offset   # 9100-9114
frontend_port = 9200 + offset  # 9200-9214
```

### ADW Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ADW Orchestration Scripts                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  adw_plan_build_iso.py                           │   │
│  │  adw_plan_build_test_iso.py                      │   │
│  │  adw_plan_build_test_review_iso.py               │   │
│  │  adw_sdlc_iso.py (complete workflow)             │   │
│  │  adw_sdlc_zte_iso.py (zero-touch execution)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓ Uses
┌─────────────────────────────────────────────────────────┐
│              ADW Module Library                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  workflow_ops.py    - Core workflow operations   │   │
│  │  state_manager.py   - State persistence          │   │
│  │  github_ops.py      - GitHub integration         │   │
│  │  worktree_ops.py    - Git worktree management    │   │
│  │  orchestrator.py    - Unified orchestration      │   │
│  │                       (planned refactor)          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓ Executes
┌─────────────────────────────────────────────────────────┐
│              External Tools                             │
│  - Claude Code CLI (AI agent)                           │
│  - GitHub CLI (gh)                                      │
│  - Git (worktrees, commits, branches)                   │
│  - npm, pytest (testing)                                │
└─────────────────────────────────────────────────────────┘
```

### Workflow State Management

State is persisted in `agents/{adw_id}/adw_state.json`:

```json
{
  "adw_id": "a1b2c3d4",
  "issue_number": "123",
  "issue_class": "/feature",
  "branch_name": "feature-issue-123-adw-a1b2c3d4-implement-auth",
  "plan_file": "/path/to/specs/issue-123-adw-a1b2c3d4-spec.md",
  "worktree_path": "/path/to/trees/a1b2c3d4/",
  "backend_port": 9103,
  "frontend_port": 9203,
  "phases_completed": ["plan", "build", "test"],
  "current_phase": "review",
  "pr_number": "456",
  "pr_url": "https://github.com/owner/repo/pull/456"
}
```

## Data Flow

### Task Creation Flow

```
User (Browser)
    │
    │ 1. Enter task details
    │
    ↓
TaskInput Component
    │
    │ 2. Call addTask()
    │
    ↓
Zustand Store (kanbanStore)
    │
    │ 3. Add to local state
    │    4. Persist to localStorage
    │    5. Send to backend
    │
    ↓
Backend API (/api/tasks)
    │
    │ 6. Validate data
    │    7. Save to storage
    │
    ↓
WebSocket Server
    │
    │ 8. Broadcast "task_created"
    │
    ↓
All Connected Clients
    │
    │ 9. Update UI in real-time
    │
    ↓
KanbanBoard Component Re-renders
```

### Workflow Trigger Flow

```
User (Browser)
    │
    │ 1. Click "Trigger Workflow"
    │    2. Enter ADW ID (optional)
    │
    ↓
WorkflowTriggerModal
    │
    │ 3. POST /api/workflows/trigger
    │    { issue_number, workflow_type, adw_id }
    │
    ↓
Backend API
    │
    │ 4. Validate parameters
    │    5. Call ADW orchestrator script
    │
    ↓
ADW Orchestrator (subprocess)
    │
    │ 6. Create/reuse worktree
    │    7. Run workflow phases
    │    8. Stream logs via WebSocket
    │
    ↓
WebSocket Server
    │
    │ 9. Broadcast status updates
    │    { type: "workflow_status_update", adw_id, status }
    │
    ↓
StageProgressionViewer Component
    │
    │ 10. Display real-time progress
    │
    ↓
Workflow Complete
```

## Security Architecture

### Current Security Measures

1. **CORS Configuration**: Allows specific origins for backend API
2. **Input Validation**: Basic validation on API endpoints
3. **WebSocket Connection**: Public (no authentication yet)

### Planned Security Enhancements

1. **WebSocket Authentication**: Token-based authentication for WS connections
2. **Rate Limiting**: Prevent abuse of workflow triggers and API endpoints
3. **Input Validation**: Comprehensive Pydantic schemas for all inputs
4. **Path Validation**: Prevent directory traversal in ADW operations
5. **ADW ID Validation**: Ensure 8-character hex format
6. **Environment-based CORS**: Move allowed origins to environment variables
7. **Secrets Management**: Proper handling of GitHub tokens and API keys

### Security Best Practices

```python
# Input validation with Pydantic
from pydantic import BaseModel, validator

class TaskCreate(BaseModel):
    title: str
    description: str
    status: str

    @validator('status')
    def validate_status(cls, v):
        allowed = ['todo', 'in_progress', 'in_review', 'done']
        if v not in allowed:
            raise ValueError(f'Status must be one of {allowed}')
        return v

# Path validation
def validate_adw_path(adw_id: str) -> Path:
    if not re.match(r'^[a-f0-9]{8}$', adw_id):
        raise ValueError('Invalid ADW ID format')
    path = TREES_DIR / adw_id
    if not path.resolve().is_relative_to(TREES_DIR.resolve()):
        raise ValueError('Path traversal detected')
    return path
```

## Design Decisions

### Why Zustand over Redux?

- **Simplicity**: Minimal boilerplate, easier learning curve
- **Performance**: No context providers, direct store access
- **Size**: Smaller bundle size (~1KB vs ~10KB for Redux)
- **Developer Experience**: Built-in devtools, TypeScript support
- **Future-proof**: Easy to split into multiple stores

### Why FastAPI over Flask/Django?

- **Modern**: Built for Python 3.6+ with async/await support
- **Performance**: Comparable to Node.js and Go
- **Type Safety**: Automatic validation with Pydantic
- **Documentation**: Auto-generated OpenAPI/Swagger docs
- **WebSocket**: First-class WebSocket support

### Why Git Worktrees for Isolation?

- **True Isolation**: Each workflow has its own filesystem
- **Concurrent Execution**: Up to 15 workflows run simultaneously
- **Safety**: No risk of conflicts between workflows
- **Debugging**: Worktree remains after workflow for inspection
- **Efficiency**: Shares .git directory, saves disk space

### Why File-based Storage?

- **Simplicity**: No database setup required
- **Portability**: Easy to backup and transfer
- **Debugging**: Human-readable JSON files
- **Prototyping**: Fast iteration during development

**Trade-off**: Planned migration to database for:
- Better concurrent access handling
- Query performance
- Data integrity
- Transaction support

### Why Separate WebSocket Server?

- **Separation of Concerns**: API and real-time updates separated
- **Scalability**: Can scale WebSocket server independently
- **Simplicity**: Easier to manage connection lifecycle
- **Flexibility**: Can use different ports/hosts

**Trade-off**: Could be unified into FastAPI server in future for:
- Simpler deployment
- Shared authentication
- Reduced latency

## Performance Considerations

### Frontend Optimizations

- **Code Splitting**: Vite automatically splits code by route
- **Lazy Loading**: Modal components loaded on demand
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: Planned for large task lists

### Backend Optimizations

- **Async/Await**: FastAPI handles concurrent requests efficiently
- **Connection Pooling**: Planned for database connections
- **Caching**: Planned Redis integration for frequently accessed data

### ADW Optimizations

- **Worktree Reuse**: Reuse existing worktrees when possible
- **Parallel Execution**: Independent workflows run concurrently
- **Incremental Operations**: Only rebuild what changed

## Future Architecture Improvements

### Short-term (3-6 months)

1. **Store Refactoring**: Split kanbanStore into focused stores
2. **Security Enhancements**: WebSocket auth, rate limiting, validation
3. **Test Coverage**: Increase from <10% to 40%+
4. **Logger Utilities**: Centralized, structured logging
5. **WorkflowOrchestrator**: Unified orchestration class

### Medium-term (6-12 months)

1. **Database Migration**: PostgreSQL for production
2. **TypeScript Migration**: Full TypeScript for frontend
3. **OpenAPI Documentation**: Auto-generated API docs
4. **Error Tracking**: Sentry integration
5. **E2E Testing**: Comprehensive Playwright test suite

### Long-term (12+ months)

1. **Microservices**: Split backend into focused services
2. **Kubernetes Deployment**: Container orchestration
3. **Multi-tenancy**: Support multiple organizations
4. **Advanced AI Features**: Code review suggestions, auto-fixes
5. **Real-time Collaboration**: Multiple users editing simultaneously

## Related Documentation

- [README.md](README.md) - Project overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [adws/README.md](adws/README.md) - ADW system details
- [docs/CODE_QUALITY_AUDIT.md](docs/CODE_QUALITY_AUDIT.md) - Code quality findings
