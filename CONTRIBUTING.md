# Contributing to AgenticKanban

Thank you for your interest in contributing to AgenticKanban! This document provides guidelines and standards for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Documentation Standards](#documentation-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- Node.js 18+ and npm
- Python 3.10+
- Git
- GitHub CLI (`gh`)
- uv (Python package manager)
- Claude Code CLI (optional, for ADW workflows)

### Setting Up Development Environment

1. **Fork and clone the repository**
```bash
git clone https://github.com/your-username/AgenticKanban.git
cd AgenticKanban
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd app/server
uv sync
cd ../..

# ADW
cd adws
uv sync
cd ..
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the application**
```bash
# Terminal 1: WebSocket server
python start-websocket.py

# Terminal 2: Backend server
cd app/server && uv run uvicorn server:app --reload --port 8001

# Terminal 3: Frontend dev server
npm run dev
```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<issue-number>-<brief-description>

Examples:
- feature/123-add-user-authentication
- bug/456-fix-websocket-reconnection
- refactor/789-split-kanban-store
- docs/012-update-api-documentation
```

**Types:**
- `feature/` - New features
- `bug/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or modifications
- `chore/` - Build, dependencies, or tooling

### Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**

```
feat(kanban): add drag-and-drop task reordering

Implement drag-and-drop functionality for tasks within columns
using React DnD. Tasks can now be reordered by dragging.

Closes #123
```

```
fix(websocket): prevent connection loop on network error

Add exponential backoff to WebSocket reconnection logic to prevent
infinite loops when network is unstable.

Fixes #456
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Scopes:**
- `kanban` - Kanban board components
- `tasks` - Task management
- `projects` - Project management
- `websocket` - WebSocket functionality
- `adw` - ADW automation system
- `api` - Backend API
- `ui` - UI components
- `store` - State management

## Coding Standards

### JavaScript/React Standards

#### File Headers

**All JavaScript/React files must include a JSDoc header:**

```javascript
/**
 * @fileoverview Brief description of what this file does
 * Additional context about the component/module's role in the system
 * @module optional-module-name
 */
```

**Example:**

```javascript
/**
 * @fileoverview Task creation form component
 * Provides a form interface for creating new tasks with title, description,
 * and initial status. Handles validation and submission to the backend.
 * @module components/forms/TaskInput
 */

import { useState } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';

// Component implementation...
```

#### Code Style

- **Use functional components** with hooks (no class components)
- **Use destructuring** for props and state
- **Use meaningful variable names** (avoid single letters except for common iterators)
- **Keep functions small** - Aim for <50 lines per function
- **Extract complex logic** into custom hooks or utility functions
- **Use const by default**, let when reassignment is needed
- **Avoid var** entirely

**Good Example:**

```javascript
const TaskCard = ({ task, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      {isExpanded && <p>{task.description}</p>}
      <button onClick={handleToggleExpand}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
};
```

**Bad Example:**

```javascript
// Missing file header
// Using inline styles instead of Tailwind
// No prop destructuring
const TaskCard = (props) => {
  const [e, se] = useState(false); // Unclear variable names

  return (
    <div style={{ padding: '10px', border: '1px solid black' }}>
      <h3>{props.task.title}</h3>
      {e && <p>{props.task.description}</p>}
      <button onClick={() => se(!e)}>Toggle</button>
    </div>
  );
};
```

#### State Management

- **Use Zustand stores** for global state
- **Use useState** for local component state
- **Use useEffect carefully** - Always specify dependencies
- **Avoid prop drilling** - Use stores for deeply nested data

**Store usage:**

```javascript
// Good: Destructure only what you need
const { tasks, addTask, deleteTask } = useKanbanStore();

// Bad: Using entire store
const store = useKanbanStore();
const tasks = store.tasks;
```

#### Component Organization

```javascript
/**
 * @fileoverview Component description
 */

// 1. Imports
import React, { useState, useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { SomeIcon } from 'lucide-react';

// 2. Constants (if any)
const MAX_TITLE_LENGTH = 100;

// 3. Helper functions (if simple, otherwise in utils/)
const formatDate = (date) => {
  // ...
};

// 4. Main component
const MyComponent = ({ prop1, prop2 }) => {
  // 4a. State declarations
  const [localState, setLocalState] = useState(null);

  // 4b. Store access
  const { storeData, storeAction } = useKanbanStore();

  // 4c. Effects
  useEffect(() => {
    // ...
  }, [dependencies]);

  // 4d. Event handlers
  const handleClick = () => {
    // ...
  };

  // 4e. Render
  return (
    // JSX
  );
};

// 5. Export
export default MyComponent;
```

### Python Standards

#### File Headers

**All Python files must include a module docstring:**

```python
"""
Brief description of what this module does.

Additional context about the module's role in the system.
Explain key classes, functions, or patterns used.
"""
```

**Example:**

```python
"""
Workflow orchestration module for ADW system.

This module provides the WorkflowOrchestrator class which coordinates
execution of SDLC phases (plan, build, test, review, document, ship)
in isolated git worktrees. Supports flexible phase composition and
state management across phases.
"""

import subprocess
from pathlib import Path
from typing import List, Optional

# Module implementation...
```

#### Function Docstrings

All public functions must have docstrings:

```python
def calculate_port_offset(adw_id: str) -> int:
    """
    Calculate port offset from ADW ID.

    Converts the first two characters of the ADW ID from hexadecimal
    to an integer and takes modulo 15 to get a port offset.

    Args:
        adw_id: 8-character hexadecimal ADW identifier

    Returns:
        Port offset in range [0, 14]

    Raises:
        ValueError: If adw_id is not valid hexadecimal

    Example:
        >>> calculate_port_offset("a1b2c3d4")
        1
    """
    return int(adw_id[:2], 16) % 15
```

#### Code Style

- Follow **PEP 8** style guide
- Use **type hints** for function parameters and return values
- Use **f-strings** for string formatting
- Keep functions focused - Single Responsibility Principle
- Use **pathlib.Path** for file paths (not os.path)

**Good Example:**

```python
def create_worktree(adw_id: str, branch_name: str) -> Path:
    """Create isolated git worktree for workflow execution."""
    worktree_path = TREES_DIR / adw_id

    if worktree_path.exists():
        raise ValueError(f"Worktree already exists: {worktree_path}")

    subprocess.run(
        ["git", "worktree", "add", str(worktree_path), "-b", branch_name],
        check=True,
        capture_output=True
    )

    return worktree_path
```

**Bad Example:**

```python
# Missing docstring, no type hints, unclear variable names
def cw(id, bn):
    p = os.path.join("trees", id)
    if os.path.exists(p):
        raise Exception("Exists")
    os.system(f"git worktree add {p} -b {bn}")
    return p
```

### Logging Standards

Use centralized logging utilities instead of print/console.log:

**Frontend (JavaScript):**

```javascript
import logger from '../utils/logger';

// Don't use console.log directly
// console.log('Task created:', task);

// Use logger instead
logger.info('Task created', { taskId: task.id, title: task.title });
logger.error('Failed to create task', { error: err.message });
logger.debug('Task validation passed', { task });
```

**Backend (Python):**

```python
import logging

logger = logging.getLogger(__name__)

# Don't use print
# print(f"Processing workflow {adw_id}")

# Use logger
logger.info(f"Processing workflow {adw_id}")
logger.error(f"Workflow failed: {error}", exc_info=True)
logger.debug(f"State loaded: {state}")
```

## Documentation Standards

### When to Add Documentation

1. **All files** - File-level header explaining purpose
2. **Public APIs** - JSDoc/docstrings for all public functions
3. **Complex logic** - Inline comments explaining "why", not "what"
4. **Architecture changes** - Update ARCHITECTURE.md
5. **New features** - Update README.md if user-facing

### JSDoc Standards (JavaScript)

```javascript
/**
 * Creates a new task and syncs with backend
 *
 * @param {Object} taskData - Task data object
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description
 * @param {string} taskData.status - Task status (todo|in_progress|in_review|done)
 * @returns {Promise<Object>} Created task object with generated ID
 * @throws {Error} If task creation fails or validation fails
 *
 * @example
 * const task = await createTask({
 *   title: 'Implement feature',
 *   description: 'Add new functionality',
 *   status: 'todo'
 * });
 */
async function createTask(taskData) {
  // Implementation...
}
```

### Python Docstring Standards

Use **Google-style** docstrings:

```python
def process_workflow(issue_number: int, phases: List[str]) -> dict:
    """
    Process a complete workflow with specified phases.

    Creates isolated worktree, executes each phase sequentially, and
    manages state transitions. If any phase fails, saves state for resume.

    Args:
        issue_number: GitHub issue number to process
        phases: List of phase names to execute (e.g., ['plan', 'build', 'test'])

    Returns:
        Dictionary containing workflow results with keys:
            - adw_id: Workflow identifier
            - success: Boolean indicating overall success
            - phases_completed: List of completed phase names
            - error: Error message if failed (None if success)

    Raises:
        ValueError: If issue_number is invalid or phases list is empty
        WorkflowError: If workflow execution fails

    Example:
        >>> result = process_workflow(123, ['plan', 'build', 'test'])
        >>> print(result['adw_id'])
        'a1b2c3d4'
    """
    # Implementation...
```

### Inline Comments

Use inline comments sparingly - Good code should be self-documenting:

```javascript
// Good: Explains WHY, not WHAT
// WebSocket reconnection must use exponential backoff to prevent
// server overload during network instability
const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);

// Bad: Explains WHAT (obvious from code)
// Set backoff to exponential value
const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
```

## Testing Requirements

### Test Coverage Goals

- **Minimum**: 40% overall coverage
- **Target**: 70% overall coverage
- **Critical paths**: 90%+ coverage (authentication, data persistence, workflow orchestration)

### Frontend Testing

Use **Jest** or **Vitest** with **React Testing Library**:

```javascript
/**
 * @fileoverview Tests for TaskCard component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from './TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    id: '123',
    title: 'Test Task',
    description: 'Test description',
    status: 'todo'
  };

  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<TaskCard task={mockTask} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockTask.id);
  });
});
```

### Backend Testing

Use **pytest** with fixtures:

```python
"""
Tests for workflow orchestration module.
"""

import pytest
from pathlib import Path
from adw_modules.orchestrator import WorkflowOrchestrator

@pytest.fixture
def orchestrator():
    """Create orchestrator instance for testing."""
    return WorkflowOrchestrator()

def test_create_worktree(orchestrator, tmp_path):
    """Test worktree creation with valid ADW ID."""
    adw_id = "a1b2c3d4"
    branch = "test-branch"

    worktree_path = orchestrator.create_worktree(adw_id, branch)

    assert worktree_path.exists()
    assert worktree_path.name == adw_id

def test_create_worktree_duplicate_fails(orchestrator):
    """Test that creating duplicate worktree raises error."""
    adw_id = "a1b2c3d4"

    orchestrator.create_worktree(adw_id, "branch1")

    with pytest.raises(ValueError, match="already exists"):
        orchestrator.create_worktree(adw_id, "branch2")
```

### Running Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd app/server && uv run pytest

# With coverage
npm run test -- --coverage
cd app/server && uv run pytest --cov=. --cov-report=term

# Specific test file
npm run test TaskCard.test.jsx
uv run pytest tests/test_orchestrator.py
```

### Test Requirements for PRs

- All new code must have tests
- Existing tests must pass
- Coverage should not decrease
- Integration tests for critical workflows

## Pull Request Process

### Before Creating a PR

1. **Update from main**
```bash
git checkout main
git pull origin main
git checkout your-branch
git rebase main
```

2. **Run all validation**
```bash
npm run validate  # Runs lint, typecheck, build, test
cd app/server && uv run pytest
```

3. **Update documentation**
- Add/update file headers
- Update README.md if needed
- Update ARCHITECTURE.md for architectural changes

4. **Write good commit messages**
- Follow Conventional Commits format
- Explain WHY, not just WHAT

### Creating the PR

1. **Push your branch**
```bash
git push origin your-branch
```

2. **Create PR via GitHub CLI or web interface**
```bash
gh pr create --title "feat: add user authentication" --body "$(cat <<EOF
## Summary
- Implements JWT-based authentication
- Adds login/logout endpoints
- Adds authentication middleware

## Testing
- Added unit tests for auth module
- Tested login/logout flow manually
- All existing tests pass

## Documentation
- Updated API documentation
- Added authentication guide to README

Closes #123
EOF
)"
```

3. **PR Title Format**
```
<type>: <brief description>

Examples:
feat: add drag-and-drop task reordering
fix: resolve WebSocket reconnection loop
refactor: split kanban store into focused stores
docs: update ADW workflow documentation
```

4. **PR Description Template**

```markdown
## Summary
- Bullet points describing changes
- Keep it concise

## Test Plan
- How to test the changes
- What scenarios were tested

## Documentation
- What documentation was added/updated

## Screenshots (if UI changes)
[Add screenshots]

Closes #<issue-number>
```

### PR Review Checklist

Before requesting review, ensure:

- [ ] Code follows style guidelines
- [ ] All files have headers
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No console.log/print statements
- [ ] No commented-out code
- [ ] No TODO comments (create issues instead)
- [ ] Commit messages are clear
- [ ] PR description is complete

## Code Review Guidelines

### For Reviewers

**What to Look For:**

1. **Correctness**: Does the code do what it claims?
2. **Tests**: Are there adequate tests?
3. **Documentation**: Is the code well-documented?
4. **Style**: Does it follow project conventions?
5. **Performance**: Are there obvious performance issues?
6. **Security**: Are there security vulnerabilities?
7. **Maintainability**: Is the code easy to understand and modify?

**Review Etiquette:**

- Be respectful and constructive
- Explain WHY, not just WHAT to change
- Suggest alternatives, don't just criticize
- Approve if minor issues remain (can be fixed in follow-up)
- Use labels:
  - `nit:` - Minor issue, not blocking
  - `question:` - Seeking clarification
  - `blocker:` - Must be fixed before merge

**Example Comments:**

```
Good:
"Consider extracting this 50-line function into smaller helpers.
This would make it easier to test and understand. For example,
the validation logic could be in `validateTaskInput()`"

Bad:
"This function is too long"
```

### For Authors

**Responding to Reviews:**

- Address all comments (even if you disagree)
- Mark conversations as resolved when fixed
- Explain your reasoning if you disagree
- Push fixup commits, don't force-push during review
- Request re-review when ready

**If You Disagree:**

- Explain your reasoning politely
- Provide alternatives
- Be open to compromise
- If blocked, escalate to maintainer

## Additional Guidelines

### Security

- Never commit secrets (API keys, tokens, passwords)
- Use environment variables for sensitive data
- Validate all user input
- Sanitize output to prevent XSS
- Use parameterized queries to prevent SQL injection

### Performance

- Avoid O(n²) algorithms when possible
- Use pagination for large data sets
- Memoize expensive computations
- Lazy load heavy components
- Profile before optimizing

### Accessibility

- Use semantic HTML
- Include ARIA labels where needed
- Support keyboard navigation
- Test with screen readers
- Maintain color contrast ratios

## Questions?

If you have questions about contributing:
- Check existing documentation
- Search closed issues/PRs for similar situations
- Open a discussion on GitHub
- Reach out to maintainers

Thank you for contributing to AgenticKanban!
