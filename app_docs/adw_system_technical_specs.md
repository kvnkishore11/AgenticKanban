# ADW System Technical Specifications

Complete technical reference for the ADW system's data models, APIs, and internal mechanics.

## Table of Contents

1. [Data Models](#data-models)
2. [State Management API](#state-management-api)
3. [Agent Execution API](#agent-execution-api)
4. [Worktree Operations API](#worktree-operations-api)
5. [Git Operations API](#git-operations-api)
6. [GitHub Integration API](#github-integration-api)
7. [WebSocket Protocol](#websocket-protocol)
8. [Environment Variables](#environment-variables)
9. [Error Codes & Retry Logic](#error-codes--retry-logic)

---

## Data Models

All data models use Pydantic for validation and serialization.

### ADWStateData

Core state model stored in `agents/<adw_id>/adw_state.json`.

```python
class ADWStateData(BaseModel):
    """Minimal persistent state for ADW workflow."""

    # Required fields
    adw_id: str  # 8-character unique identifier

    # Core workflow fields (Optional until populated)
    issue_number: Optional[str] = None
    branch_name: Optional[str] = None
    plan_file: Optional[str] = None  # Relative path to spec file
    issue_class: Optional[IssueClassSlashCommand] = None  # /chore, /bug, /feature

    # Isolation fields (For worktree-based workflows)
    worktree_path: Optional[str] = None  # Absolute path to worktree
    backend_port: Optional[int] = None   # Deprecated
    websocket_port: Optional[int] = None  # 8500-8514
    frontend_port: Optional[int] = None   # 9200-9214

    # Configuration
    model_set: Optional[ModelSet] = "base"  # "base" or "heavy"

    # Tracking
    all_adws: List[str] = Field(default_factory=list)  # Related ADW IDs

    # Kanban mode support
    data_source: Optional[Literal["github", "kanban"]] = "github"
    issue_json: Optional[dict] = None  # Kanban-provided issue data

    # Workflow completion
    completed: Optional[bool] = False

    # Patch workflow support
    patch_file: Optional[str] = None  # Current patch file path
    patch_history: Optional[List[dict]] = Field(default_factory=list)
    patch_source_mode: Optional[Literal["github", "kanban"]] = None
```

**Example State File:**

```json
{
  "adw_id": "3f8a2b1c",
  "issue_number": "456",
  "branch_name": "feat-issue-456-adw-3f8a2b1c-add-csv-export",
  "plan_file": "specs/issue-456-adw-3f8a2b1c-add-csv-export.md",
  "issue_class": "/feature",
  "worktree_path": "/Users/user/project/trees/3f8a2b1c",
  "backend_port": null,
  "websocket_port": 8509,
  "frontend_port": 9209,
  "model_set": "base",
  "all_adws": ["3f8a2b1c"],
  "data_source": "github",
  "issue_json": null,
  "completed": false,
  "patch_file": null,
  "patch_history": [],
  "patch_source_mode": null
}
```

---

### GitHubIssue

Model for GitHub issue data.

```python
class GitHubIssue(BaseModel):
    """GitHub issue model."""

    number: int
    title: str
    body: str
    state: str  # "open" or "closed"
    author: GitHubUser
    assignees: List[GitHubUser] = []
    labels: List[GitHubLabel] = []
    milestone: Optional[GitHubMilestone] = None
    comments: List[GitHubComment] = []
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    closed_at: Optional[datetime] = Field(None, alias="closedAt")
    url: str

    class Config:
        populate_by_name = True
```

**Example:**

```json
{
  "number": 456,
  "title": "Add CSV export button",
  "body": "Users should be able to export...",
  "state": "open",
  "author": {
    "login": "johndoe",
    "name": "John Doe",
    "is_bot": false
  },
  "labels": [
    {"id": "1", "name": "enhancement", "color": "a2eeef"}
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:05:00Z",
  "url": "https://github.com/owner/repo/issues/456"
}
```

---

### AgentPromptRequest

Configuration for executing Claude Code with a custom prompt.

```python
class AgentPromptRequest(BaseModel):
    """Claude Code agent prompt configuration."""

    prompt: str  # The prompt text to send to Claude
    adw_id: str  # ADW instance identifier
    agent_name: str = "ops"  # Agent name for logging
    model: Literal["sonnet", "haiku", "opus"] = "sonnet"
    dangerously_skip_permissions: bool = False
    output_file: str  # Path to JSONL output file
    working_dir: Optional[str] = None  # Working directory (worktree path)
```

---

### AgentTemplateRequest

Configuration for executing slash commands via templates.

```python
class AgentTemplateRequest(BaseModel):
    """Claude Code agent template execution request."""

    agent_name: str  # e.g., "sdlc_planner"
    slash_command: SlashCommand  # e.g., "/implement"
    args: List[str]  # Command arguments
    adw_id: str
    model: Literal["sonnet", "haiku", "opus"] = "sonnet"
    working_dir: Optional[str] = None  # Worktree path for isolated execution
```

**Example:**

```python
request = AgentTemplateRequest(
    agent_name="sdlc_implementor",
    slash_command="/implement",
    args=["specs/issue-456-adw-3f8a2b1c-add-csv-export.md"],
    adw_id="3f8a2b1c",
    model="sonnet",
    working_dir="/path/to/trees/3f8a2b1c"
)
```

---

### AgentPromptResponse

Response from Claude Code execution.

```python
class AgentPromptResponse(BaseModel):
    """Claude Code agent response."""

    output: str  # Final result or error message
    success: bool  # Whether execution succeeded
    session_id: Optional[str] = None  # Claude session ID
    retry_code: RetryCode = RetryCode.NONE  # Retry indicator
```

---

### ReviewResult

Result from the review phase.

```python
class ReviewResult(BaseModel):
    """Result from reviewing implementation against specification."""

    success: bool
    review_summary: str  # 2-4 sentences
    review_issues: List[ReviewIssue] = []
    screenshots: List[str] = []  # Local paths
    screenshot_urls: List[str] = []  # Public URLs (after R2 upload)
```

**ReviewIssue:**

```python
class ReviewIssue(BaseModel):
    """Individual review issue."""

    review_issue_number: int
    screenshot_path: str  # Local path
    screenshot_url: Optional[str] = None  # Public URL
    issue_description: str
    issue_resolution: str
    issue_severity: Literal["skippable", "tech_debt", "blocker"]
```

---

## State Management API

The `ADWState` class provides state persistence and access.

### Creating State

```python
from adw_modules.state import ADWState

# Create new state
state = ADWState(adw_id="3f8a2b1c")

# Update fields
state.update(
    issue_number="456",
    branch_name="feat-issue-456-adw-3f8a2b1c-add-csv-export",
    plan_file="specs/issue-456-adw-3f8a2b1c-add-csv-export.md",
    worktree_path="/path/to/trees/3f8a2b1c",
    websocket_port=8509,
    frontend_port=9209
)

# Save to file (agents/3f8a2b1c/adw_state.json)
state.save("plan_phase")
```

### Loading State

```python
# Load existing state
state = ADWState.load("3f8a2b1c", logger=logger)

if state:
    worktree = state.get("worktree_path")
    ports = (state.get("websocket_port"), state.get("frontend_port"))
else:
    print("State not found")
```

### State Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `update(**kwargs)` | Update state fields | None |
| `get(key, default)` | Get field value | Any |
| `save(workflow_step)` | Save to file | None |
| `load(adw_id, logger)` | Load from file (class method) | `Optional[ADWState]` |
| `mark_completed()` | Set completed=true | None |
| `is_completed()` | Check if completed | bool |
| `get_working_directory()` | Get worktree or main repo path | str |
| `get_state_path()` | Get path to state file | str |
| `append_adw_id(adw_id)` | Add to all_adws list | None |

---

## Agent Execution API

The `agent.py` module handles Claude Code execution.

### Executing Templates (Slash Commands)

```python
from adw_modules.agent import execute_template
from adw_modules.data_types import AgentTemplateRequest

request = AgentTemplateRequest(
    agent_name="sdlc_implementor",
    slash_command="/implement",
    args=["specs/issue-456-adw-3f8a2b1c-add-csv-export.md"],
    adw_id="3f8a2b1c",
    working_dir="/path/to/trees/3f8a2b1c"
)

response = execute_template(request)

if response.success:
    print(f"Success: {response.output}")
else:
    print(f"Error: {response.output}")
```

### Executing Custom Prompts

```python
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest

request = AgentPromptRequest(
    prompt="Analyze the codebase and list all components",
    adw_id="3f8a2b1c",
    agent_name="analyzer",
    model="sonnet",
    output_file="agents/3f8a2b1c/analyzer/raw_output.jsonl",
    working_dir="/path/to/trees/3f8a2b1c"
)

response = prompt_claude_code(request)
```

### Model Selection

Models are automatically selected based on state and slash command:

```python
from adw_modules.agent import get_model_for_slash_command

request = AgentTemplateRequest(
    slash_command="/implement",
    adw_id="3f8a2b1c",
    # ...
)

# Returns "sonnet" for base model set, or "opus" for heavy
model = get_model_for_slash_command(request)
```

**Model Mapping:**

```python
SLASH_COMMAND_MODEL_MAP = {
    "/classify_issue": {"base": "sonnet", "heavy": "sonnet"},
    "/implement": {"base": "sonnet", "heavy": "opus"},
    "/test": {"base": "sonnet", "heavy": "sonnet"},
    "/review": {"base": "sonnet", "heavy": "opus"},
    "/document": {"base": "sonnet", "heavy": "opus"},
    # ... more commands
}
```

---

## Worktree Operations API

The `worktree_ops.py` module manages isolated worktrees.

### Creating Worktrees

```python
from adw_modules.worktree_ops import create_worktree

worktree_path, error = create_worktree(
    adw_id="3f8a2b1c",
    branch_name="feat-issue-456-adw-3f8a2b1c-add-csv-export",
    logger=logger
)

if worktree_path:
    print(f"Worktree created: {worktree_path}")
else:
    print(f"Error: {error}")
```

**What it does:**

1. Creates `trees/<adw_id>/` directory
2. Runs `git worktree add -b <branch> trees/<adw_id> main`
3. Returns absolute path to worktree

### Validating Worktrees

```python
from adw_modules.worktree_ops import validate_worktree

is_valid, error = validate_worktree(adw_id="3f8a2b1c", state=state)

if is_valid:
    print("Worktree is valid")
else:
    print(f"Validation failed: {error}")
```

**Checks:**

1. State has `worktree_path`
2. Directory exists on filesystem
3. Git knows about the worktree (`git worktree list`)

### Port Allocation

```python
from adw_modules.worktree_ops import get_ports_for_adw, find_next_available_ports

# Deterministic port assignment
ws_port, fe_port = get_ports_for_adw("3f8a2b1c")
# Returns: (8509, 9209)

# Find available ports (with fallback)
ws_port, fe_port = find_next_available_ports("3f8a2b1c")
# Returns: First available pair in range
```

**Port Allocation Algorithm:**

```python
def get_ports_for_adw(adw_id: str) -> Tuple[int, int]:
    # Convert first 8 chars to base 36, mod 15
    id_chars = ''.join(c for c in adw_id[:8] if c.isalnum())
    index = int(id_chars, 36) % 15

    websocket_port = 8500 + index  # Range: 8500-8514
    frontend_port = 9200 + index   # Range: 9200-9214

    return websocket_port, frontend_port
```

### Environment Setup

```python
from adw_modules.worktree_ops import setup_worktree_environment

setup_worktree_environment(
    worktree_path="/path/to/trees/3f8a2b1c",
    websocket_port=8509,
    frontend_port=9209,
    logger=logger
)
```

**Creates `.ports.env` file:**

```bash
WEBSOCKET_PORT=8509
FRONTEND_PORT=9209
VITE_BACKEND_URL=http://localhost:8509
```

### Removing Worktrees

```python
from adw_modules.worktree_ops import remove_worktree

success, error = remove_worktree(adw_id="3f8a2b1c", logger=logger)

if success:
    print("Worktree removed")
else:
    print(f"Error: {error}")
```

---

## Git Operations API

The `git_ops.py` module provides git utilities.

### Creating Branches

```python
from adw_modules.git_ops import create_branch

success, error = create_branch(
    branch_name="feat-issue-456-adw-3f8a2b1c-add-csv-export",
    cwd="/path/to/trees/3f8a2b1c"  # Optional: worktree path
)
```

### Committing Changes

```python
from adw_modules.git_ops import commit_changes

success, error = commit_changes(
    message="feat: implement CSV export button",
    cwd="/path/to/trees/3f8a2b1c",
    state=state  # For kanban mode detection
)
```

### Pushing Branches

```python
from adw_modules.git_ops import push_branch

success, error = push_branch(
    branch_name="feat-issue-456-adw-3f8a2b1c-add-csv-export",
    cwd="/path/to/trees/3f8a2b1c"
)
```

### Checking PRs

```python
from adw_modules.git_ops import check_pr_exists, get_pr_number

pr_url = check_pr_exists("feat-issue-456-adw-3f8a2b1c-add-csv-export")
# Returns: "https://github.com/owner/repo/pull/123" or None

pr_number = get_pr_number("feat-issue-456-adw-3f8a2b1c-add-csv-export")
# Returns: "123" or None
```

### Approving and Merging PRs

```python
from adw_modules.git_ops import approve_pr, merge_pr

# Approve PR
success, error = approve_pr(pr_number="123", logger=logger)

# Merge PR
success, error = merge_pr(
    pr_number="123",
    merge_method="squash",  # or "merge" or "rebase"
    logger=logger
)
```

---

## GitHub Integration API

The `github.py` module handles GitHub API operations.

### Fetching Issues

```python
from adw_modules.github import fetch_issue

issue = fetch_issue(issue_number="456", logger=logger)

if issue:
    print(f"Title: {issue.title}")
    print(f"Body: {issue.body}")
    print(f"Labels: {[label.name for label in issue.labels]}")
```

### Posting Comments

```python
from adw_modules.github import post_issue_comment

post_issue_comment(
    issue_number="456",
    comment="ADW workflow started. ADW ID: 3f8a2b1c",
    logger=logger
)
```

### Creating PRs

```python
from adw_modules.workflow_ops import create_pull_request

pr_url, error = create_pull_request(
    branch_name="feat-issue-456-adw-3f8a2b1c-add-csv-export",
    issue=issue,
    state=state,
    logger=logger,
    working_dir="/path/to/trees/3f8a2b1c"
)

if pr_url:
    print(f"PR created: {pr_url}")
```

---

## WebSocket Protocol

The WebSocket trigger and notifier use a JSON message protocol.

### Trigger Workflow Request

**Client → Server:**

```json
{
  "type": "trigger_workflow",
  "data": {
    "workflow_type": "adw_plan_build_iso",
    "adw_id": "3f8a2b1c",  // Optional: use existing
    "issue_number": "456",
    "model_set": "base",  // or "heavy"
    "trigger_reason": "Kanban task progression",
    "kanban_data": {  // Optional: kanban-provided issue
      "title": "Add CSV export",
      "body": "Users should be able to...",
      "labels": ["enhancement"],
      "images": ["data:image/png;base64,..."]
    }
  }
}
```

**Server → Client (Response):**

```json
{
  "type": "trigger_response",
  "data": {
    "status": "accepted",
    "adw_id": "3f8a2b1c",
    "workflow_name": "adw_plan_build_iso",
    "message": "Workflow triggered successfully",
    "logs_path": "agents/3f8a2b1c/adw_plan_build_iso/"
  }
}
```

### Status Updates

**Server → Client (Progress):**

```json
{
  "type": "status_update",
  "data": {
    "adw_id": "3f8a2b1c",
    "workflow_name": "adw_plan_build_iso",
    "status": "in_progress",
    "message": "Building implementation",
    "timestamp": "2024-01-15T10:30:00Z",
    "progress_percent": 50,
    "current_step": "build_phase"
  }
}
```

### State Change Notification

**Server → Client (State Changed):**

```json
{
  "type": "state_change",
  "data": {
    "adw_id": "3f8a2b1c",
    "workflow_step": "build_phase",
    "changed_fields": ["branch_name", "plan_file"],
    "state_snapshot": {
      "adw_id": "3f8a2b1c",
      "issue_number": "456",
      "branch_name": "feat-issue-456-adw-3f8a2b1c-add-csv-export",
      "plan_file": "specs/issue-456-adw-3f8a2b1c-add-csv-export.md",
      "completed": false
    }
  }
}
```

---

## Environment Variables

Required and optional environment variables.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `GITHUB_REPO_URL` | Repository URL | `https://github.com/owner/repo` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_CODE_PATH` | Path to Claude CLI | `claude` |
| `GITHUB_PAT` | GitHub Personal Access Token | Uses `gh auth` |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature validation | None |
| `WEBSOCKET_PORT` | WebSocket server port | `8500` |
| `ADW_DEBUG` | Enable verbose logging | `false` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | None |
| `R2_ACCESS_KEY_ID` | R2 access key | None |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | None |
| `R2_BUCKET_NAME` | R2 bucket name | None |

### Environment File Examples

**.env (Main Repository):**

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
GITHUB_REPO_URL=https://github.com/owner/repo
CLAUDE_CODE_PATH=/usr/local/bin/claude

# Optional
GITHUB_PAT=ghp_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=adw-screenshots
```

**.ports.env (Worktree Specific):**

```bash
WEBSOCKET_PORT=8509
FRONTEND_PORT=9209
VITE_BACKEND_URL=http://localhost:8509
```

---

## Error Codes & Retry Logic

The system uses retry codes to determine if operations should be retried.

### RetryCode Enum

```python
class RetryCode(str, Enum):
    """Codes indicating different types of errors."""

    CLAUDE_CODE_ERROR = "claude_code_error"  # General CLI error
    TIMEOUT_ERROR = "timeout_error"  # Command timed out
    EXECUTION_ERROR = "execution_error"  # Error during execution
    ERROR_DURING_EXECUTION = "error_during_execution"  # Agent error
    NONE = "none"  # No retry needed
```

### Retry Logic

```python
from adw_modules.agent import prompt_claude_code_with_retry

response = prompt_claude_code_with_retry(
    request=request,
    max_retries=3,
    retry_delays=[1, 3, 5]  # Seconds between retries
)
```

**Retry Algorithm:**

1. Execute request
2. If `success=True` or `retry_code=NONE`, return immediately
3. If `retry_code` is retryable and attempts < max_retries:
   - Wait retry_delay seconds
   - Retry execution
4. After max_retries, return last response

**Retryable Errors:**

- `CLAUDE_CODE_ERROR`: CLI execution failed
- `TIMEOUT_ERROR`: Command exceeded timeout
- `EXECUTION_ERROR`: Subprocess error
- `ERROR_DURING_EXECUTION`: Agent reported error

**Non-Retryable:**

- `NONE`: Operation succeeded or failed permanently

---

## Summary

This technical specification provides:

1. **Data Models**: Complete Pydantic models with examples
2. **State Management**: API for creating, loading, and updating state
3. **Agent Execution**: How to execute Claude Code programmatically
4. **Worktree Operations**: Creating, validating, and managing worktrees
5. **Git Operations**: Git utilities for branches, commits, PRs
6. **GitHub Integration**: Fetching issues, posting comments, creating PRs
7. **WebSocket Protocol**: Message formats for real-time communication
8. **Environment Variables**: Required and optional configuration
9. **Error Handling**: Retry logic and error codes

Use this alongside:
- [Deep Dive Guide](./adw_system_deep_dive.md) for architecture
- [Quick Reference](./adw_system_quick_reference.md) for examples
