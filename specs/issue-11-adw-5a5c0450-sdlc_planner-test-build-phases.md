# Chore: Test and Build Phases Verification

## Metadata
issue_number: `11`
adw_id: `5a5c0450`
issue_json: `{"number":11,"title":"this is to test test and build phases if they are...","body":"this is to test test and build phases if they are working fine"}`

## Chore Description
This chore involves verifying that the test and build phases in the AgenticKanban ADW (AI Developer Workflow) system are functioning correctly. The test and build phases are critical components of the automated development workflow that:

1. **Build Phase** (`adw_build_iso.py`): Implements the solution based on a plan file in an isolated git worktree
2. **Test Phase** (`adw_test_iso.py`): Runs comprehensive unit and E2E tests with automatic resolution and retry logic

The verification will ensure:
- The build phase correctly implements solutions in isolated worktrees
- The test phase executes all test suites (unit and E2E) successfully
- Test resolution and retry mechanisms work as expected
- State management and workflow orchestration function properly
- WebSocket notifications and GitHub integration work correctly

## Relevant Files
Use these files to resolve the chore:

### ADW Build Phase
- `adws/adw_build_iso.py` - Isolated build workflow that implements solutions in git worktrees
  - Validates worktree existence and state
  - Loads plan files and executes implementation
  - Creates commits and pushes changes
  - Integrates with WebSocket notifications

### ADW Test Phase
- `adws/adw_test_iso.py` - Isolated test workflow with automatic resolution and retry logic
  - Runs unit tests via `/test` command
  - Runs E2E tests via `/test_e2e` command (unless `--skip-e2e` flag is provided)
  - Implements test resolution for failures (up to 4 retries for unit tests, 2 for E2E)
  - Posts comprehensive test summaries to GitHub issues
  - Creates test commits and pushes results

### Composite Workflow
- `adws/adw_plan_build_test_iso.py` - Orchestrates plan → build → test phases
  - Chains the three workflows together
  - Passes ADW ID and state between phases
  - Supports `--skip-e2e` flag to skip E2E tests

### Test Commands
- `.claude/commands/test.md` - Unit test execution slash command
  - Validates Python syntax, backend linting, backend tests
  - Validates TypeScript type checking and frontend build
  - Returns JSON array of test results

- `.claude/commands/test_e2e.md` - E2E test execution slash command
  - Uses Playwright MCP server for browser automation
  - Reads test specification files from `.claude/commands/e2e/`
  - Captures screenshots and validates user stories
  - Supports custom port configuration via `.ports.env`

### Supporting Modules
- `adws/adw_modules/state.py` - ADW state management
- `adws/adw_modules/git_ops.py` - Git operations (commit, push, PR)
- `adws/adw_modules/workflow_ops.py` - Workflow utilities and helpers
- `adws/adw_modules/worktree_ops.py` - Git worktree validation
- `adws/adw_modules/websocket_client.py` - WebSocket notifications for real-time updates
- `adws/adw_modules/agent.py` - Claude Code agent execution via templates

### Configuration
- `package.json` - Frontend test and build scripts
  - `npm run test` - Component tests placeholder
  - `npm run test:e2e` - E2E tests placeholder
  - `npm run build` - Frontend production build
  - `npm run typecheck` - TypeScript type checking

### New Files
#### Test Verification Script
- `adws/adw_tests/test_build_test_workflow.py` - New pytest test to validate build and test phases
  - Tests the full plan → build → test workflow
  - Validates state persistence across phases
  - Checks commit creation and GitHub integration
  - Verifies WebSocket notification flow

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Analyze Current Test and Build Phase Implementation
- Read and understand `adws/adw_build_iso.py` to identify:
  - How it loads state and validates worktrees
  - How it executes implementation via agent templates
  - How it handles commits and git operations
  - What WebSocket notifications it sends

- Read and understand `adws/adw_test_iso.py` to identify:
  - How it runs unit and E2E tests
  - How the retry and resolution logic works
  - How it handles test failures and reporting
  - What state it persists between retries

- Read and understand `adws/adw_plan_build_test_iso.py` to identify:
  - How it orchestrates the three phases
  - How it passes state and ADW ID between workflows
  - How error handling works across phases

### 2. Create Comprehensive Test Suite
- Create `adws/adw_tests/test_build_test_workflow.py` with pytest tests that:
  - Mock the necessary dependencies (subprocess, agent execution, GitHub API)
  - Test `adw_build_iso.py`:
    - State loading and validation
    - Worktree validation
    - Plan file reading
    - Implementation execution
    - Commit creation
    - WebSocket notification flow
  - Test `adw_test_iso.py`:
    - Unit test execution and parsing
    - E2E test execution and parsing
    - Test resolution logic for failures
    - Retry mechanism with max attempts
    - Comprehensive summary generation
    - `--skip-e2e` flag handling
  - Test `adw_plan_build_test_iso.py`:
    - Phase orchestration and chaining
    - State persistence between phases
    - Error propagation and handling
    - ADW ID generation and passing

### 3. Run Verification Tests
- Execute the new test suite to verify current functionality:
  ```bash
  cd adws
  uv run pytest adw_tests/test_build_test_workflow.py -v
  ```
- Document any failures or issues discovered
- Fix any bugs or issues found in the build/test phases

### 4. Validate End-to-End Workflow
- Run a complete test workflow on a sample issue to verify:
  - Create a test GitHub issue (can be mock or real)
  - Execute `uv run adw_plan_build_test_iso.py <issue-number>`
  - Verify all phases complete successfully
  - Check that state is properly persisted
  - Confirm WebSocket notifications are sent
  - Validate GitHub comments are posted correctly

### 5. Update Documentation
- Update `adws/README.md` if needed to clarify:
  - How the build phase works
  - How the test phase works
  - How test resolution and retry logic functions
  - What the `--skip-e2e` flag does
  - Best practices for using these workflows

### 6. Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Fix any issues that arise during validation

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd adws && uv run pytest adw_tests/test_build_test_workflow.py -v` - Run the new build/test workflow tests
- `cd adws && uv run pytest adw_tests/ -v --tb=short` - Run all ADW tests to ensure no regressions
- `uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py` - Validate Python syntax
- `uv run ruff check adws/` - Validate Python code quality
- `npm run typecheck` - Validate TypeScript type checking
- `npm run build` - Validate frontend build

## Notes
- This chore is focused on verification and testing, not on implementing new features
- The test and build phases are already implemented; we're verifying they work correctly
- The `--skip-e2e` flag is useful for faster iteration during development
- Test resolution logic can attempt to fix failures automatically (up to max retries)
- State persistence is critical for workflow resumption and debugging
- WebSocket notifications provide real-time feedback to the Kanban UI
- All workflows operate in isolated git worktrees to prevent conflicts
