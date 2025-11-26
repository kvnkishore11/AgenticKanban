"""Tests for branching module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestGenerateBranch:
    """Tests for generate_branch function."""

    @patch('utils.plan.branching.generate_branch_name')
    @patch('utils.plan.branching.make_issue_comment_safe')
    def test_generates_and_saves_branch_name(self, mock_comment, mock_gen_branch):
        """Should generate branch name and save to state."""
        from utils.plan.branching import generate_branch

        # Setup mocks
        mock_gen_branch.return_value = ("feat-issue-999-adw-test1234-user-profile", None)

        mock_issue = Mock()
        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        result = generate_branch(
            mock_issue, "/feature", "test1234",
            mock_state, mock_notifier, "999", mock_logger
        )

        # Assert
        assert result == "feat-issue-999-adw-test1234-user-profile"
        mock_state.update.assert_called_with(branch_name="feat-issue-999-adw-test1234-user-profile")
        mock_state.save.assert_called()
        mock_notifier.notify_progress.assert_called()

    @patch('utils.plan.branching.generate_branch_name')
    @patch('utils.plan.branching.make_issue_comment_safe')
    def test_exits_on_branch_generation_failure(self, mock_comment, mock_gen_branch):
        """Should exit when branch generation fails."""
        from utils.plan.branching import generate_branch

        # Setup mocks - generation fails
        mock_gen_branch.return_value = (None, "Failed to generate branch name")

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            generate_branch(
                mock_issue, "/feature", "test1234",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()

    @patch('utils.plan.branching.generate_branch_name')
    @patch('utils.plan.branching.make_issue_comment_safe')
    def test_logs_branch_info(self, mock_comment, mock_gen_branch):
        """Should log branch name via notifier."""
        from utils.plan.branching import generate_branch

        # Setup mocks
        branch_name = "bug-issue-123-adw-abc123-fix-login"
        mock_gen_branch.return_value = (branch_name, None)

        mock_issue = Mock()
        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        generate_branch(
            mock_issue, "/bug", "abc123",
            mock_state, mock_notifier, "123", mock_logger
        )

        # Assert notifier was called with branch info
        mock_notifier.notify_log.assert_called_with(
            "adw_plan_iso", f"Branch: {branch_name}", "INFO"
        )
