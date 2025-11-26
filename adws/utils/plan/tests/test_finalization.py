"""Tests for finalization module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestFinalize:
    """Tests for finalize function."""

    @patch('utils.plan.finalization.finalize_git_operations')
    @patch('utils.plan.finalization.make_issue_comment_safe')
    def test_finalizes_workflow(self, mock_comment, mock_finalize_git):
        """Should finalize git operations and save state."""
        from utils.plan.finalization import finalize

        # Setup mocks
        mock_state = Mock()
        mock_state.data = {"adw_id": "test1234", "plan_file": "specs/plan.md"}
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        finalize(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        # Assert
        mock_finalize_git.assert_called_once_with(
            mock_state, mock_logger, cwd="/path/to/worktree"
        )
        mock_state.save.assert_called_once_with("adw_plan_iso")
        mock_notifier.notify_progress.assert_called()
        mock_notifier.notify_complete.assert_called_once()

    @patch('utils.plan.finalization.finalize_git_operations')
    @patch('utils.plan.finalization.make_issue_comment_safe')
    def test_posts_final_state_to_issue(self, mock_comment, mock_finalize_git):
        """Should post final state summary to issue."""
        from utils.plan.finalization import finalize

        # Setup mocks
        mock_state = Mock()
        mock_state.data = {
            "adw_id": "test1234",
            "plan_file": "specs/plan.md",
            "branch_name": "feat-issue-999-adw-test1234-feature"
        }
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        finalize(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        # Assert state summary was posted
        assert mock_comment.call_count >= 2  # At least completion + state summary

    @patch('utils.plan.finalization.finalize_git_operations')
    @patch('utils.plan.finalization.make_issue_comment_safe')
    def test_logs_completion(self, mock_comment, mock_finalize_git):
        """Should log workflow completion."""
        from utils.plan.finalization import finalize

        # Setup mocks
        mock_state = Mock()
        mock_state.data = {}
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        finalize(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        # Assert completion was logged
        mock_logger.info.assert_called_with("Isolated planning phase completed successfully")
        mock_notifier.notify_complete.assert_called_with(
            "adw_plan_iso", "Planning workflow completed successfully", "Complete"
        )
