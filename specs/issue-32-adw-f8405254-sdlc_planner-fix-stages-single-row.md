# Chore: Fix all 8 stages to display in a single row

## Metadata
issue_number: `32`
adw_id: `f8405254`
issue_json: `{"number":32,"title":"I want all these 8 stages in a single row","body":"I want all these 8 stages in a single row. Dont want to have the Ready to Merge stage in the 2nd row. please fix this\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/5f2514db-d8e6-46df-b650-822839456b67)\n\n"}`

## Chore Description
The Kanban board currently displays 8 stages (Backlog, Plan, Build, Test, Review, Document, Ready to Merge, and Errored) but the "Ready to Merge" stage is wrapping to a second row on certain screen sizes. The user wants all 8 stages to display in a single horizontal row without wrapping.

This is a CSS/layout issue where the grid columns are currently configured for 7 columns (`grid-template-columns: repeat(7, minmax(240px, 1fr))`), but we have 8 stages. The fix requires updating the grid layout to accommodate all 8 stages in a single row by:
1. Changing the grid column count from 7 to 8
2. Adjusting the minimum column width to ensure all stages fit on typical screen sizes
3. Ensuring responsive behavior is maintained for smaller screens

## Relevant Files
Use these files to resolve the chore:

- **src/styles/kanban.css** (lines 28-85) - Contains the kanban board grid layout configuration
  - Line 31: Defines `grid-template-columns: repeat(7, minmax(240px, 1fr))` which needs to be changed to accommodate 8 columns
  - Lines 39-44: Large screen (1920px+) responsive configuration
  - Lines 46-51: Medium-large screen (1536px) responsive configuration
  - Lines 53-62: Medium screen (1200px) responsive configuration - keeps grids but with fewer columns
  - Lines 64-73: Small screen (768px) responsive configuration
  - Lines 75-84: Mobile screen (480px) responsive configuration

- **src/components/kanban/KanbanBoard.jsx** (lines 76-87) - Defines the stages array
  - Line 78-87: The `stages` array in `initialState` contains all 8 stages that need to display
  - The component uses these stages to render the Kanban columns

- **src/stores/kanbanStore.js** (lines 78-87) - Store configuration for stages
  - Contains the `stages` array with all 8 stages including 'ready-to-merge'
  - Confirms we have exactly 8 stages that need to fit in one row

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update the kanban board grid to support 8 columns
- Open `src/styles/kanban.css`
- Locate the `.kanban-board-grid` CSS class (around line 29)
- Change `grid-template-columns: repeat(7, minmax(240px, 1fr))` to `grid-template-columns: repeat(8, minmax(220px, 1fr))`
  - This changes from 7 to 8 columns to accommodate all stages
  - Reduces minimum width from 240px to 220px to ensure 8 columns fit on standard desktop screens (1920px width: 8 × 220px = 1760px base + gaps)

### Step 2: Update large screen (1920px+) responsive layout
- In the same file, locate the `@media (min-width: 1920px)` section (around line 39)
- Change `grid-template-columns: repeat(7, minmax(250px, 1fr))` to `grid-template-columns: repeat(8, minmax(230px, 1fr))`
  - Maintains 8 columns for large screens
  - Adjusts minimum width proportionally

### Step 3: Update medium-large screen (1536px) responsive layout
- Locate the `@media (max-width: 1536px)` section (around line 46)
- Change `grid-template-columns: repeat(7, minmax(220px, 1fr))` to `grid-template-columns: repeat(8, minmax(180px, 1fr))`
  - Maintains 8 columns for medium-large screens
  - Reduces minimum width to fit narrower screens (1536px width: 8 × 180px = 1440px base + gaps)

### Step 4: Verify responsive behavior for smaller screens
- Review the breakpoints at 1200px, 768px, and 480px
- Ensure they remain unchanged as they use different column counts (4, 2, and 1 respectively) which is appropriate for those screen sizes
- These breakpoints will continue to stack stages vertically on smaller devices

### Step 5: Test the layout changes
- Start the development server
- View the Kanban board on different screen sizes:
  - Desktop (1920px+): All 8 stages should display in one row with adequate spacing
  - Laptop (1536px): All 8 stages should display in one row with slightly narrower columns
  - Smaller desktop (1200px): Should show 4 columns per row (current behavior maintained)
  - Tablet (768px): Should show 2 columns per row (current behavior maintained)
  - Mobile (480px): Should show 1 column (current behavior maintained)

### Step 6: Run validation commands
- Execute all validation commands to ensure the chore is complete with zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run dev` - Start the development server and manually verify all 8 stages display in a single row on desktop screens
- Visual inspection: Confirm "Ready to Merge" stage appears in the same row as the other 7 stages on screens 1536px and wider

## Notes
- The minimum column widths (220px, 230px, 180px) are calculated to ensure all 8 stages fit within standard screen widths while maintaining readability
- On screens narrower than 1200px, the responsive design intentionally uses fewer columns per row for better usability on tablets and mobile devices
- The Kanban board uses CSS Grid with `overflow-x: auto`, so if the content doesn't fit, horizontal scrolling will be available as a fallback
- No changes are needed to the JavaScript/React components since this is purely a CSS layout issue
- The stages array already contains all 8 stages in the correct order
