"""
Unit tests for the sync_workflow_names script.
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

from sync_workflow_names import (
    get_project_root,
    derive_workflow_name,
    sync_workflow_names,
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
            workflow_name TEXT,
            deleted_at TIMESTAMP
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
    """Create a temporary agents directory with JSON files for testing."""
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


class TestDeriveWorkflowName:
    """Tests for derive_workflow_name()."""

    def test_empty_list_returns_none(self):
        """derive_workflow_name() returns None for empty list."""
        result = derive_workflow_name([])
        assert result is None

    def test_none_returns_none(self):
        """derive_workflow_name() returns None for None input."""
        result = derive_workflow_name(None)
        assert result is None

    def test_single_stage(self):
        """derive_workflow_name() handles single stage."""
        result = derive_workflow_name(['adw_plan_iso'])
        assert result == 'adw_plan_iso'

    def test_two_stages(self):
        """derive_workflow_name() handles two stages."""
        result = derive_workflow_name(['adw_plan_iso', 'adw_build_iso'])
        assert result == 'adw_plan_build_iso'

    def test_three_stages(self):
        """derive_workflow_name() handles three stages."""
        result = derive_workflow_name(['adw_plan_iso', 'adw_build_iso', 'adw_test_iso'])
        assert result == 'adw_plan_build_test_iso'

    def test_five_stages(self):
        """derive_workflow_name() handles five stages (full pipeline)."""
        result = derive_workflow_name([
            'adw_plan_iso',
            'adw_build_iso',
            'adw_test_iso',
            'adw_review_iso',
            'adw_document_iso'
        ])
        assert result == 'adw_plan_build_test_review_document_iso'

    def test_preserves_stage_order(self):
        """derive_workflow_name() preserves the order of stages."""
        result = derive_workflow_name(['adw_build_iso', 'adw_plan_iso'])
        assert result == 'adw_build_plan_iso'

    def test_handles_implement_stage(self):
        """derive_workflow_name() handles 'implement' stage."""
        result = derive_workflow_name(['adw_plan_iso', 'adw_implement_iso'])
        assert result == 'adw_plan_implement_iso'


class TestSyncWorkflowNames:
    """Tests for sync_workflow_names()."""

    @patch('sync_workflow_names.get_project_root')
    def test_returns_stats_dict(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() returns statistics dictionary."""
        mock_root.return_value = temp_agents_dir.parent

        result = sync_workflow_names(dry_run=True)

        assert isinstance(result, dict)
        assert 'scanned' in result
        assert 'updated' in result
        assert 'skipped' in result
        assert 'errors' in result

    @patch('sync_workflow_names.get_project_root')
    def test_returns_early_if_db_not_found(self, mock_root, temp_agents_dir):
        """sync_workflow_names() returns early if database not found."""
        mock_root.return_value = temp_agents_dir.parent
        # No database file created

        result = sync_workflow_names()

        assert result['scanned'] == 0
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_skips_adws_not_in_db(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips ADWs not in database."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        # Copy temp_db to expected location
        import shutil
        shutil.copy(str(temp_db), str(db_dir / "agentickanban.db"))

        # Create ADW directory with JSON file but NOT in database
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "all_adws": ["adw_plan_iso", "adw_build_iso"]
        }))

        result = sync_workflow_names(dry_run=True)

        # Should be scanned but skipped (not in DB)
        assert result['scanned'] == 1
        assert result['skipped'] == 1
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_updates_adw_with_null_workflow_name(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() updates ADW with NULL workflow_name."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        # Setup database with ADW that has NULL workflow_name
        db_path = db_dir / "agentickanban.db"
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, workflow_name)
            VALUES ('test1234', NULL)
        """)
        conn.commit()
        conn.close()

        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory with JSON file
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "all_adws": ["adw_plan_iso", "adw_build_iso"]
        }))

        result = sync_workflow_names(dry_run=False)

        assert result['scanned'] == 1
        assert result['updated'] == 1

        # Verify database was updated
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT workflow_name FROM adw_states WHERE adw_id = 'test1234'")
        row = cursor.fetchone()
        conn.close()

        assert row[0] == 'adw_plan_build_iso'

    @patch('sync_workflow_names.get_project_root')
    def test_skips_adw_with_existing_workflow_name(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips ADW that already has workflow_name."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        # Setup database with ADW that already has workflow_name
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, workflow_name)
            VALUES ('test1234', 'adw_existing_iso')
        """)
        conn.commit()
        conn.close()

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory with JSON file
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "all_adws": ["adw_plan_iso", "adw_build_iso"]
        }))

        result = sync_workflow_names(dry_run=False)

        assert result['scanned'] == 1
        assert result['skipped'] == 1
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_dry_run_does_not_update(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() doesn't update in dry_run mode."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        # Setup database with ADW
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, workflow_name)
            VALUES ('test1234', NULL)
        """)
        conn.commit()
        conn.close()

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory with JSON file
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "all_adws": ["adw_plan_iso", "adw_build_iso"]
        }))

        result = sync_workflow_names(dry_run=True)

        assert result['scanned'] == 1
        assert result['updated'] == 1  # Would be updated

        # Verify database was NOT actually updated
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT workflow_name FROM adw_states WHERE adw_id = 'test1234'")
        row = cursor.fetchone()
        conn.close()

        assert row[0] is None  # Still NULL because dry_run

    @patch('sync_workflow_names.get_project_root')
    def test_skips_deleted_adws(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips soft-deleted ADWs."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        # Setup database with deleted ADW
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, workflow_name, deleted_at)
            VALUES ('test1234', NULL, '2025-01-01')
        """)
        conn.commit()
        conn.close()

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory with JSON file
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "all_adws": ["adw_plan_iso", "adw_build_iso"]
        }))

        result = sync_workflow_names(dry_run=False)

        assert result['scanned'] == 1
        assert result['skipped'] == 1  # Skipped because deleted
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_skips_dirs_without_json_file(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips directories without adw_state.json."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory WITHOUT JSON file
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()

        result = sync_workflow_names(dry_run=False)

        assert result['scanned'] == 1
        assert result['skipped'] == 1
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_skips_json_without_all_adws(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips JSON files without all_adws array."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create ADW directory with JSON file missing all_adws
        adw_dir = temp_agents_dir / "test1234"
        adw_dir.mkdir()
        state_file = adw_dir / "adw_state.json"
        state_file.write_text(json.dumps({
            "other_field": "value"
        }))

        result = sync_workflow_names(dry_run=False)

        assert result['scanned'] == 1
        assert result['skipped'] == 1
        assert result['updated'] == 0

    @patch('sync_workflow_names.get_project_root')
    def test_skips_invalid_adw_id_format(self, mock_root, temp_db, temp_agents_dir):
        """sync_workflow_names() skips directories with invalid ADW ID format."""
        mock_root.return_value = temp_agents_dir.parent

        # Create database directory structure
        db_dir = temp_agents_dir.parent / "adws" / "database"
        db_dir.mkdir(parents=True, exist_ok=True)

        db_path = db_dir / "agentickanban.db"
        import shutil
        shutil.copy(str(temp_db), str(db_path))

        # Create directories with invalid ADW ID formats
        (temp_agents_dir / "toolong123").mkdir()  # 10 chars, not 8
        (temp_agents_dir / "short").mkdir()  # 5 chars, not 8
        (temp_agents_dir / "special!").mkdir()  # special chars

        result = sync_workflow_names(dry_run=False)

        # None should be scanned due to invalid ID format
        assert result['scanned'] == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
