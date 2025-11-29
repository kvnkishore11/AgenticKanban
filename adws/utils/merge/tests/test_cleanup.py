"""Tests for merge workflow cleanup module."""

from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.cleanup import cleanup_worktree_and_branch


class TestCleanupWorktreeAndBranch:
    """Tests for cleanup_worktree_and_branch function."""

    @patch('utils.merge.cleanup.get_main_repo_root')
    @patch('subprocess.run')
    @patch('utils.merge.cleanup.remove_worktree')
    def test_successful_cleanup(self, mock_remove, mock_run, mock_repo_root, mock_logger):
        """Test successful cleanup of worktree and branch."""
        mock_repo_root.return_value = "/repo"
        mock_remove.return_value = (True, None)
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = cleanup_worktree_and_branch("test1234", "feature/test", mock_logger)

        assert result.worktree_removed is True
        assert result.branch_deleted is True
        assert result.error is None
        mock_logger.info.assert_called()

    @patch('utils.merge.cleanup.get_main_repo_root')
    @patch('subprocess.run')
    @patch('utils.merge.cleanup.remove_worktree')
    def test_worktree_removal_failure(self, mock_remove, mock_run, mock_repo_root, mock_logger):
        """Test when worktree removal fails."""
        mock_repo_root.return_value = "/repo"
        mock_remove.return_value = (False, "Worktree locked")
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = cleanup_worktree_and_branch("test1234", "feature/test", mock_logger)

        assert result.worktree_removed is False
        assert result.branch_deleted is True
        assert "Worktree locked" in result.error
        mock_logger.warning.assert_called()

    @patch('utils.merge.cleanup.get_main_repo_root')
    @patch('subprocess.run')
    @patch('utils.merge.cleanup.remove_worktree')
    def test_branch_deletion_failure(self, mock_remove, mock_run, mock_repo_root, mock_logger):
        """Test when branch deletion fails."""
        mock_repo_root.return_value = "/repo"
        mock_remove.return_value = (True, None)

        # First call (prune) succeeds, second call (push --delete) fails
        mock_run.side_effect = [
            MagicMock(returncode=0),  # prune
            MagicMock(returncode=1, stderr="branch not found"),  # push --delete
        ]

        result = cleanup_worktree_and_branch("test1234", "feature/test", mock_logger)

        assert result.worktree_removed is True
        assert result.branch_deleted is False
        assert "Failed to delete remote branch" in result.error
        mock_logger.warning.assert_called()

    @patch('utils.merge.cleanup.get_main_repo_root')
    @patch('subprocess.run')
    @patch('utils.merge.cleanup.remove_worktree')
    def test_both_failures(self, mock_remove, mock_run, mock_repo_root, mock_logger):
        """Test when both worktree removal and branch deletion fail."""
        mock_repo_root.return_value = "/repo"
        mock_remove.return_value = (False, "Worktree error")

        mock_run.side_effect = [
            MagicMock(returncode=0),  # prune
            MagicMock(returncode=1, stderr="branch error"),  # push --delete
        ]

        result = cleanup_worktree_and_branch("test1234", "feature/test", mock_logger)

        assert result.worktree_removed is False
        assert result.branch_deleted is False
        assert "Worktree error" in result.error
        assert "branch error" in result.error

    @patch('utils.merge.cleanup.get_main_repo_root')
    @patch('subprocess.run')
    @patch('utils.merge.cleanup.remove_worktree')
    def test_prune_always_called(self, mock_remove, mock_run, mock_repo_root, mock_logger):
        """Test that git worktree prune is always called."""
        mock_repo_root.return_value = "/repo"
        mock_remove.return_value = (True, None)
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        cleanup_worktree_and_branch("test1234", "feature/test", mock_logger)

        # Check that prune was called
        prune_calls = [c for c in mock_run.call_args_list
                       if "prune" in str(c)]
        assert len(prune_calls) == 1
