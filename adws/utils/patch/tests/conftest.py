"""Shared fixtures for patch workflow tests."""

import pytest
import logging
from unittest.mock import Mock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


@pytest.fixture
def mock_logger():
    """Create a mock logger."""
    logger = Mock(spec=logging.Logger)
    logger.info = Mock()
    logger.debug = Mock()
    logger.warning = Mock()
    logger.error = Mock()
    return logger


@pytest.fixture
def mock_notifier():
    """Create a mock WebSocket notifier."""
    notifier = Mock()
    notifier.notify_start = Mock()
    notifier.notify_progress = Mock()
    notifier.notify_log = Mock()
    notifier.notify_error = Mock()
    notifier.notify_complete = Mock()
    return notifier


@pytest.fixture
def mock_state():
    """Create a mock ADW state."""
    state = Mock()
    state.data = {
        "adw_id": "test1234",
        "issue_number": "999",
    }
    state.get = Mock(side_effect=lambda key, default=None: state.data.get(key, default))
    state.update = Mock(side_effect=lambda **kwargs: state.data.update(kwargs))
    state.save = Mock()
    state.append_adw_id = Mock()
    return state


@pytest.fixture
def mock_issue():
    """Create a mock GitHub issue."""
    issue = Mock()
    issue.number = 999
    issue.title = "Test Feature: Add user profile"
    issue.body = "As a user, I want to view my profile..."
    issue.model_dump_json = Mock(return_value='{"number": 999, "title": "Test Feature", "body": "Test body"}')
    return issue


@pytest.fixture
def sample_issue_json():
    """Sample issue JSON for testing."""
    return {
        "title": "Test Feature: Add user profile page",
        "body": "As a user, I want to view my profile so that I can see my information.",
        "number": 999,
        "workItemType": "feature",
        "images": [],
    }


@pytest.fixture
def mock_patch_content():
    """Sample patch content for testing."""
    return "Fix the button color to be blue instead of red"


@pytest.fixture
def mock_worktree_path(tmp_path):
    """Create a temporary worktree path."""
    worktree = tmp_path / "trees" / "test1234"
    worktree.mkdir(parents=True)
    return str(worktree)
