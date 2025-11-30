"""Merge conflict detection and resolution utilities."""

import subprocess
import os
import logging
from typing import Tuple, List, Optional

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from .types import MergeConflictContext
from .initialization import get_main_repo_root

# Import agent module for Claude Code invocation
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest


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


def report_conflicts_for_resolution(
    adw_id: str,
    branch_name: str,
    conflict_files: List[str],
    logger: logging.Logger
) -> Tuple[bool, Optional[str]]:
    """Report merge conflicts for resolution by the calling Claude Code session.

    This function does NOT spawn a new Claude Code process. Instead, it reports
    the conflicts in detail so that when running via the /merge-worktree slash
    command, the interactive Claude Code session can handle the resolution.

    The workflow is:
    1. User runs /merge-worktree from Claude Code
    2. Merge workflow detects conflicts
    3. This function reports conflicts and returns False
    4. Claude Code (the interactive session) sees the conflict details
    5. User asks Claude Code to resolve the conflicts
    6. User re-runs /merge-worktree after conflicts are resolved

    Args:
        adw_id: ADW ID for context
        branch_name: Branch being merged
        conflict_files: List of files with conflicts
        logger: Logger instance

    Returns:
        Tuple of (success=False, error_message_with_details)
    """
    repo_root = get_main_repo_root()

    # Build detailed conflict report
    conflict_details = []
    for conflict_file in conflict_files:
        file_path = os.path.join(repo_root, conflict_file)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    if '<<<<<<<' in content:
                        conflict_details.append(f"  - {conflict_file} (has conflict markers)")
                    else:
                        conflict_details.append(f"  - {conflict_file}")
            except Exception:
                conflict_details.append(f"  - {conflict_file}")
        else:
            conflict_details.append(f"  - {conflict_file} (file missing)")

    # Print a clear message for the interactive Claude Code session
    print("\n" + "=" * 70)
    print("🔀 MERGE CONFLICTS DETECTED")
    print("=" * 70)
    print(f"\nADW ID: {adw_id}")
    print(f"Branch: {branch_name}")
    print(f"\n📁 Conflicting files ({len(conflict_files)}):")
    for detail in conflict_details:
        print(detail)
    print("\n" + "-" * 70)
    print("📋 To resolve these conflicts, ask Claude Code to:")
    print("   1. Read the conflicting files")
    print("   2. Resolve the conflicts (remove <<<<<<< ======= >>>>>>> markers)")
    print("   3. Stage the resolved files: git add <file>")
    print("   4. Then re-run the merge workflow")
    print("-" * 70 + "\n")

    logger.info(f"Merge conflicts detected in {len(conflict_files)} file(s)")
    for detail in conflict_details:
        logger.info(detail)

    # Return with detailed error message
    error_msg = (
        f"Merge conflicts in {len(conflict_files)} file(s) require resolution:\n"
        + "\n".join(conflict_details)
        + "\n\nPlease resolve the conflicts, stage the files (git add), and re-run the merge."
    )

    return False, error_msg


def resolve_conflicts_with_claude(
    adw_id: str,
    branch_name: str,
    conflict_files: List[str],
    logger: logging.Logger
) -> Tuple[bool, Optional[str]]:
    """Resolve merge conflicts automatically using Claude Code.

    This function spawns Claude Code to read conflicting files, resolve
    the conflict markers, and stage the resolved files.

    Args:
        adw_id: ADW ID for context
        branch_name: Branch being merged
        conflict_files: List of files with conflicts
        logger: Logger instance

    Returns:
        Tuple of (success, error_message)
    """
    repo_root = get_main_repo_root()

    # Build a detailed prompt for Claude Code to resolve conflicts
    files_list = "\n".join(f"  - {f}" for f in conflict_files)

    prompt = f"""You are resolving merge conflicts for ADW {adw_id}.

The following files have merge conflicts that need to be resolved:
{files_list}

For each conflicting file:
1. Read the file to see the conflict markers (<<<<<<< ======= >>>>>>>)
2. Understand both versions (HEAD and {branch_name})
3. Resolve the conflict by choosing the best solution or merging both changes
4. Remove ALL conflict markers (<<<<<<< HEAD, =======, >>>>>>> {branch_name})
5. Save the resolved file
6. Stage the file with: git add <filename>

IMPORTANT:
- You MUST remove all conflict markers from each file
- After resolving, verify no conflict markers remain
- Stage each file after resolving it
- Do not commit - just resolve and stage

Start by reading and resolving each conflicting file one by one."""

    # Create output directory for this resolution (use absolute path from repo root)
    output_dir = os.path.join(repo_root, "agents", adw_id, "conflict_resolution")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "resolution.jsonl")

    logger.info(f"Invoking Claude Code to resolve {len(conflict_files)} conflicting file(s)...")

    # Create the request
    request = AgentPromptRequest(
        prompt=prompt,
        model="sonnet",  # Use fast model for conflict resolution
        output_file=output_file,
        adw_id=adw_id,
        agent_name="conflict_resolver",
        dangerously_skip_permissions=True,  # Auto-approve file edits
        working_dir=repo_root,
    )

    # Execute Claude Code
    response = prompt_claude_code(request)

    if not response.success:
        error_msg = f"Claude Code failed to resolve conflicts: {response.output}"
        logger.error(error_msg)
        return False, error_msg

    # Verify conflicts are resolved
    remaining_conflicts, remaining_files = check_merge_conflicts(repo_root, logger)

    if remaining_conflicts:
        error_msg = (
            f"Claude Code ran but {len(remaining_files)} file(s) still have conflicts:\n"
            + "\n".join(f"  - {f}" for f in remaining_files)
        )
        logger.error(error_msg)
        return False, error_msg

    logger.info("All conflicts resolved successfully by Claude Code")
    return True, None


# Alias for backwards compatibility
invoke_claude_for_conflicts = resolve_conflicts_with_claude


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
