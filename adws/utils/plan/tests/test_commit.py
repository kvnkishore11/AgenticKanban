"""Tests for commit module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestCreatePlanCommit:
    """Tests for create_plan_commit function."""

    @patch('utils.plan.commit.create_commit')
    @patch('utils.plan.commit.commit_changes')
    @patch('utils.plan.commit.make_issue_comment_safe')
    def test_creates_commit_successfully(self, mock_comment, mock_commit, mock_create):
        """Should create commit message and execute git commit."""
        from utils.plan.commit import create_plan_commit

        # Setup mocks
        mock_create.return_value = ("feat(plan): add implementation plan for #999", None)
        mock_commit.return_value = (True, None)

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        create_plan_commit(
            mock_issue, "/feature", "test1234", "/path/to/worktree",
            mock_state, mock_notifier, "999", mock_logger
        )

        # Assert
        mock_create.assert_called_once()
        mock_commit.assert_called_once_with(
            "feat(plan): add implementation plan for #999",
            cwd="/path/to/worktree"
        )
        mock_notifier.notify_log.assert_called()
        mock_logger.info.assert_called()

    @patch('utils.plan.commit.create_commit')
    @patch('utils.plan.commit.make_issue_comment_safe')
    def test_exits_on_commit_message_creation_failure(self, mock_comment, mock_create):
        """Should exit when commit message creation fails."""
        from utils.plan.commit import create_plan_commit

        # Setup mocks - creation fails
        mock_create.return_value = (None, "Failed to create commit message")

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            create_plan_commit(
                mock_issue, "/feature", "test1234", "/path/to/worktree",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()

    @patch('utils.plan.commit.create_commit')
    @patch('utils.plan.commit.commit_changes')
    @patch('utils.plan.commit.make_issue_comment_safe')
    def test_exits_on_git_commit_failure(self, mock_comment, mock_commit, mock_create):
        """Should exit when git commit fails."""
        from utils.plan.commit import create_plan_commit

        # Setup mocks - commit message created but git commit fails
        mock_create.return_value = ("feat(plan): add plan", None)
        mock_commit.return_value = (False, "Git commit failed: no changes")

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            create_plan_commit(
                mock_issue, "/feature", "test1234", "/path/to/worktree",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
