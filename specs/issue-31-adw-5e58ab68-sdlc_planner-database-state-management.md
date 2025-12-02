# Feature: Database-Backed ADW State Management System

## Metadata

issue_number: `31`
adw_id: `5e58ab68`
issue_json: `{"number":31,"title":"I want to manage my adws through a database - loca...","body":"I want to manage my adws through a database - local (research which can be better option and go ahead in implementing). I want the adws on the ui to be perfectly relecting their states like plan, build, completed , ready to merge, review, document, Errored.. Lets say for some reason you feel that it got paused or stuck for some reason, ensure if the backlogs also are in same state then you need to show some indication like action required here on the card some where. all the complted should be presnet in completed window.. technically I should see every card of the project either in visual kanba here at teh stages or to be completed or to be errored out.. this is the idea.. If i click on delete → its permannently gone inclding worktree an dalso the agents/{adw_id}. ULTRA THINK how to implement this.. But do it i the best possible way..Ideally we dont have a central issue tracker too, this should have great issue tracking numbres can be sequential though.. like how we are doing.. basically it should be tracked and i dont want same issue id for same cards… we can also may be just track if the card is delted or errored out etc i want everyactivity to be recorded..pleae do through testing once you are done…"}`

## Feature Description

This feature implements a comprehensive database-backed state management system for ADW (AI Developer Workflow) instances. Currently, ADW state is managed through JSON files in `agents/{adw_id}/adw_state.json`, which has limitations for querying, indexing, tracking history, and ensuring data consistency. The new system will use SQLite as a local database to provide:

1. **Centralized State Management**: Single source of truth for all ADW states across the application
2. **Real-time UI Synchronization**: Cards on the Kanban board perfectly reflect their actual states (plan, build, test, review, document, ready-to-merge, errored, completed)
3. **Activity Tracking**: Complete audit trail of every state change, transition, and user action
4. **Issue Number Management**: Sequential issue numbering with uniqueness guarantees to prevent duplicate IDs
5. **Status Indicators**: Visual indicators for stuck/paused workflows that need user attention
6. **Permanent Deletion**: Complete cleanup including worktree and agent directories when delete is triggered
7. **State Recovery**: Ability to restore ADW state from database on application restart

## User Story

As a **developer using AgenticKanban**
I want to **have all ADW states managed through a reliable database**
So that **I can trust the UI reflects reality, track all activity history, prevent duplicate issue IDs, and ensure complete cleanup when deleting workflows**

## Problem Statement

The current file-based state management (`adw_state.json`) has several critical limitations:

1. **No Query Capability**: Cannot efficiently query ADWs by state, issue number, or completion status
2. **No History Tracking**: State changes overwrite previous data with no audit trail
3. **Synchronization Issues**: UI state can become out of sync with file state during concurrent operations
4. **No Issue ID Management**: No enforcement of unique issue numbers, risk of duplicates
5. **Incomplete Deletion**: Delete operations may leave orphaned data in various locations
6. **No Stuck Detection**: Cannot detect when workflows are paused or need user intervention
7. **Performance**: Reading/parsing JSON files for every state query is inefficient at scale
8. **Race Conditions**: Concurrent writes to JSON files can cause data loss
9. **No Indexing**: Finding ADWs by specific criteria requires scanning all files

## Solution Statement

Implement a SQLite-based state management system that:

1. **Database Schema**: Create tables for ADW state, activity logs, issue tracking, and deletion tracking
2. **Migration Layer**: Migrate existing JSON-based state to database while maintaining backward compatibility
3. **Backend API**: Expose CRUD endpoints for ADW state management with transaction support
4. **Real-time Sync**: WebSocket notifications for state changes to keep UI synchronized
5. **Activity Logging**: Every state change, workflow transition, and user action is logged with timestamps
6. **Issue Management**: Auto-incrementing sequential issue numbers with uniqueness constraints
7. **Status Detection**: Automated detection of stuck/paused workflows based on state and timestamp analysis
8. **Complete Cleanup**: Transaction-based deletion that removes worktree, agent directory, and all database records
9. **UI Integration**: Update Kanban board to reflect database state with visual indicators for all statuses

**Technology Choice: SQLite**

After research, SQLite is the optimal choice because:
- **Zero Configuration**: No separate database server required, embedded in application
- **ACID Compliance**: Full transaction support prevents data corruption
- **Performance**: Faster than file I/O for queries, excellent for local applications
- **Reliability**: Battle-tested, used by billions of applications worldwide
- **Portability**: Single file database, easy to backup and migrate
- **Python/JavaScript Support**: Excellent libraries (`sqlite3`, `better-sqlite3`, `sql.js`)
- **SQL Power**: Complex queries, indexing, foreign keys, triggers for business logic

## Relevant Files

### Backend Files (State Management & API)

- **server/core/database.py** (NEW) - SQLite connection manager, schema initialization, migration utilities
- **server/models/adw_state.py** (NEW) - Pydantic models for ADW state, activity logs, issue tracking
- **server/api/adw_db.py** (NEW) - Database-backed ADW CRUD endpoints (create, read, update, delete, list, query)
- **server/api/adws.py** - Existing ADW API, will be refactored to use database instead of file I/O
- **server/api/issue_tracker.py** (NEW) - Issue number management API with sequential allocation
- **server/core/websocket_manager.py** - WebSocket manager for broadcasting state changes to UI
- **adws/adw_modules/state.py** - ADW state management module, will be updated to sync with database
- **adws/adw_modules/data_types.py** - ADW data types, may need updates for database compatibility

### Frontend Files (UI & State Sync)

- **src/stores/kanbanStore.js** - Main Zustand store, will integrate database state queries
- **src/services/api/adwDbService.js** (NEW) - API client for database-backed ADW endpoints
- **src/components/kanban/KanbanCard.jsx** - Card component, add status indicators for stuck/errored states
- **src/components/kanban/KanbanBoard.jsx** - Board component, integrate database state loading
- **src/components/kanban/CompletedTasksModal.jsx** - Shows completed ADWs from database
- **src/components/kanban/StatusIndicator.jsx** (NEW) - Visual indicator component for ADW states
- **src/services/websocket/websocketService.js** - WebSocket service for real-time state updates

### Database Files

- **database/schema.sql** (NEW) - SQLite schema definition for all tables
- **database/migrations/** (NEW) - Directory for database migration scripts
- **database/seeds/** (NEW) - Seed data for testing and development

### New Files

#### Backend

- **server/core/database.py** - Database connection manager with connection pooling and migrations
- **server/models/adw_state.py** - Pydantic models for database tables
- **server/api/adw_db.py** - RESTful API for database-backed ADW operations
- **server/api/issue_tracker.py** - Issue number allocation and tracking API
- **server/migrations/001_initial_schema.py** - Initial database schema migration
- **server/migrations/002_migrate_json_to_db.py** - Migration script to import existing JSON state files

#### Frontend

- **src/services/api/adwDbService.js** - API service for database operations
- **src/components/kanban/StatusIndicator.jsx** - Reusable status indicator component
- **src/hooks/useAdwDatabase.js** - React hook for database state management

#### Database

- **database/schema.sql** - Complete SQLite schema definition
- **database/agentickanban.db** - SQLite database file (gitignored)
- **database/migrations/001_initial_schema.sql** - Initial schema migration
- **database/seeds/dev_data.sql** - Development seed data

## Implementation Plan

### Phase 1: Foundation (Database Setup & Schema Design)

**Objective**: Create the database infrastructure with proper schema, migrations, and connection management.

1. **Database Schema Design**: Design normalized tables for ADW state, activity logs, issue tracking, and deletion history
2. **Migration Infrastructure**: Set up migration framework to version and apply schema changes
3. **Connection Management**: Implement thread-safe SQLite connection pooling for backend
4. **Seed Data**: Create seed scripts for development and testing
5. **Schema Validation**: Add validation to ensure data integrity and enforce business rules

### Phase 2: Core Implementation (Backend API & State Migration)

**Objective**: Implement database-backed APIs and migrate existing JSON state to database.

1. **ADW State CRUD API**: Implement endpoints for create, read, update, delete, list, and query operations
2. **Activity Logging System**: Track every state change with timestamps, user, and change details
3. **Issue Number Management**: Sequential issue allocation with uniqueness enforcement
4. **JSON to Database Migration**: Script to import existing `agents/{adw_id}/adw_state.json` files
5. **Transaction Support**: Ensure all multi-step operations use database transactions
6. **State Synchronization**: Update `adws/adw_modules/state.py` to write to both JSON (backward compat) and database

### Phase 3: Integration (Frontend UI & WebSocket Sync)

**Objective**: Integrate database state into frontend UI with real-time synchronization.

1. **API Service Layer**: Create `adwDbService.js` for database API communication
2. **Kanban Store Integration**: Update `kanbanStore.js` to load state from database
3. **Real-time Updates**: WebSocket integration for state change notifications
4. **Status Indicators**: Visual indicators for all ADW states (plan, build, test, review, document, ready-to-merge, errored, completed)
5. **Stuck Detection UI**: Show "Action Required" indicator on cards that are stuck/paused
6. **Complete Deletion Flow**: Update delete button to trigger database cleanup + worktree removal
7. **Completed Tasks View**: Update modal to query completed ADWs from database

## Step by Step Tasks

### Database Schema & Infrastructure Setup

1. **Create SQLite schema definition**
   - Define `adw_states` table with columns: id, adw_id (unique), issue_number, issue_title, issue_class, branch_name, worktree_path, current_stage, status, is_stuck, created_at, updated_at, completed_at, deleted_at
   - Define `adw_activity_logs` table with columns: id, adw_id (FK), event_type, event_data (JSON), user, timestamp
   - Define `issue_tracker` table with columns: id, issue_number (unique), issue_title, project_id, created_at, deleted_at
   - Define `adw_deletions` table with columns: id, adw_id, issue_number, deleted_by, deleted_at, deletion_reason
   - Add indexes on frequently queried columns (adw_id, issue_number, status, current_stage)
   - Add foreign key constraints and cascading deletes
   - Write schema to `database/schema.sql`

2. **Implement database connection manager**
   - Create `server/core/database.py` with SQLite connection pooling
   - Implement context manager for transaction handling
   - Add connection testing and health check methods
   - Handle database file creation and initialization
   - Add logging for all database operations

3. **Create Pydantic models for database tables**
   - Create `server/models/adw_state.py` with models for all tables
   - Add validation rules (e.g., adw_id must be 8 chars, issue_number must be positive)
   - Define enums for status values (pending, in_progress, completed, errored, stuck)
   - Define enums for stage values (backlog, plan, build, test, review, document, ready-to-merge)
   - Add serialization/deserialization methods for JSON fields

4. **Set up database migration system**
   - Create `server/migrations/` directory structure
   - Implement migration runner that tracks applied migrations in `schema_migrations` table
   - Write initial migration `001_initial_schema.py` to create all tables
   - Add migration CLI command for applying/rolling back migrations
   - Test migration system with fresh database

5. **Create development seed data**
   - Write `database/seeds/dev_data.sql` with sample ADW states
   - Include examples of all status types (pending, in_progress, completed, errored, stuck)
   - Add corresponding activity logs for each ADW
   - Create seed script that can reset database to known state

### Backend API Implementation

6. **Implement ADW state CRUD API endpoints**
   - Create `server/api/adw_db.py` with FastAPI router
   - `POST /api/adws` - Create new ADW state record
   - `GET /api/adws` - List all ADWs with optional filters (status, stage, is_stuck)
   - `GET /api/adws/{adw_id}` - Get single ADW state by ID
   - `PATCH /api/adws/{adw_id}` - Update ADW state (stage, status, etc.)
   - `DELETE /api/adws/{adw_id}` - Delete ADW (marks as deleted, triggers cleanup)
   - Add request/response validation with Pydantic models
   - Add error handling and proper HTTP status codes
   - Add transaction support for multi-step operations

7. **Implement activity logging system**
   - Create `POST /api/adws/{adw_id}/activity` endpoint to log events
   - Auto-log events when ADW state changes (stage transitions, status changes)
   - `GET /api/adws/{adw_id}/activity` - Get activity history for an ADW
   - Store event_type (state_change, stage_transition, workflow_started, workflow_completed, error_occurred, user_action)
   - Store event_data as JSON with old_value, new_value, metadata
   - Add pagination support for activity logs

8. **Implement issue number management API**
   - Create `server/api/issue_tracker.py` with FastAPI router
   - `POST /api/issues` - Allocate next sequential issue number
   - `GET /api/issues/{issue_number}` - Get issue details
   - `GET /api/issues` - List all issues with pagination
   - Add uniqueness constraint enforcement
   - Add soft delete support (deleted_at timestamp)
   - Link issue creation to ADW state creation

9. **Implement stuck/paused detection logic**
   - Create background task to detect stuck workflows
   - Flag ADW as stuck if in same stage for > 30 minutes with no activity
   - Flag ADW as stuck if last activity log shows error
   - Add `is_stuck` boolean field to `adw_states` table
   - Expose stuck detection in API response
   - Create `PATCH /api/adws/{adw_id}/resolve-stuck` endpoint to mark as resolved

10. **Migrate existing JSON state to database**
    - Create `server/migrations/002_migrate_json_to_db.py` migration script
    - Scan `agents/{adw_id}/adw_state.json` files
    - Parse and validate JSON data
    - Insert into database with proper error handling
    - Log migration results (success count, failure count, errors)
    - Keep original JSON files intact for backward compatibility
    - Create CLI command to run migration manually

11. **Update ADW state module to sync with database**
    - Modify `adws/adw_modules/state.py` to write to database after saving JSON
    - Add database connection configuration
    - Update `save()` method to write to both JSON and database
    - Update `load()` method to prefer database, fallback to JSON
    - Add error handling for database write failures
    - Maintain backward compatibility with JSON-only mode

12. **Implement complete deletion workflow**
    - Update `DELETE /api/adws/{adw_id}` to use database transaction
    - In transaction: mark ADW as deleted, log deletion event, remove worktree, delete agent directory, delete database record
    - On success: broadcast WebSocket notification, return success response
    - On failure: rollback transaction, keep ADW state intact, return error
    - Add `DELETE /api/adws/{adw_id}/permanent` endpoint for permanent database deletion (removes all history)

### Frontend Integration

13. **Create database API service layer**
    - Create `src/services/api/adwDbService.js`
    - Implement methods: createAdw, getAdw, updateAdw, deleteAdw, listAdws, getAdwActivity
    - Add error handling and request retries
    - Add request cancellation support
    - Add TypeScript type definitions

14. **Create status indicator component**
    - Create `src/components/kanban/StatusIndicator.jsx`
    - Visual states: pending (gray), in_progress (blue pulse), completed (green), errored (red), stuck (yellow with warning icon)
    - Show "Action Required" badge for stuck workflows
    - Add tooltips with last activity timestamp and stage
    - Make component reusable across card views

15. **Update Kanban store to use database state**
    - Modify `src/stores/kanbanStore.js` to fetch ADWs from database API
    - Update `loadTasks` action to call `adwDbService.listAdws()`
    - Update task creation to call `adwDbService.createAdw()` and allocate issue number
    - Update task updates to call `adwDbService.updateAdw()`
    - Cache database state in Zustand store for performance
    - Add optimistic updates for better UX

16. **Implement real-time WebSocket synchronization**
    - Update `server/core/websocket_manager.py` to broadcast on ADW state changes
    - Add event types: adw_created, adw_updated, adw_deleted, adw_stuck, adw_completed
    - Update `src/services/websocket/websocketService.js` to handle new event types
    - Update Kanban store to apply WebSocket updates to local state
    - Add deduplication to prevent duplicate updates

17. **Update Kanban card UI**
    - Modify `src/components/kanban/KanbanCard.jsx` to use `StatusIndicator` component
    - Show current stage and status on card
    - Show "Action Required" badge for stuck workflows
    - Add visual distinction for completed vs active cards
    - Update card header with issue number display

18. **Update completed tasks modal**
    - Modify `src/components/kanban/CompletedTasksModal.jsx` to query database
    - Call `adwDbService.listAdws({ status: 'completed' })`
    - Show completion timestamp and final stage
    - Add ability to view activity history for completed ADWs
    - Add permanent delete option for completed ADWs

19. **Implement delete confirmation with database cleanup**
    - Update delete button to show confirmation modal
    - On confirm: call `adwDbService.deleteAdw(adw_id)`
    - Show loading state during deletion
    - On success: show success notification, remove card from UI
    - On failure: show error notification, keep card in UI
    - Add visual feedback for worktree removal progress

### Validation & Testing

20. **Run all validation commands**
    - Execute `cd server && uv run pytest` to validate backend tests pass
    - Execute `bun tsc --noEmit` to validate TypeScript compilation
    - Execute `bun run build` to validate frontend builds successfully
    - Fix any regressions or failures discovered

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

**File: `server/tests/test_database.py`**
- Test SQLite connection manager initialization
- Test connection pooling behavior
- Test transaction commit and rollback
- Test migration system (apply, rollback, tracking)
- Test schema validation

**File: `server/tests/test_adw_state_model.py`**
- Test Pydantic model validation rules
- Test serialization/deserialization of JSON fields
- Test enum validation (status, stage)
- Test model field constraints (adw_id length, issue_number positive)

**File: `server/tests/test_adw_db_api.py`**
- Test CREATE endpoint: successful creation, validation errors, duplicate adw_id
- Test READ endpoints: get by ID, list with filters, pagination
- Test UPDATE endpoint: stage transitions, status changes, stuck flag updates
- Test DELETE endpoint: soft delete, worktree cleanup, permanent delete
- Test activity logging on state changes

**File: `server/tests/test_issue_tracker.py`**
- Test sequential issue number allocation
- Test uniqueness enforcement
- Test soft delete behavior
- Test issue number reuse prevention

**File: `server/tests/test_json_migration.py`**
- Test migration script with valid JSON files
- Test migration with invalid/corrupt JSON files
- Test idempotency (running migration twice)
- Test migration rollback

**File: `adws/adw_modules/tests/test_state_db_sync.py`**
- Test state.save() writes to both JSON and database
- Test state.load() prefers database over JSON
- Test backward compatibility with JSON-only mode
- Test error handling when database is unavailable

#### Frontend Unit Tests

**File: `src/services/api/__tests__/adwDbService.test.js`**
- Test all API methods with mocked fetch responses
- Test error handling and retries
- Test request cancellation
- Test response validation

**File: `src/components/kanban/__tests__/StatusIndicator.test.jsx`**
- Test rendering for all status types
- Test "Action Required" badge for stuck workflows
- Test tooltip content and positioning
- Test accessibility (ARIA labels, keyboard navigation)

**File: `src/stores/__tests__/kanbanStore.test.js`**
- Test loading ADWs from database API
- Test creating ADW with issue number allocation
- Test updating ADW state
- Test deleting ADW with cleanup
- Test WebSocket state synchronization
- Test optimistic updates

#### Integration Tests

**File: `src/test/integration/adw-database-integration.test.js`**
- Test end-to-end flow: create ADW → update stage → mark completed → delete
- Test real-time sync between backend database changes and frontend state
- Test concurrent ADW creation with unique issue numbers
- Test stuck detection workflow
- Test complete deletion (database + worktree + agents directory)

### E2E Tests

**File: `src/test/e2e/issue-31-adw-5e58ab68-e2e-database-state-management.md`**

**Test: ADW Lifecycle with Database State**
1. Open Kanban board
2. Create new task with title "Test Database State"
3. Verify issue number is allocated sequentially
4. Trigger workflow (e.g., adw_plan_build_iso)
5. Verify card shows correct status indicator (in_progress, blue pulse)
6. Verify card updates as workflow progresses through stages
7. Wait for workflow completion
8. Verify card moves to completed state with green indicator
9. Open completed tasks modal
10. Verify task appears in completed list
11. Delete task
12. Verify confirmation modal appears
13. Confirm deletion
14. Verify task is removed from UI
15. Verify worktree is removed from filesystem
16. Verify agents/{adw_id} directory is removed
17. Verify database record is soft-deleted (deleted_at set)

**Test: Stuck Workflow Detection**
1. Create ADW and start workflow
2. Manually pause workflow (kill agent process)
3. Wait 30+ minutes (or trigger stuck detection manually)
4. Verify card shows "Action Required" badge
5. Verify status indicator shows yellow with warning icon
6. Click card to view details
7. Verify activity log shows no recent activity
8. Manually resolve stuck state via API or UI
9. Verify "Action Required" badge is removed

**Test: Real-time State Synchronization**
1. Open Kanban board in two browser windows
2. Create ADW in window 1
3. Verify ADW appears in window 2 via WebSocket update
4. Update ADW stage in window 1
5. Verify card updates in window 2 in real-time
6. Delete ADW in window 1
7. Verify ADW is removed from window 2 immediately

**Test: Issue Number Uniqueness**
1. Create 5 tasks rapidly (within 1 second)
2. Verify all tasks get unique sequential issue numbers
3. Verify no duplicate issue numbers in database
4. Delete 2 tasks
5. Create 2 new tasks
6. Verify new tasks get next sequential numbers (not reusing deleted numbers)

**Test: Database Migration from JSON**
1. Copy existing `agents/{adw_id}/adw_state.json` files to test environment
2. Run migration script
3. Verify all ADW states are imported to database
4. Verify issue numbers are preserved
5. Verify completed status is preserved
6. Verify UI loads ADWs from database correctly
7. Verify backward compatibility (JSON files still readable)

### Edge Cases

1. **Database Connection Failure**: Test behavior when SQLite database is locked or inaccessible
2. **Concurrent ADW Creation**: Test race condition handling when multiple ADWs created simultaneously
3. **Partial Deletion Failure**: Test rollback when worktree removal fails during delete operation
4. **Large Activity Log**: Test pagination and performance with ADW having 1000+ activity log entries
5. **Corrupt Database**: Test recovery when database file is corrupted
6. **JSON-Database Mismatch**: Test behavior when JSON file and database state diverge
7. **WebSocket Reconnection**: Test state sync after WebSocket disconnection and reconnection
8. **Orphaned Worktrees**: Test cleanup of worktrees with no corresponding database record
9. **Stale Stuck Detection**: Test that resolved workflows are no longer flagged as stuck
10. **Foreign Key Violations**: Test cascading deletes work correctly when deleting ADW with activity logs

## Acceptance Criteria

1. ✅ All ADW states are stored in SQLite database with proper schema and indexes
2. ✅ Sequential issue numbers are allocated with uniqueness guarantees (no duplicates)
3. ✅ Complete activity history is logged for every ADW state change with timestamps
4. ✅ Kanban board UI perfectly reflects database state for all ADW statuses
5. ✅ Status indicators show correct visual state (pending, in_progress, completed, errored, stuck)
6. ✅ "Action Required" badge appears on cards for stuck/paused workflows
7. ✅ Completed ADWs appear in completed tasks modal queried from database
8. ✅ Delete operation permanently removes worktree, agents directory, and database record (or soft-deletes with deleted_at)
9. ✅ Real-time WebSocket updates synchronize database state changes to UI immediately
10. ✅ Existing JSON-based ADW states are successfully migrated to database
11. ✅ Backward compatibility maintained (JSON files still work as fallback)
12. ✅ Database transactions prevent data corruption during multi-step operations
13. ✅ Stuck detection automatically flags workflows with no activity for 30+ minutes
14. ✅ All validation commands pass (pytest, tsc, build)
15. ✅ Zero regressions in existing ADW workflow functionality

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `cd server && uv run pytest` - Run all backend tests including new database tests
- `cd server && uv run pytest tests/test_database.py -v` - Run database connection and migration tests
- `cd server && uv run pytest tests/test_adw_db_api.py -v` - Run ADW database API tests
- `cd server && uv run pytest tests/test_issue_tracker.py -v` - Run issue number management tests
- `cd server && uv run pytest tests/test_json_migration.py -v` - Run JSON to database migration tests
- `bun tsc --noEmit` - Validate TypeScript compilation with new database service
- `bun run build` - Validate frontend builds successfully with database integration
- `bun run test` - Run all frontend unit tests including database service tests
- `sqlite3 database/agentickanban.db ".schema"` - Verify database schema is correct
- `sqlite3 database/agentickanban.db "SELECT COUNT(*) FROM adw_states"` - Verify ADW states are persisted
- `sqlite3 database/agentickanban.db "SELECT COUNT(*) FROM adw_activity_logs"` - Verify activity logs are recorded
- `curl http://localhost:8001/api/adws | jq` - Verify ADW list API returns database data
- `curl http://localhost:8001/api/issues | jq` - Verify issue tracker API works

## Notes

### Database Technology Decision: Why SQLite?

After thorough research, SQLite was chosen over alternatives (PostgreSQL, MySQL, MongoDB, JSON files) for the following reasons:

1. **Zero Configuration**: No separate database server to install, configure, or maintain. Embedded directly in the application.
2. **ACID Compliance**: Full transaction support with rollback capabilities prevents data corruption during failures.
3. **Performance**: For local applications with single-user or low-concurrency use cases, SQLite is faster than network-based databases due to no network overhead.
4. **Reliability**: SQLite is the most widely deployed database engine in the world (used in Android, iOS, browsers, etc.) with extensive testing.
5. **Portability**: Single file database (`agentickanban.db`) makes backup, migration, and version control simple.
6. **SQL Power**: Full SQL support with indexes, foreign keys, triggers, views enables complex queries and enforces data integrity.
7. **Python/JavaScript Support**: Excellent libraries available (`sqlite3` built into Python, `better-sqlite3` for Node.js, `sql.js` for browser).
8. **Size**: Entire database is a single file, typically under 100MB for thousands of ADWs.
9. **Concurrency**: Sufficient for AgenticKanban's use case (single user, occasional concurrent ADW operations).

**When to Consider Alternatives**:
- If the application needs to support 100+ concurrent users → PostgreSQL
- If deploying as multi-tenant SaaS → PostgreSQL with row-level security
- If requiring real-time multi-user collaboration → PostgreSQL with LISTEN/NOTIFY

For AgenticKanban's local development workflow with 15 concurrent ADW instances max, SQLite is the ideal choice.

### Migration Strategy

The migration from JSON to database will be **incremental and backward compatible**:

1. **Phase 1**: Database-first writes, JSON-first reads (migration period)
   - All new state changes write to both database and JSON
   - Reads prefer database, fallback to JSON if not found
   - Allows gradual migration of existing ADWs

2. **Phase 2**: Database-only mode (after migration completes)
   - All reads and writes use database exclusively
   - JSON files maintained as backup/export format
   - Can be toggled via environment variable `ADW_STATE_MODE=database|json|hybrid`

3. **Rollback Plan**: If critical issues discovered
   - Set `ADW_STATE_MODE=json` to revert to JSON-only
   - Database continues to sync in background
   - Can switch back to database after fix

### Future Enhancements

1. **Database Replication**: Sync local SQLite to cloud storage for backup (S3, Cloudflare R2)
2. **Multi-Project Support**: Add `projects` table to support multiple AgenticKanban projects in single database
3. **Analytics Dashboard**: SQL queries to show ADW completion rates, average time per stage, error rates
4. **State Snapshots**: Store periodic snapshots of ADW state for time-travel debugging
5. **Conflict Resolution**: If switching to PostgreSQL for multi-user, implement CRDTs or operational transforms
6. **Full-Text Search**: SQLite FTS5 extension for searching across ADW titles, descriptions, activity logs
7. **GraphQL API**: Add GraphQL layer on top of REST API for more flexible frontend queries
8. **Webhooks**: Trigger external webhooks on ADW state changes (e.g., Slack notifications)

### Security Considerations

1. **SQL Injection Prevention**: Use parameterized queries exclusively (no string concatenation)
2. **Database Encryption**: SQLite supports encryption via SQLCipher extension if needed
3. **Access Control**: Database file permissions should be restricted to application user only
4. **Backup Strategy**: Automated daily backups of database file with rotation policy
5. **Audit Trail**: Activity logs provide complete audit trail for compliance

### Performance Optimizations

1. **Indexing Strategy**: Create indexes on `adw_id`, `issue_number`, `status`, `current_stage`, `created_at`
2. **Connection Pooling**: Reuse database connections to avoid overhead of repeated connects
3. **Batch Operations**: Use transactions for batch inserts/updates to improve throughput
4. **Query Optimization**: Use EXPLAIN QUERY PLAN to optimize slow queries
5. **Caching**: Cache frequently accessed ADW states in memory (Zustand store) with invalidation on updates

### Testing Recommendations

1. **Load Testing**: Test with 1000+ ADW records to ensure performance is acceptable
2. **Concurrency Testing**: Simulate 15 concurrent ADW workflows writing to database
3. **Migration Testing**: Test migration with realistic production data set
4. **Disaster Recovery**: Test database corruption recovery procedures
5. **Integration Testing**: Test end-to-end workflows with database backend
