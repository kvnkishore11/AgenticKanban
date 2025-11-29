"""Tests for merge workflow test validation module."""

from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.testing import run_validation_tests


class TestRunValidationTests:
    """Tests for run_validation_tests function."""

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_tests_pass(self, mock_exists, mock_run, mock_logger):
        """Test when all validation tests pass."""
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="5 passed",
            stderr=""
        )

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is True
        assert result.test_output == "5 passed"
        assert result.error is None
        mock_logger.info.assert_called()

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_tests_fail(self, mock_exists, mock_run, mock_logger):
        """Test when validation tests fail."""
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="2 failed, 3 passed",
            stderr="AssertionError"
        )

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is False
        assert result.test_output == "2 failed, 3 passed"
        assert "Tests failed" in result.error
        mock_logger.error.assert_called()

    @patch('os.path.exists')
    def test_test_directory_not_found(self, mock_exists, mock_logger):
        """Test when test directory doesn't exist."""
        mock_exists.return_value = False

        result = run_validation_tests("/repo", mock_logger)

        assert result.success is True
        assert result.test_output is None
        assert result.error is None
        mock_logger.warning.assert_called()

    @patch('subprocess.run')
    @patch('os.path.exists')
    def test_runs_in_correct_directory(self, mock_exists, mock_run, mock_logger):
        """Test that tests run in the correct directory."""
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        run_validation_tests("/my/repo", mock_logger)

        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args[1]
        assert call_kwargs['cwd'] == "/my/repo/app/server"
