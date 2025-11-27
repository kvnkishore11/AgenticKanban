# E2E Test: Stage Height and Footer Positioning

## Overview
This E2E test validates that Kanban stage columns maintain proper minimum heights (75vh) and that the footer is correctly positioned at the bottom of the page across all viewport sizes and content scenarios.

## Prerequisites
- AgenticKanban application running on localhost:5173
- Modern browser with viewport resizing capability
- JavaScript enabled

## User Story
As a user viewing the Kanban board, I expect:
1. Stage columns to maintain a consistent minimum height of 75vh regardless of content
2. The footer to always be positioned at the bottom of the page
3. Proper layout behavior across different viewport sizes
4. No visual breaks or layout issues with varying amounts of tasks

## Test Scenarios

### Scenario 1: Stage Height Validation - Desktop View
**Description**: Verify stage columns maintain minimum 75vh height on desktop viewports

**Steps**:
1. Navigate to http://localhost:5173
2. Select a project to view the Kanban board
3. Set browser viewport to 1920x1080
4. Take a screenshot of the full page layout labeled "01_desktop_full_layout.png"
5. **Verify** all stage columns are visible
6. Open browser developer tools and measure the height of each `.kanban-column` element
7. **Verify** each stage column has minimum height of 75vh (810px at 1080px viewport height)
8. **Verify** stage columns have consistent heights
9. Take a screenshot of developer tools showing the computed height labeled "02_desktop_stage_height_devtools.png"

**Expected Results**:
- All stage columns display with minimum height of 75vh
- Heights are consistent across all stages
- Layout is visually balanced at desktop resolution

### Scenario 2: Stage Height Validation - Tablet View
**Description**: Verify stage height behavior on tablet viewports

**Steps**:
1. Set browser viewport to 768x1024 (portrait tablet)
2. Refresh the page
3. Take a screenshot labeled "03_tablet_portrait_layout.png"
4. Open developer tools and measure stage column heights
5. **Verify** stage columns maintain 75vh minimum height (768px at 1024px viewport height)
6. Rotate to landscape (1024x768)
7. Take a screenshot labeled "04_tablet_landscape_layout.png"
8. **Verify** stage columns maintain 75vh minimum height (576px at 768px viewport height)
9. **Verify** no layout breaks during orientation change

**Expected Results**:
- Stage columns maintain 75vh height in both orientations
- Responsive layout adapts properly
- No visual breaks or overflow issues

### Scenario 3: Stage Height Validation - Mobile View
**Description**: Verify stage height behavior on mobile viewports

**Steps**:
1. Set browser viewport to 375x667 (mobile portrait)
2. Refresh the page
3. Take a screenshot labeled "05_mobile_layout.png"
4. Open developer tools and measure stage column heights
5. **Verify** stage columns maintain 75vh minimum height (500px at 667px viewport height)
6. Test scrolling behavior
7. **Verify** columns remain properly sized during vertical scroll
8. Take a screenshot after scrolling labeled "06_mobile_scrolled.png"

**Expected Results**:
- Stage columns maintain proper minimum height on mobile
- Scrolling behavior works correctly
- Layout remains stable during scroll

### Scenario 4: Footer Positioning - Empty Stages
**Description**: Verify footer stays at bottom when stages have no tasks

**Steps**:
1. Navigate to a project with empty or minimal tasks
2. Set browser viewport to 1920x1080
3. Take a screenshot of the full page labeled "07_footer_empty_stages_desktop.png"
4. Scroll to the bottom of the page
5. **Verify** footer is positioned at the bottom of the viewport
6. **Verify** there is no gap between content and footer
7. Measure the footer position using developer tools
8. **Verify** footer does not float in the middle of the page
9. Set viewport to 375x667 (mobile)
10. Take a screenshot labeled "08_footer_empty_stages_mobile.png"
11. **Verify** footer is at the bottom on mobile as well

**Expected Results**:
- Footer anchored at bottom of page with minimal content
- No floating footer in middle of viewport
- Consistent behavior across desktop and mobile

### Scenario 5: Footer Positioning - Multiple Tasks
**Description**: Verify footer positioning when stages have many tasks

**Steps**:
1. Navigate to a project with multiple tasks in various stages
2. Set browser viewport to 1920x1080
3. Take a screenshot of the full layout labeled "09_footer_with_tasks_desktop.png"
4. Scroll to the bottom of the page
5. Take a screenshot showing the footer labeled "10_footer_bottom_with_tasks.png"
6. **Verify** footer appears after all stage content
7. **Verify** footer is not obscured by stage columns
8. **Verify** proper spacing between stage content and footer
9. Switch to mobile viewport (375x667)
10. Scroll to bottom and take screenshot labeled "11_footer_with_tasks_mobile.png"
11. **Verify** footer is properly positioned on mobile

**Expected Results**:
- Footer appears after all content
- Proper spacing maintained
- Footer visible and accessible on all viewports

### Scenario 6: Layout Integrity with Varying Content
**Description**: Test layout stability with different amounts of tasks per stage

**Steps**:
1. Create a scenario with one stage having many tasks (8+ tasks)
2. Ensure other stages have 0-2 tasks
3. Set viewport to 1920x1080
4. Take a screenshot labeled "12_varying_task_counts.png"
5. **Verify** all stage columns maintain same minimum height despite different content amounts
6. **Verify** stage with many tasks scrolls internally without breaking layout
7. **Verify** stages with few tasks still maintain 75vh minimum height
8. Scroll the individual stage with many tasks
9. Take a screenshot labeled "13_stage_internal_scroll.png"
10. **Verify** footer remains at bottom throughout

**Expected Results**:
- All stages maintain consistent minimum height
- Stages with more content scroll internally
- Empty stages don't collapse below minimum height
- Footer position remains stable

### Scenario 7: Responsive Breakpoints Test
**Description**: Verify layout behavior across all responsive breakpoints

**Steps**:
1. Test at viewport width 1920px, take screenshot labeled "14_breakpoint_1920.png"
2. **Verify** stage heights and footer positioning
3. Resize to 1536px, take screenshot labeled "15_breakpoint_1536.png"
4. **Verify** layout adapts without breaking
5. Resize to 1200px, take screenshot labeled "16_breakpoint_1200.png"
6. **Verify** stage heights remain consistent
7. Resize to 768px, take screenshot labeled "17_breakpoint_768.png"
8. **Verify** footer still at bottom
9. Resize to 375px, take screenshot labeled "18_breakpoint_375.png"
10. **Verify** minimum heights and footer position maintained

**Expected Results**:
- Smooth transitions between breakpoints
- Stage heights remain at 75vh minimum across all sizes
- Footer consistently positioned at bottom
- No layout breaks at any breakpoint

### Scenario 8: Flexbox Layout Verification
**Description**: Verify the main layout uses flexbox correctly to push footer to bottom

**Steps**:
1. Navigate to the Kanban board
2. Set viewport to 1920x1080
3. Open browser developer tools
4. Inspect the main wrapper div element
5. **Verify** wrapper has `display: flex` and `flex-direction: column` styles
6. Take a screenshot of developer tools showing these properties labeled "19_flexbox_wrapper.png"
7. Inspect the main content area
8. **Verify** main content area has `flex: 1` or `flex-grow: 1` property
9. Take a screenshot labeled "20_flexbox_main_content.png"
10. **Verify** footer has no flex-grow property

**Expected Results**:
- Main wrapper uses flex column layout
- Content area has flex-grow to fill available space
- Footer naturally pushed to bottom by flexbox
- Proper CSS implementation of the fix

### Scenario 9: Page Load and Initial Render
**Description**: Test that layout is correct on initial page load

**Steps**:
1. Close and reopen the browser
2. Navigate to http://localhost:5173
3. Take a screenshot immediately after page load labeled "21_initial_load.png"
4. **Verify** stage heights are correct from the start
5. **Verify** footer is at bottom before any user interaction
6. **Verify** no layout shift or reflow during initial render
7. Test with browser cache cleared
8. Take a screenshot labeled "22_initial_load_no_cache.png"
9. **Verify** consistent behavior without cache

**Expected Results**:
- Correct layout on initial render
- No layout shift during page load
- Footer properly positioned from the start
- Consistent behavior with and without cache

### Scenario 10: Cross-browser Compatibility
**Description**: Verify layout works correctly across different browsers

**Steps**:
1. Test in Chrome (latest version) at 1920x1080
2. Take screenshot labeled "23_chrome_layout.png"
3. **Verify** stage heights and footer positioning
4. Test in Firefox (latest version) at 1920x1080
5. Take screenshot labeled "24_firefox_layout.png"
6. **Verify** consistent layout with Chrome
7. Test in Safari (if available) at 1920x1080
8. Take screenshot labeled "25_safari_layout.png"
9. **Verify** flexbox layout works in Safari
10. Document any browser-specific issues

**Expected Results**:
- Consistent stage heights across all browsers
- Footer positioning identical in all browsers
- Flexbox properties supported universally
- No browser-specific layout bugs

## Success Criteria

### Stage Height Requirements
- ✅ Stage columns maintain minimum height of 75vh across all viewport sizes
- ✅ Stage heights are consistent regardless of task content amount
- ✅ Stages with many tasks scroll internally without affecting stage height
- ✅ Empty stages maintain minimum height and don't collapse

### Footer Positioning Requirements
- ✅ Footer is positioned at the bottom of the page in all scenarios
- ✅ Footer does not float in the middle of the viewport with minimal content
- ✅ Footer appears after all stage content when content is abundant
- ✅ Footer positioning is consistent across all viewport sizes

### Layout Structure Requirements
- ✅ Main wrapper uses flexbox with flex-direction: column
- ✅ Main content area has flex-grow property to fill space
- ✅ Layout structure is properly implemented in App.jsx
- ✅ No CSS conflicts or overrides breaking the layout

### Responsive Requirements
- ✅ Layout works correctly at 1920x1080 (desktop)
- ✅ Layout works correctly at 768x1024 (tablet portrait)
- ✅ Layout works correctly at 375x667 (mobile)
- ✅ Smooth transitions between all responsive breakpoints
- ✅ No layout breaks at any viewport size

### Visual Requirements
- ✅ Visually balanced layout with proper vertical distribution
- ✅ No excessive white space or gaps
- ✅ Professional appearance maintained across all viewports
- ✅ Consistent visual hierarchy

## Test Data Setup

### Viewport Test Sizes
- **Large Desktop**: 1920x1080 (75vh = 810px)
- **Medium Desktop**: 1536x864 (75vh = 648px)
- **Small Desktop**: 1200x800 (75vh = 600px)
- **Tablet Portrait**: 768x1024 (75vh = 768px)
- **Tablet Landscape**: 1024x768 (75vh = 576px)
- **Mobile Large**: 414x896 (75vh = 672px)
- **Mobile Medium**: 375x667 (75vh = 500px)

### Test Scenarios for Content
1. **Empty Project**: No tasks in any stage
2. **Minimal Tasks**: 1-2 tasks total across all stages
3. **Balanced Tasks**: 2-3 tasks in each stage
4. **Unbalanced Tasks**: One stage with 8+ tasks, others with 0-2 tasks

## Execution Instructions

### Using Playwright for E2E Testing
When executing this test via the `/test_e2e` command:
1. The test runner will prepare the application
2. Screenshots will be saved to: `agents/<adw_id>/<agent_name>/img/stage_height_footer/`
3. Each screenshot is numbered and labeled descriptively
4. The test will verify each criterion and mark pass/fail
5. Final JSON output will include all screenshot paths and test status

### Manual Testing
1. Start the development server
2. Navigate to http://localhost:5173
3. Follow each scenario step-by-step
4. Use browser developer tools to measure elements
5. Take screenshots at specified points
6. Verify all success criteria

## Output Format

```json
{
  "test_name": "Stage Height and Footer Positioning",
  "status": "passed|failed",
  "screenshots": [
    "/absolute/path/to/agents/<adw_id>/<agent_name>/img/stage_height_footer/01_desktop_full_layout.png",
    "/absolute/path/to/agents/<adw_id>/<agent_name>/img/stage_height_footer/02_desktop_stage_height_devtools.png",
    "... (all other screenshots)"
  ],
  "error": null
}
```

## Integration Notes
This test should be run:
- After any changes to App.jsx layout structure
- After modifications to kanban.css stage height properties
- After changes to global layout styles in index.css
- Before merging layout-related pull requests
- As part of the validation for issue #10 (stage height and footer positioning fix)
