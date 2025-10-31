"""Tests for server module functionality."""

import pytest
from server import main


def test_server_main_function_exists():
    """Test that server main function exists and can be called."""
    assert callable(main)


def test_server_main_function_runs():
    """Test that server main function runs without error."""
    try:
        main()
        assert True
    except Exception as e:
        pytest.fail(f"server.main() function raised an exception: {e}")