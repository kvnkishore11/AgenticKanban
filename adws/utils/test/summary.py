"""Test summary utilities."""

import logging
from typing import List

import sys
sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.data_types import TestResult, E2ETestResult
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message


def post_comprehensive_test_summary(
    issue_number: str,
    adw_id: str,
    results: List[TestResult],
    e2e_results: List[E2ETestResult],
    logger: logging.Logger,
) -> None:
    """Post a comprehensive test summary including both unit and E2E tests.

    Args:
        issue_number: Issue number for comment
        adw_id: ADW identifier
        results: Unit test results
        e2e_results: E2E test results
        logger: Logger instance
    """
    summary = "# 🧪 Comprehensive Test Results\n\n"

    # Unit test section
    failed_count = 0
    if results:
        passed_count = sum(1 for test in results if test.passed)
        failed_count = len(results) - passed_count

        summary += "## Unit Tests\n\n"
        summary += f"- **Total**: {len(results)}\n"
        summary += f"- **Passed**: {passed_count} ✅\n"
        summary += f"- **Failed**: {failed_count} ❌\n\n"

        failed_tests = [test for test in results if not test.passed]
        if failed_tests:
            summary += "### Failed Unit Tests:\n"
            for test in failed_tests:
                summary += f"- ❌ {test.test_name}\n"
            summary += "\n"

    # E2E test section
    e2e_failed_count = 0
    if e2e_results:
        e2e_passed_count = sum(1 for test in e2e_results if test.passed)
        e2e_failed_count = len(e2e_results) - e2e_passed_count

        summary += "## E2E Tests\n\n"
        summary += f"- **Total**: {len(e2e_results)}\n"
        summary += f"- **Passed**: {e2e_passed_count} ✅\n"
        summary += f"- **Failed**: {e2e_failed_count} ❌\n\n"

        e2e_failed_tests = [test for test in e2e_results if not test.passed]
        if e2e_failed_tests:
            summary += "### Failed E2E Tests:\n"
            for result in e2e_failed_tests:
                summary += f"- ❌ {result.test_name}\n"
                if result.screenshots:
                    summary += f"  - Screenshots: {', '.join(result.screenshots)}\n"

    # Overall status
    total_failures = (
        (failed_count if results else 0) +
        (e2e_failed_count if e2e_results else 0)
    )
    if total_failures > 0:
        summary += "\n### ❌ Overall Status: FAILED\n"
        summary += f"Total failures: {total_failures}\n"
    else:
        total_tests = len(results) + len(e2e_results)
        summary += "\n### ✅ Overall Status: PASSED\n"
        summary += f"All {total_tests} tests passed successfully!\n"

    make_issue_comment(
        issue_number, format_issue_message(adw_id, "test_summary", summary)
    )

    logger.info(f"Posted comprehensive test results summary to issue #{issue_number}")


def calculate_total_failures(
    unit_failed_count: int,
    e2e_failed_count: int,
    skip_e2e: bool,
    e2e_results: List[E2ETestResult]
) -> int:
    """Calculate total test failures.

    Args:
        unit_failed_count: Number of failed unit tests
        e2e_failed_count: Number of failed E2E tests
        skip_e2e: Whether E2E tests were skipped
        e2e_results: E2E test results

    Returns:
        Total number of failures
    """
    return unit_failed_count + (e2e_failed_count if not skip_e2e and e2e_results else 0)
