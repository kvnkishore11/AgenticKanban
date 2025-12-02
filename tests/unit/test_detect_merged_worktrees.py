"""
Unit tests for the detect_merged_worktrees script.
"""

import os
import sqlite3
import tempfile
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "server" / "scripts"))

from detect_merged_worktrees import (
    get_project_root,
    get_db_path,
    get_merged_branches,
    get_adws_with_branches,
    update_adw_to_completed,
    detect_and_update_merged_worktrees,
)


@pytest.fixture
def temp_db():
    """Create a temporary database with schema for testing."""
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.db', delete=False)
    temp_file.close()
    db_path = Path(temp_file.name)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create minimal schema for testing
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS adw_states (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adw_id TEXT NOT NULL UNIQUE,
            branch_name TEXT,
            current_stage TEXT NOT NULL DEFAULT 'backlog',
            status TEXT NOT NULL DEFAULT 'pending',
            completed_at TIMESTAMP,
            deleted_at TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS adw_activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adw_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            field_changed TEXT,
            old_value TEXT,
            new_value TEXT,
            event_data TEXT,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

    yield db_path

    # Cleanup
    if db_path.exists():
        os.unlink(db_path)


class TestGetProjectRoot:
    """Tests for get_project_root()."""

    def test_returns_path_object(self):
        """get_project_root() returns a Path object."""
        result = get_project_root()
        assert isinstance(result, Path)

    def test_path_exists(self):
        """get_project_root() returns an existing path."""
        result = get_project_root()
        assert result.exists()


class TestGetDbPath:
    """Tests for get_db_path()."""

    def test_returns_path_object(self):
        """get_db_path() returns a Path object."""
        result = get_db_path()
        assert isinstance(result, Path)

    def test_path_contains_agentickanban_db(self):
        """get_db_path() returns path ending with adws/database/agentickanban.db."""
        result = get_db_path()
        assert result.name == "agentickanban.db"
        assert result.parent.name == "database"
        assert result.parent.parent.name == "adws"


class TestGetMergedBranches:
    """Tests for get_merged_branches()."""

    def test_returns_list(self):
        """get_merged_branches() returns a list."""
        project_root = get_project_root()
        result = get_merged_branches(project_root)
        assert isinstance(result, list)

    def test_excludes_main_branch(self):
        """get_merged_branches() excludes the main branch itself."""
        project_root = get_project_root()
        result = get_merged_branches(project_root)
        assert "main" not in result

    @patch('detect_merged_worktrees.subprocess.run')
    def test_handles_subprocess_error(self, mock_run):
        """get_merged_branches() returns empty list on subprocess error."""
        from subprocess import CalledProcessError
        mock_run.side_effect = CalledProcessError(1, 'git', 'error')
        result = get_merged_branches(Path("/nonexistent"))
        assert result == []


class TestGetAdwsWithBranches:
    """Tests for get_adws_with_branches()."""

    def test_returns_empty_list_for_nonexistent_db(self):
        """get_adws_with_branches() returns empty list if database doesn't exist."""
        result = get_adws_with_branches(Path("/nonexistent/db.db"))
        assert result == []

    def test_returns_adws_not_completed(self, temp_db):
        """get_adws_with_branches() returns ADWs that are not completed."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        # Insert test data
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('test1234', 'test-branch-1', 'backlog', 'pending')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('test5678', 'test-branch-2', 'ready-to-merge', 'completed')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('test9012', 'test-branch-3', 'build', 'in_progress')
        """)
        conn.commit()
        conn.close()

        result = get_adws_with_branches(temp_db)

        # Should return 2 ADWs (pending and in_progress, not completed)
        assert len(result) == 2
        adw_ids = [r[0] for r in result]
        assert 'test1234' in adw_ids
        assert 'test9012' in adw_ids
        assert 'test5678' not in adw_ids

    def test_excludes_deleted_adws(self, temp_db):
        """get_adws_with_branches() excludes soft-deleted ADWs."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status, deleted_at)
            VALUES ('deleted1', 'deleted-branch', 'backlog', 'pending', '2025-01-01')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('active11', 'active-branch', 'backlog', 'pending')
        """)
        conn.commit()
        conn.close()

        result = get_adws_with_branches(temp_db)

        assert len(result) == 1
        assert result[0][0] == 'active11'

    def test_excludes_adws_without_branches(self, temp_db):
        """get_adws_with_branches() excludes ADWs without branch names."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('nobranc1', NULL, 'backlog', 'pending')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('nobranc2', '', 'backlog', 'pending')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('hasbran1', 'my-branch', 'backlog', 'pending')
        """)
        conn.commit()
        conn.close()

        result = get_adws_with_branches(temp_db)

        assert len(result) == 1
        assert result[0][0] == 'hasbran1'


class TestUpdateAdwToCompleted:
    """Tests for update_adw_to_completed()."""

    def test_updates_stage_and_status(self, temp_db):
        """update_adw_to_completed() updates stage to ready-to-merge and status to completed."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('updt1234', 'update-branch', 'backlog', 'pending')
        """)
        conn.commit()
        conn.close()

        result = update_adw_to_completed(
            temp_db, 'updt1234', 'update-branch', 'backlog', 'pending'
        )

        assert result is True

        # Verify the update
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT current_stage, status, completed_at
            FROM adw_states WHERE adw_id = 'updt1234'
        """)
        row = cursor.fetchone()
        conn.close()

        assert row[0] == 'ready-to-merge'
        assert row[1] == 'completed'
        assert row[2] is not None  # completed_at should be set

    def test_creates_activity_log(self, temp_db):
        """update_adw_to_completed() creates an activity log entry."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('logtest1', 'log-branch', 'build', 'in_progress')
        """)
        conn.commit()
        conn.close()

        update_adw_to_completed(
            temp_db, 'logtest1', 'log-branch', 'build', 'in_progress'
        )

        # Verify activity log was created
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT event_type, field_changed, old_value, new_value, event_data
            FROM adw_activity_logs WHERE adw_id = 'logtest1'
        """)
        row = cursor.fetchone()
        conn.close()

        assert row is not None
        assert row[0] == 'workflow_completed'
        assert row[1] == 'status'
        assert row[2] == 'in_progress'
        assert row[3] == 'completed'
        assert 'branch_merged_to_main' in row[4]


class TestDetectAndUpdateMergedWorktrees:
    """Tests for detect_and_update_merged_worktrees()."""

    @patch('detect_merged_worktrees.get_db_path')
    @patch('detect_merged_worktrees.get_merged_branches')
    @patch('detect_merged_worktrees.get_adws_with_branches')
    def test_returns_stats_dict(self, mock_adws, mock_branches, mock_db_path, temp_db):
        """detect_and_update_merged_worktrees() returns statistics dictionary."""
        mock_db_path.return_value = temp_db
        mock_branches.return_value = []
        mock_adws.return_value = []

        result = detect_and_update_merged_worktrees(dry_run=True)

        assert isinstance(result, dict)
        assert 'total_adws_with_branches' in result
        assert 'merged_branches_found' in result
        assert 'adws_updated' in result
        assert 'errors' in result

    @patch('detect_merged_worktrees.get_db_path')
    def test_returns_early_if_db_not_found(self, mock_db_path):
        """detect_and_update_merged_worktrees() returns early if database not found."""
        mock_db_path.return_value = Path("/nonexistent/db.db")

        result = detect_and_update_merged_worktrees()

        assert result['total_adws_with_branches'] == 0
        assert result['merged_branches_found'] == 0

    @patch('detect_merged_worktrees.get_db_path')
    @patch('detect_merged_worktrees.get_merged_branches')
    def test_dry_run_does_not_update(self, mock_branches, mock_db_path, temp_db):
        """detect_and_update_merged_worktrees() doesn't update in dry_run mode."""
        # Setup database with test data
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('drytest1', 'merged-branch', 'backlog', 'pending')
        """)
        conn.commit()
        conn.close()

        mock_db_path.return_value = temp_db
        mock_branches.return_value = ['merged-branch']

        result = detect_and_update_merged_worktrees(dry_run=True)

        assert result['merged_branches_found'] == 1
        assert result['adws_updated'] == 0  # Not updated in dry run

        # Verify no actual update happened
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM adw_states WHERE adw_id = 'drytest1'")
        row = cursor.fetchone()
        conn.close()

        assert row[0] == 'pending'  # Still pending, not updated

    @patch('detect_merged_worktrees.get_db_path')
    @patch('detect_merged_worktrees.get_merged_branches')
    def test_updates_matching_adws(self, mock_branches, mock_db_path, temp_db):
        """detect_and_update_merged_worktrees() updates ADWs with merged branches."""
        # Setup database with test data
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('merged11', 'merged-branch-1', 'backlog', 'pending')
        """)
        cursor.execute("""
            INSERT INTO adw_states (adw_id, branch_name, current_stage, status)
            VALUES ('notmrgd1', 'unmerged-branch', 'build', 'in_progress')
        """)
        conn.commit()
        conn.close()

        mock_db_path.return_value = temp_db
        mock_branches.return_value = ['merged-branch-1', 'other-merged-branch']

        result = detect_and_update_merged_worktrees(dry_run=False)

        assert result['total_adws_with_branches'] == 2
        assert result['merged_branches_found'] == 1
        assert result['adws_updated'] == 1

        # Verify the correct ADW was updated
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM adw_states WHERE adw_id = 'merged11'")
        merged_row = cursor.fetchone()
        cursor.execute("SELECT status FROM adw_states WHERE adw_id = 'notmrgd1'")
        unmerged_row = cursor.fetchone()
        conn.close()

        assert merged_row[0] == 'completed'
        assert unmerged_row[0] == 'in_progress'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
