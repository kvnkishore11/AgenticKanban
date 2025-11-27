"""Patch implementation utilities for patch workflow."""

import sys
import os
import logging
from typing import Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message, create_and_implement_patch
from adw_modules.kanban_mode import (
    is_kanban_mode,
    get_next_patch_number,
    get_patch_reason_from_kanban,
)
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchResultContext

# Agent name constants
AGENT_PATCH_PLANNER = "patch_planner"
AGENT_PATCH_IMPLEMENTOR = "patch_implementor"


def implement_patch(
    patch_content: str,
    source_description: str,
    worktree_path: str,
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> PatchResultContext:
    """Create and implement patch plan.

    Steps:
    1. Create patch plan using patch_planner agent
    2. Implement the plan using patch_implementor agent
    3. Determine patch number and reason
    4. Update state with patch info

    Args:
        patch_content: The patch content/request to implement
        source_description: Description of patch content source
        worktree_path: Path to the worktree
        issue_number: The issue number
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        PatchResultContext with patch file, number, reason, and success status

    Raises:
        SystemExit: If patch creation or implementation fails
    """
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_PATCH_PLANNER,
            f"Creating patch plan from {source_description}",
        ),
    )
    notifier.notify_log(AGENT_PATCH_PLANNER, "info", f"Creating patch plan from {source_description}")

    # Use the shared method to create and implement patch
    patch_file, implement_response = create_and_implement_patch(
        adw_id=adw_id,
        review_change_request=patch_content,
        logger=logger,
        agent_name_planner=AGENT_PATCH_PLANNER,
        agent_name_implementor=AGENT_PATCH_IMPLEMENTOR,
        spec_path=None,  # No spec file for direct issue patches
        working_dir=worktree_path,  # Pass worktree path for isolated execution
    )

    if not patch_file:
        logger.error("Failed to create patch plan")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_PATCH_PLANNER, "Failed to create patch plan"),
        )
        notifier.notify_log(AGENT_PATCH_PLANNER, "error", "Failed to create patch plan")
        sys.exit(1)

    # Get patch number and reason
    patch_number = get_next_patch_number(state)
    logger.info(f"Patch number: {patch_number}")

    in_kanban_mode = is_kanban_mode(state)
    if in_kanban_mode and state.get("issue_json"):
        patch_reason = get_patch_reason_from_kanban(state.get("issue_json"))
    else:
        patch_reason = "Patch requested via GitHub"

    logger.info(f"Patch reason: {patch_reason}")

    # Update state
    state.update(
        patch_file=patch_file,
        patch_source_mode="kanban" if in_kanban_mode else "github"
    )
    state.save("adw_patch_iso")

    logger.info(f"Patch plan created: {patch_file}")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_PATCH_PLANNER,
            f"Patch #{patch_number} plan created: {patch_file}\nReason: {patch_reason}"
        ),
    )
    notifier.notify_log(
        AGENT_PATCH_PLANNER, "info",
        f"Patch #{patch_number} plan created: {patch_file}"
    )

    # Check implementation result
    if not implement_response.success:
        logger.error(f"Error implementing patch: {implement_response.output}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                AGENT_PATCH_IMPLEMENTOR,
                f"Error implementing patch: {implement_response.output}",
            ),
        )
        notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "error", f"Error implementing patch")
        sys.exit(1)

    logger.debug(f"Implementation response: {implement_response.output}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_PATCH_IMPLEMENTOR, "Patch implemented"),
    )
    notifier.notify_log(AGENT_PATCH_IMPLEMENTOR, "info", "Patch implemented successfully")

    return PatchResultContext(
        patch_file=patch_file,
        patch_number=patch_number,
        patch_reason=patch_reason,
        success=True
    )
