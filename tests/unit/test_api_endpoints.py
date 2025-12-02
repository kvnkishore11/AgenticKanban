"""
Unit tests for ADW API endpoints database operations.

Tests:
- _list_adws_from_database() returns correct data
- _get_adw_from_database() returns correct data
- list_adws endpoint uses database
- get_adw_details endpoint uses database
- Deleted ADWs are excluded
- Field parsing
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path

# Import API functions
from api.adws import (
    _list_adws_from_database,
    _get_adw_from_database,
    _get_db_path,
    DB_AVAILABLE
)


class TestGetDbPath:
    """Tests for API _get_db_path() helper."""

    def test_returns_path_when_exists(self, db_path):
        """_get_db_path() returns path when database exists."""
        path = _get_db_path()
        assert path is not None
        assert path.exists()


class TestListAdwsFromDatabase:
    """Tests for _list_adws_from_database() function."""

    def test_returns_list(self):
        """_list_adws_from_database() returns a list."""
        result = _list_adws_from_database()
        assert isinstance(result, list)

    def test_returns_adw_dicts_with_keys(self):
        """_list_adws_from_database() returns dicts with expected keys."""
        result = _list_adws_from_database()
        if result:
            adw = result[0]
            expected_keys = [
                "adw_id", "issue_class", "issue_number",
                "issue_title", "branch_name", "completed"
            ]
            for key in expected_keys:
                assert key in adw, f"Missing key: {key}"

    def test_excludes_deleted_adws(self, db_connection, insert_test_adw):
        """_list_adws_from_database() excludes soft-deleted ADWs."""
        adw_id = insert_test_adw("apilst01")

        # Soft delete
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET deleted_at = CURRENT_TIMESTAMP WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        result = _list_adws_from_database()
        adw_ids = [a["adw_id"] for a in result]

        assert adw_id not in adw_ids

    def test_strips_leading_slash_from_issue_class(self, db_connection, insert_test_adw):
        """_list_adws_from_database() strips leading slash from issue_class."""
        adw_id = insert_test_adw("apilst02", issue_class="/feature")

        result = _list_adws_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert adw["issue_class"] == "feature"

    def test_completed_is_boolean(self, db_connection, insert_test_adw):
        """_list_adws_from_database() returns completed as boolean."""
        adw_id = insert_test_adw("apilst03")

        result = _list_adws_from_database()
        adw = next((a for a in result if a["adw_id"] == adw_id), None)

        assert adw is not None
        assert isinstance(adw["completed"], bool)


class TestGetAdwFromDatabase:
    """Tests for _get_adw_from_database() function."""

    def test_returns_none_for_missing(self):
        """_get_adw_from_database() returns None for non-existent ADW."""
        result = _get_adw_from_database("nonexistent")
        assert result is None

    def test_returns_adw_dict(self, insert_test_adw):
        """_get_adw_from_database() returns dict for existing ADW."""
        adw_id = insert_test_adw("apiget01", issue_title="API Get Test")

        result = _get_adw_from_database(adw_id)

        assert result is not None
        assert isinstance(result, dict)
        assert result["adw_id"] == adw_id

    def test_includes_all_fields(self, insert_test_adw):
        """_get_adw_from_database() includes all expected fields."""
        adw_id = insert_test_adw("apiget02",
            issue_number=888,
            issue_title="Full Fields Test",
            branch_name="api-test-branch",
            worktree_path="/path/to/worktree",
            plan_file="specs/api-plan.md",
            model_set="heavy",
            data_source="github"
        )

        result = _get_adw_from_database(adw_id)

        assert result["issue_number"] == 888
        assert result["branch_name"] == "api-test-branch"
        assert result["worktree_path"] == "/path/to/worktree"
        assert result["plan_file"] == "specs/api-plan.md"
        assert result["model_set"] == "heavy"
        assert result["data_source"] == "github"

    def test_parses_issue_json(self, db_connection, insert_test_adw):
        """_get_adw_from_database() parses issue_json."""
        issue_json = json.dumps({
            "title": "API JSON Test",
            "body": "Test body",
            "number": 777
        })
        adw_id = insert_test_adw("apiget03", issue_json=issue_json)

        result = _get_adw_from_database(adw_id)

        assert result["issue_json"] is not None
        assert result["issue_json"]["title"] == "API JSON Test"

    def test_excludes_deleted(self, db_connection, insert_test_adw):
        """_get_adw_from_database() returns None for deleted ADWs."""
        adw_id = insert_test_adw("apiget04")

        # Soft delete
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET deleted_at = CURRENT_TIMESTAMP WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        result = _get_adw_from_database(adw_id)
        assert result is None

    def test_includes_current_stage_and_status(self, insert_test_adw):
        """_get_adw_from_database() includes current_stage and status."""
        adw_id = insert_test_adw("apiget05",
            current_stage="review",
            status="in_progress"
        )

        result = _get_adw_from_database(adw_id)

        assert result["current_stage"] == "review"
        assert result["status"] == "in_progress"

    def test_completed_from_completed_at(self, db_connection, insert_test_adw):
        """_get_adw_from_database() derives completed from completed_at."""
        adw_id = insert_test_adw("apiget06")

        # Set completed_at
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET completed_at = CURRENT_TIMESTAMP WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        result = _get_adw_from_database(adw_id)

        assert result["completed"] is True


class TestAPIDataIntegrity:
    """Tests for API data integrity with database."""

    def test_list_count_matches_database(self, db_connection):
        """API list count matches database count."""
        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM adw_states WHERE deleted_at IS NULL"
        )
        db_count = cursor.fetchone()[0]

        result = _list_adws_from_database()

        assert len(result) == db_count

    def test_get_returns_same_as_database(self, db_connection, insert_test_adw):
        """API get returns same data as database."""
        adw_id = insert_test_adw("apiint01",
            issue_number=555,
            issue_title="Integrity Test"
        )

        result = _get_adw_from_database(adw_id)

        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT issue_number, issue_title FROM adw_states WHERE adw_id = ?",
            (adw_id,)
        )
        row = cursor.fetchone()

        assert result["issue_number"] == row[0]


class TestAPIEdgeCases:
    """Tests for API edge cases."""

    def test_empty_string_issue_class(self, insert_test_adw):
        """API handles empty issue_class."""
        adw_id = insert_test_adw("apiedg01", issue_class="")

        result = _get_adw_from_database(adw_id)

        assert result is not None
        assert result.get("issue_class") == ""

    def test_null_fields(self, insert_test_adw):
        """API handles null fields gracefully."""
        adw_id = insert_test_adw("apiedg02",
            branch_name=None,
            worktree_path=None,
            plan_file=None
        )

        result = _get_adw_from_database(adw_id)

        assert result is not None
        assert result.get("branch_name") is None
        assert result.get("worktree_path") is None
        assert result.get("plan_file") is None

    def test_invalid_json_in_issue_json(self, db_connection, insert_test_adw):
        """API handles invalid JSON in issue_json field."""
        adw_id = insert_test_adw("apiedg03")

        # Insert invalid JSON directly
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET issue_json = 'not valid json' WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        result = _get_adw_from_database(adw_id)

        assert result is not None
        assert result.get("issue_json") is None  # Should fail gracefully

    def test_special_characters_in_fields(self, insert_test_adw):
        """API handles special characters in fields."""
        adw_id = insert_test_adw("apiedg04",
            issue_title="Test with 'quotes' and \"double quotes\"",
            branch_name="test/with/slashes"
        )

        result = _get_adw_from_database(adw_id)

        assert result is not None
        assert "quotes" in result["issue_title"]
        assert result["branch_name"] == "test/with/slashes"
