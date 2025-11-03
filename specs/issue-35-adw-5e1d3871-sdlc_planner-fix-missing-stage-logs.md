# Bug: Fix Missing Stage Logs for Test/Review/Document Stages

## Metadata
issue_number: `35`
adw_id: `5e1d3871`
issue_json: `{"number":35,"title":"with in each card","body":"with in each card. We are only able to see the logs coming till build stage. And after that we are not able to identify any logs of test/review/document etc. \n\nSo we are not able to understand if something is happening or not for any other stage except plan and build\ntry to fix this issue."}`

## Bug Description
Users are unable to see logs for stages after the build stage (test, review, document) in the Kanban card's stage logs viewer. While logs are visible for the "Plan" and "Build" stages, clicking on the "Test", "Review", or "Document" tabs shows empty states even when log files exist in the corresponding agent folders. This prevents users from understanding the progress and status of these later stages in the workflow.

## Problem Statement
The `isEmpty` condition in `StageLogsViewer.jsx` incorrectly determines whether to show logs for stage-specific tabs. It checks flags (`hasStreamingLogs` and `hasResult`) instead of checking if actual log entries exist in the logs array. When a stage has logs but these flags are not properly set, the component shows an empty state instead of displaying the available logs.

## Solution Statement
Fix the `isEmpty` logic in `StageLogsViewer.jsx` to check the actual logs array length instead of relying solely on flags. This will ensure that logs are displayed whenever they exist, regardless of the flag states. Additionally, verify that the backend API correctly sets the `hasStreamingLogs` and `hasResult` flags for test, review, and document stages.

## Steps to Reproduce
1. Start the application and navigate to the Kanban board
2. Create or select a task that has completed multiple stages (including test, review, or document)
3. Click on the task card to expand it
4. Click "Show Logs" to display the stage logs viewer
5. Click on the "Test", "Review", or "Document" tabs
6. **Observe**: Empty state is shown with "No logs found for [Stage] stage" message
7. **Expected**: Logs should be displayed if they exist in the agents/{adw_id}/[stage_folder] directory

## Root Cause Analysis
The root cause is in `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e1d3871/src/components/kanban/StageLogsViewer.jsx:151-154`:

```javascript
const isEmpty = activeTab !== 'all' &&
  !stageData?.loading &&
  !stageData?.hasStreamingLogs &&
  !stageData?.hasResult;
```

This logic marks a stage as empty when both `hasStreamingLogs` and `hasResult` are false. However, this doesn't account for the actual presence of logs in the `stageData.logs` array. Even if logs exist, they won't be displayed if these flags are false.

Additionally, the condition at line 236 prevents rendering logs when `isEmpty` is true:
```javascript
{!isLoading && !hasError && (activeTab === 'all' || !isEmpty) && (
```

This means even if logs are fetched and available in `stageData.logs`, they won't be rendered if `isEmpty` evaluates to true.

## Relevant Files
Use these files to fix the bug:

- `src/components/kanban/StageLogsViewer.jsx` - Contains the faulty `isEmpty` logic that needs to be fixed (lines 151-154). This component is responsible for displaying stage-specific logs in tabs.

- `src/stores/kanbanStore.js` - Contains the `fetchStageLogsForTask` and `getStageLogsForTask` functions that manage stage log state. Need to verify the data structure and ensure logs are properly stored.

- `server/api/stage_logs.py` - Backend API that fetches logs from agent folders. Need to verify that it correctly identifies and parses log files for test/review/document stages (lines 20-26 contain the `STAGE_TO_FOLDERS` mapping).

- `src/components/kanban/KanbanCard.jsx` - Parent component that renders `StageLogsViewer`. May need to verify that `adwId` is properly passed to the viewer.

- `.claude/commands/conditional_docs.md` - Read to check if additional documentation is required for this task.

### New Files
- `.claude/commands/e2e/test_missing_stage_logs.md` - E2E test file to validate that logs are visible for all stages (plan, build, test, review, document) when they exist in the agent folders.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Read conditional documentation
- Read `.claude/commands/conditional_docs.md` to check if any additional documentation is required for this bug fix

### Analyze the current isEmpty logic
- Examine `src/components/kanban/StageLogsViewer.jsx` lines 151-154 to understand the current `isEmpty` condition
- Examine line 236 to understand how `isEmpty` affects rendering
- Examine the `getLogsToDisplay()` function (lines 121-131) to understand how logs are prepared for display
- Examine the `formatStageLogsForViewer()` function (lines 106-118) to understand how stage data is converted to log entries

### Fix the isEmpty condition
- Modify the `isEmpty` logic in `src/components/kanban/StageLogsViewer.jsx` to check if actual logs exist instead of relying solely on flags
- Change the condition from checking `hasStreamingLogs` and `hasResult` flags to checking the length of the formatted logs array
- Ensure the fix handles all edge cases: loading state, error state, no data fetched, and data fetched with empty logs

### Verify backend API response
- Review `server/api/stage_logs.py` to ensure the `STAGE_TO_FOLDERS` mapping includes correct folder patterns for test, review, and document stages
- Verify the `find_stage_folder()` function correctly handles pattern-based folders (e.g., `test_runner_*`, `e2e_test_runner_*`, `in_loop_review_*`)
- Verify that `parse_jsonl_logs()` correctly parses log files from all stages
- Verify that the response correctly sets `has_streaming_logs` and `has_result` flags

### Test with actual agent data
- Manually test with a real ADW that has completed multiple stages
- Click through each tab (Plan, Build, Test, Review, Document) and verify logs are displayed
- Verify that the loading spinner appears while fetching
- Verify that empty states appear only when logs truly don't exist

### Create E2E test file
- Read `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_stage_logs_tabs.md` to understand the E2E test format
- Create a new E2E test file `.claude/commands/e2e/test_missing_stage_logs.md` that:
  - Validates logs are visible for all stages (plan, build, test, review, document) when they exist
  - Clicks through each stage tab and verifies logs are displayed
  - Takes screenshots proving logs are visible for test/review/document stages
  - Validates that the empty state only appears when no logs exist

### Run validation commands
- Execute all commands listed in the `Validation Commands` section below to ensure the bug is fixed with zero regressions

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute your new `.claude/commands/e2e/test_missing_stage_logs.md` test file to validate that logs are visible for all stages
- `cd server && uv run pytest` - Run server tests to validate the bug is fixed with zero regressions
- `bun tsc --noEmit` - Run frontend type checking to validate the bug is fixed with zero regressions
- `bun run build` - Run frontend build to validate the bug is fixed with zero regressions

## Notes
- The backend API (`server/api/stage_logs.py`) already has the correct folder mappings for test, review, and document stages (lines 20-26)
- The issue is purely a frontend rendering logic problem in `StageLogsViewer.jsx`
- The fix should be minimal - only changing the `isEmpty` condition to check the actual logs array
- Ensure backward compatibility with the "All Logs" tab which uses real-time logs
- The `hasStreamingLogs` and `hasResult` flags can still be used for informational purposes (e.g., showing badges) but should not be used to determine if logs should be rendered
- When testing, use an ADW that has already completed multiple stages so that log files exist in the agent folders (e.g., check `agents/{adw_id}/test_runner/`, `agents/{adw_id}/reviewer/`, `agents/{adw_id}/documenter/` for `raw_output.jsonl` files)
