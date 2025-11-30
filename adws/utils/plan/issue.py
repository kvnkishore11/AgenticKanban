"""Issue fetching and classification utilities for plan workflow."""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import json
import logging
from datetime import datetime

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.github import fetch_issue_safe, make_issue_comment_safe
from adw_modules.workflow_ops import classify_issue, format_issue_message

from .types import IssueContext


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def fetch_and_classify(
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> IssueContext:
    """Fetch issue from GitHub/Kanban and classify it.

    Uses existing classification from state if available (kanban mode).
    Otherwise classifies via GitHub API.

    Args:
        issue_number: Issue number to fetch
        adw_id: ADW identifier
        state: ADW state object
        notifier: WebSocket notifier for progress updates
        logger: Logger instance

    Returns:
        IssueContext with issue data and classification

    Raises:
        SystemExit: If issue cannot be fetched or classified
    """
    # Fetch issue details (kanban-aware)
    notifier.notify_progress("adw_plan_iso", 10, "Fetching issue details", "Retrieving issue information from GitHub or kanban")
    issue = fetch_issue_safe(issue_number, state)

    if issue is None:
        logger.error("Could not fetch issue data from GitHub or kanban source")
        notifier.notify_error("adw_plan_iso", "Failed to fetch issue data", "Fetching issue")
        sys.exit(1)

    logger.debug(f"Fetched issue: {issue.model_dump_json(indent=2, by_alias=True)}")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, "ops", "Starting isolated planning phase"), state
    )

    make_issue_comment_safe(
        issue_number,
        f"{adw_id}_ops: Using state\n```json\n{json.dumps(state.data, indent=2, cls=DateTimeEncoder)}\n```",
        state,
    )

    # Check if issue type is already provided from kanban (bypass GitHub classification)
    notifier.notify_progress("adw_plan_iso", 20, "Classifying issue", "Determining issue type (feature/bug/chore)")
    existing_issue_class = state.get("issue_class")

    # Valid issue classes for the plan workflow
    VALID_PLAN_ISSUE_CLASSES = ["/feature", "/bug", "/chore"]

    if existing_issue_class:
        # Validate that the issue class is compatible with the plan workflow
        if existing_issue_class == "/patch":
            error_msg = (
                f"Issue class '/patch' is not compatible with the plan workflow (adw_plan_iso). "
                f"Patch tasks require the adw_patch_iso workflow instead. "
                f"Please use 'Patch (Isolated)' workflow or change the work item type to feature/bug/chore."
            )
            logger.error(error_msg)
            notifier.notify_error("adw_plan_iso", error_msg, "Invalid issue class")
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, "ops", f"Error: {error_msg}"),
                state,
            )
            sys.exit(1)

        # Issue type was provided by kanban via WebSocket trigger
        issue_command = existing_issue_class
        logger.info(f"Using kanban-provided issue type: {issue_command}")
        notifier.notify_log("adw_plan_iso", f"Using kanban-provided issue type: {issue_command}", "INFO")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"Using kanban-provided issue type: {issue_command}"),
            state,
        )
    else:
        # Fallback to GitHub issue classification
        logger.info("No issue type provided by kanban, classifying GitHub issue")
        notifier.notify_log("adw_plan_iso", "Classifying GitHub issue type", "INFO")
        issue_command, error = classify_issue(issue, adw_id, logger)

        if error:
            logger.error(f"Error classifying issue: {error}")
            notifier.notify_error("adw_plan_iso", f"Error classifying issue: {error}", "Classifying issue")
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, "ops", f"Error classifying issue: {error}"),
                state,
            )
            sys.exit(1)

        state.update(issue_class=issue_command)
        state.save("adw_plan_iso")
        logger.info(f"Issue classified as: {issue_command}")
        notifier.notify_log("adw_plan_iso", f"Issue classified as: {issue_command}", "SUCCESS")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"Issue classified as: {issue_command}"),
            state,
        )

    return IssueContext(
        issue=issue,
        issue_command=issue_command
    )
