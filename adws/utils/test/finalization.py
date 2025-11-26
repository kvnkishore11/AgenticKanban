"""Test workflow finalization utilities."""

import json
import logging

import sys
sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.state import ADWState
from adw_modules.git_ops import finalize_git_operations
from adw_modules.github import make_issue_comment, get_repo_url, extract_repo_path
from adw_modules.workflow_ops import format_issue_message


def validate_repo_access(logger: logging.Logger) -> None:
    """Validate repository access for git operations.

    Args:
        logger: Logger instance

    Raises:
        SystemExit: If repository URL cannot be obtained
    """
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)


def finalize_test_workflow(
    state: ADWState,
    worktree_path: str,
    issue_number: str,
    adw_id: str,
    total_failures: int,
    logger: logging.Logger
) -> None:
    """Finalize the test workflow.

    Args:
        state: ADW state object
        worktree_path: Path to worktree
        issue_number: Issue number for comments
        adw_id: ADW identifier
        total_failures: Total number of test failures
        logger: Logger instance

    Raises:
        SystemExit: If tests failed (exit code 1)
    """
    # Finalize git operations (push and PR)
    finalize_git_operations(state, logger, cwd=worktree_path)

    logger.info("Isolated testing phase completed successfully")
    make_issue_comment(
        issue_number, format_issue_message(adw_id, "ops", "✅ Isolated testing phase completed")
    )

    # Save final state
    state.save("adw_test_iso")

    # Post final state summary to issue
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: 📋 Final test state:\n```json\n{json.dumps(state.data, indent=2)}\n```"
    )

    # Exit with appropriate code based on test results
    if total_failures > 0:
        logger.error(f"Test workflow completed with {total_failures} failures")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"❌ Test workflow completed with {total_failures} failures")
        )
        sys.exit(1)
    else:
        logger.info("All tests passed successfully")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", "✅ All tests passed successfully!")
        )
