"""Core merge operation utilities."""

import subprocess
import logging
from typing import Optional

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message
from adw_modules.state import ADWState

from .types import MergeResultContext, MergeConflictContext, MergeConfigContext, MergeTestContext
from .initialization import get_main_repo_root
from .conflicts import detect_and_resolve_conflicts
from .config import restore_config_files
from .testing import run_validation_tests


# Agent name constant
AGENT_MERGER = "merger"


def execute_merge(
    adw_id: str,
    branch_name: str,
    merge_method: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> MergeResultContext:
    """Execute the merge operation from feature branch to main.

    This runs in the main repository root, not in a worktree.

    Args:
        adw_id: The ADW ID for context
        branch_name: The feature branch to merge
        merge_method: Merge strategy ("squash", "merge", or "rebase")
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance

    Returns:
        MergeResultContext with merge operation results
    """
    repo_root = get_main_repo_root()
    logger.info(f"Performing merge in main repository: {repo_root}")
    logger.info(f"Merge method: {merge_method}")

    original_branch = ""

    try:
        # Save current branch to restore later
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, cwd=repo_root
        )
        original_branch = result.stdout.strip()
        logger.debug(f"Original branch: {original_branch}")

        # Step 1: Fetch latest from origin
        logger.info("Fetching latest from origin...")
        result = subprocess.run(
            ["git", "fetch", "origin"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to fetch from origin: {result.stderr}"
            )

        # Step 2: Checkout main
        logger.info("Checking out main branch...")
        result = subprocess.run(
            ["git", "checkout", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to checkout main: {result.stderr}"
            )

        # Step 3: Pull latest main
        logger.info("Pulling latest main...")
        result = subprocess.run(
            ["git", "pull", "origin", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to pull latest main: {result.stderr}"
            )

        # Step 4: Perform the merge
        merge_result = _perform_merge(branch_name, merge_method, repo_root, original_branch, logger)
        if not merge_result.success:
            return merge_result

        # Step 5: Check for and resolve conflicts
        conflict_ctx = detect_and_resolve_conflicts(adw_id, branch_name, repo_root, logger)
        if conflict_ctx.has_conflicts:
            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(adw_id, AGENT_MERGER,
                        f"⚠️ Merge conflicts detected in {len(conflict_ctx.conflict_files)} file(s)\n"
                        f"Invoking Claude Code for automatic resolution..."),
                    state
                )

            if not conflict_ctx.resolved:
                subprocess.run(["git", "merge", "--abort"], cwd=repo_root)
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return MergeResultContext(
                    success=False,
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=f"Failed to resolve conflicts: {conflict_ctx.error}"
                )

            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(adw_id, AGENT_MERGER, "✅ Conflicts resolved successfully"),
                    state
                )

        # Step 6: Restore config files
        logger.info("Checking for worktree-specific config modifications...")
        config_ctx = restore_config_files(repo_root, logger)
        if not config_ctx.success:
            logger.warning(f"Failed to restore config files: {config_ctx.error}")
            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(adw_id, AGENT_MERGER,
                        f"⚠️ Warning: Failed to restore config files: {config_ctx.error}"),
                    state
                )

        # Step 7: Run validation tests
        logger.info("Running validation tests...")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, "🧪 Running validation tests..."),
                state
            )

        test_ctx = run_validation_tests(repo_root, logger)
        if not test_ctx.success:
            subprocess.run(["git", "merge", "--abort"], cwd=repo_root)
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Validation tests failed: {test_ctx.error}"
            )

        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, "✅ All tests passed"),
                state
            )

        # Step 8: Push to origin/main
        logger.info("Pushing to origin/main...")
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to push to origin/main: {result.stderr}"
            )

        # Step 9: Restore original branch
        logger.info(f"Restoring original branch: {original_branch}")
        subprocess.run(["git", "checkout", original_branch], cwd=repo_root)

        logger.info("✅ Successfully merged and pushed to main!")
        return MergeResultContext(
            success=True,
            original_branch=original_branch,
            merge_method=merge_method,
            error=None
        )

    except Exception as e:
        logger.error(f"Unexpected error during merge: {e}")
        try:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
        except Exception:
            pass
        return MergeResultContext(
            success=False,
            original_branch=original_branch,
            merge_method=merge_method,
            error=str(e)
        )


def _perform_merge(
    branch_name: str,
    merge_method: str,
    repo_root: str,
    original_branch: str,
    logger: logging.Logger
) -> MergeResultContext:
    """Perform the actual git merge operation.

    Args:
        branch_name: The feature branch to merge
        merge_method: Merge strategy ("squash", "merge", or "rebase")
        repo_root: Repository root directory
        original_branch: Original branch to restore on failure
        logger: Logger instance

    Returns:
        MergeResultContext with merge operation results
    """
    logger.info(f"Merging branch {branch_name}...")

    if merge_method == "squash":
        result = subprocess.run(
            ["git", "merge", "--squash", branch_name],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to squash merge {branch_name}: {result.stderr}"
            )

        # Need to commit after squash
        commit_msg = f"Merge branch '{branch_name}' via ADW Merge ISO (squash)"
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to commit squash merge: {result.stderr}"
            )

    elif merge_method == "rebase":
        result = subprocess.run(
            ["git", "rebase", branch_name],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            subprocess.run(["git", "rebase", "--abort"], cwd=repo_root)
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to rebase {branch_name}: {result.stderr}"
            )

    else:
        # Regular merge (no-ff to preserve commits)
        result = subprocess.run(
            ["git", "merge", branch_name, "--no-ff", "-m",
             f"Merge branch '{branch_name}' via ADW Merge ISO"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to merge {branch_name}: {result.stderr}"
            )

    return MergeResultContext(
        success=True,
        original_branch=original_branch,
        merge_method=merge_method,
        error=None
    )
