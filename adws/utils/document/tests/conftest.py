"""Shared fixtures for document workflow tests."""

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
        "worktree_path": "/tmp/trees/test1234",
        "websocket_port": "9100",
        "frontend_port": "9200",
        "issue_class": "/feature",
    }
    state.get = Mock(side_effect=lambda key, default=None: state.data.get(key, default))
    state.update = Mock(side_effect=lambda **kwargs: state.data.update(kwargs))
    state.save = Mock()
    state.append_adw_id = Mock()
    return state


@pytest.fixture
def mock_doc_context(mock_logger, mock_notifier, mock_state):
    """Create a mock DocumentInitContext."""
    from utils.document.types import DocumentInitContext

    return DocumentInitContext(
        issue_number="999",
        adw_id="test1234",
        state=mock_state,
        logger=mock_logger,
        notifier=mock_notifier,
        worktree_path="/tmp/trees/test1234"
    )


@pytest.fixture
def mock_spec_context():
    """Create a mock DocumentSpecContext."""
    from utils.document.types import DocumentSpecContext

    return DocumentSpecContext(
        spec_file="specs/test_spec.json",
        has_changes=True
    )


@pytest.fixture
def mock_doc_result():
    """Create a mock DocumentResultContext."""
    from utils.document.types import DocumentResultContext

    return DocumentResultContext(
        documentation_created=True,
        documentation_path="app_docs/feature_999.md",
        success=True,
        error_message=None
    )


@pytest.fixture
def mock_issue():
    """Create a mock GitHub issue."""
    issue = Mock()
    issue.number = 999
    issue.title = "Test Feature: Add documentation"
    issue.body = "As a user, I want documentation..."
    issue.state = "open"
    issue.url = "https://github.com/test/repo/issues/999"
    issue.model_dump_json = Mock(return_value='{"number": 999, "title": "Test Feature", "body": "Test body"}')
    return issue


@pytest.fixture
def mock_worktree_path(tmp_path):
    """Create a temporary worktree path."""
    worktree = tmp_path / "trees" / "test1234"
    worktree.mkdir(parents=True)
    return str(worktree)
