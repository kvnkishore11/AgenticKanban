# Bug: Fix Persistent Dummy Projects in Dashboard

## Metadata
issue_number: `005`
adw_id: `005`
issue_json: `{"title": "Fix persistent dummy projects in dashboard", "body": "also if you se the image there are multiple instances in teh dash board. i could still see some of the projects are demo and they are not removes from here."}`

## Bug Description
Despite removing the dummy projects code from ProjectSelector.jsx, users can still see demo/dummy projects in the dashboard. This occurs because:
1. Multiple dev server instances are running simultaneously on different ports (5173, 5174, etc.)
2. Dummy projects were previously stored in browser localStorage via Zustand's persist middleware and continue to be loaded even after code removal
3. Different ports have different localStorage contexts, creating inconsistent user experiences

## Problem Statement
The dummy projects persist in localStorage and multiple dev server instances create confusion about which data the user is viewing, leading to an inconsistent user experience where some instances show dummy projects while others do not.

## Solution Statement
Implement a localStorage cleanup mechanism and data migration strategy to remove persisted dummy projects, kill redundant dev server instances, and add safeguards to prevent dummy data persistence in the future.

## Steps to Reproduce
1. Navigate to the application on any running port (http://localhost:5173, http://localhost:5174, etc.)
2. Observe that dummy/demo projects still appear in the project selection dashboard
3. Check multiple ports to see inconsistent data across different dev server instances
4. Verify that browser localStorage contains persisted dummy project data under 'agentic-kanban-storage'

## Root Cause Analysis
1. **Data Persistence**: Zustand's persist middleware stores `availableProjects` in localStorage with key 'agentic-kanban-storage'. Dummy projects added before the code removal remain in this storage.
2. **Multiple Dev Instances**: Multiple `npm run dev` processes are running simultaneously, creating different Vite servers on different ports with potentially different localStorage contexts.
3. **No Migration Strategy**: There's no mechanism to clean up old dummy data when the codebase changes.

## Relevant Files
Use these files to fix the bug:

- `src/stores/kanbanStore.js` - Contains the Zustand store with persist middleware that needs data migration logic
- `src/components/ProjectSelector.jsx` - Already updated but may need additional safeguards
- `package.json` - Contains dev scripts that may need modification to prevent multiple instances
- Browser localStorage - Contains persisted dummy data that needs cleanup

### New Files
- `src/utils/dataMigration.js` - Data migration utilities for cleaning localStorage
- `scripts/dev-check.js` - Script to check for running dev processes before starting new ones

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Kill Multiple Dev Server Instances
- Identify and kill all running dev server processes to eliminate port conflicts
- Ensure only one clean dev server instance is running

### Create Data Migration Utility
- Create `src/utils/dataMigration.js` with functions to detect and remove dummy projects from localStorage
- Add migration function to identify dummy projects by their IDs and properties
- Implement localStorage cleanup that preserves real user-added projects

### Update Kanban Store with Migration Logic
- Modify `src/stores/kanbanStore.js` to include data migration on store initialization
- Add version-based migration system to handle future data structure changes
- Ensure migration runs only once per version and doesn't affect real projects

### Add Dev Server Instance Protection
- Create `scripts/dev-check.js` to check for existing dev processes before starting
- Update package.json dev script to use the check script
- Add port cleanup and validation

### Add Dummy Project Detection Safeguards
- Update `src/components/ProjectSelector.jsx` with additional safeguards to prevent dummy project display
- Add validation to ensure only real projects are shown
- Implement project validation that checks for dummy project characteristics

### Test Data Migration and Cleanup
- Test localStorage cleanup functionality
- Verify that real projects are preserved during migration
- Ensure dummy projects are completely removed
- Test with multiple browser profiles and localStorage states

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `pkill -f "npm run dev"` - Kill all existing dev server instances
- `npm run dev` - Start single clean dev server instance
- `localStorage.getItem('agentic-kanban-storage')` - Verify dummy projects removed from browser storage
- Open browser developer tools → Application → Local Storage → Check 'agentic-kanban-storage' contains no dummy projects
- `lsof -i :5173` - Verify only one process is using port 5173
- `lsof -i :5174` - Verify no process is using port 5174
- Visit http://localhost:5173 and verify no dummy/demo projects appear in dashboard
- Add a real project and verify it persists correctly
- Refresh browser and verify only real projects remain visible
- `npm run lint` - Run linting to ensure code quality standards are met
- `npm run build` - Run frontend build to validate the bug is fixed with zero regressions
- `npm run test` - Run tests to validate the bug is fixed with zero regressions

## Notes
- The Zustand persist middleware automatically saves state changes to localStorage, which is why dummy projects persisted even after code removal
- Multiple dev server instances occur when `npm run dev` is run multiple times without killing previous instances
- Each port creates its own localStorage context in some browsers, leading to inconsistent data views
- This migration approach ensures existing real user projects are preserved while removing only dummy/demo data
- Future dummy project additions should be marked clearly and excluded from persistence to prevent this issue from recurring