# Merge to Main Workflow Fix

**ADW ID:** 2c334efc
**Date:** 2025-11-03
**Specification:** specs/issue-26-adw-2c334efc-sdlc_planner-fix-merge-to-main.md

## Overview

Fixed a critical bug where tasks would disappear from the Kanban board after clicking "Merge to Main". The fix ensures merged tasks remain visible in the "Ready to Merge" stage with clear visual indicators showing merge completion status, rather than moving them to a non-existent "completed" stage.

## What Was Built

- Modified merge workflow to keep tasks in "Ready to Merge" stage after merge completion
- Added merge completion metadata tracking (`merge_completed`, `merge_completed_at`, `merged_branch`)
- Implemented visual merged status indicator with checkmark icon and timestamp
- Added missing GitMerge icon and teal color styling for "Ready to Merge" stage
- Created E2E test for merge workflow validation

## Technical Implementation

### Files Modified

- `src/stores/kanbanStore.js`: Updated `triggerMergeWorkflow` to add merge completion metadata instead of moving task to non-existent "completed" stage
- `src/components/kanban/KanbanCard.jsx`: Added conditional rendering for merged status indicator with CheckCircle icon and timestamp
- `src/components/kanban/KanbanBoard.jsx`: Added GitMerge icon import and teal color classes for "Ready to Merge" stage styling
- `.claude/commands/e2e/test_merge_to_main.md`: Created new E2E test file for merge workflow validation
- `requirements.txt`: Updated MCP server dependencies
- `.mcp.json` and `playwright-mcp-config.json`: Updated configuration paths

### Key Changes

- **Removed problematic stage move**: Changed from `moveTaskToStage(taskId, 'completed')` to keeping task in 'ready-to-merge' stage (src/stores/kanbanStore.js:1618-1627)
- **Added merge metadata**: Tasks now store `merge_completed: true`, `merge_completed_at` timestamp, and `merged_branch` name when merge completes
- **Visual merge indicator**: Merged tasks display a green badge with CheckCircle icon, "Merged" label, and time-ago timestamp (src/components/kanban/KanbanCard.jsx:651-663)
- **Hide merge button after merge**: "Merge to Main" button is conditionally hidden when `task.metadata?.merge_completed` is true (src/components/kanban/KanbanCard.jsx:639)
- **Stage styling fix**: Added GitMerge icon and teal color classes (border-teal-200, bg-teal-50, text-teal-600) for proper "Ready to Merge" stage appearance

## How to Use

1. Move a task to the "Ready to Merge" stage
2. Click the "Merge to Main" button on the task card
3. Wait for the merge workflow to complete
4. The task remains in "Ready to Merge" stage with a green "Merged" badge
5. The badge shows when the merge was completed using a time-ago format
6. The "Merge to Main" button is hidden after successful merge

## Configuration

No additional configuration required. The fix works with the existing 7-stage Kanban board layout:
- backlog
- todo
- plan
- implement
- review
- document
- ready-to-merge

The "completed" stage remains removed (as per issue #27) to maintain a cleaner board layout.

## Testing

### Manual Testing
1. Start the application: `bun run dev`
2. Navigate to a task in "Ready to Merge" stage
3. Verify GitMerge icon and teal colors display correctly
4. Click "Merge to Main" button
5. Verify task stays visible with green "Merged" badge
6. Verify "Merge to Main" button disappears

### E2E Testing
Run the automated E2E test: Read `.claude/commands/test_e2e.md`, then execute `.claude/commands/e2e/test_merge_to_main.md`

### Validation Commands
```bash
# Verify no more moves to "completed" stage
grep -n "moveTaskToStage.*completed" src/stores/kanbanStore.js

# Verify merge_completed metadata is set
grep -n "merge_completed" src/stores/kanbanStore.js

# Verify GitMerge icon is imported and used
grep -n "GitMerge" src/components/kanban/KanbanBoard.jsx

# Verify teal color classes are added
grep -n "teal:" src/components/kanban/KanbanBoard.jsx

# Verify merged status rendering is implemented
grep -n "merge_completed" src/components/kanban/KanbanCard.jsx

# Build validation
bun tsc --noEmit
bun run build
```

## Notes

- The "completed" stage was intentionally removed in commit `a464380` (issue #27) and should not be re-added
- Keeping merged tasks visible in "Ready to Merge" provides better visibility and audit trail
- The `merge_completed` metadata flag allows distinguishing between "ready to merge" and "already merged" states
- Backend merge workflow (`adws/adw_complete_iso.py`) and API endpoints (`server/api/merge.py`) were already working correctly and did not require changes
- This fix maintains the cleaner 7-stage board layout while still showing merge status
- Related specifications: issue-13-adw-12444360 (merge completion workflow) and issue-22-adw-73156739 (merge worktree slash command)
