# Chore: Remove Pipeline Summary and Make Kanban Board Full Height

## Metadata
issue_number: `33`
adw_id: `67c1cfc1`
issue_json: `{"number":33,"title":"Just remove teh Pipeline Summary","body":"Just remove teh Pipeline Summary. I dont want this. Also once you have done. I want teh kanban board stages to span vertically to occupy teh complete vertical viewport\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/f6347b89-bdfa-4246-bdac-a633877cc02c)\n\n"}`

## Chore Description
Remove the Pipeline Summary toggle button and the entire summary stats section from the Kanban board interface. Additionally, modify the Kanban board CSS to ensure the stage columns span vertically to occupy the complete vertical viewport height, providing a better visual layout for managing tasks.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanBoard.jsx` - Contains the Pipeline Summary toggle button (lines 247-258) and the summary stats section (lines 260-289). These need to be removed completely, including the `showPipelineSummary` state variable.

- `src/styles/kanban.css` - Contains the Kanban board styling including `.kanban-column` (lines 124-134) with `min-height: 40vh`. This needs to be modified to make columns occupy full viewport height by adjusting the height calculation and ensuring proper flex layout.

- `src/App.jsx` - Contains the main app layout structure with header and footer that may affect available viewport space for the Kanban board. May need to ensure the main content area uses proper flex layout to allow Kanban board to fill available space.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Remove Pipeline Summary from KanbanBoard Component
- Open `src/components/kanban/KanbanBoard.jsx`
- Remove the `showPipelineSummary` state variable declaration on line 57
- Remove the setter function call `setShowPipelineSummary`
- Delete the entire Pipeline Summary toggle section (lines 247-258)
- Delete the entire Summary Stats conditional rendering section (lines 260-289)
- Verify no unused imports remain related to the removed functionality

### Step 2: Update Kanban Board CSS for Full Vertical Height
- Open `src/styles/kanban.css`
- Modify `.kanban-board-grid` (line 29) to use proper flex/height layout that fills available vertical space
- Change `.kanban-column` (line 124) to use `min-height: calc(100vh - <offset>)` where offset accounts for header, padding, and footer heights
- Ensure columns stretch to full height by verifying flex properties in both `.kanban-board-grid` and `.kanban-column`
- Test responsive breakpoints to ensure full height works across different screen sizes

### Step 3: Verify Main Layout Container Supports Full Height
- Open `src/App.jsx`
- Verify the main content area (line 162) has proper flex properties to allow children to expand
- Ensure the parent container (line 54) uses `flex flex-col` to enable proper height distribution
- Confirm the layout hierarchy supports viewport-height based sizing

### Step 4: Test the Changes
- Start the development server if not already running
- Verify Pipeline Summary toggle and stats are completely removed
- Verify Kanban columns span the full vertical viewport height
- Test scrolling behavior within individual columns
- Test responsive behavior on different viewport sizes
- Ensure no console errors or warnings appear

### Step 5: Run Validation Commands
- Execute all validation commands to ensure zero regressions

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The Pipeline Summary feature included a toggle button and a stats display showing task counts per stage. This entire feature is being removed per user request.
- The current `.kanban-column` has `min-height: 40vh` which doesn't fill the viewport. Consider using `calc(100vh - 200px)` or similar to account for header (~64px), padding, and footer heights.
- The `.kanban-column-body` already has `flex: 1` and `overflow-y: auto` which should allow proper scrolling within columns once parent heights are set correctly.
- Consider using CSS custom properties to make the height offset configurable if needed in the future.
