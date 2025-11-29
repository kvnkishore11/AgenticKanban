"""Tests for patch issue module."""

from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.issue import fetch_issue_with_fallback
from utils.patch.types import PatchIssueContext


class TestFetchIssueWithFallback:
    """Tests for fetch_issue_with_fallback function."""

    @patch('utils.patch.issue.fetch_issue_safe')
    @patch('utils.patch.issue.make_issue_comment')
    @patch('utils.patch.issue.format_issue_message')
    def test_fetch_issue_success(
        self, mock_format, mock_comment, mock_fetch,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test successful issue fetch."""
        mock_fetch.return_value = mock_issue
        mock_format.return_value = "formatted message"

        result = fetch_issue_with_fallback(
            "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchIssueContext)
        assert result.issue == mock_issue
        assert result.is_fallback is False

    @patch('utils.patch.issue.fetch_issue_safe')
    @patch('utils.patch.issue.make_issue_comment')
    @patch('utils.patch.issue.format_issue_message')
    @patch('utils.patch.issue.GitHubIssue')
    def test_fetch_issue_fallback(
        self, mock_github_issue, mock_format, mock_comment, mock_fetch,
        mock_logger, mock_notifier, mock_state
    ):
        """Test fallback when issue fetch fails."""
        mock_fetch.return_value = None
        fallback_issue = Mock()
        mock_github_issue.return_value = fallback_issue
        mock_format.return_value = "formatted message"

        result = fetch_issue_with_fallback(
            "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchIssueContext)
        assert result.issue == fallback_issue
        assert result.is_fallback is True
        mock_logger.warning.assert_called()

    @patch('utils.patch.issue.fetch_issue_safe')
    @patch('utils.patch.issue.make_issue_comment')
    @patch('utils.patch.issue.format_issue_message')
    def test_fetch_issue_posts_comment(
        self, mock_format, mock_comment, mock_fetch,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that issue comment is posted."""
        mock_fetch.return_value = mock_issue
        mock_format.return_value = "Starting workflow"

        fetch_issue_with_fallback(
            "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        mock_comment.assert_called()
        mock_notifier.notify_log.assert_called()

    @patch('utils.patch.issue.fetch_issue_safe')
    @patch('utils.patch.issue.make_issue_comment')
    @patch('utils.patch.issue.format_issue_message')
    @patch('utils.patch.issue.GitHubIssue')
    def test_fallback_issue_has_correct_number(
        self, mock_github_issue, mock_format, mock_comment, mock_fetch,
        mock_logger, mock_notifier, mock_state
    ):
        """Test fallback issue is created with correct number."""
        mock_fetch.return_value = None
        mock_format.return_value = "formatted message"

        fetch_issue_with_fallback(
            "123", "test1234", mock_state, mock_notifier, mock_logger
        )

        # Verify GitHubIssue was called with number=123
        call_kwargs = mock_github_issue.call_args[1]
        assert call_kwargs['number'] == 123
