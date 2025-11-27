"""Patch content extraction utilities for patch workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message
from adw_modules.data_types import GitHubIssue
from adw_modules.patch_content_extractor import get_patch_content
from adw_modules.kanban_mode import is_kanban_mode
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchContentContext


def extract_patch_content(
    issue: GitHubIssue,
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> PatchContentContext:
    """Extract patch content from GitHub or Kanban source.

    Uses unified extractor that supports both:
    - GitHub mode: Requires 'adw_patch' keyword in comments or issue body
    - Kanban mode: Uses task description and metadata

    Args:
        issue: GitHub issue object
        issue_number: The issue number
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        PatchContentContext with extracted content and metadata

    Raises:
        SystemExit: If patch content extraction fails
    """
    in_kanban_mode = is_kanban_mode(state)

    if in_kanban_mode:
        logger.info("Extracting patch content from kanban task data")
    else:
        logger.info("Extracting patch content from GitHub (checking for 'adw_patch' keyword)")

    patch_content, source_description, error = get_patch_content(state, issue, logger)

    if error:
        logger.error(f"Failed to extract patch content: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"{error}"),
        )
        notifier.notify_log("ops", "error", f"Failed to extract patch content: {error}")
        sys.exit(1)

    logger.info(f"Patch content extracted from: {source_description}")
    notifier.notify_log("patch_planner", "info", f"Patch content extracted from: {source_description}")

    return PatchContentContext(
        patch_content=patch_content,
        source_description=source_description,
        is_kanban_mode=in_kanban_mode
    )
