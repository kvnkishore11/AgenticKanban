"""Merge workflow cleanup utilities."""

import subprocess
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.worktree_ops import remove_worktree

from .types import MergeCleanupContext
from .initialization import get_main_repo_root


def cleanup_worktree_and_branch(
    adw_id: str,
    branch_name: str,
    logger: logging.Logger
) -> MergeCleanupContext:
    """Clean up worktree and optionally delete remote branch.

    Args:
        adw_id: ADW ID of the worktree
        branch_name: Branch name to optionally delete
        logger: Logger instance

    Returns:
        MergeCleanupContext with cleanup results
    """
    repo_root = get_main_repo_root()
    worktree_removed = False
    branch_deleted = False
    error = None

    # Step 1: Remove worktree
    logger.info(f"Cleaning up worktree for {adw_id}...")
    success, remove_error = remove_worktree(adw_id, logger)

    if not success:
        logger.warning(f"Failed to remove worktree: {remove_error}")
        logger.warning("You may need to manually clean up the worktree")
        error = remove_error
    else:
        logger.info("✅ Worktree removed successfully")
        worktree_removed = True

    # Step 2: Prune git worktrees
    logger.info("Pruning git worktrees...")
    subprocess.run(["git", "worktree", "prune"], cwd=repo_root)

    # Step 3: Delete remote branch
    logger.info(f"Deleting remote branch {branch_name}...")
    result = subprocess.run(
        ["git", "push", "origin", "--delete", branch_name],
        capture_output=True,
        text=True,
        cwd=repo_root
    )

    if result.returncode != 0:
        logger.warning(f"Failed to delete remote branch: {result.stderr}")
        logger.warning("You may want to manually delete the branch if it's no longer needed")
        if error:
            error = f"{error}; Failed to delete remote branch: {result.stderr}"
        else:
            error = f"Failed to delete remote branch: {result.stderr}"
    else:
        logger.info(f"✅ Remote branch {branch_name} deleted")
        branch_deleted = True

    return MergeCleanupContext(
        worktree_removed=worktree_removed,
        branch_deleted=branch_deleted,
        error=error
    )
