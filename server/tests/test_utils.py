"""Tests for core utilities functionality."""

from core.utils import helper_function


def test_helper_function_exists():
    """Test that helper function exists and can be called."""
    assert callable(helper_function)


def test_helper_function_returns_true():
    """Test that helper function returns True as expected."""
    result = helper_function()
    assert result is True
    assert isinstance(result, bool)