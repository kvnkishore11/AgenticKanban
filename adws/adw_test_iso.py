#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Test Iso - AI Developer Workflow for agentic testing in isolated worktrees

Usage:
  uv run adw_test_iso.py <issue-number> <adw-id> [--skip-e2e]

Workflow:
1. Load state and validate worktree exists
2. Run application test suite in worktree
3. Report results to issue
4. Create commit with test results in worktree
5. Push and update PR

This workflow REQUIRES that adw_plan_iso.py or adw_patch_iso.py has been run first
to create the worktree. It cannot create worktrees itself.
"""

import sys
from dotenv import load_dotenv

from utils.test import (
    # Initialization
    initialize_test_workflow,
    # Validation
    validate_test_environment,
    validate_test_worktree,
    post_test_start_message,
    # Unit tests
    run_unit_tests_with_resolution,
    post_unit_test_results,
    AGENT_TESTER,
    # E2E tests
    run_e2e_tests_with_resolution,
    AGENT_E2E_TESTER,
    # Resolution
    resolve_failed_tests,
    resolve_failed_e2e_tests,
    # Summary
    post_comprehensive_test_summary,
    calculate_total_failures,
    # Commit
    fetch_issue_for_test_commit,
    create_test_commit,
    # Finalization
    validate_repo_access,
    finalize_test_workflow,
)
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message


# Backward compatibility wrapper for tests
def run_tests_with_resolution(adw_id, issue_number, logger, worktree_path, max_attempts=3):
    """Backward compatibility wrapper for old tests.

    This function exists to support legacy tests. New code should use
    run_unit_tests_with_resolution which returns a UnitTestContext.
    """
    test_ctx = run_unit_tests_with_resolution(
        adw_id, issue_number, logger, worktree_path,
        resolve_failed_tests, max_attempts
    )
    return test_ctx.results, test_ctx.passed_count, test_ctx.failed_count, test_ctx.response


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Initialize workflow (handles CLI args, state loading, logging)
    ctx = initialize_test_workflow(sys.argv, "adw_test_iso")

    # Validate environment
    validate_test_environment(ctx.state, ctx.logger)

    # Validate worktree exists
    validation = validate_test_worktree(
        ctx.adw_id, ctx.state, ctx.issue_number, ctx.logger
    )

    # Post test start message
    post_test_start_message(
        ctx.issue_number,
        ctx.adw_id,
        validation.worktree_path,
        validation.websocket_port,
        validation.frontend_port,
        ctx.skip_e2e
    )

    # Run unit tests with resolution
    ctx.logger.info("Running unit tests in worktree with automatic resolution")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(ctx.adw_id, AGENT_TESTER, "🧪 Running unit tests in isolated environment...")
    )

    unit_ctx = run_unit_tests_with_resolution(
        ctx.adw_id,
        ctx.issue_number,
        ctx.logger,
        validation.worktree_path,
        resolve_failed_tests
    )

    # Post unit test results
    post_unit_test_results(
        ctx.issue_number,
        ctx.adw_id,
        unit_ctx.results,
        unit_ctx.passed_count,
        unit_ctx.failed_count,
        ctx.logger
    )

    # Run E2E tests if not skipped
    e2e_results = []
    e2e_failed = 0
    if not ctx.skip_e2e:
        ctx.logger.info("Running E2E tests in worktree with automatic resolution")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(ctx.adw_id, AGENT_E2E_TESTER, "🌐 Running E2E tests in isolated environment...")
        )

        e2e_ctx = run_e2e_tests_with_resolution(
            ctx.adw_id,
            ctx.issue_number,
            ctx.logger,
            validation.worktree_path,
            resolve_failed_e2e_tests
        )

        e2e_results = e2e_ctx.results
        e2e_failed = e2e_ctx.failed_count

        if e2e_results:
            ctx.logger.info(f"E2E test results: {e2e_ctx.passed_count} passed, {e2e_ctx.failed_count} failed")

    # Post comprehensive summary
    post_comprehensive_test_summary(
        ctx.issue_number, ctx.adw_id, unit_ctx.results, e2e_results, ctx.logger
    )

    # Calculate total failures
    total_failures = calculate_total_failures(
        unit_ctx.failed_count, e2e_failed, ctx.skip_e2e, e2e_results
    )

    if total_failures > 0:
        ctx.logger.warning(f"Tests completed with {total_failures} failures - continuing to commit results")

    # Validate repo access
    validate_repo_access(ctx.logger)

    # Fetch issue for commit
    issue_ctx = fetch_issue_for_test_commit(
        ctx.issue_number, ctx.adw_id, ctx.state, ctx.logger
    )

    # Create test commit
    create_test_commit(
        issue_ctx.issue,
        issue_ctx.issue_command,
        ctx.adw_id,
        validation.worktree_path,
        ctx.issue_number,
        ctx.logger
    )

    # Finalize workflow
    finalize_test_workflow(
        ctx.state,
        validation.worktree_path,
        ctx.issue_number,
        ctx.adw_id,
        total_failures,
        ctx.logger
    )


if __name__ == "__main__":
    main()
