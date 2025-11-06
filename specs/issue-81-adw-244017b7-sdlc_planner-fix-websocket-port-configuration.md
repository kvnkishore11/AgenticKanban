# Bug: Fix WebSocket Port Configuration to Use Dynamic Port 8500

## Metadata
issue_number: `81`
adw_id: `244017b7`
issue_json: `{"number":81,"title":"Fix teh issue","body":"Fix teh issue. failed to fetch.  by the way it should not be calling to 8002. use our dynamic websocket port here it is 8500.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/b5eef7d5-960f-49c8-b6a8-35f5c4121fa9)\n\n"}`

## Bug Description
The application is failing to fetch data from the WebSocket server with the error "failed to fetch". The user reports that the system is incorrectly attempting to connect to port 8002 when it should be using the dynamic WebSocket port 8500. This is causing connection failures and preventing the frontend from communicating with the WebSocket server.

## Problem Statement
The frontend application is unable to establish a WebSocket connection because the `.env` file contains conflicting and duplicate port configurations that are preventing the application from correctly identifying the WebSocket server port. Specifically:
- Line 32 sets `VITE_BACKEND_URL=http://localhost:8500`
- Line 37 sets `VITE_BACKEND_URL=http://localhost:8501` (duplicate, conflicting)
- Line 35 sets `WEBSOCKET_PORT=8501` (conflicts with the intended port 8500)
- The WebSocket server runs on port 8500 by default (as configured in `trigger_websocket.py`)

This configuration mismatch causes the frontend to attempt connections to the wrong port, resulting in "failed to fetch" errors.

## Solution Statement
Clean up the `.env` file to remove duplicate and conflicting port configurations. Ensure that:
1. Only one `VITE_BACKEND_URL` is defined pointing to the correct port (8500)
2. `VITE_WEBSOCKET_PORT` is explicitly set to 8500
3. Remove conflicting worktree-specific port configurations that should not be in the main `.env` file
4. The frontend will automatically use the correct port from environment variables via the existing websocketService.js configuration logic

## Steps to Reproduce
1. Start the WebSocket server using `python start-websocket.py` (which defaults to port 8500)
2. Start the frontend dev server using `npm run dev`
3. Open the application in a browser at http://localhost:5173
4. Open browser DevTools console
5. Observe WebSocket connection attempts and "failed to fetch" errors
6. Note that the application may be trying to connect to port 8501 instead of 8500 due to conflicting `.env` configuration

## Root Cause Analysis
The root cause is duplicate and conflicting environment variable definitions in the `.env` file:

1. **Duplicate VITE_BACKEND_URL entries** (lines 32 and 37):
   - Line 32: `VITE_BACKEND_URL=http://localhost:8500` (correct)
   - Line 37: `VITE_BACKEND_URL=http://localhost:8501` (incorrect, overrides line 32)

2. **Conflicting WEBSOCKET_PORT** (line 35):
   - `WEBSOCKET_PORT=8501` conflicts with the intended port 8500
   - This appears to be a leftover from worktree configuration

3. **Unnecessary FRONTEND_PORT** (line 36):
   - `FRONTEND_PORT=9201` is a worktree-specific setting that shouldn't be in the main `.env`

When environment variables are loaded, the last definition wins (line 37's value of 8501), causing the frontend to attempt connections to port 8501 while the WebSocket server is running on port 8500.

The websocketService.js correctly reads these environment variables:
- `VITE_BACKEND_URL` is read from `import.meta.env.VITE_BACKEND_URL`
- `VITE_WEBSOCKET_PORT` is read from `import.meta.env.VITE_WEBSOCKET_PORT`
- It uses `VITE_WEBSOCKET_PORT` if provided, otherwise extracts the port from `VITE_BACKEND_URL`

So the issue is purely in the `.env` configuration, not the application code.

## Relevant Files
Use these files to fix the bug:

- **`.env`** (lines 32-37) - Contains duplicate and conflicting environment variable definitions
  - Line 32: `VITE_BACKEND_URL=http://localhost:8500` (correct value, but overridden)
  - Line 33: `VITE_WEBSOCKET_PORT=8500` (correct value)
  - Line 35: `WEBSOCKET_PORT=8501` (conflicts with line 33, appears to be worktree leftover)
  - Line 36: `FRONTEND_PORT=9201` (worktree-specific, not needed in main .env)
  - Line 37: `VITE_BACKEND_URL=http://localhost:8501` (duplicate, incorrect value)
  - **Why relevant**: This is the source of the configuration conflict causing the bug

- **`start-websocket.py`** (lines 60-61) - WebSocket server startup script
  - Reads `WEBSOCKET_PORT` environment variable with default of 8500
  - **Why relevant**: Confirms the server runs on port 8500 by default

- **`adws/adw_triggers/trigger_websocket.py`** (lines 60-61) - WebSocket trigger server implementation
  - `DEFAULT_PORT = 8500` and `WEBSOCKET_PORT = int(os.getenv("WEBSOCKET_PORT", str(DEFAULT_PORT)))`
  - **Why relevant**: Shows the server-side default port configuration is 8500

- **`src/services/websocket/websocketService.js`** (lines 62-76) - WebSocket client configuration
  - Reads `VITE_BACKEND_URL` and `VITE_WEBSOCKET_PORT` from environment variables
  - Uses `VITE_WEBSOCKET_PORT` if provided, otherwise falls back to port from `VITE_BACKEND_URL`
  - **Why relevant**: Shows the client correctly reads environment variables; no code changes needed

- **`src/components/ui/WebSocketStatusIndicator.jsx`** (line 463) - WebSocket status display component
  - Currently shows fallback port as 8500: `{status.serverStatus.config.port || 8500}`
  - **Why relevant**: Already displays the correct fallback port 8500; no changes needed

### New Files
None - this is a configuration-only fix.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Clean Up .env File Configuration
- Read the `.env` file to confirm the conflicting entries on lines 32-37
- Remove the duplicate `VITE_BACKEND_URL` entry on line 37 (`VITE_BACKEND_URL=http://localhost:8501`)
- Remove or comment out the conflicting `WEBSOCKET_PORT=8501` entry on line 35 (this conflicts with `VITE_WEBSOCKET_PORT=8500`)
- Remove or comment out the `FRONTEND_PORT=9201` entry on line 36 (worktree-specific, not needed in main .env)
- Ensure line 32 has `VITE_BACKEND_URL=http://localhost:8500` (matching the WebSocket server port)
- Ensure line 33 has `VITE_WEBSOCKET_PORT=8500` (explicit WebSocket port configuration)
- After cleanup, lines 32-33 should be the only frontend configuration entries in this section

### Verify No Code Changes Are Needed
- Read `src/services/websocket/websocketService.js` lines 61-76 to confirm the configuration logic correctly reads `VITE_WEBSOCKET_PORT` and `VITE_BACKEND_URL`
- Read `src/components/ui/WebSocketStatusIndicator.jsx` line 463 to confirm the fallback port is already 8500
- Confirm no hardcoded port 8002 references exist in the source code by running grep

### Restart Services and Validate Connection
- Stop any running WebSocket server processes
- Start the WebSocket server using `python start-websocket.py` to confirm it starts on port 8500
- Stop any running frontend dev servers
- Start the frontend dev server using `npm run dev`
- Open browser DevTools and verify WebSocket connection succeeds to `ws://localhost:8500/ws/trigger`
- Verify the WebSocket status indicator in the UI shows "Connected" with port 8500

### Run Validation Commands
- Execute all commands in the Validation Commands section below to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cat .env | grep -E "VITE_BACKEND_URL|VITE_WEBSOCKET_PORT|WEBSOCKET_PORT|FRONTEND_PORT"` - Verify environment variables are correctly configured with no duplicates or conflicts
- `grep -r "8002" src/ || echo "No hardcoded 8002 references found"` - Verify no hardcoded references to port 8002 exist in source code
- `grep -r "8501" .env || echo "No 8501 references in .env"` - Verify the conflicting port 8501 has been removed from .env
- `npm run tsc --noEmit` - Run frontend type checking to validate no type errors were introduced
- `npm run build` - Run frontend build to validate the build succeeds with correct configuration

## Notes
- This is purely a configuration bug - no code changes are required
- The WebSocket server (`trigger_websocket.py`) correctly defaults to port 8500
- The WebSocket client (`websocketService.js`) correctly reads environment variables
- The issue was caused by duplicate/conflicting `.env` entries that appear to be leftovers from worktree configuration
- After fixing `.env`, both frontend and WebSocket server will use port 8500 consistently
- Worktree-specific configurations (like `WEBSOCKET_PORT=8501` and `FRONTEND_PORT=9201`) should only exist in worktree `.env` files, not in the main project `.env`
- The fix is minimal and surgical - only removing/cleaning up conflicting configuration entries
- No E2E test is needed as this is a straightforward configuration fix that can be validated by checking the WebSocket connection status in browser DevTools
