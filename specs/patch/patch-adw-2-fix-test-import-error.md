# Patch: Fix backend test suite ImportError

## Metadata
adw_id: `2`
review_change_request: `Issue #2: Backend test suite fails with ImportError: 'cannot import name 'app' from 'server''. The test file server/tests/test_adw_db_api.py line 13 attempts to import 'app' from server module but this import fails. This prevents validation of the database API implementation and blocks acceptance criteria #14: 'All validation commands pass (pytest, tsc, build)'. Resolution: Fix the import statement in server/tests/test_adw_db_api.py to correctly import the FastAPI app instance. The correct import should be 'from server.server import app' or update server/__init__.py to export the app. Ensure all backend tests run successfully with 'cd server && uv run pytest'. Severity: blocker`

## Issue Summary
**Original Spec:** None (patch for blocking test failure)
**Issue:** The test file `server/tests/test_adw_db_api.py` cannot import the FastAPI `app` instance because `server/__init__.py` is empty and does not export the app.
**Solution:** Update `server/__init__.py` to export the `app` instance from `server.server` module, making it available for test imports.

## Files to Modify
Use these files to implement the patch:

- `server/__init__.py` - Add app export to make it importable from the server package

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update server/__init__.py to export app
- Add import statement: `from server.server import app`
- Add `__all__` export list to explicitly export `app`
- This makes `from server import app` work correctly in test files

### Step 2: Verify the fix works
- Run the failing test: `cd server && uv run pytest tests/test_adw_db_api.py -v`
- Confirm all tests in the file pass successfully
- Verify no import errors occur

### Step 3: Run full backend test suite
- Execute all backend tests: `cd server && uv run pytest -v`
- Ensure no regressions in other test files
- Confirm all tests pass

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Verify specific test file passes:**
   ```bash
   cd server && uv run pytest tests/test_adw_db_api.py -v
   ```
   Expected: All tests pass, no ImportError

2. **Verify all backend tests pass:**
   ```bash
   cd server && uv run pytest -v
   ```
   Expected: All tests pass, no failures

3. **Verify test_server.py still works:**
   ```bash
   cd server && uv run pytest tests/test_server.py -v
   ```
   Expected: All tests pass (confirms backward compatibility)

4. **Verify the import works in Python:**
   ```bash
   cd server && uv run python -c "from server import app; print('Import successful:', app is not None)"
   ```
   Expected: Output shows "Import successful: True"

## Patch Scope
**Lines of code to change:** 3-4 lines
**Risk level:** low
**Testing required:** Run full backend test suite to ensure no regressions. The change is minimal (adding an export to `__init__.py`) and follows standard Python package structure patterns.
