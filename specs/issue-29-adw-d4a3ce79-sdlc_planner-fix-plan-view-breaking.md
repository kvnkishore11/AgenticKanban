# Bug: Fix Plan View Breaking

## Metadata
issue_number: `29`
adw_id: `d4a3ce79`
issue_json: `{"number":29,"title":"I am still not able to view the plan and my app is...","body":"I am still not able to view the plan and my app is breaking a lot. \nCan you please look into it and try to fix this issue\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/10a4825d-8645-46a0-b1a0-a9a343f98408)\n\n"}`

## Bug Description
Users are unable to view plans in the Agentic Kanban application, and the app is experiencing breaking issues. When attempting to view a plan through the "View Plan" action on a Kanban card, the plan content fails to load properly, causing a degraded user experience and preventing users from reviewing implementation specifications.

## Problem Statement
The plan viewing functionality is broken due to path resolution issues in the backend API's `get_agents_directory()` function in `app/server/api/adws.py`. The function attempts to navigate the directory structure to locate plan files, but the current logic makes incorrect assumptions about the directory structure when running from a worktree, resulting in failed plan file lookups and 404 errors.

## Solution Statement
Fix the `get_agents_directory()` path resolution logic in `app/server/api/adws.py` to correctly handle both worktree and main repository scenarios. The solution will:
1. Properly detect whether the server is running from a worktree or main repository
2. Correctly navigate to the agents directory regardless of execution context
3. Ensure plan files can be located and served consistently
4. Add robust error handling and logging for debugging

## Steps to Reproduce
1. Start the backend server from the worktree: `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/d4a3ce79/app/server && uv run python server.py`
2. Start the frontend: `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/d4a3ce79 && npm run dev`
3. Open the application in a browser at `http://localhost:9212`
4. Navigate to a Kanban card that has an ADW ID
5. Click the "View Plan" action on the card
6. Observe that the plan fails to load with an error message

## Root Cause Analysis
The `get_agents_directory()` function in `app/server/api/adws.py` (lines 17-45) has a flawed directory navigation strategy:

1. **Incorrect Parent Detection**: The function checks if `project_or_worktree_root.name` has 8 characters to detect worktree (line 34), but this check is unreliable because:
   - The directory at 4 levels up from `trees/d4a3ce79/app/server/api/adws.py` is actually `trees/`, not `d4a3ce79`
   - The logic assumes the worktree ID directory will be exactly 4 levels up, which is incorrect

2. **Path Calculation Error**: From `app/server/api/adws.py`:
   - Current path: `trees/d4a3ce79/app/server/api/adws.py`
   - Going up 4 levels (.parent.parent.parent.parent): `trees/`
   - The code expects to land on `d4a3ce79` but actually lands on `trees/`
   - This causes the worktree detection to fail

3. **Hardcoded Assumptions**: The code assumes a specific directory structure without validating the actual filesystem layout, making it brittle when the structure changes or when running in different contexts.

The correct navigation should be:
- From `trees/d4a3ce79/app/server/api/adws.py`
- Go up 3 levels to reach `trees/d4a3ce79/` (the worktree root)
- Then go up 2 more levels to reach the main project root
- Then access `agents/` directory

## Relevant Files
Use these files to fix the bug:

- **app/server/api/adws.py** (lines 17-45) - Contains the buggy `get_agents_directory()` function that needs fixing. This is the primary file requiring changes.

- **app/server/api/adws.py** (lines 221-285) - Contains the `get_adw_plan()` endpoint that relies on the corrected directory resolution to serve plan files.

- **src/services/api/adwDiscoveryService.js** (lines 83-101) - Frontend service that calls the backend plan endpoint. May need to verify error handling is adequate.

- **src/components/kanban/KanbanCard.jsx** (lines 169-189) - Component that triggers plan viewing. May need to improve error messaging to users.

- **src/components/kanban/PlanViewer.jsx** - Modal component that displays plan content. Should properly display error states.

### New Files

- **.claude/commands/e2e/test_plan_viewer.md** - E2E test to validate plan viewing functionality works correctly end-to-end.

## Step by Step Tasks

### Task 1: Fix Backend Path Resolution Logic
- Rewrite the `get_agents_directory()` function in `app/server/api/adws.py` to correctly detect and navigate from worktree to agents directory
- Use a more reliable worktree detection method (check for `.git` file vs `.git` directory, or check parent directory names)
- Simplify the path navigation logic:
  - From `app/server/api/adws.py`, go up 3 levels to reach worktree root or project root
  - Check if we're in a worktree by looking for `trees/` in the path
  - If in worktree, go up 2 more levels to reach main project root
  - Construct path to `agents/` directory
- Add comprehensive logging to show the path resolution steps for easier debugging
- Add validation to ensure the agents directory exists and is accessible

### Task 2: Add Error Handling and Logging
- Enhance error messages in the `get_adw_plan()` endpoint to provide more context
- Add logging statements to track plan file lookup attempts
- Return descriptive error messages that help diagnose path issues
- Log the full path being checked when a plan file is not found

### Task 3: Improve Frontend Error Display
- Update `KanbanCard.jsx` `handleViewPlan()` function to display more user-friendly error messages
- Ensure the `PlanViewer.jsx` component properly displays error states with actionable information
- Add console logging in the frontend to help debug API failures

### Task 4: Create E2E Test for Plan Viewing
- Read `.claude/commands/e2e/test_basic_query.md` to understand the E2E test format
- Create a new E2E test file `.claude/commands/e2e/test_plan_viewer.md` that validates:
  - User can navigate to a task with an ADW ID
  - User can click "View Plan" action
  - Plan modal opens and displays loading state
  - Plan content loads successfully from the backend
  - Plan content is displayed in the modal using ReactMarkdown
  - User can copy plan content to clipboard
  - User can close the modal
  - Screenshots are captured at each step to prove the functionality works
- The test should cover the happy path and validate the bug is fixed

### Task 5: Run Validation Commands
- Execute all validation commands listed below to ensure the fix works with zero regressions
- Verify backend server starts successfully
- Verify frontend builds without errors
- Test plan viewing functionality manually in the browser
- Run the new E2E test to validate end-to-end functionality

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd app/server && uv run python -c "from api.adws import get_agents_directory; print(f'Agents directory: {get_agents_directory()}')"` - Verify the path resolution function returns the correct agents directory path
- `cd app/server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/d4a3ce79 && npm run build` - Run frontend build to validate the bug is fixed with zero regressions
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/d4a3ce79 && npm run type-check` - Run TypeScript type checking
- Read `.claude/commands/test_e2e.md`, then read and execute the new E2E test file `.claude/commands/e2e/test_plan_viewer.md` to validate plan viewing works end-to-end

## Notes
- The backend server is configured to run on port 9112 (BACKEND_PORT in .env)
- The frontend is configured to use `http://localhost:9112` as the VITE_BACKEND_URL
- The agents directory is located at the main project root level, not within the worktree
- Plan files are stored at `agents/{adw_id}/sdlc_planner/plan.md`
- This is a critical bug affecting core functionality - users cannot review implementation plans without this working
- The fix should be minimal and surgical, focusing only on the path resolution issue
- Ensure the solution works in both worktree and main repository contexts
