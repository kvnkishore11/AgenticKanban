# Bug: Fix Document Stage Vertical Cutoff

## Metadata
issue_number: `7`
adw_id: `98923d43`
issue_json: `{"number":7,"title":"there is something wrong with the document stage","body":"there is something wrong with the document stage. see the image for more reference it is not complete and seems like it got cut off vertically. MAKE SURE THAT THE BACKLOG STAGE IS PRESENT IN ITS CURRENT POSITION.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/5ec2234d-2f92-40d7-8c45-6b590ebd1e2c)\n\n"}`

## Bug Description
The document stage column in the kanban board appears to be cut off vertically. The content within the document stage is not fully visible and seems to be truncated, making it impossible for users to see all tasks or content in that stage. The bug specifically affects the document stage which is the 5th and last column in the SDLC stages section (before the visual separator and "Other Stages" section).

## Problem Statement
The document stage column is being vertically cut off, preventing users from viewing its full content. This appears to be a CSS styling issue related to height constraints on the kanban columns. The requirement is to fix this cutoff while ensuring the backlog stage remains in its current position.

## Solution Statement
Adjust the CSS height constraints for kanban columns to allow proper vertical scrolling and full content visibility. The fix will involve modifying the `min-height` and `max-height` properties in `src/styles/kanban.css` to ensure all stage columns, including the document stage, can display their full content without being cut off. The solution must maintain the current grid layout structure to preserve the backlog stage position.

## Steps to Reproduce
1. Navigate to http://localhost:5173 (or the configured frontend port)
2. Observe the kanban board layout
3. Look at the document stage column (5th SDLC stage, indigo colored, with FileText icon)
4. Notice that the content appears to be cut off vertically
5. Compare with other stages to see the visual difference

## Root Cause Analysis
The issue is located in `src/styles/kanban.css` where the `.kanban-column` class has restrictive height constraints:

- Line 130-131: `.kanban-column` has `min-height: 75vh` and `max-height: 90vh`
- Line 93-94: `.kanban-separator` has `min-height: 75vh` and `max-height: 90vh`

These fixed viewport-based heights are causing the document stage column to be constrained vertically. When content exceeds the `max-height: 90vh` limit, it gets cut off rather than expanding or scrolling properly. The issue is exacerbated by:

1. The column using `display: flex` and `flex-direction: column` (line 132-133)
2. The body section having `overflow-y: auto` (line 154) but potentially not functioning correctly due to parent constraints
3. Mobile responsive rules further reducing heights (lines 431-447)

The backlog stage is rendered separately from SDLC stages in the grid layout (lines 92-144 in KanbanBoard.jsx), so modifications to column heights won't affect its position.

## Relevant Files
Use these files to fix the bug:

### Existing Files

- **src/styles/kanban.css** (lines 124-157, 417-449)
  - Contains the `.kanban-column` styles with the problematic height constraints
  - Contains the `.kanban-column-body` styles that control content scrolling
  - Contains responsive height adjustments for mobile devices
  - This is the primary file where the fix needs to be applied

- **src/components/kanban/KanbanBoard.jsx** (lines 78-195)
  - Defines the stage grouping logic and rendering order
  - Confirms backlog is rendered separately (line 79) which preserves its position
  - Shows that document stage is part of `sdlcStageIds` array (line 78)
  - Used to understand the structure but no changes needed here

- **src/stores/kanbanStore.js** (lines 77-86)
  - Defines the stage configuration including the document stage
  - Shows document stage color is 'indigo'
  - Used for reference only, no changes needed

- **.claude/commands/test_e2e.md**
  - E2E test runner template to understand how to create validation tests
  - Used as reference for creating the E2E test file

- **.claude/commands/e2e/test_basic_query.md**
  - Example E2E test to understand test structure and format
  - Used as reference for creating the E2E test file

### New Files

- **.claude/commands/e2e/test_document_stage_visibility.md**
  - New E2E test file to validate the document stage is fully visible and not cut off
  - Will contain steps to verify all kanban columns render properly with full content visibility
  - Will include screenshot validation to prove the bug is fixed

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Analyze Current CSS Height Constraints
- Read `src/styles/kanban.css` focusing on lines 124-157 (main column styles) and 417-449 (responsive styles)
- Document the current height values for `.kanban-column` and `.kanban-column-body`
- Understand how the flex layout interacts with height constraints
- Identify which specific properties are causing the vertical cutoff

### 2. Fix Column Height Constraints
- Modify `.kanban-column` height properties in `src/styles/kanban.css` (lines 130-131):
  - Remove or increase the `max-height: 90vh` constraint to allow columns to grow as needed
  - Consider using `height: fit-content` or removing height constraints entirely
  - Ensure `min-height` is reasonable for empty columns but doesn't restrict content
- Ensure `.kanban-column-body` (line 152-157) has proper overflow settings:
  - Verify `overflow-y: auto` is working correctly
  - Ensure `flex: 1` allows the body to expand within the column
  - Add any missing properties like `min-height: 0` to enable flex child scrolling

### 3. Fix Separator Height
- Adjust `.kanban-separator` height (lines 93-94) to match new column constraints
- Ensure the separator doesn't force columns to match its height
- Consider using `align-self: stretch` instead of fixed heights

### 4. Update Mobile Responsive Heights
- Review responsive height rules at lines 431-447
- Ensure mobile breakpoints (@media max-width: 768px and 480px) have consistent height logic
- Adjust `max-height` values for mobile if needed

### 5. Test Visual Rendering
- Start the development server with `cd app/client && bun run dev`
- Navigate to http://localhost:5173 (or configured port)
- Verify all stage columns render without vertical cutoff
- Verify backlog stage remains in its current position (first column)
- Verify document stage (5th SDLC column) shows full content
- Test with different amounts of content in the document stage
- Test responsive behavior on different screen sizes

### 6. Create E2E Test File
- Read `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md` to understand the E2E test format
- Create a new E2E test file at `.claude/commands/e2e/test_document_stage_visibility.md`
- Include test steps that:
  - Navigate to the kanban board
  - Take a screenshot of the initial kanban board layout
  - Verify all 8 stages are visible (backlog, plan, build, test, review, document, pr, errored)
  - Verify the document stage is fully visible and not cut off
  - Verify the backlog stage is in the first position
  - Take a screenshot focused on the document stage column
  - Verify the visual separator between SDLC and Other stages is present
  - Take a screenshot of the full board to prove layout integrity
- Include success criteria that validate no visual cutoff occurs
- Include specific verification steps for the document stage column content visibility

### 7. Run Validation Commands
- Execute all validation commands listed below to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute your new E2E `.claude/commands/e2e/test_document_stage_visibility.md` test file to validate the document stage is fully visible and not cut off. Take screenshots to prove the fix works.
- `cd app/client && bun tsc --noEmit` - Run frontend type checking to validate no TypeScript errors
- `cd app/client && bun run build` - Run frontend build to validate the build succeeds
- `cd app/server && uv run pytest` - Run server tests to validate zero regressions

## Notes
- The fix should be minimal and surgical - only adjust the CSS height constraints that are causing the cutoff
- The backlog stage is rendered separately in the grid layout, so it will remain in its current position regardless of column height changes
- The grid layout structure (`grid-template-columns: repeat(5, minmax(280px, 1fr)) 32px repeat(3, minmax(280px, 1fr))`) ensures proper column ordering and should not be modified
- Consider using viewport-relative units carefully, as they can cause issues on different screen sizes
- The document stage is the 5th and last column in the SDLC stages section, positioned just before the visual separator
- Test with tasks in the document stage to ensure scrolling works properly when content exceeds available space
- The fix should maintain visual consistency across all stage columns
- Ensure responsive breakpoints continue to work properly after the fix
