# Patch: Add Missing Plan Endpoint to WebSocket Trigger Server

## Metadata
adw_id: `5b8b8ed2`
review_change_request: `Issue #1: The plan endpoint /api/adws/{adw_id}/plan does not exist in the running server (trigger_websocket.py). The fix was implemented in server/api/adws.py (lines 287-325) which is not used by the application. API testing shows 404 Not Found: curl http://localhost:8502/api/adws/5b8b8ed2/plan returns {"detail":"Not Found"} despite the plan file specs/issue-7-adw-5b8b8ed2-sdlc_planner-fix-view-plan-display.md existing. Resolution: The plan endpoint with worktree-aware logic needs to be implemented in adws/adw_triggers/trigger_websocket.py. Either: (1) Add the get_adw_plan() function directly to trigger_websocket.py with the same worktree directory searching logic from server/api/adws.py:287-325, OR (2) Include the server.api.adws router in trigger_websocket.py using app.include_router() Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-7-adw-5b8b8ed2-sdlc_planner-fix-view-plan-display.md
**Issue:** The plan endpoint `/api/adws/{adw_id}/plan` returns 404 Not Found when accessed at `http://localhost:8502/api/adws/5b8b8ed2/plan`. The endpoint was implemented in `server/api/adws.py` (lines 287-325) but the running application uses `adws/adw_triggers/trigger_websocket.py` on port 8502, which does not have this endpoint.
**Solution:** Add the `/api/adws/{adw_id}/plan` GET endpoint directly to `trigger_websocket.py` with worktree-aware logic to search for and return plan files from both main project and worktree specs directories.

## Files to Modify
- `adws/adw_triggers/trigger_websocket.py` - Add GET endpoint `/api/adws/{adw_id}/plan` after line 1618

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add Required Imports
- Add `from pathlib import Path` to the imports section (around line 21)
- Import `get_specs_directory` from adw_modules: `from adw_modules.discovery import discover_all_adws, get_adw_metadata, get_specs_directory`
- Note: get_specs_directory is already in adw_modules.discovery module based on server/api/adws.py usage

### Step 2: Implement get_adw_plan Endpoint
- Add new GET endpoint `/api/adws/{adw_id}/plan` after the existing `/api/adws/{adw_id}` endpoint (after line 1618)
- Copy the worktree-aware plan file searching logic from `server/api/adws.py:287-325`
- The endpoint must:
  1. Get current file path to determine if in worktree
  2. Build list of specs directories to search (main project + worktree if applicable)
  3. Search for plan files matching pattern: `issue-*-adw-{adw_id}-sdlc_planner-*.md`
  4. Return most recent plan file if multiple matches found
  5. Return 404 with helpful message if no plan file found
  6. Return JSON with `plan_content` and `plan_file` fields

### Step 3: Test the Endpoint
- Start the WebSocket trigger server: `uv run adws/adw_triggers/trigger_websocket.py`
- Test the endpoint: `curl http://localhost:8502/api/adws/5b8b8ed2/plan`
- Verify JSON response contains `plan_content` and `plan_file` fields
- Verify the plan content matches the file: `specs/issue-7-adw-5b8b8ed2-sdlc_planner-fix-view-plan-display.md`

## Validation
Execute every command to validate the patch is complete with zero regressions.

```bash
# 1. Start the WebSocket trigger server
uv run adws/adw_triggers/trigger_websocket.py

# 2. In a separate terminal, test the plan endpoint
curl http://localhost:8502/api/adws/5b8b8ed2/plan

# Expected: JSON response with "plan_content" containing markdown text and "plan_file" with file path

# 3. Test with the ADW list endpoint to ensure no regression
curl http://localhost:8502/api/adws/list

# Expected: JSON array of ADW objects

# 4. Test with ADW metadata endpoint to ensure no regression
curl http://localhost:8502/api/adws/5b8b8ed2

# Expected: JSON object with ADW metadata

# 5. Run Python syntax check
uv run python -m py_compile adws/adw_triggers/trigger_websocket.py

# Expected: No output (success)

# 6. Run backend linting
uv run ruff check adws/adw_triggers/trigger_websocket.py

# Expected: No errors

# 7. Test frontend plan viewing (manual)
# - Start frontend: npm run dev
# - Open http://localhost:5173
# - Find task with ADW ID 5b8b8ed2
# - Click "View Plan"
# - Verify plan content displays successfully
```

## Patch Scope
**Lines of code to change:** ~50 lines (add imports + endpoint implementation)
**Risk level:** low
**Testing required:** API endpoint testing, manual frontend testing, no backend unit tests exist for this endpoint
