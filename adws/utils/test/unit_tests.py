"""Unit test execution utilities."""

import json
import logging
from typing import List, Tuple, Optional

import sys
sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.data_types import AgentTemplateRequest, AgentPromptResponse, TestResult
from adw_modules.agent import execute_template
from adw_modules.utils import parse_json
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message

from .types import UnitTestContext

# Agent name constant
AGENT_TESTER = "test_runner"

# Maximum retry attempts
MAX_TEST_RETRY_ATTEMPTS = 4


def run_tests(
    adw_id: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None
) -> AgentPromptResponse:
    """Run the test suite using the /test command.

    Args:
        adw_id: ADW identifier
        logger: Logger instance
        working_dir: Working directory for tests

    Returns:
        AgentPromptResponse with test results
    """
    test_template_request = AgentTemplateRequest(
        agent_name=AGENT_TESTER,
        slash_command="/test",
        args=[],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(
        f"test_template_request: {test_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    test_response = execute_template(test_template_request)

    logger.debug(
        f"test_response: {test_response.model_dump_json(indent=2, by_alias=True)}"
    )

    return test_response


def parse_test_results(
    output: str,
    logger: logging.Logger
) -> Tuple[List[TestResult], int, int]:
    """Parse test results JSON and return (results, passed_count, failed_count).

    Args:
        output: Raw output from test command
        logger: Logger instance

    Returns:
        Tuple of (results, passed_count, failed_count)
    """
    try:
        results = parse_json(output, List[TestResult])
        passed_count = sum(1 for test in results if test.passed)
        failed_count = len(results) - passed_count
        return results, passed_count, failed_count
    except Exception as e:
        logger.error(f"Error parsing test results: {e}")
        return [], 0, 0


def format_test_results_comment(
    results: List[TestResult],
    passed_count: int,
    failed_count: int
) -> str:
    """Format test results for GitHub issue comment with JSON blocks.

    Args:
        results: List of test results
        passed_count: Number of passed tests
        failed_count: Number of failed tests

    Returns:
        Formatted comment string
    """
    if not results:
        return "❌ No test results found"

    failed_tests = [test for test in results if not test.passed]
    passed_tests = [test for test in results if test.passed]

    comment_parts = []

    if failed_tests:
        comment_parts.append("")
        comment_parts.append("## ❌ Failed Tests")
        comment_parts.append("")

        for test in failed_tests:
            comment_parts.append(f"### {test.test_name}")
            comment_parts.append("")
            comment_parts.append("```json")
            comment_parts.append(json.dumps(test.model_dump(), indent=2))
            comment_parts.append("```")
            comment_parts.append("")

    if passed_tests:
        comment_parts.append("## ✅ Passed Tests")
        comment_parts.append("")

        for test in passed_tests:
            comment_parts.append(f"### {test.test_name}")
            comment_parts.append("")
            comment_parts.append("```json")
            comment_parts.append(json.dumps(test.model_dump(), indent=2))
            comment_parts.append("```")
            comment_parts.append("")

    comment_parts.append("## Summary")
    comment_parts.append(f"- **Passed**: {passed_count}")
    comment_parts.append(f"- **Failed**: {failed_count}")
    comment_parts.append(f"- **Total**: {len(results)}")

    return "\n".join(comment_parts)


def run_unit_tests_with_resolution(
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    worktree_path: str,
    resolve_failed_tests_fn,
    max_attempts: int = MAX_TEST_RETRY_ATTEMPTS
) -> UnitTestContext:
    """Run tests with automatic resolution and retry logic.

    Args:
        adw_id: ADW identifier
        issue_number: Issue number for comments
        logger: Logger instance
        worktree_path: Path to worktree
        resolve_failed_tests_fn: Function to resolve failed tests
        max_attempts: Maximum retry attempts

    Returns:
        UnitTestContext with test results
    """
    attempt = 0
    results = []
    passed_count = 0
    failed_count = 0
    test_response = None

    while attempt < max_attempts:
        attempt += 1
        logger.info(f"\n=== Test Run Attempt {attempt}/{max_attempts} ===")

        test_response = run_tests(adw_id, logger, worktree_path)

        if not test_response.success:
            logger.error(f"Error running tests: {test_response.output}")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, AGENT_TESTER,
                    f"❌ Error running tests: {test_response.output}"
                ),
            )
            break

        results, passed_count, failed_count = parse_test_results(
            test_response.output, logger
        )

        if failed_count == 0:
            logger.info("All tests passed, stopping retry attempts")
            break
        if attempt == max_attempts:
            logger.info(f"Reached maximum retry attempts ({max_attempts}), stopping")
            break

        logger.info("\n=== Attempting to resolve failed tests ===")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops",
                f"🔧 Found {failed_count} failed tests. Attempting resolution..."
            ),
        )

        failed_tests = [test for test in results if not test.passed]
        resolved, unresolved = resolve_failed_tests_fn(
            failed_tests, adw_id, issue_number, logger, worktree_path, iteration=attempt
        )

        if resolved > 0:
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, "ops",
                    f"✅ Resolved {resolved}/{failed_count} failed tests"
                ),
            )
            logger.info(f"\n=== Re-running tests after resolving {resolved} tests ===")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, AGENT_TESTER,
                    f"🔄 Re-running tests (attempt {attempt + 1}/{max_attempts})..."
                ),
            )
        else:
            logger.info("No tests were resolved, stopping retry attempts")
            break

    if attempt == max_attempts and failed_count > 0:
        logger.warning(
            f"Reached maximum retry attempts ({max_attempts}) with {failed_count} failures remaining"
        )
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops",
                f"⚠️ Reached maximum retry attempts ({max_attempts}) with {failed_count} failures"
            ),
        )

    return UnitTestContext(
        results=results,
        passed_count=passed_count,
        failed_count=failed_count,
        response=test_response
    )


def post_unit_test_results(
    issue_number: str,
    adw_id: str,
    results: List[TestResult],
    passed_count: int,
    failed_count: int,
    logger: logging.Logger
) -> None:
    """Post unit test results to issue.

    Args:
        issue_number: Issue number
        adw_id: ADW identifier
        results: Test results
        passed_count: Passed count
        failed_count: Failed count
        logger: Logger instance
    """
    if results:
        comment = format_test_results_comment(results, passed_count, failed_count)
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_TESTER, comment)
        )
        logger.info(f"Test results: {passed_count} passed, {failed_count} failed")
    else:
        logger.warning("No test results found in output")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, AGENT_TESTER, "⚠️ No test results found in output"
            ),
        )
