# E2E Test: Database-Backed State Management (Issue #31)

**ADW ID**: 5e58ab68
**Feature**: Database-Backed ADW State Management System
**Test Date**: 2025-11-30
**Tester**: Automated E2E Test Suite

## Test Objectives

Validate that the database-backed state management system:
1. Successfully stores and retrieves ADW states
2. Maintains data consistency between database and JSON files
3. Provides real-time UI synchronization via WebSocket
4. Correctly handles issue number allocation
5. Properly detects and flags stuck workflows
6. Performs complete cleanup on deletion

## Pre-Test Setup

### Database Initialization
- ✅ Database schema created successfully
- ✅ 77 existing ADW states migrated from JSON
- ✅ Database health check passes
- ✅ All tables and triggers created

### Backend Services
- Start backend server: `cd server && uv run python server.py`
- Verify API endpoints are accessible
- Confirm WebSocket connection is active

### Frontend Application
- Start frontend: `bun run dev` (from worktree or use Bash(fesh))
- Navigate to http://localhost:{FRONTEND_PORT}
- Confirm Kanban board loads

## Test Cases

### Test 1: ADW Lifecycle with Database State

**Objective**: Verify end-to-end ADW creation, execution, and completion

**Steps**:
1. Open Kanban board in browser
2. Click "Create New Task" button
3. Enter task title: "Test Database State Management"
4. Select issue class: "feature"
5. Click "Create"
6. Verify task card appears in "Backlog" column
7. Click on task card to view details
8. Note the issue number (should be sequential, e.g., 78, 79, etc.)
9. Trigger a workflow (e.g., select "Plan + Build")
10. Monitor card status indicator:
    - Should show "In Progress" with blue pulse animation
    - Should NOT show "Action Required" badge initially
11. Wait for workflow to progress through stages:
    - Backlog → Plan → Build
12. Verify card moves between columns as stages change
13. Wait for workflow completion
14. Verify card shows:
    - Status: "Completed" with green indicator
    - No pulse animation
    - Current stage: "Ready to Merge" or "Completed"
15. Click "View Completed Tasks"
16. Verify task appears in completed tasks modal
17. View task activity history
18. Confirm activity logs show:
    - workflow_started event
    - stage_transition events (backlog → plan → build)
    - state_change events
    - Timestamps for all events

**Expected Results**:
- ✅ Task created with sequential issue number
- ✅ Status indicator reflects current state accurately
- ✅ Real-time updates visible in UI
- ✅ Task appears in completed tasks list
- ✅ Activity history is complete and accurate
- ✅ Database records match UI state

**Database Verification**:
```bash
cd server && python -c "
from core.database import get_db_manager
db = get_db_manager()

# Get the ADW by issue number
adw = db.execute_query('SELECT * FROM adw_states WHERE issue_number = 78')[0]
print(f'ADW ID: {adw[\"adw_id\"]}')
print(f'Status: {adw[\"status\"]}')
print(f'Stage: {adw[\"current_stage\"]}')
print(f'Completed: {adw[\"completed_at\"]}')

# Get activity logs
logs = db.execute_query('SELECT * FROM adw_activity_logs WHERE adw_id = ? ORDER BY timestamp', (adw['adw_id'],))
print(f'Activity Log Count: {len(logs)}')
"
```

---

### Test 2: Stuck Workflow Detection

**Objective**: Verify automatic detection of stuck/paused workflows

**Setup**:
1. Create a new ADW
2. Start a workflow
3. Manually pause/kill the workflow process (simulate stuck state)

**Steps**:
1. Open Kanban board
2. Create new task: "Test Stuck Detection"
3. Start a workflow (e.g., "Plan Only")
4. Wait for workflow to start executing
5. In terminal, find and kill the workflow process:
   ```bash
   # Find the Claude Code process for this ADW
   ps aux | grep "5e58ab68"
   # Kill it (replace PID)
   kill -9 <PID>
   ```
6. Wait 30+ minutes (or trigger stuck detection manually via API)
7. Verify card UI updates:
    - Status indicator shows yellow with warning icon
    - "Action Required" badge appears
    - Card remains in current stage
8. Click on card to view details
9. Check activity history
10. Verify last activity shows no recent updates (30+ min old)
11. Manually resolve stuck state:
    - Option A: Delete the stuck ADW
    - Option B: Restart workflow
12. Verify "Action Required" badge is removed

**API Trigger for Stuck Detection** (for faster testing):
```bash
curl -X POST http://localhost:9104/api/adws/<adw_id>/detect-stuck
```

**Expected Results**:
- ✅ Workflow flagged as stuck after 30 minutes of inactivity
- ✅ UI shows "Action Required" badge
- ✅ Status indicator changes to yellow with warning icon
- ✅ Activity log shows stuck_detected event
- ✅ Database `is_stuck` field set to 1

**Database Verification**:
```bash
cd server && python -c "
from core.database import get_db_manager
db = get_db_manager()

# Check stuck workflows
stuck = db.execute_query('SELECT adw_id, issue_title, is_stuck FROM adw_states WHERE is_stuck = 1')
print(f'Stuck workflows: {len(stuck)}')
for adw in stuck:
    print(f'  - {adw[\"adw_id\"]}: {adw[\"issue_title\"]}')
"
```

---

### Test 3: Real-time State Synchronization (Multi-Window)

**Objective**: Verify real-time synchronization across multiple browser windows

**Steps**:
1. Open Kanban board in two separate browser windows/tabs
   - Window 1: http://localhost:{PORT}
   - Window 2: http://localhost:{PORT}
2. In Window 1, create a new task: "Test Real-Time Sync"
3. Verify task appears in Window 2 immediately (via WebSocket)
4. In Window 1, start a workflow on the task
5. Verify status indicator updates in Window 2 in real-time
6. Monitor both windows as workflow progresses
7. Confirm stage transitions appear simultaneously in both windows
8. In Window 1, update task title or other field
9. Verify changes appear in Window 2
10. In Window 1, delete the task
11. Verify task is removed from Window 2 immediately

**Expected Results**:
- ✅ Task creation broadcasts to all connected clients
- ✅ Status updates appear in real-time
- ✅ Stage transitions synchronized across windows
- ✅ Deletion removes task from all windows
- ✅ No manual refresh required
- ✅ WebSocket events received and processed correctly

**WebSocket Events to Monitor** (in browser console):
```javascript
// Open browser console (F12) and run:
websocketService.addEventListener('message', (event) => {
  console.log('WebSocket event:', JSON.parse(event.data));
});
```

Expected event types:
- `adw_created`
- `adw_updated`
- `adw_deleted`
- `agent_summary_update`
- `workflow_phase_transition`

---

### Test 4: Issue Number Uniqueness and Sequential Allocation

**Objective**: Verify issue numbers are unique and sequential

**Steps**:
1. Open Kanban board
2. Rapidly create 5 tasks within 1 second:
   - Task 1: "Rapid Create Test 1"
   - Task 2: "Rapid Create Test 2"
   - Task 3: "Rapid Create Test 3"
   - Task 4: "Rapid Create Test 4"
   - Task 5: "Rapid Create Test 5"
3. Note the issue numbers assigned to each task
4. Verify all issue numbers are unique
5. Verify issue numbers are sequential (e.g., 80, 81, 82, 83, 84)
6. Delete 2 of the tasks (e.g., tasks with numbers 81 and 83)
7. Create 2 new tasks:
   - Task 6: "After Deletion Test 1"
   - Task 7: "After Deletion Test 2"
8. Verify new tasks get next sequential numbers (e.g., 85, 86)
9. Confirm deleted issue numbers are NOT reused

**Expected Results**:
- ✅ All 5 initial tasks get unique issue numbers
- ✅ Issue numbers are sequential
- ✅ No duplicate issue numbers
- ✅ After deletion, new tasks get next available numbers
- ✅ Deleted issue numbers are not reused
- ✅ No gaps in active issue number sequence (except for deleted)

**Database Verification**:
```bash
cd server && python -c "
from core.database import get_db_manager
db = get_db_manager()

# Check all issue numbers
issues = db.execute_query('SELECT issue_number, issue_title, deleted_at FROM issue_tracker ORDER BY issue_number')
print('Issue Number | Title | Deleted')
print('-' * 60)
for issue in issues[-10:]:  # Show last 10
    deleted = 'YES' if issue['deleted_at'] else 'NO'
    print(f'{issue[\"issue_number\"]:12} | {issue[\"issue_title\"][:30]:30} | {deleted}')
"
```

---

### Test 5: Complete Deletion Workflow

**Objective**: Verify complete cleanup when deleting an ADW

**Steps**:
1. Create a new ADW: "Test Complete Deletion"
2. Start a workflow to create worktree and agent directory
3. Wait for workflow to start (worktree and agents/{adw_id} created)
4. Note the ADW ID (e.g., `abc12345`)
5. Verify worktree exists: `ls trees/abc12345`
6. Verify agent directory exists: `ls agents/abc12345`
7. In Kanban UI, click delete button on the task card
8. Confirm deletion in modal dialog
9. Monitor deletion process:
    - Loading indicator should appear
    - Success notification should display
    - Card should be removed from board
10. Verify cleanup in filesystem:
    ```bash
    ls trees/abc12345  # Should return "No such file or directory"
    ls agents/abc12345  # Should return "No such file or directory"
    ```
11. Verify database state:
    ```bash
    cd server && python -c "
    from core.database import get_db_manager
    db = get_db_manager()

    # Check if ADW is soft-deleted
    adw = db.execute_query('SELECT deleted_at FROM adw_states WHERE adw_id = \"abc12345\"')
    print(f'ADW soft-deleted: {adw[0][\"deleted_at\"] is not None if adw else \"Not found\"}')

    # Check deletion audit log
    deletions = db.execute_query('SELECT * FROM adw_deletions WHERE adw_id = \"abc12345\"')
    if deletions:
        print(f'Worktree removed: {deletions[0][\"worktree_removed\"]}')
        print(f'Agents dir removed: {deletions[0][\"agents_dir_removed\"]}')
    "
    ```

**Expected Results**:
- ✅ Delete confirmation modal appears
- ✅ Worktree removed from filesystem
- ✅ Agent directory removed from filesystem
- ✅ Database record soft-deleted (deleted_at timestamp set)
- ✅ Deletion audit log created
- ✅ Task removed from UI
- ✅ WebSocket notification broadcasted

**Cleanup Verification**:
```bash
# Check for orphaned worktrees
git worktree list

# Check for orphaned agent directories
ls agents/ | wc -l
# Should match database count of non-deleted ADWs

# Database check
cd server && python -c "
from core.database import get_db_manager
db = get_db_manager()
active_count = db.execute_query('SELECT COUNT(*) as count FROM adw_states WHERE deleted_at IS NULL')[0]['count']
deleted_count = db.execute_query('SELECT COUNT(*) as count FROM adw_states WHERE deleted_at IS NOT NULL')[0]['count']
print(f'Active ADWs: {active_count}')
print(f'Deleted ADWs: {deleted_count}')
"
```

---

### Test 6: Database Migration from JSON (Backward Compatibility)

**Objective**: Verify existing JSON state files can be migrated to database

**This test was already executed during setup, but verification steps**:

1. Check migration was successful:
   ```bash
   cd server && python scripts/migrate_json_to_db.py --dry-run
   ```
2. Verify all existing ADWs appear in database
3. Compare JSON file data with database records:
   ```bash
   cd server && python -c "
   import json
   from pathlib import Path
   from core.database import get_db_manager

   # Pick a random ADW
   adw_id = 'ffbc9102'

   # Read JSON file
   json_path = Path(f'../agents/{adw_id}/adw_state.json')
   if json_path.exists():
       with open(json_path) as f:
           json_data = json.load(f)

   # Read database record
   db = get_db_manager()
   db_data = db.execute_query('SELECT * FROM adw_states WHERE adw_id = ?', (adw_id,))[0]

   # Compare
   print(f'JSON issue_number: {json_data.get(\"issue_number\")}')
   print(f'DB issue_number: {db_data[\"issue_number\"]}')
   print(f'Match: {json_data.get(\"issue_number\") == db_data[\"issue_number\"]}')
   "
   ```
4. Verify backward compatibility: JSON files still exist and readable
5. Confirm dual-write: New state changes update both JSON and database

**Expected Results**:
- ✅ All 77 ADWs successfully migrated
- ✅ Data matches between JSON and database
- ✅ No data loss during migration
- ✅ JSON files remain intact
- ✅ New state changes write to both JSON and database

---

## Post-Test Validation

### Database Integrity Checks
```bash
cd server && python -c "
from core.database import get_db_manager
db = get_db_manager()

# Foreign key integrity
print('Checking foreign key constraints...')
db.execute_query('PRAGMA foreign_key_check')

# Row counts
print('\\nRow counts:')
print(f'ADW States: {db.execute_query(\"SELECT COUNT(*) as count FROM adw_states\")[0][\"count\"]}')
print(f'Activity Logs: {db.execute_query(\"SELECT COUNT(*) as count FROM adw_activity_logs\")[0][\"count\"]}')
print(f'Issue Tracker: {db.execute_query(\"SELECT COUNT(*) as count FROM issue_tracker\")[0][\"count\"]}')
print(f'Deletions: {db.execute_query(\"SELECT COUNT(*) as count FROM adw_deletions\")[0][\"count\"]}')

# Health check
import json
print('\\nDatabase health:')
print(json.dumps(db.health_check(), indent=2))
"
```

### Validation Commands
```bash
# Backend tests
cd server && uv run pytest

# TypeScript compilation
bun tsc --noEmit

# Frontend build
bun run build

# Frontend tests
bun run test
```

## Test Summary

### Coverage
- [x] ADW lifecycle (create, execute, complete)
- [x] Stuck workflow detection
- [x] Real-time synchronization
- [x] Issue number allocation
- [x] Complete deletion workflow
- [x] Database migration from JSON
- [x] Backward compatibility
- [x] Activity logging
- [x] WebSocket events
- [x] Database integrity

### Success Criteria
- ✅ All database operations perform correctly
- ✅ UI reflects database state accurately
- ✅ Real-time updates work across multiple clients
- ✅ Issue numbers are unique and sequential
- ✅ Stuck detection flags workflows correctly
- ✅ Deletion removes all traces (worktree, agents, database)
- ✅ Migration preserves all existing data
- ✅ Backward compatibility maintained
- ✅ All validation commands pass
- ✅ Zero data corruption or loss

## Notes

- Database file location: `/Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/database/agentickanban.db`
- Schema file: `database/schema.sql`
- Migration script: `server/scripts/migrate_json_to_db.py`
- Database sync in ADW state module: `adws/adw_modules/state.py` (dual-write)
- Backend API endpoints: `server/api/adw_db.py`, `server/api/issue_tracker.py`
- Frontend service: `src/services/api/adwDbService.js`
- Status indicator component: `src/components/kanban/StatusIndicator.jsx`

## Recommendations

1. **Automated Testing**: Convert these manual E2E tests to automated Playwright tests
2. **Monitoring**: Add logging/monitoring for database operations in production
3. **Backup**: Implement automated database backups
4. **Performance**: Monitor query performance as ADW count grows beyond 1000
5. **Indexing**: Add additional indexes if specific queries become slow
6. **Archival**: Implement archival strategy for old/completed ADWs
