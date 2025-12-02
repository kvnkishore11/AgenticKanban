# Patch: Fix Duplicate Issue Numbers in Database

## Metadata
adw_id: `31`
review_change_request: `Issue #1: Database contains duplicate issue numbers - only 42 unique issue numbers exist across 76 total ADW records, meaning 34 records have duplicate issue IDs. The spec explicitly requires 'Sequential issue numbering with uniqueness guarantees to prevent duplicate IDs' (line 3 of Problem Statement). This violates acceptance criteria #2: 'Sequential issue numbers are allocated with uniqueness guarantees (no duplicates)'. Resolution: Implement proper UNIQUE constraint enforcement on issue_tracker.issue_number column. Add database migration to deduplicate existing records by reassigning sequential numbers. Update issue allocation logic in issue_tracker.py to use database transactions with SELECT FOR UPDATE or use SQLite's AUTOINCREMENT on issue_number field. Add validation in adw_db.py to reject ADW creation if issue_number conflicts exist. Severity: blocker`

## Issue Summary
**Original Spec:** specs/issue-31-adw-5e58ab68-sdlc_planner-database-state-management.md
**Issue:** Database contains 34 duplicate issue numbers (42 unique across 76 total records), violating the uniqueness requirement in acceptance criteria #2
**Solution:** Enforce UNIQUE constraint on issue_tracker.issue_number, deduplicate existing records, and use database transactions with row-level locking to prevent race conditions during issue allocation

## Files to Modify
- `database/schema.sql` - Already has UNIQUE constraint on issue_number (line 99)
- `server/api/issue_tracker.py` - Update allocation logic to use transactions with SELECT FOR UPDATE
- `server/api/adw_db.py` - Add validation to prevent ADW creation with duplicate issue_numbers
- `server/core/database.py` - Add deduplication migration utility

## Implementation Steps
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create database migration to deduplicate existing records
- Create migration utility in `server/core/database.py` to scan for duplicate issue_numbers
- For each duplicate set, reassign sequential numbers starting from MAX(issue_number) + 1
- Update corresponding adw_states.issue_number to match the new issue_tracker.issue_number
- Log all reassignments for audit trail
- Verify UNIQUE constraint on issue_tracker.issue_number is enforced after deduplication

### Step 2: Update issue allocation logic with transaction and row-level locking
- Modify `allocate_issue_number()` in `server/api/issue_tracker.py` line 23-76
- Replace `execute_query()` + `execute_insert()` pattern with single `transaction()` context manager
- Use `SELECT MAX(issue_number) FROM issue_tracker FOR UPDATE` to acquire row-level lock
- Calculate next_number = MAX + 1 within transaction
- Insert new issue_tracker record with calculated next_number
- Catch unique constraint violations and retry allocation (max 3 retries)
- Add error logging for constraint violations

### Step 3: Add validation in ADW creation to prevent duplicate issue_numbers
- Modify `create_adw()` in `server/api/adw_db.py` line 83-186
- Before inserting ADW state, validate that issue_number doesn't exist in issue_tracker
- If issue_number is provided and already exists, return 409 Conflict error
- If issue_number is None, call issue allocation API to get sequential number
- Add database-level foreign key constraint check between adw_states.issue_number and issue_tracker.issue_number

### Step 4: Create/Update Tests
- Create backend test: `server/tests/test_issue_tracker_deduplication.py`
  - Test deduplication migration with sample duplicate data
  - Test concurrent issue allocation (simulate race conditions)
  - Test unique constraint enforcement
  - Test retry logic on constraint violations
- Update existing test: `server/tests/test_adw_db_api.py`
  - Add test case for duplicate issue_number rejection on ADW creation
  - Test foreign key constraint validation between adw_states and issue_tracker
- Create integration test: `server/tests/integration/test_concurrent_issue_allocation.py`
  - Simulate 10 concurrent ADW creations
  - Verify all get unique sequential issue numbers
  - Verify no duplicates in database after concurrent operations

## Validation
Execute every command to validate the patch is complete with zero regressions.

1. Run deduplication migration:
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e58ab68 && uv run python -c "from server.core.database import get_db_manager; db = get_db_manager(); db.deduplicate_issue_numbers()"
   ```

2. Verify no duplicates exist:
   ```bash
   sqlite3 /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/database/agentickanban.db "SELECT issue_number, COUNT(*) as cnt FROM issue_tracker GROUP BY issue_number HAVING cnt > 1"
   ```
   Expected: Empty result (no duplicates)

3. Verify unique constraint is enforced:
   ```bash
   sqlite3 /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/database/agentickanban.db "SELECT sql FROM sqlite_master WHERE type='table' AND name='issue_tracker'" | grep UNIQUE
   ```
   Expected: Should show "issue_number INTEGER NOT NULL UNIQUE"

4. Run backend tests:
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e58ab68 && uv run pytest server/tests/test_issue_tracker_deduplication.py -v
   ```

5. Run ADW DB API tests:
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e58ab68 && uv run pytest server/tests/test_adw_db_api.py -v
   ```

6. Run concurrent allocation integration test:
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e58ab68 && uv run pytest server/tests/integration/test_concurrent_issue_allocation.py -v
   ```

7. Run all backend tests:
   ```bash
   cd /Users/kvnkishore/WebstormProjects/AKApp/AgenticKanban/trees/5e58ab68 && uv run pytest adws/adw_tests/ -v --tb=short
   ```

8. Verify issue allocation API works correctly:
   ```bash
   curl -X POST http://localhost:8001/api/issues/allocate -H "Content-Type: application/json" -d '{"issue_title":"Test Issue","project_id":"default"}' | jq
   ```
   Expected: Returns unique sequential issue_number

## Patch Scope
**Lines of code to change:** ~150 lines
**Risk level:** medium
**Testing required:** Unit tests for deduplication, concurrent allocation, constraint enforcement; integration test for race conditions; manual validation of database state
