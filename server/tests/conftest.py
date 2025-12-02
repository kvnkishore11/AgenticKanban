"""Pytest configuration for server tests."""

import sys
from pathlib import Path
import importlib.util

# Add server directory to path for proper imports
# This must happen before any local imports
server_dir = Path(__file__).parent.parent
if str(server_dir) not in sys.path:
    sys.path.insert(0, str(server_dir))

# Remove parent's server package from the path if present
project_root = server_dir.parent
if str(project_root) in sys.path:
    sys.path.remove(str(project_root))


# Cache for the loaded server module to avoid re-loading
_server_module = None


def load_server_module():
    """Load the server module from server.py directly."""
    global _server_module
    if _server_module is None:
        server_py = server_dir / "server.py"
        spec = importlib.util.spec_from_file_location("server_module", server_py)
        _server_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_server_module)
    return _server_module


import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    server_module = load_server_module()
    return TestClient(server_module.app)


@pytest.fixture
def app():
    """Get the FastAPI app instance."""
    server_module = load_server_module()
    return server_module.app


@pytest.fixture
def main():
    """Get the main function from server module."""
    server_module = load_server_module()
    return server_module.main
