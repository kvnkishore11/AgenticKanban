# Chore: Investigate and Fix Frontend Abrupt Stops

## Metadata
issue_number: `72`
adw_id: `ffbc9102`
issue_json: `{"number":72,"title":"For soem reason","body":"For soem reason. I see that after some time. my frontend abruptly stops. can you try what can be reason for this and try to fix this."}`

## Chore Description
The frontend application (Vite dev server) is abruptly stopping after some time during operation. This issue needs investigation to identify the root cause and implement a fix. Based on the codebase analysis, there are several potential causes:

1. **Uncaught JavaScript errors** - Runtime errors in React components or services that crash the application
2. **WebSocket connection failures** - The WebSocket service may encounter errors that aren't properly handled, causing the app to freeze or become unresponsive
3. **Memory leaks** - Event listeners or intervals not being cleaned up properly in React components
4. **Vite HMR (Hot Module Replacement) issues** - The dev server may be crashing due to HMR errors or file watching issues
5. **Node.js/Vite process crashes** - The underlying Node.js process running Vite may be terminating unexpectedly
6. **Port conflicts or resource exhaustion** - Multiple Vite instances or port conflicts causing the process to fail
7. **Browser console errors** - Client-side errors that cause the React app to unmount or stop rendering
8. **Environment variable issues** - Conflicting or missing environment variables (noticed duplicates in .env file)

## Relevant Files
Use these files to resolve the chore:

- `src/App.jsx` - Main application entry point, contains WebSocket initialization and error boundaries. Need to check for proper error handling and cleanup.
- `src/main.jsx` - React application root, potential source of uncaught errors.
- `src/services/websocket/websocketService.js` - WebSocket service with connection management and error handling. Contains extensive reconnection logic and event listeners that need proper cleanup.
- `src/services/websocket/connectionHealthMonitor.js` - Health monitoring service with intervals and event listeners that may not be cleaned up properly.
- `src/stores/kanbanStore.js` - Main state store, may contain logic that causes errors or memory leaks.
- `src/components/ui/ErrorBoundary.jsx` - Error boundary component, should catch React errors but may not be comprehensive enough.
- `vite.config.js` - Vite configuration with file watching settings. Currently ignores certain directories which is good, but may need additional stability improvements.
- `package.json` - Lists dependencies and npm scripts. Check for any known issues with dependency versions.
- `.env` - Contains environment variables with **duplicate VITE_BACKEND_URL entries** (lines 32 and 37) which could cause confusion.
- `.ports.env` - Contains port configuration for this worktree.
- `scripts/start_fe.sh` - Frontend startup script that kills lingering processes.
- `scripts/start.sh` - Combined startup script for WebSocket and frontend.

### New Files
- `src/utils/errorLogger.js` - Centralized error logging utility to track and report errors (if needed)
- `.env.backup` - Backup of original .env file before cleanup

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add Enhanced Error Logging and Monitoring
- Add window.onerror and unhandledrejection handlers to main.jsx to catch uncaught errors
- Add error event listener to WebSocket service to log connection failures
- Add console logging to track when components mount/unmount and services initialize/cleanup
- Implement browser console monitoring to detect client-side errors
- Add logging to track Vite HMR events and potential crashes

### Step 2: Fix Environment Variable Conflicts
- Clean up the duplicate VITE_BACKEND_URL entries in .env file (lines 32-33 vs 37)
- Ensure consistent environment variable values across .env and .ports.env
- Document the correct environment variable configuration
- Verify that vite.config.js properly loads and prioritizes environment variables

### Step 3: Improve WebSocket Service Cleanup
- Review websocketService.js cleanup() method to ensure all event listeners are removed
- Ensure all intervals (heartbeat, reconnection timers) are properly cleared
- Add cleanup call in App.jsx useEffect return function
- Review connectionHealthMonitor.js cleanup to ensure all monitoring intervals are cleared
- Add defensive checks to prevent duplicate event listener registration

### Step 4: Add React Component Lifecycle Safety
- Review all useEffect hooks in critical components to ensure cleanup functions are present
- Check for missing dependencies in useEffect dependency arrays that could cause stale closures
- Ensure ErrorBoundary is comprehensive and logs errors properly
- Add componentDidCatch to ErrorBoundary if not already present
- Review kanbanStore for potential memory leaks in subscriptions

### Step 5: Improve Vite Dev Server Stability
- Review vite.config.js watch configuration to ensure it's not overwhelming the file system
- Check for any missing error handlers in the Vite dev server process
- Consider adding process.on('uncaughtException') and process.on('unhandledRejection') handlers
- Review package.json scripts to ensure proper cleanup of orphaned processes
- Check if there are too many file watchers causing resource exhaustion

### Step 6: Add Process Monitoring and Auto-Recovery
- Enhance scripts/start_fe.sh to monitor the Vite process and restart if it crashes
- Add health check endpoints or heartbeat mechanisms to detect when frontend becomes unresponsive
- Implement automatic restart logic with exponential backoff
- Add logging to track process crashes and restart attempts

### Step 7: Testing and Validation
- Run the frontend for an extended period (30+ minutes) to reproduce the issue
- Monitor browser console for errors
- Monitor terminal for Vite process crashes
- Check system resource usage (CPU, memory) to detect resource exhaustion
- Test WebSocket disconnection/reconnection scenarios
- Verify that cleanup functions are called properly when components unmount

### Step 8: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify the frontend remains stable under normal and stress conditions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start the frontend dev server and verify it starts without errors
- `npm run lint` - Ensure no linting errors were introduced
- `npm run typecheck` - Verify TypeScript types are correct
- Browser console check - Open the application in browser and verify no console errors
- Extended runtime test - Keep the application running for 30+ minutes and verify it doesn't crash
- WebSocket stress test - Trigger multiple WebSocket operations and verify stability
- Memory leak test - Monitor browser DevTools memory usage over time to detect leaks

## Notes
- The .env file has duplicate VITE_BACKEND_URL entries which should be cleaned up
- The WebSocket service has extensive reconnection logic which may need better error boundaries
- The connectionHealthMonitor has multiple intervals that need proper cleanup
- Vite HMR can sometimes cause issues with WebSocket connections due to module reloading
- React 19 is being used (from package.json) which may have different behavior than React 18
- The ErrorBoundary should be enhanced to catch more error scenarios
- Process monitoring and auto-recovery would improve resilience
- Consider adding a health check endpoint to the frontend to enable monitoring
- The start scripts already have logic to kill orphaned processes which is good
- Need to investigate if there are lingering event listeners or intervals causing memory leaks
