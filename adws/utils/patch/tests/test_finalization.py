"""Tests for patch finalization module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.finalization import finalize_patch
from utils.patch.types import PatchResultContext


class TestFinalizePatch:
    """Tests for finalize_patch function."""

    @patch('utils.patch.finalization.finalize_git_operations')
    @patch('utils.patch.finalization.add_patch_to_history')
    @patch('utils.patch.finalization.make_issue_comment')
    @patch('utils.patch.finalization.format_issue_message')
    def test_finalize_success(
        self, mock_format, mock_comment, mock_add_history, mock_finalize_git,
        mock_logger, mock_notifier, mock_state
    ):
        """Test successful finalization."""
        patch_result = PatchResultContext(
            patch_file="patch.md",
            patch_number=1,
            patch_reason="Fix bug",
            success=True
        )
        mock_format.return_value = "formatted"

        finalize_patch(
            patch_result, "/path/to/worktree", "999",
            "test1234", mock_state, mock_notifier, mock_logger
        )

        mock_finalize_git.assert_called_once()
        mock_add_history.assert_called_once()
        mock_state.save.assert_called()
        mock_notifier.notify_complete.assert_called()

    @patch('utils.patch.finalization.finalize_git_operations')
    @patch('utils.patch.finalization.add_patch_to_history')
    @patch('utils.patch.finalization.make_issue_comment')
    @patch('utils.patch.finalization.format_issue_message')
    def test_adds_patch_to_history(
        self, mock_format, mock_comment, mock_add_history, mock_finalize_git,
        mock_logger, mock_notifier, mock_state
    ):
        """Test that patch is added to history correctly."""
        patch_result = PatchResultContext(
            patch_file="patch_v2.md",
            patch_number=2,
            patch_reason="Update styles",
            success=True
        )
        mock_format.return_value = "formatted"

        finalize_patch(
            patch_result, "/path/to/worktree", "888",
            "kanban123", mock_state, mock_notifier, mock_logger
        )

        mock_add_history.assert_called_with(
            state=mock_state,
            patch_number=2,
            patch_reason="Update styles",
            patch_file="patch_v2.md",
            success=True,
        )

    @patch('utils.patch.finalization.finalize_git_operations')
    @patch('utils.patch.finalization.add_patch_to_history')
    @patch('utils.patch.finalization.make_issue_comment')
    @patch('utils.patch.finalization.format_issue_message')
    def test_posts_final_state(
        self, mock_format, mock_comment, mock_add_history, mock_finalize_git,
        mock_logger, mock_notifier, mock_state
    ):
        """Test that final state is posted to issue."""
        patch_result = PatchResultContext(
            patch_file="patch.md",
            patch_number=3,
            patch_reason="Refactor code",
            success=True
        )
        mock_format.return_value = "formatted"
        mock_state.data = {"adw_id": "test1234", "patch_file": "patch.md"}

        finalize_patch(
            patch_result, "/path/to/worktree", "777",
            "test1234", mock_state, mock_notifier, mock_logger
        )

        # Check that the final state comment was posted
        calls = mock_comment.call_args_list
        # Should have at least two comments: workflow status and final state
        assert len(calls) >= 2

    @patch('utils.patch.finalization.finalize_git_operations')
    @patch('utils.patch.finalization.add_patch_to_history')
    @patch('utils.patch.finalization.make_issue_comment')
    @patch('utils.patch.finalization.format_issue_message')
    def test_logs_completion(
        self, mock_format, mock_comment, mock_add_history, mock_finalize_git,
        mock_logger, mock_notifier, mock_state
    ):
        """Test that completion is logged."""
        patch_result = PatchResultContext(
            patch_file="patch.md",
            patch_number=1,
            patch_reason="Fix issue",
            success=True
        )
        mock_format.return_value = "formatted"

        finalize_patch(
            patch_result, "/path/to/worktree", "999",
            "test1234", mock_state, mock_notifier, mock_logger
        )

        mock_logger.info.assert_any_call("Isolated patch workflow completed successfully")
        mock_logger.info.assert_any_call("Added patch #1 to history")
