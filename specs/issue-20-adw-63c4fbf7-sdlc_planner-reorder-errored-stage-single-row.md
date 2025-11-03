# Chore: Reorder Errored Stage and Fit All Stages in Single Row

## Metadata
issue_number: `20`
adw_id: `63c4fbf7`
issue_json: `{"number":20,"title":"Errored Stage should be between Document and ready...","body":"Errored Stage should be between Document and ready to Merge phase. and all the phases should be in a single row. may be you can reduce the widths of each phase to fit in all the stages into a single row. we should not see a second row for any phase"}`

## Chore Description
Reorder the kanban board stages so that the "Errored" stage appears between "Document" and "PR" (Ready to Merge) stages, and ensure all stages fit in a single horizontal row without wrapping to a second row. This requires:

1. Moving "Errored" stage from the "other stages" group into the SDLC stages group
2. Adjusting the CSS grid layout to accommodate all 8 stages in a single row
3. Removing the visual separator between stage groups since all stages will be in one continuous row
4. Potentially reducing column widths to fit all stages horizontally

**Current Stage Order:**
Backlog → Plan → Build → Test → Review → Document → **[separator]** → PR → Errored

**Target Stage Order:**
Backlog → Plan → Build → Test → Review → Document → Errored → PR

## Relevant Files
Use these files to resolve the chore:

### Core Files to Modify

- **src/components/kanban/KanbanBoard.jsx** (lines 78, 197-200)
  - Contains the `sdlcStageIds` array that determines which stages appear before the visual separator
  - Currently: `['plan', 'build', 'test', 'review', 'document']`
  - Need to add `'errored'` to this array to move it into the SDLC group
  - Renders the visual separator between SDLC and "other" stages that needs to be removed or made conditional

- **src/styles/kanban.css** (lines 29-84, 86-122)
  - Line 31: Grid layout currently configured as `repeat(5, minmax(280px, 1fr)) 32px repeat(3, minmax(280px, 1fr))`
  - This creates 5 columns for SDLC + separator (32px) + 3 columns for other stages = 8 total columns
  - Need to change to `repeat(8, minmax(240px, 1fr))` or similar to fit all 8 stages in one row
  - Lines 86-122: Visual separator styling that may need to be removed or hidden
  - Lines 39-62: Responsive breakpoints that will need updating for the new single-row layout

### Reference Files

- **src/stores/kanbanStore.js** (lines 77-86)
  - Defines the stages array with correct order: `['backlog', 'plan', 'build', 'test', 'review', 'document', 'pr', 'errored']`
  - Note: This order in the store is already correct; the issue is in the component's grouping logic, not the store

- **src/constants/workItems.js** (lines 15-28)
  - Contains stage constants for reference
  - Note: QUEUEABLE_STAGES uses "implement" while kanbanStore uses "build" - this is a known discrepancy but out of scope for this chore

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update KanbanBoard Component to Include Errored in SDLC Stages
- Open `src/components/kanban/KanbanBoard.jsx`
- Locate the `sdlcStageIds` array on line 78
- Add `'errored'` to the array after `'document'`
- Change from: `const sdlcStageIds = ['plan', 'build', 'test', 'review', 'document'];`
- Change to: `const sdlcStageIds = ['plan', 'build', 'test', 'review', 'document', 'errored'];`
- This will move the Errored stage from the "otherStages" group to the "sdlcStages" group, positioning it before PR

### Step 2: Remove or Hide Visual Separator in KanbanBoard Component
- In `src/components/kanban/KanbanBoard.jsx`, locate the visual separator rendering (lines 197-200)
- Comment out or remove the entire separator div block:
  ```jsx
  {/* Visual Separator */}
  <div className="kanban-separator">
    <div className="kanban-separator-line"></div>
  </div>
  ```
- This eliminates the 32px separator column from the grid

### Step 3: Update CSS Grid Layout for Single Row Display
- Open `src/styles/kanban.css`
- Locate the `.kanban-board-grid` rule (line 29)
- Update the grid-template-columns on line 31:
  - Current: `grid-template-columns: repeat(5, minmax(280px, 1fr)) 32px repeat(3, minmax(280px, 1fr));`
  - New: `grid-template-columns: repeat(8, minmax(240px, 1fr));`
- This creates 8 equal columns with a minimum width of 240px each (reduced from 280px to fit better)
- Note: The 240px minimum allows all 8 stages to fit on screens ≥1920px wide (8 × 240 = 1920)

### Step 4: Update Responsive Breakpoints for Single Row Layout
- In `src/styles/kanban.css`, update the responsive media queries:
- **For ≥1920px screens** (lines 39-43):
  - Change from: `grid-template-columns: repeat(5, minmax(280px, 1fr)) 32px repeat(3, minmax(280px, 1fr));`
  - Change to: `grid-template-columns: repeat(8, minmax(250px, 1fr));`
- **For ≤1536px screens** (lines 46-50):
  - Change from: `grid-template-columns: repeat(5, minmax(280px, 1fr)) 32px repeat(3, minmax(280px, 1fr));`
  - Change to: `grid-template-columns: repeat(8, minmax(220px, 1fr));`
- Keep the separator display:none rules in smaller breakpoints (lines 53-83) as they're already correct

### Step 5: Verify Stage Color Styling is Applied to Errored Stage
- In `src/styles/kanban.css`, verify the `.stage-errored` color scheme exists (lines 409-413)
- Confirm it defines the red color scheme:
  ```css
  .stage-errored {
    --stage-color: #ef4444;
    --stage-bg: #fef2f2;
    --stage-border: #fecaca;
  }
  ```
- No changes needed here, just verification

### Step 6: Test the Layout Changes Manually
- Start the development server using `npm run dev` or equivalent
- Open the application in a browser
- Verify the stage order is: Backlog → Plan → Build → Test → Review → Document → Errored → PR
- Verify all stages appear in a single horizontal row without wrapping
- Verify the visual separator is no longer visible between stages
- Test on different screen sizes to ensure responsive layout works correctly
- Verify the Errored stage uses the red color scheme

### Step 7: Run Validation Commands
- Execute all validation commands listed below to ensure zero regressions
- Fix any issues that arise from the tests

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `cd app/client && npm run build` - Build the client to ensure there are no TypeScript/build errors
- `cd app/client && npm run lint` - Run linter to ensure code quality standards are met

## Notes
- The minimum column width has been reduced from 280px to 240px to accommodate all 8 stages in a single row on most modern displays (1920px+)
- On smaller screens (< 1200px), the responsive breakpoints will continue to stack stages in multiple columns as before
- The stage order in `kanbanStore.js` (lines 77-86) is already correct and does not need modification
- There is a known discrepancy where `workItems.js` uses "implement" while `kanbanStore.js` uses "build" - this is out of scope for this chore
- The Errored stage will now be treated as part of the main SDLC workflow visually, which improves the user experience by showing error states inline with the normal workflow
- After this change, the "otherStages" group will only contain the "PR" stage, which will appear at the end of the SDLC pipeline
