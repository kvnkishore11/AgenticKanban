"""Issue fetching utilities for patch workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import fetch_issue_safe, make_issue_comment
from adw_modules.workflow_ops import format_issue_message
from adw_modules.data_types import GitHubIssue
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchIssueContext


def fetch_issue_with_fallback(
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> PatchIssueContext:
    """Fetch issue details with fallback for unavailable issues.

    Attempts to fetch issue from GitHub/Kanban. If unavailable, creates
    a fallback issue object to allow patch workflow to continue.

    Args:
        issue_number: The issue number to fetch
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        PatchIssueContext with issue data and fallback status
    """
    issue = fetch_issue_safe(issue_number, state)
    is_fallback = False

    if issue is None:
        logger.warning(f"Could not fetch issue #{issue_number} - continuing with fallback")
        is_fallback = True
        issue = GitHubIssue(
            number=int(issue_number),
            title=f"Issue #{issue_number}",
            body="Issue data unavailable - patch mode",
            state="open",
            author={"login": "unknown"},
            assignees=[],
            labels=[],
            milestone=None,
            comments=[],
            created_at="",
            updated_at="",
            closed_at=None,
            url=f"https://github.com/unknown/repo/issues/{issue_number}"
        )
    else:
        logger.debug(f"Fetched issue: {issue.model_dump_json(indent=2, by_alias=True)}")

    # Notify workflow start
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", "Starting isolated patch workflow"),
    )
    notifier.notify_log("ops", "info", "Starting isolated patch workflow")

    return PatchIssueContext(
        issue=issue,
        is_fallback=is_fallback
    )
