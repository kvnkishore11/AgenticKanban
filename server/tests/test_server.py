"""Tests for server module functionality."""

import pytest

# Note: client, app, and main fixtures are provided by conftest.py


def test_server_main_function_exists(main):
    """Test that server main function exists and can be called."""
    assert callable(main)


def test_server_app_exists(app):
    """Test that FastAPI app instance exists."""
    assert app is not None


def test_health_endpoint(client):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint(client):
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data


def test_adws_list_endpoint(client):
    """Test the ADWs list endpoint."""
    response = client.get("/api/adws/list")
    assert response.status_code == 200
    data = response.json()
    assert "adws" in data
    assert isinstance(data["adws"], list)