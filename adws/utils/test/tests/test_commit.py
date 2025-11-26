"""Tests for test commit module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestFetchIssueForTestCommit:
    """Tests for fetch_issue_for_test_commit function."""

    @patch('utils.test.commit.fetch_issue_safe')
    def test_returns_issue_context_with_existing_classification(self, mock_fetch):
        """Should use existing classification from state."""
        from utils.test.commit import fetch_issue_for_test_commit
        from utils.test.types import TestIssueContext

        mock_issue = Mock()
        mock_fetch.return_value = mock_issue

        mock_state = Mock()
        mock_state.get = Mock(return_value="/feature")
        mock_logger = Mock()

        ctx = fetch_issue_for_test_commit("999", "test1234", mock_state, mock_logger)

        assert isinstance(ctx, TestIssueContext)
        assert ctx.issue == mock_issue
        assert ctx.issue_command == "/feature"

    @patch('utils.test.commit.fetch_issue_safe')
    @patch('utils.test.commit.classify_issue')
    def test_classifies_when_no_existing_classification(self, mock_classify, mock_fetch):
        """Should classify issue when no classification in state."""
        from utils.test.commit import fetch_issue_for_test_commit

        mock_issue = Mock()
        mock_fetch.return_value = mock_issue
        mock_classify.return_value = ("/bug", None)

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_logger = Mock()

        ctx = fetch_issue_for_test_commit("999", "test1234", mock_state, mock_logger)

        assert ctx.issue_command == "/bug"
        mock_classify.assert_called_once()
        mock_state.update.assert_called_with(issue_class="/bug")

    @patch('utils.test.commit.fetch_issue_safe')
    def test_creates_fallback_issue_when_fetch_fails(self, mock_fetch):
        """Should create fallback issue when fetch fails."""
        from utils.test.commit import fetch_issue_for_test_commit

        mock_fetch.return_value = None

        mock_state = Mock()
        mock_state.get = Mock(return_value="/chore")
        mock_logger = Mock()

        ctx = fetch_issue_for_test_commit("999", "test1234", mock_state, mock_logger)

        assert ctx.issue.number == 999
        assert ctx.issue.title == "Issue #999"
        mock_logger.warning.assert_called()


class TestCreateTestCommit:
    """Tests for create_test_commit function."""

    @patch('utils.test.commit.create_commit')
    @patch('utils.test.commit.commit_changes')
    @patch('utils.test.commit.make_issue_comment')
    def test_creates_commit_successfully(self, mock_comment, mock_commit, mock_create):
        """Should create commit message and execute git commit."""
        from utils.test.commit import create_test_commit

        mock_create.return_value = ("test(tests): add test results", None)
        mock_commit.return_value = (True, None)

        mock_issue = Mock()
        mock_logger = Mock()

        # Should not raise
        create_test_commit(
            mock_issue, "/feature", "test1234",
            "/path/to/worktree", "999", mock_logger
        )

        mock_create.assert_called_once()
        mock_commit.assert_called_once()
        mock_logger.info.assert_called()

    @patch('utils.test.commit.create_commit')
    @patch('utils.test.commit.make_issue_comment')
    def test_exits_on_commit_message_failure(self, mock_comment, mock_create):
        """Should exit when commit message creation fails."""
        from utils.test.commit import create_test_commit

        mock_create.return_value = (None, "Failed to create message")

        mock_issue = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            create_test_commit(
                mock_issue, "/feature", "test1234",
                "/path/to/worktree", "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.test.commit.create_commit')
    @patch('utils.test.commit.commit_changes')
    @patch('utils.test.commit.make_issue_comment')
    def test_exits_on_git_commit_failure(self, mock_comment, mock_commit, mock_create):
        """Should exit when git commit fails."""
        from utils.test.commit import create_test_commit

        mock_create.return_value = ("test: commit message", None)
        mock_commit.return_value = (False, "Nothing to commit")

        mock_issue = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            create_test_commit(
                mock_issue, "/feature", "test1234",
                "/path/to/worktree", "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
