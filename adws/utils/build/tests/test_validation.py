"""Tests for build validation module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestValidateBuildEnvironment:
    """Tests for validate_build_environment function."""

    @patch('utils.build.validation.check_env_vars')
    @patch('utils.build.validation.get_repo_url')
    @patch('utils.build.validation.extract_repo_path')
    def test_validates_environment(self, mock_extract, mock_get_repo, mock_check_env):
        """Should validate environment variables and repo."""
        from utils.build.validation import validate_build_environment

        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract.return_value = "user/repo"

        mock_state = Mock()
        mock_logger = Mock()

        # Execute - should not raise
        validate_build_environment(mock_state, mock_logger)

        mock_check_env.assert_called_once_with(mock_logger)

    @patch('utils.build.validation.check_env_vars')
    @patch('utils.build.validation.get_repo_url')
    def test_exits_on_repo_error(self, mock_get_repo, mock_check_env):
        """Should exit when repo URL cannot be obtained."""
        from utils.build.validation import validate_build_environment

        mock_get_repo.side_effect = ValueError("No git repo")

        mock_state = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_build_environment(mock_state, mock_logger)

        assert exc_info.value.code == 1


class TestValidateWorktreeAndState:
    """Tests for validate_worktree_and_state function."""

    @patch('utils.build.validation.validate_worktree')
    @patch('utils.build.validation.make_issue_comment')
    def test_returns_validation_context(self, mock_comment, mock_validate):
        """Should return BuildValidationContext with all fields."""
        from utils.build.validation import validate_worktree_and_state
        from utils.build.types import BuildValidationContext

        mock_validate.return_value = (True, None)

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "worktree_path": "/path/to/worktree",
            "branch_name": "feat-issue-999",
            "plan_file": "specs/plan.md",
            "websocket_port": "9100",
            "frontend_port": "9200",
        }.get(key, default))
        mock_logger = Mock()

        ctx = validate_worktree_and_state("test1234", mock_state, "999", mock_logger)

        assert isinstance(ctx, BuildValidationContext)
        assert ctx.worktree_path == "/path/to/worktree"
        assert ctx.branch_name == "feat-issue-999"
        assert ctx.plan_file == "specs/plan.md"

    @patch('utils.build.validation.validate_worktree')
    @patch('utils.build.validation.make_issue_comment')
    def test_exits_when_worktree_invalid(self, mock_comment, mock_validate):
        """Should exit when worktree validation fails."""
        from utils.build.validation import validate_worktree_and_state

        mock_validate.return_value = (False, "Worktree not found")

        mock_state = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_worktree_and_state("test1234", mock_state, "999", mock_logger)

        assert exc_info.value.code == 1

    @patch('utils.build.validation.validate_worktree')
    @patch('utils.build.validation.make_issue_comment')
    def test_exits_when_no_branch_name(self, mock_comment, mock_validate):
        """Should exit when branch name missing from state."""
        from utils.build.validation import validate_worktree_and_state

        mock_validate.return_value = (True, None)

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "worktree_path": "/path/to/worktree",
            # branch_name missing
            "plan_file": "specs/plan.md",
        }.get(key, default))
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_worktree_and_state("test1234", mock_state, "999", mock_logger)

        assert exc_info.value.code == 1

    @patch('utils.build.validation.validate_worktree')
    @patch('utils.build.validation.make_issue_comment')
    def test_exits_when_no_plan_file(self, mock_comment, mock_validate):
        """Should exit when plan file missing from state."""
        from utils.build.validation import validate_worktree_and_state

        mock_validate.return_value = (True, None)

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "worktree_path": "/path/to/worktree",
            "branch_name": "feat-issue-999",
            # plan_file missing
        }.get(key, default))
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_worktree_and_state("test1234", mock_state, "999", mock_logger)

        assert exc_info.value.code == 1


class TestCheckoutBranch:
    """Tests for checkout_branch function."""

    @patch('utils.build.validation.subprocess.run')
    @patch('utils.build.validation.make_issue_comment')
    def test_checkout_success(self, mock_comment, mock_run):
        """Should checkout branch successfully."""
        from utils.build.validation import checkout_branch

        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")
        mock_logger = Mock()

        # Execute - should not raise
        checkout_branch("feat-branch", "/path/to/worktree", "test1234", "999", mock_logger)

        mock_run.assert_called_once()
        mock_logger.info.assert_called()

    @patch('utils.build.validation.subprocess.run')
    @patch('utils.build.validation.make_issue_comment')
    def test_exits_on_checkout_failure(self, mock_comment, mock_run):
        """Should exit when checkout fails."""
        from utils.build.validation import checkout_branch

        mock_run.return_value = Mock(returncode=1, stdout="", stderr="error: branch not found")
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            checkout_branch("feat-branch", "/path/to/worktree", "test1234", "999", mock_logger)

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
