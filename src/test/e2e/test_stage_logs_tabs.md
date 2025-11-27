# E2E Test: Stage Logs Tabs

Test the tabbed interface for viewing stage-specific logs in ADW workflow cards.

## User Story

As a user viewing an ADW workflow
I want to see logs for each specific stage (Plan, Build, Test, Review, Document) in separate tabs
So that I can quickly navigate to and inspect the details of any particular stage without scrolling through all combined logs

## Prerequisites

- Application is running on the configured port
- At least one task exists with an ADW workflow that has completed multiple stages
- The task should have an `adw_id` in its metadata
- Backend API is accessible and serving stage logs

## Test Steps

### 1. Initial Setup
1. Navigate to the `Application URL` (Kanban board)
2. Take a screenshot of the initial kanban board state
3. **Verify** the kanban board is visible with stages: Backlog, Plan, Build, Test, Review, Document, PR, Errored

### 2. Locate a Task with ADW Workflow
4. Identify a task card that has workflow logs (indicated by the presence of log viewer)
5. **Verify** the task has an `adw_id` in its metadata (visible in the ADW ID section when expanded)
6. Take a screenshot of the task card

### 3. Open Log Viewer
7. Click on the task card to expand it (if not already expanded)
8. **Verify** the log viewer section is visible
9. Take a screenshot of the expanded card with log viewer

### 4. Verify Tabbed Interface
10. **Verify** the following tabs are visible in the log viewer:
    - "All Logs" tab
    - "Plan" tab
    - "Build" tab
    - "Test" tab
    - "Review" tab
    - "Document" tab
11. **Verify** the "All Logs" tab is selected by default (highlighted)
12. Take a screenshot of the tabs

### 5. Test "All Logs" Tab
13. **Verify** the "All Logs" tab shows real-time logs
14. **Verify** there is a "Real-time" badge visible
15. **Verify** logs are displayed (if workflow has run)
16. Take a screenshot of the All Logs view

### 6. Test "Plan" Tab
17. Click on the "Plan" tab
18. **Verify** the tab becomes active (highlighted)
19. Wait for stage logs to load (loading spinner should appear and disappear)
20. **Verify** either:
    - Plan logs are displayed with a "Historical" badge, OR
    - An empty state message appears saying "No logs found for Plan stage"
21. Take a screenshot of the Plan tab

### 7. Test "Build" Tab
22. Click on the "Build" tab
23. **Verify** the tab becomes active
24. Wait for stage logs to load
25. **Verify** Build logs are displayed or empty state is shown
26. If logs exist, **verify** the "Historical" badge is visible
27. Take a screenshot of the Build tab

### 8. Test "Test" Tab
28. Click on the "Test" tab
29. **Verify** the tab becomes active
30. Wait for stage logs to load
31. **Verify** Test logs are displayed or empty state is shown
32. Take a screenshot of the Test tab

### 9. Test "Review" Tab
33. Click on the "Review" tab
34. **Verify** the tab becomes active
35. Wait for stage logs to load
36. **Verify** Review logs are displayed or empty state is shown
37. Take a screenshot of the Review tab

### 10. Test "Document" Tab
38. Click on the "Document" tab
39. **Verify** the tab becomes active
40. Wait for stage logs to load
41. **Verify** Document logs are displayed or empty state is shown
42. Take a screenshot of the Document tab

### 11. Verify Stage Result Data (if available)
43. For any stage tab with logs, check if "Stage Result Data" section is present at the bottom
44. If present, click to expand the result data
45. **Verify** JSON formatted result data is displayed
46. Take a screenshot of the expanded result data

### 12. Test Log Filtering and Search
47. Switch back to "All Logs" tab
48. **Verify** filter controls are present:
    - Level filter dropdown (All Levels, Info, Success, Warning, Error)
    - Search input box
49. Enter a search term in the search box
50. **Verify** logs are filtered based on search
51. Clear search and select "ERROR" from level filter
52. **Verify** only error logs are displayed
53. Take a screenshot of filtered logs

### 13. Test Log Export
54. **Verify** the download/export button is visible
55. Click the export button
56. **Verify** a log file is downloaded
57. **Verify** the filename contains "workflow-logs" and a timestamp

### 14. Test Auto-scroll Toggle
58. **Verify** auto-scroll toggle button is visible
59. Click to toggle auto-scroll off
60. **Verify** button state changes to indicate auto-scroll is disabled
61. Click to toggle auto-scroll back on

### 15. Test Clear Logs (All Logs Tab Only)
62. Ensure "All Logs" tab is active
63. **Verify** clear logs button (trash icon) is visible
64. Click the clear logs button
65. **Verify** logs are cleared from the "All Logs" view
66. **Verify** stage-specific tabs still retain their logs

### 16. Test Tab Switching Performance
67. Rapidly switch between tabs (Plan → Build → Test → Review → Document)
68. **Verify** each tab loads without errors
69. **Verify** loading indicators appear when fetching new stage data
70. **Verify** previously loaded stages show cached data immediately

### 17. Test Error Handling
71. If any stage returns an error (e.g., stage not found):
    - **Verify** error message is displayed clearly
    - **Verify** "Retry" button is available
    - Click retry button and verify request is retried

### 18. Test Keyboard Navigation (Optional)
72. Use Tab key to navigate to the tab bar
73. Use Arrow keys (← →) to switch between tabs
74. **Verify** keyboard navigation works correctly

## Success Criteria

- ✅ All 6 tabs (All, Plan, Build, Test, Review, Document) are visible
- ✅ Clicking on each tab displays the corresponding logs or empty state
- ✅ "All Logs" tab shows real-time logs with "Real-time" badge
- ✅ Stage-specific tabs show historical logs with "Historical" badge
- ✅ Empty states are displayed correctly for stages with no logs
- ✅ Loading indicators appear while fetching stage logs
- ✅ Error states are handled gracefully with retry option
- ✅ Log filtering and search work correctly
- ✅ Export functionality works
- ✅ Auto-scroll toggle functions properly
- ✅ Clear logs only affects "All Logs" tab
- ✅ Stage result data can be expanded and viewed
- ✅ Tab switching is smooth with proper caching
- ✅ At least 10 screenshots are taken documenting the test

## Notes

- If testing with a fresh task without completed stages, most stage tabs will show empty states
- To test with real data, use a task from a completed ADW workflow (check agents/{adw_id} directory for stage folders)
- The test should gracefully handle both scenarios: tasks with logs and tasks without logs
- Backend API must be running for stage logs to load correctly

## Expected Backend API Calls

When switching to a stage tab, verify the following API call is made:
```
GET /api/stage-logs/{adw_id}/{stage}
```

Expected response format:
```json
{
  "adw_id": "12345678",
  "stage": "plan",
  "logs": [...],
  "result": {...},
  "stage_folder": "sdlc_planner",
  "has_streaming_logs": true,
  "has_result": true,
  "error": null
}
```

## Cleanup

- No cleanup required
- Test data (task cards) can be deleted manually if desired
