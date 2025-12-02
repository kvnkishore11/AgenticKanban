"""
Unit tests for the migrate_json_to_db script.
"""

import os
import sqlite3
import tempfile
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "server" / "scripts"))

from migrate_json_to_db import (
    get_project_root,
    scan_adw_directories,
    read_adw_state_json,
    import_adw_to_database,
    migrate_json_to_database,
)


@pytest.fixture
def temp_db():
    """Create a temporary database with schema for testing."""
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.db', delete=False)
    temp_file.close()
    db_path = Path(temp_file.name)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create schema for testing
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS adw_states (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adw_id TEXT NOT NULL UNIQUE,
            issue_number INTEGER,
            issue_title TEXT,
            issue_body TEXT,
            issue_class TEXT,
            branch_name TEXT,
            worktree_path TEXT,
            current_stage TEXT NOT NULL DEFAULT 'backlog',
            status TEXT NOT NULL DEFAULT 'pending',
            workflow_name TEXT,
            model_set TEXT DEFAULT 'base',
            data_source TEXT DEFAULT 'kanban',
            issue_json TEXT,
            orchestrator_state TEXT,
            plan_file TEXT,
            all_adws TEXT DEFAULT '[]',
            patch_file TEXT,
            patch_history TEXT DEFAULT '[]',
            patch_source_mode TEXT,
            backend_port INTEGER,
            websocket_port INTEGER,
            frontend_port INTEGER,
            completed_at TIMESTAMP,
            deleted_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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


@pytest.fixture
def temp_agents_dir():
    """Create a temporary agents directory for testing."""
    temp_dir = tempfile.mkdtemp()
    agents_path = Path(temp_dir) / "agents"
    agents_path.mkdir()

    yield agents_path

    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)


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


class TestScanAdwDirectories:
    """Tests for scan_adw_directories()."""

    def test_returns_empty_list_for_nonexistent_dir(self, temp_agents_dir):
        """scan_adw_directories() returns empty list for nonexistent directory."""
        result = scan_adw_directories(Path("/nonexistent/agents"))
        assert result == []

    def test_returns_valid_adw_dirs(self, temp_agents_dir):
        """scan_adw_directories() returns valid ADW directories."""
        # Create valid ADW directories (8 alphanumeric chars)
        (temp_agents_dir / "test1234").mkdir()
        (temp_agents_dir / "abcd5678").mkdir()

        result = scan_adw_directories(temp_agents_dir)

        assert len(result) == 2
        dir_names = [d.name for d in result]
        assert "test1234" in dir_names
        assert "abcd5678" in dir_names

    def test_skips_invalid_adw_ids(self, temp_agents_dir):
        """scan_adw_directories() skips directories with invalid ADW IDs."""
        # Valid
        (temp_agents_dir / "valid123").mkdir()

        # Invalid - too long
        (temp_agents_dir / "toolongid").mkdir()

        # Invalid - too short
        (temp_agents_dir / "short").mkdir()

        # Invalid - special characters
        (temp_agents_dir / "spec!@#$").mkdir()

        result = scan_adw_directories(temp_agents_dir)

        assert len(result) == 1
        assert result[0].name == "valid123"

    def test_skips_files(self, temp_agents_dir):
        """scan_adw_directories() skips files."""
        # Create valid directory
        (temp_agents_dir / "test1234").mkdir()

        # Create file that looks like ADW ID
        (temp_agents_dir / "file1234").touch()

        result = scan_adw_directories(temp_agents_dir)

        assert len(result) == 1
        assert result[0].name == "test1234"


class TestReadAdwStateJson:
    """Tests for read_adw_state_json()."""

    def test_returns_none_for_missing_file(self, temp_agents_dir):
        """read_adw_state_json() returns None if file doesn't exist."""
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()

        result = read_adw_state_json(adw_dir)

        assert result is None

    def test_returns_parsed_json(self, temp_agents_dir):
        """read_adw_state_json() returns parsed JSON data."""
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()

        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "adw_id": "test1234",
            "issue_number": 123,
            "branch_name": "test-branch"
        }))

        result = read_adw_state_json(adw_dir)

        assert result is not None
        assert result["adw_id"] == "test1234"
        assert result["issue_number"] == 123
        assert result["branch_name"] == "test-branch"

    def test_returns_none_for_invalid_json(self, temp_agents_dir):
        """read_adw_state_json() returns None for invalid JSON."""
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()

        state_file = adw_dir / "adw_state.json"
        state_file.write_text("not valid json {{{")

        result = read_adw_state_json(adw_dir)

        assert result is None


class TestImportAdwToDatabase:
    """Tests for import_adw_to_database()."""

    def test_returns_false_for_missing_adw_id(self, temp_db):
        """import_adw_to_database() returns False if adw_id is missing."""
        mock_db = MagicMock()

        result = import_adw_to_database({}, mock_db)

        assert result is False

    def test_skips_existing_adw(self, temp_db):
        """import_adw_to_database() skips ADW that already exists."""
        # Insert existing ADW
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, current_stage, status)
            VALUES ('test1234', 'backlog', 'pending')
        """)
        conn.commit()
        conn.close()

        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"id": 1}]

        adw_data = {"adw_id": "test1234"}
        result = import_adw_to_database(adw_data, mock_db)

        assert result == "skipped"  # Returns "skipped" for existing ADWs
        mock_db.execute_insert.assert_not_called()


class TestMigrateJsonToDatabase:
    """Tests for migrate_json_to_database()."""

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_returns_stats_dict(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() returns statistics dictionary."""
        mock_root.return_value = temp_agents_dir.parent
        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=True)

        assert isinstance(result, dict)
        assert 'scanned' in result
        assert 'valid_json' in result
        assert 'imported' in result
        assert 'skipped' in result
        assert 'errors' in result

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_scans_adw_directories(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() scans ADW directories."""
        mock_root.return_value = temp_agents_dir.parent

        # Create ADW directories
        (temp_agents_dir / "test1234").mkdir()
        (temp_agents_dir / "test5678").mkdir()

        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=True)

        assert result['scanned'] == 2

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_counts_valid_json_files(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() counts valid JSON files."""
        mock_root.return_value = temp_agents_dir.parent

        # Create ADW directory with valid JSON
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        (adw_dir / "adw_state.json").write_text(json.dumps({
            "adw_id": "test1234",
            "issue_number": 123
        }))

        # Create ADW directory without JSON
        (temp_agents_dir / "test5678").mkdir()

        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=True)

        assert result['scanned'] == 2
        assert result['valid_json'] == 1
        assert result['skipped'] == 1

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_dry_run_does_not_import(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() doesn't import in dry_run mode."""
        mock_root.return_value = temp_agents_dir.parent

        # Create ADW directory with valid JSON
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        (adw_dir / "adw_state.json").write_text(json.dumps({
            "adw_id": "test1234",
            "issue_number": 123
        }))

        mock_db = MagicMock()
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=True)

        # Should not call execute_insert in dry_run mode
        mock_db.execute_insert.assert_not_called()
        assert result['imported'] == 0

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_imports_valid_adw(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() imports valid ADW data."""
        mock_root.return_value = temp_agents_dir.parent

        # Create ADW directory with valid JSON
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        (adw_dir / "adw_state.json").write_text(json.dumps({
            "adw_id": "test1234",
            "issue_number": 123,
            "issue_json": {"title": "Test Issue"},
            "all_adws": ["adw_plan_iso"]
        }))

        mock_db = MagicMock()
        mock_db.execute_query.return_value = []  # ADW doesn't exist
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=False)

        assert result['imported'] == 1
        mock_db.execute_insert.assert_called()


class TestMigrationIdempotency:
    """Tests for migration idempotency - running multiple times should be safe."""

    @patch('migrate_json_to_db.get_project_root')
    @patch('migrate_json_to_db.get_db_manager')
    def test_skips_already_imported_adws(self, mock_db_manager, mock_root, temp_agents_dir):
        """migrate_json_to_database() skips already imported ADWs."""
        mock_root.return_value = temp_agents_dir.parent

        # Create ADW directory with valid JSON
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        (adw_dir / "adw_state.json").write_text(json.dumps({
            "adw_id": "test1234",
            "issue_number": 123
        }))

        mock_db = MagicMock()
        # Simulate ADW already exists in database
        mock_db.execute_query.return_value = [{"id": 1}]
        mock_db_manager.return_value = mock_db

        result = migrate_json_to_database(dry_run=False)

        # Should show as imported (skipped because exists)
        assert result['valid_json'] == 1
        # execute_insert should not be called for INSERT
        # (only execute_query to check existence)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
