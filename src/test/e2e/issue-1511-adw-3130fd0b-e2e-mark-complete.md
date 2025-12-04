# E2E Test Specification: Mark Task as Complete

**Feature**: Add "Mark as Complete" CTA to task cards
**Issue**: #1511
**ADW ID**: 3130fd0b

## Test Environment Setup

### Prerequisites
1. Backend server running on `http://localhost:8502`
2. WebSocket server running on configured port
3. Frontend application running on `http://localhost:5173`
4. Test database with sample tasks in various stages

### Test Data Setup
Create the following test tasks:
- Task 1: Stage = `plan`, ADW ID = `test001`, Status = `in_progress`
- Task 2: Stage = `build`, ADW ID = `test002`, Status = `in_progress`
- Task 3: Stage = `ready-to-merge`, ADW ID = `test003`, Status = `in_progress`
- Task 4: Stage = `backlog`, ADW ID = `test004`, Status = `pending`
- Task 5: Stage = `completed`, ADW ID = `test005`, Status = `completed`
- Task 6: Stage = `errored`, ADW ID = `test006`, Status = `errored`

---

## Test Scenarios

### Scenario 1: Mark Task as Complete from Dropdown Menu (Plan Stage)

**Given**: A task card in the "plan" stage is visible on the Kanban board

**Steps**:
1. Locate the task card for "Task 1" in the plan column
2. Click the three-dot menu button (⋮) on the card
3. Verify that "✅ MARK AS COMPLETE" menu item appears in the dropdown
4. Click on "✅ MARK AS COMPLETE" menu item
5. Observe the UI feedback

**Expected Results**:
- ✅ Dropdown menu closes immediately
- ✅ Task card transitions to the "completed" column/view
- ✅ Success notification appears: "Task marked as complete"
- ✅ Backend API receives PATCH request to `/api/adws/test001` with:
  ```json
  {
    "current_stage": "completed",
    "status": "completed",
    "completed_at": "<ISO timestamp>"
  }
  ```
- ✅ Database record is updated with stage = "completed"
- ✅ Task card no longer shows "MARK AS COMPLETE" option in dropdown

---

### Scenario 2: Mark Task as Complete from Expanded Modal (Build Stage)

**Given**: Task card in "build" stage is expanded in modal view

**Steps**:
1. Locate the task card for "Task 2" in the build column
2. Click on the task card to expand the modal
3. Scroll to the footer section of the modal
4. Verify that "MARK AS COMPLETE" button appears in the footer
5. Click the "MARK AS COMPLETE" button
6. Observe the UI feedback

**Expected Results**:
- ✅ Button shows loading state: "MARKING..." with spinner icon
- ✅ Toast notification appears: "Marking as Complete - Updating task status..."
- ✅ After API success, success toast appears: "Task Completed - Task has been marked as complete"
- ✅ Task moves to completed column
- ✅ Modal can be closed normally
- ✅ Backend receives correct PATCH request
- ✅ Reopening the task shows it in "completed" stage

---

### Scenario 3: Mark Task as Complete from Ready-to-Merge Stage

**Given**: Task card in "ready-to-merge" stage

**Steps**:
1. Locate "Task 3" in the ready-to-merge column
2. Click the three-dot menu (⋮)
3. Click "✅ MARK AS COMPLETE"

**Expected Results**:
- ✅ Task successfully moves to completed
- ✅ Success notification appears
- ✅ API call succeeds
- ✅ Task state persists after page refresh

---

### Scenario 4: Verify Button NOT Available for Backlog Tasks

**Given**: Task card in "backlog" stage

**Steps**:
1. Locate "Task 4" in the backlog column
2. Click the three-dot menu (⋮)
3. Examine the dropdown menu items

**Expected Results**:
- ✅ "MARK AS COMPLETE" option does NOT appear in dropdown
- ✅ Only standard options appear (EDIT, TRIGGER, START WORKTREE, etc.)

---

### Scenario 5: Verify Button NOT Available for Already Completed Tasks

**Given**: Task card already in "completed" stage

**Steps**:
1. Open the completed tasks modal/view
2. Locate "Task 5" (already completed)
3. Click on the task to expand
4. Check the dropdown menu

**Expected Results**:
- ✅ Dropdown menu does NOT show "MARK AS COMPLETE" option
- ✅ Expanded modal footer does NOT show "MARK AS COMPLETE" button
- ✅ Task remains in completed state

---

### Scenario 6: Verify Button NOT Available for Errored Tasks

**Given**: Task card in "errored" stage

**Steps**:
1. Locate "Task 6" in the errored column
2. Click the three-dot menu (⋮)
3. Examine dropdown options

**Expected Results**:
- ✅ "MARK AS COMPLETE" option does NOT appear
- ✅ Other error recovery options may be available

---

### Scenario 7: Error Handling - Network Failure

**Given**: Task in "plan" stage, backend is unavailable

**Steps**:
1. Stop the backend server
2. Locate a task in plan stage
3. Click the three-dot menu (⋮)
4. Click "✅ MARK AS COMPLETE"
5. Observe error handling

**Expected Results**:
- ✅ Error toast notification appears: "Mark Complete Failed - Failed to mark task as complete"
- ✅ Task remains in "plan" stage (no optimistic update persists)
- ✅ Dropdown menu closes
- ✅ User can retry after backend is restored

---

### Scenario 8: Error Handling - Invalid ADW ID

**Given**: Task with missing or invalid adw_id metadata

**Steps**:
1. Create a task with `metadata: {}`  (no adw_id)
2. Try to mark it as complete from dropdown
3. Observe behavior

**Expected Results**:
- ✅ Error notification appears: "Failed to mark task as complete: Task does not have an adw_id"
- ✅ Task state unchanged
- ✅ No API call is made

---

### Scenario 9: Multiple Tasks Marked Complete in Sequence

**Given**: Multiple tasks in various stages (plan, build, test)

**Steps**:
1. Mark "Task 1" (plan) as complete
2. Wait for success confirmation
3. Mark "Task 2" (build) as complete
4. Wait for success confirmation
5. Verify both tasks appear in completed view

**Expected Results**:
- ✅ Both tasks successfully transition to completed
- ✅ Each task shows individual success notification
- ✅ Backend receives separate API calls for each
- ✅ Tasks maintain independent state
- ✅ No race conditions or state conflicts

---

### Scenario 10: Page Refresh Persistence

**Given**: Task marked as complete

**Steps**:
1. Mark "Task 1" as complete
2. Wait for success notification
3. Refresh the browser page (F5)
4. Verify task state

**Expected Results**:
- ✅ Task appears in completed column after refresh
- ✅ Stage persists as "completed"
- ✅ Timestamp shows when it was marked complete
- ✅ "MARK AS COMPLETE" option no longer available

---

### Scenario 11: Visual Feedback and Styling

**Given**: Task in eligible stage (plan, build, test, etc.)

**Steps**:
1. Open task dropdown menu
2. Hover over "MARK AS COMPLETE" option
3. Click the option and observe button state
4. Open expanded modal
5. Locate "MARK AS COMPLETE" button in footer
6. Hover over button
7. Click button and observe loading state

**Expected Results**:
- ✅ Dropdown menu item has checkmark icon: ✅
- ✅ Menu item shows hover state (proper styling)
- ✅ Footer button has green gradient background (consistent with success/complete theme)
- ✅ Footer button shows hover shadow effect
- ✅ Loading state shows spinner icon and "MARKING..." text
- ✅ Button is disabled during loading
- ✅ Styling follows brutalist design system

---

### Scenario 12: Accessibility Testing

**Given**: Task in plan stage

**Steps**:
1. Use keyboard navigation (Tab) to focus on task card
2. Press Enter to open dropdown
3. Use arrow keys to navigate to "MARK AS COMPLETE"
4. Press Enter to activate
5. Verify screen reader announcements

**Expected Results**:
- ✅ Menu items are keyboard accessible
- ✅ Proper ARIA labels are present
- ✅ Focus management works correctly
- ✅ Success/error notifications are announced

---

## Test Data Cleanup

After test completion:
1. Delete all test tasks created during E2E tests
2. Reset database to initial state
3. Clear any WebSocket connections
4. Verify no orphaned ADW records remain

---

## Pass Criteria

All scenarios must pass with ✅ for feature to be considered complete and ready for production.

**Total Scenarios**: 12
**Required Pass Rate**: 100%
**Test Duration Estimate**: 30-45 minutes (manual)

---

## Notes for Automation

If automating these tests with Playwright/Cypress:
- Use data-testid attributes for reliable element selection
- Mock WebSocket events for WebSocket-dependent flows
- Stub backend API for error scenarios
- Use visual regression testing for styling verification
- Include network throttling for realistic conditions
