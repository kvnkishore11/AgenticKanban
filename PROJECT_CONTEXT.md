# AgenticKanban - Project Context

## What This Project Is

AgenticKanban is an AI-powered Kanban board that automates software development workflows. Think of it as Jira/Trello + AI that can actually do the work.

## The Core Idea

1. User creates a task on the Kanban board (e.g., "Add search functionality")
2. AI clarifies what the user wants (are we on the same page?)
3. AI plans the implementation (breaks it down into steps)
4. AI implements the code (writes actual code changes)
5. AI tests, reviews, documents, and creates a PR

All of this happens in isolated git worktrees so multiple tasks can run in parallel without conflicts.

## Main Components

### Frontend (React + Zustand)
- **Location**: `src/`
- **Kanban board UI** with drag-and-drop columns
- **Task management** - create, edit, delete tasks
- **Real-time updates** via WebSocket
- **Key files**:
  - `src/components/kanban/` - Board and card components
  - `src/stores/` - Zustand state management
  - `src/App.tsx` - Main application

### Backend (FastAPI)
- **Location**: `server/`
- **REST API** for task CRUD operations
- **WebSocket server** for real-time updates
- **Key files**:
  - `server/api/` - API endpoints
  - `server/websocket_server.py` - WebSocket handling

### ADW Automation Layer
- **Location**: `adws/`
- **Orchestrates AI workflows** using Claude Code CLI
- **Isolated execution** via git worktrees
- **Workflow stages**: Clarify → Plan → Build → Test → Review → Document → Ship
- **Key files**:
  - `adws/adw_modules/` - Reusable workflow modules
  - `adws/stages/` - Individual stage implementations
  - `adws/orchestrator/` - Workflow orchestration

## Current Features

1. **Kanban Board** - Multiple columns (Backlog, Clarify, Plan, Build, Test, Review, Document, Ready to Merge)
2. **Task Management** - Create, edit, delete, drag-drop tasks
3. **AI Workflows** - Automated planning, implementation, testing
4. **Real-time Updates** - WebSocket-based live updates
5. **Project Management** - Multiple projects, import/export
6. **Workflow Logs** - View execution logs for each stage

## Key Patterns

- **Zustand for state** - Simple state management in `stores/`
- **WebSocket for real-time** - `websocket_server.py` broadcasts updates
- **Isolated worktrees** - Each task gets its own git branch/worktree
- **Claude Code CLI** - AI agent execution via slash commands in `.claude/commands/`

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `TaskCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `taskUtils.ts`)
- API endpoints: `snake_case.py` (e.g., `task_routes.py`)
- ADW modules: `snake_case.py` (e.g., `workflow_ops.py`)

## Common Task Types

- **Feature**: Add new functionality (most common)
- **Bug**: Fix something broken
- **Chore**: Maintenance, refactoring, cleanup
- **Patch**: Small targeted fixes

## Where Things Live

| What | Where |
|------|-------|
| React components | `src/components/` |
| State management | `src/stores/` |
| API endpoints | `server/api/` |
| ADW workflows | `adws/` |
| Slash commands | `.claude/commands/` |
| Workflow stages | `adws/stages/` |
| Agent state | `agents/<adw_id>/` |
