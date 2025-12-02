"""
Integration tests for database consolidation workflow.

Tests the full flow:
- ADWState save -> Database -> Discovery -> API
- Data integrity across all layers
- Real database operations
- Migration script functionality
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path
from datetime import datetime

# Import modules
from adw_modules.state import ADWState
from adw_modules.discovery import discover_all_adws, get_adw_metadata, _discover_from_database
from api.adws import _list_adws_from_database, _get_adw_from_database


class TestSaveToDiscoveryFlow:
    """Test ADWState.save() -> discover_all_adws() flow."""

    def test_saved_adw_appears_in_discovery(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """ADW saved via ADWState appears in discover_all_adws()."""
        cleanup_test_adws(test_adw_id)

        # Save via ADWState
        state = ADWState(test_adw_id)
        state.update(
            issue_number="111",
            issue_title="Discovery Flow Test",
            issue_class="/feature"
        )
        state.save()

        # Should appear in discovery
        adws = _discover_from_database()
        adw_ids = [a["adw_id"] for a in adws]

        assert test_adw_id in adw_ids

    def test_saved_plan_file_appears_in_discovery(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """plan_file saved via ADWState appears in discovery."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(plan_file="specs/integration-plan.md")
        state.save()

        adws = _discover_from_database()
        adw = next((a for a in adws if a["adw_id"] == test_adw_id), None)

        assert adw is not None
        assert adw.get("plan_file") == "specs/integration-plan.md"

    def test_saved_all_adws_appears_in_discovery(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """all_adws saved via ADWState appears in discovery."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(all_adws=["wf1", "wf2", "wf3"])
        state.save()

        adws = _discover_from_database()
        adw = next((a for a in adws if a["adw_id"] == test_adw_id), None)

        assert adw is not None
        assert adw.get("all_adws") == ["wf1", "wf2", "wf3"]


class TestSaveToAPIFlow:
    """Test ADWState.save() -> API endpoints flow."""

    def test_saved_adw_appears_in_api_list(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """ADW saved via ADWState appears in API list."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(
            issue_number="222",
            issue_title="API List Flow Test"
        )
        state.save()

        adws = _list_adws_from_database()
        adw_ids = [a["adw_id"] for a in adws]

        assert test_adw_id in adw_ids

    def test_saved_adw_retrievable_via_api_get(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """ADW saved via ADWState retrievable via API get."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(
            issue_number="333",
            branch_name="api-get-test",
            model_set="heavy"
        )
        state.save()

        result = _get_adw_from_database(test_adw_id)

        assert result is not None
        assert result["issue_number"] == 333
        assert result["branch_name"] == "api-get-test"
        assert result["model_set"] == "heavy"


class TestLoadFromAPIFlow:
    """Test Database insert -> ADWState.load() flow."""

    def test_direct_insert_loadable(self, db_connection, insert_test_adw, mock_env_db_only):
        """ADW inserted directly into DB is loadable via ADWState."""
        adw_id = insert_test_adw("intload1",
            issue_number=444,
            branch_name="direct-insert-test"
        )

        state = ADWState.load(adw_id)

        assert state is not None
        assert state.get("issue_number") == 444
        assert state.get("branch_name") == "direct-insert-test"


class TestUpdateFlow:
    """Test update operations across layers."""

    def test_update_via_state_reflects_in_api(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Updates via ADWState reflect in API."""
        cleanup_test_adws(test_adw_id)

        # Create
        state = ADWState(test_adw_id)
        state.update(issue_number="500", branch_name="original")
        state.save()

        # Update
        state.update(branch_name="updated-branch")
        state.save()

        # Check API
        result = _get_adw_from_database(test_adw_id)
        assert result["branch_name"] == "updated-branch"

    def test_append_adw_id_persists(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """append_adw_id() changes persist to database."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(all_adws=[])
        state.save()

        state.append_adw_id("workflow1")
        state.save()

        # Load fresh and verify
        loaded = ADWState.load(test_adw_id)
        assert "workflow1" in loaded.get("all_adws")


class TestDatabaseIntegrity:
    """Test database integrity across operations."""

    def test_multiple_saves_same_adw(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Multiple saves to same ADW don't create duplicates."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(issue_number="600")
        state.save()
        state.update(issue_number="601")
        state.save()
        state.update(issue_number="602")
        state.save()

        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM adw_states WHERE adw_id = ?",
            (test_adw_id,)
        )
        count = cursor.fetchone()[0]

        assert count == 1

    def test_json_fields_roundtrip(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Complex JSON fields survive roundtrip."""
        cleanup_test_adws(test_adw_id)

        complex_issue_json = {
            "title": "Complex Issue",
            "body": "Body with special chars: <>&'\"",
            "number": 700,
            "metadata": {
                "nested": {
                    "deeply": ["array", "of", "strings"]
                }
            }
        }

        complex_orchestrator = {
            "workflow_name": "test",
            "stages": ["plan", "build", "test"],
            "execution": {
                "status": "running",
                "current_stage_index": 1
            }
        }

        state = ADWState(test_adw_id)
        state.update(
            issue_json=complex_issue_json,
            orchestrator=complex_orchestrator
        )
        state.save()

        loaded = ADWState.load(test_adw_id)

        assert loaded.get("issue_json") == complex_issue_json
        assert loaded.get("orchestrator") == complex_orchestrator


class TestConcurrentAccess:
    """Test concurrent database access."""

    def test_multiple_readers(self, db_connection, insert_test_adw, mock_env_db_only):
        """Multiple readers can access same ADW."""
        adw_id = insert_test_adw("concrd01", issue_title="Concurrent Read Test")

        # Multiple reads
        results = []
        for _ in range(5):
            result = _get_adw_from_database(adw_id)
            results.append(result)

        # All should return same data
        for result in results:
            assert result is not None
            assert result["adw_id"] == adw_id


class TestMigrationIntegrity:
    """Test migration script data integrity."""

    def test_migrated_adw_complete(self, db_connection, insert_test_adw, mock_env_db_only):
        """Migrated ADW has all fields."""
        adw_id = insert_test_adw("migint01",
            issue_number=800,
            issue_title="Migration Integrity",
            plan_file="specs/migrated.md",
            all_adws='["old_wf1"]'
        )

        # All access methods should work
        state = ADWState.load(adw_id)
        api_result = _get_adw_from_database(adw_id)
        discovery = _discover_from_database()
        disc_result = next((a for a in discovery if a["adw_id"] == adw_id), None)

        assert state is not None
        assert api_result is not None
        assert disc_result is not None

        # All should have consistent data
        assert state.get("plan_file") == "specs/migrated.md"
        assert api_result["plan_file"] == "specs/migrated.md"
        assert disc_result["plan_file"] == "specs/migrated.md"


class TestEdgeCases:
    """Test edge cases in integration."""

    def test_empty_all_adws(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Empty all_adws handled correctly."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(all_adws=[])
        state.save()

        loaded = ADWState.load(test_adw_id)
        assert loaded.get("all_adws") == []

    def test_null_plan_file(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Null plan_file handled correctly."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(plan_file=None)
        state.save()

        loaded = ADWState.load(test_adw_id)
        assert loaded.get("plan_file") is None

    def test_very_long_plan_file_path(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Very long plan_file path handled correctly."""
        cleanup_test_adws(test_adw_id)

        long_path = "specs/" + "very_long_directory/" * 20 + "plan.md"

        state = ADWState(test_adw_id)
        state.update(plan_file=long_path)
        state.save()

        loaded = ADWState.load(test_adw_id)
        assert loaded.get("plan_file") == long_path

    def test_unicode_in_fields(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """Unicode characters in fields handled correctly."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(
            issue_json={
                "title": "Unicode test: ",
                "body": "Japanese: "
            },
            branch_name="test-unicode-branch"
        )
        state.save()

        loaded = ADWState.load(test_adw_id)
        assert "" in loaded.get("issue_json")["title"]
