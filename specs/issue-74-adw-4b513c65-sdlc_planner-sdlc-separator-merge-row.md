# Chore: Display SDLC and Merge in a Single Row with Vertical Separator

## Metadata
issue_number: `74`
adw_id: `4b513c65`
issue_json: `{"number":74,"title":"these has to be in a single row","body":"these has to be in a single row. SDLC should be first one and then there should be a vertical seperator towards the end add Merge as well.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/15b4ef73-91c4-4e19-9b7c-88a89a6c1b2f)\n\n"}`

## Chore Description
The task creation form (TaskInput component) currently displays the "SDLC" quick selection button and individual stage checkboxes. This chore requires restructuring the stage queue selection UI to display both the SDLC quick selection button and a new Merge button in a single horizontal row, with a vertical separator between them.

The current UI has:
- Full SDLC Quick Selection button (lines 348-363 in TaskInput.jsx)
- Individual stage checkboxes below it (lines 365-388 in TaskInput.jsx)

The desired UI should have:
- A single horizontal row containing:
  1. SDLC button (first/leftmost)
  2. A vertical separator (visual divider)
  3. Merge button (towards the end/rightmost)
- Individual stage checkboxes remain below this row as they currently are

The Merge functionality should allow users to quickly add the "adw_merge_worktree" workflow to the queued stages, similar to how SDLC adds all SDLC stages.

## Relevant Files
Use these files to resolve the chore:

- **src/components/forms/TaskInput.jsx** (lines 348-388)
  - Contains the Full SDLC Quick Selection button and stage queue selection UI
  - This is the primary file that needs modification to create the single row layout
  - Currently displays SDLC button in its own section above the stage checkboxes

- **src/constants/workItems.js** (lines 14-34)
  - Defines SDLC_STAGES constant and QUEUEABLE_STAGES
  - May need to be reviewed to understand available workflow types
  - Reference for understanding stage definitions

- **src/stores/kanbanStore.js** (around lines 1299-1302, 1700)
  - Contains references to 'adw_merge_worktree' workflow type
  - Useful for understanding how merge workflow is handled in the application
  - Reference only - no changes needed here

- **adws/adw_merge_worktree.py**
  - The merge worktree workflow script
  - Reference only - confirms the workflow exists and is valid
  - No changes needed here

### New Files
None - all changes are modifications to existing files.

## Step by Step Tasks

### Step 1: Update TaskInput.jsx - Create Single Row Layout
- Modify the "Full SDLC Quick Selection" section (lines 347-363) to create a horizontal flex row
- Replace the current single-button layout with a flex container that holds:
  1. SDLC button (keep existing functionality)
  2. A vertical separator element (using border or a divider component)
  3. New Merge button
- Ensure proper spacing and alignment between elements
- Update the help text below to describe both buttons

### Step 2: Implement Merge Button Functionality
- Add state management for tracking if merge workflow is selected (similar to `isFullSdlcSelected`)
- Create `handleMergeToggle` function that:
  - Adds 'adw_merge_worktree' to queuedStages when clicked (if not already present)
  - Removes 'adw_merge_worktree' from queuedStages when clicked again (if already present)
- Style the Merge button consistently with the SDLC button
- Show active/selected state when merge is in the queued stages
- Use appropriate icon (GitMerge from lucide-react is already imported on line 24)

### Step 3: Update Styling and Responsive Design
- Ensure the single row layout is responsive and works on mobile/tablet screens
- Add appropriate gap/spacing between SDLC button, separator, and Merge button
- Ensure the vertical separator is visually clear but not overwhelming
- Test that the updated layout maintains visual hierarchy and clarity
- Verify button states (selected/unselected) are clearly distinguishable

### Step 4: Update Help Text and Accessibility
- Update the help text below the button row to describe both SDLC and Merge functionality
- Add appropriate aria-labels and accessibility attributes to buttons
- Ensure keyboard navigation works properly (tab order, enter/space to activate)
- Add title/tooltip attributes to provide additional context on hover

### Step 5: Run Validation Commands
Execute validation commands to ensure no regressions and the chore is complete.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code follows style guidelines
- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run build` - Build the frontend to ensure no build errors

## Notes

- The issue mentions an attached image, but it's a blob URL that cannot be accessed outside the browser session. The description provides sufficient context.
- The SDLC button currently uses blue styling when selected. Maintain this pattern for the Merge button.
- The GitMerge icon is already imported in TaskInput.jsx (line 24 imports from KanbanCard context), but you may need to add it to the TaskInput.jsx imports if not already present.
- The 'adw_merge_worktree' workflow type is referenced in kanbanStore.js, confirming it's a valid workflow type in the system.
- Consider using Tailwind's `border-l` or `border-r` with appropriate height for the vertical separator.
- The current SDLC button has hover states and transition animations - maintain this UX pattern for the Merge button.
- Ensure the changes don't affect the individual stage checkboxes section below the buttons.
