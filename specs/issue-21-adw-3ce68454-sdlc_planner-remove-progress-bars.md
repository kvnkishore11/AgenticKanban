# Chore: Remove Progress Bars and Initializing Text

## Metadata
issue_number: `21`
adw_id: `3ce68454`
issue_json: `{"number":21,"title":"Remove this","body":"Remove this. also that Initializing and those 3 so called progress bars as well\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/5ffd9442-7298-41f6-8b95-5a29393b6216)\n\n"}`

## Chore Description
Remove all "Initializing" text references and the three progress bar implementations from the Kanban UI. This includes:

1. **"Initializing" Text**: Remove console logs and substage state references that display "Initializing" in the UI
2. **Progress Bar 1 (Substage Progress Bars)**: Mini progress bars displayed in KanbanCard showing substage steps
3. **Progress Bar 2 (Stage Progression Compact View)**: Compact progress bars in StageProgressionViewer showing all stages
4. **Progress Bar 3 (Overall Stage Progress Bar)**: Overall progress bar in StageProgressionViewer showing complete task progress

The chore aims to simplify the UI by removing these visual elements and their associated state management logic.

## Relevant Files
Use these files to resolve the chore:

- **src/stores/kanbanStore.js** - Contains "Initializing" console logs and substage state management
  - Lines 127, 376, 420, 469, 903, 2046: Console logs with "Initializing" text
  - Lines 376, 420, 469: Task substage initialized to 'initializing' state
  - Need to remove or update substage initialization logic

- **src/components/kanban/KanbanCard.jsx** - Renders substage progress bars (Progress Bar 1)
  - Lines 250-297: Entire substage progress section including:
    - Lines 258-291: Substage steps rendering with mini progress bars
    - Lines 269-280: Individual substage bar with progress indication
    - Lines 283-287: Substage indicators (completed/active states)
    - Lines 293-296: Current substage name display
  - Lines 371-380: Detailed substage progress in expanded view (if exists)
  - Need to remove the entire substage progress section

- **src/components/kanban/StageProgressionViewer.jsx** - Renders stage progression bars (Progress Bars 2 & 3)
  - Lines 74-114: Compact stage progression view with mini bars per stage (Progress Bar 2)
  - Lines 215-232: Overall progress section with gradient progress bar (Progress Bar 3)
  - Need to remove both progress bar implementations

- **src/styles/kanban.css** - Progress bar animations and styling
  - Lines 202-230: `.progress-bar` and `.progress-bar-glow` CSS classes
  - Need to remove progress bar styling (can be kept if used elsewhere, verify first)

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove "Initializing" Console Logs from kanbanStore.js
- Open `src/stores/kanbanStore.js`
- Remove or comment out console log statements containing "Initializing" text at lines:
  - Line 127: `console.log('Initializing Kanban store...');`
  - Line 903: `console.log('[WebSocket] Initializing WebSocket with fresh listeners');`
  - Line 2046: `console.log('Initializing data migrations...');`

### Step 2: Update Substage Initialization Logic in kanbanStore.js
- In `src/stores/kanbanStore.js`, locate lines 376, 420, and 469 where tasks are created with `substage: 'initializing'`
- Replace `substage: 'initializing'` with a more appropriate initial substage state or remove the substage property if not needed
- Review the substage state machine to determine the correct initial state (likely should be the first actual substage for that stage, not "initializing")
- Ensure task creation logic is consistent across all locations

### Step 3: Remove Substage Progress Bars from KanbanCard.jsx
- Open `src/components/kanban/KanbanCard.jsx`
- Locate the substage progress section (lines 250-297)
- Remove the entire substage progress section including:
  - The container div with "Substage Progress" comment
  - Progress percentage display (lines 252-255)
  - Substage steps rendering (lines 258-291)
  - Current substage name display (lines 293-296)
- Verify if there's a detailed substage progress view in the expanded card state (around lines 371-380) and remove it as well
- Ensure the card layout remains intact after removal (check spacing, margins)

### Step 4: Remove Compact Stage Progression View from StageProgressionViewer.jsx
- Open `src/components/kanban/StageProgressionViewer.jsx`
- Locate the compact stage progression view (lines 74-114)
- Remove the entire `stage-progression-compact` div and its contents
- This removes Progress Bar 2 (mini bars for each stage)

### Step 5: Remove Overall Progress Bar from StageProgressionViewer.jsx
- In `src/components/kanban/StageProgressionViewer.jsx`
- Locate the overall progress section (lines 215-232)
- Remove the entire overall progress div including:
  - The container with "Overall Progress" label
  - The progress percentage display
  - The gradient progress bar
- This removes Progress Bar 3 (overall task progress)

### Step 6: Clean Up Progress Bar CSS (Optional)
- Open `src/styles/kanban.css`
- Locate the progress bar styling (lines 202-230)
- Search the entire codebase to verify if `.progress-bar` and `.progress-bar-glow` classes are used elsewhere
- If not used anywhere else, remove these CSS rules
- If used elsewhere, keep the CSS and document where it's still being used

### Step 7: Test UI Rendering
- Start the development server using the appropriate command from the project
- Navigate to the Kanban board view
- Verify that:
  - No "Initializing" text appears in the console or UI
  - All three progress bars are completely removed
  - Kanban cards render correctly without layout issues
  - Stage progression viewer renders correctly without the removed bars
  - Task cards still display essential information (title, description, stage, etc.)

### Step 8: Run Validation Commands
Execute all validation commands to ensure the chore is complete with zero regressions.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd app/client && npm run build` - Build the client to ensure no build errors after removing progress bars
- `cd app/client && npm run lint` - Run linter to catch any unused variables or imports after removing code
- `grep -r "Initializing" src/` - Verify no "Initializing" text remains in source code (should return no results or only non-UI related instances)
- `grep -r "progress-bar" src/` - Verify progress bar classes are no longer referenced (unless kept for other use cases)

## Notes
- The chore references an attached image (`blob:http://localhost:5173/5ffd9442-7298-41f6-8b95-5a29393b6216`) which is not accessible. The plan assumes the "this" and "that" refer to the progress bars and initializing text based on the literal description in the issue body.
- When removing the substage progress bars from KanbanCard, ensure that task cards still provide adequate visual feedback about task status. Consider if any alternative minimal status indicator is needed.
- The "Initializing" substage state may be a valid transitional state in the task lifecycle. Verify with the application logic whether this state should simply not be displayed in the UI, or if tasks should start in a different initial state.
- After removing console logs, consider if any of them should be replaced with proper logging mechanisms (if the application uses a logging service) or if they were purely for debugging.
- Test with tasks in various stages to ensure the UI remains functional and visually acceptable without the progress bars.
- If the StageProgressionViewer component becomes mostly empty after removing both progress bars, consider whether the entire component should be removed or if it serves other purposes.
