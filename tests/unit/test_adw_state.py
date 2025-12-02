"""
Unit tests for ADWState class database operations.

Tests:
- Database-only mode behavior
- save() writes to database
- load() reads from database
- update() modifies data correctly
- JSON field serialization
- plan_file and all_adws handling
"""

import os
import sys
import json
import sqlite3
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import from conftest sets up paths
from adw_modules.state import ADWState, DB_AVAILABLE


class TestADWStateInit:
    """Tests for ADWState initialization."""

    def test_init_requires_adw_id(self):
        """ADWState requires a non-empty adw_id."""
        with pytest.raises(ValueError, match="adw_id is required"):
            ADWState("")

        with pytest.raises(ValueError, match="adw_id is required"):
            ADWState(None)

    def test_init_sets_adw_id(self, test_adw_id):
        """ADWState stores the adw_id correctly."""
        state = ADWState(test_adw_id)
        assert state.adw_id == test_adw_id
        assert state.data["adw_id"] == test_adw_id

    def test_init_db_only_mode_default(self, mock_env_db_only):
        """ADW_DB_ONLY=true enables database-only mode."""
        state = ADWState("test1234")
        assert state._db_only_mode is True

    def test_init_dual_write_mode(self, mock_env_dual_write):
        """ADW_DB_ONLY=false enables dual-write mode."""
        # Need to reimport to pick up env change
        import importlib
        import adw_modules.state
        importlib.reload(adw_modules.state)
        from adw_modules.state import ADWState

        state = ADWState("test1234")
        assert state._db_only_mode is False


class TestADWStateUpdate:
    """Tests for ADWState.update() method."""

    def test_update_single_field(self, test_adw_id):
        """update() modifies a single field."""
        state = ADWState(test_adw_id)
        state.update(issue_number="123")
        assert state.data["issue_number"] == "123"

    def test_update_multiple_fields(self, test_adw_id):
        """update() modifies multiple fields."""
        state = ADWState(test_adw_id)
        state.update(
            issue_number="456",
            branch_name="test-branch",
            issue_class="/feature"
        )
        assert state.data["issue_number"] == "456"
        assert state.data["branch_name"] == "test-branch"
        assert state.data["issue_class"] == "/feature"

    def test_update_plan_file(self, test_adw_id):
        """update() sets plan_file correctly."""
        state = ADWState(test_adw_id)
        state.update(plan_file="specs/test-plan.md")
        assert state.data["plan_file"] == "specs/test-plan.md"

    def test_update_all_adws(self, test_adw_id):
        """update() sets all_adws correctly."""
        state = ADWState(test_adw_id)
        state.update(all_adws=["plan", "build", "test"])
        assert state.data["all_adws"] == ["plan", "build", "test"]

    def test_update_orchestrator_dict(self, test_adw_id):
        """update() handles orchestrator dict."""
        state = ADWState(test_adw_id)
        orchestrator = {
            "workflow_name": "test_workflow",
            "stages": ["plan", "build"],
            "status": "running"
        }
        state.update(orchestrator=orchestrator)
        assert state.data["orchestrator"] == orchestrator


class TestADWStateSave:
    """Tests for ADWState.save() method."""

    def test_save_creates_database_record(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """save() creates a new record in database."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(
            issue_number="789",
            issue_class="/feature",
            branch_name="save-test"
        )
        state.save()

        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM adw_states WHERE adw_id = ?", (test_adw_id,))
        row = cursor.fetchone()

        assert row is not None, "Record should be created"
        assert row["issue_number"] == 789
        assert row["branch_name"] == "save-test"

    def test_save_updates_existing_record(self, db_connection, insert_test_adw, mock_env_db_only):
        """save() updates existing record in database."""
        adw_id = insert_test_adw("savupd01", issue_number=100)

        state = ADWState(adw_id)
        state.update(
            issue_number="100",
            branch_name="updated-branch"
        )
        state.save()

        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM adw_states WHERE adw_id = ?", (adw_id,))
        row = cursor.fetchone()

        assert row["branch_name"] == "updated-branch"

    def test_save_serializes_plan_file(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """save() stores plan_file in database."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(plan_file="specs/my-plan.md")
        state.save()

        cursor = db_connection.cursor()
        cursor.execute("SELECT plan_file FROM adw_states WHERE adw_id = ?", (test_adw_id,))
        row = cursor.fetchone()

        assert row["plan_file"] == "specs/my-plan.md"

    def test_save_serializes_all_adws(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """save() stores all_adws as JSON in database."""
        cleanup_test_adws(test_adw_id)

        state = ADWState(test_adw_id)
        state.update(all_adws=["workflow1", "workflow2"])
        state.save()

        cursor = db_connection.cursor()
        cursor.execute("SELECT all_adws FROM adw_states WHERE adw_id = ?", (test_adw_id,))
        row = cursor.fetchone()

        assert row["all_adws"] is not None
        parsed = json.loads(row["all_adws"])
        assert parsed == ["workflow1", "workflow2"]

    def test_save_serializes_issue_json(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """save() stores issue_json as JSON in database."""
        cleanup_test_adws(test_adw_id)

        issue_json = {
            "title": "Test Issue",
            "body": "Test body",
            "number": 123
        }

        state = ADWState(test_adw_id)
        state.update(issue_json=issue_json)
        state.save()

        cursor = db_connection.cursor()
        cursor.execute("SELECT issue_json FROM adw_states WHERE adw_id = ?", (test_adw_id,))
        row = cursor.fetchone()

        assert row["issue_json"] is not None
        parsed = json.loads(row["issue_json"])
        assert parsed["title"] == "Test Issue"


class TestADWStateLoad:
    """Tests for ADWState.load() method."""

    def test_load_returns_none_for_missing(self, mock_env_db_only):
        """load() returns None for non-existent ADW."""
        result = ADWState.load("nonexistent123")
        assert result is None

    def test_load_reads_from_database(self, insert_test_adw, mock_env_db_only):
        """load() reads ADW data from database."""
        adw_id = insert_test_adw("loadtst1",
            issue_number=555,
            issue_title="Load Test",
            branch_name="load-test-branch"
        )

        state = ADWState.load(adw_id)

        assert state is not None
        assert state.adw_id == adw_id
        assert state.get("issue_number") == 555
        assert state.get("branch_name") == "load-test-branch"

    def test_load_parses_plan_file(self, insert_test_adw, mock_env_db_only):
        """load() correctly parses plan_file."""
        adw_id = insert_test_adw("loadtst2", plan_file="specs/loaded-plan.md")

        state = ADWState.load(adw_id)

        assert state.get("plan_file") == "specs/loaded-plan.md"

    def test_load_parses_all_adws(self, insert_test_adw, mock_env_db_only):
        """load() correctly parses all_adws JSON."""
        adw_id = insert_test_adw("loadtst3", all_adws='["wf1", "wf2", "wf3"]')

        state = ADWState.load(adw_id)

        assert state.get("all_adws") == ["wf1", "wf2", "wf3"]

    def test_load_parses_issue_json(self, db_connection, insert_test_adw, mock_env_db_only):
        """load() correctly parses issue_json."""
        issue_data = json.dumps({"title": "Parsed Issue", "number": 777})
        adw_id = insert_test_adw("loadtst4", issue_json=issue_data)

        state = ADWState.load(adw_id)

        assert state.get("issue_json") is not None
        assert state.get("issue_json")["title"] == "Parsed Issue"

    def test_load_parses_orchestrator_state(self, db_connection, insert_test_adw, mock_env_db_only):
        """load() correctly parses orchestrator_state."""
        orch_data = json.dumps({
            "workflow_name": "test",
            "stages": ["plan"],
            "status": "completed"
        })
        adw_id = insert_test_adw("loadtst5", orchestrator_state=orch_data)

        state = ADWState.load(adw_id)

        assert state.get("orchestrator") is not None
        assert state.get("orchestrator")["status"] == "completed"

    def test_load_excludes_deleted(self, db_connection, insert_test_adw, mock_env_db_only):
        """load() returns None for soft-deleted ADWs."""
        adw_id = insert_test_adw("loadtst6")

        # Soft delete
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE adw_states SET deleted_at = CURRENT_TIMESTAMP WHERE adw_id = ?",
            (adw_id,)
        )
        db_connection.commit()

        state = ADWState.load(adw_id)
        assert state is None


class TestADWStateGetSet:
    """Tests for ADWState.get() and set() methods."""

    def test_get_returns_value(self, test_adw_id):
        """get() returns stored value."""
        state = ADWState(test_adw_id)
        state.data["test_field"] = "test_value"
        assert state.get("test_field") == "test_value"

    def test_get_returns_default(self, test_adw_id):
        """get() returns default for missing key."""
        state = ADWState(test_adw_id)
        assert state.get("missing", "default") == "default"

    def test_get_returns_none_for_missing(self, test_adw_id):
        """get() returns None for missing key without default."""
        state = ADWState(test_adw_id)
        assert state.get("missing") is None


class TestADWStateAppendAdwId:
    """Tests for ADWState.append_adw_id() method."""

    def test_append_adw_id_to_empty(self, test_adw_id):
        """append_adw_id() adds to empty list."""
        state = ADWState(test_adw_id)
        state.append_adw_id("workflow1")
        assert state.get("all_adws") == ["workflow1"]

    def test_append_adw_id_to_existing(self, test_adw_id):
        """append_adw_id() adds to existing list."""
        state = ADWState(test_adw_id)
        state.update(all_adws=["workflow1"])
        state.append_adw_id("workflow2")
        assert state.get("all_adws") == ["workflow1", "workflow2"]

    def test_append_adw_id_no_duplicates(self, test_adw_id):
        """append_adw_id() doesn't add duplicates."""
        state = ADWState(test_adw_id)
        state.update(all_adws=["workflow1"])
        state.append_adw_id("workflow1")
        assert state.get("all_adws") == ["workflow1"]


class TestADWStateRoundTrip:
    """Tests for save/load round-trip data integrity."""

    def test_roundtrip_preserves_all_fields(self, db_connection, test_adw_id, cleanup_test_adws, mock_env_db_only):
        """save() then load() preserves all field values."""
        cleanup_test_adws(test_adw_id)

        original = ADWState(test_adw_id)
        original.update(
            issue_number="999",
            branch_name="roundtrip-test",
            plan_file="specs/roundtrip.md",
            all_adws=["wf1", "wf2"],
            issue_class="/feature",
            model_set="heavy",
            data_source="github",
            issue_json={"title": "Roundtrip", "number": 999},
            orchestrator={
                "workflow_name": "test",
                "stages": ["plan", "build"],
                "status": "running"
            }
        )
        original.save()

        loaded = ADWState.load(test_adw_id)

        assert loaded is not None
        # issue_number may come back as int from database
        assert str(loaded.get("issue_number")) == "999"
        assert loaded.get("branch_name") == "roundtrip-test"
        assert loaded.get("plan_file") == "specs/roundtrip.md"
        assert loaded.get("all_adws") == ["wf1", "wf2"]
        assert loaded.get("issue_class") == "/feature"
        assert loaded.get("model_set") == "heavy"
        assert loaded.get("data_source") == "github"
        assert loaded.get("issue_json")["title"] == "Roundtrip"
        assert loaded.get("orchestrator")["status"] == "running"
