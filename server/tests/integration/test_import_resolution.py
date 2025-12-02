"""
Integration tests for import resolution.

Verifies that all database API imports work correctly without circular import errors.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def test_api_modules_importable():
    """Test that API router modules can be imported without errors."""
    try:
        from server.api import adw_db, issue_tracker
        assert hasattr(adw_db, 'router'), "adw_db should have router attribute"
        assert hasattr(issue_tracker, 'router'), "issue_tracker should have router attribute"
    except ModuleNotFoundError as e:
        pytest.fail(f"Failed to import API modules: {e}")


def test_database_manager_accessible_from_api():
    """Test that get_db_manager can be imported from API modules."""
    try:
        from server.api import adw_db
        from server.core.database import get_db_manager

        # Verify the function is accessible
        assert callable(get_db_manager), "get_db_manager should be callable"

        # Verify it's the same function imported in the API module
        # (This indirectly tests that the import was successful)
        db_manager = get_db_manager()
        assert db_manager is not None
    except ImportError as e:
        pytest.fail(f"Failed to import database manager: {e}")


def test_database_models_importable():
    """Test that database API models can be imported."""
    try:
        from server.models.adw_db_models import (
            ADWStateCreate,
            ADWStateUpdate,
            ADWStateResponse,
            IssueTrackerCreate,
            IssueTrackerResponse,
            IssueAllocationResponse
        )

        # Verify all models are Pydantic BaseModel subclasses
        from pydantic import BaseModel
        assert issubclass(ADWStateCreate, BaseModel)
        assert issubclass(ADWStateUpdate, BaseModel)
        assert issubclass(ADWStateResponse, BaseModel)
        assert issubclass(IssueTrackerCreate, BaseModel)
        assert issubclass(IssueTrackerResponse, BaseModel)
        assert issubclass(IssueAllocationResponse, BaseModel)
    except ImportError as e:
        pytest.fail(f"Failed to import database models: {e}")


def test_no_circular_imports():
    """Test that importing API modules doesn't cause circular import errors."""
    import sys

    # Clear any previously imported server modules to ensure clean test
    modules_to_clear = [k for k in sys.modules.keys() if k.startswith('server.')]
    for module in modules_to_clear:
        del sys.modules[module]

    try:
        # Import in sequence to detect circular dependencies
        from server.core.database import get_db_manager
        from server.models.adw_db_models import ADWStateCreate
        from server.api import adw_db
        from server.api import issue_tracker

        # If we get here without errors, circular imports are resolved
        assert True
    except ImportError as e:
        pytest.fail(f"Circular import detected: {e}")


def test_api_routers_have_routes():
    """Test that API routers have the expected routes registered."""
    from server.api import adw_db, issue_tracker

    # Check adw_db routes
    adw_routes = [route.path for route in adw_db.router.routes]
    assert "/adws" in adw_routes, "adw_db should have /adws route"
    assert "/adws/{adw_id}" in adw_routes, "adw_db should have /adws/{adw_id} route"
    assert "/health" in adw_routes, "adw_db should have /health route"

    # Check issue_tracker routes
    issue_routes = [route.path for route in issue_tracker.router.routes]
    assert "/issues/allocate" in issue_routes, "issue_tracker should have /issues/allocate route"
    assert "/issues" in issue_routes, "issue_tracker should have /issues route"
    assert "/issues/{issue_number}" in issue_routes, "issue_tracker should have /issues/{issue_number} route"
