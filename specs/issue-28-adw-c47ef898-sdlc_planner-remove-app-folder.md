# Chore: Remove @app/ folder and refactor to use src

## Metadata
issue_number: `28`
adw_id: `c47ef898`
issue_json: `{"number":28,"title":"remove the folder @app/ since we are anywhays usin...","body":"remove the folder @app/ since we are anywhays using src and make the refactor wherever it applies.\n  especially in @scripts/"}`

## Chore Description
The codebase currently has both an `app/` folder (containing only `app/server/` subdirectory) and a `src/` folder (containing the client code). Since the client code is already using `src/`, we should consolidate by:
1. Moving `app/server/` contents to a more appropriate location (either as a standalone server directory at the root, or integrating with existing structure)
2. Removing the now-empty `app/` folder
3. Updating all references in scripts and other files that point to `app/server/` or `app/client/`

The `app/` folder currently contains:
- `app/server/` - FastAPI backend with API routes, core utilities, database files, and tests
- No client code (client is already in `src/`)

## Relevant Files
Use these files to resolve the chore:

### Files to Examine and Update

- `scripts/copy_dot_env.sh` - References `app/server/.env` on lines 12-16. Needs to be updated to new server location.

- `scripts/reset_db.sh` - References `app/server/db/backup.db` and `app/server/db/database.db` on line 7. Needs to be updated to new database location.

- `adws/adw_tests/test_r2_uploader.py` - References `app/client/public/bg.png` on lines 13 and 87. This path needs to be updated since client assets should be under `src/` or `public/` directory.

- `vite.config.js` - References `app/server/.env` in the watch ignored patterns on line 17. Needs to be updated to new server location.

### Files/Directories to Move

- `app/server/` - All server code needs to be moved to `server/` at the project root (13 Python files + 2 database files)
  - `app/server/server.py` - Main FastAPI server entry point
  - `app/server/main.py` - Main application entry point
  - `app/server/api/` - API route modules (adws.py, merge.py, stage_logs.py, __init__.py)
  - `app/server/core/` - Core utilities (__init__.py, utils.py)
  - `app/server/db/` - Database files (backup.db, database.db)
  - `app/server/tests/` - Server test files (test_main.py, test_server.py, test_utils.py, __init__.py)
  - `app/server/.env` - Server environment file

### Directories to Remove

- `app/` - Remove after moving all contents

### New Files
None required - this is a refactoring chore focused on moving and updating existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Move server directory to root
- Move `app/server/` to `server/` at the project root
- Verify all files are moved correctly (13 Python files, 2 database files, 1 .env file)
- Remove the now-empty `app/` directory

### 2. Update script references in scripts/copy_dot_env.sh
- Update line 12: Change `"../tac-6/app/server/.env"` to `"../tac-6/server/.env"`
- Update line 13: Change `cp ../tac-6/app/server/.env app/server/.env` to `cp ../tac-6/server/.env server/.env`
- Update line 14: Change echo message from `"app/server/.env"` to `"server/.env"`
- Update line 16: Change error message from `"../tac-6/app/server/.env"` to `"../tac-6/server/.env"`

### 3. Update script references in scripts/reset_db.sh
- Update line 7: Change `cp app/server/db/backup.db app/server/db/database.db` to `cp server/db/backup.db server/db/database.db`

### 4. Update test file references in adws/adw_tests/test_r2_uploader.py
- Update line 13: Change comment from `1. Upload app/client/public/bg.png to R2` to `1. Upload public/bg.png to R2`
- Update line 87: Change `test_file = "app/client/public/bg.png"` to `test_file = "public/bg.png"`

### 5. Update vite.config.js watch ignore patterns
- Update line 17: Change `ignored: ['**/.env*', '**/app/server/.env*']` to `ignored: ['**/.env*', '**/server/.env*']`

### 6. Search for any remaining app/ references
- Use grep to search for any remaining `app/server` or `app/client` references in the codebase
- Update any additional references found (excluding node_modules)

### 7. Verify directory structure
- Confirm `server/` directory exists at project root with all expected subdirectories (api/, core/, db/, tests/)
- Confirm `app/` directory has been removed
- Confirm `src/` directory still contains client code

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898 && find . -type f -name "*.py" -o -name "*.sh" -o -name "*.js" | xargs grep -l "app/server" | grep -v node_modules` - Verify no remaining app/server references
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898 && find . -type f -name "*.py" -o -name "*.sh" -o -name "*.js" | xargs grep -l "app/client" | grep -v node_modules` - Verify no remaining app/client references
- `ls /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898/server` - Verify server directory exists at root
- `ls /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898/app 2>&1` - Verify app directory no longer exists (should show "No such file or directory")
- `cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898/server && uv run pytest` - Run server tests to validate no regressions
- `bash /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898/scripts/copy_dot_env.sh 2>&1 | grep -E "(Success|Error)"` - Test copy_dot_env.sh script (may fail if source doesn't exist, but should show correct paths)
- `bash /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/c47ef898/scripts/reset_db.sh` - Test reset_db.sh script to ensure database paths work

## Notes
- The client code is already correctly located in `src/` so no client-side refactoring is needed
- The `public/` directory at the root already exists and contains `vite.svg`, so moving references from `app/client/public/` to `public/` is appropriate
- The server imports use relative imports (e.g., `from api import adws`) rather than absolute imports like `from app.server.api import adws`, so moving the server directory should not break Python imports
- After moving, the server can still be run using `uv run` commands from the server directory
- The start.sh script (scripts/start.sh) doesn't reference app/server paths directly, so it should continue working after the refactor
