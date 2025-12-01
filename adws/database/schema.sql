-- AgenticKanban Database Schema
-- SQLite database for managing ADW (Agent-Driven Workflow) state
-- Created: 2025-11-30

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- ADW States table - Core state management for workflows
CREATE TABLE IF NOT EXISTS adw_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adw_id TEXT NOT NULL UNIQUE,  -- 8-character ADW identifier
    issue_number INTEGER,  -- Sequential issue number
    issue_title TEXT,
    issue_body TEXT,
    issue_class TEXT,  -- feature, bug, chore, patch
    branch_name TEXT,
    worktree_path TEXT,
    current_stage TEXT NOT NULL DEFAULT 'backlog',  -- backlog, plan, build, test, review, document, ready-to-merge
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, errored, stuck
    is_stuck BOOLEAN NOT NULL DEFAULT 0,  -- Flag for stuck/paused workflows
    workflow_name TEXT,  -- e.g., 'adw_sdlc_iso', 'adw_plan_build_iso'
    model_set TEXT DEFAULT 'base',  -- base, heavy
    data_source TEXT DEFAULT 'kanban',  -- github, kanban
    issue_json TEXT,  -- JSON string of full issue data
    orchestrator_state TEXT,  -- JSON string for orchestrator execution state
    plan_file TEXT,  -- Path to implementation plan file
    all_adws TEXT,  -- JSON array of workflow names that have run
    patch_file TEXT,  -- Path to patch file
    patch_history TEXT,  -- JSON array of patch attempts
    patch_source_mode TEXT,  -- github, kanban
    backend_port INTEGER,
    websocket_port INTEGER,
    frontend_port INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,  -- Timestamp when workflow completed
    deleted_at TIMESTAMP,  -- Soft delete timestamp

    CONSTRAINT chk_adw_id_length CHECK (length(adw_id) = 8),
    CONSTRAINT chk_issue_number_positive CHECK (issue_number IS NULL OR issue_number > 0),
    CONSTRAINT chk_current_stage CHECK (current_stage IN ('backlog', 'plan', 'build', 'test', 'review', 'document', 'ready-to-merge', 'errored')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'in_progress', 'completed', 'errored', 'stuck')),
    CONSTRAINT chk_model_set CHECK (model_set IN ('base', 'heavy')),
    CONSTRAINT chk_data_source CHECK (data_source IN ('github', 'kanban'))
);

-- Indexes for adw_states
CREATE INDEX IF NOT EXISTS idx_adw_states_adw_id ON adw_states(adw_id);
CREATE INDEX IF NOT EXISTS idx_adw_states_issue_number ON adw_states(issue_number);
CREATE INDEX IF NOT EXISTS idx_adw_states_status ON adw_states(status);
CREATE INDEX IF NOT EXISTS idx_adw_states_current_stage ON adw_states(current_stage);
CREATE INDEX IF NOT EXISTS idx_adw_states_is_stuck ON adw_states(is_stuck);
CREATE INDEX IF NOT EXISTS idx_adw_states_created_at ON adw_states(created_at);
CREATE INDEX IF NOT EXISTS idx_adw_states_updated_at ON adw_states(updated_at);
CREATE INDEX IF NOT EXISTS idx_adw_states_deleted_at ON adw_states(deleted_at);

-- ADW Activity Logs table - Complete audit trail of state changes
CREATE TABLE IF NOT EXISTS adw_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adw_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- state_change, stage_transition, workflow_started, workflow_completed, error_occurred, user_action
    event_data TEXT,  -- JSON string with old_value, new_value, metadata
    field_changed TEXT,  -- Field that changed (for state_change events)
    old_value TEXT,
    new_value TEXT,
    user TEXT,  -- User who triggered the action (if applicable)
    workflow_step TEXT,  -- Workflow step that triggered this event
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (adw_id) REFERENCES adw_states(adw_id) ON DELETE CASCADE,
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'state_change',
        'stage_transition',
        'workflow_started',
        'workflow_completed',
        'workflow_failed',
        'error_occurred',
        'user_action',
        'stuck_detected',
        'stuck_resolved',
        'deletion_requested'
    ))
);

-- Indexes for adw_activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_adw_id ON adw_activity_logs(adw_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON adw_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON adw_activity_logs(timestamp);

-- Issue Tracker table - Sequential issue number allocation
CREATE TABLE IF NOT EXISTS issue_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_number INTEGER NOT NULL UNIQUE,
    issue_title TEXT NOT NULL,
    project_id TEXT DEFAULT 'default',  -- For future multi-project support
    adw_id TEXT,  -- Link to ADW that owns this issue
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,  -- Soft delete timestamp

    CONSTRAINT chk_issue_number_positive CHECK (issue_number > 0),
    FOREIGN KEY (adw_id) REFERENCES adw_states(adw_id) ON DELETE SET NULL
);

-- Indexes for issue_tracker
CREATE INDEX IF NOT EXISTS idx_issue_tracker_issue_number ON issue_tracker(issue_number);
CREATE INDEX IF NOT EXISTS idx_issue_tracker_adw_id ON issue_tracker(adw_id);
CREATE INDEX IF NOT EXISTS idx_issue_tracker_deleted_at ON issue_tracker(deleted_at);

-- ADW Deletions table - Audit trail for deleted ADWs
CREATE TABLE IF NOT EXISTS adw_deletions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adw_id TEXT NOT NULL,
    issue_number INTEGER,
    deleted_by TEXT,  -- User who triggered deletion
    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletion_reason TEXT,
    worktree_removed BOOLEAN DEFAULT 0,
    agents_dir_removed BOOLEAN DEFAULT 0,
    database_record_removed BOOLEAN DEFAULT 0,
    metadata TEXT  -- JSON string with additional deletion metadata
);

-- Indexes for adw_deletions
CREATE INDEX IF NOT EXISTS idx_deletions_adw_id ON adw_deletions(adw_id);
CREATE INDEX IF NOT EXISTS idx_deletions_deleted_at ON adw_deletions(deleted_at);

-- Trigger to update updated_at timestamp on adw_states
CREATE TRIGGER IF NOT EXISTS trg_adw_states_updated_at
AFTER UPDATE ON adw_states
FOR EACH ROW
BEGIN
    UPDATE adw_states SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to log state changes to activity logs
CREATE TRIGGER IF NOT EXISTS trg_adw_states_log_status_change
AFTER UPDATE OF status ON adw_states
FOR EACH ROW
WHEN OLD.status != NEW.status
BEGIN
    INSERT INTO adw_activity_logs (adw_id, event_type, field_changed, old_value, new_value, event_data)
    VALUES (
        NEW.adw_id,
        'state_change',
        'status',
        OLD.status,
        NEW.status,
        json_object('timestamp', CURRENT_TIMESTAMP)
    );
END;

-- Trigger to log stage transitions to activity logs
CREATE TRIGGER IF NOT EXISTS trg_adw_states_log_stage_change
AFTER UPDATE OF current_stage ON adw_states
FOR EACH ROW
WHEN OLD.current_stage != NEW.current_stage
BEGIN
    INSERT INTO adw_activity_logs (adw_id, event_type, field_changed, old_value, new_value, event_data)
    VALUES (
        NEW.adw_id,
        'stage_transition',
        'current_stage',
        OLD.current_stage,
        NEW.current_stage,
        json_object('timestamp', CURRENT_TIMESTAMP)
    );
END;

-- Trigger to log stuck detection to activity logs
CREATE TRIGGER IF NOT EXISTS trg_adw_states_log_stuck_detection
AFTER UPDATE OF is_stuck ON adw_states
FOR EACH ROW
WHEN OLD.is_stuck != NEW.is_stuck
BEGIN
    INSERT INTO adw_activity_logs (adw_id, event_type, field_changed, old_value, new_value, event_data)
    VALUES (
        NEW.adw_id,
        CASE WHEN NEW.is_stuck = 1 THEN 'stuck_detected' ELSE 'stuck_resolved' END,
        'is_stuck',
        CAST(OLD.is_stuck AS TEXT),
        CAST(NEW.is_stuck AS TEXT),
        json_object('timestamp', CURRENT_TIMESTAMP)
    );
END;

-- View for active (non-deleted) ADWs
CREATE VIEW IF NOT EXISTS v_active_adws AS
SELECT * FROM adw_states WHERE deleted_at IS NULL;

-- View for completed ADWs
CREATE VIEW IF NOT EXISTS v_completed_adws AS
SELECT * FROM adw_states WHERE status = 'completed' AND deleted_at IS NULL;

-- View for stuck ADWs requiring attention
CREATE VIEW IF NOT EXISTS v_stuck_adws AS
SELECT * FROM adw_states WHERE is_stuck = 1 AND deleted_at IS NULL;

-- View for ADWs with recent activity (last 24 hours)
CREATE VIEW IF NOT EXISTS v_recent_adws AS
SELECT * FROM adw_states
WHERE updated_at >= datetime('now', '-1 day')
AND deleted_at IS NULL
ORDER BY updated_at DESC;
