# Chore: Separate WebSocket and Backend Ports

## Metadata
issue_number: `34`
adw_id: `5843241c`
issue_json: `{"number":34,"title":"currently we have our adw system which has fronten...","body":"currently we have our adw system which has frontend_port nad backend_port. as of now for this project we are assuming teh backend_port and websocket_port are one and the same and we have used them almost everywehre without distinction. \n\nNow I want these two aspects to be seperate. \nLet the Websocket port be 8500 by default and let them be seperate.\n\nRefactor everywhere whereever it makes sense especially in the scripts and services and /slashcommands. \n\nas for this project we dont have any backend server so we need not start any backend. \nbut we may have to start websocket server. \n\ntry to make these modifications. Ensure to practice industry best practices and try to ensure we have super smooth connections."}`

## Chore Description

Currently, the ADW system uses `backend_port` and assumes it's the same as `websocket_port`. This conflation exists throughout the codebase in scripts, services, environment files, and slash commands. The chore is to:

1. **Separate the two concepts**: Create a distinct `websocket_port` that defaults to 8500, separate from `backend_port`
2. **Update the data model**: Modify `ADWStateData` and related data structures to track both ports independently
3. **Refactor all usages**: Update scripts, services, environment files, and documentation to distinguish between the two
4. **Remove backend server references**: Since this project doesn't have a backend HTTP server, remove or clarify references to backend_port where appropriate
5. **Preserve WebSocket functionality**: Ensure the WebSocket server (trigger_websocket.py) works smoothly with the new port allocation

The goal is to have clean separation where:
- `websocket_port` is used for WebSocket connections (default: 8500, range: 8500-8514 for worktrees)
- `backend_port` is either deprecated or clearly marked as unused for this project
- All configuration files, scripts, and services reflect this separation

## Relevant Files

Use these files to resolve the chore:

- **adws/adw_modules/data_types.py** (lines 218-240) - Contains `ADWStateData` model which currently has `backend_port` and `frontend_port`. Need to add `websocket_port` and update the model.

- **adws/adw_modules/worktree_ops.py** (lines 1-244) - Contains port allocation logic (`get_ports_for_adw`, `find_next_available_ports`) and worktree environment setup (`setup_worktree_environment`). Currently allocates backend ports 9100-9114. Need to change to allocate websocket ports 8500-8514.

- **adws/adw_modules/state.py** (lines 37, 97, 180) - State management code that references `backend_port`. Need to update to handle `websocket_port`.

- **adws/adw_modules/discovery.py** (lines 99-130) - Discovery module that formats ADW responses including `backend_port`. Need to add `websocket_port` to the response format.

- **adws/adw_triggers/trigger_websocket.py** (lines 1-100+) - WebSocket trigger server that currently reads `BACKEND_PORT` from environment. Need to change to read `WEBSOCKET_PORT`.

- **adws/README.md** (entire file) - Extensive documentation about ADW system that mentions backend ports throughout. Need to update all references to reflect WebSocket port separation.

- **scripts/start.sh** (lines 1-157) - Main startup script that sets `WEBSOCKET_PORT` from `BACKEND_PORT`. Need to change to use separate `WEBSOCKET_PORT` with 8500 default.

- **scripts/start-worktree.sh** (lines 1-283) - Worktree startup script that uses `BACKEND_PORT`. Need to update to use `WEBSOCKET_PORT`.

- **scripts/start-websocket.sh** (lines 1-11) - WebSocket startup script that may need updating.

- **start-websocket.py** (lines 1-45) - Python script that starts the WebSocket server. May need environment variable updates.

- **src/services/websocket/websocketService.js** (lines 1-100+) - Frontend WebSocket service that reads `VITE_BACKEND_URL` to determine port. Need to update to use a separate WebSocket URL/port configuration.

- **vite.config.js** (lines 1-23) - Vite configuration that reads `BACKEND_PORT` for frontend. Need to clarify or update this.

- **.env** (lines 32-37) - Environment file with `BACKEND_PORT`, `FRONTEND_PORT`, and `VITE_BACKEND_URL`. Need to add `WEBSOCKET_PORT` and update `VITE_BACKEND_URL` to point to WebSocket port.

- **.claude/commands/install_worktree.md** - Slash command for installing worktree that may reference ports.

- **.claude/commands/start_websocket.md** (lines 1-34) - Documentation for starting WebSocket server. Need to update to reflect new port configuration.

### New Files

None. All changes are refactorings of existing files.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update Data Models and Core Types

- Update `adws/adw_modules/data_types.py`:
  - Add `websocket_port: Optional[int] = None` to `ADWStateData` model (around line 232)
  - Keep `backend_port` for backward compatibility but mark it as deprecated or unused
  - Update any TypeScript-like types or comments to reflect the new field

### Step 2: Update Port Allocation Logic

- Update `adws/adw_modules/worktree_ops.py`:
  - Modify `get_ports_for_adw()` function to return WebSocket ports in range 8500-8514 instead of backend ports 9100-9114
  - Update `find_next_available_ports()` to use the new WebSocket port range
  - Modify `setup_worktree_environment()` to write `WEBSOCKET_PORT` instead of `BACKEND_PORT` to `.ports.env`
  - Keep frontend port allocation as-is (9200-9214)
  - Update function signatures and return types to reflect `websocket_port` instead of `backend_port`

### Step 3: Update State Management

- Update `adws/adw_modules/state.py`:
  - Update state serialization to include `websocket_port`
  - Modify any state loading/validation logic that references `backend_port` to use `websocket_port`
  - Ensure backward compatibility by migrating old state files that only have `backend_port`

### Step 4: Update Discovery and API Responses

- Update `adws/adw_modules/discovery.py`:
  - Add `websocket_port` to the `format_adw_response()` function
  - Include websocket_port in API responses for ADW metadata

### Step 5: Update WebSocket Trigger Server

- Update `adws/adw_triggers/trigger_websocket.py`:
  - Change environment variable from `BACKEND_PORT` to `WEBSOCKET_PORT`
  - Update default port from 8002 to 8500
  - Update any logging or display messages to reference "WebSocket port" instead of "backend port"

### Step 6: Update Startup Scripts

- Update `scripts/start.sh`:
  - Change `WEBSOCKET_PORT=${BACKEND_PORT:-8002}` to `WEBSOCKET_PORT=${WEBSOCKET_PORT:-8500}`
  - Update environment variable exports to use `WEBSOCKET_PORT`
  - Update all display messages to show WebSocket port instead of backend port
  - Update kill_port function calls to reference "WebSocket server" instead of "backend server"

- Update `scripts/start-worktree.sh`:
  - Similar changes as start.sh - use `WEBSOCKET_PORT` instead of `BACKEND_PORT`
  - Update all port validation and display logic
  - Update environment variable loading from `.ports.env`

- Review `scripts/start-websocket.sh` and update if it references backend port

- Review `start-websocket.py` and update if it needs WebSocket port environment variables

### Step 7: Update Frontend Services and Configuration

- Update `src/services/websocket/websocketService.js`:
  - Update comments and variable names to clarify that we're connecting to WebSocket server, not a generic backend
  - If `VITE_BACKEND_URL` is used for WebSocket connections, consider renaming to `VITE_WEBSOCKET_URL` or add a separate config
  - Ensure the service correctly reads the WebSocket port from environment

- Update `vite.config.js`:
  - Review if BACKEND_PORT is still relevant or if it should be WEBSOCKET_PORT
  - Update comments to clarify port usage

### Step 8: Update Environment Files

- Update `.env`:
  - Add `WEBSOCKET_PORT=8500`
  - Update or clarify `BACKEND_PORT` usage (mark as deprecated or remove if unused)
  - Update `VITE_BACKEND_URL` to point to the WebSocket port (or add `VITE_WEBSOCKET_URL`)
  - Add comments explaining the port configuration

### Step 9: Update Documentation

- Update `adws/README.md`:
  - Replace all references to "backend port" with "WebSocket port" where appropriate
  - Update port ranges: change 9100-9114 to 8500-8514 for WebSocket ports
  - Update all example commands and configurations to use `WEBSOCKET_PORT`
  - Update the "Port Allocation" section to reflect WebSocket ports
  - Update environment variable documentation
  - Clarify that this project doesn't have a backend HTTP server, only a WebSocket server

- Update `.claude/commands/start_websocket.md`:
  - Update documentation to reference WebSocket port (8500 by default)
  - Clarify environment variable usage

- Update `.claude/commands/install_worktree.md` if it references port configuration

### Step 10: Search and Replace Remaining References

- Use grep to find any remaining references to `backend_port` or `BACKEND_PORT` in:
  - All Python files in `adws/`
  - All JavaScript/JSX files in `src/`
  - All markdown files in `specs/` and `app_docs/`
  - All slash command files in `.claude/commands/`
- Update each reference to use `websocket_port` or `WEBSOCKET_PORT` as appropriate
- For any files that legitimately need to reference a backend (future HTTP API), add clarifying comments

### Step 11: Run Validation Commands

- Execute all validation commands to ensure zero regressions

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `cd adws && uv run adw_tests/health_check.py` - Verify ADW system health including port allocations
- `grep -r "BACKEND_PORT" adws/ scripts/ src/ .env .claude/commands/ | grep -v ".git"` - Ensure no unexpected BACKEND_PORT references remain (should only see deprecated/backward compatibility references)
- `grep -r "WEBSOCKET_PORT" adws/ scripts/ src/ .env .claude/commands/ | grep -v ".git"` - Verify WEBSOCKET_PORT is used consistently
- `python -c "from adws.adw_modules.data_types import ADWStateData; print(ADWStateData.model_json_schema())"` - Verify websocket_port is in the data model
- `python -c "from adws.adw_modules.worktree_ops import get_ports_for_adw; print(get_ports_for_adw('test1234'))"` - Verify port allocation returns WebSocket ports in correct range

## Notes

- **Backward Compatibility**: Keep `backend_port` in the data model for now to avoid breaking existing state files. It can be marked as deprecated and removed in a future cleanup.
- **Frontend Configuration**: The frontend currently uses `VITE_BACKEND_URL` which might be confusing now that we only have WebSocket. Consider if this should be renamed to `VITE_WEBSOCKET_URL` for clarity.
- **Port Ranges**: WebSocket ports will use 8500-8514 (15 ports for 15 concurrent worktrees), while frontend keeps 9200-9214.
- **No HTTP Backend**: This project doesn't have a traditional HTTP backend server - the WebSocket trigger server handles all backend communication. Documentation should make this clear.
- **Industry Best Practices**:
  - Use clear, descriptive variable names (websocket_port vs backend_port)
  - Add comments explaining port usage in configuration files
  - Ensure environment variable naming is consistent across the stack
  - Provide good defaults (8500 for WebSocket, 5173 for frontend)
  - Document port ranges clearly
