# E2E Test Plan: Patch Panel UI Redesign

## Test ID
`issue-4-adw-8185e70e-e2e-patch-panel`

## Feature Description
This test plan validates the patch panel UI redesign where patches are moved from the left sidebar to a dedicated panel below the stage tabs in the CardExpandModal.

## Prerequisites
1. Frontend and backend services are running
2. At least one task exists with patch history
3. User can access the Kanban board

## Test Cases

### TC-01: Patch Panel Visibility
**Objective:** Verify that the patch panel is visible when patches exist and hidden when no patches exist

**Steps:**
1. Open the application and navigate to the Kanban board
2. Click on a task that has no patches
3. Observe the CardExpandModal
4. Close the modal
5. Click on a task that has patch history
6. Observe the CardExpandModal

**Expected Results:**
- Task without patches: No patch panel should be visible
- Task with patches: Patch panel should be visible below the stage tabs with a visual separator (horizontal border)
- Patch tabs should be clearly separated from stage tabs

### TC-02: Patch Tabs Display
**Objective:** Verify that patch tabs are displayed correctly with proper status indicators

**Steps:**
1. Create a task and apply 3 patches with different statuses:
   - Patch 1: Completed
   - Patch 2: In Progress
   - Patch 3: Failed
2. Open the task in CardExpandModal
3. Locate the patch tabs panel
4. Observe each patch tab

**Expected Results:**
- Three patch tabs should be visible: "PATCH 1", "PATCH 2", "PATCH 3"
- Each patch tab should display:
  - Patch icon (🔧)
  - Patch number
  - Status indicator:
    - Completed: ✓ (green border)
    - In Progress: ⟳ (blue border, pulsing)
    - Failed: ✗ (red border)
- Tabs should use brutalist styling consistent with stage tabs

### TC-03: Patch Selection and Content Display
**Objective:** Verify that clicking a patch tab displays the patch's logs, thinking, and results

**Steps:**
1. Open a task with at least 2 completed patches
2. Click on "PATCH 1" tab
3. Observe the content panel
4. Switch between "EXECUTION", "THINKING", and "RESULT" tabs
5. Click on "PATCH 2" tab
6. Observe the content panel updates

**Expected Results:**
- When PATCH 1 is selected:
  - PATCH 1 tab should be highlighted/active
  - Content panel should show PATCH 1's logs
  - All three content type tabs (EXECUTION, THINKING, RESULT) should work
- When PATCH 2 is selected:
  - PATCH 2 tab should be highlighted/active
  - Content panel should update to show PATCH 2's logs
  - Previous patch tab (PATCH 1) should no longer be active

### TC-04: Stage and Patch Tab Interaction
**Objective:** Verify that switching between stage tabs and patch tabs works correctly

**Steps:**
1. Open a task with patches
2. Select a stage tab (e.g., "BUILD")
3. Observe the stage tab is active and patch tabs are inactive
4. Click on a patch tab (e.g., "PATCH 1")
5. Observe that the patch tab becomes active
6. Click on a stage tab again (e.g., "PLAN")
7. Observe the behavior

**Expected Results:**
- When a stage tab is active: Stage tab is highlighted, patch tabs are not highlighted
- When a patch tab is active: Patch tab is highlighted, stage tabs are not highlighted
- Content panel should always show logs for the currently selected tab (stage or patch)
- Switching between stage and patch tabs should be smooth with no UI glitches

### TC-05: Patch History Removed from Sidebar
**Objective:** Verify that the patch history section is no longer displayed in the left sidebar

**Steps:**
1. Open a task with patches
2. Scroll through the left sidebar
3. Check for any "PATCH HISTORY" sections

**Expected Results:**
- No "PATCH HISTORY" section should be visible in the left sidebar
- Other sidebar sections (DESCRIPTION, ADW METADATA) should still be present
- Sidebar should look clean without patch information

### TC-06: Patch Badge on KanbanCard
**Objective:** Verify that the KanbanCard displays a simplified patch badge

**Steps:**
1. View the Kanban board
2. Locate a task that has patches
3. Observe the task card

**Expected Results:**
- Task card should display "🔧 PATCHED" badge
- Badge should NOT show patch number or count
- Badge should have appropriate status styling (color based on patch status)

### TC-07: Apply Patch Visual Feedback
**Objective:** Verify that applying a new patch shows prominent visual feedback

**Steps:**
1. Open a task that has an ADW ID
2. Click the "PATCH" button in the footer
3. Enter a patch request in the modal
4. Click "Apply Patch"
5. Observe the modal

**Expected Results:**
- After clicking "Apply Patch":
  - A prominent loading indicator should appear (spinning wrench icon)
  - "Patch Running" message should be displayed
  - The modal should show "Applying your changes... Please wait"
  - Submit button should be disabled during submission
- After patch starts:
  - Toast notification should confirm "Patch In Progress"
  - New patch tab should appear immediately in the patch panel
  - The new patch tab should show "in_progress" status (⟳)

### TC-08: Empty State Handling
**Objective:** Verify proper handling when no logs are available for a patch

**Steps:**
1. Apply a new patch to a task
2. Immediately click on the new patch tab before logs are generated
3. Observe the content panel

**Expected Results:**
- Content panel should show an empty state message:
  - For EXECUTION: "No Execution Logs - Patch #X has no execution logs available"
  - For THINKING: "No Agent Logs - Patch #X has no agent logs available"
- Empty state should have appropriate icon and message
- UI should not show errors or blank screens

### TC-09: Multiple Patches Display
**Objective:** Verify that the UI handles multiple patches (5+) correctly

**Steps:**
1. Apply 5 patches to a task
2. Open the task in CardExpandModal
3. Observe the patch tabs panel
4. Click through each patch tab

**Expected Results:**
- All 5 patch tabs should be visible
- Tabs should wrap or scroll if needed (no overflow)
- Each patch tab should be clickable and functional
- Performance should remain smooth
- Patch numbers should be sequential (PATCH 1, PATCH 2, ..., PATCH 5)

### TC-10: Patch Status Updates
**Objective:** Verify that patch status updates are reflected in real-time

**Steps:**
1. Apply a new patch to a task
2. Keep the CardExpandModal open
3. Wait for the patch workflow to complete
4. Observe the patch tab

**Expected Results:**
- Patch tab should initially show "in_progress" status (⟳)
- When patch completes, tab should update to show "completed" status (✓)
- Status change should happen without requiring modal refresh
- Border color and styling should update accordingly

### TC-11: Patch Panel Separator Visual
**Objective:** Verify the visual separator between stage tabs and patch tabs

**Steps:**
1. Open a task with patches
2. Observe the area between stage tabs and patch tabs

**Expected Results:**
- A clear horizontal separator (3px black border) should be visible
- Patch panel should have a distinct background color (yellow/amber gradient)
- Visual hierarchy should clearly separate stages from patches
- Separator should span the full width of the panel

### TC-12: Brutalist Design Consistency
**Objective:** Verify that all patch panel elements follow brutalist design principles

**Steps:**
1. Open multiple tasks with different patch statuses
2. Observe all patch-related UI elements

**Expected Results:**
- Patch tabs should use:
  - Bold, uppercase text
  - Thick borders (2-3px)
  - No border radius (square corners)
  - Monospace font (Courier New)
  - High contrast colors
- Hover states should be clear and immediate
- Active states should use solid color fills
- All animations should be minimal and functional

## Regression Tests

### RT-01: Existing Stage Tab Functionality
**Objective:** Ensure stage tabs still work as before

**Steps:**
1. Open a task without patches
2. Click through all stage tabs
3. Verify logs display correctly

**Expected Results:**
- Stage tabs function normally
- No regression in stage tab behavior
- Auto-follow still works for running stages

### RT-02: Existing Footer Buttons
**Objective:** Ensure all footer buttons still work

**Steps:**
1. Open a task
2. Test TRIGGER, PATCH, MERGE, EDIT, and CLOSE buttons

**Expected Results:**
- All buttons remain functional
- No layout issues with footer
- Button states (enabled/disabled) work correctly

## Browser Compatibility
Test all cases on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Criteria
- Modal should open in < 500ms
- Switching between patch tabs should be instant (< 100ms)
- No memory leaks when opening/closing modal multiple times
- Smooth scrolling in logs panel

## Accessibility Requirements
- Patch tabs should be keyboard navigable (Tab key)
- Active patch should have proper ARIA labels
- Status indicators should have title attributes for screen readers
- Color should not be the only way to distinguish status

## Success Criteria
All test cases pass with:
- ✅ No visual glitches
- ✅ No console errors
- ✅ Proper error handling
- ✅ Consistent brutalist design
- ✅ Smooth user experience

## Test Execution Log
| Test Case | Status | Tester | Date | Notes |
|-----------|--------|--------|------|-------|
| TC-01 | ⏳ | - | - | - |
| TC-02 | ⏳ | - | - | - |
| TC-03 | ⏳ | - | - | - |
| TC-04 | ⏳ | - | - | - |
| TC-05 | ⏳ | - | - | - |
| TC-06 | ⏳ | - | - | - |
| TC-07 | ⏳ | - | - | - |
| TC-08 | ⏳ | - | - | - |
| TC-09 | ⏳ | - | - | - |
| TC-10 | ⏳ | - | - | - |
| TC-11 | ⏳ | - | - | - |
| TC-12 | ⏳ | - | - | - |
| RT-01 | ⏳ | - | - | - |
| RT-02 | ⏳ | - | - | - |
