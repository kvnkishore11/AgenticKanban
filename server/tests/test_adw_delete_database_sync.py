"""Tests for ADW deletion database synchronization.

These tests verify that deleting an ADW properly updates the database
by setting the deleted_at timestamp, ensuring deleted ADWs don't reappear
after page refresh.
"""

import pytest
import sqlite3
import tempfile
import shutil
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock


class TestDatabaseSoftDeleteUnit:
    """Unit tests for database soft-delete logic."""

    def test_soft_delete_sql_sets_deleted_at(self):
        """Test that the SQL UPDATE correctly sets deleted_at."""
        # Create in-memory database
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()

        # Create table
        cursor.execute("""
            CREATE TABLE adw_states (
                adw_id TEXT PRIMARY KEY,
                deleted_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert test record
        adw_id = "test1234"
        cursor.execute("INSERT INTO adw_states (adw_id) VALUES (?)", (adw_id,))
        conn.commit()

        # Verify deleted_at is NULL
        cursor.execute("SELECT deleted_at FROM adw_states WHERE adw_id = ?", (adw_id,))
        assert cursor.fetchone()[0] is None

        # Run the same SQL as in delete_adw
        cursor.execute("""
            UPDATE adw_states
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE adw_id = ? AND deleted_at IS NULL
        """, (adw_id,))
        rows_affected = cursor.rowcount
        conn.commit()

        # Verify update worked
        assert rows_affected == 1

        # Verify deleted_at is now set
        cursor.execute("SELECT deleted_at FROM adw_states WHERE adw_id = ?", (adw_id,))
        deleted_at = cursor.fetchone()[0]
        assert deleted_at is not None

        conn.close()

    def test_soft_delete_filter_excludes_deleted(self):
        """Test that WHERE deleted_at IS NULL excludes soft-deleted records."""
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE adw_states (
                adw_id TEXT PRIMARY KEY,
                deleted_at TIMESTAMP
            )
        """)

        # Insert active and deleted records
        cursor.execute("INSERT INTO adw_states (adw_id, deleted_at) VALUES (?, NULL)", ("active01",))
        cursor.execute("INSERT INTO adw_states (adw_id, deleted_at) VALUES (?, CURRENT_TIMESTAMP)", ("deleted1",))
        cursor.execute("INSERT INTO adw_states (adw_id, deleted_at) VALUES (?, NULL)", ("active02",))
        conn.commit()

        # Query with soft-delete filter (same as production code)
        cursor.execute("SELECT adw_id FROM adw_states WHERE deleted_at IS NULL")
        results = [row[0] for row in cursor.fetchall()]

        # Only active records should be returned
        assert "active01" in results
        assert "active02" in results
        assert "deleted1" not in results
        assert len(results) == 2

        conn.close()

    def test_idempotent_soft_delete(self):
        """Test that soft-deleting twice doesn't cause errors."""
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE adw_states (
                adw_id TEXT PRIMARY KEY,
                deleted_at TIMESTAMP
            )
        """)

        adw_id = "test1234"
        cursor.execute("INSERT INTO adw_states (adw_id) VALUES (?)", (adw_id,))
        conn.commit()

        # First soft-delete
        cursor.execute("""
            UPDATE adw_states
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE adw_id = ? AND deleted_at IS NULL
        """, (adw_id,))
        first_affected = cursor.rowcount
        conn.commit()

        # Second soft-delete (should affect 0 rows due to deleted_at IS NULL condition)
        cursor.execute("""
            UPDATE adw_states
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE adw_id = ? AND deleted_at IS NULL
        """, (adw_id,))
        second_affected = cursor.rowcount
        conn.commit()

        assert first_affected == 1
        assert second_affected == 0  # Already deleted

        conn.close()


class TestDeleteEndpointWithDatabase:
    """Integration tests for DELETE endpoint with database."""

    @pytest.fixture
    def setup_temp_environment(self):
        """Create temporary test environment with database and agents directory."""
        temp_dir = tempfile.mkdtemp()
        db_dir = Path(temp_dir) / "adws" / "database"
        db_dir.mkdir(parents=True)
        db_path = db_dir / "agentickanban.db"
        agents_dir = Path(temp_dir) / "agents"
        agents_dir.mkdir(parents=True)

        # Initialize database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS adw_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adw_id TEXT NOT NULL UNIQUE,
                issue_number INTEGER,
                issue_title TEXT,
                issue_class TEXT,
                branch_name TEXT,
                worktree_path TEXT,
                current_stage TEXT NOT NULL DEFAULT 'backlog',
                status TEXT NOT NULL DEFAULT 'pending',
                workflow_name TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                deleted_at TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

        yield {
            "temp_dir": Path(temp_dir),
            "db_path": db_path,
            "agents_dir": agents_dir
        }

        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    def test_delete_endpoint_updates_database(self, setup_temp_environment, client):
        """Test that DELETE endpoint sets deleted_at in database."""
        adw_id = "dbtest12"
        db_path = setup_temp_environment["db_path"]
        agents_dir = setup_temp_environment["agents_dir"]

        # Create ADW directory
        adw_dir = agents_dir / adw_id
        adw_dir.mkdir(parents=True)
        (adw_dir / "adw_state.json").write_text(json.dumps({"adw_id": adw_id}))

        # Insert into database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_title, current_stage)
            VALUES (?, ?, ?)
        """, (adw_id, "Test Issue", "plan"))
        conn.commit()
        conn.close()

        # Mock the paths
        import api.adws as adws_module

        original_get_agents = adws_module.get_agents_directory
        original_get_db = adws_module._get_db_path

        try:
            adws_module.get_agents_directory = lambda: agents_dir
            adws_module._get_db_path = lambda: db_path

            response = client.delete(f"/api/adws/{adw_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["db_updated"] is True

            # Verify database was updated
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            cursor.execute("SELECT deleted_at FROM adw_states WHERE adw_id = ?", (adw_id,))
            result = cursor.fetchone()
            conn.close()

            assert result is not None
            assert result[0] is not None, "deleted_at should be set"

        finally:
            adws_module.get_agents_directory = original_get_agents
            adws_module._get_db_path = original_get_db

    def test_delete_without_db_record_returns_false(self, setup_temp_environment, client):
        """Test that deleting ADW without DB record returns db_updated=False."""
        adw_id = "nodbent1"
        agents_dir = setup_temp_environment["agents_dir"]
        db_path = setup_temp_environment["db_path"]

        # Create ADW directory but NO database record
        adw_dir = agents_dir / adw_id
        adw_dir.mkdir(parents=True)
        (adw_dir / "adw_state.json").write_text(json.dumps({"adw_id": adw_id}))

        import api.adws as adws_module

        original_get_agents = adws_module.get_agents_directory
        original_get_db = adws_module._get_db_path

        try:
            adws_module.get_agents_directory = lambda: agents_dir
            adws_module._get_db_path = lambda: db_path

            response = client.delete(f"/api/adws/{adw_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["db_updated"] is False  # No DB record to update

        finally:
            adws_module.get_agents_directory = original_get_agents
            adws_module._get_db_path = original_get_db

    def test_list_excludes_soft_deleted(self, setup_temp_environment, client):
        """Test that list endpoint excludes soft-deleted ADWs."""
        db_path = setup_temp_environment["db_path"]

        # Insert active and soft-deleted records
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_title, current_stage)
            VALUES (?, ?, ?)
        """, ("active01", "Active Issue", "plan"))
        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_title, current_stage, deleted_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, ("deleted1", "Deleted Issue", "plan"))
        conn.commit()
        conn.close()

        import api.adws as adws_module
        original_get_db = adws_module._get_db_path

        try:
            adws_module._get_db_path = lambda: db_path

            response = client.get("/api/adws/list")
            assert response.status_code == 200

            data = response.json()
            adw_ids = [adw["adw_id"] for adw in data.get("adws", [])]

            assert "active01" in adw_ids
            assert "deleted1" not in adw_ids

        finally:
            adws_module._get_db_path = original_get_db


class TestRefreshAfterDeleteFlow:
    """Test the complete flow: delete then refresh shows no deleted ADW."""

    @pytest.fixture
    def full_test_env(self):
        """Create full test environment."""
        temp_dir = tempfile.mkdtemp()
        db_dir = Path(temp_dir) / "adws" / "database"
        db_dir.mkdir(parents=True)
        db_path = db_dir / "agentickanban.db"
        agents_dir = Path(temp_dir) / "agents"
        agents_dir.mkdir(parents=True)

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS adw_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                adw_id TEXT NOT NULL UNIQUE,
                issue_number INTEGER,
                issue_title TEXT,
                issue_class TEXT,
                branch_name TEXT,
                current_stage TEXT NOT NULL DEFAULT 'backlog',
                status TEXT NOT NULL DEFAULT 'pending',
                workflow_name TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                deleted_at TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

        yield {"temp_dir": temp_dir, "db_path": db_path, "agents_dir": agents_dir}

        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    def test_delete_then_list_excludes_deleted(self, full_test_env, client):
        """
        Test complete flow:
        1. ADW exists in DB and filesystem
        2. Delete via API
        3. List endpoint should NOT return deleted ADW
        """
        adw_id = "flowtes1"
        db_path = full_test_env["db_path"]
        agents_dir = Path(full_test_env["agents_dir"])

        # Setup: Create ADW in filesystem
        adw_dir = agents_dir / adw_id
        adw_dir.mkdir(parents=True)
        (adw_dir / "adw_state.json").write_text(json.dumps({"adw_id": adw_id}))

        # Setup: Create ADW in database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO adw_states (adw_id, issue_title, current_stage)
            VALUES (?, ?, ?)
        """, (adw_id, "Flow Test Issue", "plan"))
        conn.commit()
        conn.close()

        import api.adws as adws_module
        original_get_agents = adws_module.get_agents_directory
        original_get_db = adws_module._get_db_path

        try:
            adws_module.get_agents_directory = lambda: agents_dir
            adws_module._get_db_path = lambda: db_path

            # Step 1: Verify ADW appears in list
            response = client.get("/api/adws/list")
            assert response.status_code == 200
            adw_ids_before = [a["adw_id"] for a in response.json().get("adws", [])]
            assert adw_id in adw_ids_before, "ADW should appear before deletion"

            # Step 2: Delete the ADW
            response = client.delete(f"/api/adws/{adw_id}")
            assert response.status_code == 200
            assert response.json()["success"] is True
            assert response.json()["db_updated"] is True

            # Step 3: Verify ADW does NOT appear in list (simulates page refresh)
            response = client.get("/api/adws/list")
            assert response.status_code == 200
            adw_ids_after = [a["adw_id"] for a in response.json().get("adws", [])]
            assert adw_id not in adw_ids_after, \
                f"Deleted ADW {adw_id} should NOT appear after refresh"

        finally:
            adws_module.get_agents_directory = original_get_agents
            adws_module._get_db_path = original_get_db


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
