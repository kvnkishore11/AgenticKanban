# Feature: Fix Edit Modal Layout and SDLC Grouping

## Metadata
issue_number: `32`
adw_id: `2ec4f26c`
issue_json: `{"number":32,"title":"currently i see a small bug","body":"currently i see a small bug. when ever i click on edit. it is just opening the input modal within hte card itself as shown in the snapshot (image.png). ideally it should have opened the way we input the new ticket. \\n\\nalso can SDLC in same row as the other stages instead of one layer or row above. may be have SDLC and then a small seperator then you can have others.\\n\\n## Attached Images\\n\\n![image.png](blob:http://localhost:5173/d6daf354-3dca-45a7-af85-1d94c4a8dbf9)\\n\\n"}`

## Feature Description
This feature fixes two UI issues in the Agentic Kanban application:
1. The edit modal currently opens within the card itself rather than as a proper overlay modal, causing layout issues and poor user experience
2. SDLC stages (Plan, Implement, Test, Review, Document) need to be visually grouped together with a separator before other stages (PR, Backlog, Errored) for better visual organization

## User Story
As a user of the Agentic Kanban board
I want to edit cards with a proper modal overlay and see SDLC stages grouped together
So that I have a consistent editing experience and better visual organization of my workflow stages

## Problem Statement
Currently, when users click the edit option on a Kanban card, the TaskEditModal opens within the card's DOM structure, causing it to be positioned relative to the card rather than appearing as a full-screen overlay. Additionally, the SDLC stages are mixed with other stages without clear visual separation, making it harder to distinguish the core development workflow from auxiliary stages.

## Solution Statement
We will fix the modal rendering by moving the TaskEditModal to a portal or higher-level component that renders outside the card's DOM hierarchy, similar to how TaskInput is implemented. For the SDLC grouping, we'll update the Kanban board layout to display SDLC stages together with a visual separator between them and other stages.

## Relevant Files
Use these files to implement the feature:

- `src/components/kanban/KanbanCard.jsx` - Contains the card component with the edit modal rendering issue. The TaskEditModal is currently rendered inside the card component (lines 574-580)
- `src/components/kanban/KanbanBoard.jsx` - Contains the board layout that needs SDLC grouping. Uses a CSS grid to display all stages in a single row
- `src/App.jsx` - Shows the proper modal implementation pattern with TaskInput rendered at the app level (line 152)
- `src/components/forms/TaskEditModal.jsx` - The edit modal component that's correctly implemented but incorrectly positioned
- `src/stores/kanbanStore.js` - Contains the stages configuration (lines 33-42) that defines the stage order
- `src/styles/kanban.css` - Contains the kanban board grid styles that need adjustment for SDLC grouping
- `.claude/commands/test_e2e.md` - Instructions for running E2E tests
- `.claude/commands/e2e/test_basic_query.md` - Example E2E test format

### New Files
- `.claude/commands/e2e/test_edit_modal_layout.md` - E2E test to validate the edit modal fix and SDLC grouping

## Implementation Plan
### Phase 1: Foundation
Understand the current modal rendering patterns and how TaskInput is properly implemented as an overlay. Review the kanban board grid layout system.

### Phase 2: Core Implementation
Fix the edit modal rendering location and implement SDLC stage grouping with visual separation.

### Phase 3: Integration
Ensure the fixed modal works correctly with all card interactions and the SDLC grouping is responsive across different screen sizes.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create E2E Test File
- Create `.claude/commands/e2e/test_edit_modal_layout.md` following the pattern from existing E2E tests
- Define test steps for:
  - Opening edit modal and verifying it appears as a full overlay
  - Checking SDLC stages are grouped together
  - Verifying separator appears between SDLC and other stages
  - Testing edit modal functionality works correctly

### Step 2: Fix Edit Modal Rendering Location
- Move the TaskEditModal rendering from inside KanbanCard to the KanbanBoard component level
- Pass necessary props and callbacks through the component hierarchy
- Update KanbanCard to trigger modal opening via a callback to parent
- Ensure modal state is managed at the board level to prevent multiple modals

### Step 3: Implement Modal State Management in KanbanBoard
- Add state for tracking which task is being edited
- Add handlers for opening and closing the edit modal
- Pass edit handlers down to KanbanCard components
- Render TaskEditModal at the board level with proper task data

### Step 4: Group SDLC Stages with Visual Separator
- Update the stages array in kanbanStore.js or create a computed property that groups stages
- Modify KanbanBoard.jsx to render SDLC stages (Plan, Build, Test, Review, Document) first
- Add a visual separator (e.g., vertical line or spacing) after SDLC stages
- Render remaining stages (Backlog, PR, Errored) after the separator

### Step 5: Update CSS Grid Layout for Stage Grouping
- Modify `kanban-board-grid` styles in kanban.css to accommodate the separator
- Ensure proper spacing between SDLC group and other stages
- Add styles for the visual separator element
- Test responsive behavior at different screen sizes

### Step 6: Test Edit Modal Portal Rendering
- Verify edit modal appears as a full overlay above all content
- Test that clicking outside the modal closes it properly
- Ensure keyboard navigation and accessibility work correctly
- Verify all form fields and functionality work as before

### Step 7: Validate SDLC Grouping Display
- Confirm SDLC stages appear together as a group
- Verify the separator is clearly visible but not intrusive
- Test that cards can still be moved between all stages
- Ensure the layout remains functional on mobile devices

### Step 8: Run Validation Commands
Execute all validation commands to ensure the feature works correctly with zero regressions.

## Testing Strategy
### Unit Tests
- Test that edit modal state is properly managed at the board level
- Test stage grouping logic correctly identifies SDLC stages
- Test that modal callbacks properly update task data

### Edge Cases
- Multiple cards being edited simultaneously (should be prevented)
- Edit modal with very long content or many images
- SDLC grouping on very narrow screens
- Stage transitions across the SDLC separator

## Acceptance Criteria
- Edit modal opens as a full-screen overlay, not within the card
- Edit modal has proper z-index and backdrop
- SDLC stages (Plan, Build, Test, Review, Document) are visually grouped
- A clear separator appears between SDLC stages and other stages
- All existing edit functionality continues to work
- Layout remains responsive across all screen sizes
- No regression in card movement or stage transitions

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_edit_modal_layout.md` test file to validate the modal fix and SDLC grouping work correctly
- `cd app/server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `cd app/client && bun tsc --noEmit` - Run frontend tests to validate the feature works with zero regressions
- `cd app/client && bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes
- The issue mentions "SDLC in same row as the other stages instead of one layer or row above" - this suggests SDLC might currently be displayed differently. Need to verify current layout.
- The edit modal issue is a rendering location problem, not a component implementation issue
- Consider using React Portal for the modal if the application uses React 16+
- The separator between SDLC and other stages should be subtle but clear
- Ensure the fix doesn't break the existing task creation modal (TaskInput)