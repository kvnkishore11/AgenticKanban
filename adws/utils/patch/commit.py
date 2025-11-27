"""Git commit utilities for patch workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.git_ops import commit_changes
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message, create_commit
from adw_modules.data_types import GitHubIssue
from adw_modules.websocket_client import WebSocketNotifier

# Agent name constant
AGENT_PATCH_IMPLEMENTOR = "patch_implementor"


def create_patch_commit(
    issue: GitHubIssue,
    worktree_path: str,
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> str:
    """Create git commit for patch changes.

    Steps:
    1. Generate commit message using agent
    2. Commit changes in worktree
    3. Report status

    Args:
        issue: GitHub issue object
        worktree_path: Path to the worktree
        issue_number: The issue number
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        The commit message that was used

    Raises:
        SystemExit: If commit creation fails
    """
    logger.info("Creating patch commit")
    notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "info", "Creating patch commit")

    issue_command = "/patch"
    commit_msg, error = create_commit(
        AGENT_PATCH_IMPLEMENTOR, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                AGENT_PATCH_IMPLEMENTOR,
                f"Error creating commit message: {error}",
            ),
        )
        notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "error", f"Error creating commit message: {error}")
        sys.exit(1)

    # Commit the patch (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing patch: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_PATCH_IMPLEMENTOR, f"Error committing patch: {error}"),
        )
        notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "error", f"Error committing patch: {error}")
        sys.exit(1)

    logger.info(f"Committed patch: {commit_msg}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_PATCH_IMPLEMENTOR, "Patch committed"),
    )
    notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "info", "Patch committed successfully")

    return commit_msg
