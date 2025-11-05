# Bug: Fix Plan File Viewing

## Metadata
issue_number: `53`
adw_id: `dce6a466`
issue_json: `{"number":53,"title":"I still cant view the plan file that is generated","body":"I still cant view the plan file that is generated. This has to be fixed.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/6742cd18-d710-4799-ad7a-f292fbef1686)\n\n"}`

## Bug Description
Users are unable to view plan files when clicking the "View Plan" button in the task details modal. The plan file viewer fails to load and display the generated plan content, making it impossible for users to review implementation plans created by the ADW system.

## Problem Statement
The backend API endpoint `/api/adws/{adw_id}/plan` is looking for plan files in the wrong location. It searches for `agents/{adw_id}/sdlc_planner/plan.md`, but plan files are actually stored in the `specs/` directory with the naming pattern `issue-{issue_number}-adw-{adw_id}-sdlc_planner-*.md`. This path mismatch causes a 404 error when users try to view plan files.

## Solution Statement
Update the backend API endpoint `/api/adws/{adw_id}/plan` to:
1. Search for plan files in the `specs/` directory using the correct naming pattern
2. Use glob pattern matching to find files matching `issue-*-adw-{adw_id}-sdlc_planner-*.md`
3. Return the plan file content when found
4. Provide clear error messages when plan files are not found

Additionally, enhance the error handling in the frontend to display user-friendly error messages when plan files cannot be loaded.

## Steps to Reproduce
1. Navigate to the Kanban board
2. Find a task that has an ADW ID (e.g., from a workflow execution)
3. Open the task details modal by clicking on the task
4. Click the "View Plan" button
5. Observe that the plan viewer modal shows a loading state followed by an error
6. Check browser console and backend logs for 404 errors indicating plan file not found

## Root Cause Analysis
The root cause is a path mismatch in `server/api/adws.py`:

**Current Implementation (Line 270):**
```python
plan_file = adw_dir / "sdlc_planner" / "plan.md"
```
This assumes plan files are stored in `agents/{adw_id}/sdlc_planner/plan.md`.

**Actual Location:**
Plan files are stored in the `specs/` directory with the pattern:
- `specs/issue-{issue_number}-adw-{adw_id}-sdlc_planner-{descriptive-name}.md`

The backend tries to read from a location that doesn't exist, resulting in a 404 error. The ADW system creates plan files in the `specs/` directory during the planning phase, but the API endpoint doesn't know to look there.

## Relevant Files
Use these files to fix the bug:

- `server/api/adws.py:236-310` - Backend API endpoint that fetches plan files. Currently looks in wrong directory (`agents/{adw_id}/sdlc_planner/plan.md`). Needs to be updated to search in `specs/` directory using glob pattern matching.

- `src/services/api/adwDiscoveryService.js:79-114` - Frontend service that calls the backend API to fetch plan files. Works correctly but could benefit from better error handling to surface backend errors to users.

- `src/components/kanban/TaskDetailsModal.jsx:137-157` - React component that displays the "View Plan" button and handles the plan viewing interaction. Contains basic error handling but could provide more user-friendly error messages.

- `src/components/kanban/PlanViewer.jsx:1-142` - Modal component that displays plan content. Handles loading, error, and success states. Works correctly but relies on backend providing content.

### New Files
None - this is a bug fix that only requires modifying existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Update Backend API to Search in Correct Directory
- Modify `server/api/adws.py` endpoint `/api/adws/{adw_id}/plan` (lines 236-310)
- Change the plan file lookup logic to search in the `specs/` directory instead of `agents/{adw_id}/sdlc_planner/`
- Use Python's `pathlib.Path.glob()` to find files matching the pattern `issue-*-adw-{adw_id}-sdlc_planner-*.md`
- Handle cases where multiple matching files exist (return the most recently modified one)
- Handle cases where no matching files exist (return 404 with clear error message)
- Add logging to help debug plan file discovery
- Return the plan file content and relative path in the response

### Enhance Frontend Error Handling
- Update `src/components/kanban/TaskDetailsModal.jsx` to display more informative error messages when plan loading fails
- Show the ADW ID in error messages to help users report issues
- Add a retry mechanism for failed plan file loads
- Ensure error state is properly cleared when closing and reopening the plan viewer

### Add Fallback Plan Discovery Logic
- If the backend cannot find the plan file using the ADW ID, add a fallback that searches by issue number
- This provides resilience in case ADW ID metadata is missing or incorrect
- Log when fallback logic is used for debugging purposes

### Run Validation Commands
- Execute all validation commands listed below to ensure the bug is fixed with zero regressions
- Verify that plan files can be viewed successfully
- Test error scenarios (missing plan files, invalid ADW IDs)
- Ensure no TypeScript errors in frontend code
- Ensure backend tests pass

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd server && uv run pytest tests/ -v` - Run backend tests to ensure no regressions in API endpoints
- `npm run typecheck` - Run frontend TypeScript checks to ensure type safety
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

### Manual Testing Steps
1. Start the backend server: `cd server && uv run uvicorn main:app --reload --port 8001`
2. Start the frontend: `npm run dev`
3. Navigate to a task with an ADW ID in the Kanban board
4. Click "View Plan" button
5. Verify that the plan file content loads and displays correctly in the modal
6. Test with multiple different ADW IDs to ensure consistency
7. Test error scenario: try to view a plan for a non-existent ADW ID and verify error message is clear
8. Check browser console and backend logs for any errors

### API Testing
- Test the `/api/adws/{adw_id}/plan` endpoint directly using curl or browser:
  - `curl http://localhost:8001/api/adws/dce6a466/plan` (should return plan content)
  - `curl http://localhost:8001/api/adws/invalid123/plan` (should return 404 with clear error)
- Verify response includes both `plan_content` and `plan_file` fields
- Verify plan content is properly formatted markdown

## Notes
- The bug affects all users trying to view implementation plans through the UI
- Plan files are critical for understanding what changes the ADW system will make
- The fix requires coordination between backend (plan file discovery) and frontend (error handling)
- After this fix, users should be able to seamlessly view plan files for any ADW workflow
- Consider adding E2E tests in the future to catch this type of integration bug earlier
- The plan file naming convention is defined by the `/bug` command and ADW workflows - do not change it
- Backend should be resilient to missing plan files since not all ADW workflows may generate plan files (e.g., patch workflows)
