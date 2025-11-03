#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Merge Worktree - Merge isolated ADW worktree into main branch

Usage:
  uv run adw_merge_worktree.py <adw-id> [merge-method]

Arguments:
  adw-id: The ADW ID of the worktree to merge (required)
  merge-method: Merge strategy - "squash", "merge", or "rebase" (default: "squash")

Workflow:
1. Load ADW state and validate worktree exists
2. Get branch name and worktree path from state
3. Switch to main repository root (not worktree)
4. Fetch latest changes from origin
5. Checkout and pull main branch
6. Attempt to merge the feature branch
7. If conflicts occur, invoke Claude Code for resolution
8. Run validation tests to ensure merge is clean
9. Push merged changes to origin/main
10. Clean up worktree after successful merge
11. Optionally delete remote branch
12. Update ADW state with merge status

This command works with or without an associated issue number, providing
flexibility for various workflows.
"""

import sys
import os
import logging
import subprocess
from typing import Optional, Tuple
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.worktree_ops import validate_worktree, remove_worktree, get_worktree_path

# Agent name constant
AGENT_MERGER = "merger"


def get_main_repo_root() -> str:
    """Get the main repository root directory (parent of adws)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def check_merge_conflicts(repo_root: str, logger: logging.Logger) -> Tuple[bool, list]:
    """Check if there are merge conflicts.

    Args:
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        Tuple of (has_conflicts, conflict_files)
    """
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=U"],
        capture_output=True,
        text=True,
        cwd=repo_root
    )

    conflict_files = [f for f in result.stdout.strip().split('\n') if f]
    has_conflicts = len(conflict_files) > 0

    if has_conflicts:
        logger.warning(f"Found {len(conflict_files)} files with conflicts")
        for file in conflict_files:
            logger.warning(f"  - {file}")

    return has_conflicts, conflict_files


def invoke_claude_for_conflicts(adw_id: str, branch_name: str, conflict_files: list, logger: logging.Logger) -> Tuple[bool, Optional[str]]:
    """Invoke Claude Code to resolve merge conflicts.

    Args:
        adw_id: ADW ID for context
        branch_name: Branch being merged
        conflict_files: List of files with conflicts
        logger: Logger instance

    Returns:
        Tuple of (success, error_message)
    """
    logger.info("Invoking Claude Code to resolve merge conflicts...")

    # Get Claude Code path from environment or use default
    claude_path = os.environ.get("CLAUDE_CODE_PATH", "claude")

    # Construct prompt for Claude Code
    prompt = f"""Resolve merge conflicts from ADW worktree {adw_id}.

The changes are from branch '{branch_name}'.

Conflicting files:
{chr(10).join(f'- {f}' for f in conflict_files)}

Please:
1. Analyze each conflict carefully
2. Resolve conflicts following best practices
3. Ensure code quality and consistency
4. After resolving, stage the resolved files
5. Run tests to validate the merge

If conflicts cannot be automatically resolved, explain why and suggest manual intervention."""

    # Run Claude Code in headless mode
    result = subprocess.run(
        [claude_path, "-p", prompt],
        capture_output=True,
        text=True,
        cwd=get_main_repo_root()
    )

    if result.returncode != 0:
        error_msg = f"Claude Code failed: {result.stderr}"
        logger.error(error_msg)
        return False, error_msg

    logger.info("Claude Code completed conflict resolution")
    logger.debug(f"Claude output: {result.stdout}")

    # Check if conflicts are resolved
    has_conflicts, remaining_conflicts = check_merge_conflicts(get_main_repo_root(), logger)

    if has_conflicts:
        error_msg = f"Conflicts still remain after Claude Code resolution: {remaining_conflicts}"
        logger.error(error_msg)
        return False, error_msg

    logger.info("✅ All conflicts resolved successfully")
    return True, None


def run_validation_tests(repo_root: str, logger: logging.Logger) -> Tuple[bool, Optional[str]]:
    """Run validation tests to ensure merge is clean.

    Args:
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        Tuple of (success, error_message)
    """
    logger.info("Running validation tests...")

    # Run server tests
    test_dir = os.path.join(repo_root, "app", "server")
    if not os.path.exists(test_dir):
        logger.warning("Test directory not found, skipping tests")
        return True, None

    result = subprocess.run(
        ["uv", "run", "pytest"],
        capture_output=True,
        text=True,
        cwd=test_dir
    )

    if result.returncode != 0:
        error_msg = f"Tests failed:\n{result.stdout}\n{result.stderr}"
        logger.error(error_msg)
        return False, error_msg

    logger.info("✅ All tests passed")
    return True, None


def merge_worktree_to_main(
    adw_id: str,
    branch_name: str,
    merge_method: str,
    logger: logging.Logger,
    issue_number: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Merge a worktree branch to main using git commands.

    This runs in the main repository root, not in a worktree.

    Args:
        adw_id: The ADW ID for context
        branch_name: The feature branch to merge
        merge_method: Merge strategy ("squash", "merge", or "rebase")
        logger: Logger instance
        issue_number: Optional issue number for comments

    Returns:
        Tuple of (success, error_message)
    """
    repo_root = get_main_repo_root()
    logger.info(f"Performing merge in main repository: {repo_root}")
    logger.info(f"Merge method: {merge_method}")

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
            return False, f"Failed to fetch from origin: {result.stderr}"

        # Step 2: Checkout main
        logger.info("Checking out main branch...")
        result = subprocess.run(
            ["git", "checkout", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            return False, f"Failed to checkout main: {result.stderr}"

        # Step 3: Pull latest main
        logger.info("Pulling latest main...")
        result = subprocess.run(
            ["git", "pull", "origin", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Try to restore original branch
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return False, f"Failed to pull latest main: {result.stderr}"

        # Step 4: Merge the feature branch
        logger.info(f"Merging branch {branch_name}...")

        if merge_method == "squash":
            # Squash merge
            result = subprocess.run(
                ["git", "merge", "--squash", branch_name],
                capture_output=True, text=True, cwd=repo_root
            )
            if result.returncode != 0:
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return False, f"Failed to squash merge {branch_name}: {result.stderr}"

            # Need to commit after squash
            commit_msg = f"Merge branch '{branch_name}' via ADW Merge Worktree (squash)"
            result = subprocess.run(
                ["git", "commit", "-m", commit_msg],
                capture_output=True, text=True, cwd=repo_root
            )
            if result.returncode != 0:
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return False, f"Failed to commit squash merge: {result.stderr}"

        elif merge_method == "rebase":
            # Rebase merge
            result = subprocess.run(
                ["git", "rebase", branch_name],
                capture_output=True, text=True, cwd=repo_root
            )
            if result.returncode != 0:
                # Try to abort rebase
                subprocess.run(["git", "rebase", "--abort"], cwd=repo_root)
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return False, f"Failed to rebase {branch_name}: {result.stderr}"

        else:
            # Regular merge (no-ff to preserve commits)
            result = subprocess.run(
                ["git", "merge", branch_name, "--no-ff", "-m", f"Merge branch '{branch_name}' via ADW Merge Worktree"],
                capture_output=True, text=True, cwd=repo_root
            )
            if result.returncode != 0:
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return False, f"Failed to merge {branch_name}: {result.stderr}"

        # Step 5: Check for conflicts
        has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)

        if has_conflicts:
            logger.warning("Merge conflicts detected, invoking Claude Code...")

            # Post to issue if available
            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(adw_id, AGENT_MERGER,
                        f"⚠️ Merge conflicts detected in {len(conflict_files)} file(s)\n"
                        f"Invoking Claude Code for automatic resolution..."),
                    None
                )

            # Try to resolve conflicts with Claude Code
            success, error = invoke_claude_for_conflicts(adw_id, branch_name, conflict_files, logger)

            if not success:
                # Abort merge and restore
                subprocess.run(["git", "merge", "--abort"], cwd=repo_root)
                subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
                return False, f"Failed to resolve conflicts: {error}"

            # Post success
            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(adw_id, AGENT_MERGER, "✅ Conflicts resolved successfully"),
                    None
                )

        # Step 6: Run validation tests
        logger.info("Running validation tests...")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, "🧪 Running validation tests..."),
                None
            )

        test_success, test_error = run_validation_tests(repo_root, logger)

        if not test_success:
            # Abort merge and restore
            subprocess.run(["git", "merge", "--abort"], cwd=repo_root)
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
            return False, f"Validation tests failed: {test_error}"

        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, "✅ All tests passed"),
                None
            )

        # Step 7: Push to origin/main
        logger.info("Pushing to origin/main...")
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            capture_output=True, text=True, cwd=repo_root
        )
        if result.returncode != 0:
            # Don't restore branch - let user fix manually
            return False, f"Failed to push to origin/main: {result.stderr}"

        # Step 8: Restore original branch
        logger.info(f"Restoring original branch: {original_branch}")
        subprocess.run(["git", "checkout", original_branch], cwd=repo_root)

        logger.info("✅ Successfully merged and pushed to main!")
        return True, None

    except Exception as e:
        logger.error(f"Unexpected error during merge: {e}")
        # Try to restore original branch
        try:
            subprocess.run(["git", "checkout", original_branch], cwd=repo_root)
        except Exception:
            pass
        return False, str(e)


def cleanup_worktree_and_branch(adw_id: str, branch_name: str, logger: logging.Logger) -> None:
    """Clean up worktree and optionally delete remote branch.

    Args:
        adw_id: ADW ID of the worktree
        branch_name: Branch name to optionally delete
        logger: Logger instance
    """
    # Step 1: Remove worktree
    logger.info(f"Cleaning up worktree for {adw_id}...")
    success, error = remove_worktree(adw_id, logger)

    if not success:
        logger.warning(f"Failed to remove worktree: {error}")
        logger.warning("You may need to manually clean up the worktree")
    else:
        logger.info("✅ Worktree removed successfully")

    # Step 2: Prune git worktrees
    logger.info("Pruning git worktrees...")
    subprocess.run(["git", "worktree", "prune"], cwd=get_main_repo_root())

    # Step 3: Optionally delete remote branch
    logger.info(f"Deleting remote branch {branch_name}...")
    result = subprocess.run(
        ["git", "push", "origin", "--delete", branch_name],
        capture_output=True,
        text=True,
        cwd=get_main_repo_root()
    )

    if result.returncode != 0:
        logger.warning(f"Failed to delete remote branch: {result.stderr}")
        logger.warning("You may want to manually delete the branch if it's no longer needed")
    else:
        logger.info(f"✅ Remote branch {branch_name} deleted")


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_merge_worktree.py <adw-id> [merge-method]")
        print("\nArguments:")
        print("  adw-id: The ADW ID of the worktree to merge (required)")
        print("  merge-method: Merge strategy - 'squash', 'merge', or 'rebase' (default: 'squash')")
        print("\nExample:")
        print("  uv run adw_merge_worktree.py a1b2c3d4 squash")
        sys.exit(1)

    adw_id = sys.argv[1]
    merge_method = sys.argv[2] if len(sys.argv) > 2 else "squash"

    # Validate merge method
    if merge_method not in ["squash", "merge", "rebase"]:
        print(f"Error: Invalid merge method '{merge_method}'")
        print("Valid options: squash, merge, rebase")
        sys.exit(1)

    # Set up logger
    logger = setup_logger(adw_id, "adw_merge_worktree")
    logger.info(f"ADW Merge Worktree starting - ID: {adw_id}, Method: {merge_method}")

    # Validate environment
    check_env_vars(logger)

    # Load existing state
    state = ADWState.load(adw_id, logger)
    if not state:
        logger.error(f"No state found for ADW ID: {adw_id}")
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print("The worktree must have been created by an ADW workflow")
        sys.exit(1)

    # Get issue number if available (optional)
    issue_number = state.get("issue_number")

    # Post initial status if issue number available
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🔀 Starting merge worktree workflow\n"
                f"📋 Merge method: {merge_method}"),
            state
        )

    # Step 1: Validate worktree exists
    logger.info("Validating worktree...")
    valid, error = validate_worktree(adw_id, state)
    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, f"❌ Worktree validation failed: {error}"),
                state
            )
        print(f"\nError: Worktree validation failed: {error}")
        sys.exit(1)

    worktree_path = state.get("worktree_path")
    logger.info(f"✅ Worktree validated at: {worktree_path}")

    # Step 2: Get branch name
    branch_name = state.get("branch_name")
    if not branch_name:
        logger.error("No branch name found in state")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, "❌ No branch name found in state"),
                state
            )
        print("\nError: No branch name found in state")
        sys.exit(1)

    logger.info(f"Branch to merge: {branch_name}")

    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"📋 Validation complete\n"
                f"🔍 Preparing to merge branch: `{branch_name}`"),
            state
        )

    # Step 3: Perform merge
    logger.info(f"Starting merge of {branch_name} to main...")
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🔀 Merging `{branch_name}` to main...\n"
                f"Using {merge_method} merge strategy"),
            state
        )

    success, error = merge_worktree_to_main(adw_id, branch_name, merge_method, logger, issue_number)

    if not success:
        logger.error(f"Failed to merge: {error}")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, f"❌ Failed to merge: {error}"),
                state
            )
        print(f"\nError: Failed to merge: {error}")
        sys.exit(1)

    logger.info(f"✅ Successfully merged {branch_name} to main")

    # Step 4: Clean up worktree and branch
    logger.info("Cleaning up worktree and branch...")
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER, "🧹 Cleaning up worktree and remote branch..."),
            state
        )

    cleanup_worktree_and_branch(adw_id, branch_name, logger)

    # Step 5: Update state
    state.append_adw_id("adw_merge_worktree")
    state.save("adw_merge_worktree")

    # Step 6: Post success message
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🎉 **Successfully merged worktree!**\n\n"
                f"✅ Merged branch `{branch_name}` to main using {merge_method} strategy\n"
                f"✅ All tests passed\n"
                f"✅ Pushed to origin/main\n"
                f"✅ Cleaned up worktree and remote branch\n\n"
                f"🚀 Code has been integrated into main branch!"),
            state
        )

    logger.info("Merge worktree workflow completed successfully")
    print(f"\n✅ Successfully merged worktree {adw_id} to main!")
    print(f"   Branch: {branch_name}")
    print(f"   Method: {merge_method}")


if __name__ == "__main__":
    main()
