"""Shared fixtures for build workflow tests."""

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
    """Create a mock ADW state with build-required fields."""
    state = Mock()
    state.data = {
        "adw_id": "test1234",
        "issue_number": "999",
        "worktree_path": "/path/to/worktree",
        "branch_name": "feat-issue-999-adw-test1234-feature",
        "plan_file": "specs/issue-999-plan.md",
        "websocket_port": "9100",
        "frontend_port": "9200",
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
