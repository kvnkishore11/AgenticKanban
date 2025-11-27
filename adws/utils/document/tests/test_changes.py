"""Tests for document workflow change detection."""

import pytest
import subprocess
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.changes import check_for_changes


class TestCheckForChanges:
    """Test check_for_changes function."""

    @patch('utils.document.changes.subprocess.run')
    @patch('utils.document.changes.make_issue_comment')
    def test_changes_detected(self, mock_comment, mock_run, mock_doc_context):
        """Test when changes are detected."""
        # Setup mock
        mock_result = Mock()
        mock_result.stdout = "file1.py | 10 +++++++---\nfile2.py | 5 ++---"
        mock_run.return_value = mock_result

        # Execute
        result = check_for_changes(mock_doc_context)

        # Assertions
        assert result is True
        mock_run.assert_called_once_with(
            ["git", "diff", "main", "--stat"],
            capture_output=True,
            text=True,
            check=True,
            cwd=mock_doc_context.worktree_path,
        )
        mock_doc_context.logger.info.assert_called()
        # Should not post "no changes" comment
        assert not any("No changes detected" in str(call) for call in mock_comment.call_args_list)

    @patch('utils.document.changes.subprocess.run')
    @patch('utils.document.changes.make_issue_comment')
    def test_no_changes_detected(self, mock_comment, mock_run, mock_doc_context):
        """Test when no changes are detected."""
        # Setup mock - empty output
        mock_result = Mock()
        mock_result.stdout = ""
        mock_run.return_value = mock_result

        # Execute
        result = check_for_changes(mock_doc_context)

        # Assertions
        assert result is False
        mock_doc_context.logger.info.assert_called_with(
            "No changes detected between current branch and main"
        )
        # Should post "no changes" comment
        mock_comment.assert_called()

    @patch('utils.document.changes.subprocess.run')
    @patch('utils.document.changes.make_issue_comment')
    def test_whitespace_only_is_no_changes(self, mock_comment, mock_run, mock_doc_context):
        """Test that whitespace-only output is treated as no changes."""
        # Setup mock - whitespace only
        mock_result = Mock()
        mock_result.stdout = "   \n\n  \t  "
        mock_run.return_value = mock_result

        # Execute
        result = check_for_changes(mock_doc_context)

        # Assertions
        assert result is False

    @patch('utils.document.changes.subprocess.run')
    def test_git_error_assumes_changes_exist(self, mock_run, mock_doc_context):
        """Test that git errors result in assuming changes exist."""
        # Setup mock - raise error
        mock_run.side_effect = subprocess.CalledProcessError(1, "git")

        # Execute
        result = check_for_changes(mock_doc_context)

        # Assertions
        assert result is True  # Assume changes exist on error
        mock_doc_context.logger.error.assert_called()

    @patch('utils.document.changes.subprocess.run')
    @patch('utils.document.changes.make_issue_comment')
    def test_uses_correct_worktree_path(self, mock_comment, mock_run, mock_doc_context):
        """Test that git command uses the correct worktree path."""
        # Setup mock
        mock_result = Mock()
        mock_result.stdout = "changes"
        mock_run.return_value = mock_result

        # Execute
        check_for_changes(mock_doc_context)

        # Assertions
        _, kwargs = mock_run.call_args
        assert kwargs['cwd'] == mock_doc_context.worktree_path
