"""Tests for build commit module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestCreateBuildCommit:
    """Tests for create_build_commit function."""

    @patch('utils.build.commit.create_commit')
    @patch('utils.build.commit.commit_changes')
    @patch('utils.build.commit.make_issue_comment')
    def test_creates_commit_successfully(self, mock_comment, mock_commit, mock_create):
        """Should create commit message and execute git commit."""
        from utils.build.commit import create_build_commit

        mock_create.return_value = ("feat(impl): implement user profile", None)
        mock_commit.return_value = (True, None)

        mock_issue = Mock()
        mock_logger = Mock()

        # Execute - should not raise
        create_build_commit(
            mock_issue, "/feature", "test1234",
            "/path/to/worktree", "999", mock_logger
        )

        mock_create.assert_called_once()
        mock_commit.assert_called_once_with(
            "feat(impl): implement user profile",
            cwd="/path/to/worktree"
        )
        mock_logger.info.assert_called()

    @patch('utils.build.commit.create_commit')
    @patch('utils.build.commit.make_issue_comment')
    def test_exits_on_commit_message_failure(self, mock_comment, mock_create):
        """Should exit when commit message creation fails."""
        from utils.build.commit import create_build_commit

        mock_create.return_value = (None, "Failed to create message")

        mock_issue = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            create_build_commit(
                mock_issue, "/feature", "test1234",
                "/path/to/worktree", "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.build.commit.create_commit')
    @patch('utils.build.commit.commit_changes')
    @patch('utils.build.commit.make_issue_comment')
    def test_exits_on_git_commit_failure(self, mock_comment, mock_commit, mock_create):
        """Should exit when git commit fails."""
        from utils.build.commit import create_build_commit

        mock_create.return_value = ("feat: implement feature", None)
        mock_commit.return_value = (False, "Nothing to commit")

        mock_issue = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            create_build_commit(
                mock_issue, "/feature", "test1234",
                "/path/to/worktree", "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
