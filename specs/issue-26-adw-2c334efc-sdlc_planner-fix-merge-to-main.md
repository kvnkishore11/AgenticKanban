# Bug: Merge to Main Workflow Not Working - Task Disappears After Merge

## Metadata
issue_number: `26`
adw_id: `2c334efc`
issue_json: `{"number":26,"title":"this issue is not yet fixed","body":"this issue is not yet fixed. refer to one of teh agents/{adw_id}. we have recently done something. try to refer that and see where we went wrong. this is not yet fixed. \n\nUpon clicking merge to main, I have already mentioned what should happen in that adw_id.\n\n## Attached Images\n\n![image.png](blob:http://localhost:5173/d5a8ff9e-c943-4d64-a706-46d64363b911)\n\n"}`

## Bug Description
When a user clicks the "Merge to Main" button on a task in the "Ready to Merge" stage, the merge workflow executes successfully (merges branch to main, cleans up worktree, updates state), but the task disappears from the Kanban board UI. This occurs because:

1. The merge workflow (`triggerMergeWorkflow` in `src/stores/kanbanStore.js:1619`) attempts to move the task to a "completed" stage
2. The "completed" stage was removed from the Kanban board in commit `a464380` (issue #27)
3. When a task is moved to a non-existent stage, it disappears from the UI
4. Additionally, the "Ready to Merge" stage is missing proper visual styling (icon and teal color classes)

**Expected behavior:** Upon clicking "Merge to Main", the task should either:
- Stay in the "Ready to Merge" stage with a visual indicator showing it's been merged, OR
- Move to a "Completed" stage that displays merged tasks

**Actual behavior:** The task disappears from the board entirely after merge completes.

## Problem Statement
The merge to main workflow has a critical bug where successfully merged tasks vanish from the Kanban board because the code tries to move them to a "completed" stage that no longer exists. This creates a poor user experience where successful merges appear to fail.

## Solution Statement
Keep merged tasks visible in the "Ready to Merge" stage with metadata indicating merge completion. Update the task's visual appearance to show it's been merged (e.g., different styling, checkmark icon, "Merged" label). Also add missing visual styling for the "Ready to Merge" stage including the GitMerge icon and teal color classes.

This approach:
- Maintains visibility of merged work
- Avoids re-adding the "completed" stage (which was intentionally removed)
- Provides clear visual feedback that merge succeeded
- Keeps the Kanban board cleaner with 7 stages instead of 8

## Steps to Reproduce
1. Start the application with a task in "Ready to Merge" stage
2. Navigate to the Kanban board
3. Click the "Merge to Main" button on a task
4. Wait for merge to complete successfully
5. Observe that the task disappears from all stages on the board

## Root Cause Analysis
**Primary cause:** In `src/stores/kanbanStore.js:1619`, the `triggerMergeWorkflow` function calls `moveTaskToStage(taskId, 'completed')` after successful merge. However, commit `a464380` removed the "completed" stage from the stages array at line 86. When `moveTaskToStage` tries to move a task to a non-existent stage, the task's `stage` property is set to "completed" but no matching stage column exists in the UI, causing it to disappear.

**Secondary cause:** The "Ready to Merge" stage lacks proper visual styling in `src/components/kanban/KanbanBoard.jsx`. The `stageIcons` object (lines 16-24) doesn't include a GitMerge icon for 'ready-to-merge', and the color mapping functions (lines 27-53) don't include 'teal' color classes. This results in the stage displaying without an icon and with incorrect colors.

**Code locations:**
- `src/stores/kanbanStore.js:1619` - Moves task to non-existent "completed" stage
- `src/stores/kanbanStore.js:86` - Stages array missing "completed" stage (intentionally removed)
- `src/components/kanban/KanbanBoard.jsx:16-24` - Missing GitMerge icon in stageIcons
- `src/components/kanban/KanbanBoard.jsx:27-39` - Missing teal color in getStageColorClasses
- `src/components/kanban/KanbanBoard.jsx:42-53` - Missing teal color in getStageIconColorClasses

## Relevant Files
Use these files to fix the bug:

- `src/stores/kanbanStore.js` - Contains the `triggerMergeWorkflow` function that moves tasks to the "completed" stage. Need to change line 1619 to keep task in "ready-to-merge" stage and add metadata indicating merge completion.

- `src/components/kanban/KanbanCard.jsx` - Renders individual Kanban cards including the "Merge to Main" button. Need to add conditional rendering to show merged status (checkmark icon, "Merged" label, disabled button state) when task metadata indicates merge completed.

- `src/components/kanban/KanbanBoard.jsx` - Defines stage icons and color mappings. Need to:
  - Add `'ready-to-merge': GitMerge` to stageIcons object (around line 23)
  - Add `teal: 'border-teal-200 bg-teal-50'` to getStageColorClasses (around line 38)
  - Add `teal: 'text-teal-600'` to getStageIconColorClasses (around line 52)
  - Import GitMerge from 'lucide-react' (around line 5)

- `.claude/commands/test_e2e.md` - E2E test runner documentation for understanding how to create E2E tests

- `.claude/commands/e2e/test_basic_query.md` - Example E2E test file showing the expected structure and format

### New Files

#### `.claude/commands/e2e/test_merge_to_main.md`
New E2E test file that validates the merge to main workflow:
- Verifies "Merge to Main" button appears for tasks in "ready-to-merge" stage
- Clicks the merge button and verifies merge completes successfully
- Verifies task remains visible in "ready-to-merge" stage after merge
- Verifies task displays "Merged" status with checkmark icon
- Verifies "Merge to Main" button is disabled/hidden after merge
- Takes screenshots at each step to prove the bug is fixed

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix KanbanBoard Visual Styling for Ready to Merge Stage
- Add `GitMerge` to imports from 'lucide-react' in `src/components/kanban/KanbanBoard.jsx` (line 5)
- Add `'ready-to-merge': GitMerge` to the `stageIcons` object (after line 22)
- Add `teal: 'border-teal-200 bg-teal-50'` to the colorMap in `getStageColorClasses()` (after line 36)
- Add `teal: 'text-teal-600'` to the colorMap in `getStageIconColorClasses()` (after line 50)

### 2. Update Merge Workflow to Keep Tasks in Ready to Merge Stage
- In `src/stores/kanbanStore.js:1619`, change `get().moveTaskToStage(taskId, 'completed')` to keep the task in 'ready-to-merge' stage
- Instead of moving the stage, update task metadata to include:
  - `merge_completed: true`
  - `merge_completed_at: new Date().toISOString()`
  - `merged_branch: task.metadata?.branch_name` (preserve which branch was merged)
- Remove the stage move but keep the metadata update at lines 1622-1628

### 3. Update KanbanCard to Show Merged Status
- In `src/components/kanban/KanbanCard.jsx`, add conditional rendering after the "Merge to Main" button section
- Check if `task.metadata?.merge_completed === true`
- If merged, display:
  - A checkmark icon (using CheckCircle from lucide-react)
  - "Merged" label with timestamp
  - Gray out or hide the "Merge to Main" button (add condition to existing button: `&& !task.metadata?.merge_completed`)
  - Style the merged indicator with green colors: `text-green-600 bg-green-50`
- Position this indicator in the same area where the merge button appears

### 4. Create E2E Test File for Merge to Main Workflow
- Read `.claude/commands/e2e/test_basic_query.md` to understand E2E test file structure
- Read `.claude/commands/test_e2e.md` to understand how E2E tests are executed
- Create `.claude/commands/e2e/test_merge_to_main.md` with:
  - **User Story:** "As a user, I want to merge completed work to main so that changes are integrated into the main branch"
  - **Test Steps:**
    1. Navigate to the application URL
    2. Take screenshot of initial Kanban board state
    3. Verify a task exists in "Ready to Merge" stage
    4. Verify "Merge to Main" button is visible on the task
    5. Take screenshot of task with merge button
    6. Click "Merge to Main" button
    7. Wait for merge to complete (watch for loading state)
    8. Verify task still exists in "Ready to Merge" stage
    9. Verify "Merged" status indicator is displayed with checkmark
    10. Verify "Merge to Main" button is no longer clickable/visible
    11. Take screenshot of merged task with status indicator
    12. Verify task metadata shows `merge_completed: true`
  - **Success Criteria:**
    - Task remains visible after merge
    - Merged status is clearly indicated
    - Merge button is disabled after successful merge
    - 3 screenshots captured showing before/during/after states

### 5. Run Validation Commands
- Execute all validation commands listed below to ensure bug is fixed with zero regressions
- Run the new E2E test to validate the merge to main workflow works correctly
- Verify frontend builds successfully
- Verify TypeScript compilation succeeds

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `bun run dev` - Start the application and manually verify "Ready to Merge" stage displays with GitMerge icon and teal colors
- `grep -n "moveTaskToStage.*completed" src/stores/kanbanStore.js` - Verify the problematic line moving to "completed" stage no longer exists
- `grep -n "merge_completed" src/stores/kanbanStore.js` - Verify new merge_completed metadata flag is set
- `grep -n "GitMerge" src/components/kanban/KanbanBoard.jsx` - Verify GitMerge icon is imported and used
- `grep -n "teal:" src/components/kanban/KanbanBoard.jsx` - Verify teal color classes are added
- `grep -n "merge_completed" src/components/kanban/KanbanCard.jsx` - Verify merged status rendering is implemented
- `bun tsc --noEmit` - Run TypeScript compilation to validate no type errors
- `bun run build` - Run frontend build to validate the bug is fixed with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_merge_to_main.md` test file to validate this functionality works

## Notes
- The "completed" stage was intentionally removed in commit `a464380` as part of issue #27, so we should NOT re-add it
- Keeping tasks visible in "Ready to Merge" stage after merge provides better visibility and audit trail
- The merge_completed metadata flag allows us to distinguish between "ready to merge" and "already merged" states
- This fix maintains the cleaner 7-stage board layout while still showing merge status
- The backend merge workflow (`adws/adw_complete_iso.py`) and API endpoints (`server/api/merge.py`) are working correctly and don't need changes
- The issue reference to "agents/{adw_id}" in the bug description relates to previous implementation specs in `specs/issue-13-adw-12444360-sdlc_planner-add-merge-completion-workflow.md` and `specs/issue-22-adw-73156739-sdlc_planner-merge-worktree-slash-command.md`
