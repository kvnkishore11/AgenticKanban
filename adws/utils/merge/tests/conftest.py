"""Shared fixtures for merge workflow tests."""

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
        "branch_name": "feature/test-branch",
        "worktree_path": "/tmp/trees/test1234",
    }
    state.get = Mock(side_effect=lambda key, default=None: state.data.get(key, default))
    state.update = Mock(side_effect=lambda **kwargs: state.data.update(kwargs))
    state.save = Mock()
    state.append_adw_id = Mock()
    return state


@pytest.fixture
def mock_worktree_path(tmp_path):
    """Create a temporary worktree path."""
    worktree = tmp_path / "trees" / "test1234"
    worktree.mkdir(parents=True)
    return str(worktree)


@pytest.fixture
def sample_conflict_files():
    """Sample list of conflicting files."""
    return [
        "src/components/Button.tsx",
        "src/utils/helpers.py",
    ]


@pytest.fixture
def sample_config_data():
    """Sample MCP config data with worktree paths."""
    return {
        "mcpServers": {
            "playwright": {
                "args": [
                    "--config",
                    "/path/to/trees/test1234/playwright-mcp-config.json"
                ]
            }
        }
    }


@pytest.fixture
def sample_playwright_config():
    """Sample playwright config data with worktree paths."""
    return {
        "browser": {
            "contextOptions": {
                "recordVideo": {
                    "dir": "/path/to/trees/test1234/videos"
                }
            }
        }
    }
