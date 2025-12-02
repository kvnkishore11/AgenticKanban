"""
Unit tests for ADW Database API endpoints.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from server import app
from server.core.database import get_db_manager, reset_db_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Setup and teardown for each test."""
    # Reset database manager before each test
    reset_db_manager()
    yield
    # Cleanup after test
    reset_db_manager()


def test_health_check():
    """Test database health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["healthy"] is True
    assert "database_path" in data
    assert "adw_count" in data


def test_create_adw():
    """Test creating a new ADW state."""
    adw_data = {
        "adw_id": "testadw1",
        "issue_number": 999,
        "issue_title": "Test ADW Creation",
        "issue_class": "feature",
        "current_stage": "backlog",
        "status": "pending",
        "model_set": "base",
        "data_source": "kanban"
    }

    response = client.post("/api/adws", json=adw_data)
    assert response.status_code == 201
    data = response.json()
    assert data["adw_id"] == "testadw1"
    assert data["issue_number"] == 999
    assert data["issue_title"] == "Test ADW Creation"
    assert data["current_stage"] == "backlog"
    assert data["status"] == "pending"


def test_create_adw_duplicate():
    """Test creating duplicate ADW (should fail)."""
    adw_data = {
        "adw_id": "testadw2",
        "issue_number": 1000,
        "issue_title": "Test Duplicate",
    }

    # First creation should succeed
    response1 = client.post("/api/adws", json=adw_data)
    assert response1.status_code == 201

    # Second creation with same adw_id should fail
    response2 = client.post("/api/adws", json=adw_data)
    assert response2.status_code == 409  # Conflict


def test_get_adw():
    """Test retrieving a single ADW by ID."""
    # Create ADW first
    adw_data = {
        "adw_id": "testadw3",
        "issue_number": 1001,
        "issue_title": "Test Get ADW",
    }
    client.post("/api/adws", json=adw_data)

    # Get ADW
    response = client.get("/api/adws/testadw3")
    assert response.status_code == 200
    data = response.json()
    assert data["adw_id"] == "testadw3"
    assert data["issue_number"] == 1001


def test_get_adw_not_found():
    """Test retrieving non-existent ADW."""
    response = client.get("/api/adws/notfound")
    assert response.status_code == 404


def test_list_adws():
    """Test listing all ADWs."""
    # Create multiple ADWs
    for i in range(3):
        adw_data = {
            "adw_id": f"testad{i:02d}",
            "issue_number": 2000 + i,
            "issue_title": f"Test ADW {i}",
            "status": "pending" if i < 2 else "completed"
        }
        client.post("/api/adws", json=adw_data)

    # List all ADWs
    response = client.get("/api/adws")
    assert response.status_code == 200
    data = response.json()
    assert "adws" in data
    assert len(data["adws"]) >= 3

    # Filter by status
    response = client.get("/api/adws?status=completed")
    assert response.status_code == 200
    data = response.json()
    assert all(adw["status"] == "completed" for adw in data["adws"])


def test_update_adw():
    """Test updating an ADW state."""
    # Create ADW
    adw_data = {
        "adw_id": "testadw4",
        "issue_number": 1002,
        "issue_title": "Test Update",
        "status": "pending"
    }
    client.post("/api/adws", json=adw_data)

    # Update status
    update_data = {
        "status": "in_progress",
        "current_stage": "plan"
    }
    response = client.patch("/api/adws/testadw4", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["current_stage"] == "plan"


def test_log_activity():
    """Test logging activity for an ADW."""
    # Create ADW
    adw_data = {
        "adw_id": "testadw5",
        "issue_number": 1003,
        "issue_title": "Test Activity Logging",
    }
    client.post("/api/adws", json=adw_data)

    # Log activity
    activity_data = {
        "event_type": "user_action",
        "event_data": {"action": "clicked_button"},
        "user": "test_user"
    }
    response = client.post("/api/adws/testadw5/activity", json=activity_data)
    assert response.status_code == 201


def test_get_activity_history():
    """Test retrieving activity history for an ADW."""
    # Create ADW
    adw_data = {
        "adw_id": "testadw6",
        "issue_number": 1004,
        "issue_title": "Test Activity History",
    }
    client.post("/api/adws", json=adw_data)

    # Log multiple activities
    for i in range(5):
        activity_data = {
            "event_type": "state_change",
            "field_changed": "status",
            "old_value": "pending",
            "new_value": f"state_{i}"
        }
        client.post("/api/adws/testadw6/activity", json=activity_data)

    # Get activity history
    response = client.get("/api/adws/testadw6/activity")
    assert response.status_code == 200
    data = response.json()
    assert data["adw_id"] == "testadw6"
    assert len(data["activities"]) >= 5  # At least 5 we created + creation activity


def test_create_adw_duplicate_issue_number():
    """Test that creating ADW with duplicate issue_number fails."""
    # First, create an issue in issue_tracker
    db_manager = get_db_manager()
    with db_manager.transaction() as conn:
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
            (5000, "Existing Issue", "default")
        )

    # Try to create ADW with the same issue number
    adw_data = {
        "adw_id": "testadw7",
        "issue_number": 5000,
        "issue_title": "Test Duplicate Issue Number",
    }

    response = client.post("/api/adws", json=adw_data)
    assert response.status_code == 409  # Conflict
    assert "already exists in issue_tracker" in response.json()["detail"]


def test_create_adw_unique_issue_number_succeeds():
    """Test that creating ADW with unique issue_number succeeds."""
    # First, create an issue in issue_tracker
    db_manager = get_db_manager()
    with db_manager.transaction() as conn:
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
            (5001, "Existing Issue", "default")
        )

    # Create ADW with a different issue number
    adw_data = {
        "adw_id": "testadw8",
        "issue_number": 5002,  # Different from 5001
        "issue_title": "Test Unique Issue Number",
    }

    response = client.post("/api/adws", json=adw_data)
    assert response.status_code == 201
    data = response.json()
    assert data["adw_id"] == "testadw8"
    assert data["issue_number"] == 5002


def test_create_adw_without_issue_number():
    """Test that creating ADW without issue_number succeeds (for later allocation)."""
    adw_data = {
        "adw_id": "testadw9",
        "issue_title": "Test Without Issue Number",
    }

    response = client.post("/api/adws", json=adw_data)
    assert response.status_code == 201
    data = response.json()
    assert data["adw_id"] == "testadw9"
    # issue_number should be None or null
    assert data["issue_number"] is None
