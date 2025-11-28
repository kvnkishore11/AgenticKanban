"""Tests for merge workflow validation module."""

import pytest
from unittest.mock import patch, Mock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.validation import validate_merge_worktree


class TestValidateMergeWorktree:
    """Tests for validate_merge_worktree function."""

    @patch('utils.merge.validation._validate_worktree')
    def test_validate_success(self, mock_validate, mock_state, mock_logger):
        """Test successful worktree validation."""
        mock_validate.return_value = (True, None)
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "worktree_path": "/tmp/trees/test1234",
            "branch_name": "feature/test",
        }.get(key, default))

        result = validate_merge_worktree("test1234", mock_state, "123", mock_logger)

        assert result.is_valid is True
        assert result.worktree_path == "/tmp/trees/test1234"
        assert result.branch_name == "feature/test"
        assert result.error is None
        mock_logger.info.assert_called()

    @patch('utils.merge.validation._validate_worktree')
    def test_validate_failure(self, mock_validate, mock_state, mock_logger):
        """Test failed worktree validation."""
        mock_validate.return_value = (False, "Worktree not found")

        result = validate_merge_worktree("test1234", mock_state, "123", mock_logger)

        assert result.is_valid is False
        assert result.worktree_path == ""
        assert result.branch_name == ""
        assert result.error == "Worktree not found"
        mock_logger.error.assert_called()

    @patch('utils.merge.validation._validate_worktree')
    @patch('utils.merge.validation.make_issue_comment_safe')
    def test_validate_failure_posts_to_issue(self, mock_comment, mock_validate,
                                              mock_state, mock_logger):
        """Test that validation failure posts to GitHub issue."""
        mock_validate.return_value = (False, "Worktree not found")

        result = validate_merge_worktree("test1234", mock_state, "123", mock_logger)

        assert result.is_valid is False
        mock_comment.assert_called_once()

    @patch('utils.merge.validation._validate_worktree')
    def test_validate_without_issue_number(self, mock_validate, mock_state, mock_logger):
        """Test validation without issue number (no GitHub posting)."""
        mock_validate.return_value = (False, "Worktree not found")

        result = validate_merge_worktree("test1234", mock_state, None, mock_logger)

        assert result.is_valid is False
        # Should not raise any errors even without issue number
