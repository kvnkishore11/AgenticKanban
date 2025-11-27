"""Finalization utilities for patch workflow."""

import sys
import os
import json
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.git_ops import finalize_git_operations
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message
from adw_modules.kanban_mode import add_patch_to_history
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchResultContext


def finalize_patch(
    patch_result: PatchResultContext,
    worktree_path: str,
    issue_number: str,
    adw_id: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> None:
    """Finalize patch workflow with git operations and state updates.

    Steps:
    1. Push changes and create/update PR
    2. Add patch to history
    3. Save final state
    4. Post summary to issue

    Args:
        patch_result: Result of patch implementation
        worktree_path: Path to the worktree
        issue_number: The issue number
        adw_id: ADW workflow ID
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance
    """
    logger.info("Finalizing git operations")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", "Finalizing git operations"),
    )
    notifier.notify_log("ops", "info", "Finalizing git operations")

    # Finalize git operations (push and PR) - passing cwd for worktree
    finalize_git_operations(state, logger, cwd=worktree_path)

    # Add patch to history
    add_patch_to_history(
        state=state,
        patch_number=patch_result.patch_number,
        patch_reason=patch_result.patch_reason,
        patch_file=patch_result.patch_file,
        success=True,
    )
    logger.info(f"Added patch #{patch_result.patch_number} to history")

    # Complete the workflow
    logger.info("Isolated patch workflow completed successfully")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id, "ops",
            f"Isolated patch workflow completed (Patch #{patch_result.patch_number})"
        ),
    )
    notifier.notify_complete(
        "adw_patch_iso",
        f"Patch #{patch_result.patch_number} completed successfully"
    )

    # Save final state
    state.save("adw_patch_iso")

    # Post final state summary to issue
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: Final isolated patch state:\n```json\n{json.dumps(state.data, indent=2)}\n```",
    )
