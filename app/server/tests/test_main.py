"""Tests for main module functionality."""

import pytest
from main import main


def test_main_function_exists():
    """Test that main function exists and can be called."""
    assert callable(main)


def test_main_function_runs():
    """Test that main function runs without error."""
    try:
        main()
        assert True
    except Exception as e:
        pytest.fail(f"main() function raised an exception: {e}")