"""Tests for issue module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestFetchAndClassify:
    """Tests for fetch_and_classify function."""

    @patch('utils.plan.issue.fetch_issue_safe')
    @patch('utils.plan.issue.classify_issue')
    @patch('utils.plan.issue.make_issue_comment_safe')
    def test_uses_kanban_provided_classification(
        self, mock_comment, mock_classify, mock_fetch
    ):
        """Should use issue_class from state when available (kanban mode)."""
        from utils.plan.issue import fetch_and_classify
        from utils.plan.types import IssueContext

        # Setup mocks
        mock_issue = Mock()
        mock_issue.model_dump_json = Mock(return_value='{}')
        mock_fetch.return_value = mock_issue

        mock_state = Mock()
        mock_state.data = {"issue_class": "/feature"}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        ctx = fetch_and_classify("999", "test1234", mock_state, mock_notifier, mock_logger)

        # Assert
        assert isinstance(ctx, IssueContext)
        assert ctx.issue == mock_issue
        assert ctx.issue_command == "/feature"

        # Verify classify_issue was NOT called (used kanban-provided type)
        mock_classify.assert_not_called()
        mock_logger.info.assert_called()

    @patch('utils.plan.issue.fetch_issue_safe')
    @patch('utils.plan.issue.classify_issue')
    @patch('utils.plan.issue.make_issue_comment_safe')
    def test_classifies_github_issue_when_no_kanban_type(
        self, mock_comment, mock_classify, mock_fetch
    ):
        """Should classify issue via GitHub when no kanban type provided."""
        from utils.plan.issue import fetch_and_classify

        # Setup mocks
        mock_issue = Mock()
        mock_issue.model_dump_json = Mock(return_value='{}')
        mock_fetch.return_value = mock_issue
        mock_classify.return_value = ("/bug", None)

        mock_state = Mock()
        mock_state.data = {}  # No issue_class
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        ctx = fetch_and_classify("999", "test1234", mock_state, mock_notifier, mock_logger)

        # Assert
        assert ctx.issue_command == "/bug"

        # Verify classify_issue WAS called
        mock_classify.assert_called_once()
        mock_state.update.assert_called_with(issue_class="/bug")

    @patch('utils.plan.issue.fetch_issue_safe')
    @patch('utils.plan.issue.make_issue_comment_safe')
    def test_exits_when_issue_fetch_fails(self, mock_comment, mock_fetch):
        """Should exit when issue cannot be fetched."""
        from utils.plan.issue import fetch_and_classify

        # Setup mocks - fetch returns None
        mock_fetch.return_value = None

        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            fetch_and_classify("999", "test1234", mock_state, mock_notifier, mock_logger)

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()

    @patch('utils.plan.issue.fetch_issue_safe')
    @patch('utils.plan.issue.classify_issue')
    @patch('utils.plan.issue.make_issue_comment_safe')
    def test_exits_when_classification_fails(
        self, mock_comment, mock_classify, mock_fetch
    ):
        """Should exit when issue classification fails."""
        from utils.plan.issue import fetch_and_classify

        # Setup mocks
        mock_issue = Mock()
        mock_issue.model_dump_json = Mock(return_value='{}')
        mock_fetch.return_value = mock_issue
        mock_classify.return_value = (None, "Classification failed")

        mock_state = Mock()
        mock_state.data = {}  # No issue_class
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            fetch_and_classify("999", "test1234", mock_state, mock_notifier, mock_logger)

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
