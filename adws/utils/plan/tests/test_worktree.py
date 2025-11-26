"""Tests for worktree module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestSetupWorktree:
    """Tests for setup_worktree function."""

    @patch('utils.plan.worktree.get_ports_for_adw')
    @patch('utils.plan.worktree.validate_worktree')
    def test_allocates_ports_when_skip_worktree(self, mock_validate, mock_get_ports):
        """Should allocate ports even when skipping worktree."""
        from utils.plan.worktree import setup_worktree
        from utils.plan.types import WorktreeContext

        # Setup mocks
        mock_get_ports.return_value = (8080, 3000)

        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_logger = Mock()

        # Execute - skip worktree
        ctx = setup_worktree("test1234", mock_state, skip_worktree=True, logger=mock_logger)

        # Assert
        assert isinstance(ctx, WorktreeContext)
        assert ctx.worktree_path is None
        assert ctx.websocket_port == 8080
        assert ctx.frontend_port == 3000
        assert ctx.is_valid is False

        # Verify state was updated
        mock_state.update.assert_called_with(websocket_port=8080, frontend_port=3000)
        mock_state.save.assert_called()

    @patch('utils.plan.worktree.get_ports_for_adw')
    @patch('utils.plan.worktree.validate_worktree')
    def test_returns_existing_worktree(self, mock_validate, mock_get_ports):
        """Should return existing worktree context when valid."""
        from utils.plan.worktree import setup_worktree

        # Setup mocks - valid existing worktree
        mock_validate.return_value = (True, None)

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key: {
            "worktree_path": "/path/to/worktree",
            "websocket_port": 8080,
            "frontend_port": 3000,
        }.get(key))
        mock_logger = Mock()

        # Execute
        ctx = setup_worktree("test1234", mock_state, skip_worktree=False, logger=mock_logger)

        # Assert
        assert ctx.worktree_path == "/path/to/worktree"
        assert ctx.is_valid is True
        mock_logger.info.assert_called()

    @patch('utils.plan.worktree.get_ports_for_adw')
    @patch('utils.plan.worktree.is_port_available')
    @patch('utils.plan.worktree.find_next_available_ports')
    @patch('utils.plan.worktree.validate_worktree')
    def test_finds_alternative_ports_when_in_use(
        self, mock_validate, mock_find_ports, mock_is_available, mock_get_ports
    ):
        """Should find alternative ports when default ones are in use."""
        from utils.plan.worktree import setup_worktree

        # Setup mocks - no existing worktree, ports in use
        mock_validate.return_value = (False, "No worktree")
        mock_get_ports.return_value = (8080, 3000)
        mock_is_available.return_value = False  # Ports in use
        mock_find_ports.return_value = (8081, 3001)  # Alternative ports

        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_logger = Mock()

        # Execute
        ctx = setup_worktree("test1234", mock_state, skip_worktree=False, logger=mock_logger)

        # Assert alternative ports were used
        assert ctx.websocket_port == 8081
        assert ctx.frontend_port == 3001
        mock_logger.warning.assert_called()


class TestCreateWorktreeEnv:
    """Tests for create_worktree_env function."""

    @patch('utils.plan.worktree.create_worktree')
    @patch('utils.plan.worktree.setup_worktree_environment')
    @patch('utils.plan.worktree.execute_template')
    @patch('utils.plan.worktree.make_issue_comment_safe')
    def test_creates_worktree_successfully(
        self, mock_comment, mock_execute, mock_setup_env, mock_create_wt
    ):
        """Should create worktree and setup environment."""
        from utils.plan.worktree import create_worktree_env
        from utils.plan.types import WorktreeContext

        # Setup mocks
        mock_create_wt.return_value = ("/path/to/worktree", None)
        mock_execute.return_value = Mock(success=True, output="OK")

        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        wt_ctx = WorktreeContext(
            worktree_path=None,
            websocket_port=8080,
            frontend_port=3000,
            is_valid=False
        )

        # Execute
        result = create_worktree_env(
            "test1234", "feat-branch", wt_ctx, mock_state,
            mock_notifier, "999", mock_logger
        )

        # Assert
        assert result == "/path/to/worktree"
        mock_create_wt.assert_called_once()
        mock_setup_env.assert_called_once()
        mock_execute.assert_called_once()
        mock_state.update.assert_called()

    @patch('utils.plan.worktree.create_worktree')
    @patch('utils.plan.worktree.make_issue_comment_safe')
    def test_exits_on_worktree_creation_failure(self, mock_comment, mock_create_wt):
        """Should exit when worktree creation fails."""
        from utils.plan.worktree import create_worktree_env
        from utils.plan.types import WorktreeContext

        # Setup mocks - creation fails
        mock_create_wt.return_value = (None, "Failed to create worktree")

        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        wt_ctx = WorktreeContext(
            worktree_path=None,
            websocket_port=8080,
            frontend_port=3000,
            is_valid=False
        )

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            create_worktree_env(
                "test1234", "feat-branch", wt_ctx, mock_state,
                mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()
