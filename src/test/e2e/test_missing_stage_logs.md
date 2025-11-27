# E2E Test: Missing Stage Logs Bug Fix

Test that stage logs are visible for Test/Review/Document stages when log files exist in agent folders.

## User Story

As a user viewing an ADW workflow
I want to see logs for Test, Review, and Document stages when they exist
So that I can understand the progress and status of these later stages in the workflow

## Prerequisites

- Application is running on the configured port
- At least one task exists with an ADW workflow that has completed test, review, or document stages
- The task should have an `adw_id` in its metadata
- Backend API is accessible and serving stage logs
- Log files exist in agents/{adw_id}/[test|review|document]/ directories

## Test Steps

### 1. Initial Setup
1. Navigate to the `Application URL` (Kanban board)
2. Take a screenshot of the initial kanban board state
3. **Verify** the kanban board is visible with all stages

### 2. Locate a Task with Completed Stages
4. Identify a task card that has completed multiple stages (check for tasks in Test, Review, or Document stages)
5. Note the `adw_id` from the task metadata
6. **Verify** the task has log files in agents/{adw_id}/ subdirectories
7. Take a screenshot of the task card

### 3. Open Log Viewer
8. Click on the task card to expand it
9. Click "Show Logs" to display the stage logs viewer
10. **Verify** the tabbed log viewer is visible
11. Take a screenshot of the expanded log viewer

### 4. Verify "All Logs" Tab
12. **Verify** the "All Logs" tab is selected by default
13. **Verify** logs are displayed (if workflow has run)
14. Take a screenshot of the All Logs tab

### 5. Test "Plan" Tab
15. Click on the "Plan" tab
16. **Verify** the tab becomes active (highlighted with blue border)
17. Wait for stage logs to load (loading spinner should appear and disappear)
18. **Verify** either:
    - Plan logs are displayed, OR
    - An empty state message appears saying "No logs found for Plan stage" (only if no logs exist)
19. Take a screenshot of the Plan tab

### 6. Test "Build" Tab
20. Click on the "Build" tab
21. **Verify** the tab becomes active
22. Wait for stage logs to load
23. **Verify** Build logs are displayed or empty state is shown (only if no logs exist)
24. Take a screenshot of the Build tab

### 7. Test "Test" Tab (Critical for Bug Fix)
25. Click on the "Test" tab
26. **Verify** the tab becomes active
27. Wait for stage logs to load (loading spinner should appear briefly)
28. **CRITICAL VERIFY**: If log files exist in agents/{adw_id}/tester/ or agents/{adw_id}/e2e_test_runner_*/, logs MUST be displayed
29. **CRITICAL VERIFY**: Empty state should ONLY appear if no log files actually exist
30. **Verify** log entries are visible with timestamps and messages
31. Take a screenshot of the Test tab showing logs (if they exist)

### 8. Test "Review" Tab (Critical for Bug Fix)
32. Click on the "Review" tab
33. **Verify** the tab becomes active
34. Wait for stage logs to load
35. **CRITICAL VERIFY**: If log files exist in agents/{adw_id}/reviewer/ or agents/{adw_id}/in_loop_review_*/, logs MUST be displayed
36. **CRITICAL VERIFY**: Empty state should ONLY appear if no log files actually exist
37. **Verify** log entries are visible with timestamps and messages
38. Take a screenshot of the Review tab showing logs (if they exist)

### 9. Test "Document" Tab (Critical for Bug Fix)
39. Click on the "Document" tab
40. **Verify** the tab becomes active
41. Wait for stage logs to load
42. **CRITICAL VERIFY**: If log files exist in agents/{adw_id}/documenter/ or agents/{adw_id}/ops/, logs MUST be displayed
43. **CRITICAL VERIFY**: Empty state should ONLY appear if no log files actually exist
44. **Verify** log entries are visible with timestamps and messages
45. Take a screenshot of the Document tab showing logs (if they exist)

### 10. Verify Stage Folder Information
46. For any stage tab that has logs, **verify** the stage folder path is displayed at the bottom
47. **Verify** the folder path matches the actual folder in agents/{adw_id}/
48. Take a screenshot showing the stage folder information

### 11. Verify isEmpty Logic
49. Switch between tabs multiple times (Plan → Build → Test → Review → Document)
50. **Verify** that tabs with actual log data never show the empty state incorrectly
51. **Verify** that the isEmpty condition is based on actual logs array length, not just flags
52. **Verify** loading spinner appears during initial fetch for each new tab

### 12. Test Tab Persistence
53. Click on the "Test" tab and wait for logs to load
54. Switch to "All Logs" tab
55. Switch back to "Test" tab
56. **Verify** logs are shown immediately without re-fetching (cached data)
57. Take a screenshot showing cached logs

### 13. Verify Backend API Response
58. Open browser developer console (F12)
59. Navigate to Network tab
60. Click on any stage tab (e.g., "Review")
61. **Verify** API request to `/api/stage-logs/{adw_id}/{stage}` is made
62. **Verify** response contains `logs` array with entries (if logs exist)
63. **Verify** response contains `has_streaming_logs` and `has_result` flags
64. Take a screenshot of the network request and response

### 14. Test Error Handling
65. If any stage returns an error:
    - **Verify** error message is displayed clearly
    - **Verify** "Retry" button is available
    - Click retry button and verify request is retried
66. Take a screenshot of error state (if encountered)

## Success Criteria

- ✅ Test tab shows logs when log files exist in agents/{adw_id}/tester/ or test_runner folders
- ✅ Review tab shows logs when log files exist in agents/{adw_id}/reviewer/ or review folders
- ✅ Document tab shows logs when log files exist in agents/{adw_id}/documenter/ or ops folders
- ✅ Empty state is ONLY shown when logs array is truly empty (no log files exist)
- ✅ isEmpty condition checks actual logs array length, not just hasStreamingLogs/hasResult flags
- ✅ Loading indicators appear while fetching stage logs
- ✅ Stage folder information is displayed correctly
- ✅ Tab switching is smooth with proper caching
- ✅ Backend API returns logs array with entries when log files exist
- ✅ At least 10 screenshots are taken documenting the test

## Critical Bug Fix Validation

This test specifically validates the fix for issue #35:

**Before Fix**: The isEmpty condition checked `hasStreamingLogs` and `hasResult` flags. Even if logs existed in the array, they wouldn't be displayed if these flags were false.

**After Fix**: The isEmpty condition checks the actual `logs` array length. Logs are displayed whenever they exist, regardless of the flag states.

**Validation Points**:
1. Logs for Test/Review/Document stages are visible when log files exist
2. The isEmpty logic is based on `(!stageData?.logs || stageData.logs.length === 0)` not on flags
3. Empty state only appears when the logs array is truly empty

## Notes

- To test with real data, use a task from a completed ADW workflow
- Check agents/{adw_id}/ directory for stage folders (tester/, reviewer/, documenter/, etc.)
- Look for `raw_output.jsonl` files in stage folders - these contain the logs
- The test should gracefully handle both scenarios: stages with logs and stages without logs
- Backend API must be running for stage logs to load correctly

## Expected Backend API Response

When clicking on a stage tab, verify the API response includes:

```json
{
  "adw_id": "5e1d3871",
  "stage": "test",
  "logs": [
    {
      "timestamp": "2024-01-01T10:00:00Z",
      "level": "INFO",
      "message": "Test log message",
      "current_step": "running_tests",
      "details": null,
      "raw_data": {...}
    }
  ],
  "result": null,
  "stage_folder": "tester",
  "has_streaming_logs": true,
  "has_result": false,
  "error": null
}
```

If logs exist, the `logs` array should contain entries, and the component should display them regardless of the `has_streaming_logs` or `has_result` flag values.

## Cleanup

- No cleanup required
- Test data (task cards) can be kept for future testing
