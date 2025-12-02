"""
Pytest configuration and fixtures for database consolidation tests.
"""

import os
import sys
import sqlite3
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import pytest

# Set up paths
PROJECT_ROOT = Path(__file__).parent.parent
MAIN_PROJECT_ROOT = PROJECT_ROOT.parent.parent  # AgenticKanban main directory

# Add project paths to sys.path
sys.path.insert(0, str(PROJECT_ROOT / "adws"))
sys.path.insert(0, str(PROJECT_ROOT / "server"))

# Database path
DB_PATH = MAIN_PROJECT_ROOT / "adws" / "database" / "agentickanban.db"


@pytest.fixture(scope="session")
def db_path():
    """Return the path to the database."""
    return DB_PATH


@pytest.fixture
def db_connection():
    """Create a connection to the database."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


@pytest.fixture
def test_adw_id():
    """Generate a unique test ADW ID (8 characters)."""
    import uuid
    # Database requires exactly 8 alphanumeric characters
    return f"ts{uuid.uuid4().hex[:6]}"


@pytest.fixture
def cleanup_test_adws(db_connection):
    """Clean up any test ADWs after each test."""
    created_adws = []

    def register(adw_id):
        created_adws.append(adw_id)
        return adw_id

    yield register

    # Cleanup
    cursor = db_connection.cursor()
    for adw_id in created_adws:
        cursor.execute("DELETE FROM adw_activity_logs WHERE adw_id = ?", (adw_id,))
        cursor.execute("DELETE FROM adw_states WHERE adw_id = ?", (adw_id,))
    db_connection.commit()


@pytest.fixture
def insert_test_adw(db_connection, cleanup_test_adws):
    """Insert a test ADW into the database."""
    def _insert(adw_id, **kwargs):
        cleanup_test_adws(adw_id)

        defaults = {
            "issue_number": 9999,
            "issue_title": "Test ADW",
            "issue_body": "Test body",
            "issue_class": "feature",
            "branch_name": f"test-{adw_id}",
            "worktree_path": None,
            "current_stage": "backlog",
            "status": "pending",
            "is_stuck": 0,
            "model_set": "base",
            "data_source": "kanban",
            "issue_json": None,
            "orchestrator_state": None,
            "plan_file": None,
            "all_adws": "[]",
            "patch_file": None,
            "patch_history": "[]",
            "patch_source_mode": None,
            "backend_port": None,
            "websocket_port": None,
            "frontend_port": None,
        }

        defaults.update(kwargs)

        cursor = db_connection.cursor()
        cursor.execute("""
            INSERT INTO adw_states (
                adw_id, issue_number, issue_title, issue_body, issue_class,
                branch_name, worktree_path, current_stage, status, is_stuck,
                model_set, data_source, issue_json, orchestrator_state,
                plan_file, all_adws, patch_file, patch_history, patch_source_mode,
                backend_port, websocket_port, frontend_port
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            adw_id,
            defaults["issue_number"],
            defaults["issue_title"],
            defaults["issue_body"],
            defaults["issue_class"],
            defaults["branch_name"],
            defaults["worktree_path"],
            defaults["current_stage"],
            defaults["status"],
            defaults["is_stuck"],
            defaults["model_set"],
            defaults["data_source"],
            defaults["issue_json"],
            defaults["orchestrator_state"],
            defaults["plan_file"],
            defaults["all_adws"],
            defaults["patch_file"],
            defaults["patch_history"],
            defaults["patch_source_mode"],
            defaults["backend_port"],
            defaults["websocket_port"],
            defaults["frontend_port"],
        ))
        db_connection.commit()

        return adw_id

    return _insert


@pytest.fixture
def temp_agents_dir(tmp_path):
    """Create a temporary agents directory with test ADW."""
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    return agents_dir


@pytest.fixture
def mock_env_db_only():
    """Set ADW_DB_ONLY=true for test."""
    old_val = os.environ.get("ADW_DB_ONLY")
    os.environ["ADW_DB_ONLY"] = "true"
    yield
    if old_val:
        os.environ["ADW_DB_ONLY"] = old_val
    else:
        os.environ.pop("ADW_DB_ONLY", None)


@pytest.fixture
def mock_env_dual_write():
    """Set ADW_DB_ONLY=false for test."""
    old_val = os.environ.get("ADW_DB_ONLY")
    os.environ["ADW_DB_ONLY"] = "false"
    yield
    if old_val:
        os.environ["ADW_DB_ONLY"] = old_val
    else:
        os.environ.pop("ADW_DB_ONLY", None)
