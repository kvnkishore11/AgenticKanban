"""Merge workflow validation utilities."""

import logging
import subprocess
from typing import Optional, Tuple

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.worktree_ops import validate_worktree as _validate_worktree
from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message

from .types import MergeValidationContext
from .initialization import get_main_repo_root


# Agent name constant
AGENT_MERGER = "merger"


def _branch_exists(branch_name: str, logger: logging.Logger) -> Tuple[bool, str]:
    """Check if a git branch exists locally or remotely.

    Args:
        branch_name: The branch name to check
        logger: Logger instance

    Returns:
        Tuple of (exists, error_message)
    """
    repo_root = get_main_repo_root()

    # Check local branch
    result = subprocess.run(
        ["git", "branch", "--list", branch_name],
        capture_output=True, text=True, cwd=repo_root
    )
    if result.stdout.strip():
        logger.debug(f"Branch '{branch_name}' exists locally")
        return True, ""

    # Check remote branch
    result = subprocess.run(
        ["git", "branch", "-r", "--list", f"origin/{branch_name}"],
        capture_output=True, text=True, cwd=repo_root
    )
    if result.stdout.strip():
        logger.debug(f"Branch '{branch_name}' exists on remote")
        return True, ""

    return False, f"Branch '{branch_name}' not found locally or on remote"


def validate_merge_worktree(
    adw_id: str,
    state: ADWState,
    issue_number: Optional[str],
    logger: logging.Logger
) -> MergeValidationContext:
    """Validate that the branch exists and is ready for merge.

    This is a lenient validation that allows merging even if the worktree
    directory has been deleted, as long as the branch still exists.

    Args:
        adw_id: The ADW ID of the worktree
        state: ADW state object
        issue_number: Optional issue number for comments
        logger: Logger instance

    Returns:
        MergeValidationContext with validation results
    """
    logger.info("Validating merge prerequisites...")

    worktree_path = state.get("worktree_path", "")
    branch_name = state.get("branch_name", "")

    if not branch_name:
        error = "No branch name found in ADW state"
        logger.error(error)
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, f"❌ Validation failed: {error}"),
                state
            )
        return MergeValidationContext(
            is_valid=False,
            worktree_path="",
            branch_name="",
            error=error
        )

    # First, try the strict worktree validation
    valid, error = _validate_worktree(adw_id, state)

    if valid:
        logger.info(f"✅ Worktree validated at: {worktree_path}")
        return MergeValidationContext(
            is_valid=True,
            worktree_path=worktree_path,
            branch_name=branch_name,
            error=None
        )

    # Worktree doesn't exist, but check if the branch exists
    logger.warning(f"Worktree validation failed: {error}")
    logger.info("Checking if branch exists for merge without worktree...")

    branch_exists, branch_error = _branch_exists(branch_name, logger)

    if branch_exists:
        logger.info(f"✅ Branch '{branch_name}' exists - can proceed with merge")
        logger.info("⚠️ Worktree cleanup will be skipped (already deleted)")
        return MergeValidationContext(
            is_valid=True,
            worktree_path="",  # Empty path indicates worktree is gone
            branch_name=branch_name,
            error=None
        )

    # Neither worktree nor branch exists
    final_error = f"Cannot merge: {error}. Additionally, {branch_error}"
    logger.error(final_error)
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER, f"❌ Validation failed: {final_error}"),
            state
        )
    return MergeValidationContext(
        is_valid=False,
        worktree_path="",
        branch_name="",
        error=final_error
    )
