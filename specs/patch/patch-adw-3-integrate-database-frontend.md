# Patch: Integrate Frontend with Database API for ADW Loading

## Metadata
adw_id: `3`
review_change_request: `Issue #3: Frontend not loading ADW data from database. The Kanban board shows 0 tasks in all columns despite the database having 89 ADW states (confirmed via direct SQLite query). This indicates the frontend is not properly integrated with the database API service. Resolution: Update kanbanStore.js to use adwDbService.js for loading ADWs instead of the old JSON-based approach. Ensure the store calls the database API endpoints (once the import issue is fixed) and properly maps the database response to the Kanban board state. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-31-adw-5e58ab68-sdlc_planner-database-state-management.md
**Issue:** The Kanban board UI displays 0 tasks across all columns, despite the database containing 89 ADW states. The frontend is using the old JSON-based `adwService` instead of the new database-backed `adwDbService`, resulting in no tasks being loaded from the database.
**Solution:** Update `kanbanStore.js` to import and use `adwDbService` for loading ADW data. Replace the JSON-based initialization logic with database API calls and map the database response format to the Kanban board's task structure.

## Files to Modify
- `src/stores/kanbanStore.js` - Update to use adwDbService for loading ADWs from database
- `src/services/api/adwDbService.js` - Already exists, verify it's working correctly

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Verify adwDbService is functional
- Read `src/services/api/adwDbService.js` to understand the API methods available
- Verify the service has `listAdws()`, `getAdw()`, `createAdw()`, `updateAdw()`, and `deleteAdw()` methods
- Check that the API_BASE_URL is correctly configured to point to the database API endpoint (http://localhost:9104)

### Step 2: Update kanbanStore.js imports
- Add import for adwDbService: `import adwDbService from '../services/api/adwDbService';`
- Keep the existing adwService import for backward compatibility if needed
- Locate the `initializeStore` method in kanbanStore.js

### Step 3: Add database ADW loading method
- Create a new method `loadAdwsFromDatabase` in kanbanStore.js that:
  - Calls `adwDbService.listAdws()` to fetch all ADWs from the database
  - Maps the database response to the Kanban board task structure
  - Handles the response format: `{ adws: [...], total_count: number }`
  - Transforms each ADW database record to a task object with properties:
    - `id`: Use auto-incrementing taskIdCounter
    - `adw_id`: Map from database `adw_id`
    - `title`: Map from database `issue_title`
    - `description`: Map from database `issue_body`
    - `stage`: Map from database `current_stage`
    - `status`: Map from database `status`
    - `metadata`: Include `issue_number`, `workflow_name`, `branch_name`, etc.
    - `createdAt`: Map from database `created_at`
    - `updatedAt`: Map from database `updated_at`
  - Updates the `tasks` array in the store with the mapped tasks
  - Updates the `tasksByAdwId` index for O(1) lookups

### Step 4: Integrate database loading into initializeStore
- In the `initializeStore` method, after loading projects, call `loadAdwsFromDatabase()`
- Add error handling for database API failures (log error, don't crash app)
- Add loading state management: set `isLoading: true` before fetch, `false` after
- Log the number of ADWs loaded from database for debugging

### Step 5: Update task creation to use database API
- Locate the task creation logic in kanbanStore.js
- Update it to call `adwDbService.createAdw()` when creating new tasks
- Ensure the API call includes all required fields: `adw_id`, `issue_title`, `issue_body`, `current_stage`, `status`, `workflow_name`
- On successful creation, update local store state with the returned database record
- Update the `tasksByAdwId` index with the new task

### Step 6: Update task update logic to use database API
- Locate the task update logic (stage transitions, status changes)
- Update it to call `adwDbService.updateAdw(adw_id, updateData)` when tasks are modified
- Ensure optimistic updates are applied to local state immediately
- On API failure, revert optimistic update and show error notification

### Step 7: Update task deletion to use database API
- Locate the task deletion logic
- Update it to call `adwDbService.deleteAdw(adw_id)` when tasks are deleted
- Ensure the delete triggers worktree cleanup on the backend
- Remove the task from local state after successful deletion

### Step 8: Create/Update Tests
- Create frontend test: `src/stores/__tests__/kanbanStore-database-integration.test.js`
  - Test `loadAdwsFromDatabase()` correctly fetches and maps ADWs from database
  - Test task creation calls `adwDbService.createAdw()` with correct parameters
  - Test task updates call `adwDbService.updateAdw()` with correct parameters
  - Test task deletion calls `adwDbService.deleteAdw()` and removes from local state
  - Mock adwDbService API responses for all tests
- Create integration test: `src/test/integration/adw-database-frontend-integration.test.js`
  - Test end-to-end: start frontend, verify ADWs load from database, verify UI displays correct task count
  - Test real API calls to database endpoint (requires backend running)

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Verify backend API is running and accessible**
   ```bash
   curl http://localhost:9104/api/adws | jq
   ```
   Expected: JSON response with `adws` array and `total_count` field

2. **Run Python syntax check**
   ```bash
   uv run python -m py_compile adws/*.py adws/adw_modules/*.py adws/adw_triggers/*.py adws/adw_tests/*.py start-websocket.py
   ```

3. **Run backend code quality check**
   ```bash
   uv run ruff check adws/ start-websocket.py
   ```

4. **Run all backend tests**
   ```bash
   uv run pytest adws/adw_tests/ -v --tb=short
   ```

5. **Run frontend unit tests**
   ```bash
   npm run test
   ```

6. **Run TypeScript type check**
   ```bash
   npm run typecheck
   ```

7. **Run frontend build**
   ```bash
   npm run build
   ```

8. **Manual E2E verification**
   - Start backend: `Bash(adwsh)`
   - Start frontend: `Bash(fesh)`
   - Open browser to http://localhost:5173
   - Verify Kanban board displays all 89 ADWs from database across appropriate stages
   - Verify task counts in each column match database query results
   - Verify task details (title, description, metadata) are correctly displayed
   - Create a new task and verify it appears in the UI and database
   - Update a task stage and verify the change persists in the database
   - Delete a task and verify it's removed from both UI and database

## Patch Scope
**Lines of code to change:** ~150 lines (mainly in kanbanStore.js)
**Risk level:** medium
**Testing required:** Unit tests for kanbanStore database integration, integration tests for frontend-backend communication, manual E2E testing to verify 89 ADWs display correctly
