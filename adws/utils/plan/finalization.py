"""Git finalization and cleanup utilities for plan workflow."""

import sys
import os
import json
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.git_ops import finalize_git_operations
from adw_modules.workflow_ops import format_issue_message
from adw_modules.github import make_issue_comment_safe


def finalize(
    state: ADWState,
    worktree_path: str,
    notifier: WebSocketNotifier,
    issue_number: str,
    adw_id: str,
    logger: logging.Logger
) -> None:
    """Finalize git operations and save state.

    Handles:
    - Push branch
    - Create/update PR
    - Save final state
    - Post completion comments

    Args:
        state: ADW state object
        worktree_path: Path to worktree (may be None)
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        adw_id: ADW identifier
        logger: Logger instance
    """
    # Finalize git operations (push and PR)
    # Note: This will work from the worktree context
    notifier.notify_progress("adw_plan_iso", 90, "Finalizing", "Pushing changes and creating/updating PR")
    finalize_git_operations(state, logger, cwd=worktree_path)

    logger.info("Isolated planning phase completed successfully")
    notifier.notify_complete("adw_plan_iso", "Planning workflow completed successfully", "Complete")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, "ops", "Isolated planning phase completed"),
        state
    )

    # Save final state
    state.save("adw_plan_iso")

    # Post final state summary to issue
    make_issue_comment_safe(
        issue_number,
        f"{adw_id}_ops: Final planning state:\n```json\n{json.dumps(state.data, indent=2)}\n```",
        state
    )
