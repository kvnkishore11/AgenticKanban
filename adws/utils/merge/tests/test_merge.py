"""Tests for core merge operation module."""

import pytest
from unittest.mock import patch, Mock, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.merge import execute_merge, _perform_merge


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

        # First call returns branch name, second call (fetch) fails
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout="main", stderr=""),  # rev-parse
            MagicMock(returncode=1, stdout="", stderr="fetch error"),  # fetch
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

    @patch('subprocess.run')
    def test_squash_merge_failure(self, mock_run, mock_logger):
        """Test squash merge failure."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="merge error")

        result = _perform_merge("feature/test", "squash", "/repo", "main", mock_logger)

        assert result.success is False
        assert "Failed to squash merge" in result.error

    @patch('subprocess.run')
    def test_rebase_failure_aborts(self, mock_run, mock_logger):
        """Test that rebase failure triggers abort."""
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="rebase error")

        result = _perform_merge("feature/test", "rebase", "/repo", "main", mock_logger)

        assert result.success is False
        assert "Failed to rebase" in result.error
