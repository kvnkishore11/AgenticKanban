"""Tests for patch_history in ADW API responses."""

import pytest
import sqlite3
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import the functions we're testing
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.adws import _get_adw_from_database, _list_adws_from_database


class TestGetAdwFromDatabasePatchHistory:
    """Test cases for patch_history in _get_adw_from_database function."""

    @pytest.fixture
    def temp_db(self, tmp_path):
        """Create a temporary database with test data."""
        db_path = tmp_path / "test_agentickanban.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Create the adw_states table
        cursor.execute("""
            CREATE TABLE adw_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adw_id TEXT NOT NULL UNIQUE,
                issue_number INTEGER,
                issue_title TEXT,
                issue_body TEXT,
                issue_class TEXT,
                branch_name TEXT,
                worktree_path TEXT,
                plan_file TEXT,
                model_set TEXT DEFAULT 'base',
                data_source TEXT DEFAULT 'kanban',
                backend_port INTEGER,
                websocket_port INTEGER,
                frontend_port INTEGER,
                current_stage TEXT,
                status TEXT,
                workflow_name TEXT,
                patch_history TEXT,
                orchestrator_state TEXT,
                issue_json TEXT,
                deleted_at TEXT,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        return db_path

    def test_get_adw_returns_patch_history(self, temp_db):
        """Test that _get_adw_from_database returns patch_history."""
        # Insert test data with patch_history
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        patch_history = [
            {"patch_number": 1, "patch_reason": "Test patch", "status": "completed"},
            {"patch_number": 2, "patch_reason": "Another patch", "status": "pending"}
        ]

        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_number, current_stage, status, patch_history)
            VALUES (?, ?, ?, ?, ?)
        """, ("test1234", 1, "build", "in_progress", json.dumps(patch_history)))
        conn.commit()
        conn.close()

        # Mock _get_db_path to return our temp db
        with patch('api.adws._get_db_path', return_value=temp_db):
            with patch('api.adws.DB_AVAILABLE', True):
                result = _get_adw_from_database("test1234")

        assert result is not None
        assert "patch_history" in result
        assert result["patch_history"] is not None
        assert len(result["patch_history"]) == 2
        assert result["patch_history"][0]["patch_number"] == 1
        assert result["patch_history"][1]["patch_number"] == 2

    def test_get_adw_returns_none_for_null_patch_history(self, temp_db):
        """Test that _get_adw_from_database returns None for null patch_history."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_number, current_stage, status, patch_history)
            VALUES (?, ?, ?, ?, ?)
        """, ("test5678", 2, "plan", "pending", None))
        conn.commit()
        conn.close()

        with patch('api.adws._get_db_path', return_value=temp_db):
            with patch('api.adws.DB_AVAILABLE', True):
                result = _get_adw_from_database("test5678")

        assert result is not None
        assert "patch_history" in result
        assert result["patch_history"] is None

    def test_get_adw_returns_orchestrator_state(self, temp_db):
        """Test that _get_adw_from_database returns orchestrator_state."""
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        orchestrator_state = {
            "workflow_name": "dynamic_plan_build_test",
            "stages": ["plan", "build", "test"],
            "execution": {"status": "running"}
        }

        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_number, current_stage, status, orchestrator_state)
            VALUES (?, ?, ?, ?, ?)
        """, ("test9999", 3, "test", "in_progress", json.dumps(orchestrator_state)))
        conn.commit()
        conn.close()

        with patch('api.adws._get_db_path', return_value=temp_db):
            with patch('api.adws.DB_AVAILABLE', True):
                result = _get_adw_from_database("test9999")

        assert result is not None
        assert "orchestrator_state" in result
        assert result["orchestrator_state"] is not None
        assert result["orchestrator_state"]["workflow_name"] == "dynamic_plan_build_test"


class TestListAdwsFromDatabasePatchHistory:
    """Test cases for patch_history in _list_adws_from_database function."""

    @pytest.fixture
    def temp_db_with_multiple_adws(self, tmp_path):
        """Create a temporary database with multiple ADWs."""
        db_path = tmp_path / "test_agentickanban.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Create the adw_states table
        cursor.execute("""
            CREATE TABLE adw_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adw_id TEXT NOT NULL UNIQUE,
                issue_number INTEGER,
                issue_title TEXT,
                issue_body TEXT,
                issue_class TEXT,
                branch_name TEXT,
                worktree_path TEXT,
                plan_file TEXT,
                model_set TEXT DEFAULT 'base',
                data_source TEXT DEFAULT 'kanban',
                backend_port INTEGER,
                websocket_port INTEGER,
                frontend_port INTEGER,
                current_stage TEXT,
                status TEXT,
                workflow_name TEXT,
                patch_history TEXT,
                orchestrator_state TEXT,
                issue_json TEXT,
                deleted_at TEXT,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert multiple ADWs
        patch_history1 = [{"patch_number": 1, "status": "completed"}]
        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_number, issue_title, current_stage, status, patch_history)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("adw11111", 1, "Test ADW 1", "build", "in_progress", json.dumps(patch_history1)))

        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_number, issue_title, current_stage, status, patch_history)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("adw22222", 2, "Test ADW 2", "plan", "pending", None))

        conn.commit()
        conn.close()
        return db_path

    def test_list_adws_includes_patch_history(self, temp_db_with_multiple_adws):
        """Test that _list_adws_from_database includes patch_history in results."""
        with patch('api.adws._get_db_path', return_value=temp_db_with_multiple_adws):
            with patch('api.adws.DB_AVAILABLE', True):
                result = _list_adws_from_database()

        assert len(result) == 2

        # Find the ADW with patch_history
        adw_with_patch = next((a for a in result if a["adw_id"] == "adw11111"), None)
        assert adw_with_patch is not None
        assert "patch_history" in adw_with_patch
        assert adw_with_patch["patch_history"] is not None
        assert len(adw_with_patch["patch_history"]) == 1

        # Find the ADW without patch_history
        adw_without_patch = next((a for a in result if a["adw_id"] == "adw22222"), None)
        assert adw_without_patch is not None
        assert "patch_history" in adw_without_patch
        assert adw_without_patch["patch_history"] is None

    def test_list_adws_includes_orchestrator_state(self, temp_db_with_multiple_adws):
        """Test that _list_adws_from_database includes orchestrator_state in results."""
        # Add orchestrator_state to one ADW
        conn = sqlite3.connect(str(temp_db_with_multiple_adws))
        cursor = conn.cursor()

        orchestrator_state = {"workflow_name": "test_workflow"}
        cursor.execute("""
            UPDATE adw_states SET orchestrator_state = ? WHERE adw_id = ?
        """, (json.dumps(orchestrator_state), "adw11111"))
        conn.commit()
        conn.close()

        with patch('api.adws._get_db_path', return_value=temp_db_with_multiple_adws):
            with patch('api.adws.DB_AVAILABLE', True):
                result = _list_adws_from_database()

        adw_with_orch = next((a for a in result if a["adw_id"] == "adw11111"), None)
        assert adw_with_orch is not None
        assert "orchestrator_state" in adw_with_orch
        assert adw_with_orch["orchestrator_state"]["workflow_name"] == "test_workflow"
