# Bug: Fix "View Plan" Display Not Working

## Metadata
issue_number: `7`
adw_id: `5b8b8ed2`
issue_json: `{"number":7,"title":"currently when i click on view plan i am still not...","body":"currently when i click on view plan i am still not able to view the plan. can you please ensure that i have the ability to see the plan. be careful about sending the proper plan file… for me to view the plan.. you have to clarify, test and review thoroughly. THINK HARDEST to solve the problem\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/01ece712-d595-4c37-a596-30b73c3441cb)\n\n"}`

## Bug Description
When users click the "View Plan" button in the task details modal or card expand modal, the plan file content is not being displayed. The PlanViewer modal opens but shows either a loading state indefinitely or displays an error message indicating the plan file could not be fetched.

### Expected Behavior
- User clicks "View Plan" button
- PlanViewer modal opens with loading indicator
- Plan markdown content is fetched from the backend API at `/api/adws/{adw_id}/plan`
- Plan content is rendered in the modal using ReactMarkdown
- User can view, scroll, and copy the plan content

### Actual Behavior
- User clicks "View Plan" button
- PlanViewer modal opens
- Plan content fails to load, showing error or indefinite loading state
- No plan content is displayed to the user

## Problem Statement
The "View Plan" functionality is broken due to issues with the API request flow between the frontend and backend. Users cannot view the implementation plans that were created for their tasks, making it impossible to review what work has been planned.

## Solution Statement
Fix the plan viewing functionality by:
1. Ensuring the frontend correctly sends the ADW ID to the backend API
2. Verifying the backend API endpoint properly searches for and returns plan files
3. Confirming the PlanViewer modal correctly displays the returned content
4. Validating the complete request/response flow with proper error handling
5. Creating an E2E test to validate this critical functionality works end-to-end

## Steps to Reproduce
1. Open the application in a browser (http://localhost:5173 or configured frontend port)
2. Find a task card that has an ADW ID (look for tasks with `adw_id` in metadata)
3. Click on the task card to open the task details or click to expand the card
4. Click the "View Plan" button in the modal
5. Observe that the plan content does not load or displays an error

## Root Cause Analysis

Based on code analysis, the issue stems from multiple potential failure points:

1. **Environment Configuration Issue**: The `.env` file contains duplicate `VITE_BACKEND_URL` declarations (lines 32 and 37), with conflicting port numbers:
   - Line 32: `VITE_BACKEND_URL=http://localhost:8500`
   - Line 37: `VITE_BACKEND_URL=http://localhost:8502`

   This creates uncertainty about which backend URL the frontend is actually using.

2. **Backend API Port Mismatch**: The backend server may not be running on the port that the frontend expects. The server defaults to port 9104 (from `server.py:164`) unless `BACKEND_PORT` environment variable is set, but the frontend is configured to connect to port 8502.

3. **API Request Flow**:
   - Frontend (`TaskDetailsModal.jsx:151` or `CardExpandModal.jsx:151`): Calls `adwDiscoveryService.fetchPlanFile(adwId)`
   - Service (`adwDiscoveryService.js:85`): Makes GET request to `${baseUrl}/api/adws/${adwId}/plan`
   - Backend (`server/api/adws.py:267-379`): Searches for plan files in specs directory

4. **Potential Issues**:
   - Backend may not be running on the expected port
   - CORS configuration may be blocking the request
   - Plan files may not be found due to pattern matching issues
   - Network request may be failing silently

## Relevant Files
Use these files to fix the bug:

- **Frontend Components**:
  - `src/components/kanban/TaskDetailsModal.jsx` (lines 137-170) - Handles "View Plan" button click and plan fetching logic
  - `src/components/kanban/CardExpandModal.jsx` (lines 139-159) - Alternative modal with plan viewing capability
  - `src/components/kanban/PlanViewer.jsx` - Modal component that displays plan content with ReactMarkdown

- **Frontend Services**:
  - `src/services/api/adwDiscoveryService.js` (lines 83-114) - Service that makes the API call to fetch plan files
  - `src/services/planService.js` - Local plan service using Vite's import.meta.glob (may be unused/redundant)

- **Backend API**:
  - `server/server.py` - FastAPI server entry point with CORS configuration
  - `server/api/adws.py` (lines 267-379) - API endpoint `/api/adws/{adw_id}/plan` that searches for and returns plan files

- **Configuration**:
  - `.env` - Environment configuration with backend URL settings (has duplicate VITE_BACKEND_URL declarations)

- **Plan Files**:
  - `specs/issue-*-adw-*-sdlc_planner-*.md` - Plan files that should be returned by the API

### New Files
- `.claude/commands/e2e/test_view_plan.md` - E2E test to validate plan viewing functionality works end-to-end

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix Environment Configuration
- Remove duplicate `VITE_BACKEND_URL` declaration from `.env` file
- Ensure backend port configuration is consistent across all environment variables
- Set `VITE_BACKEND_URL` to match the actual backend server port
- Set `BACKEND_PORT` environment variable for the backend server to use the correct port
- Verify `WEBSOCKET_PORT` and `FRONTEND_PORT` are also correctly configured

### 2. Verify Backend API Endpoint
- Read the backend server startup logs to confirm which port it's running on
- Test the backend API endpoint directly using curl or browser:
  - GET `http://localhost:{BACKEND_PORT}/api/adws/list` to verify backend is accessible
  - GET `http://localhost:{BACKEND_PORT}/api/adws/{adw_id}/plan` with a known ADW ID
- Verify the API response contains `plan_content` and `plan_file` fields
- Check backend logs for any errors during plan file lookup

### 3. Test Frontend API Connection
- Open browser DevTools Network tab
- Click "View Plan" button on a task with an ADW ID
- Verify the network request is sent to the correct backend URL
- Check for CORS errors, 404 errors, or other HTTP errors
- Verify the response contains the expected plan content

### 4. Add Detailed Error Logging
- Add console.log statements in `adwDiscoveryService.fetchPlanFile()` to log:
  - The exact URL being requested
  - The response status code
  - The response data or error details
- Add error logging in backend `get_adw_plan()` endpoint to log:
  - ADW ID received
  - Specs directory path being searched
  - Pattern used for file matching
  - Files found matching the pattern
  - Any exceptions during file reading

### 5. Fix Plan File Pattern Matching (if needed)
- Verify the plan file naming convention matches what the backend expects
- The backend searches for: `issue-*-adw-{adw_id}-sdlc_planner-*.md`
- Check if plan files in `specs/` directory follow this pattern
- If pattern doesn't match, update either the backend search pattern or rename plan files

### 6. Test with Known ADW IDs
- Identify 3-5 tasks in the Kanban board that have ADW IDs
- For each task, manually verify a plan file exists in `specs/` directory with the correct naming pattern
- Click "View Plan" for each task and verify the plan content loads successfully
- Document any tasks where plan viewing fails and investigate why

### 7. Create E2E Test for Plan Viewing
- Read `.claude/commands/test_e2e.md` to understand E2E test framework
- Read `.claude/commands/e2e/test_basic_query.md` as an example E2E test
- Create a new E2E test file `.claude/commands/e2e/test_view_plan.md` that:
  - Navigates to the Kanban board
  - Identifies a task card with an ADW ID
  - Clicks to open the task details modal
  - Clicks the "View Plan" button
  - Waits for the PlanViewer modal to open
  - Verifies plan content is displayed (not loading, not error)
  - Takes a screenshot showing the plan content
  - Verifies the plan content contains expected markdown headers
  - Tests the copy-to-clipboard functionality
  - Tests closing the modal

### 8. Run Validation Commands
- Execute all validation commands listed below to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

### Backend Validation
```bash
# Start the backend server and verify it starts on the correct port
cd server
python server.py
# Should output: "Starting ADW Management API server on 0.0.0.0:{BACKEND_PORT}"
```

### API Endpoint Testing
```bash
# Test the ADW list endpoint (replace port with actual BACKEND_PORT)
curl http://localhost:8502/api/adws/list

# Test the plan endpoint with a known ADW ID (use an actual ADW ID from your system)
curl http://localhost:8502/api/adws/5b8b8ed2/plan

# Expected: JSON response with "plan_content" and "plan_file" fields
```

### Frontend Validation
```bash
# Start the frontend dev server
npm run dev

# In browser:
# 1. Open http://localhost:5173 (or configured FRONTEND_PORT)
# 2. Find a task with an ADW ID
# 3. Click on the task to open details
# 4. Click "View Plan" button
# 5. Verify plan content loads and displays correctly
# 6. Take screenshot showing successful plan display
```

### E2E Test Validation
```bash
# Read the E2E test execution guide
# Execute: cat .claude/commands/test_e2e.md

# Run the new plan viewing E2E test
# Execute the steps defined in .claude/commands/e2e/test_view_plan.md
# Verify all test steps pass and screenshots show plan content
```

### Type Checking and Build
```bash
# Run TypeScript type checking
npm run tsc --noEmit

# Run frontend build to ensure no build errors
npm run build
```

## Notes

### Important Considerations
1. **Port Configuration**: Ensure all services are running on consistent, non-conflicting ports
2. **CORS Configuration**: The backend CORS settings must allow the frontend origin
3. **File Path Resolution**: The backend searches for plan files in the `specs/` directory relative to the project root, accounting for both main project and worktree environments
4. **ADW ID Format**: ADW IDs are 8-character alphanumeric strings (e.g., "5b8b8ed2")
5. **Plan File Naming**: Plan files must follow the pattern `issue-{number}-adw-{adw_id}-sdlc_planner-{description}.md`

### Error Handling
The implementation should handle these error scenarios gracefully:
- Backend server not running (connection refused)
- Plan file not found (404 from backend)
- Invalid ADW ID format (400 from backend)
- CORS errors (blocked by browser)
- Network timeouts
- Invalid plan content (not valid markdown)

### Testing Strategy
1. **Manual Testing**: Test with real tasks and ADW IDs from the current Kanban board
2. **API Testing**: Use curl or Postman to test backend API independently
3. **Browser Testing**: Use DevTools to monitor network requests and responses
4. **E2E Testing**: Create automated test that validates the complete user flow
5. **Edge Cases**: Test with tasks that don't have ADW IDs, tasks with invalid ADW IDs, tasks with missing plan files

### Success Criteria
- ✅ User can click "View Plan" button
- ✅ PlanViewer modal opens without errors
- ✅ Plan content loads within 2 seconds
- ✅ Markdown content is properly formatted and readable
- ✅ Copy-to-clipboard functionality works
- ✅ Error messages are clear and actionable when plan cannot be loaded
- ✅ E2E test passes consistently
- ✅ No console errors during plan viewing
- ✅ Works for all tasks with valid ADW IDs and plan files
