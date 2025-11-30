"""Tests for merge workflow test validation module."""

from unittest.mock import patch, MagicMock, call

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.testing import run_validation_tests


class TestRunValidationTests:
    """Tests for run_validation_tests function.

    NOTE: Server tests are currently skipped in the actual implementation
    due to import path issues. These tests reflect the current behavior
    which only runs merge utility tests and frontend tests.
    """

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_tests_pass(self, mock_exists, mock_run, mock_logger):
        """Test when all validation tests pass."""
        # adws/utils/merge/tests exists, node_modules doesn't
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="5 passed",
            stderr=""
        )

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is True
        assert "Merge utility tests" in result.test_output
        assert result.error is None
        mock_logger.info.assert_called()

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_tests_fail(self, mock_exists, mock_run, mock_logger):
        """Test when validation tests fail."""
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="2 failed, 3 passed",
            stderr="AssertionError"
        )

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is False
        assert "Merge utility tests" in result.test_output
        assert "failed" in result.error
        mock_logger.error.assert_called()

    @patch('os.path.exists')
    def test_test_directories_not_found(self, mock_exists, mock_logger):
        """Test when test directories don't exist."""
        mock_exists.return_value = False

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is True
        assert result.test_output == ""
        assert result.error is None
        mock_logger.info.assert_called()

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_runs_in_correct_directories(self, mock_exists, mock_run, mock_logger):
        """Test that tests run in the correct directories."""
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        run_validation_tests("/my/repo", mock_logger)

        # Should run merge tests only (server tests skipped)
        assert mock_run.call_count == 1
        call_dirs = [c[1]['cwd'] for c in mock_run.call_args_list]
        assert "/my/repo" in call_dirs  # Now runs from repo root

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_no_tests_collected_is_ok(self, mock_exists, mock_run, mock_logger):
        """Test that pytest return code 5 (no tests collected) is acceptable."""
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect
        # pytest returns 5 when no tests are collected
        mock_run.return_value = MagicMock(
            returncode=5,
            stdout="no tests collected",
            stderr=""
        )

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is True
        assert result.error is None

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_runs_frontend_tests_when_node_modules_exists(self, mock_exists, mock_run, mock_logger):
        """Test that frontend tests run when node_modules exists."""
        mock_exists.return_value = True  # All paths exist
        mock_run.return_value = MagicMock(returncode=0, stdout="tests passed", stderr="")

        run_validation_tests("/repo", mock_logger)

        # Should run: adws/utils/merge/tests, frontend (server tests skipped)
        assert mock_run.call_count == 2
        # Last call should be npm for frontend
        last_call = mock_run.call_args_list[-1]
        assert "npm" in last_call[0][0]
        assert last_call[1]['cwd'] == "/repo"

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_skips_frontend_tests_when_no_node_modules(self, mock_exists, mock_run, mock_logger):
        """Test that frontend tests are skipped when node_modules doesn't exist."""
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        run_validation_tests("/repo", mock_logger)

        # Should only run: adws/utils/merge/tests (not frontend, server skipped)
        assert mock_run.call_count == 1
        # Verify no npm calls
        for call_args in mock_run.call_args_list:
            assert "npm" not in call_args[0][0]

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_partial_failure(self, mock_exists, mock_run, mock_logger):
        """Test when merge tests fail."""
        def exists_side_effect(path):
            if 'node_modules' in path:
                return False
            return True
        mock_exists.side_effect = exists_side_effect

        # Merge tests fail
        mock_run.return_value = MagicMock(returncode=1, stdout="2 failed", stderr="error")

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is False
        assert "Merge utility tests" in result.test_output
        assert "failed" in result.error
