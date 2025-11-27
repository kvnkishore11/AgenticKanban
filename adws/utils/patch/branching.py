"""Branch resolution utilities for patch workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import (
    format_issue_message,
    find_existing_branch_for_issue,
    classify_issue,
    generate_branch_name,
)
from adw_modules.data_types import GitHubIssue
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchBranchContext


def resolve_branch_name(
    issue: GitHubIssue,
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> PatchBranchContext:
    """Resolve or generate branch name for patch workflow.

    Steps:
    1. Check if branch name is already in state
    2. Look for existing branch without checking it out
    3. If no branch exists, classify issue and generate new branch name

    Args:
        issue: GitHub issue object
        issue_number: The issue number
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        PatchBranchContext with branch name and metadata

    Raises:
        SystemExit: If branch name generation fails
    """
    # 1. Check if branch name is already in state
    branch_name = state.get("branch_name")
    issue_command = state.get("issue_class", "/patch")

    if branch_name:
        logger.info(f"Using existing branch from state: {branch_name}")
        state.save("adw_patch_iso")
        return PatchBranchContext(
            branch_name=branch_name,
            is_existing=True,
            issue_command=issue_command
        )

    # 2. Look for existing branch without checking it out
    existing_branch = find_existing_branch_for_issue(issue_number, adw_id)

    if existing_branch:
        logger.info(f"Found existing branch: {existing_branch}")
        state.update(branch_name=existing_branch)
        state.save("adw_patch_iso")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Working on branch: {existing_branch}"),
        )
        return PatchBranchContext(
            branch_name=existing_branch,
            is_existing=True,
            issue_command=issue_command
        )

    # 3. No existing branch, need to classify and generate name
    logger.info("No existing branch found, creating new one")

    # Check if issue type is already provided from kanban
    existing_issue_class = state.get("issue_class")
    if existing_issue_class:
        issue_command = existing_issue_class
        logger.info(f"Using kanban-provided issue type: {issue_command}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Using kanban-provided issue type: {issue_command}"),
        )
    else:
        # Fallback to GitHub issue classification
        logger.info("No issue type provided by kanban, classifying GitHub issue")
        issue_command, error = classify_issue(issue, adw_id, logger)
        if error:
            logger.error(f"Failed to classify issue: {error}")
            make_issue_comment(
                issue_number,
                format_issue_message(adw_id, "ops", f"Failed to classify issue: {error}"),
            )
            sys.exit(1)
        state.update(issue_class=issue_command)

    # Generate branch name
    branch_name, error = generate_branch_name(issue, issue_command, adw_id, logger)
    if error:
        logger.error(f"Error generating branch name: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Error generating branch name: {error}"),
        )
        sys.exit(1)

    # Update state with branch name
    state.update(branch_name=branch_name)
    state.save("adw_patch_iso")

    logger.info(f"Working on branch: {branch_name}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", f"Working on branch: {branch_name}"),
    )
    notifier.notify_log("ops", "info", f"Working on branch: {branch_name}")

    return PatchBranchContext(
        branch_name=branch_name,
        is_existing=False,
        issue_command=issue_command
    )
