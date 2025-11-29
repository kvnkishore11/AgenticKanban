"""Change detection utilities for document workflow."""

import sys
import os
import subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.workflow_ops import format_issue_message
from adw_modules.github import make_issue_comment

from .types import DocumentInitContext


def check_for_changes(ctx: DocumentInitContext) -> bool:
    """Check if there are any changes between current branch and main.

    Args:
        ctx: Document initialization context with worktree_path, logger, etc.

    Returns:
        bool: True if changes exist and workflow should continue, False if no changes
    """
    try:
        # Check for changes against main
        result = subprocess.run(
            ["git", "diff", "main", "--stat"],
            capture_output=True,
            text=True,
            check=True,
            cwd=ctx.worktree_path,
        )

        # If output is empty or only whitespace, no changes
        has_changes = bool(result.stdout.strip())

        if not has_changes:
            ctx.logger.info("No changes detected between current branch and main")
            make_issue_comment(
                ctx.issue_number,
                format_issue_message(
                    ctx.adw_id,
                    "ops",
                    "ℹ️ No changes detected between current branch and main - skipping documentation",
                ),
            )
        else:
            ctx.logger.info(f"Found changes:\n{result.stdout}")

        return has_changes

    except subprocess.CalledProcessError as e:
        ctx.logger.error(f"Failed to check for changes: {e}")
        # If we can't check, assume there are changes and let the agent handle it
        return True
