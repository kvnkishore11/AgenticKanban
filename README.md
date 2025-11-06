# AgenticKanban

A modern, AI-powered Kanban board system with automated workflow orchestration. AgenticKanban combines a React-based frontend with a FastAPI backend and an intelligent ADW (AI Developer Workflow) automation layer to streamline software development tasks.

## Overview

AgenticKanban is designed to manage development tasks through an intuitive Kanban interface while providing powerful automation capabilities through AI-driven workflows. The system supports isolated workflow execution, real-time WebSocket updates, and seamless integration with GitHub issues and pull requests.

## Architecture

The system is built on three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│  React + Zustand + TailwindCSS + WebSocket Client          │
│  - Kanban Board UI                                          │
│  - Task Management                                          │
│  - Real-time Updates                                        │
│  - Project Management                                       │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                           │
│  FastAPI + WebSocket Server + State Management             │
│  - REST API Endpoints                                       │
│  - WebSocket Real-time Communication                        │
│  - Task & Project CRUD Operations                           │
│  - Workflow Coordination                                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ Python API
┌─────────────────────────────────────────────────────────────┐
│                     ADW AUTOMATION LAYER                    │
│  Isolated Git Worktrees + AI Agent Orchestration           │
│  - Plan → Build → Test → Review → Document → Ship          │
│  - Isolated Execution (15 concurrent workflows)            │
│  - GitHub Integration                                       │
│  - Claude Code AI Integration                               │
└─────────────────────────────────────────────────────────────┘
```

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Vite** - Build tool
- **TypeScript** - Type checking
- **Lucide React** - Icons
- **CodeMirror** - Code editor component
- **TipTap** - WYSIWYG rich text editor for task descriptions

### Backend
- **FastAPI** - Python web framework
- **WebSockets** - Real-time communication
- **Python 3.10+** - Programming language
- **Pydantic** - Data validation

### ADW Automation
- **Git Worktrees** - Isolated execution environments
- **GitHub CLI** - GitHub integration
- **Claude Code CLI** - AI agent integration
- **uv** - Fast Python package manager

## Quick Start

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.10+**
- **Git**
- **GitHub CLI** (`gh`)
- **Claude Code CLI** (optional, for ADW workflows)
- **uv** (Python package manager)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AgenticKanban
```

2. **Set up environment variables**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Key variables:
# - VITE_WS_URL: WebSocket server URL (default: ws://localhost:3000)
# - VITE_BACKEND_PORT: Backend API port (default: 8001)
# - GITHUB_REPO_URL: Your GitHub repository URL (for ADW)
```

3. **Install frontend dependencies**
```bash
npm install
```

4. **Install backend dependencies**
```bash
cd app/server
uv sync
cd ../..
```

5. **Install ADW dependencies (optional)**
```bash
cd adws
uv sync
cd ..
```

### Running the Application

#### Development Mode

1. **Start the WebSocket server** (Terminal 1)
```bash
python start-websocket.py
```

2. **Start the backend API** (Terminal 2)
```bash
cd app/server
uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

3. **Start the frontend dev server** (Terminal 3)
```bash
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- WebSocket: ws://localhost:3000

#### Production Build

```bash
# Build the frontend
npm run build

# Preview the production build
npm run preview
```

### Running ADW Workflows

ADW workflows automate the entire software development lifecycle using isolated git worktrees.

```bash
cd adws/

# Set required environment variables
export GITHUB_REPO_URL="https://github.com/owner/repository"
export CLAUDE_CODE_PATH="/path/to/claude"  # Optional

# Run a workflow on GitHub issue #123
uv run adw_plan_build_test_iso.py 123

# Complete SDLC workflow
uv run adw_sdlc_iso.py 123
```

For detailed ADW documentation, see [adws/README.md](adws/README.md).

## Features

### Kanban Board Management
- Create, edit, and delete tasks
- Drag-and-drop task organization
- Multiple project support
- Task status tracking (To Do, In Progress, In Review, Done)
- Completed tasks archive
- Task search and filtering

### Real-time Collaboration
- WebSocket-based real-time updates
- Multi-user task synchronization
- Live workflow status updates
- Connection status indicator

### AI-Powered Automation
- Automated issue planning
- Code implementation automation
- Test generation and execution
- Code review automation
- Documentation generation
- Pull request management
- Zero-touch deployment (optional)

### Workflow Management
- Custom workflow triggers
- Workflow log viewing
- Stage progression tracking
- ADW ID-based workflow tracking
- Resume capability for failed workflows

### Project Management
- Multiple project support
- Project import/export
- Project-specific configurations
- Port configuration for isolated testing

## Development

### Project Structure

```
AgenticKanban/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── forms/         # Form components (modals, inputs)
│   │   ├── kanban/        # Kanban-specific components
│   │   └── ui/            # Reusable UI components
│   ├── stores/            # Zustand state stores
│   ├── utils/             # Utility functions
│   └── styles/            # CSS styles
├── app/                   # Backend application
│   └── server/            # FastAPI server
│       ├── api/           # API endpoints
│       ├── core/          # Core utilities
│       └── tests/         # Backend tests
├── adws/                  # ADW automation scripts
│   ├── adw_modules/       # Reusable ADW modules
│   └── agents/            # Workflow state storage
├── specs/                 # Feature specifications
├── scripts/               # Build and utility scripts
└── public/                # Static assets
```

### Available Scripts

```bash
# Frontend
npm run dev              # Start development server
npm run build            # Production build
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code linting
npm run test             # Run tests
npm run validate         # Run all validation checks

# Backend
cd app/server
uv run uvicorn server:app --reload  # Start backend server
uv run pytest                       # Run backend tests

# ADW Workflows
cd adws/
uv run adw_plan_build_iso.py <issue>     # Plan + Build
uv run adw_plan_build_test_iso.py <issue> # Plan + Build + Test
uv run adw_sdlc_iso.py <issue>            # Complete SDLC
```

### Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd app/server && uv run pytest

# Type checking
npm run typecheck

# E2E tests (Playwright)
npm run test:e2e
```

### Code Quality

This project follows industry best practices:
- **File-level documentation**: All components and modules have JSDoc/docstring headers
- **Consistent code style**: ESLint + Prettier configuration
- **Type safety**: TypeScript type checking
- **Centralized logging**: Structured logging utilities
- **Security**: Input validation, CORS configuration, authentication
- **Testing**: Comprehensive test coverage

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed coding standards.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Detailed system architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines and coding standards
- [adws/README.md](adws/README.md) - ADW automation system documentation
- [docs/CODE_QUALITY_AUDIT.md](docs/CODE_QUALITY_AUDIT.md) - Code quality audit findings

## Configuration

### Environment Variables

Frontend (`.env`):
```bash
VITE_WS_URL=ws://localhost:3000           # WebSocket server URL
VITE_BACKEND_PORT=8001                    # Backend API port
```

Backend (`app/server/.env`):
```bash
ALLOWED_ORIGINS=http://localhost:5173     # CORS allowed origins
LOG_LEVEL=INFO                            # Logging level
```

ADW (shell environment):
```bash
export GITHUB_REPO_URL="https://github.com/owner/repo"
export CLAUDE_CODE_PATH="/path/to/claude"
export GITHUB_PAT="ghp_xxxx"  # Optional, if not using gh auth login
```

### Port Configuration

- **Frontend Dev Server**: 5173 (Vite default)
- **Backend API**: 8001
- **WebSocket Server**: 3000
- **ADW Backend Ports**: 9100-9114 (isolated workflows)
- **ADW Frontend Ports**: 9200-9214 (isolated workflows)

## Troubleshooting

### WebSocket Connection Issues
- Verify `start-websocket.py` is running
- Check WebSocket URL in settings matches the server
- Ensure firewall allows connections on port 3000

### Backend API Errors
- Check backend server is running on correct port
- Verify CORS configuration includes your frontend URL
- Check backend logs for detailed error messages

### ADW Workflow Issues
- Ensure GitHub CLI is authenticated: `gh auth status`
- Verify Claude Code CLI is installed: `claude --version`
- Check environment variables are set correctly
- Review workflow logs in `adws/agents/<adw_id>/`

### Port Conflicts
- Use `npm run dev:cleanup` to kill orphaned dev servers
- Check port availability: `lsof -i :<port>`
- Configure different ports in `.env` files

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code style guidelines
- PR process
- Testing requirements
- Documentation standards

## License

[Include your license information here]

## Support

For issues, questions, or contributions:
- **GitHub Issues**: [Link to your issues page]
- **Documentation**: See the `docs/` directory
- **ADW Documentation**: See `adws/README.md`

## Acknowledgments

- Built with [Claude Code](https://claude.ai/code) AI assistance
- Inspired by modern Kanban and agile methodologies
- Uses AI-driven development workflows for automation
