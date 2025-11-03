# Chore: Fix Card Hover Flicker and Prevent Card Expansion in Pipeline

## Metadata
issue_number: `39`
adw_id: `d9e77c9b`
issue_json: `{"number":39,"title":"this is flickering as i hover on this","body":"this is flickering as i hover on this. And also the expansion is also seen in the original card in hte pipeline. let taht not expand in the card itself. it should only show the modal and I can contract any time.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/f0c6ba5d-2f48-4d87-8359-0ea61cc97060)\n\n"}`

## Chore Description
There are two issues with the KanbanCard component that need to be fixed:

1. **Hover Flickering**: The card experiences flickering when hovering over it, likely due to CSS transition conflicts or DOM element changes during hover state.

2. **Unwanted Card Expansion**: When interacting with cards in the pipeline, they expand in place showing all the details. The desired behavior is:
   - Cards should NOT expand inline in the pipeline view
   - Details should only be shown in a modal dialog
   - Users should be able to open/close the modal at any time without affecting the card's appearance in the pipeline

The root causes appear to be:
- CSS hover transitions conflicting with state changes (lines 204-212 in kanban.css)
- The `isSelected` state causing inline expansion (lines 389-689 in KanbanCard.jsx)
- The card click handler toggling selection state (lines 159-161 in KanbanCard.jsx)

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/KanbanCard.jsx** (lines 159-161, 213-218, 389-689)
  - Contains the card click handler that toggles `isSelected` state
  - Contains the conditional rendering logic that shows expanded details when `isSelected` is true
  - Need to change click behavior to open a modal instead of inline expansion
  - Need to prevent hover state changes that might cause flickering

- **src/styles/kanban.css** (lines 160-222)
  - Contains `.kanban-card` hover styles with transform and shadow transitions
  - Contains `.kanban-card.selected` styles that may conflict during hover
  - Need to optimize CSS transitions to prevent flickering
  - May need to add `will-change` property or adjust transition timing

- **src/components/forms/TaskEditModal.jsx**
  - May need to create a new modal component or repurpose this for viewing task details
  - Should display all task information that's currently shown in the expanded inline view

### New Files
None required - will reuse existing modal components or modify TaskEditModal to support view-only mode.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Fix CSS Hover Flickering
- Add `will-change: transform, box-shadow` to `.kanban-card` to optimize rendering performance
- Ensure hover transitions don't conflict with selected state transitions
- Add `pointer-events: none` to child elements during transitions if needed
- Test hover behavior to confirm flickering is eliminated

### Step 2: Remove Inline Card Expansion
- Remove or comment out the conditional rendering block for `isSelected` state (lines 389-689 in KanbanCard.jsx)
- Keep only the minimal card view visible at all times
- Ensure the completed task minimal view (lines 222-237) remains unchanged

### Step 3: Create or Modify Task Details Modal
- Determine if TaskEditModal can be repurposed for view-only mode or if a new modal component is needed
- Create a TaskDetailsModal component that displays all the information previously shown in the expanded view:
  - Task metadata (created date, pipeline)
  - Recent activity logs
  - Progression controls
  - Plan viewer
  - Workflow controls and status
  - Real-time workflow logs
  - Quick actions (merge button, move to next stage)
- Add props to control read-only vs edit mode

### Step 4: Update Card Click Handler
- Modify `handleCardClick` function to open the TaskDetailsModal instead of toggling `isSelected`
- Remove the `selectTask` call that sets selected state
- Add state management for modal open/close
- Ensure clicking the card opens the modal

### Step 5: Add Modal Close Functionality
- Implement modal close handler in KanbanCard
- Ensure clicking outside modal or pressing escape closes it
- Ensure modal can be opened and closed multiple times without issues

### Step 6: Clean Up Unused State
- Remove `selectedTaskId` dependency from KanbanCard if it's no longer needed
- Remove `isSelected` variable and its usage
- Clean up any CSS classes related to `.kanban-card.selected` if no longer applicable

### Step 7: Test Complete Workflow
- Test hover behavior - should not flicker
- Test clicking cards - should open modal with all details
- Test modal close - should close cleanly
- Test that cards remain compact in the pipeline view
- Test with different task states (backlog, in progress, completed, errored)
- Test with tasks that have ADW IDs and workflow logs
- Verify no regressions in card functionality

### Step 8: Run Validation Commands
Execute all validation commands to ensure the chore is complete with zero regressions.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Run TypeScript type checking to ensure no type errors
- `npm run lint` - Run ESLint to ensure code quality standards
- `npm run build` - Build the frontend to ensure no build errors
- `cd server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions

## Notes
- The hover flickering is likely caused by CSS transitions conflicting with state changes. Using `will-change` and optimizing transition timing should resolve this.
- The card expansion issue is a UX design decision - the current implementation uses inline expansion, but the desired behavior is modal-based viewing.
- Consider preserving some visual feedback on hover (like subtle shadow/transform) while removing the flickering.
- The modal should be accessible via keyboard (ESC to close, Tab navigation).
- Ensure the modal displays the same information that was previously shown in the expanded inline view so no functionality is lost.
- The selected state might still be useful for other features (like keyboard navigation), so consider keeping the state but removing the visual expansion effect.
