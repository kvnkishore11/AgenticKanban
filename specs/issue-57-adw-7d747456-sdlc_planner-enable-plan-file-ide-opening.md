# Bug: Enable Plan File Opening in IDE

## Metadata
issue_number: `57`
adw_id: `7d747456`
issue_json: `{"number":57,"title":"I still cant view the plan file","body":"I still cant view the plan file. \nSee if there is a way that you can open my visual studio code to that file directly by using code /path_to_file \nyou can refer to agents/{adw_id}/adw_state\nwould have a plan_file as shown in the figure\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/330e5c63-89fd-478b-b18f-72e1e58e51a4)\n\n![image.png](blob:http://localhost:5173/7e750af4-2508-4e22-a618-d27c5d76c542)\n\n"}`

## Bug Description
Users can see the plan file path displayed in the CardExpandModal's ADW Metadata section, but they cannot click on it to open the file directly in their IDE (VS Code or Cursor). The user has to manually copy the path and open it themselves, which creates unnecessary friction in the workflow. The plan file path is available in both the `task.metadata.plan_file` and from the ADW state at `agents/{adw_id}/adw_state.json`, but there's no UI interaction to leverage the existing backend API endpoint (`/api/open-file`) that can open files in the IDE.

## Problem Statement
The plan file path is displayed as read-only text in the CardExpandModal component. There is no click handler or button to trigger the file opening functionality, even though the backend already has a fully functional `/api/open-file` endpoint in `server/api/file_operations.py` that supports opening files in VS Code using `code /path_to_file` or in Cursor using `cursor /path_to_file`.

## Solution Statement
Add an "Open in IDE" button or make the plan file path clickable in the CardExpandModal component. When clicked, it will call the existing `/api/open-file` backend endpoint with the plan file's absolute path. The backend will use the `code` or `cursor` CLI command to open the file directly in the user's IDE. Additionally, add a frontend service wrapper for the file operations API to handle IDE file opening requests from the UI.

## Steps to Reproduce
1. Navigate to the Kanban board
2. Find a task that has an ADW ID and plan file (e.g., from a completed planning workflow)
3. Click on the task to open the CardExpandModal
4. Scroll down to the "ADW Metadata" section
5. Observe the "Plan File" field showing the path (e.g., `specs/issue-57-adw-7d747456-sdlc_planner-*.md`)
6. Try to click on the plan file path
7. Notice that nothing happens - it's just static text
8. User must manually copy the path and open it in VS Code/Cursor themselves

## Root Cause Analysis
The root cause is in `src/components/kanban/CardExpandModal.jsx` (lines 386-395). The plan file path is rendered as a plain `<div>` element without any click handlers or buttons to trigger file opening:

```jsx
{(task.metadata?.plan_file || workflowMetadata?.plan_file) && (
  <div>
    <label className="text-xs font-medium text-gray-500 block mb-1">Plan File</label>
    <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-mono truncate"
         title={task.metadata?.plan_file || workflowMetadata?.plan_file}>
      {task.metadata?.plan_file || workflowMetadata?.plan_file}
    </div>
  </div>
)}
```

The backend already has the infrastructure in place (`server/api/file_operations.py` with `/api/open-file` endpoint), but there's no frontend integration:
1. No frontend service to call the `/api/open-file` endpoint
2. No click handler in CardExpandModal to trigger file opening
3. No visual affordance (button or clickable styling) to indicate the path can be opened

## Relevant Files
Use these files to fix the bug:

- `server/api/file_operations.py:1-238` - Backend API endpoint that opens files in IDE. Already fully implemented with support for VS Code (`code` command) and Cursor (`cursor` command). Accepts file path and optional line number, handles IDE detection and fallback.

- `src/components/kanban/CardExpandModal.jsx:386-408` - React component displaying the plan file path. Currently renders as plain text. Needs to add a button or make the path clickable to trigger file opening. Also contains the "View Plan" button integration logic that we can use as a reference.

- `src/services/api/adwDiscoveryService.js:1-223` - Frontend service for ADW-related API calls. Good reference for creating a similar service for file operations API calls.

- Read `.claude/commands/conditional_docs.md` to check if additional documentation is needed

### New Files

- `src/services/api/fileOperationsService.js` - New frontend service to wrap the `/api/open-file` backend endpoint. Will handle opening files in IDE from the UI.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Create Frontend Service for File Operations API

- Create new file `src/services/api/fileOperationsService.js`
- Implement a service class similar to `adwDiscoveryService.js` that wraps the backend file operations API
- Add `openFileInIde(filePath, lineNumber = 1, idePreference = null)` method that calls `/api/open-file`
- Add proper error handling for file not found, IDE not available, and network errors
- Export singleton instance for use across components
- Use `import.meta.env.VITE_BACKEND_URL` for the base URL to match existing patterns

### Add "Open in IDE" Button to CardExpandModal

- Modify `src/components/kanban/CardExpandModal.jsx` in the ADW Metadata section
- Import the new `fileOperationsService`
- Add state management for tracking IDE opening status (loading, success, error)
- Replace the plain text `<div>` displaying the plan file path with an interactive button
- Add click handler `handleOpenPlanFileInIde` that:
  - Gets the plan file path from `task.metadata?.plan_file` or `workflowMetadata?.plan_file`
  - Converts relative path to absolute path (prepend project root path if needed)
  - Calls `fileOperationsService.openFileInIde(absolutePath)`
  - Shows loading state during API call
  - Displays success message or error toast
- Style the button to indicate it's clickable (e.g., add hover effects, cursor pointer, icon)
- Add an external link icon or folder icon to visually indicate file opening functionality
- Handle errors gracefully with user-friendly error messages

### Add Path Resolution Logic

- The plan file path stored in `task.metadata.plan_file` might be relative (e.g., `specs/issue-57-adw-7d747456-sdlc_planner-*.md`)
- The `/api/open-file` endpoint expects an absolute path
- Options to resolve this:
  - Option A: Modify the backend `/api/adws/{adw_id}/plan` endpoint to return both relative and absolute paths
  - Option B: Add a new backend endpoint `/api/resolve-path` that converts relative to absolute
  - Option C: Have the frontend send relative path and let backend resolve it
- Implement the chosen option (recommend Option A for consistency with existing patterns)
- Update `server/api/adws.py` to include absolute path in the response
- Update `src/services/api/adwDiscoveryService.js` to handle the new absolute path field

### Test IDE Integration End-to-End

- Verify the "Open in IDE" button appears in CardExpandModal when plan file is present
- Test clicking the button opens VS Code (or Cursor) with the correct file
- Test with a task that has no plan file (button should not appear)
- Test error scenarios:
  - Plan file path doesn't exist (should show error message)
  - VS Code/Cursor not installed (should show appropriate error)
  - Backend server not running (should show network error)
- Verify loading states work correctly
- Verify success feedback is shown to user

### Run Validation Commands

- Execute all validation commands listed below to ensure the bug is fixed with zero regressions
- Verify that the "Open in IDE" functionality works as expected
- Ensure no TypeScript errors in frontend code
- Ensure frontend build succeeds

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

### Manual Testing Steps

1. Start the backend server: `cd server && uv run uvicorn server:app --reload --port 8001`
2. Start the frontend: `npm run dev`
3. Navigate to a task with a plan file in the Kanban board
4. Click on the task to open CardExpandModal
5. Scroll to "ADW Metadata" section
6. Verify "Open in IDE" button is visible next to or below the plan file path
7. Click the button
8. Verify VS Code or Cursor opens with the plan file loaded
9. Test with a different task to ensure consistency
10. Check browser console for any errors

### API Testing

- Test the `/api/open-file` endpoint directly using curl:
  - `curl -X POST http://localhost:8001/api/open-file -H "Content-Type: application/json" -d '{"file_path": "/absolute/path/to/specs/issue-57-adw-7d747456-sdlc_planner-enable-plan-file-ide-opening.md", "line_number": 1}'`
  - Should return success response and open file in IDE
- Test with invalid path:
  - `curl -X POST http://localhost:8001/api/open-file -H "Content-Type: application/json" -d '{"file_path": "/invalid/path.md", "line_number": 1}'`
  - Should return 404 error
- Test IDE status endpoint:
  - `curl http://localhost:8001/api/ide-status`
  - Should return available IDEs and versions

### Build Validation

- `npm run typecheck` - Run frontend TypeScript checks to ensure type safety
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes

- The backend `/api/open-file` endpoint already exists and is fully functional - we just need to wire up the frontend
- The endpoint supports both VS Code (`code`) and Cursor (`cursor`) CLI commands
- The endpoint has automatic fallback: if the preferred IDE fails, it tries the other one
- The plan file path is stored in ADW state (`agents/{adw_id}/adw_state.json`) and is accessible via task metadata
- Consider adding this "Open in IDE" functionality to other file paths in the UI (logs path, worktree path, etc.) in future iterations
- The file operations API uses subprocess to execute IDE commands, so it requires the IDE CLI to be in PATH
- Users should have `code` or `cursor` command available in their terminal for this to work
- Issue #53 was related to viewing plan file content in a modal - this issue is about opening the file directly in the IDE
- This feature will significantly improve developer experience by reducing context switching
