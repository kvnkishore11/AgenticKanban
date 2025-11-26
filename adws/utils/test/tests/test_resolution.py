"""Tests for test resolution module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestResolveFailedTests:
    """Tests for resolve_failed_tests function."""

    @patch('utils.test.resolution.execute_template')
    @patch('utils.test.resolution.make_issue_comment')
    def test_resolves_failed_tests_successfully(self, mock_comment, mock_execute):
        """Should resolve failed tests and return counts."""
        from utils.test.resolution import resolve_failed_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        mock_test = Mock()
        mock_test.test_name = "test_failing"
        mock_test.model_dump_json = Mock(return_value='{"test_name": "test_failing"}')

        mock_logger = Mock()

        resolved, unresolved = resolve_failed_tests(
            [mock_test], "test1234", "999", mock_logger, "/path/to/worktree"
        )

        assert resolved == 1
        assert unresolved == 0
        mock_logger.info.assert_called()

    @patch('utils.test.resolution.execute_template')
    @patch('utils.test.resolution.make_issue_comment')
    def test_tracks_unresolved_tests(self, mock_comment, mock_execute):
        """Should track unresolved tests."""
        from utils.test.resolution import resolve_failed_tests

        mock_response = Mock()
        mock_response.success = False
        mock_execute.return_value = mock_response

        mock_test = Mock()
        mock_test.test_name = "test_failing"
        mock_test.model_dump_json = Mock(return_value='{"test_name": "test_failing"}')

        mock_logger = Mock()

        resolved, unresolved = resolve_failed_tests(
            [mock_test], "test1234", "999", mock_logger, "/path/to/worktree"
        )

        assert resolved == 0
        assert unresolved == 1
        mock_logger.error.assert_called()

    @patch('utils.test.resolution.execute_template')
    @patch('utils.test.resolution.make_issue_comment')
    def test_uses_iteration_in_agent_name(self, mock_comment, mock_execute):
        """Should include iteration number in agent name."""
        from utils.test.resolution import resolve_failed_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        mock_test = Mock()
        mock_test.test_name = "test_failing"
        mock_test.model_dump_json = Mock(return_value='{}')

        mock_logger = Mock()

        resolve_failed_tests(
            [mock_test], "test1234", "999", mock_logger, "/path/to/worktree",
            iteration=3
        )

        call_args = mock_execute.call_args[0][0]
        assert "iter3" in call_args.agent_name


class TestResolveFailedE2ETests:
    """Tests for resolve_failed_e2e_tests function."""

    @patch('utils.test.resolution.execute_template')
    @patch('utils.test.resolution.make_issue_comment')
    def test_resolves_failed_e2e_tests(self, mock_comment, mock_execute):
        """Should resolve failed E2E tests."""
        from utils.test.resolution import resolve_failed_e2e_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        mock_test = Mock()
        mock_test.test_name = "test_e2e_failing"
        mock_test.model_dump_json = Mock(return_value='{}')

        mock_logger = Mock()

        resolved, unresolved = resolve_failed_e2e_tests(
            [mock_test], "test1234", "999", mock_logger, "/path/to/worktree"
        )

        assert resolved == 1
        assert unresolved == 0

        # Verify E2E-specific command
        call_args = mock_execute.call_args[0][0]
        assert call_args.slash_command == "/resolve_failed_e2e_test"
        assert "e2e_test_resolver" in call_args.agent_name
