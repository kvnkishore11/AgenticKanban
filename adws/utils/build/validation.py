"""Build workflow validation utilities."""

import sys
import os
import subprocess
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import check_env_vars
from adw_modules.github import make_issue_comment, get_repo_url, extract_repo_path
from adw_modules.workflow_ops import format_issue_message
from adw_modules.worktree_ops import validate_worktree

from .types import BuildValidationContext


def validate_build_environment(
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Validate environment for build workflow.

    Args:
        state: ADW state object
        logger: Logger instance

    Raises:
        SystemExit: If environment validation fails
    """
    check_env_vars(logger)

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)


def validate_worktree_and_state(
    adw_id: str,
    state: ADWState,
    issue_number: str,
    logger: logging.Logger
) -> BuildValidationContext:
    """Validate worktree exists and required state fields are present.

    Args:
        adw_id: ADW identifier
        state: ADW state object
        issue_number: Issue number for comments
        logger: Logger instance

    Returns:
        BuildValidationContext with worktree and plan details

    Raises:
        SystemExit: If validation fails
    """
    # Validate worktree exists
    valid, error = validate_worktree(adw_id, state)
    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Worktree validation failed: {error}\n"
                               "Run adw_plan_iso.py or adw_patch_iso.py first")
        )
        sys.exit(1)

    # Get worktree path
    worktree_path = state.get("worktree_path")
    logger.info(f"Using worktree at: {worktree_path}")

    # Ensure we have required state fields
    branch_name = state.get("branch_name")
    if not branch_name:
        error_msg = "No branch name in state - run adw_plan_iso.py first"
        logger.error(error_msg)
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"{error_msg}")
        )
        sys.exit(1)

    plan_file = state.get("plan_file")
    if not plan_file:
        error_msg = "No plan file in state - run adw_plan_iso.py first"
        logger.error(error_msg)
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"{error_msg}")
        )
        sys.exit(1)

    # Get port information
    websocket_port = state.get("websocket_port", "9100")
    frontend_port = state.get("frontend_port", "9200")

    return BuildValidationContext(
        worktree_path=worktree_path,
        branch_name=branch_name,
        plan_file=plan_file,
        websocket_port=str(websocket_port),
        frontend_port=str(frontend_port)
    )


def checkout_branch(
    branch_name: str,
    worktree_path: str,
    adw_id: str,
    issue_number: str,
    logger: logging.Logger
) -> None:
    """Checkout the branch in the worktree.

    Args:
        branch_name: Branch name to checkout
        worktree_path: Path to worktree
        adw_id: ADW identifier
        issue_number: Issue number for comments
        logger: Logger instance

    Raises:
        SystemExit: If checkout fails
    """
    result = subprocess.run(
        ["git", "checkout", branch_name],
        capture_output=True,
        text=True,
        cwd=worktree_path
    )

    if result.returncode != 0:
        logger.error(f"Failed to checkout branch {branch_name} in worktree: {result.stderr}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Failed to checkout branch {branch_name} in worktree")
        )
        sys.exit(1)

    logger.info(f"Checked out branch in worktree: {branch_name}")
