"""Tests for test finalization module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestValidateRepoAccess:
    """Tests for validate_repo_access function."""

    @patch('utils.test.finalization.get_repo_url')
    @patch('utils.test.finalization.extract_repo_path')
    def test_validates_repo_successfully(self, mock_extract, mock_get_repo):
        """Should validate repo access without error."""
        from utils.test.finalization import validate_repo_access

        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract.return_value = "user/repo"
        mock_logger = Mock()

        # Should not raise
        validate_repo_access(mock_logger)

        mock_get_repo.assert_called_once()
        mock_extract.assert_called_once()

    @patch('utils.test.finalization.get_repo_url')
    def test_exits_on_repo_error(self, mock_get_repo):
        """Should exit when repo URL cannot be obtained."""
        from utils.test.finalization import validate_repo_access

        mock_get_repo.side_effect = ValueError("No git repo")
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_repo_access(mock_logger)

        assert exc_info.value.code == 1


class TestFinalizeTestWorkflow:
    """Tests for finalize_test_workflow function."""

    @patch('utils.test.finalization.finalize_git_operations')
    @patch('utils.test.finalization.make_issue_comment')
    def test_finalizes_workflow_on_success(self, mock_comment, mock_finalize_git):
        """Should finalize workflow when all tests pass."""
        from utils.test.finalization import finalize_test_workflow

        mock_state = Mock()
        mock_state.data = {"adw_id": "test1234"}
        mock_state.save = Mock()
        mock_logger = Mock()

        # Should not raise (no failures)
        finalize_test_workflow(
            mock_state, "/path/to/worktree", "999", "test1234", 0, mock_logger
        )

        mock_finalize_git.assert_called_once()
        mock_state.save.assert_called_once_with("adw_test_iso")
        mock_logger.info.assert_called()

    @patch('utils.test.finalization.finalize_git_operations')
    @patch('utils.test.finalization.make_issue_comment')
    def test_exits_on_test_failures(self, mock_comment, mock_finalize_git):
        """Should exit with code 1 when tests fail."""
        from utils.test.finalization import finalize_test_workflow

        mock_state = Mock()
        mock_state.data = {"adw_id": "test1234"}
        mock_state.save = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            finalize_test_workflow(
                mock_state, "/path/to/worktree", "999", "test1234", 5, mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.test.finalization.finalize_git_operations')
    @patch('utils.test.finalization.make_issue_comment')
    def test_posts_final_state_to_issue(self, mock_comment, mock_finalize_git):
        """Should post final state summary to issue."""
        from utils.test.finalization import finalize_test_workflow

        mock_state = Mock()
        mock_state.data = {"adw_id": "test1234", "issue_number": "999"}
        mock_state.save = Mock()
        mock_logger = Mock()

        finalize_test_workflow(
            mock_state, "/path/to/worktree", "999", "test1234", 0, mock_logger
        )

        # Multiple comments posted
        assert mock_comment.call_count >= 2
