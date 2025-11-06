# Chore: Prevent Vite dev server from reloading when workflows trigger

## Metadata
issue_number: `68`
adw_id: `e986dd60`
issue_json: `{"number":68,"title":"Starting Vite dev server","body":"Starting Vite dev server...\n\n> agentic-kanban@0.0.0 dev\n> vite\n\n✔ Console Ninja extension is connected to Vite, see https://tinyurl.com/2vt8jxzw\n\n  VITE v4.5.14  ready in 344 ms\n\n  ➜  Local:   http://localhost:5173/\n  ➜  Network: use --host to expose\n  ➜  press h to show help\n7:45:02 PM [vite] page reload trees/662ea49d/index.html\n7:45:02 PM [vite] changed tsconfig file detected: /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/662ea49d/tsconfig.json - Clearing cache and forcing full-reload to ensure TypeScript is compiled with updated config values.\n7:45:02 PM [vite] changed tsconfig file detected: /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/662ea49d/tsconfig.json - Clearing cache and forcing full-reload to ensure TypeScript is compiled with updated config values. (x2)\n\n\ncan you ensure that this does not happen. all the time i trigger a workflow the entire frontend is relaoding because of this. please try to fix this"}`

## Chore Description
The Vite dev server is reloading whenever ADW workflows are triggered because it detects file changes in the isolated worktree directories (`trees/*/`). Specifically, Vite is detecting changes to `tsconfig.json` and configuration files (`.mcp.json`, `playwright-mcp-config.json`) in worktree directories, triggering full page reloads that disrupt the development experience.

The issue occurs because:
1. ADW workflows create isolated git worktrees under `trees/<adw_id>/`
2. These worktrees contain complete copies of the project, including `tsconfig.json`
3. Workflow operations modify configuration files (`.mcp.json`, `playwright-mcp-config.json`) with worktree-specific paths
4. Vite's file watcher picks up these changes and triggers unnecessary reloads
5. This disrupts the main frontend development server running on the main repository

The solution is to configure Vite to ignore the `trees/` directory and related configuration files that don't affect the main dev server.

## Relevant Files
Use these files to resolve the chore:

- `vite.config.js` - Vite configuration file that controls the dev server behavior. Currently ignores `.env*` files but needs to be extended to ignore worktree directories and config files.
  - Lines 16-20: Current watch configuration with ignored patterns
  - Needs to be updated to ignore `trees/` directory and MCP configuration files

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Update Vite watch configuration to ignore worktree directories
- Edit `vite.config.js`
- Expand the `server.watch.ignored` array to include:
  - `**/trees/**` - Ignore all files in worktree directories
  - `**/.mcp.json` - Ignore MCP configuration files
  - `**/playwright-mcp-config.json` - Ignore Playwright MCP config files
- Add a comment explaining that these patterns prevent reloads from worktree operations
- Ensure the existing `.env*` patterns remain in place

### 2. Test the configuration changes
- Start the Vite dev server and verify it loads correctly
- Trigger a test workflow (or simulate by creating/modifying files in `trees/test/`)
- Verify that the Vite dev server does NOT reload when files change in `trees/` directory
- Verify that the dev server still reloads for actual source code changes in `src/`

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run dev` - Start the Vite dev server and verify it starts without errors
- `npm run typecheck` - Run TypeScript type checking to ensure configuration is valid
- Manual test: Create a test file in `trees/test/tsconfig.json` and verify Vite does not reload
- Manual test: Modify a file in `src/` and verify Vite DOES reload as expected

## Notes
- The `vite.config.js` already has a watch configuration that ignores `.env*` files (added to prevent WebSocket connection disruptions)
- The same pattern should be extended to ignore worktree directories
- This is a non-breaking change that only affects file watching behavior
- The worktree directories are completely isolated and their file changes should never affect the main dev server
- After this fix, developers can trigger ADW workflows without their frontend dev server reloading
