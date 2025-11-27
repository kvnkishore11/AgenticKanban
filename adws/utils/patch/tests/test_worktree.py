"""Tests for patch worktree module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.worktree import setup_patch_worktree
from utils.patch.types import PatchWorktreeContext


class TestSetupPatchWorktree:
    """Tests for setup_patch_worktree function."""

    @patch('utils.patch.worktree.os.path.exists')
    @patch('utils.patch.worktree.make_issue_comment')
    @patch('utils.patch.worktree.format_issue_message')
    def test_use_existing_worktree(
        self, mock_format, mock_comment, mock_exists,
        mock_logger, mock_notifier
    ):
        """Test using existing worktree from state."""
        mock_state = Mock()
        mock_state.data = {
            "worktree_path": "/path/to/worktree",
            "websocket_port": 9105,
            "frontend_port": 9205,
        }
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_exists.return_value = True
        mock_format.return_value = "formatted"

        result = setup_patch_worktree(
            "test1234", "feature/branch", "999",
            mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchWorktreeContext)
        assert result.worktree_path == "/path/to/worktree"
        assert result.websocket_port == 9105
        assert result.frontend_port == 9205
        assert result.is_existing is True

    @patch('utils.patch.worktree.os.path.exists')
    @patch('utils.patch.worktree.create_worktree')
    @patch('utils.patch.worktree.get_ports_for_adw')
    @patch('utils.patch.worktree.is_port_available')
    @patch('utils.patch.worktree.setup_worktree_environment')
    @patch('utils.patch.worktree.make_issue_comment')
    @patch('utils.patch.worktree.format_issue_message')
    def test_create_new_worktree(
        self, mock_format, mock_comment, mock_setup_env,
        mock_port_avail, mock_get_ports, mock_create,
        mock_exists, mock_logger, mock_notifier
    ):
        """Test creating new worktree."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_exists.return_value = False
        mock_create.return_value = ("/new/worktree/path", None)
        mock_get_ports.return_value = (9100, 9200)
        mock_port_avail.return_value = True
        mock_format.return_value = "formatted"

        result = setup_patch_worktree(
            "new1234", "feature/new-branch", "888",
            mock_state, mock_notifier, mock_logger
        )

        assert result.worktree_path == "/new/worktree/path"
        assert result.websocket_port == 9100
        assert result.frontend_port == 9200
        assert result.is_existing is False
        mock_setup_env.assert_called_once()

    @patch('utils.patch.worktree.os.path.exists')
    @patch('utils.patch.worktree.create_worktree')
    @patch('utils.patch.worktree.make_issue_comment')
    @patch('utils.patch.worktree.format_issue_message')
    def test_worktree_creation_error_exits(
        self, mock_format, mock_comment, mock_create, mock_exists,
        mock_logger, mock_notifier
    ):
        """Test that worktree creation error causes exit."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_exists.return_value = False
        mock_create.return_value = (None, "Failed to create worktree")
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            setup_patch_worktree(
                "fail1234", "feature/fail", "999",
                mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1

    @patch('utils.patch.worktree.os.path.exists')
    @patch('utils.patch.worktree.create_worktree')
    @patch('utils.patch.worktree.get_ports_for_adw')
    @patch('utils.patch.worktree.is_port_available')
    @patch('utils.patch.worktree.find_next_available_ports')
    @patch('utils.patch.worktree.setup_worktree_environment')
    @patch('utils.patch.worktree.make_issue_comment')
    @patch('utils.patch.worktree.format_issue_message')
    def test_find_alternative_ports(
        self, mock_format, mock_comment, mock_setup_env,
        mock_find_ports, mock_port_avail, mock_get_ports,
        mock_create, mock_exists, mock_logger, mock_notifier
    ):
        """Test finding alternative ports when preferred are unavailable."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_exists.return_value = False
        mock_create.return_value = ("/worktree/path", None)
        mock_get_ports.return_value = (9100, 9200)
        mock_port_avail.return_value = False  # Ports not available
        mock_find_ports.return_value = (9105, 9205)  # Alternative ports
        mock_format.return_value = "formatted"

        result = setup_patch_worktree(
            "alt1234", "feature/alt", "777",
            mock_state, mock_notifier, mock_logger
        )

        assert result.websocket_port == 9105
        assert result.frontend_port == 9205
        mock_logger.warning.assert_called()
