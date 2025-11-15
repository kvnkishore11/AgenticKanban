# Bug: Fix Excessive App Refreshing When Creating Tickets

## Metadata
issue_number: `13`
adw_id: `e4d75c88`
issue_json: `{"number":13,"title":"For soem reason teh app is refreshing so many time...","body":"For soem reason teh app is refreshing so many times in teh beginning when a ticket is created. please look into the rootcause of this. I see several of teh logs too. Fix the issue. there might be some bug or part of the code that is makign this happen. probably some useeffect or so. do deep research and try to fix it."}`

## Bug Description
When creating a new ticket in the Kanban board, the application refreshes excessively, causing multiple re-renders and console logs. The user observes several logs appearing in the browser console, indicating the app is re-initializing or re-rendering more times than necessary. This creates a poor user experience with visible lag and cluttered console output.

## Problem Statement
The root cause is a useEffect dependency issue in `src/App.jsx` where the `initializeWebSocket` function from the Zustand store is included in the dependency array. Since Zustand store functions get new references on every state update, and task creation triggers multiple state updates, the useEffect runs repeatedly even though a `useRef` guard prevents actual re-initialization. This still causes excessive console logging and potential performance issues.

## Solution Statement
Remove the `initializeWebSocket` dependency from the useEffect in `src/App.jsx` and use an empty dependency array instead, since the function should only run once on mount. The existing `wsInitialized.current` ref already provides the necessary guard against re-initialization. Additionally, reduce excessive console logging throughout the codebase to minimize console clutter.

## Steps to Reproduce
1. Open the application in the browser with DevTools console visible
2. Create a new ticket/task by clicking "Add Task" button
3. Fill in task details and submit
4. Observe the browser console
5. **Expected**: Minimal, relevant logs
6. **Actual**: Multiple "[App] AgenticKanban initialized" logs and excessive console output indicating the app is refreshing/re-rendering multiple times

## Root Cause Analysis

### Primary Cause: useEffect Dependency on Zustand Store Function
**File**: `src/App.jsx` (Line 39-56)

The useEffect hook depends on `initializeWebSocket`:
```javascript
useEffect(() => {
  console.log('[App] AgenticKanban initialized');
  if (!wsInitialized.current) {
    wsInitialized.current = true;
    initializeWebSocket().catch(error => {
      console.error('[App] Failed to initialize WebSocket:', error);
    });
  }
}, [initializeWebSocket]);  // ❌ PROBLEMATIC
```

**Why this causes excessive refreshing:**

1. `initializeWebSocket` is a function from Zustand store (`src/stores/kanbanStore.js:910-1077`)
2. Zustand creates new function references whenever the store updates
3. When creating a task, multiple state updates occur:
   - Task creation updates state (`kanbanStore.js:398-402`)
   - `sendProjectNotification` may update state (`kanbanStore.js:405`)
   - WebSocket event handlers trigger additional updates
4. Each state update creates a new `initializeWebSocket` reference
5. The new reference triggers the useEffect to run again
6. While the `wsInitialized.current` ref prevents actual re-initialization, the console.log still fires
7. This creates the illusion of excessive app refreshing

### Contributing Factors

**Factor 1: Multiple State Updates During Task Creation**
- `src/stores/kanbanStore.js:342-445` - `createTask` triggers 2-3 state updates
- Lines 398-402: Updates tasks array, counter, and showTaskInput
- Line 405: Calls `sendProjectNotification` which may update state
- Lines 434-441: Fallback path also performs similar updates

**Factor 2: Excessive Console Logging**
- `src/stores/kanbanStore.js` contains 73+ console.log statements
- Lines 1428-1475: `handleWorkflowLog` has 10+ console logs per invocation
- This creates perception of excessive refreshing when viewing console

**Factor 3: WebSocket Event Handler State Updates**
- Lines 960-1062: Each WebSocket event handler calls `set()` to update state
- During task creation, workflow events may fire, triggering more updates
- Each update potentially causes components to re-render

## Relevant Files
Use these files to fix the bug:

- `src/App.jsx` (Lines 39-56) - **PRIMARY FIX**: Remove `initializeWebSocket` from useEffect dependencies to prevent re-runs on every store update
- `src/stores/kanbanStore.js` (Lines 342-445) - Review task creation flow; consider batching state updates if needed
- `src/stores/kanbanStore.js` (Lines 910-1077) - WebSocket initialization already has proper guards; no changes needed
- `src/stores/kanbanStore.js` (Lines 1428-1475) - Reduce excessive console logging in `handleWorkflowLog`
- `src/services/websocket/websocketService.js` - Review for any excessive logging

### New Files
None required - this is a bug fix in existing files

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix useEffect Dependency in App.jsx
- Read `src/App.jsx` and locate the useEffect hook (lines 39-56)
- Remove `initializeWebSocket` from the dependency array
- Change `}, [initializeWebSocket]);` to `}, []);`
- Add a comment explaining why the dependency array is empty
- The existing `wsInitialized.current` ref already provides proper initialization guard

### 2. Reduce Excessive Console Logging
- Read `src/stores/kanbanStore.js` and review console.log statements in `handleWorkflowLog` (lines 1428-1475)
- Remove or conditionalize excessive debug logs (keep essential error logs)
- Wrap debug logs in development checks: `if (import.meta.env.DEV) { console.log(...) }`
- Focus on logs that fire frequently during task creation

### 3. Verify Task Creation Flow
- Read the `createTask` function in `src/stores/kanbanStore.js` (lines 342-445)
- Verify state updates are necessary and not redundant
- Ensure `sendProjectNotification` is called appropriately without causing cascading updates
- No changes expected, but confirm the flow is optimal

### 4. Test the Fix
- Start the application in development mode
- Open browser DevTools console
- Create a new task and observe console output
- Verify "[App] AgenticKanban initialized" only appears once on initial load
- Verify task creation logs are minimal and relevant
- Confirm no excessive re-rendering occurs

### 5. Create E2E Test for Task Creation
- Read `.claude/commands/e2e/test_basic_query.md` and `.claude/commands/test_e2e.md` to understand E2E test format
- Create a new E2E test file: `.claude/commands/e2e/test_task_creation_no_refresh.md`
- Test should validate:
  - Navigate to the application
  - Click "Add Task" button
  - Fill in task title and description
  - Submit the task
  - Take screenshot of created task on board
  - Verify task appears in the correct column
  - Use browser console API to verify no excessive console logs
  - Verify app doesn't refresh or reload

### 6. Run Validation Commands
- Execute all validation commands listed in the "Validation Commands" section
- Ensure frontend build completes successfully
- Ensure TypeScript compilation succeeds with no errors
- Run the new E2E test to validate the fix

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Start the application for testing
# Terminal 1: python start-websocket.py
# Terminal 2: cd app/server && uv run uvicorn server:app --reload --host 0.0.0.0 --port 8001
# Terminal 3: npm run dev

# Manual test: Create a task and verify console output is minimal
# - Open browser to http://localhost:5173
# - Open DevTools console
# - Count occurrences of "[App] AgenticKanban initialized" - should be 1
# - Create a new task
# - Verify minimal console logs during creation
# - Verify no visible lag or refresh behavior

# Run TypeScript type checking
npm run typecheck

# Run frontend build to validate no compilation errors
npm run build

# Execute E2E test to validate task creation behavior
# Read .claude/commands/test_e2e.md
# Execute: .claude/commands/e2e/test_task_creation_no_refresh.md
```

## Notes

### Technical Context
- **Zustand Store Functions**: Functions exposed by Zustand stores get new references on every state update, making them unsuitable as useEffect dependencies
- **useRef Guard**: The existing `wsInitialized.current` ref already prevents duplicate WebSocket initialization, so the dependency is unnecessary
- **State Update Batching**: Zustand allows transaction batching with the third parameter `false` in `set()`, which is already used

### Why This Fix Works
1. Empty dependency array `[]` ensures useEffect only runs once on component mount
2. The `wsInitialized.current` ref prevents duplicate initialization if the component somehow remounts
3. WebSocket listeners are registered once and persist for the app lifetime
4. Eliminating the dependency on `initializeWebSocket` breaks the re-render cycle

### Performance Impact
- **Before**: useEffect runs on every store update during task creation (3-5+ times)
- **After**: useEffect runs once on mount (1 time)
- **Console Logs**: Reduced from 5+ "[App] initialized" logs to 1
- **Perceived Performance**: Eliminates visible lag and console clutter

### Related Files (No Changes Needed)
- `src/services/websocket/websocketService.js` - Already has proper listener deduplication (line 866-876: `_storeListenersRegistered` guard)
- `src/stores/kanbanStore.js:910-1077` - `initializeWebSocket` already has proper guards against re-initialization

### Future Improvements (Out of Scope)
- Consider implementing a centralized logging utility with log levels
- Consider moving deduplication cache outside Zustand state to prevent cache updates from triggering re-renders
- Consider batching multiple state updates in task creation flow
