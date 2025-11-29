"""Tests for core merge operation module."""

from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.merge import (
    execute_merge,
    _perform_merge,
    _check_and_stash_changes,
    _pop_stashed_changes,
    MERGE_STASH_NAME,
)


class TestStashFunctionality:
    """Tests for stash helper functions."""

    @patch('subprocess.run')
    def test_check_and_stash_with_changes(self, mock_run, mock_logger):
        """Test that changes are stashed when present."""
        # First call: git status --porcelain returns changes
        # Second call: git stash push succeeds
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout="M modified_file.py\n", stderr=""),
            MagicMock(returncode=0, stdout="", stderr=""),
        ]

        result = _check_and_stash_changes("/repo", mock_logger)

        assert result is True
        assert mock_run.call_count == 2
        # Verify stash push was called with correct args
        stash_call = mock_run.call_args_list[1]
        assert "stash" in stash_call[0][0]
        assert "push" in stash_call[0][0]

    @patch('subprocess.run')
    def test_check_and_stash_no_changes(self, mock_run, mock_logger):
        """Test that no stash happens when no changes."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = _check_and_stash_changes("/repo", mock_logger)

        assert result is False
        assert mock_run.call_count == 1  # Only status check

    @patch('subprocess.run')
    def test_check_and_stash_failure(self, mock_run, mock_logger):
        """Test handling of stash failure."""
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout="M file.py\n", stderr=""),
            MagicMock(returncode=1, stdout="", stderr="stash failed"),
        ]

        result = _check_and_stash_changes("/repo", mock_logger)

        assert result is False

    @patch('subprocess.run')
    def test_pop_stashed_changes_success(self, mock_run, mock_logger):
        """Test successful stash pop."""
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout=f"stash@{{0}}: {MERGE_STASH_NAME}", stderr=""),
            MagicMock(returncode=0, stdout="", stderr=""),
        ]

        _pop_stashed_changes("/repo", mock_logger, was_stashed=True)

        assert mock_run.call_count == 2

    @patch('subprocess.run')
    def test_pop_stashed_changes_not_stashed(self, mock_run, mock_logger):
        """Test that pop is skipped when was_stashed is False."""
        _pop_stashed_changes("/repo", mock_logger, was_stashed=False)

        assert mock_run.call_count == 0

    @patch('subprocess.run')
    def test_pop_stashed_changes_stash_not_found(self, mock_run, mock_logger):
        """Test handling when stash is not found."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        _pop_stashed_changes("/repo", mock_logger, was_stashed=True)

        # Should only call stash list, not stash pop
        assert mock_run.call_count == 1


class TestExecuteMerge:
    """Tests for execute_merge function."""

    @patch('utils.merge.merge.run_validation_tests')
    @patch('utils.merge.merge.restore_config_files')
    @patch('utils.merge.merge.detect_and_resolve_conflicts')
    @patch('utils.merge.merge._perform_merge')
    @patch('subprocess.run')
    @patch('utils.merge.merge.get_main_repo_root')
    def test_successful_merge(self, mock_repo_root, mock_run, mock_perform,
                               mock_conflicts, mock_config, mock_tests,
                               mock_state, mock_logger):
        """Test successful merge operation."""
        mock_repo_root.return_value = "/repo"
        mock_run.return_value = MagicMock(returncode=0, stdout="main", stderr="")

        mock_perform.return_value = MagicMock(success=True, error=None,
                                              original_branch="main", merge_method="squash")
        mock_conflicts.return_value = MagicMock(has_conflicts=False, resolved=True)
        mock_config.return_value = MagicMock(success=True, error=None)
        mock_tests.return_value = MagicMock(success=True, error=None)

        result = execute_merge(
            "test1234", "feature/test", "squash", "123", mock_state, mock_logger
        )

        assert result.success is True
        assert result.error is None

    @patch('subprocess.run')
    @patch('utils.merge.merge.get_main_repo_root')
    def test_fetch_failure(self, mock_repo_root, mock_run, mock_state, mock_logger):
        """Test when git fetch fails."""
        mock_repo_root.return_value = "/repo"

        # Order: rev-parse, status (stash check), fetch fails
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout="main", stderr=""),  # rev-parse
            MagicMock(returncode=0, stdout="", stderr=""),  # git status --porcelain (no changes)
            MagicMock(returncode=1, stdout="", stderr="fetch error"),  # fetch fails
        ]

        result = execute_merge(
            "test1234", "feature/test", "squash", "123", mock_state, mock_logger
        )

        assert result.success is False
        assert "Failed to fetch" in result.error

    @patch('utils.merge.merge.run_validation_tests')
    @patch('utils.merge.merge.restore_config_files')
    @patch('utils.merge.merge.detect_and_resolve_conflicts')
    @patch('utils.merge.merge._perform_merge')
    @patch('subprocess.run')
    @patch('utils.merge.merge.get_main_repo_root')
    def test_test_failure_aborts(self, mock_repo_root, mock_run, mock_perform,
                                  mock_conflicts, mock_config, mock_tests,
                                  mock_state, mock_logger):
        """Test that test failure aborts merge."""
        mock_repo_root.return_value = "/repo"
        mock_run.return_value = MagicMock(returncode=0, stdout="main", stderr="")

        mock_perform.return_value = MagicMock(success=True, error=None,
                                              original_branch="main", merge_method="squash")
        mock_conflicts.return_value = MagicMock(has_conflicts=False, resolved=True)
        mock_config.return_value = MagicMock(success=True, error=None)
        mock_tests.return_value = MagicMock(success=False, error="Test failed")

        result = execute_merge(
            "test1234", "feature/test", "squash", "123", mock_state, mock_logger
        )

        assert result.success is False
        assert "Validation tests failed" in result.error


class TestPerformMerge:
    """Tests for _perform_merge function."""

    @patch('subprocess.run')
    def test_squash_rebase_merge_success(self, mock_run, mock_logger):
        """Test successful squash-rebase merge (worktree-safe approach)."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = _perform_merge("feature/test", "squash-rebase", "/repo", "main", mock_logger)

        assert result.success is True
        assert result.merge_method == "squash-rebase"
        # Worktree-safe approach: fetch + rev-parse + merge --squash + commit = 4 calls
        # (We no longer checkout the feature branch which avoids worktree conflicts)
        assert mock_run.call_count == 4

    @patch('subprocess.run')
    def test_squash_merge_success(self, mock_run, mock_logger):
        """Test successful squash merge."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = _perform_merge("feature/test", "squash", "/repo", "main", mock_logger)

        assert result.success is True
        assert result.merge_method == "squash"
        assert mock_run.call_count == 2  # merge --squash + commit

    @patch('subprocess.run')
    def test_regular_merge_success(self, mock_run, mock_logger):
        """Test successful regular merge."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = _perform_merge("feature/test", "merge", "/repo", "main", mock_logger)

        assert result.success is True
        assert result.merge_method == "merge"

    @patch('subprocess.run')
    def test_rebase_merge_success(self, mock_run, mock_logger):
        """Test successful rebase merge."""
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        result = _perform_merge("feature/test", "rebase", "/repo", "main", mock_logger)

        assert result.success is True
        assert result.merge_method == "rebase"

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_squash_merge_failure_no_conflicts(self, mock_run, mock_check_conflicts, mock_logger):
        """Test squash merge failure when there are no conflicts (real error)."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="merge error")
        # No conflicts detected - this is a real failure
        mock_check_conflicts.return_value = (False, [])

        result = _perform_merge("feature/test", "squash", "/repo", "main", mock_logger)

        assert result.success is False
        assert "Failed to squash merge" in result.error

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_squash_merge_with_conflicts_proceeds_to_resolution(self, mock_run, mock_check_conflicts, mock_logger):
        """Test that squash merge with conflicts returns success to allow resolution."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="CONFLICT in file.txt")
        # Conflicts detected - should proceed to resolution step
        mock_check_conflicts.return_value = (True, ["file.txt", "other.txt"])

        result = _perform_merge("feature/test", "squash", "/repo", "main", mock_logger)

        # Should return success to allow conflict resolution step to handle it
        assert result.success is True
        assert result.error is None

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_squash_rebase_merge_with_conflicts_proceeds_to_resolution(self, mock_run, mock_check_conflicts, mock_logger):
        """Test that squash-rebase merge with conflicts returns success to allow resolution."""
        # Setup mock calls in order: fetch, rev-parse, merge --squash (fails with conflicts)
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout="", stderr=""),  # fetch
            MagicMock(returncode=0, stdout="sha123", stderr=""),  # rev-parse
            MagicMock(returncode=1, stdout="", stderr="CONFLICT"),  # merge --squash fails
        ]
        # Conflicts detected - should proceed to resolution step
        mock_check_conflicts.return_value = (True, ["file.txt"])

        result = _perform_merge("feature/test", "squash-rebase", "/repo", "main", mock_logger)

        # Should return success to allow conflict resolution step to handle it
        assert result.success is True
        assert result.error is None

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_rebase_failure_no_conflicts(self, mock_run, mock_check_conflicts, mock_logger):
        """Test that rebase failure without conflicts triggers abort."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="rebase error")
        # No conflicts detected - this is a real failure
        mock_check_conflicts.return_value = (False, [])

        result = _perform_merge("feature/test", "rebase", "/repo", "main", mock_logger)

        assert result.success is False
        assert "Failed to rebase" in result.error

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_rebase_with_conflicts_proceeds_to_resolution(self, mock_run, mock_check_conflicts, mock_logger):
        """Test that rebase with conflicts returns success to allow resolution."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="CONFLICT")
        # Conflicts detected - should proceed to resolution step
        mock_check_conflicts.return_value = (True, ["file.txt"])

        result = _perform_merge("feature/test", "rebase", "/repo", "main", mock_logger)

        # Should return success to allow conflict resolution step to handle it
        assert result.success is True
        assert result.error is None

    @patch('utils.merge.merge.check_merge_conflicts')
    @patch('subprocess.run')
    def test_regular_merge_with_conflicts_proceeds_to_resolution(self, mock_run, mock_check_conflicts, mock_logger):
        """Test that regular merge with conflicts returns success to allow resolution."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="CONFLICT")
        # Conflicts detected - should proceed to resolution step
        mock_check_conflicts.return_value = (True, ["file.txt"])

        result = _perform_merge("feature/test", "merge", "/repo", "main", mock_logger)

        # Should return success to allow conflict resolution step to handle it
        assert result.success is True
        assert result.error is None
