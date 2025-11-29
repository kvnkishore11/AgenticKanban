"""Tests for test summary module."""

from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestPostComprehensiveTestSummary:
    """Tests for post_comprehensive_test_summary function."""

    @patch('utils.test.summary.make_issue_comment')
    def test_posts_summary_with_unit_tests_only(self, mock_comment):
        """Should post summary with unit test results."""
        from utils.test.summary import post_comprehensive_test_summary

        mock_test = Mock()
        mock_test.passed = True
        mock_test.test_name = "test_passing"

        mock_logger = Mock()

        post_comprehensive_test_summary(
            "999", "test1234", [mock_test], [], mock_logger
        )

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "Unit Tests" in call_args[1]
        assert "Overall Status: PASSED" in call_args[1]

    @patch('utils.test.summary.make_issue_comment')
    def test_posts_summary_with_e2e_tests(self, mock_comment):
        """Should include E2E test results in summary."""
        from utils.test.summary import post_comprehensive_test_summary

        mock_unit = Mock()
        mock_unit.passed = True
        mock_unit.test_name = "test_unit"

        mock_e2e = Mock()
        mock_e2e.passed = False
        mock_e2e.test_name = "test_e2e"
        mock_e2e.screenshots = ["screenshot1.png"]

        mock_logger = Mock()

        post_comprehensive_test_summary(
            "999", "test1234", [mock_unit], [mock_e2e], mock_logger
        )

        call_args = mock_comment.call_args[0]
        assert "E2E Tests" in call_args[1]
        assert "Overall Status: FAILED" in call_args[1]

    @patch('utils.test.summary.make_issue_comment')
    def test_posts_summary_with_no_tests(self, mock_comment):
        """Should handle empty test results."""
        from utils.test.summary import post_comprehensive_test_summary

        mock_logger = Mock()

        post_comprehensive_test_summary(
            "999", "test1234", [], [], mock_logger
        )

        mock_comment.assert_called_once()
        call_args = mock_comment.call_args[0]
        assert "Overall Status: PASSED" in call_args[1]


class TestCalculateTotalFailures:
    """Tests for calculate_total_failures function."""

    def test_calculates_total_with_both_test_types(self):
        """Should sum unit and E2E failures."""
        from utils.test.summary import calculate_total_failures

        mock_e2e = Mock()
        mock_e2e.passed = False

        total = calculate_total_failures(2, 3, False, [mock_e2e])

        assert total == 5

    def test_excludes_e2e_when_skipped(self):
        """Should not count E2E failures when skipped."""
        from utils.test.summary import calculate_total_failures

        mock_e2e = Mock()

        total = calculate_total_failures(2, 3, True, [mock_e2e])  # skip_e2e=True

        assert total == 2

    def test_excludes_e2e_when_no_results(self):
        """Should not count E2E failures when no results."""
        from utils.test.summary import calculate_total_failures

        total = calculate_total_failures(2, 3, False, [])  # empty e2e_results

        assert total == 2
