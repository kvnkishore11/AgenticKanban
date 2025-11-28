"""Tests for merge workflow finalization module."""

import pytest
from unittest.mock import patch, Mock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.finalization import (
    post_merge_status,
    post_validation_status,
    post_merge_start_status,
    post_cleanup_status,
    finalize_merge,
    post_error_status,
)


class TestPostMergeStatus:
    """Tests for post_merge_status function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_to_issue(self, mock_comment, mock_state, mock_logger):
        """Test that status is posted to GitHub issue."""
        post_merge_status("test1234", "feature/test", "squash", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert call_args[0] == "123"
        assert "🔀 Starting merge" in call_args[1]

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_no_post_without_issue(self, mock_comment, mock_state, mock_logger):
        """Test that no post is made without issue number."""
        post_merge_status("test1234", "feature/test", "squash", None, mock_state, mock_logger)

        mock_comment.assert_not_called()


class TestPostValidationStatus:
    """Tests for post_validation_status function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_to_issue(self, mock_comment, mock_state, mock_logger):
        """Test that validation status is posted."""
        post_validation_status("test1234", "feature/test", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "Validation complete" in call_args[1]


class TestPostMergeStartStatus:
    """Tests for post_merge_start_status function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_to_issue(self, mock_comment, mock_state, mock_logger):
        """Test that merge start status is posted."""
        post_merge_start_status("test1234", "feature/test", "squash", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "Merging" in call_args[1]
        assert "squash" in call_args[1]


class TestPostCleanupStatus:
    """Tests for post_cleanup_status function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_to_issue(self, mock_comment, mock_state, mock_logger):
        """Test that cleanup status is posted."""
        post_cleanup_status("test1234", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "🧹 Cleaning up" in call_args[1]


class TestFinalizeMerge:
    """Tests for finalize_merge function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_updates_state(self, mock_comment, mock_state, mock_logger):
        """Test that state is updated."""
        finalize_merge("test1234", "feature/test", "squash", "123", mock_state, mock_logger)

        mock_state.append_adw_id.assert_called_once_with("adw_merge_iso")
        mock_state.save.assert_called_once_with("adw_merge_iso")

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_success_message(self, mock_comment, mock_state, mock_logger):
        """Test that success message is posted."""
        finalize_merge("test1234", "feature/test", "squash", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "🎉" in call_args[1]
        assert "Successfully merged" in call_args[1]

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_logs_completion(self, mock_comment, mock_state, mock_logger):
        """Test that completion is logged."""
        finalize_merge("test1234", "feature/test", "squash", "123", mock_state, mock_logger)

        mock_logger.info.assert_called()


class TestPostErrorStatus:
    """Tests for post_error_status function."""

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_posts_error(self, mock_comment, mock_state, mock_logger):
        """Test that error is posted to issue."""
        post_error_status("test1234", "Something failed", "123", mock_state, mock_logger)

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "❌" in call_args[1]
        assert "Something failed" in call_args[1]

    @patch('utils.merge.finalization.make_issue_comment_safe')
    def test_no_post_without_issue(self, mock_comment, mock_state, mock_logger):
        """Test that no post is made without issue number."""
        post_error_status("test1234", "Something failed", None, mock_state, mock_logger)

        mock_comment.assert_not_called()
