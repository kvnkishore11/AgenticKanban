"""Tests for E2E test execution module."""

from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestRunE2ETests:
    """Tests for run_e2e_tests function."""

    @patch('utils.test.e2e_tests.execute_template')
    def test_executes_e2e_test_template(self, mock_execute):
        """Should execute E2E test template with correct parameters."""
        from utils.test.e2e_tests import run_e2e_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response
        mock_logger = Mock()

        response = run_e2e_tests("test1234", mock_logger, "/path/to/worktree")

        assert response == mock_response
        mock_execute.assert_called_once()
        call_args = mock_execute.call_args[0][0]
        assert call_args.slash_command == "/test_e2e"
        assert call_args.adw_id == "test1234"
        assert call_args.working_dir == "/path/to/worktree"
        assert call_args.args == []

    @patch('utils.test.e2e_tests.execute_template')
    def test_passes_e2e_test_file_as_argument(self, mock_execute):
        """Should pass e2e_test_file path as argument when provided."""
        from utils.test.e2e_tests import run_e2e_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response
        mock_logger = Mock()

        test_file = "/path/src/test/e2e/issue-123-adw-abc123-e2e-feature.md"
        response = run_e2e_tests(
            "test1234", mock_logger, "/path/to/worktree", e2e_test_file=test_file
        )

        assert response == mock_response
        call_args = mock_execute.call_args[0][0]
        assert call_args.args == [test_file]


class TestParseE2ETestResults:
    """Tests for parse_e2e_test_results function."""

    @patch('utils.test.e2e_tests.parse_json')
    def test_parses_e2e_results_successfully(self, mock_parse):
        """Should parse and count E2E test results."""
        from utils.test.e2e_tests import parse_e2e_test_results

        mock_test1 = Mock()
        mock_test1.passed = True
        mock_test2 = Mock()
        mock_test2.passed = False
        mock_parse.return_value = [mock_test1, mock_test2]
        mock_logger = Mock()

        results, passed, failed = parse_e2e_test_results("output", mock_logger)

        assert len(results) == 2
        assert passed == 1
        assert failed == 1

    @patch('utils.test.e2e_tests.parse_json')
    def test_handles_e2e_parse_error(self, mock_parse):
        """Should return empty results on parse error."""
        from utils.test.e2e_tests import parse_e2e_test_results

        mock_parse.side_effect = Exception("Parse error")
        mock_logger = Mock()

        results, passed, failed = parse_e2e_test_results("invalid", mock_logger)

        assert results == []
        assert passed == 0
        assert failed == 0
        mock_logger.error.assert_called()


class TestRunE2ETestsWithResolution:
    """Tests for run_e2e_tests_with_resolution function."""

    @patch('utils.test.e2e_tests.discover_all_e2e_tests')
    @patch('utils.test.e2e_tests.run_e2e_tests')
    @patch('utils.test.e2e_tests.parse_e2e_test_results')
    @patch('utils.test.e2e_tests.make_issue_comment')
    def test_returns_context_on_all_pass(self, mock_comment, mock_parse, mock_run, mock_discover):
        """Should return E2ETestContext when all tests pass."""
        from utils.test.e2e_tests import run_e2e_tests_with_resolution
        from utils.test.types import E2ETestContext

        # Mock discovery to return one test file
        mock_discover.return_value = ["/path/src/test/e2e/test_feature.md"]

        mock_response = Mock()
        mock_response.success = True
        mock_run.return_value = mock_response

        mock_test = Mock()
        mock_test.passed = True
        mock_parse.return_value = ([mock_test], 1, 0)

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_e2e_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        assert isinstance(ctx, E2ETestContext)
        assert ctx.passed_count == 1
        assert ctx.failed_count == 0
        mock_resolve.assert_not_called()
        # Verify run_e2e_tests was called with the test file
        mock_run.assert_called_once()
        call_kwargs = mock_run.call_args
        assert call_kwargs[1]["e2e_test_file"] == "/path/src/test/e2e/test_feature.md"

    @patch('utils.test.e2e_tests.discover_all_e2e_tests')
    @patch('utils.test.e2e_tests.run_e2e_tests')
    @patch('utils.test.e2e_tests.make_issue_comment')
    def test_handles_e2e_execution_error(self, mock_comment, mock_run, mock_discover):
        """Should handle E2E execution errors."""
        from utils.test.e2e_tests import run_e2e_tests_with_resolution

        mock_discover.return_value = ["/path/src/test/e2e/test_feature.md"]

        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "E2E error"
        mock_run.return_value = mock_response

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_e2e_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        # With discovery, even on error, we get empty results for that file
        assert ctx.results == []
        mock_logger.error.assert_called()

    @patch('utils.test.e2e_tests.discover_all_e2e_tests')
    @patch('utils.test.e2e_tests.run_e2e_tests')
    @patch('utils.test.e2e_tests.parse_e2e_test_results')
    @patch('utils.test.e2e_tests.make_issue_comment')
    def test_handles_empty_results(self, mock_comment, mock_parse, mock_run, mock_discover):
        """Should handle empty E2E results gracefully."""
        from utils.test.e2e_tests import run_e2e_tests_with_resolution

        mock_discover.return_value = ["/path/src/test/e2e/test_feature.md"]

        mock_response = Mock()
        mock_response.success = True
        mock_run.return_value = mock_response
        mock_parse.return_value = ([], 0, 0)

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_e2e_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        assert ctx.results == []
        mock_logger.warning.assert_called()

    @patch('utils.test.e2e_tests.discover_all_e2e_tests')
    def test_skips_e2e_when_no_tests_discovered(self, mock_discover):
        """Should skip E2E tests when no test files are discovered."""
        from utils.test.e2e_tests import run_e2e_tests_with_resolution
        from utils.test.types import E2ETestContext

        mock_discover.return_value = []

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_e2e_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        assert isinstance(ctx, E2ETestContext)
        assert ctx.results == []
        assert ctx.passed_count == 0
        assert ctx.failed_count == 0
        mock_logger.warning.assert_called_with("No E2E test files discovered - skipping E2E tests")

    @patch('utils.test.e2e_tests.discover_all_e2e_tests')
    @patch('utils.test.e2e_tests.run_e2e_tests')
    @patch('utils.test.e2e_tests.parse_e2e_test_results')
    @patch('utils.test.e2e_tests.make_issue_comment')
    def test_runs_multiple_discovered_tests(self, mock_comment, mock_parse, mock_run, mock_discover):
        """Should run all discovered E2E test files."""
        from utils.test.e2e_tests import run_e2e_tests_with_resolution

        # Mock discovery returns multiple test files
        mock_discover.return_value = [
            "/path/src/test/e2e/test_feature1.md",
            "/path/src/test/e2e/test_feature2.md",
        ]

        mock_response = Mock()
        mock_response.success = True
        mock_run.return_value = mock_response

        mock_test = Mock()
        mock_test.passed = True
        mock_parse.return_value = ([mock_test], 1, 0)

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_e2e_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        # Should have called run_e2e_tests twice (once for each file)
        assert mock_run.call_count == 2
