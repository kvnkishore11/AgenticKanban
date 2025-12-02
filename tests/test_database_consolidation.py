#!/usr/bin/env python3
"""
Tests for Database Consolidation (Issue #31)

Verifies that the ADW state management system uses database as the single source of truth.
These are high-level integration tests. See tests/unit/ for detailed unit tests.
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path

# Add project paths
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "adws"))
sys.path.insert(0, str(project_root / "server"))


class TestDatabaseSchema:
    """Tests for database schema completeness."""

    def test_schema_has_plan_file_column(self, db_connection):
        """Verify plan_file column exists in adw_states table."""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(adw_states)")
        columns = {row[1] for row in cursor.fetchall()}
        assert "plan_file" in columns, "plan_file column missing from adw_states"

    def test_schema_has_all_adws_column(self, db_connection):
        """Verify all_adws column exists in adw_states table."""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(adw_states)")
        columns = {row[1] for row in cursor.fetchall()}
        assert "all_adws" in columns, "all_adws column missing from adw_states"

    def test_schema_has_required_columns(self, db_connection):
        """Verify all required columns exist in adw_states table."""
        required_columns = [
            "id", "adw_id", "issue_number", "issue_title", "issue_body",
            "issue_class", "branch_name", "worktree_path", "current_stage",
            "status", "is_stuck", "model_set", "data_source", "issue_json",
            "orchestrator_state", "plan_file", "all_adws", "patch_file",
            "patch_history", "patch_source_mode", "backend_port",
            "websocket_port", "frontend_port", "created_at", "updated_at",
            "completed_at", "deleted_at"
        ]

        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(adw_states)")
        columns = {row[1] for row in cursor.fetchall()}

        for col in required_columns:
            assert col in columns, f"Required column {col} missing from adw_states"


class TestADWStateDatabaseOnly:
    """Tests for ADWState class database-only mode."""

    def test_db_only_mode_enabled_by_default(self, mock_env_db_only):
        """Verify ADW_DB_ONLY defaults to true."""
        from adw_modules.state import ADWState
        state = ADWState("test1234")
        assert state._db_only_mode is True, "DB-only mode should be enabled by default"

    def test_db_only_mode_can_be_disabled(self, mock_env_dual_write):
        """Verify ADW_DB_ONLY=false enables dual-write mode."""
        import importlib
        import adw_modules.state
        importlib.reload(adw_modules.state)
        from adw_modules.state import ADWState

        state = ADWState("test1234")
        assert state._db_only_mode is False, "DB-only mode should be disabled"


class TestDiscoveryModule:
    """Tests for discovery module database integration."""

    def test_discover_returns_list(self, mock_env_db_only):
        """Verify discover_all_adws() returns a list."""
        from adw_modules.discovery import discover_all_adws
        result = discover_all_adws()
        assert isinstance(result, list)

    def test_discover_count_matches_database(self, db_connection, mock_env_db_only):
        """Verify discovery count matches database count."""
        from adw_modules.discovery import _discover_from_database

        cursor = db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM adw_states WHERE deleted_at IS NULL")
        db_count = cursor.fetchone()[0]

        result = _discover_from_database()
        assert len(result) == db_count


class TestAPIEndpoints:
    """Tests for API endpoint database integration."""

    def test_list_adws_returns_list(self):
        """Verify _list_adws_from_database() returns a list."""
        from api.adws import _list_adws_from_database
        result = _list_adws_from_database()
        assert isinstance(result, list)

    def test_api_count_matches_database(self, db_connection):
        """Verify API list count matches database count."""
        from api.adws import _list_adws_from_database

        cursor = db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM adw_states WHERE deleted_at IS NULL")
        db_count = cursor.fetchone()[0]

        result = _list_adws_from_database()
        assert len(result) == db_count
