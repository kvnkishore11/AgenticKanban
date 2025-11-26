"""E2E test execution utilities."""

import logging
from typing import List, Tuple, Optional

import sys
sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.data_types import AgentTemplateRequest, AgentPromptResponse, E2ETestResult
from adw_modules.agent import execute_template
from adw_modules.utils import parse_json
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message

from .types import E2ETestContext

# Agent name constant
AGENT_E2E_TESTER = "e2e_test_runner"

# Maximum E2E retry attempts
MAX_E2E_TEST_RETRY_ATTEMPTS = 2


def run_e2e_tests(
    adw_id: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None
) -> AgentPromptResponse:
    """Run the E2E test suite using the /test_e2e command.

    Note: The test_e2e command will automatically detect and use ports from .ports.env
    in the working directory if it exists.

    Args:
        adw_id: ADW identifier
        logger: Logger instance
        working_dir: Working directory for tests

    Returns:
        AgentPromptResponse with E2E test results
    """
    test_template_request = AgentTemplateRequest(
        agent_name=AGENT_E2E_TESTER,
        slash_command="/test_e2e",
        args=[],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(
        f"e2e_test_template_request: {test_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    test_response = execute_template(test_template_request)

    logger.debug(
        f"e2e_test_response: {test_response.model_dump_json(indent=2, by_alias=True)}"
    )

    return test_response


def parse_e2e_test_results(
    output: str,
    logger: logging.Logger
) -> Tuple[List[E2ETestResult], int, int]:
    """Parse E2E test results JSON and return (results, passed_count, failed_count).

    Args:
        output: Raw output from E2E test command
        logger: Logger instance

    Returns:
        Tuple of (results, passed_count, failed_count)
    """
    try:
        results = parse_json(output, List[E2ETestResult])
        passed_count = sum(1 for test in results if test.passed)
        failed_count = len(results) - passed_count
        return results, passed_count, failed_count
    except Exception as e:
        logger.error(f"Error parsing E2E test results: {e}")
        return [], 0, 0


def run_e2e_tests_with_resolution(
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    worktree_path: str,
    resolve_failed_e2e_tests_fn,
    max_attempts: int = MAX_E2E_TEST_RETRY_ATTEMPTS
) -> E2ETestContext:
    """Run E2E tests with automatic resolution and retry logic.

    Args:
        adw_id: ADW identifier
        issue_number: Issue number for comments
        logger: Logger instance
        worktree_path: Path to worktree
        resolve_failed_e2e_tests_fn: Function to resolve failed E2E tests
        max_attempts: Maximum retry attempts

    Returns:
        E2ETestContext with test results
    """
    attempt = 0
    results = []
    passed_count = 0
    failed_count = 0

    while attempt < max_attempts:
        attempt += 1
        logger.info(f"\n=== E2E Test Run Attempt {attempt}/{max_attempts} ===")

        e2e_response = run_e2e_tests(adw_id, logger, worktree_path)

        if not e2e_response.success:
            logger.error(f"Error running E2E tests: {e2e_response.output}")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, AGENT_E2E_TESTER,
                    f"❌ Error running E2E tests: {e2e_response.output}"
                ),
            )
            break

        results, passed_count, failed_count = parse_e2e_test_results(
            e2e_response.output, logger
        )

        if not results:
            logger.warning("No E2E test results to process")
            break

        if failed_count == 0:
            logger.info("All E2E tests passed, stopping retry attempts")
            break
        if attempt == max_attempts:
            logger.info(
                f"Reached maximum E2E retry attempts ({max_attempts}), stopping"
            )
            break

        logger.info("\n=== Attempting to resolve failed E2E tests ===")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops",
                f"🔧 Found {failed_count} failed E2E tests. Attempting resolution..."
            ),
        )

        failed_tests = [test for test in results if not test.passed]
        resolved, unresolved = resolve_failed_e2e_tests_fn(
            failed_tests, adw_id, issue_number, logger, worktree_path, iteration=attempt
        )

        if resolved > 0:
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, "ops",
                    f"✅ Resolved {resolved}/{failed_count} failed E2E tests"
                ),
            )
            logger.info(
                f"\n=== Re-running E2E tests after resolving {resolved} tests ==="
            )
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, AGENT_E2E_TESTER,
                    f"🔄 Re-running E2E tests (attempt {attempt + 1}/{max_attempts})..."
                ),
            )
        else:
            logger.info("No E2E tests were resolved, stopping retry attempts")
            break

    if attempt == max_attempts and failed_count > 0:
        logger.warning(
            f"Reached maximum E2E retry attempts ({max_attempts}) with {failed_count} failures remaining"
        )
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops",
                f"⚠️ Reached maximum E2E retry attempts ({max_attempts}) with {failed_count} failures"
            ),
        )

    return E2ETestContext(
        results=results,
        passed_count=passed_count,
        failed_count=failed_count
    )
