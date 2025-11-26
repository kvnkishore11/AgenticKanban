"""Test resolution utilities for failed tests."""

import logging
from typing import List, Tuple

import sys
sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.data_types import AgentTemplateRequest, TestResult, E2ETestResult
from adw_modules.agent import execute_template
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message


def resolve_failed_tests(
    failed_tests: List[TestResult],
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    worktree_path: str,
    iteration: int = 1,
) -> Tuple[int, int]:
    """Attempt to resolve failed tests using the resolve_failed_test command.

    Args:
        failed_tests: List of failed test results
        adw_id: ADW identifier
        issue_number: Issue number for comments
        logger: Logger instance
        worktree_path: Path to worktree
        iteration: Current iteration number

    Returns:
        Tuple of (resolved_count, unresolved_count)
    """
    resolved_count = 0
    unresolved_count = 0

    for idx, test in enumerate(failed_tests):
        logger.info(
            f"\n=== Resolving failed test {idx + 1}/{len(failed_tests)}: {test.test_name} ==="
        )

        test_payload = test.model_dump_json(indent=2)
        agent_name = f"test_resolver_iter{iteration}_{idx}"

        resolve_request = AgentTemplateRequest(
            agent_name=agent_name,
            slash_command="/resolve_failed_test",
            args=[test_payload],
            adw_id=adw_id,
            working_dir=worktree_path,
        )

        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, agent_name,
                f"🔧 Attempting to resolve: {test.test_name}\n```json\n{test_payload}\n```"
            ),
        )

        response = execute_template(resolve_request)

        if response.success:
            resolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, agent_name,
                    f"✅ Successfully resolved: {test.test_name}"
                ),
            )
            logger.info(f"Successfully resolved: {test.test_name}")
        else:
            unresolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, agent_name,
                    f"❌ Failed to resolve: {test.test_name}"
                ),
            )
            logger.error(f"Failed to resolve: {test.test_name}")

    return resolved_count, unresolved_count


def resolve_failed_e2e_tests(
    failed_tests: List[E2ETestResult],
    adw_id: str,
    issue_number: str,
    logger: logging.Logger,
    worktree_path: str,
    iteration: int = 1,
) -> Tuple[int, int]:
    """Attempt to resolve failed E2E tests using the resolve_failed_e2e_test command.

    Args:
        failed_tests: List of failed E2E test results
        adw_id: ADW identifier
        issue_number: Issue number for comments
        logger: Logger instance
        worktree_path: Path to worktree
        iteration: Current iteration number

    Returns:
        Tuple of (resolved_count, unresolved_count)
    """
    resolved_count = 0
    unresolved_count = 0

    for idx, test in enumerate(failed_tests):
        logger.info(
            f"\n=== Resolving failed E2E test {idx + 1}/{len(failed_tests)}: {test.test_name} ==="
        )

        test_payload = test.model_dump_json(indent=2)
        agent_name = f"e2e_test_resolver_iter{iteration}_{idx}"

        resolve_request = AgentTemplateRequest(
            agent_name=agent_name,
            slash_command="/resolve_failed_e2e_test",
            args=[test_payload],
            adw_id=adw_id,
            working_dir=worktree_path,
        )

        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, agent_name,
                f"🔧 Attempting to resolve E2E test: {test.test_name}\n```json\n{test_payload}\n```"
            ),
        )

        response = execute_template(resolve_request)

        if response.success:
            resolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, agent_name,
                    f"✅ Successfully resolved E2E test: {test.test_name}"
                ),
            )
            logger.info(f"Successfully resolved E2E test: {test.test_name}")
        else:
            unresolved_count += 1
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, agent_name,
                    f"❌ Failed to resolve E2E test: {test.test_name}"
                ),
            )
            logger.error(f"Failed to resolve E2E test: {test.test_name}")

    return resolved_count, unresolved_count
