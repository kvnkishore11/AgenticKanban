# Mark as Complete CTA for Task Cards

**ADW ID:** 3130fd0b
**Date:** 2025-12-03
**Specification:** specs/issue-1511-adw-3130fd0b-sdlc_planner-add-mark-complete-cta.md

## Overview

Added a "Mark as Complete" call-to-action (CTA) button to task cards, enabling users to manually move tasks to the "completed" stage. This feature is particularly useful when work has been completed via terminal/git worktree operations but the UI hasn't reflected the change yet. The CTA is available for tasks from the "plan" stage onwards and appears in both the card dropdown menu and the expanded task detail modal.

## What Was Built

- **Dropdown Menu Option**: Added "✅ MARK AS COMPLETE" option in the KanbanCard dropdown menu (three-dot menu)
- **Modal Footer Button**: Added "MARK AS COMPLETE" button in the CardExpandModal footer alongside other CTAs
- **Store Action**: Implemented `markTaskAsComplete` action in kanbanStore to handle the backend API call and frontend state update
- **Backend Support**: Added `completed_at` field to ADW database model
- **Comprehensive Testing**: Created unit tests, integration tests, and E2E test documentation

## Technical Implementation

### Files Modified

- `src/components/kanban/KanbanCard.jsx`: Added dropdown menu item with loading state and click handler
- `src/components/kanban/CardExpandModal.jsx`: Added footer button with toast notifications and visual feedback
- `src/stores/kanbanStore.js`: Implemented `markTaskAsComplete` action with optimistic UI updates
- `server/models/adw_db_models.py`: Added `completed_at` timestamp field to ADW model
- `src/styles/brutalist-modal.css`: Added styling for the complete button with distinctive green color

### Key Changes

1. **Conditional Visibility**: The CTA only appears for tasks in eligible stages (plan, build, implement, test, review, document, pr, ready-to-merge), excluding backlog, completed, or errored tasks

2. **Dual-Location Access**: Users can mark tasks as complete from:
   - The dropdown menu on any card (quick access)
   - The expanded modal footer (alongside other workflow actions)

3. **Optimistic UI Updates**: The frontend immediately updates the task's stage to "completed" while making the backend API call, providing instant visual feedback

4. **Comprehensive Error Handling**: Both locations include error handling with toast notifications for success and failure cases

5. **Loading States**: Both UI elements show loading indicators during the API call to prevent duplicate submissions

## How to Use

### From Card Dropdown Menu

1. Locate the task card you want to mark as complete
2. Click the three-dot menu (⋮) in the top-right corner of the card
3. Click "✅ MARK AS COMPLETE"
4. The task will immediately move to the completed column

### From Expanded Modal

1. Click on any task card to open the expanded detail view
2. Scroll to the footer section at the bottom of the modal
3. Click the "MARK AS COMPLETE" button (green button with CheckCircle icon)
4. A toast notification will appear confirming the action
5. The task will move to the completed stage

## Configuration

No configuration is required. The feature automatically:
- Updates the task's `current_stage` to "completed"
- Sets the task's `status` to "completed"
- Records the `completed_at` timestamp
- Syncs changes with the backend database via PATCH `/api/adws/{adw_id}`

## Testing

### Unit Tests
- `src/stores/__tests__/kanbanStore-mark-complete.test.js` - Tests the store action, API integration, and state updates
- `src/components/kanban/__tests__/KanbanCard-mark-complete.test.jsx` - Tests the dropdown menu item visibility and click handling
- `src/components/kanban/__tests__/CardExpandModal-mark-complete.test.jsx` - Tests the modal button and toast notifications

### Integration Tests
- `src/test/integration/mark-task-complete.integration.test.jsx` - Tests the full flow from UI interaction to backend update

### E2E Tests
- `src/test/e2e/issue-1511-adw-3130fd0b-e2e-mark-complete.md` - Manual testing scenarios and verification steps

Run tests with:
```bash
npm run test -- src/stores/__tests__/kanbanStore-mark-complete.test.js
npm run test -- src/components/kanban/__tests__/KanbanCard-mark-complete.test.jsx
npm run test -- src/components/kanban/__tests__/CardExpandModal-mark-complete.test.jsx
npm run test -- src/test/integration/mark-task-complete.integration.test.jsx
```

## Notes

- The action is **idempotent** - clicking multiple times will not cause issues
- Already completed tasks do not show the CTA (prevented by conditional rendering)
- The feature uses **optimistic UI updates** for immediate feedback
- Backend validation ensures only valid stage transitions are persisted
- The `completed_at` timestamp is automatically set when marking a task as complete
- Toast notifications provide clear success/error feedback to users
- Both UI locations share the same underlying store action, ensuring consistent behavior
