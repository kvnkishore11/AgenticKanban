"""Tests for unit test execution module."""

from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestRunTests:
    """Tests for run_tests function."""

    @patch('utils.test.unit_tests.execute_template')
    def test_executes_test_template(self, mock_execute):
        """Should execute test template with correct parameters."""
        from utils.test.unit_tests import run_tests

        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response
        mock_logger = Mock()

        response = run_tests("test1234", mock_logger, "/path/to/worktree")

        assert response == mock_response
        mock_execute.assert_called_once()
        call_args = mock_execute.call_args[0][0]
        assert call_args.slash_command == "/test"
        assert call_args.adw_id == "test1234"
        assert call_args.working_dir == "/path/to/worktree"


class TestParseTestResults:
    """Tests for parse_test_results function."""

    @patch('utils.test.unit_tests.parse_json')
    def test_parses_results_successfully(self, mock_parse):
        """Should parse and count test results."""
        from utils.test.unit_tests import parse_test_results

        mock_test1 = Mock()
        mock_test1.passed = True
        mock_test2 = Mock()
        mock_test2.passed = False
        mock_parse.return_value = [mock_test1, mock_test2]
        mock_logger = Mock()

        results, passed, failed = parse_test_results("output", mock_logger)

        assert len(results) == 2
        assert passed == 1
        assert failed == 1

    @patch('utils.test.unit_tests.parse_json')
    def test_handles_parse_error(self, mock_parse):
        """Should return empty results on parse error."""
        from utils.test.unit_tests import parse_test_results

        mock_parse.side_effect = Exception("Parse error")
        mock_logger = Mock()

        results, passed, failed = parse_test_results("invalid", mock_logger)

        assert results == []
        assert passed == 0
        assert failed == 0
        mock_logger.error.assert_called()


class TestFormatTestResultsComment:
    """Tests for format_test_results_comment function."""

    def test_formats_empty_results(self):
        """Should return error message for empty results."""
        from utils.test.unit_tests import format_test_results_comment

        comment = format_test_results_comment([], 0, 0)

        assert "No test results found" in comment

    def test_formats_failed_and_passed_tests(self):
        """Should format both failed and passed tests."""
        from utils.test.unit_tests import format_test_results_comment

        mock_failed = Mock()
        mock_failed.passed = False
        mock_failed.test_name = "test_failing"
        mock_failed.model_dump = Mock(return_value={"test_name": "test_failing", "passed": False})

        mock_passed = Mock()
        mock_passed.passed = True
        mock_passed.test_name = "test_passing"
        mock_passed.model_dump = Mock(return_value={"test_name": "test_passing", "passed": True})

        comment = format_test_results_comment([mock_failed, mock_passed], 1, 1)

        assert "Failed Tests" in comment
        assert "Passed Tests" in comment
        assert "test_failing" in comment
        assert "test_passing" in comment
        assert "**Passed**: 1" in comment
        assert "**Failed**: 1" in comment


class TestRunUnitTestsWithResolution:
    """Tests for run_unit_tests_with_resolution function."""

    @patch('utils.test.unit_tests.run_tests')
    @patch('utils.test.unit_tests.parse_test_results')
    @patch('utils.test.unit_tests.make_issue_comment')
    def test_returns_context_on_all_pass(self, mock_comment, mock_parse, mock_run):
        """Should return UnitTestContext when all tests pass."""
        from utils.test.unit_tests import run_unit_tests_with_resolution
        from utils.test.types import UnitTestContext

        mock_response = Mock()
        mock_response.success = True
        mock_run.return_value = mock_response

        mock_test = Mock()
        mock_test.passed = True
        mock_parse.return_value = ([mock_test], 1, 0)

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_unit_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        assert isinstance(ctx, UnitTestContext)
        assert ctx.passed_count == 1
        assert ctx.failed_count == 0
        mock_resolve.assert_not_called()  # No resolution needed

    @patch('utils.test.unit_tests.run_tests')
    @patch('utils.test.unit_tests.make_issue_comment')
    def test_handles_test_execution_error(self, mock_comment, mock_run):
        """Should handle test execution errors."""
        from utils.test.unit_tests import run_unit_tests_with_resolution

        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Error running tests"
        mock_run.return_value = mock_response

        mock_logger = Mock()
        mock_resolve = Mock()

        ctx = run_unit_tests_with_resolution(
            "test1234", "999", mock_logger, "/path/to/worktree", mock_resolve
        )

        assert ctx.results == []
        mock_logger.error.assert_called()
