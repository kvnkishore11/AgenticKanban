"""Tests for document workflow finalization."""

import pytest
from unittest.mock import patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.finalization import finalize_document


class TestFinalizeDocument:
    """Test finalize_document function."""

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.commit_changes')
    @patch('utils.document.finalization.finalize_git_operations')
    @patch('utils.document.finalization.make_issue_comment')
    def test_successful_finalization(
        self,
        mock_comment,
        mock_finalize_git,
        mock_commit_changes,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
        mock_issue,
    ):
        """Test successful finalization."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = mock_issue
        mock_create_commit.return_value = ("docs: add documentation", None)
        mock_commit_changes.return_value = (True, None)

        # Execute
        finalize_document(mock_doc_context, mock_doc_result)

        # Assertions
        mock_create_commit.assert_called_once()
        mock_commit_changes.assert_called_once()
        mock_finalize_git.assert_called_once()
        mock_doc_context.state.save.assert_called_once()
        mock_comment.assert_called()

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    def test_repo_url_error_exits(
        self,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
    ):
        """Test that repo URL error causes exit."""
        # Setup mocks
        mock_get_repo.side_effect = ValueError("Invalid repo URL")

        # Execute
        with pytest.raises(SystemExit) as exc_info:
            finalize_document(mock_doc_context, mock_doc_result)

        assert exc_info.value.code == 1

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.make_issue_comment')
    def test_commit_message_error_exits(
        self,
        mock_comment,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
        mock_issue,
    ):
        """Test that commit message error causes exit."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = mock_issue
        mock_create_commit.return_value = (None, "Commit error")

        # Execute
        with pytest.raises(SystemExit) as exc_info:
            finalize_document(mock_doc_context, mock_doc_result)

        assert exc_info.value.code == 1
        mock_doc_context.logger.error.assert_called()

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.commit_changes')
    @patch('utils.document.finalization.make_issue_comment')
    def test_commit_changes_error_exits(
        self,
        mock_comment,
        mock_commit_changes,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
        mock_issue,
    ):
        """Test that commit changes error causes exit."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = mock_issue
        mock_create_commit.return_value = ("docs: add documentation", None)
        mock_commit_changes.return_value = (False, "Git commit failed")

        # Execute
        with pytest.raises(SystemExit) as exc_info:
            finalize_document(mock_doc_context, mock_doc_result)

        assert exc_info.value.code == 1
        mock_doc_context.logger.error.assert_called()

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.commit_changes')
    @patch('utils.document.finalization.finalize_git_operations')
    @patch('utils.document.finalization.make_issue_comment')
    def test_uses_fallback_issue_when_fetch_fails(
        self,
        mock_comment,
        mock_finalize_git,
        mock_commit_changes,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
    ):
        """Test that fallback issue is created when fetch fails."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = None  # Fetch fails
        mock_create_commit.return_value = ("docs: add documentation", None)
        mock_commit_changes.return_value = (True, None)

        # Execute
        finalize_document(mock_doc_context, mock_doc_result)

        # Assertions - should still call create_commit with fallback issue
        mock_create_commit.assert_called_once()
        call_args = mock_create_commit.call_args
        fallback_issue = call_args[0][1]
        assert fallback_issue.number == int(mock_doc_context.issue_number)

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.commit_changes')
    @patch('utils.document.finalization.finalize_git_operations')
    @patch('utils.document.finalization.make_issue_comment')
    def test_uses_worktree_path_for_git_operations(
        self,
        mock_comment,
        mock_finalize_git,
        mock_commit_changes,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
        mock_issue,
    ):
        """Test that git operations use the correct worktree path."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = mock_issue
        mock_create_commit.return_value = ("docs: add documentation", None)
        mock_commit_changes.return_value = (True, None)

        # Execute
        finalize_document(mock_doc_context, mock_doc_result)

        # Assertions
        # Check create_commit uses worktree path
        create_commit_call = mock_create_commit.call_args
        assert create_commit_call[0][5] == mock_doc_context.worktree_path

        # Check commit_changes uses worktree path
        commit_changes_call = mock_commit_changes.call_args
        assert commit_changes_call[1]['cwd'] == mock_doc_context.worktree_path

        # Check finalize_git_operations uses worktree path
        finalize_git_call = mock_finalize_git.call_args
        assert finalize_git_call[1]['cwd'] == mock_doc_context.worktree_path

    @patch('utils.document.finalization.get_repo_url')
    @patch('utils.document.finalization.extract_repo_path')
    @patch('utils.document.finalization.fetch_issue_safe')
    @patch('utils.document.finalization.create_commit')
    @patch('utils.document.finalization.commit_changes')
    @patch('utils.document.finalization.finalize_git_operations')
    @patch('utils.document.finalization.make_issue_comment')
    def test_uses_issue_class_from_state(
        self,
        mock_comment,
        mock_finalize_git,
        mock_commit_changes,
        mock_create_commit,
        mock_fetch_issue,
        mock_extract,
        mock_get_repo,
        mock_doc_context,
        mock_doc_result,
        mock_issue,
    ):
        """Test that issue classification from state is used."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/test/repo"
        mock_extract.return_value = "test/repo"
        mock_fetch_issue.return_value = mock_issue
        mock_create_commit.return_value = ("docs: add documentation", None)
        mock_commit_changes.return_value = (True, None)

        # Execute
        finalize_document(mock_doc_context, mock_doc_result)

        # Assertions
        create_commit_call = mock_create_commit.call_args
        issue_command = create_commit_call[0][2]
        assert issue_command == "/feature"  # From mock_state in conftest
