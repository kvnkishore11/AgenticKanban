# Chore: Fix WebSocket Port Configuration to Use 8500

## Metadata
issue_number: `73`
adw_id: `69f5c6ce`
issue_json: `{"number":73,"title":"Try to fix the errors I see in th eimage","body":"Try to fix the errors I see in th eimage. they are not able to retreive teh list. also i guess we are requesting from wrong port. we should be using teh websocket_port i.e 8500 here. u aer using 8002 might have got hardcoded. this could fix this.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/34c074e9-a816-4b90-92aa-6e8019f4a61c)\n\n"}`

## Chore Description
The application is experiencing issues retrieving data because the WebSocket client is connecting to the wrong port. The issue indicates that requests are being made to port 8002 when they should be using port 8500 (the configured `WEBSOCKET_PORT`). This appears to be caused by:

1. Conflicting environment variable definitions in `.env` file
2. Hardcoded fallback values in the codebase that default to incorrect ports
3. Inconsistent port configuration between the client and server

The WebSocket server is configured to run on port 8500 (as defined by `WEBSOCKET_PORT=8500` in `.env`), but the frontend is attempting to connect to a different port, causing connection failures and preventing data retrieval.

## Relevant Files
Use these files to resolve the chore:

- **`.env`** (lines 32-38) - Contains environment configuration with conflicting `VITE_BACKEND_URL` entries. Line 32 has `VITE_BACKEND_URL=http://localhost:8500` and line 37 has `VITE_BACKEND_URL=http://localhost:8514`. The WebSocket port is correctly set to 8500 on line 33 (`VITE_WEBSOCKET_PORT=8500`), but there are duplicate and conflicting backend URL definitions that need to be cleaned up.

- **`src/services/websocket/websocketService.js`** (lines 61-76) - WebSocket service configuration that reads `VITE_BACKEND_URL` and `VITE_WEBSOCKET_PORT` from environment variables. The logic correctly uses `VITE_WEBSOCKET_PORT` if provided, otherwise falls back to the port from `VITE_BACKEND_URL`. This is working correctly, but needs the environment variables to be properly configured.

- **`src/stores/kanbanStore.js`** (lines 1500-1506, 1615-1621) - Contains hardcoded fallback values of `http://localhost:8500` when `VITE_BACKEND_URL` is not set. This is actually correct for the WebSocket port, but the code should be using the environment variable consistently rather than relying on fallbacks.

- **`src/components/ui/WebSocketStatusIndicator.jsx`** (line 463) - Displays the WebSocket port in the UI, showing port 8002 as a fallback. This hardcoded value is incorrect and should be removed or updated to 8500.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Clean Up Environment Configuration
- Remove the duplicate `VITE_BACKEND_URL` entry from `.env` line 37
- Ensure line 32 has `VITE_BACKEND_URL=http://localhost:8500` (matching the WebSocket port)
- Verify `VITE_WEBSOCKET_PORT=8500` is set on line 33
- Remove or comment out the conflicting `WEBSOCKET_PORT=8514` and `FRONTEND_PORT=9214` entries (lines 35-36) as these appear to be leftover from worktree configuration and are causing confusion

### Update Hardcoded Port Fallback in WebSocketStatusIndicator
- Edit `src/components/ui/WebSocketStatusIndicator.jsx` line 463
- Change the hardcoded fallback from `8002` to `8500` to match the correct WebSocket port
- This ensures the UI displays the correct port even when the server status is unavailable

### Verify WebSocket Service Configuration
- Review `src/services/websocket/websocketService.js` lines 61-76 to confirm the configuration logic is correct
- Ensure it properly reads `VITE_WEBSOCKET_PORT` first, then falls back to the port from `VITE_BACKEND_URL`
- Add console logging if needed to debug which port is being used at runtime

### Update Kanban Store Fallback URLs
- Review `src/stores/kanbanStore.js` lines 1500-1506 and 1615-1621
- Verify the fallback URL `http://localhost:8500` is correct
- Consider adding logging to warn when fallback values are used instead of environment variables

### Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cat .env | grep -E "VITE_BACKEND_URL|VITE_WEBSOCKET_PORT|WEBSOCKET_PORT"` - Verify environment variables are correctly configured with no duplicates
- `grep -r "8002" src/` - Search for any remaining hardcoded references to port 8002 that need to be updated
- `npm run typecheck` - Run TypeScript type checking to ensure no type errors were introduced
- `npm run build` - Build the frontend to ensure no build errors occur
- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The WebSocket server is correctly configured to run on port 8500 via the `WEBSOCKET_PORT` environment variable
- The issue is primarily in the frontend configuration where duplicate/conflicting environment variables are causing connection attempts to the wrong port
- After fixing the environment configuration, the WebSocket service should automatically connect to the correct port (8500)
- The hardcoded fallback values in the codebase are generally correct (8500), but should not be needed once the environment is properly configured
- Test the WebSocket connection after making changes by checking the browser console for connection logs and verifying the WebSocket status indicator shows the correct port
