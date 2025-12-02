"""Tests for branching module."""

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

    @patch('utils.plan.branching.generate_fallback_branch_name')
    @patch('utils.plan.branching.generate_branch_name')
    @patch('utils.plan.branching.make_issue_comment_safe')
    def test_uses_fallback_on_branch_generation_failure(self, mock_comment, mock_gen_branch, mock_fallback):
        """Should use fallback branch name when generation fails (no sys.exit)."""
        from utils.plan.branching import generate_branch

        # Setup mocks - generation fails
        mock_gen_branch.return_value = (None, "Failed to generate branch name")
        mock_fallback.return_value = "feat-issue-999-adw-test1234-auto"

        mock_issue = Mock()
        mock_issue.number = 999
        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute - should NOT raise SystemExit
        result = generate_branch(
            mock_issue, "/feature", "test1234",
            mock_state, mock_notifier, "999", mock_logger
        )

        # Assert fallback was used
        assert result == "feat-issue-999-adw-test1234-auto"
        mock_fallback.assert_called()
        mock_state.update.assert_called_with(branch_name="feat-issue-999-adw-test1234-auto")
        mock_state.save.assert_called()
        # Should log warning, not error
        mock_logger.warning.assert_called()

    @patch('utils.plan.branching.generate_fallback_branch_name')
    @patch('utils.plan.branching.generate_branch_name')
    @patch('utils.plan.branching.make_issue_comment_safe')
    def test_uses_fallback_on_exception(self, mock_comment, mock_gen_branch, mock_fallback):
        """Should use fallback branch name when an exception occurs."""
        from utils.plan.branching import generate_branch

        # Setup mocks - generation throws exception
        mock_gen_branch.side_effect = Exception("LLM API error")
        mock_fallback.return_value = "feat-issue-123-adw-abc123-auto"

        mock_issue = Mock()
        mock_issue.number = 123
        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute - should NOT raise exception
        result = generate_branch(
            mock_issue, "/feature", "abc123",
            mock_state, mock_notifier, "123", mock_logger
        )

        # Assert fallback was used
        assert result == "feat-issue-123-adw-abc123-auto"
        mock_fallback.assert_called()
        mock_logger.warning.assert_called()

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
