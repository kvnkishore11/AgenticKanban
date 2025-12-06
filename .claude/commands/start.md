# Start the application

## Workflow

1. Determine the worktree context:
   - Check if current directory path contains `trees/<adw_id>/`
   - If yes, extract the adw_id from the path
   - If in main project root, use "main" as the identifier

2. Start using worktree manager:
   ```bash
   wt start
   ```

   Or with specific adw_id:
   ```bash
   wt start <adw_id>
   ```

3. This automatically:
   - Picks random available ports
   - Starts frontend and backend
   - Registers Caddy routes
   - Opens browser at http://<adw_id>.localhost

4. Report the URLs to the user:
   - Frontend: http://<adw_id>.localhost
   - Backend: http://api.<adw_id>.localhost
   - ADW Server: ws://adw.<adw_id>.localhost/ws/trigger

## Legacy/Manual Startup (Fallback)

If `wt` is not available or you need manual startup:

1. Check if `.ports.env` exists:
   - If it exists, source it and use `FRONTEND_PORT` for the PORT variable
   - If not, use default PORT: 5173

2. Check if a process is already running on port PORT.

3. If it is, just open it in the browser with `open http://localhost:FRONTEND_PORT`.

4. If there is no process running on port PORT, run these commands:
   - Run `nohup sh ./scripts/start.sh > /dev/null 2>&1 &`
   - Run `sleep 3`
   - Run `open http://localhost:PORT`

5. Let the user know that the application is running.
