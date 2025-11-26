"""Build finalization utilities."""

import sys
import os
import json
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.git_ops import finalize_git_operations
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message


def finalize_build(
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
    - Update PR
    - Save final state
    - Post completion comments

    Args:
        state: ADW state object
        worktree_path: Path to worktree
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        adw_id: ADW identifier
        logger: Logger instance
    """
    # Finalize git operations (push and PR)
    notifier.notify_progress("adw_build_iso", 90, "Finalizing", "Pushing changes and updating PR")
    finalize_git_operations(state, logger, cwd=worktree_path)

    logger.info("Isolated implementation phase completed successfully")
    notifier.notify_complete("adw_build_iso", "Build workflow completed successfully", "Complete")
    make_issue_comment(
        issue_number, format_issue_message(adw_id, "ops", "Isolated implementation phase completed")
    )

    # Save final state
    state.save("adw_build_iso")

    # Post final state summary to issue
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: Final build state:\n```json\n{json.dumps(state.data, indent=2)}\n```"
    )
