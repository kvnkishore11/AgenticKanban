"""Tests for build finalization module."""

from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestFinalizeBuild:
    """Tests for finalize_build function."""

    @patch('utils.build.finalization.finalize_git_operations')
    @patch('utils.build.finalization.make_issue_comment')
    def test_finalizes_workflow(self, mock_comment, mock_finalize_git):
        """Should finalize git operations and save state."""
        from utils.build.finalization import finalize_build

        mock_state = Mock()
        mock_state.data = {"adw_id": "test1234", "plan_file": "specs/plan.md"}
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        finalize_build(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        mock_finalize_git.assert_called_once_with(
            mock_state, mock_logger, cwd="/path/to/worktree"
        )
        mock_state.save.assert_called_once_with("adw_build_iso")
        mock_notifier.notify_progress.assert_called()
        mock_notifier.notify_complete.assert_called_once()

    @patch('utils.build.finalization.finalize_git_operations')
    @patch('utils.build.finalization.make_issue_comment')
    def test_posts_final_state_to_issue(self, mock_comment, mock_finalize_git):
        """Should post final state summary to issue."""
        from utils.build.finalization import finalize_build

        mock_state = Mock()
        mock_state.data = {
            "adw_id": "test1234",
            "plan_file": "specs/plan.md",
            "branch_name": "feat-issue-999"
        }
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        finalize_build(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        # Assert comment was posted with state
        assert mock_comment.call_count >= 2

    @patch('utils.build.finalization.finalize_git_operations')
    @patch('utils.build.finalization.make_issue_comment')
    def test_logs_completion(self, mock_comment, mock_finalize_git):
        """Should log workflow completion."""
        from utils.build.finalization import finalize_build

        mock_state = Mock()
        mock_state.data = {}
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        finalize_build(
            mock_state, "/path/to/worktree", mock_notifier,
            "999", "test1234", mock_logger
        )

        mock_logger.info.assert_called_with("Isolated implementation phase completed successfully")
        mock_notifier.notify_complete.assert_called_with(
            "adw_build_iso", "Build workflow completed successfully", "Complete"
        )
