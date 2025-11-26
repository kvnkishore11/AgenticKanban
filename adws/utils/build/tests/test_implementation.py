"""Tests for build implementation module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestExecuteImplementation:
    """Tests for execute_implementation function."""

    @patch('utils.build.implementation.implement_plan')
    @patch('utils.build.implementation.make_issue_comment')
    def test_executes_implementation_successfully(self, mock_comment, mock_implement):
        """Should execute implementation based on plan."""
        from utils.build.implementation import execute_implementation

        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "Implementation complete"
        mock_implement.return_value = mock_response

        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute - should not raise
        execute_implementation(
            "specs/plan.md", "test1234", "/path/to/worktree",
            "999", mock_notifier, mock_logger
        )

        mock_implement.assert_called_once()
        mock_notifier.notify_progress.assert_called()
        mock_notifier.notify_log.assert_called()

    @patch('utils.build.implementation.implement_plan')
    @patch('utils.build.implementation.make_issue_comment')
    def test_exits_on_implementation_failure(self, mock_comment, mock_implement):
        """Should exit when implementation fails."""
        from utils.build.implementation import execute_implementation

        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Implementation failed"
        mock_implement.return_value = mock_response

        mock_notifier = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            execute_implementation(
                "specs/plan.md", "test1234", "/path/to/worktree",
                "999", mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()


class TestFetchIssueForCommit:
    """Tests for fetch_issue_for_commit function."""

    @patch('utils.build.implementation.fetch_issue_safe')
    def test_returns_issue_context_with_existing_classification(self, mock_fetch):
        """Should use existing classification from state."""
        from utils.build.implementation import fetch_issue_for_commit
        from utils.build.types import BuildIssueContext

        mock_issue = Mock()
        mock_fetch.return_value = mock_issue

        mock_state = Mock()
        mock_state.get = Mock(return_value="/feature")  # issue_class exists
        mock_logger = Mock()

        ctx = fetch_issue_for_commit("999", "test1234", mock_state, mock_logger)

        assert isinstance(ctx, BuildIssueContext)
        assert ctx.issue == mock_issue
        assert ctx.issue_command == "/feature"

    @patch('utils.build.implementation.fetch_issue_safe')
    @patch('utils.build.implementation.classify_issue')
    def test_classifies_when_no_existing_classification(self, mock_classify, mock_fetch):
        """Should classify issue when no classification in state."""
        from utils.build.implementation import fetch_issue_for_commit

        mock_issue = Mock()
        mock_fetch.return_value = mock_issue
        mock_classify.return_value = ("/bug", None)

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)  # No issue_class
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_logger = Mock()

        ctx = fetch_issue_for_commit("999", "test1234", mock_state, mock_logger)

        assert ctx.issue_command == "/bug"
        mock_classify.assert_called_once()
        mock_state.update.assert_called_with(issue_class="/bug")

    @patch('utils.build.implementation.fetch_issue_safe')
    @patch('utils.build.implementation.classify_issue')
    def test_defaults_to_feature_on_classification_error(self, mock_classify, mock_fetch):
        """Should default to /feature when classification fails."""
        from utils.build.implementation import fetch_issue_for_commit

        mock_issue = Mock()
        mock_fetch.return_value = mock_issue
        mock_classify.return_value = (None, "Classification failed")

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_logger = Mock()

        ctx = fetch_issue_for_commit("999", "test1234", mock_state, mock_logger)

        assert ctx.issue_command == "/feature"
        mock_logger.warning.assert_called()

    @patch('utils.build.implementation.fetch_issue_safe')
    def test_creates_fallback_issue_when_fetch_fails(self, mock_fetch):
        """Should create fallback issue when fetch fails."""
        from utils.build.implementation import fetch_issue_for_commit

        mock_fetch.return_value = None  # Fetch failed

        mock_state = Mock()
        mock_state.get = Mock(return_value="/chore")
        mock_logger = Mock()

        ctx = fetch_issue_for_commit("999", "test1234", mock_state, mock_logger)

        assert ctx.issue.number == 999
        assert ctx.issue.title == "Issue #999"
        mock_logger.warning.assert_called()
