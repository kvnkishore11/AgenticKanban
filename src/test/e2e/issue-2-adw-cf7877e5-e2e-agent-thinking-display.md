# E2E Test Specification: Improved Agent Thinking Display

**Issue**: #2
**ADW ID**: cf7877e5
**Test Type**: End-to-End Manual Testing

## Overview

This document specifies manual end-to-end tests to verify the improvements to agent thinking display, result summaries, and auto-scroll behavior in the expanded card modal.

## Test Environment Setup

1. Start the frontend: `npm run dev` (or use `fesh` alias)
2. Start the WebSocket backend: `python -m adws.adw_websocket` (or use `adwsh` alias)
3. Ensure you have at least one ADW workflow with completed stages in the `agents/` directory
4. Open the application in a browser at `http://localhost:5173`

## Test Scenarios

### 1. Agent Log Entry Default Expansion

**Objective**: Verify that agent log entries expand/collapse intelligently based on their importance.

#### Test Steps:
1. Navigate to the Kanban board
2. Click on any task card that has agent execution data
3. In the expanded modal, select a stage tab (e.g., "Plan", "Build", "Test")
4. Click on the "Thinking" content type tab to view agent logs

**Expected Behavior**:
- [ ] **Thinking blocks** should be **expanded by default** (purple background)
  - You should immediately see the agent's reasoning text without clicking
  - Example: "I need to analyze the codebase structure..."

- [ ] **Tool results with errors** should be **expanded by default** (red background)
  - Error messages should be immediately visible
  - Example: Tool call failed with error: "File not found"

- [ ] **File changes** should be **expanded by default** (orange background)
  - Diff content should be visible immediately
  - Shows lines added/removed counts

- [ ] **Routine tool calls (pre-execution)** should be **collapsed by default** (indigo background)
  - Tool input parameters should NOT be visible until clicked
  - Example: "Calling tool: Read" - needs click to see parameters

- [ ] **Text blocks** should be **collapsed by default** (blue background)
  - Long text responses should be hidden until clicked
  - Prevents overwhelming the view with verbose content

#### Manual Expansion Test:
5. Click on a collapsed tool call entry
6. **Expected**: Entry expands to show tool input parameters
7. Click again
8. **Expected**: Entry collapses back

---

### 2. Result Summary Generation and Key Decisions

**Objective**: Verify that stage results show meaningful summaries and extracted key decisions.

#### Test Steps:
1. Navigate to the Kanban board
2. Click on a task card with completed stages
3. In the expanded modal, select any stage tab (e.g., "Plan")
4. Click on the "Result" content type tab

**Expected Behavior**:

- [ ] **Execution Summary Banner** appears at the top
  - Shows "Stage completed successfully" (green) or "Completed with warnings" (yellow)
  - Displays response count (e.g., "3 responses")
  - Shows tools used count (e.g., "5 tools used")
  - Shows files changed count (e.g., "2 files changed")
  - Tool badges displayed with tool names (e.g., "Read ×3", "Write ×2")
  - File name badges shown (max 5 files, then "+X more")

- [ ] **Summary Section** appears below the banner (blue left border)
  - Heading: "Summary"
  - Contains 1-2 sentence summary of what happened during the stage
  - Example: "I completed the implementation by modifying the files. Used 3 tools: Read, Write, Edit. Modified 2 files."

- [ ] **Key Decisions Section** (if agent had thinking blocks)
  - Heading: "Key Decisions" (indigo left border)
  - Displays bullet list of extracted decisions
  - Example decisions:
    - "refactor the code to improve readability"
    - "use the newer API endpoint"
    - "validate the input first"
  - Should show up to 5 key decisions
  - Each decision should be < 150 characters

- [ ] **Conversation Section** (collapsible, expanded by default)
  - Shows assistant messages with proper formatting
  - Displays "Agent" label with purple icon
  - Text content rendered with markdown
  - Tool uses shown as badges within messages

- [ ] **Raw JSON Section** (collapsible, collapsed by default)
  - Click to expand
  - Shows full JSON of the result
  - Useful for debugging

#### Testing Different Result Types:
5. Test with multiple stages (Plan, Build, Test, Review, Document)
6. **Expected**: Each stage should show appropriate summaries and decisions
   - Plan stage: Should extract planning decisions
   - Build stage: Should show files modified and implementation decisions
   - Test stage: Should show test results and error information
   - Review stage: Should show review findings
   - Document stage: Should show documentation generation summary

---

### 3. Smart Auto-Scroll Behavior ("Snap-Back" Fix)

**Objective**: Verify that the auto-scroll behavior respects user intent and doesn't disrupt reading.

#### Test Steps - Auto-scroll when at bottom:
1. Navigate to the Kanban board
2. Click on a task card that is **currently running** (status: "in_progress")
3. In the expanded modal, select the active stage tab
4. Click on "Thinking" to view agent logs
5. Scroll to the very bottom of the logs
6. Wait for new logs to arrive (3-second polling interval)

**Expected Behavior**:
- [ ] When new logs arrive and you're already at the bottom, the view should **smoothly auto-scroll** to show new entries
- [ ] No jarring jumps or "snap-back" effect
- [ ] Smooth scroll animation
- [ ] You remain at the bottom seeing the latest logs

#### Test Steps - No auto-scroll when scrolled up:
7. Scroll up to view earlier logs (anywhere above the bottom)
8. Read some content for 5-10 seconds
9. Wait for new logs to arrive

**Expected Behavior**:
- [ ] The view should **NOT auto-scroll** while you're reading
- [ ] Your position in the log stream should be **preserved**
- [ ] The "Jump to Latest" button should light up (purple background)
- [ ] A **red badge** with a number should appear on the button showing count of new logs
  - Example: Badge shows "3" meaning 3 new logs arrived

#### Test Steps - Jump to latest indicator:
10. While scrolled up with new logs available, look at the top-right corner
11. **Expected**: The "Jump to Latest" button (down arrow icon) should have:
    - Purple background (instead of gray)
    - Red badge with number of new logs (e.g., "5")
    - Tooltip showing "5 new logs available"

12. Click the "Jump to Latest" button

**Expected Behavior**:
- [ ] View smoothly scrolls to the bottom
- [ ] New logs badge disappears
- [ ] Button returns to normal gray color
- [ ] Auto-scroll is re-enabled
- [ ] Future new logs will auto-scroll since you're back at bottom

#### Test Steps - Scroll back to bottom manually:
13. Scroll up again to view earlier logs
14. Wait for new logs to arrive (badge appears)
15. Manually scroll down to the very bottom (don't use the button)

**Expected Behavior**:
- [ ] When you reach the bottom by scrolling, the badge should **automatically disappear**
- [ ] Auto-scroll should be **automatically re-enabled**
- [ ] Next new logs should auto-scroll smoothly

---

### 4. Visual Hierarchy and Readability

**Objective**: Verify that the improved visual design makes information easier to scan and understand.

#### Test Steps:
1. Open an expanded card modal
2. View the Result tab for any completed stage
3. Visually assess the information hierarchy

**Expected Visual Characteristics**:

- [ ] **Summary section** stands out prominently
  - Blue left border (4px wide)
  - Light blue background
  - Lightbulb icon
  - Bold "Summary" heading
  - Slightly larger text than conversation

- [ ] **Key Decisions section** is visually distinct
  - Indigo left border
  - Light indigo background
  - Lightbulb icon
  - Bullet points with indigo dots

- [ ] **Execution banner** draws attention
  - Green for success, yellow for warnings
  - Checkmark or warning icon
  - Stats laid out horizontally
  - Clear badge styling for tools and files

- [ ] **Conversation messages** have clear structure
  - Agent messages: Purple border, purple background
  - User messages: Green border, green background
  - Message bubbles clearly separated
  - Icons distinguish agent from user

- [ ] **Collapsible sections** are intuitive
  - Clear chevron icons (down = expanded, right = collapsed)
  - Section headers are clickable
  - Hover state shows interaction possibility

#### Accessibility Check:
4. Test keyboard navigation
   - [ ] Tab key navigates through collapsible sections
   - [ ] Enter/Space expands/collapses sections
   - [ ] Arrow keys work in scroll containers

5. Check text contrast
   - [ ] All text is readable against backgrounds
   - [ ] No color-only indicators (icons + color used together)

---

### 5. Performance with Large Result Sets

**Objective**: Verify that the improvements don't degrade performance with large data.

#### Test Steps:
1. Find or create a task with a stage that has many log entries (50+)
2. Open the expanded modal
3. Navigate to that stage's "Thinking" tab

**Expected Behavior**:
- [ ] Initial load completes within 2 seconds
- [ ] Scrolling is smooth (no lag or jank)
- [ ] Expanding/collapsing entries is responsive
- [ ] Parsing of large results doesn't freeze UI

4. Navigate to the "Result" tab
5. Expand the "Raw JSON" section

**Expected Behavior**:
- [ ] JSON renders within 1-2 seconds
- [ ] Large JSON doesn't cause page freeze
- [ ] Syntax highlighting applies correctly

---

### 6. Error Handling and Edge Cases

**Objective**: Verify graceful handling of error states and edge cases.

#### Test Scenarios:

**A. Stage with only system messages (no agent content)**
1. Find a stage with minimal agent activity
2. View the Result tab
**Expected**: Shows "No conversation content extracted" message with suggestion to check Raw JSON

**B. Stage with errors**
1. Find a stage that encountered errors
2. View the Result tab
**Expected**:
  - Summary banner shows "Completed with warnings" (yellow)
  - Error icon displayed
  - Error details visible in conversation or summary

**C. Empty result**
1. View a stage that hasn't completed yet
2. Click the Result tab
**Expected**: Shows "No Result Available" with message "Result will appear when the stage completes"

**D. Very long decision text**
1. If available, find a stage with very verbose thinking
**Expected**: Key Decisions section should filter out extremely long items (>150 chars) to avoid clutter

---

## Regression Testing

After verifying the new features work, confirm that existing functionality remains intact:

- [ ] Stage tabs switch correctly
- [ ] Content type tabs (Execution, Thinking, Result) switch correctly
- [ ] Execution logs display properly
- [ ] Stage progression indicator works
- [ ] Modal can be closed and reopened
- [ ] Multiple cards can be opened in sequence
- [ ] Search and filter in agent logs still works
- [ ] Event type filter (ALL, THINKING, TOOL, FILE, TEXT) works
- [ ] Auto-scroll toggle button functions
- [ ] Refresh logs button works

---

## Cross-Browser Testing

Verify functionality in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Edge

---

## Acceptance Criteria

For this E2E test to pass, ALL of the following must be true:

1. ✅ Agent log entries use intelligent default expansion (thinking, errors, files expanded; tools, text collapsed)
2. ✅ Result summaries are generated and displayed prominently
3. ✅ Key decisions are extracted from thinking blocks and displayed
4. ✅ Auto-scroll only happens when user is at bottom
5. ✅ "New logs available" indicator works correctly
6. ✅ Scrolling back to bottom re-enables auto-scroll
7. ✅ Visual hierarchy is clear and information is easy to scan
8. ✅ Performance is acceptable with large result sets
9. ✅ Error states are handled gracefully
10. ✅ No regressions in existing functionality

---

## Notes for Testers

- Test with real workflow data from the `agents/` directory for most realistic results
- Pay attention to the perceived smoothness of interactions, not just correctness
- Report any unexpected behavior, visual glitches, or usability issues
- Consider testing on both laptop screens and larger monitors
- Test with different zoom levels (browser zoom 100%, 110%, 125%)

---

## Test Execution Log

**Tester Name**: _______________
**Date**: _______________
**Environment**: _______________

### Results Summary:
- [ ] All tests passed
- [ ] Tests passed with minor issues (list below)
- [ ] Tests failed (list critical issues below)

**Issues Found**:
1.
2.
3.

**Overall Assessment**: _______________
