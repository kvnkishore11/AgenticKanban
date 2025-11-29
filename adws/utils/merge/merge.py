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

from .types import MergeResultContext
from .initialization import get_main_repo_root
from .conflicts import detect_and_resolve_conflicts, check_merge_conflicts
from .config import restore_config_files
from .testing import run_validation_tests


# Agent name constant
AGENT_MERGER = "merger"

# Stash name for merge operations
MERGE_STASH_NAME = "adw-merge-auto-stash"


def _abort_merge_operation(merge_method: str, repo_root: str, logger: logging.Logger) -> None:
    """Abort the current merge/rebase operation based on merge method.

    Args:
        merge_method: The merge method being used
        repo_root: Repository root directory
        logger: Logger instance
    """
    if merge_method == "rebase":
        logger.info("Aborting rebase operation...")
        subprocess.run(["git", "rebase", "--abort"], cwd=repo_root, capture_output=True)
    else:
        # For squash, squash-rebase, and merge methods
        logger.info("Aborting merge operation...")
        # Try merge abort first, then reset if needed
        result = subprocess.run(["git", "merge", "--abort"], cwd=repo_root, capture_output=True)
        if result.returncode != 0:
            # If merge abort fails, try to reset
            subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=repo_root, capture_output=True)


def _check_and_stash_changes(repo_root: str, logger: logging.Logger) -> bool:
    """Check for uncommitted changes and stash them if present.

    Args:
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        True if changes were stashed, False if no changes to stash
    """
    # Check if there are any uncommitted changes (staged or unstaged)
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True, text=True, cwd=repo_root
    )

    if result.stdout.strip():
        # There are uncommitted changes, stash them
        logger.info("Found uncommitted changes, stashing them...")
        stash_result = subprocess.run(
            ["git", "stash", "push", "-m", MERGE_STASH_NAME, "--include-untracked"],
            capture_output=True, text=True, cwd=repo_root
        )
        if stash_result.returncode != 0:
            logger.warning(f"Failed to stash changes: {stash_result.stderr}")
            return False
        logger.info("Successfully stashed local changes")
        return True

    logger.debug("No uncommitted changes to stash")
    return False


def _pop_stashed_changes(repo_root: str, logger: logging.Logger, was_stashed: bool) -> None:
    """Pop stashed changes if they were stashed during merge.

    Args:
        repo_root: Repository root directory
        logger: Logger instance
        was_stashed: Whether changes were stashed (from _check_and_stash_changes)
    """
    if not was_stashed:
        return

    logger.info("Restoring stashed changes...")

    # First check if our stash exists
    result = subprocess.run(
        ["git", "stash", "list"],
        capture_output=True, text=True, cwd=repo_root
    )

    if MERGE_STASH_NAME in result.stdout:
        pop_result = subprocess.run(
            ["git", "stash", "pop"],
            capture_output=True, text=True, cwd=repo_root
        )
        if pop_result.returncode != 0:
            logger.warning(f"Failed to pop stashed changes: {pop_result.stderr}")
            logger.warning("Your changes are still in the stash. Run 'git stash pop' manually to restore them.")
        else:
            logger.info("Successfully restored stashed changes")
    else:
        logger.debug("No matching stash found to pop")


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
    was_stashed = False

    try:
        # Save current branch to restore later
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, cwd=repo_root
        )
        original_branch = result.stdout.strip()
        logger.debug(f"Original branch: {original_branch}")

        # Step 0: Stash any uncommitted changes to avoid conflicts during checkout
        was_stashed = _check_and_stash_changes(repo_root, logger)

        # Step 1: Fetch latest from origin
        logger.info("Fetching latest from origin...")
        result = subprocess.run(
            ["git", "fetch", "origin"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            _pop_stashed_changes(repo_root, logger, was_stashed)
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
            _pop_stashed_changes(repo_root, logger, was_stashed)
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
            _pop_stashed_changes(repo_root, logger, was_stashed)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to pull latest main: {result.stderr}"
            )

        # Step 4: Perform the merge
        merge_result = _perform_merge(branch_name, merge_method, repo_root, original_branch, logger)
        if not merge_result.success:
            _pop_stashed_changes(repo_root, logger, was_stashed)
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
                _abort_merge_operation(merge_method, repo_root, logger)
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                _pop_stashed_changes(repo_root, logger, was_stashed)
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

            # After resolving conflicts, we need different actions based on merge method
            if merge_method == "rebase":
                # For rebase, we need to continue the rebase
                logger.info("Continuing rebase after conflict resolution...")
                result = subprocess.run(
                    ["git", "rebase", "--continue"],
                    capture_output=True, text=True, cwd=repo_root,
                    env={**os.environ, "GIT_EDITOR": "true"}  # Skip editor for commit message
                )
                if result.returncode != 0:
                    # Check if rebase is already complete
                    if "No rebase in progress" not in result.stderr:
                        _abort_merge_operation(merge_method, repo_root, logger)
                        subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                        _pop_stashed_changes(repo_root, logger, was_stashed)
                        return MergeResultContext(
                            success=False,
                            original_branch=original_branch,
                            merge_method=merge_method,
                            error=f"Failed to continue rebase after conflict resolution: {result.stderr}"
                        )
                    logger.info("Rebase already complete")
            elif merge_method in ("squash", "squash-rebase"):
                # For squash merges, we need to commit the resolved conflicts
                logger.info("Committing resolved conflicts for squash merge...")
                commit_msg = f"Merge branch '{branch_name}' via ADW Merge ISO ({merge_method}) - conflicts resolved"
                result = subprocess.run(
                    ["git", "commit", "-m", commit_msg],
                    capture_output=True, text=True, cwd=repo_root
                )
                if result.returncode != 0:
                    # Check if already committed or nothing to commit
                    if "nothing to commit" not in result.stdout.lower() and "nothing to commit" not in result.stderr.lower():
                        subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                        _pop_stashed_changes(repo_root, logger, was_stashed)
                        return MergeResultContext(
                            success=False,
                            original_branch=original_branch,
                            merge_method=merge_method,
                            error=f"Failed to commit after conflict resolution: {result.stderr}"
                        )
                    logger.info("No commit needed - changes may already be committed")

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
            _abort_merge_operation(merge_method, repo_root, logger)
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            _pop_stashed_changes(repo_root, logger, was_stashed)
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
            _pop_stashed_changes(repo_root, logger, was_stashed)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to push to origin/main: {result.stderr}"
            )

        # Step 9: Restore original branch
        logger.info(f"Restoring original branch: {original_branch}")
        subprocess.run(["git", "checkout", original_branch], cwd=repo_root)

        # Step 10: Restore stashed changes
        _pop_stashed_changes(repo_root, logger, was_stashed)

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
        # Try to restore stashed changes even on exception
        try:
            _pop_stashed_changes(repo_root, logger, was_stashed)
        except Exception:
            logger.warning("Failed to restore stashed changes after exception")
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
        merge_method: Merge strategy ("squash", "merge", "rebase", or "squash-rebase")
        repo_root: Repository root directory
        original_branch: Original branch to restore on failure
        logger: Logger instance

    Returns:
        MergeResultContext with merge operation results

    Note:
        For squash-rebase, we use a worktree-safe approach that doesn't require
        checking out the feature branch (which may be locked by a worktree).
        Instead, we fetch the remote branch and merge from origin/branch-name.
    """
    logger.info(f"Merging branch {branch_name} using {merge_method}...")

    if merge_method == "squash-rebase":
        # Worktree-safe squash-rebase: merge from remote branch without checkout
        # This avoids the "branch already checked out" error when worktree exists

        # Step 1: Ensure we have the latest from origin for this branch
        logger.info(f"Fetching latest {branch_name} from origin...")
        result = subprocess.run(
            ["git", "fetch", "origin", branch_name],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Try without specific branch (in case it doesn't exist on remote yet)
            logger.warning(f"Could not fetch specific branch, trying general fetch")
            subprocess.run(["git", "fetch", "origin"], cwd=repo_root)

        # Step 2: Squash merge from origin/branch-name (or local branch if not on remote)
        # Try origin first, fall back to local
        logger.info(f"Squash merging {branch_name}...")
        merge_ref = f"origin/{branch_name}"

        # Check if origin/branch exists
        check_result = subprocess.run(
            ["git", "rev-parse", "--verify", merge_ref],
            capture_output=True, text=True, cwd=repo_root
        )
        if check_result.returncode != 0:
            # Fall back to local branch reference
            logger.info(f"Remote branch not found, using local ref: {branch_name}")
            merge_ref = branch_name

        result = subprocess.run(
            ["git", "merge", "--squash", merge_ref],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Check if failure is due to merge conflicts (which can be resolved)
            # vs a real error (branch not found, etc.)
            has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)
            if has_conflicts:
                # Conflicts detected - return success to allow conflict resolution step
                logger.info(f"Merge has conflicts in {len(conflict_files)} file(s), proceeding to resolution")
                return MergeResultContext(
                    success=True,  # Allow execute_merge to proceed to conflict resolution
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=None
                )
            # Real failure - not conflicts
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to squash merge {branch_name}: {result.stderr}"
            )

        # Step 3: Commit the squash
        commit_msg = f"Merge branch '{branch_name}' via ADW Merge ISO (squash)"
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Check if there's nothing to commit (already up to date)
            if "nothing to commit" in result.stdout.lower() or "nothing to commit" in result.stderr.lower():
                logger.info("No changes to commit - branch may already be merged")
                return MergeResultContext(
                    success=True,
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=None
                )
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return MergeResultContext(
                success=False,
                original_branch=original_branch,
                merge_method=merge_method,
                error=f"Failed to commit squash merge: {result.stderr}"
            )

        logger.info("✅ Squash-rebase merge completed successfully")

    elif merge_method == "squash":
        result = subprocess.run(
            ["git", "merge", "--squash", branch_name],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Check if failure is due to merge conflicts (which can be resolved)
            has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)
            if has_conflicts:
                # Conflicts detected - return success to allow conflict resolution step
                logger.info(f"Merge has conflicts in {len(conflict_files)} file(s), proceeding to resolution")
                return MergeResultContext(
                    success=True,  # Allow execute_merge to proceed to conflict resolution
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=None
                )
            # Real failure - not conflicts
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
            # Check if failure is due to merge conflicts (which can be resolved)
            has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)
            if has_conflicts:
                # Conflicts detected - return success to allow conflict resolution step
                logger.info(f"Rebase has conflicts in {len(conflict_files)} file(s), proceeding to resolution")
                return MergeResultContext(
                    success=True,  # Allow execute_merge to proceed to conflict resolution
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=None
                )
            # Real failure - not conflicts
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
            # Check if failure is due to merge conflicts (which can be resolved)
            has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)
            if has_conflicts:
                # Conflicts detected - return success to allow conflict resolution step
                logger.info(f"Merge has conflicts in {len(conflict_files)} file(s), proceeding to resolution")
                return MergeResultContext(
                    success=True,  # Allow execute_merge to proceed to conflict resolution
                    original_branch=original_branch,
                    merge_method=merge_method,
                    error=None
                )
            # Real failure - not conflicts
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
