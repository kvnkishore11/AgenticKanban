"""Git operations for ADW composable architecture.

Provides centralized git operations that build on top of github.py module.
"""

import subprocess
import json
import logging
from typing import Optional, Tuple

# Import GitHub functions from existing module
from adw_modules.github import get_repo_url, extract_repo_path, make_issue_comment_safe
from adw_modules.kanban_mode import is_kanban_mode, git_operation_safe, github_operation_safe

# Import TYPE_CHECKING for forward references
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from adw_modules.state import ADWState


def get_current_branch(cwd: Optional[str] = None) -> str:
    """Get current git branch name."""
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
        cwd=cwd,
    )
    return result.stdout.strip()


def push_branch(
    branch_name: str, cwd: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Push current branch to remote. Returns (success, error_message)."""
    result = subprocess.run(
        ["git", "push", "-u", "origin", branch_name],
        capture_output=True,
        text=True,
        cwd=cwd,
    )
    if result.returncode != 0:
        return False, result.stderr
    return True, None


def check_pr_exists(branch_name: str) -> Optional[str]:
    """Check if PR exists for branch. Returns PR URL if exists."""
    # Use github.py functions to get repo info
    try:
        repo_url = get_repo_url()
        repo_path = extract_repo_path(repo_url)
    except Exception:
        return None

    result = subprocess.run(
        [
            "gh",
            "pr",
            "list",
            "--repo",
            repo_path,
            "--head",
            branch_name,
            "--json",
            "url",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        prs = json.loads(result.stdout)
        if prs:
            return prs[0]["url"]
    return None


def create_branch(
    branch_name: str, cwd: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Create and checkout a new branch. Returns (success, error_message)."""
    # Create branch
    result = subprocess.run(
        ["git", "checkout", "-b", branch_name], capture_output=True, text=True, cwd=cwd
    )
    if result.returncode != 0:
        # Check if error is because branch already exists
        if "already exists" in result.stderr:
            # Try to checkout existing branch
            result = subprocess.run(
                ["git", "checkout", branch_name],
                capture_output=True,
                text=True,
                cwd=cwd,
            )
            if result.returncode != 0:
                return False, result.stderr
            return True, None
        return False, result.stderr
    return True, None


def commit_changes(
    message: str, cwd: Optional[str] = None, state=None
) -> Tuple[bool, Optional[str]]:
    """Stage all changes and commit. Returns (success, error_message).

    Args:
        message: Commit message
        cwd: Working directory
        state: Optional ADW state for kanban mode detection

    Returns:
        (success, error_message) tuple
    """
    # Skip git operations if in kanban mode
    if state and is_kanban_mode(state):
        logging.getLogger(__name__).info("Skipping git commit - kanban mode enabled")
        return True, None  # Return success to continue workflow
    # Check if there are changes to commit
    result = subprocess.run(
        ["git", "status", "--porcelain"], capture_output=True, text=True, cwd=cwd
    )
    if not result.stdout.strip():
        return True, None  # No changes to commit

    # Stage all changes
    result = subprocess.run(
        ["git", "add", "-A"], capture_output=True, text=True, cwd=cwd
    )
    if result.returncode != 0:
        return False, result.stderr

    # Commit
    result = subprocess.run(
        ["git", "commit", "-m", message], capture_output=True, text=True, cwd=cwd
    )
    if result.returncode != 0:
        return False, result.stderr
    return True, None


def get_pr_number(branch_name: str) -> Optional[str]:
    """Get PR number for a branch. Returns PR number if exists."""
    # Use github.py functions to get repo info
    try:
        repo_url = get_repo_url()
        repo_path = extract_repo_path(repo_url)
    except Exception:
        return None

    result = subprocess.run(
        [
            "gh",
            "pr",
            "list",
            "--repo",
            repo_path,
            "--head",
            branch_name,
            "--json",
            "number",
            "--limit",
            "1",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        prs = json.loads(result.stdout)
        if prs:
            return str(prs[0]["number"])
    return None


def approve_pr(pr_number: str, logger: logging.Logger) -> Tuple[bool, Optional[str]]:
    """Approve a PR. Returns (success, error_message)."""
    try:
        repo_url = get_repo_url()
        repo_path = extract_repo_path(repo_url)
    except Exception as e:
        return False, f"Failed to get repo info: {e}"

    result = subprocess.run(
        [
            "gh",
            "pr",
            "review",
            pr_number,
            "--repo",
            repo_path,
            "--approve",
            "--body",
            "ADW Ship workflow approved this PR after validating all state fields.",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return False, result.stderr

    logger.info(f"Approved PR #{pr_number}")
    return True, None


def merge_pr(
    pr_number: str, logger: logging.Logger, merge_method: str = "squash"
) -> Tuple[bool, Optional[str]]:
    """Merge a PR. Returns (success, error_message).

    Args:
        pr_number: The PR number to merge
        logger: Logger instance
        merge_method: One of 'merge', 'squash', 'rebase' (default: 'squash')
    """
    try:
        repo_url = get_repo_url()
        repo_path = extract_repo_path(repo_url)
    except Exception as e:
        return False, f"Failed to get repo info: {e}"

    # First check if PR is mergeable
    result = subprocess.run(
        [
            "gh",
            "pr",
            "view",
            pr_number,
            "--repo",
            repo_path,
            "--json",
            "mergeable,mergeStateStatus",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return False, f"Failed to check PR status: {result.stderr}"

    pr_status = json.loads(result.stdout)
    if pr_status.get("mergeable") != "MERGEABLE":
        return (
            False,
            f"PR is not mergeable. Status: {pr_status.get('mergeStateStatus', 'unknown')}",
        )

    # Merge the PR
    merge_cmd = [
        "gh",
        "pr",
        "merge",
        pr_number,
        "--repo",
        repo_path,
        f"--{merge_method}",
    ]

    # Add auto-merge body
    merge_cmd.extend(
        ["--body", "Merged by ADW Ship workflow after successful validation."]
    )

    result = subprocess.run(merge_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return False, result.stderr

    logger.info(f"Merged PR #{pr_number} using {merge_method} method")
    return True, None


def finalize_git_operations(
    state: "ADWState", logger: logging.Logger, cwd: Optional[str] = None
) -> None:
    """Standard git finalization: push branch and create/update PR.

    Skips git operations if in kanban mode.
    """
    # Skip all git operations if in kanban mode
    if is_kanban_mode(state):
        logger.info("Skipping git operations - kanban mode enabled")
        # Still save any plans or outputs to kanban-friendly locations
        return

    branch_name = state.get("branch_name")
    if not branch_name:
        # Fallback: use current git branch if not main
        current_branch = get_current_branch(cwd=cwd)
        if current_branch and current_branch != "main":
            logger.warning(
                f"No branch name in state, using current branch: {current_branch}"
            )
            branch_name = current_branch
        else:
            logger.error(
                "No branch name in state and current branch is main, skipping git operations"
            )
            return

    # Push branch with git operation safety
    def _push_operation():
        return push_branch(branch_name, cwd=cwd)

    result = git_operation_safe("push_branch", state, _push_operation)
    if result is None:
        return  # Skipped due to kanban mode or git unavailable

    success, error = result
    if not success:
        logger.error(f"Failed to push branch: {error}")
        return

    logger.info(f"Pushed branch: {branch_name}")

    # Handle PR creation (use GitHub operation safety)
    issue_number = state.get("issue_number")
    adw_id = state.get("adw_id")

    def _pr_operations():
        pr_url = check_pr_exists(branch_name)

        if pr_url:
            logger.info(f"Found existing PR: {pr_url}")
            # Post PR link for easy reference
            if issue_number and adw_id:
                make_issue_comment_safe(
                    issue_number, f"{adw_id}_ops: ✅ Pull request: {pr_url}", state
                )
        else:
            # Create new PR - fetch issue data first
            if issue_number:
                try:
                    repo_url = get_repo_url()
                    extract_repo_path(repo_url)
                    from adw_modules.github import fetch_issue_safe

                    issue = fetch_issue_safe(issue_number, state)
                    if issue is None:
                        logger.error("Could not fetch issue data for PR creation")
                        return

                    from adw_modules.workflow_ops import create_pull_request

                    pr_url, error = create_pull_request(branch_name, issue, state, logger, cwd)
                except Exception as e:
                    logger.error(f"Failed to fetch issue for PR creation: {e}")
                    pr_url, error = None, str(e)
            else:
                pr_url, error = None, "No issue number in state"

            if pr_url:
                logger.info(f"Created PR: {pr_url}")
                # Post new PR link
                if issue_number and adw_id:
                    make_issue_comment_safe(
                        issue_number, f"{adw_id}_ops: ✅ Pull request created: {pr_url}", state
                    )
            else:
                logger.error(f"Failed to create PR: {error}")

    # Execute PR operations safely (skip if kanban mode)
    github_operation_safe("PR_operations", state, _pr_operations)
