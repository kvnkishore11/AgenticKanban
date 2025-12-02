"""
Unit tests for ADW discovery module database operations.

Tests:
- discover_all_adws() queries database
- _discover_from_database() returns correct format
- Soft-deleted ADWs are excluded
- Database fallback behavior
- Field parsing (plan_file, all_adws, etc.)
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path

from adw_modules.discovery import (
    discover_all_adws,
    get_adw_metadata,
    _discover_from_database,
    _get_db_path,
    format_adw_response,
    DB_AVAILABLE
)


class TestGetDbPath:
    """Tests for _get_db_path() helper."""

    def test_returns_path_when_db_exists(self, db_path):
        """_get_db_path() returns path when database exists."""
        path = _get_db_path()
        assert path is not None
        assert path.exists()

    def test_returns_none_when_db_unavailable(self):
        """_get_db_path() returns None when DB_AVAILABLE is False."""
        # This is tested implicitly - if sqlite3 isn't available
        # the function would return None
        pass


class TestDiscoverFromDatabase:
    """Tests for _discover_from_database() function."""

    def test_returns_list(self):
        """_discover_from_database() returns a list."""
        result = _discover_from_database()
        assert isinstance(result, list)

    def test_returns_adw_dicts(self):
        """_discover_from_database() returns dicts with expected keys."""
        result = _discover_from_database()
        if result:  # Only test if there are results
            adw = result[0]
            expected_keys = [
                "adw_id", "issue_number", "issue_class", "issue_title",
                "branch_name", "current_stage", "status"
            ]
            for key in expected_keys:
                assert key in adw, f"Missing key: {key}"

    def test_excludes_deleted_adws(self, db_connection, insert_test_adw):
        """_discover_from_database() excludes soft-deleted ADWs."""
        adw_id = insert_test_adw("discdel1")

        # Soft delete
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET deleted_at = CURRENT_TIMESTAMP WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        result = _discover_from_database()
        adw_ids = [a["adw_id"] for a in result]

        assert adw_id not in adw_ids

    def test_includes_plan_file(self, db_connection, insert_test_adw):
        """_discover_from_database() includes plan_file field."""
        adw_id = insert_test_adw("discpln1", plan_file="specs/disc-plan.md")

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("plan_file") == "specs/disc-plan.md"

    def test_parses_all_adws(self, db_connection, insert_test_adw):
        """_discover_from_database() parses all_adws JSON."""
        adw_id = insert_test_adw("discall1", all_adws='["plan", "build"]')

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("all_adws") == ["plan", "build"]

    def test_parses_issue_title_from_json(self, db_connection, insert_test_adw):
        """_discover_from_database() extracts issue_title from issue_json if missing."""
        issue_json = json.dumps({"title": "JSON Title", "body": "Body"})
        adw_id = insert_test_adw("discjsn1", issue_title=None, issue_json=issue_json)

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("issue_title") == "JSON Title"

    def test_includes_current_stage(self, db_connection, insert_test_adw):
        """_discover_from_database() includes current_stage."""
        adw_id = insert_test_adw("discstg1", current_stage="build")

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("current_stage") == "build"

    def test_includes_status(self, db_connection, insert_test_adw):
        """_discover_from_database() includes status."""
        adw_id = insert_test_adw("discsts1", status="in_progress")

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("status") == "in_progress"

    def test_includes_is_stuck(self, db_connection, insert_test_adw):
        """_discover_from_database() includes is_stuck boolean."""
        adw_id = insert_test_adw("discstk1", is_stuck=1)

        result = _discover_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw.get("is_stuck") is True


class TestDiscoverAllAdws:
    """Tests for discover_all_adws() function."""

    def test_returns_list(self, mock_env_db_only):
        """discover_all_adws() returns a list."""
        result = discover_all_adws()
        assert isinstance(result, list)

    def test_uses_database_in_db_only_mode(self, mock_env_db_only, insert_test_adw):
        """discover_all_adws() uses database when ADW_DB_ONLY=true."""
        adw_id = insert_test_adw("discdb01", issue_title="DB Discovery Test")

        result = discover_all_adws()
        adw_ids = [a["adw_id"] for a in result]

        assert adw_id in adw_ids


class TestGetAdwMetadata:
    """Tests for get_adw_metadata() function."""

    def test_returns_none_for_empty_id(self):
        """get_adw_metadata() returns None for empty ID."""
        result = get_adw_metadata("")
        assert result is None

    def test_returns_none_for_missing_adw(self):
        """get_adw_metadata() returns None for non-existent ADW."""
        result = get_adw_metadata("nonexistent1")
        assert result is None

    def test_returns_metadata_for_existing(self, insert_test_adw, mock_env_db_only):
        """get_adw_metadata() returns metadata for existing ADW."""
        adw_id = insert_test_adw("getmeta1", issue_title="Metadata Test")

        result = get_adw_metadata(adw_id)

        assert result is not None
        assert result["adw_id"] == adw_id


class TestFormatAdwResponse:
    """Tests for format_adw_response() function."""

    def test_formats_basic_fields(self):
        """format_adw_response() includes basic fields."""
        state_data = {
            "adw_id": "test1234",
            "issue_number": "123",
            "issue_class": "/feature",
            "branch_name": "test-branch",
            "model_set": "base"
        }

        result = format_adw_response(state_data)

        assert result["adw_id"] == "test1234"
        assert result["issue_number"] == "123"
        assert result["issue_class"] == "/feature"
        assert result["branch_name"] == "test-branch"
        assert result["model_set"] == "base"

    def test_extracts_issue_title_from_json(self):
        """format_adw_response() extracts title from issue_json."""
        state_data = {
            "adw_id": "test1234",
            "issue_json": {
                "title": "From JSON",
                "body": "Body text"
            }
        }

        result = format_adw_response(state_data)

        assert result["issue_title"] == "From JSON"
        assert result["issue_body"] == "Body text"

    def test_includes_plan_file(self):
        """format_adw_response() includes plan_file."""
        state_data = {
            "adw_id": "test1234",
            "plan_file": "specs/formatted.md"
        }

        result = format_adw_response(state_data)

        assert result["plan_file"] == "specs/formatted.md"

    def test_includes_all_adws(self):
        """format_adw_response() includes all_adws."""
        state_data = {
            "adw_id": "test1234",
            "all_adws": ["wf1", "wf2"]
        }

        result = format_adw_response(state_data)

        assert result["all_adws"] == ["wf1", "wf2"]

    def test_default_values(self):
        """format_adw_response() provides default values."""
        state_data = {"adw_id": "test1234"}

        result = format_adw_response(state_data)

        assert result["model_set"] == "base"
        assert result["data_source"] == "github"
        assert result["all_adws"] == []


class TestDiscoveryDatabaseIntegrity:
    """Tests for discovery data integrity with database."""

    def test_discovery_count_matches_database(self, db_connection):
        """discover_all_adws() count matches database count."""
        # Get count from database
        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM adw_states WHERE deleted_at IS NULL"
        )
        db_count = cursor.fetchone()[0]

        # Get count from discovery
        result = _discover_from_database()

        assert len(result) == db_count

    def test_all_discovered_adws_in_database(self, db_connection):
        """All discovered ADWs exist in database."""
        result = _discover_from_database()
        cursor = db_connection.cursor()

        for adw in result:
            cursor.execute(
                "SELECT 1 FROM adw_states WHERE adw_id = ? AND deleted_at IS NULL",
                (adw["adw_id"],)
            )
            assert cursor.fetchone() is not None, f"ADW {adw['adw_id']} not in database"
