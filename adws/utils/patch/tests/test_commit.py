"""Tests for patch commit module."""

import pytest
from unittest.mock import patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.commit import create_patch_commit


class TestCreatePatchCommit:
    """Tests for create_patch_commit function."""

    @patch('utils.patch.commit.create_commit')
    @patch('utils.patch.commit.commit_changes')
    @patch('utils.patch.commit.make_issue_comment')
    @patch('utils.patch.commit.format_issue_message')
    def test_create_commit_success(
        self, mock_format, mock_comment, mock_commit, mock_create,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test successful commit creation."""
        mock_create.return_value = ("patch: fix button color", None)
        mock_commit.return_value = (True, None)
        mock_format.return_value = "formatted"

        result = create_patch_commit(
            mock_issue, "/path/to/worktree", "999",
            "test1234", mock_state, mock_notifier, mock_logger
        )

        assert result == "patch: fix button color"
        mock_commit.assert_called_with("patch: fix button color", cwd="/path/to/worktree")

    @patch('utils.patch.commit.create_commit')
    @patch('utils.patch.commit.make_issue_comment')
    @patch('utils.patch.commit.format_issue_message')
    def test_commit_message_creation_fails(
        self, mock_format, mock_comment, mock_create,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that commit message creation failure causes exit."""
        mock_create.return_value = (None, "Failed to create message")
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            create_patch_commit(
                mock_issue, "/path/to/worktree", "999",
                "test1234", mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1

    @patch('utils.patch.commit.create_commit')
    @patch('utils.patch.commit.commit_changes')
    @patch('utils.patch.commit.make_issue_comment')
    @patch('utils.patch.commit.format_issue_message')
    def test_git_commit_fails(
        self, mock_format, mock_comment, mock_commit, mock_create,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that git commit failure causes exit."""
        mock_create.return_value = ("patch: fix bug", None)
        mock_commit.return_value = (False, "Git error")
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            create_patch_commit(
                mock_issue, "/path/to/worktree", "999",
                "test1234", mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.patch.commit.create_commit')
    @patch('utils.patch.commit.commit_changes')
    @patch('utils.patch.commit.make_issue_comment')
    @patch('utils.patch.commit.format_issue_message')
    def test_notifies_on_success(
        self, mock_format, mock_comment, mock_commit, mock_create,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that notifier is called on success."""
        mock_create.return_value = ("patch: update styles", None)
        mock_commit.return_value = (True, None)
        mock_format.return_value = "formatted"

        create_patch_commit(
            mock_issue, "/path/to/worktree", "999",
            "test1234", mock_state, mock_notifier, mock_logger
        )

        mock_notifier.notify_log.assert_called()
        mock_comment.assert_called()
