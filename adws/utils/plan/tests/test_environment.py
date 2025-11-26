"""Tests for environment module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestValidateEnvironment:
    """Tests for validate_environment function."""

    @patch('utils.plan.environment.is_kanban_mode')
    @patch('utils.plan.environment.check_env_vars')
    @patch('utils.plan.environment.get_repo_url')
    @patch('utils.plan.environment.extract_repo_path')
    @patch('utils.plan.environment.should_skip_worktree_operations')
    def test_validates_environment_in_github_mode(
        self, mock_skip_worktree, mock_extract_repo, mock_get_repo,
        mock_check_env, mock_is_kanban
    ):
        """Should validate environment when not in kanban mode."""
        from utils.plan.environment import validate_environment
        from utils.plan.types import EnvContext

        # Setup mocks
        mock_is_kanban.return_value = False
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"
        mock_skip_worktree.return_value = False

        mock_state = Mock()
        mock_logger = Mock()

        # Execute
        ctx = validate_environment(mock_state, mock_logger)

        # Assert
        assert isinstance(ctx, EnvContext)
        assert ctx.github_repo_url == "https://github.com/user/repo"
        assert ctx.skip_worktree is False

        # Verify env vars were checked
        mock_check_env.assert_called_once_with(mock_logger)

    @patch('utils.plan.environment.is_kanban_mode')
    @patch('utils.plan.environment.check_env_vars')
    @patch('utils.plan.environment.get_repo_url')
    @patch('utils.plan.environment.extract_repo_path')
    @patch('utils.plan.environment.should_skip_worktree_operations')
    def test_skips_validation_in_kanban_mode(
        self, mock_skip_worktree, mock_extract_repo, mock_get_repo,
        mock_check_env, mock_is_kanban
    ):
        """Should skip env validation when in kanban mode."""
        from utils.plan.environment import validate_environment

        # Setup mocks - kanban mode, no git repo
        mock_is_kanban.return_value = True
        mock_get_repo.return_value = None
        mock_skip_worktree.return_value = True

        mock_state = Mock()
        mock_logger = Mock()

        # Execute
        ctx = validate_environment(mock_state, mock_logger)

        # Assert
        assert ctx.github_repo_url is None
        assert ctx.skip_worktree is True

        # Verify env vars were NOT checked
        mock_check_env.assert_not_called()

        # Verify info was logged
        mock_logger.info.assert_called()

    @patch('utils.plan.environment.is_kanban_mode')
    @patch('utils.plan.environment.check_env_vars')
    @patch('utils.plan.environment.get_repo_url')
    @patch('utils.plan.environment.extract_repo_path')
    @patch('utils.plan.environment.should_skip_worktree_operations')
    def test_exits_when_no_git_and_not_kanban(
        self, mock_skip_worktree, mock_extract_repo, mock_get_repo,
        mock_check_env, mock_is_kanban
    ):
        """Should exit when no git repo and not in kanban mode."""
        from utils.plan.environment import validate_environment

        # Setup mocks - NOT kanban mode but no git repo
        mock_is_kanban.return_value = False
        mock_get_repo.return_value = None

        mock_state = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            validate_environment(mock_state, mock_logger)

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
