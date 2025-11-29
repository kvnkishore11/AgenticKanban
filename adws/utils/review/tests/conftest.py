"""Shared fixtures for review workflow tests."""

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
def mock_state():
    """Create a mock ADW state."""
    state = Mock()
    state.data = {
        "adw_id": "review1234",
        "issue_number": "888",
        "worktree_path": "/tmp/trees/review1234",
        "websocket_port": "9100",
        "frontend_port": "9200",
    }
    state.get = Mock(side_effect=lambda key, default=None: state.data.get(key, default))
    state.update = Mock(side_effect=lambda **kwargs: state.data.update(kwargs))
    state.save = Mock()
    state.append_adw_id = Mock()
    return state


@pytest.fixture
def mock_review_result():
    """Create a mock review result."""
    from adw_modules.data_types import ReviewResult, ReviewIssue

    issue1 = ReviewIssue(
        review_issue_number=1,
        issue_description="Button color is incorrect",
        issue_resolution="Change button color to blue",
        issue_severity="blocker",
        screenshot_path="screenshots/issue1.png",
        screenshot_url=""
    )

    issue2 = ReviewIssue(
        review_issue_number=2,
        issue_description="Missing error handling",
        issue_resolution="Add try-catch blocks",
        issue_severity="tech_debt",
        screenshot_path="",
        screenshot_url=""
    )

    return ReviewResult(
        success=True,
        review_summary="Review completed with 2 issues found",
        review_issues=[issue1, issue2],
        screenshots=["screenshots/issue1.png", "screenshots/general.png"],
        screenshot_urls=[]
    )


@pytest.fixture
def mock_review_issue():
    """Create a mock review issue."""
    from adw_modules.data_types import ReviewIssue

    return ReviewIssue(
        review_issue_number=1,
        issue_description="Button color is incorrect",
        issue_resolution="Change button color to blue",
        issue_severity="blocker",
        screenshot_path="screenshots/issue1.png",
        screenshot_url=""
    )


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
def sample_spec_file(tmp_path):
    """Create a sample spec file for testing."""
    spec_dir = tmp_path / "specs"
    spec_dir.mkdir(parents=True)
    spec_file = spec_dir / "spec_888.md"
    spec_file.write_text("# Specification\n\nThis is a test specification.")
    return str(spec_file)


@pytest.fixture
def mock_worktree_path(tmp_path):
    """Create a temporary worktree path."""
    worktree = tmp_path / "trees" / "review1234"
    worktree.mkdir(parents=True)
    return str(worktree)
