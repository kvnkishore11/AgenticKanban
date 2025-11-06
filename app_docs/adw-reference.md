# ADW (AI Developer Workflow) Reference Guide

A quick reference guide for all ADW workflows available in the system. For detailed documentation, see [adws/README.md](../adws/README.md).

## Quick Reference Table

| Script Name | Category | Description | Usage Pattern |
|-------------|----------|-------------|---------------|
| `adw_plan_iso.py` | Entry Point | Creates worktree and generates implementation plans | `uv run adw_plan_iso.py <issue-number> [adw-id]` |
| `adw_patch_iso.py` | Entry Point | Quick patches in isolated environment | `uv run adw_patch_iso.py <issue-number> [adw-id]` |
| `adw_build_iso.py` | Dependent | Implements solutions in existing worktree | `uv run adw_build_iso.py <issue-number> <adw-id>` |
| `adw_test_iso.py` | Dependent | Runs tests in isolated environment | `uv run adw_test_iso.py <issue-number> <adw-id> [--skip-e2e]` |
| `adw_review_iso.py` | Dependent | Reviews implementation with screenshots | `uv run adw_review_iso.py <issue-number> <adw-id> [--skip-resolution]` |
| `adw_document_iso.py` | Dependent | Generates documentation in isolation | `uv run adw_document_iso.py <issue-number> <adw-id>` |
| `adw_ship_iso.py` | Utility | Approves and merges PR to main | `uv run adw_ship_iso.py <issue-number> <adw-id>` |
| `adw_merge_worktree.py` | Utility | Directly merges worktree branch to main | `uv run adw_merge_worktree.py <adw-id> [merge-method]` |
| `adw_complete_iso.py` | Orchestrator | Workflow completion orchestrator | `uv run adw_complete_iso.py <issue-number> <adw-id>` |
| `adw_plan_build_iso.py` | Orchestrator | Plan + Build pipeline | `uv run adw_plan_build_iso.py <issue-number> [adw-id]` |
| `adw_plan_build_test_iso.py` | Orchestrator | Plan + Build + Test pipeline | `uv run adw_plan_build_test_iso.py <issue-number> [adw-id]` |
| `adw_plan_build_review_iso.py` | Orchestrator | Plan + Build + Review (skip tests) | `uv run adw_plan_build_review_iso.py <issue-number> [adw-id]` |
| `adw_plan_build_test_review_iso.py` | Orchestrator | Plan + Build + Test + Review | `uv run adw_plan_build_test_review_iso.py <issue-number> [adw-id]` |
| `adw_plan_build_document_iso.py` | Orchestrator | Plan + Build + Document | `uv run adw_plan_build_document_iso.py <issue-number> [adw-id]` |
| `adw_sdlc_iso.py` | Orchestrator | Complete SDLC pipeline | `uv run adw_sdlc_iso.py <issue-number> [adw-id] [--skip-e2e] [--skip-resolution]` |
| `adw_sdlc_zte_iso.py` | Orchestrator | Zero Touch Execution with auto-ship | `uv run adw_sdlc_zte_iso.py <issue-number> [adw-id] [--skip-e2e] [--skip-resolution]` |

## Entry Point Workflows

These workflows **create new worktrees** and can be run without an existing ADW ID.

### adw_plan_iso.py - Isolated Planning

**Purpose:** Creates isolated worktree and generates implementation plans.

**Usage:**
```bash
uv run adw_plan_iso.py <issue-number> [adw-id]
```

**What it does:**
- Creates isolated git worktree at `trees/<adw_id>/`
- Allocates unique ports (WebSocket: 8500-8514, frontend: 9200-9214)
- Sets up environment with `.ports.env`
- Fetches issue details and classifies type
- Creates feature branch in worktree
- Generates implementation plan in isolation
- Commits and pushes from worktree
- Creates/updates pull request

**When to use:**
- You want to generate a plan without implementing it immediately
- You need to review the plan before starting implementation
- You're planning a complex feature that requires careful review

---

### adw_patch_iso.py - Isolated Patch Workflow

**Purpose:** Quick patches in isolated environment triggered by 'adw_patch' keyword.

**Usage:**
```bash
uv run adw_patch_iso.py <issue-number> [adw-id]
```

**What it does:**
- Searches for 'adw_patch' in issue/comments
- Creates isolated worktree with unique ports
- Creates targeted patch plan in isolation
- Implements specific changes
- Commits and creates PR from worktree

**When to use:**
- Small, focused changes that don't need a full plan
- Quick bug fixes
- Minor adjustments to existing features
- Issues marked with 'adw_patch' keyword

---

## Dependent Workflows

These workflows **require an existing worktree** created by an entry point workflow. ADW ID is mandatory.

### adw_build_iso.py - Isolated Implementation

**Purpose:** Implements solutions in existing isolated environment.

**Usage:**
```bash
uv run adw_build_iso.py <issue-number> <adw-id>
```

**Requirements:**
- Existing worktree created by `adw_plan_iso.py` or `adw_patch_iso.py`
- ADW ID is mandatory

**What it does:**
- Validates worktree exists
- Switches to correct branch if needed
- Locates plan file in worktree
- Implements solution in isolated environment
- Commits and pushes from worktree

**When to use:**
- After reviewing the plan from `adw_plan_iso.py`
- When you want to implement an existing plan
- Re-running implementation after changes

---

### adw_test_iso.py - Isolated Testing

**Purpose:** Runs tests in isolated environment.

**Usage:**
```bash
uv run adw_test_iso.py <issue-number> <adw-id> [--skip-e2e]
```

**Requirements:**
- Existing worktree
- ADW ID is mandatory

**What it does:**
- Validates worktree exists
- Runs tests with allocated ports
- Auto-resolves failures in isolation
- Optionally runs E2E tests
- Commits results from worktree

**When to use:**
- After implementation to verify functionality
- Running tests in isolated environment
- Debugging test failures with auto-resolution
- Use `--skip-e2e` to skip end-to-end tests

---

### adw_review_iso.py - Isolated Review

**Purpose:** Reviews implementation in isolated environment.

**Usage:**
```bash
uv run adw_review_iso.py <issue-number> <adw-id> [--skip-resolution]
```

**Requirements:**
- Existing worktree
- ADW ID is mandatory

**What it does:**
- Validates worktree exists
- Reviews against spec in isolation
- Captures screenshots using allocated ports
- Auto-resolves blockers in worktree
- Uploads screenshots and commits

**When to use:**
- After implementation to validate against requirements
- Capturing visual proof of functionality
- Automated code review with screenshot evidence
- Use `--skip-resolution` to skip automatic blocker resolution

---

### adw_document_iso.py - Isolated Documentation

**Purpose:** Generates documentation in isolated environment.

**Usage:**
```bash
uv run adw_document_iso.py <issue-number> <adw-id>
```

**Requirements:**
- Existing worktree
- ADW ID is mandatory

**What it does:**
- Validates worktree exists
- Analyzes changes in worktree
- Generates documentation in isolation
- Commits to `app_docs/` from worktree

**When to use:**
- After implementation to generate comprehensive docs
- Creating technical documentation for features
- Documenting complex changes automatically

---

## Orchestrator Workflows

These workflows **chain multiple phases together** for streamlined development.

### adw_plan_build_iso.py - Plan + Build

**Purpose:** Runs planning and building in isolation.

**Usage:**
```bash
uv run adw_plan_build_iso.py <issue-number> [adw-id]
```

**Phases:**
1. Plan (creates worktree)
2. Build

**When to use:**
- Most common workflow for straightforward features
- When you want to go from issue to implementation quickly
- Skip testing and review for simple changes

---

### adw_plan_build_test_iso.py - Plan + Build + Test

**Purpose:** Full pipeline with testing in isolation.

**Usage:**
```bash
uv run adw_plan_build_test_iso.py <issue-number> [adw-id]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Test

**When to use:**
- Features that need automated testing
- When you want verification before manual review
- Ensuring tests pass before creating PR

---

### adw_plan_build_test_review_iso.py - Plan + Build + Test + Review

**Purpose:** Complete pipeline with review in isolation.

**Usage:**
```bash
uv run adw_plan_build_test_review_iso.py <issue-number> [adw-id]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Test
4. Review

**When to use:**
- Complex features requiring full validation
- When you need screenshot evidence
- Features requiring comprehensive testing and review

---

### adw_plan_build_review_iso.py - Plan + Build + Review (Skip Tests)

**Purpose:** Pipeline with review, skipping tests.

**Usage:**
```bash
uv run adw_plan_build_review_iso.py <issue-number> [adw-id]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Review (skip tests)

**When to use:**
- UI/visual changes that need screenshot validation
- Documentation changes
- When tests aren't applicable
- Quick reviews without test overhead

---

### adw_plan_build_document_iso.py - Plan + Build + Document

**Purpose:** Documentation pipeline in isolation.

**Usage:**
```bash
uv run adw_plan_build_document_iso.py <issue-number> [adw-id]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Document

**When to use:**
- Features requiring documentation
- Complex implementations needing technical guides
- Creating comprehensive feature documentation

---

### adw_sdlc_iso.py - Complete SDLC

**Purpose:** Full Software Development Life Cycle in isolation.

**Usage:**
```bash
uv run adw_sdlc_iso.py <issue-number> [adw-id] [--skip-e2e] [--skip-resolution]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Test
4. Review
5. Document

**Output:**
- Isolated worktree at `trees/<adw_id>/`
- Feature implementation on dedicated branch
- Test results with port isolation
- Review screenshots from isolated instance
- Complete documentation in `app_docs/`

**When to use:**
- Production-ready features
- Complex features requiring full validation
- When you need complete documentation and evidence
- Most comprehensive automated workflow

---

### adw_sdlc_zte_iso.py - Zero Touch Execution

**Purpose:** Complete SDLC with automatic shipping - no human intervention required.

**Usage:**
```bash
uv run adw_sdlc_zte_iso.py <issue-number> [adw-id] [--skip-e2e] [--skip-resolution]
```

**Phases:**
1. Plan (creates worktree)
2. Build
3. Test (stops on failure)
4. Review (stops on failure)
5. Document
6. Ship (automatically approves and merges PR)

**WARNING:** This workflow will automatically merge code to main if all phases pass!

**When to use:**
- Trusted automated deployments
- CI/CD pipelines with confidence
- Low-risk changes that can be auto-merged
- When you want complete automation end-to-end

**When NOT to use:**
- Critical production changes requiring human approval
- Features with security implications
- First-time use of ADW system
- Changes you want to review manually before merge

---

### adw_complete_iso.py - Workflow Completion Orchestrator

**Purpose:** Workflow completion orchestrator.

**Usage:**
```bash
uv run adw_complete_iso.py <issue-number> <adw-id>
```

**Requirements:**
- Existing worktree and ADW state
- ADW ID is mandatory

**When to use:**
- Completing workflows
- Finalization tasks

---

## Utility Workflows

### adw_ship_iso.py - Approve and Merge PR

**Purpose:** Final shipping phase that validates state and merges to main.

**Usage:**
```bash
uv run adw_ship_iso.py <issue-number> <adw-id>
```

**Requirements:**
- Complete ADWState with all fields populated
- Existing worktree and PR
- ADW ID is mandatory

**What it does:**
1. Validates all ADWState fields have values
2. Verifies worktree exists
3. Finds PR for the branch
4. Approves the PR
5. Merges PR to main using squash method

**State validation ensures:**
- `adw_id` is set
- `issue_number` is set
- `branch_name` exists
- `plan_file` was created
- `issue_class` was determined
- `worktree_path` exists
- `websocket_port` and `frontend_port` allocated

**When to use:**
- After SDLC workflow completion
- Manual PR approval and merge
- When you want control over merge timing
- Alternative to auto-ship in ZTE workflow

---

### adw_merge_worktree.py - Direct Worktree Merge

**Purpose:** Alternative to PR-based shipping that directly merges a worktree branch into main.

**Usage:**
```bash
uv run adw_merge_worktree.py <adw-id> [merge-method]

# Examples
uv run adw_merge_worktree.py a1b2c3d4 squash    # Default: squash merge
uv run adw_merge_worktree.py a1b2c3d4 merge     # Regular merge (no-ff)
uv run adw_merge_worktree.py a1b2c3d4 rebase    # Rebase merge
```

**Requirements:**
- Existing worktree with ADW state
- ADW ID is mandatory
- Works with or without issue number

**What it does:**
1. Loads ADW state and validates worktree exists
2. Fetches latest changes from origin
3. Checks out main and pulls latest
4. Merges the feature branch using specified strategy
5. Detects and resolves merge conflicts with Claude Code
6. Runs validation tests (pytest) to ensure clean merge
7. Pushes merged changes to origin/main
8. Cleans up worktree directory
9. Deletes remote branch
10. Updates ADW state with merge status

**Conflict Resolution:**
If merge conflicts are detected, the workflow automatically invokes Claude Code in headless mode to resolve them. Claude analyzes the conflicts and applies best practices for resolution. If conflicts cannot be auto-resolved, the merge is aborted safely.

**Comparison with adw_ship_iso.py:**

| Feature | adw_ship_iso.py | adw_merge_worktree.py |
|---------|-----------------|------------------------|
| Requires PR | Yes | No |
| PR Approval | Required | N/A |
| GitHub Integration | Full | Optional (comments only) |
| Merge Method | Squash only | Squash, Merge, or Rebase |
| Conflict Resolution | Manual | Automatic with Claude Code |
| Worktree Cleanup | Manual | Automatic |
| Use Case | GitHub-centric workflow | Direct merge, flexible workflow |

**When to use:**
- You want to merge without creating/managing a PR
- You need flexibility in merge strategy (squash vs merge vs rebase)
- You're working without an issue number
- You want automatic conflict resolution
- You prefer direct git operations over GitHub PR workflow

---

## How to Choose the Right ADW

### Decision Tree

1. **Do you need to merge automatically?**
   - YES: Use `adw_sdlc_zte_iso.py` (Zero Touch Execution)
   - NO: Continue to step 2

2. **Is this a quick patch or small fix?**
   - YES: Use `adw_patch_iso.py`
   - NO: Continue to step 3

3. **Do you need the complete SDLC (Plan + Build + Test + Review + Document)?**
   - YES: Use `adw_sdlc_iso.py`
   - NO: Continue to step 4

4. **What phases do you need?**
   - Plan only: `adw_plan_iso.py`
   - Plan + Build: `adw_plan_build_iso.py`
   - Plan + Build + Test: `adw_plan_build_test_iso.py`
   - Plan + Build + Review: `adw_plan_build_review_iso.py`
   - Plan + Build + Test + Review: `adw_plan_build_test_review_iso.py`
   - Plan + Build + Document: `adw_plan_build_document_iso.py`

5. **Do you already have a worktree and plan?**
   - Build only: `adw_build_iso.py <issue-number> <adw-id>`
   - Test only: `adw_test_iso.py <issue-number> <adw-id>`
   - Review only: `adw_review_iso.py <issue-number> <adw-id>`
   - Document only: `adw_document_iso.py <issue-number> <adw-id>`

6. **Ready to merge?**
   - Via PR (GitHub workflow): `adw_ship_iso.py <issue-number> <adw-id>`
   - Direct merge (git workflow): `adw_merge_worktree.py <adw-id> [merge-method]`

### Common Usage Scenarios

#### Scenario 1: Simple Bug Fix
```bash
# Quick fix without full SDLC
uv run adw_plan_build_iso.py 789
```

#### Scenario 2: New Feature with Testing
```bash
# Plan, build, and test a new feature
uv run adw_plan_build_test_iso.py 456
```

#### Scenario 3: Complex Feature with Full Validation
```bash
# Complete SDLC with all phases
uv run adw_sdlc_iso.py 123

# After completion, manually merge
uv run adw_ship_iso.py 123 abc12345
```

#### Scenario 4: UI Change Needing Screenshots
```bash
# Plan, build, and review (skip tests)
uv run adw_plan_build_review_iso.py 321
```

#### Scenario 5: Fully Automated Deployment
```bash
# Zero touch execution - auto-ship if all passes
uv run adw_sdlc_zte_iso.py 654
```

#### Scenario 6: Review Existing Plan
```bash
# Step 1: Plan only
uv run adw_plan_iso.py 789
# Review the plan in specs/

# Step 2: Build after approval
uv run adw_build_iso.py 789 abc12345

# Step 3: Test
uv run adw_test_iso.py 789 abc12345

# Step 4: Ship
uv run adw_ship_iso.py 789 abc12345
```

#### Scenario 7: Parallel Processing
```bash
# Process multiple issues concurrently
uv run adw_plan_build_iso.py 101 &
uv run adw_plan_build_iso.py 102 &
uv run adw_plan_build_iso.py 103 &
# Each gets its own worktree and ports
```

---

## Key Concepts

### ADW ID
Each workflow run is assigned a unique 8-character identifier (e.g., `a1b2c3d4`). This ID:
- Tracks all phases of a workflow (plan → build → test → review → document)
- Appears in GitHub comments, commits, and PR titles
- Creates an isolated worktree at `trees/{adw_id}/`
- Allocates unique ports deterministically
- Enables resuming workflows and debugging

### Isolated Execution
Every ADW workflow runs in an isolated git worktree under `trees/<adw_id>/` with:
- Complete filesystem isolation
- Dedicated port ranges (WebSocket: 8500-8514, frontend: 9200-9214)
- Independent git branches
- Support for 15 concurrent instances

### Port Allocation
Each isolated instance gets unique ports:
- WebSocket: 8500-8514 (15 ports)
- Frontend: 9200-9214 (15 ports)
- Deterministic assignment based on ADW ID hash
- Automatic fallback if preferred ports are busy

**Example Allocations:**
```
ADW abc12345: WebSocket 8507, Frontend 9207
ADW def67890: WebSocket 8503, Frontend 9203
```

### State Management
ADW uses persistent state files (`agents/{adw_id}/adw_state.json`) to:
- Share data between workflow phases
- Track worktree locations and port assignments
- Enable workflow composition and chaining
- Track essential workflow data:
  - `adw_id`: Unique workflow identifier
  - `issue_number`: GitHub issue being processed
  - `branch_name`: Git branch for changes
  - `plan_file`: Path to implementation plan
  - `issue_class`: Issue type (`/chore`, `/bug`, `/feature`)
  - `worktree_path`: Absolute path to isolated worktree
  - `websocket_port`: Allocated WebSocket port (8500-8514)
  - `frontend_port`: Allocated frontend port (9200-9214)

### Model Selection
ADW supports dynamic model selection based on workflow complexity:
- **Base Model Set**: Optimized for speed and cost (default)
- **Heavy Model Set**: Optimized for complex tasks (uses Opus for certain operations)

**How to specify:**
Include `model_set base` or `model_set heavy` in your GitHub issue:
```
Title: Add export functionality
Body: Please add the ability to export data to CSV.
Include workflow: adw_plan_build_iso model_set heavy
```

---

## Environment Setup

### Prerequisites
```bash
# GitHub CLI
brew install gh              # macOS
# or: sudo apt install gh    # Ubuntu/Debian
# or: winget install --id GitHub.cli  # Windows

# Claude Code CLI
# Follow instructions at https://docs.anthropic.com/en/docs/claude-code

# Python dependency manager (uv)
curl -LsSf https://astral.sh/uv/install.sh | sh  # macOS/Linux
# or: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows

# Authenticate GitHub
gh auth login
```

### Environment Variables
```bash
export GITHUB_REPO_URL="https://github.com/owner/repository"
export CLAUDE_CODE_PATH="/path/to/claude"  # Optional, defaults to "claude"
export GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Optional
```

---

## Worktree Management

### Worktree Structure
```
trees/
├── abc12345/              # Complete repo copy for ADW abc12345
│   ├── .git/              # Worktree git directory
│   ├── .env               # Copied from main repo
│   ├── .ports.env         # Port configuration
│   ├── app/               # Application code
│   └── ...
└── def67890/              # Another isolated instance
    └── ...

agents/                    # Shared state location (not in worktree)
├── abc12345/
│   └── adw_state.json     # Persistent state
└── def67890/
    └── adw_state.json
```

### Cleanup
```bash
# Remove specific worktree
git worktree remove trees/abc12345

# List all worktrees
git worktree list

# Clean up worktrees (removes invalid entries)
git worktree prune

# Remove worktree directory if git doesn't know about it
rm -rf trees/abc12345
```

**Best Practices:**
- Remove worktrees after PR merge
- Monitor disk usage (each worktree is a full repo copy)
- Use `git worktree prune` periodically
- Consider automation for cleanup after 7 days

---

## Troubleshooting

### Common Errors

**"No worktree found"**
```bash
# Check if worktree exists
git worktree list
# Run an entry point workflow first
uv run adw_plan_iso.py <issue-number>
```

**"Port already in use"**
```bash
# Check what's using the port
lsof -i :9107
# Kill the process or let ADW find alternative ports
```

**"Worktree validation failed"**
```bash
# Check worktree state
cat agents/<adw-id>/adw_state.json | jq .worktree_path
# Verify directory exists
ls -la trees/<adw-id>/
```

**"Agent execution failed"**
```bash
# Check agent output in worktree
cat trees/<adw-id>/agents/*/planner/raw_output.jsonl | tail -1 | jq .
```

### Debug Mode
```bash
export ADW_DEBUG=true
uv run adw_plan_build_iso.py 123  # Verbose output
```

---

## Additional Resources

- **Full Documentation:** [adws/README.md](../adws/README.md)
- **Automation Triggers:** See trigger_cron.py, trigger_webhook.py, trigger_websocket.py
- **Module Documentation:** See adw_modules/ directory
- **GitHub Integration:** Configure webhooks and secrets for real-time processing

---

## Summary

ADW provides a comprehensive suite of isolated workflows for automated software development. Choose the right workflow based on your needs:

- **Quick fixes:** `adw_patch_iso.py` or `adw_plan_build_iso.py`
- **Full validation:** `adw_sdlc_iso.py`
- **Zero touch:** `adw_sdlc_zte_iso.py`
- **Manual control:** Run individual phases (`adw_plan_iso.py`, `adw_build_iso.py`, etc.)

All workflows run in isolated worktrees with dedicated ports, enabling parallel execution and clean separation of concerns.
