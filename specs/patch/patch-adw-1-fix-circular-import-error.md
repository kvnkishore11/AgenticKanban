# Patch: Fix Circular Import Error in Backend Database API

## Metadata
adw_id: `1`
review_change_request: `Issue #1: Critical circular import error in backend prevents database API routes from being registered. The adw_db.py and issue_tracker.py modules use 'server.core.database' and 'server.models.*' imports, but when running from the server directory, these cause a ModuleNotFoundError: 'No module named server.api; server is not a package'. This prevents the /api/adws and /api/issues endpoints from being available, making the entire database API non-functional. Resolution: Fix all imports in server/api/adw_db.py and server/api/issue_tracker.py to use relative imports (e.g., 'from core.database import' instead of 'from server.core.database import'). Also fix imports in server/models/adw_db_models.py if they have the same issue. Severity: blocker`

## Issue Summary
**Original Spec:** N/A
**Issue:** The backend database API routes (/api/adws and /api/issues) are non-functional due to circular import errors. The modules adw_db.py and issue_tracker.py use absolute imports (e.g., `from server.core.database import`) which fail when the server is executed from the server directory, causing ModuleNotFoundError.
**Solution:** Convert all absolute imports to relative imports in server/api/adw_db.py, server/api/issue_tracker.py, and server/models/adw_db_models.py to resolve the import errors and restore API functionality.

## Files to Modify
Use these files to implement the patch:

- `server/api/adw_db.py` - Fix absolute imports to relative imports
- `server/api/issue_tracker.py` - Fix absolute imports to relative imports
- `server/models/adw_db_models.py` - Verify imports (no changes needed based on inspection)

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix imports in server/api/adw_db.py
- Change `from server.core.database import get_db_manager` to `from ..core.database import get_db_manager`
- Change `from server.models.adw_db_models import (...)` to `from ..models.adw_db_models import (...)`

### Step 2: Fix imports in server/api/issue_tracker.py
- Change `from server.core.database import get_db_manager` to `from ..core.database import get_db_manager`
- Change `from server.models.adw_db_models import (...)` to `from ..models.adw_db_models import (...)`

### Step 3: Verify server/models/adw_db_models.py
- Inspect the file to confirm it does not have any absolute imports starting with `server.`
- No changes required (confirmed - file only uses standard library and third-party imports)

### Step 4: Create/Update Tests
- Create integration test in `server/tests/integration/test_import_resolution.py` to verify imports work correctly
- Test that the API routers can be imported without ModuleNotFoundError
- Test that get_db_manager can be imported from the API modules
- Test that database API models can be imported

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. **Python Syntax Check**: `uv run python -m py_compile server/api/adw_db.py server/api/issue_tracker.py server/models/adw_db_models.py`
2. **Backend Linting**: `uv run ruff check server/`
3. **Import Test**: `uv run python -c "from server.api import adw_db, issue_tracker; print('Imports successful')"`
4. **Integration Tests**: `uv run pytest server/tests/integration/test_import_resolution.py -v`
5. **All Backend Tests**: `uv run pytest server/tests/ -v --tb=short`
6. **Server Startup Test**: Start the server and verify the /api/adws and /api/issues endpoints are registered and accessible

## Patch Scope
**Lines of code to change:** 4 lines (2 in adw_db.py, 2 in issue_tracker.py)
**Risk level:** low
**Testing required:** Unit tests for import resolution, integration tests for API endpoint availability, server startup verification
