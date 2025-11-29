"""Merge workflow finalization utilities."""

import logging
from typing import Optional

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message
from adw_modules.websocket_client import WebSocketNotifier


# Agent name constant
AGENT_MERGER = "merger"
WORKFLOW_NAME = "adw_merge_iso"


def post_merge_status(
    adw_id: str,
    branch_name: str,
    merge_method: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Post initial merge status to GitHub issue.

    Args:
        adw_id: The ADW ID
        branch_name: The branch being merged
        merge_method: The merge strategy being used
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🔀 Starting merge worktree workflow\n"
                f"📋 Merge method: {merge_method}"),
            state
        )


def post_validation_status(
    adw_id: str,
    branch_name: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Post validation complete status to GitHub issue.

    Args:
        adw_id: The ADW ID
        branch_name: The branch being merged
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"📋 Validation complete\n"
                f"🔍 Preparing to merge branch: `{branch_name}`"),
            state
        )


def post_merge_start_status(
    adw_id: str,
    branch_name: str,
    merge_method: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Post merge starting status to GitHub issue.

    Args:
        adw_id: The ADW ID
        branch_name: The branch being merged
        merge_method: The merge strategy being used
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🔀 Merging `{branch_name}` to main...\n"
                f"Using {merge_method} merge strategy"),
            state
        )


def post_cleanup_status(
    adw_id: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Post cleanup starting status to GitHub issue.

    Args:
        adw_id: The ADW ID
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER, "🧹 Cleaning up worktree and remote branch..."),
            state
        )


def finalize_merge(
    adw_id: str,
    branch_name: str,
    merge_method: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Finalize the merge workflow - update state and post success message.

    Args:
        adw_id: The ADW ID
        branch_name: The branch that was merged
        merge_method: The merge strategy that was used
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    # Update state
    state.append_adw_id("adw_merge_iso")
    state.save("adw_merge_iso")

    # Send WebSocket notification for frontend to update merge state
    try:
        notifier = WebSocketNotifier(adw_id, logger)
        notifier.send_status_update(
            workflow_name=WORKFLOW_NAME,
            status="completed",
            message=f"Successfully merged {branch_name} to main using {merge_method}",
            progress_percent=100,
            current_step="completed"
        )
        logger.info("Sent WebSocket completion notification for merge")
    except Exception as e:
        logger.warning(f"Failed to send WebSocket notification: {e}")

    # Post success message to GitHub issue
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER,
                f"🎉 **Successfully merged worktree!**\n\n"
                f"✅ Merged branch `{branch_name}` to main using {merge_method} strategy\n"
                f"✅ All tests passed\n"
                f"✅ Pushed to origin/main\n"
                f"✅ Cleaned up worktree and remote branch\n\n"
                f"🚀 Code has been integrated into main branch!"),
            state
        )

    logger.info("Merge worktree workflow completed successfully")
    print(f"\n✅ Successfully merged worktree {adw_id} to main!")
    print(f"   Branch: {branch_name}")
    print(f"   Method: {merge_method}")


def post_error_status(
    adw_id: str,
    error_message: str,
    issue_number: Optional[str],
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Post error status to GitHub issue and WebSocket.

    Args:
        adw_id: The ADW ID
        error_message: The error message to post
        issue_number: Optional issue number for comments
        state: ADW state object
        logger: Logger instance
    """
    # Send WebSocket notification for frontend to update merge state
    try:
        notifier = WebSocketNotifier(adw_id, logger)
        notifier.send_status_update(
            workflow_name=WORKFLOW_NAME,
            status="failed",
            message=error_message,
            current_step="error"
        )
        logger.info(f"Sent WebSocket failure notification for merge: {error_message}")
    except Exception as e:
        logger.warning(f"Failed to send WebSocket notification: {e}")

    # Post to GitHub issue if available
    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, AGENT_MERGER, f"❌ {error_message}"),
            state
        )
