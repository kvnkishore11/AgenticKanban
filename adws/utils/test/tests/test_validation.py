"""Tests for test validation module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestValidateTestWorktree:
    """Tests for validate_test_worktree function."""

    @patch('utils.test.validation.validate_worktree')
    @patch('utils.test.validation.make_issue_comment')
    def test_returns_validation_context(self, mock_comment, mock_validate):
        """Should return TestValidationContext with worktree info."""
        from utils.test.validation import validate_test_worktree
        from utils.test.types import TestValidationContext

        mock_validate.return_value = (True, None)

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "worktree_path": "/path/to/worktree",
            "websocket_port": "9100",
            "frontend_port": "9200",
        }.get(key, default))
        mock_logger = Mock()

        ctx = validate_test_worktree("test1234", mock_state, "999", mock_logger)

        assert isinstance(ctx, TestValidationContext)
        assert ctx.worktree_path == "/path/to/worktree"
        assert ctx.websocket_port == "9100"
        assert ctx.frontend_port == "9200"

    @patch('utils.test.validation.validate_worktree')
    @patch('utils.test.validation.make_issue_comment')
    def test_exits_when_worktree_invalid(self, mock_comment, mock_validate):
        """Should exit when worktree validation fails."""
        from utils.test.validation import validate_test_worktree

        mock_validate.return_value = (False, "Worktree not found")

        mock_state = Mock()
        mock_logger = Mock()

        with pytest.raises(SystemExit) as exc_info:
            validate_test_worktree("test1234", mock_state, "999", mock_logger)

        assert exc_info.value.code == 1
        mock_comment.assert_called()


class TestPostTestStartMessage:
    """Tests for post_test_start_message function."""

    @patch('utils.test.validation.make_issue_comment')
    def test_posts_start_message(self, mock_comment):
        """Should post start message with correct info."""
        from utils.test.validation import post_test_start_message

        post_test_start_message(
            "999", "test1234", "/path/to/worktree",
            "9100", "9200", False
        )

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert call_args[0] == "999"
        assert "Starting isolated testing phase" in call_args[1]
        assert "E2E Tests: Enabled" in call_args[1]

    @patch('utils.test.validation.make_issue_comment')
    def test_indicates_e2e_skipped(self, mock_comment):
        """Should indicate when E2E tests are skipped."""
        from utils.test.validation import post_test_start_message

        post_test_start_message(
            "999", "test1234", "/path/to/worktree",
            "9100", "9200", True  # skip_e2e=True
        )

        call_args = mock_comment.call_args[0]
        assert "E2E Tests: Skipped" in call_args[1]
