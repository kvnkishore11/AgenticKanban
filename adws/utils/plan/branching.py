"""Branch name generation utilities for plan workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand
from adw_modules.workflow_ops import generate_branch_name, generate_fallback_branch_name, format_issue_message
from adw_modules.github import make_issue_comment_safe


def generate_branch(
    issue: GitHubIssue,
    issue_command: IssueClassSlashCommand,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    issue_number: str,
    logger: logging.Logger
) -> str:
    """Generate branch name and save to state.

    Does NOT create the branch - that happens with worktree creation.
    Uses fallback branch name if generation fails to ensure workflow continues.

    Args:
        issue: GitHub issue object
        issue_command: Issue classification command (/feature, /bug, /chore)
        adw_id: ADW identifier
        state: ADW state object
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        logger: Logger instance

    Returns:
        Generated branch name (never fails - uses fallback if needed)
    """
    notifier.notify_progress("adw_plan_iso", 30, "Generating branch", "Creating branch name for isolated worktree")

    try:
        branch_name, error = generate_branch_name(issue, issue_command, adw_id, logger)

        if error:
            # This shouldn't happen since generate_branch_name now uses fallback internally
            # But if it does, use our own fallback here as a safety net
            logger.warning(f"Unexpected error from generate_branch_name: {error}. Using fallback.")
            notifier.notify_log("adw_plan_iso", f"Branch generation issue, using fallback: {error}", "WARN")
            branch_name = generate_fallback_branch_name(issue.number, adw_id, issue_command, logger)

    except Exception as e:
        # Final safety net - any exception should not stop the workflow
        logger.warning(f"Exception in branch generation: {e}. Using fallback.")
        notifier.notify_log("adw_plan_iso", f"Branch generation exception, using fallback", "WARN")
        branch_name = generate_fallback_branch_name(issue.number, adw_id, issue_command, logger)

    # Don't create branch here - let worktree create it
    # The worktree command will create the branch when we specify -b
    state.update(branch_name=branch_name)
    state.save("adw_plan_iso")
    logger.info(f"Will create branch in worktree: {branch_name}")
    notifier.notify_log("adw_plan_iso", f"Branch: {branch_name}", "INFO")

    return branch_name
