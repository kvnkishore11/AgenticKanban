# Chore: Add "Mark as Complete" CTA to Task Cards

## Metadata
issue_number: `1511`
adw_id: `3130fd0b`
issue_json: `{"number":1511,"title":"For all the stages from plan, I also want to have...","body":"For all the stages from plan, I also want to have one more CTA that is called Mark as Complete. What this does is it will change the status to complete. The main purpose of this is like if I use my terminal and merge the work tree. Sometimes that might not be reflected here right so that is the reason I want to maybe manually move that to complete. It should be present in two places. One in drop down menu of the card in the contracted form and in the expanded form. It should present in the bottom CTS wherever it is."}`

## Chore Description
Add a "Mark as Complete" call-to-action (CTA) button to task cards that allows users to manually move tasks to the "completed" stage. This is particularly useful when work has been completed via terminal/git worktree operations but the UI hasn't reflected the change yet. The CTA should be available for tasks from the "plan" stage onwards (all stages: plan, build, test, review, document, pr, ready-to-merge) and should appear in two locations:
1. In the dropdown menu when clicking the "⋮" button on the contracted card (KanbanCard.jsx)
2. In the expanded task detail view footer (CardExpandModal.jsx) alongside other CTAs like TRIGGER, PATCH, and MERGE TO MAIN

When clicked, this action should update the task's stage to "completed" both in the frontend state and backend database, providing immediate visual feedback to the user.

## Relevant Files
Use these files to resolve the chore:

- `src/components/kanban/KanbanCard.jsx` (Lines 1-533) - Main task card component with dropdown menu
  - Contains the dropdown menu where we need to add the "Mark as Complete" option
  - Already has menu items for EDIT, TRIGGER, START WORKTREE, OPEN CODEBASE, MERGE TO MAIN, and DELETE
  - Need to add the new menu item before DELETE for good UX

- `src/components/kanban/CardExpandModal.jsx` (Lines 1-1186) - Expanded task detail modal
  - Contains the footer with CTAs (TRIGGER, PATCH, MERGE TO MAIN, EDIT, CLOSE)
  - Need to add "MARK AS COMPLETE" button in the footer section (around line 1055-1157)
  - Button should be styled consistently with other footer buttons

- `src/stores/kanbanStore.js` (Lines 1-100+) - Zustand state management store
  - Need to create a new action `markTaskAsComplete(taskId)` that updates the task stage to "completed"
  - Should handle both frontend state update and backend API call
  - Should provide error handling and success feedback

- `src/services/api/adwDbService.js` - Backend API service for ADW database operations
  - Need to verify or add API method to update task stage via PATCH `/api/adws/{adw_id}` endpoint
  - The backend already supports updating ADW state via `ADWStateUpdate` model

- `server/api/adw_db.py` (Line 320+) - Backend API endpoint for updating ADW state
  - Already has `@router.patch("/adws/{adw_id}")` endpoint that accepts `ADWStateUpdate`
  - Should support updating `current_stage` and `status` fields
  - Need to verify this endpoint properly handles setting stage to "completed"

- `src/style.css` - Global styles
  - May need to add styling for the new "Mark as Complete" button if it needs unique visual treatment
  - Should follow brutalist design system already in place

### New Files
No new files need to be created. All changes will be made to existing files.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Add Backend Support (if needed)
- Read `server/api/adw_db.py` to verify the PATCH endpoint supports updating `current_stage` to "completed"
- Read `server/models/adw_db_models.py` to verify `ADWStateUpdate` model includes `current_stage` field
- If needed, update the backend to properly handle stage transition to "completed"
- Ensure the backend sets appropriate `status` field when marking as complete (e.g., "completed")

### Step 2: Update Frontend API Service
- Read `src/services/api/adwDbService.js` to check for existing methods
- Add or verify `updateAdwStage(adwId, stage, status)` method that calls `PATCH /api/adws/{adw_id}` with updated stage and status
- Ensure proper error handling and response parsing

### Step 3: Add Store Action in kanbanStore.js
- Read full `src/stores/kanbanStore.js` to understand existing actions and state structure
- Add new action `markTaskAsComplete(taskId)` that:
  - Finds the task by taskId
  - Extracts the adw_id from task.metadata
  - Calls the API service to update backend (stage="completed", status="completed")
  - Updates the frontend task state to reflect the change
  - Handles success/error scenarios with appropriate user feedback
  - Updates the task's `updatedAt` timestamp
- Follow the same pattern as existing actions like `triggerMergeWorkflow` or `deleteWorktree`

### Step 4: Add Menu Item to KanbanCard Dropdown
- Read `src/components/kanban/KanbanCard.jsx` (lines 390-428) to understand the dropdown menu structure
- Add a new menu item "✅ MARK AS COMPLETE" in the dropdown menu
- Position it before the DELETE option for logical grouping
- Add click handler that:
  - Stops event propagation
  - Calls the store action `markTaskAsComplete(task.id)`
  - Closes the menu
  - Shows loading state if needed
- Add conditional rendering to only show for tasks in stages: plan, build, test, review, document, pr, ready-to-merge (not for backlog or already completed tasks)
- Add appropriate disabled state during loading

### Step 5: Add CTA Button to CardExpandModal Footer
- Read `src/components/kanban/CardExpandModal.jsx` (lines 1054-1157) to understand footer structure
- Add "MARK AS COMPLETE" button in the footer section
- Position it logically (e.g., after MERGE TO MAIN or before CLOSE)
- Use consistent styling with other footer buttons (class: `brutalist-footer-btn`)
- Add click handler that calls `markTaskAsComplete(task.id)` from the store
- Show success/error feedback using the existing Toast notification system
- Add conditional rendering to hide for already completed tasks
- Add loading state indicator while marking complete
- Use lucide-react icon `CheckCircle` for visual consistency

### Step 6: Add Visual Feedback and Styling
- Read `src/style.css` to understand existing brutalist button styles
- Add any necessary CSS for the "Mark as Complete" button if unique styling is needed
- Ensure the button follows the brutalist design system (thick borders, bold text, high contrast)
- Add hover states and disabled states consistent with other buttons
- Consider adding a success state color (green) to differentiate from other CTAs

### Step 7: Create Unit Tests
- Create unit test file `src/stores/__tests__/kanbanStore-mark-complete.test.js` to test:
  - `markTaskAsComplete` action successfully updates task stage
  - API call is made with correct parameters
  - Error handling when API fails
  - Proper state updates after successful completion
  - Edge cases (task not found, no adw_id, already completed)

- Create component test file `src/components/kanban/__tests__/KanbanCard-mark-complete.test.jsx` to test:
  - Menu item appears for eligible stages (plan onwards)
  - Menu item does not appear for backlog or completed tasks
  - Click handler properly calls the store action
  - Loading and disabled states work correctly

- Create component test file `src/components/kanban/__tests__/CardExpandModal-mark-complete.test.jsx` to test:
  - Footer button appears for eligible tasks
  - Footer button hidden for completed tasks
  - Click handler calls store action
  - Toast notifications appear on success/error
  - Button disabled during loading

### Step 8: Create Integration Tests
- Create integration test file `src/test/integration/mark-task-complete.integration.test.js` to test:
  - End-to-end flow from clicking button to task being marked complete
  - Backend API integration works correctly
  - Task moves to completed column in Kanban board
  - Multiple tasks can be marked complete independently
  - WebSocket notifications work if applicable

### Step 9: Create E2E Tests
- Create E2E test file `src/test/e2e/issue-1511-adw-3130fd0b-e2e-mark-complete.md` describing:
  - Manual test scenarios for marking tasks complete from dropdown menu
  - Manual test scenarios for marking tasks complete from expanded modal
  - Verification that completed tasks appear in the completed column/view
  - Verification that the action is not available for backlog tasks
  - Verification that already completed tasks don't show the button
  - Error scenarios (network failure, invalid task)

### Step 10: Run Validation Commands
- Run all validation commands to ensure zero regressions and that the feature works correctly

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run typecheck` - Ensure TypeScript types are correct and no type errors introduced
- `npm run test -- src/stores/__tests__/kanbanStore-mark-complete.test.js` - Run store unit tests
- `npm run test -- src/components/kanban/__tests__/KanbanCard-mark-complete.test.jsx` - Run KanbanCard tests
- `npm run test -- src/components/kanban/__tests__/CardExpandModal-mark-complete.test.jsx` - Run CardExpandModal tests
- `npm run test -- src/test/integration/mark-task-complete.integration.test.js` - Run integration tests
- `npm run test` - Run all frontend tests to ensure no regressions
- `uv run pytest server/tests/ -v --tb=short` - Run all backend tests to ensure ADW API works correctly
- `npm run lint` - Ensure code follows linting standards
- `npm run build` - Ensure production build succeeds

## Notes
- The "completed" stage is already defined in the kanban stages (src/stores/kanbanStore.js line 97)
- The backend PATCH endpoint at `server/api/adw_db.py` line 320 should already support updating stage
- Follow the existing pattern for similar actions like `triggerMergeWorkflow` for consistency
- Use the existing Toast notification system (src/components/ui/Toast.jsx) for user feedback
- The button should be clearly labeled and visually distinct to prevent accidental clicks
- Consider adding a confirmation dialog if needed to prevent accidental marking as complete
- Ensure the action updates both the frontend state immediately (optimistic update) and syncs with backend
- The action should be idempotent - clicking multiple times should be safe
- WebSocket notifications may need to be sent to other connected clients if multi-user support is required
- The completed tasks may need special handling in the KanbanBoard view (already has CompletedTasksModal component)
