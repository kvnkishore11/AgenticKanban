"""Merge conflict detection and resolution utilities."""

import subprocess
import os
import logging
from typing import Tuple, List, Optional

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from .types import MergeConflictContext
from .initialization import get_main_repo_root


def check_merge_conflicts(repo_root: str, logger: logging.Logger) -> Tuple[bool, List[str]]:
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


def invoke_claude_for_conflicts(
    adw_id: str,
    branch_name: str,
    conflict_files: List[str],
    logger: logging.Logger
) -> Tuple[bool, Optional[str]]:
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

    repo_root = get_main_repo_root()

    # Run Claude Code in headless mode
    result = subprocess.run(
        [claude_path, "-p", prompt],
        capture_output=True,
        text=True,
        cwd=repo_root
    )

    if result.returncode != 0:
        error_msg = f"Claude Code failed: {result.stderr}"
        logger.error(error_msg)
        return False, error_msg

    logger.info("Claude Code completed conflict resolution")
    logger.debug(f"Claude output: {result.stdout}")

    # Check if conflicts are resolved
    has_conflicts, remaining_conflicts = check_merge_conflicts(repo_root, logger)

    if has_conflicts:
        error_msg = f"Conflicts still remain after Claude Code resolution: {remaining_conflicts}"
        logger.error(error_msg)
        return False, error_msg

    logger.info("✅ All conflicts resolved successfully")
    return True, None


def detect_and_resolve_conflicts(
    adw_id: str,
    branch_name: str,
    repo_root: str,
    logger: logging.Logger
) -> MergeConflictContext:
    """Detect and attempt to resolve merge conflicts.

    Args:
        adw_id: ADW ID for context
        branch_name: Branch being merged
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        MergeConflictContext with conflict status and resolution results
    """
    has_conflicts, conflict_files = check_merge_conflicts(repo_root, logger)

    if not has_conflicts:
        return MergeConflictContext(
            has_conflicts=False,
            conflict_files=[],
            resolved=True,
            error=None
        )

    logger.warning("Merge conflicts detected, invoking Claude Code...")

    # Try to resolve conflicts with Claude Code
    success, error = invoke_claude_for_conflicts(adw_id, branch_name, conflict_files, logger)

    return MergeConflictContext(
        has_conflicts=True,
        conflict_files=conflict_files,
        resolved=success,
        error=error
    )
