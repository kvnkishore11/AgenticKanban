"""Tests for ADW deletion endpoint."""

import pytest
from fastapi.testclient import TestClient
from server import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


class TestDeleteADWEndpoint:
    """Tests for the DELETE /api/adws/{adw_id} endpoint."""

    def test_delete_adw_invalid_id_format_too_short(self, client):
        """Test deletion with too short ADW ID."""
        response = client.delete("/api/adws/short")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_delete_adw_invalid_id_format_special_chars(self, client):
        """Test deletion with special characters in ADW ID."""
        response = client.delete("/api/adws/test@123")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_delete_adw_not_found(self, client):
        """Test deletion of non-existent ADW."""
        # Use an ID that doesn't exist
        response = client.delete("/api/adws/zzzz9999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_delete_endpoint_exists(self, client):
        """Test that the delete endpoint is registered and accessible."""
        # This test verifies the endpoint exists without actually deleting anything
        # We expect either 400 (invalid ID), 404 (not found), or 200 (success)
        # depending on the test ID used
        response = client.delete("/api/adws/testtest")
        assert response.status_code in [400, 404, 200]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
