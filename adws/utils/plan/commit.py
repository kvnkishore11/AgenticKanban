"""Commit creation utilities for plan workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand
from adw_modules.git_ops import commit_changes
from adw_modules.workflow_ops import create_commit, format_issue_message, AGENT_PLANNER
from adw_modules.github import make_issue_comment_safe


def create_plan_commit(
    issue: GitHubIssue,
    issue_command: IssueClassSlashCommand,
    adw_id: str,
    worktree_path: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    issue_number: str,
    logger: logging.Logger
) -> None:
    """Create and execute commit for the plan.

    Args:
        issue: GitHub issue object
        issue_command: Issue classification command (/feature, /bug, /chore)
        adw_id: ADW identifier
        worktree_path: Path to worktree
        state: ADW state object
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        logger: Logger instance

    Raises:
        SystemExit: If commit creation fails
    """
    # Create commit message
    notifier.notify_progress("adw_plan_iso", 80, "Committing plan", "Creating git commit for implementation plan")
    logger.info("Creating plan commit")

    commit_msg, error = create_commit(
        AGENT_PLANNER, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        notifier.notify_error("adw_plan_iso", f"Error creating commit message: {error}", "Committing plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"Error creating commit message: {error}"
            ),
            state
        )
        sys.exit(1)

    # Commit the plan (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing plan: {error}")
        notifier.notify_error("adw_plan_iso", f"Error committing plan: {error}", "Committing plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"Error committing plan: {error}"
            ),
            state
        )
        sys.exit(1)

    logger.info(f"Committed plan: {commit_msg}")
    notifier.notify_log("adw_plan_iso", "Plan committed to git", "SUCCESS")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, AGENT_PLANNER, "Plan committed"),
        state
    )
