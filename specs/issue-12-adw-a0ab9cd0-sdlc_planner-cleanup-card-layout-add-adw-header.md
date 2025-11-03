# Chore: Cleanup Card Layout and Add ADW Header

## Metadata
issue_number: `12`
adw_id: `a0ab9cd0`
issue_json: `{"number":12,"title":"within this card","body":"within this card. we see lot of redundant things they can be cleared off.. upon teh top I want to see teh ADW ID: {adw_id}. we can see teh complete input prompt and then the stages. the trigger workflow can be a cta at the header after teh adw_id ( play icon can be fine)\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/3883eaf5-fd47-45e7-ac82-ba86a600842f)\n\n"}`

## Chore Description
The Kanban card component needs a layout cleanup to reduce redundancy and improve information hierarchy. The key requirements are:

1. **Move ADW ID to the top header** - Currently, the ADW ID is displayed in the expanded details section. It should be prominently displayed at the top of the card header for immediate visibility.

2. **Display complete input prompt** - The task description (input prompt) should be fully visible, not truncated with `line-clamp-2`. Users need to see the complete prompt text.

3. **Show workflow stages** - Stage progression should be clearly visible (currently using StageProgressionViewer component).

4. **Add Trigger Workflow CTA to header** - The "Trigger Workflow" button with play icon should be moved from the expanded details section to the card header, positioned after the ADW ID for easy access.

5. **Remove redundant elements** - Clean up duplicate or unnecessary information displays in the card layout.

## Relevant Files
Use these files to resolve the chore:

- **src/components/kanban/KanbanCard.jsx** - Main card component that displays task information. This file contains:
  - Card header structure (lines 178-241)
  - Task description display (lines 243-248)
  - ADW metadata display currently in expanded section (lines 589-615)
  - Trigger workflow button currently in expanded section (lines 494-546)
  - StageProgressionViewer integration (lines 619-627)
  - All the layout logic that needs to be reorganized

- **src/components/kanban/StageProgressionViewer.jsx** - Component for displaying workflow stage progression in a timeline format. Shows current, completed, and pending stages with visual indicators.

- **src/styles/kanban.css** - Card styling definitions including:
  - Base card styles (lines 159-200)
  - Header enhancement styles (lines 309-318)
  - Progress bar and substage indicator styles
  - Responsive design breakpoints
  - Will need updates to accommodate the new header layout with ADW ID and trigger button

- **src/components/ui/AdwIdInput.jsx** - Reference for ADW ID formatting and display patterns. Contains validation logic and display format examples that can inform how to display ADW ID in the card header.

- **app_docs/feature-f055c4f8-off-white-background.md** - Color scheme and background styling guidelines for maintaining consistent visual design during the layout changes.

### New Files
No new files are required for this chore. All changes will be modifications to existing components and styles.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Refactor Card Header Layout in KanbanCard.jsx
- Update the card header section (lines 178-241) to include a new ADW header section
- Create a prominent ADW ID display at the top of the card header
- If task has ADW ID (from `task.metadata?.adw_id` or `workflowMetadata?.adw_id`), show it before the task title
- Add copy-to-clipboard functionality for the ADW ID in the header (similar to existing implementation in lines 589-615)
- Ensure the header maintains proper spacing and doesn't appear cluttered

### 2. Move Trigger Workflow Button to Header
- Extract the "Trigger Workflow" button logic from the expanded details section (lines 494-546)
- Position it in the card header, after the ADW ID display
- Keep the Play icon from lucide-react
- Maintain the WebSocket connection status check (disabled when not connected)
- Ensure the button styling is compact and fits well in the header without overwhelming other elements
- Add proper click event handling with `e.stopPropagation()` to prevent card selection

### 3. Update Task Description Display
- Remove the `line-clamp-2` class from the description paragraph (line 245)
- Update the description display to show the full input prompt text
- Add proper text wrapping to ensure long prompts are fully visible
- Consider adding a subtle max-height with scroll if descriptions become excessively long (e.g., max-height: 200px with overflow-y: auto)

### 4. Reorganize Stage Progression Display
- Ensure StageProgressionViewer remains visible and accessible in the card
- Keep the substage progress indicators (lines 250-297) as they provide quick visual feedback
- Remove any redundant stage information that duplicates what's shown in StageProgressionViewer
- Verify the stage progression auto-expands when workflow is active

### 5. Remove Redundant Information
- Review the expanded details section (lines 318-658) for duplicate information
- Remove or consolidate redundant displays of:
  - ADW ID (since it's now in the header)
  - Trigger workflow button (since it's now in the header)
  - Pipeline name if it appears multiple times
  - Any other duplicate metadata
- Keep essential information like workflow logs, detailed substage progress, and workflow metadata

### 6. Update Card Styling in kanban.css
- Add new CSS classes for the ADW header section
- Style the ADW ID display to be prominent but not overwhelming
- Ensure the trigger workflow button in the header has appropriate sizing and hover states
- Add proper spacing between the new header elements (ADW ID and trigger button)
- Verify responsive behavior on different screen sizes
- Test that the card height adjusts properly with the new layout
- Ensure proper contrast and readability following the project's color scheme

### 7. Test Layout Changes
- Verify cards with ADW IDs display the new header layout correctly
- Verify cards without ADW IDs still display properly (graceful degradation)
- Test trigger workflow button functionality from the new header location
- Confirm full input prompt is visible and readable
- Verify stage progression displays correctly
- Check that no visual elements overlap or appear cramped
- Test responsive behavior at different viewport sizes

### 8. Run Validation Commands
Execute the validation commands to ensure the chore is complete with zero regressions.

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `cd app/server && uv run pytest` - Run server tests to validate the chore is complete with zero regressions
- `npm run build` - Build the client application to ensure no build errors were introduced
- `npm run lint` - Run linting to verify code style and catch any potential issues

## Notes
- The card layout refactoring is purely a front-end change; no backend API modifications are required
- Focus on maintaining a clean, hierarchical information display: ADW ID → Trigger Button → Title → Description → Stages → Details
- The StageProgressionViewer component should remain functional and visible without modification
- Preserve all existing functionality like auto-progression, workflow status updates, and log viewing
- The WebSocket status check for the trigger button must remain to prevent triggering workflows when disconnected
- Consider user experience: the most important information (ADW ID and trigger action) should be immediately visible at the top
- The full input prompt display may significantly increase card height for verbose prompts; ensure this doesn't break the overall board layout
