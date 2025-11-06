# Chore: Fix Text Visibility and Stage UI Improvements

## Metadata
issue_number: `52`
adw_id: `767b0560`
issue_json: `{"number":52,"title":"I am not able to see the text","body":"I am not able to see the text. I think it has to be white or pink whatever will match \ni wnat P B T R D M  . use B instead of I i want teh boxes should be equal width. \nthe current stage should be dark background.\nno | between each stage\ncan we have expand button in teh header of the card itself.\n.... can also in teh top right corner but vertically. issue number can be before teh adwid in the header\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/111e1242-801e-4443-8c0e-e2b8fc58b293)\n\n"}`

## Chore Description
Improve the text visibility and stage UI styling in the Kanban board interface. The chore focuses on:
1. Fixing text visibility issues (text needs to be white or pink to match dark backgrounds)
2. Updating stage abbreviations to use "B" instead of "I" (Build instead of Implement)
3. Ensuring stage badges have equal width for visual consistency
4. Applying dark background to the current/active stage
5. Removing the "|" separator between stage badges
6. Relocating the expand button to the card header (top right corner, vertically aligned)
7. Positioning the issue number before the ADW ID in the card header

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` (lines 98-132) - Contains the stage abbreviation mapping function `getStageAbbreviation()` and the `renderStageBadges()` function that renders stage badges. This is where we'll:
  - Update "I" to "B" for the implement/build stage
  - Remove the "|" separator between stages
  - Ensure equal width for stage badges
  - Add dark background styling for the current stage
  - Update text colors for visibility

- `src/components/kanban/KanbanCard.jsx` (lines 182-222) - ADW Header section where we'll:
  - Reposition the expand button from line 256-267 to the header
  - Move the issue number before the ADW ID display

- `src/components/kanban/KanbanCard.jsx` (lines 224-310) - Card Header section where we need to:
  - Update the ordering to show issue number before ADW ID in stage badges display area
  - Remove the expand button (will be moved to ADW header)

- `src/styles/kanban.css` (lines 142-155) - Kanban column header styling that defines the dark background. We may need to reference this styling for consistency.

- `src/styles/kanban.css` (lines 177-203) - ADW header styling with dark background (#1e293b) and white text (#f8fafc). We'll use similar styling for the active stage badges.

### New Files
No new files need to be created for this chore.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update Stage Abbreviation Mapping
- Open `src/components/kanban/KanbanCard.jsx`
- Locate the `getStageAbbreviation` function (around line 99)
- Change the 'implement' mapping from 'I' to 'B' to match 'build'
- Verify the abbreviations now show: P (Plan), B (Build), T (Test), R (Review), D (Document), M (Merge/PR)

### Step 2: Fix Stage Badge Rendering
- In the same file, locate the `renderStageBadges` function (around line 113)
- Remove the "|" separator between stages (line 124)
- Update the stage badge styling to ensure equal width using `min-w` or fixed width classes
- Add conditional styling to apply dark background to the current/active stage matching the card's current stage
- Update text color to white or pink for visibility on dark backgrounds when the stage is active

### Step 3: Relocate Expand Button to Card Header
- In `src/components/kanban/KanbanCard.jsx`, locate the expand button (around lines 256-267)
- Remove the expand button from its current position
- Add the expand button to the ADW Header section (around line 184-221)
- Position it in the top right corner, vertically aligned with other header elements
- Ensure it maintains its icon (Maximize2) and functionality

### Step 4: Reorder Issue Number and ADW ID
- In the Card Header section (around lines 224-253), update the display order
- Move the issue number display to appear before the ADW ID in the stage badges area
- Ensure proper spacing and separator ("•") between issue number and stage badges
- Maintain the existing truncation and responsive behavior

### Step 5: Test Visual Changes
- Start the development server to verify changes
- Check that text is visible on dark backgrounds
- Verify stage abbreviations show correct letters (P B T R D M)
- Confirm stage badges have equal width
- Verify current/active stage has dark background
- Confirm no "|" separators between stages
- Check expand button is in the card header top right
- Verify issue number appears before ADW ID

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are valid after changes
- `npm run lint` - Ensure code follows linting standards
- `npm run build` - Build the project to verify no build errors
- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The dark background color used in headers is `#1e293b` (slate-800) with white text `#f8fafc` (slate-50)
- The current stage should be highlighted with this dark background to distinguish it from other stages
- Maintain accessibility by ensuring sufficient contrast ratio for text visibility
- The expand button should maintain its click handler and not interfere with card click behavior using `e.stopPropagation()`
- Issue number format is typically `#{task.id}` and should be displayed before the pipeline/stage badges
