# Chore: Dark Background Headers with Centered Light Text

## Metadata
issue_number: `50`
adw_id: `d75e5ddc`
issue_json: `{"number":50,"title":"I want the headers to have a dark background","body":"I want the headers to have a dark background. Center the text. may be text can be light if it is dark background\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/7007f433-b259-449f-bbc3-3d206132941c)\n\n"}`

## Chore Description
Update all headers throughout the application to have a dark background with centered, light-colored text. This is a visual styling improvement that affects:
1. The main application header (`.app-header`)
2. Kanban column headers (`.kanban-column-header`)
3. Modal headers (`.enhanced-modal-header`)
4. ADW card headers (`.adw-header`)

The change will improve visual hierarchy and create better contrast between content sections. The dark background should be consistent across all headers, and text should be centered and light-colored for better readability.

## Relevant Files
Use these files to resolve the chore:

- **src/styles/kanban.css** (lines 270-278, 142-152, 813-821, 174-182) - Contains all CSS styles for headers throughout the application. This file defines:
  - `.app-header` - Main application header at the top of the page
  - `.kanban-column-header` - Headers for each Kanban board column (Backlog, Plan, Build, Test, etc.)
  - `.enhanced-modal-header` - Headers for modal dialogs
  - `.adw-header` - Headers for ADW (AI Developer Workflow) sections in cards
  - All these headers currently use light/white backgrounds and need to be updated to dark backgrounds with centered, light text

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Update Main Application Header Styling
- Locate the `.app-header` class in `src/styles/kanban.css` (around line 270)
- Change the background from light gradient to a dark background (e.g., dark gray `#1e293b` or similar dark color)
- Update text color to light (e.g., `color: #f8fafc` or white)
- Add `text-align: center` to center the header content
- Add text shadow for better readability if needed (e.g., `text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3)`)
- Ensure the border and shadow still provide good visual separation with the dark background

### Step 2: Update Kanban Column Header Styling
- Locate the `.kanban-column-header` class in `src/styles/kanban.css` (around line 142)
- Change the background from light gradient to a dark background
- Update the color scheme to use light text
- Add `text-align: center` to center the stage names and task counts
- Adjust the border-bottom color to work with the dark background
- Update the box-shadow to complement the dark theme
- Ensure backdrop-filter still works well with the new dark background

### Step 3: Update Enhanced Modal Header Styling
- Locate the `.enhanced-modal-header` class in `src/styles/kanban.css` (around line 814)
- Change the background from light gradient to a dark background
- Update text color to light for better readability
- Add `text-align: center` to center modal titles
- Adjust border-bottom to work with dark background
- Ensure the sticky positioning and z-index remain effective

### Step 4: Update ADW Card Header Styling
- Locate the `.adw-header` class in `src/styles/kanban.css` (around line 175)
- Change the background from blue gradient to a dark background
- Update button text colors to be light
- Ensure button hover states work well with the dark background
- Update border-bottom to complement the dark theme
- Maintain the existing shadow effects or adjust as needed

### Step 5: Update Responsive Styles
- Review responsive media queries for header classes in `src/styles/kanban.css`
- Ensure `.kanban-column-header` responsive padding adjustments (lines 405-407, 419-421) don't conflict with the new dark theme
- Test that centered text works well at different screen sizes
- Verify the dark background is maintained across all breakpoints

### Step 6: Run Validation Commands
- Execute all validation commands to ensure zero regressions
- Verify the changes work across different screen sizes
- Check that text contrast meets accessibility standards

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Verify TypeScript types are valid (no CSS type issues)
- `npm run lint` - Run ESLint to check for any styling issues
- `npm run dev` - Start the development server to manually verify the dark headers appear correctly with centered, light text across:
  - Main application header
  - All Kanban board column headers (Backlog, Plan, Build, Test, Review, Document, Ready to Merge, Errored)
  - Modal headers (Settings, Task Edit, Task Details, Completed Tasks, etc.)
  - ADW card headers
- Visual verification in browser:
  - Check that all headers have dark backgrounds
  - Verify text is centered in all headers
  - Confirm text is light-colored and readable against dark backgrounds
  - Test different screen sizes (desktop, tablet, mobile) to ensure responsive behavior
  - Verify no visual regressions in other UI elements

## Notes
- The main application header (`.app-header` in App.jsx line 70) contains the app title "AgenticKanban", project selector, and action buttons. The centered styling should primarily affect the title and project name.
- Kanban column headers display stage names (e.g., "Backlog", "Plan", "Build") with icons and task counts. Centering should apply to the stage name primarily.
- Consider using a consistent dark color across all headers (e.g., `#1e293b`, `#1f2937`, or similar from the existing color palette) for visual consistency.
- Ensure sufficient color contrast (WCAG AA standard: 4.5:1 for normal text, 3:1 for large text) between the dark background and light text.
- The user mentioned they attached an image, but blob URLs are not accessible outside the browser session. Proceed with the standard dark header implementation.
- Test the changes with both light and dark system preferences to ensure the dark headers look good in all contexts.
- The `.app-header` uses flexbox layout with `justify-between`, so centering may need to be applied selectively to specific child elements rather than the entire header.
