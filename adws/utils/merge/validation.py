"""Merge workflow validation utilities."""

import logging
from typing import Optional

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.worktree_ops import validate_worktree as _validate_worktree
from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message

from .types import MergeValidationContext


# Agent name constant
AGENT_MERGER = "merger"


def validate_merge_worktree(
    adw_id: str,
    state: ADWState,
    issue_number: Optional[str],
    logger: logging.Logger
) -> MergeValidationContext:
    """Validate that the worktree exists and is ready for merge.

    Args:
        adw_id: The ADW ID of the worktree
        state: ADW state object
        issue_number: Optional issue number for comments
        logger: Logger instance

    Returns:
        MergeValidationContext with validation results
    """
    logger.info("Validating worktree...")

    # Validate worktree exists
    valid, error = _validate_worktree(adw_id, state)

    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        if issue_number:
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, AGENT_MERGER, f"❌ Worktree validation failed: {error}"),
                state
            )
        return MergeValidationContext(
            is_valid=False,
            worktree_path="",
            branch_name="",
            error=error
        )

    worktree_path = state.get("worktree_path", "")
    branch_name = state.get("branch_name", "")

    logger.info(f"✅ Worktree validated at: {worktree_path}")

    return MergeValidationContext(
        is_valid=True,
        worktree_path=worktree_path,
        branch_name=branch_name,
        error=None
    )
