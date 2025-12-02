"""
Unit tests for JSON to database migration script.

Tests:
- import_adw_to_database() functionality
- Duplicate handling
- Field mapping
- Error handling
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path
from datetime import datetime

# Add scripts path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "server" / "scripts"))

from migrate_json_to_db import (
    import_adw_to_database,
    read_adw_state_json,
    scan_adw_directories,
    get_project_root
)
from core.database import get_db_manager


class TestImportAdwToDatabase:
    """Tests for import_adw_to_database() function."""

    def test_import_new_adw(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() creates new ADW record."""
        test_id = "migtst01"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "issue_number": "9001",
            "issue_class": "/feature",
            "branch_name": "migration-test",
            "plan_file": "specs/migration.md",
            "all_adws": ["wf1", "wf2"],
            "completed": False
        }

        db_manager = get_db_manager()
        result = import_adw_to_database(adw_data, db_manager)

        assert result is True

        # Verify in database
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM adw_states WHERE adw_id = ?", (test_id,))
        row = cursor.fetchone()

        assert row is not None
        assert row["issue_number"] == 9001
        assert row["branch_name"] == "migration-test"
        assert row["plan_file"] == "specs/migration.md"

    def test_import_skips_existing(self, db_connection, insert_test_adw):
        """import_adw_to_database() skips existing ADW."""
        adw_id = insert_test_adw("migtst02", issue_number=9002)

        # Try to import with different data
        adw_data = {
            "adw_id": adw_id,
            "issue_number": "9999",  # Different
            "completed": False
        }

        db_manager = get_db_manager()
        result = import_adw_to_database(adw_data, db_manager)

        assert result == "skipped"  # Returns "skipped" for existing ADWs

        # Original data unchanged
        cursor = db_connection.cursor()
        cursor.execute("SELECT issue_number FROM adw_states WHERE adw_id = ?", (adw_id,))
        row = cursor.fetchone()

        assert row["issue_number"] == 9002  # Original value

    def test_import_strips_issue_class_slash(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() strips leading slash from issue_class."""
        test_id = "migtst03"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "issue_class": "/feature",
            "completed": False
        }

        db_manager = get_db_manager()
        import_adw_to_database(adw_data, db_manager)

        cursor = db_connection.cursor()
        cursor.execute("SELECT issue_class FROM adw_states WHERE adw_id = ?", (test_id,))
        row = cursor.fetchone()

        assert row["issue_class"] == "feature"

    def test_import_extracts_issue_title(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() extracts issue_title from issue_json."""
        test_id = "migtst04"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "issue_json": {
                "title": "Extracted Title",
                "body": "Extracted Body"
            },
            "completed": False
        }

        db_manager = get_db_manager()
        import_adw_to_database(adw_data, db_manager)

        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT issue_title, issue_body FROM adw_states WHERE adw_id = ?",
            (test_id,)
        )
        row = cursor.fetchone()

        assert row["issue_title"] == "Extracted Title"
        assert row["issue_body"] == "Extracted Body"

    def test_import_sets_completed_at(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() sets completed_at for completed ADWs."""
        test_id = "migtst05"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "completed": True
        }

        db_manager = get_db_manager()
        import_adw_to_database(adw_data, db_manager)

        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT completed_at, status FROM adw_states WHERE adw_id = ?",
            (test_id,)
        )
        row = cursor.fetchone()

        assert row["completed_at"] is not None
        assert row["status"] == "completed"

    def test_import_serializes_all_adws(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() serializes all_adws as JSON."""
        test_id = "migtst06"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "all_adws": ["plan", "build", "test"],
            "completed": False
        }

        db_manager = get_db_manager()
        import_adw_to_database(adw_data, db_manager)

        cursor = db_connection.cursor()
        cursor.execute("SELECT all_adws FROM adw_states WHERE adw_id = ?", (test_id,))
        row = cursor.fetchone()

        parsed = json.loads(row["all_adws"])
        assert parsed == ["plan", "build", "test"]

    def test_import_handles_missing_optional_fields(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() handles missing optional fields."""
        test_id = "migtst07"
        cleanup_test_adws(test_id)

        # Minimal data
        adw_data = {
            "adw_id": test_id
        }

        db_manager = get_db_manager()
        result = import_adw_to_database(adw_data, db_manager)

        assert result is True

        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM adw_states WHERE adw_id = ?", (test_id,))
        row = cursor.fetchone()

        assert row is not None
        assert row["current_stage"] == "backlog"
        assert row["status"] == "pending"

    def test_import_requires_adw_id(self, db_connection):
        """import_adw_to_database() requires adw_id."""
        adw_data = {
            "issue_number": "9999"
            # Missing adw_id
        }

        db_manager = get_db_manager()
        result = import_adw_to_database(adw_data, db_manager)

        assert result is False

    def test_import_logs_activity(self, db_connection, cleanup_test_adws):
        """import_adw_to_database() creates activity log entry."""
        test_id = "migtst08"
        cleanup_test_adws(test_id)

        adw_data = {
            "adw_id": test_id,
            "completed": False
        }

        db_manager = get_db_manager()
        import_adw_to_database(adw_data, db_manager)

        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT * FROM adw_activity_logs WHERE adw_id = ?",
            (test_id,)
        )
        row = cursor.fetchone()

        assert row is not None
        assert row["event_type"] == "workflow_started"


class TestMigrationHelpers:
    """Tests for migration helper functions."""

    def test_get_project_root(self):
        """get_project_root() returns valid path."""
        root = get_project_root()
        assert root is not None
        assert root.exists()

    def test_scan_adw_directories(self):
        """scan_adw_directories() returns list of paths."""
        root = get_project_root()
        agents_dir = root / "agents"

        if agents_dir.exists():
            dirs = scan_adw_directories(agents_dir)
            assert isinstance(dirs, list)
            # All returned paths should be directories
            for path in dirs:
                assert path.is_dir()
                # All should have 8-char alphanumeric names
                assert len(path.name) == 8
                assert path.name.isalnum()
