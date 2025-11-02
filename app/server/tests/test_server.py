"""Tests for server module functionality."""

import pytest
from fastapi.testclient import TestClient
from server import app, main


def test_server_main_function_exists():
    """Test that server main function exists and can be called."""
    assert callable(main)


def test_server_app_exists():
    """Test that FastAPI app instance exists."""
    assert app is not None


def test_health_endpoint():
    """Test the health check endpoint."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint():
    """Test the root endpoint."""
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data


def test_adws_list_endpoint():
    """Test the ADWs list endpoint."""
    client = TestClient(app)
    response = client.get("/api/adws/list")
    assert response.status_code == 200
    data = response.json()
    assert "adws" in data
    assert isinstance(data["adws"], list)