# Install Worktree

This command sets up an isolated worktree environment with custom port configuration.

## Parameters
- Worktree path: {0}
- WebSocket port: {1}
- Frontend port: {2}

## Read
- .env.sample (from parent repo)
- .mcp.json (from parent repo)
- playwright-mcp-config.json (from parent repo)

## Steps

1. **Navigate to worktree directory**
   ```bash
   cd {0}
   ```

2. **Create port configuration file**
   Create `.ports.env` with:
   ```
   WEBSOCKET_PORT={1}
   FRONTEND_PORT={2}
   ADW_PORT={1}
   VITE_ADW_PORT={1}
   VITE_BACKEND_URL=http://localhost:{1}
   ```

3. **Copy and update .env files**
   - Copy `.env` from parent repo if it exists (note: parent `.env` should NOT contain port-related vars like VITE_BACKEND_URL, VITE_ADW_PORT, etc. - these are in `.ports.env`)
   - Append `.ports.env` contents to `.env`

4. **Copy and configure MCP files**
   - Copy `.mcp.json` from parent repo if it exists
   - Copy `playwright-mcp-config.json` from parent repo if it exists
   - These files are needed for Model Context Protocol and Playwright automation

   After copying, update paths to use absolute paths:
   - Get the absolute worktree path: `WORKTREE_PATH=$(pwd)`
   - Update `.mcp.json`:
     - Find the line containing `"./playwright-mcp-config.json"`
     - Replace it with `"${WORKTREE_PATH}/playwright-mcp-config.json"`
     - Use a JSON-aware tool or careful string replacement to maintain valid JSON
   - Update `playwright-mcp-config.json`:
     - Find the line containing `"dir": "./videos"`
     - Replace it with `"dir": "${WORKTREE_PATH}/videos"`
     - Create the videos directory: `mkdir -p ${WORKTREE_PATH}/videos`
   - This ensures MCP configuration works correctly regardless of execution context

5. **Install frontend dependencies**
   ```bash
   npm install
   ```

## Error Handling
- If parent .env files don't exist, create minimal versions from .env.sample files
- Ensure all paths are absolute to avoid confusion

## Report
- List all files created/modified (including MCP configuration files)
- Show port assignments
- Confirm frontend dependencies installed
- Note any missing parent .env files that need user attention
- Note any missing MCP configuration files
- Show the updated absolute paths in:
  - `.mcp.json` (should show full path to playwright-mcp-config.json)
  - `playwright-mcp-config.json` (should show full path to videos directory)
- Confirm videos directory was created