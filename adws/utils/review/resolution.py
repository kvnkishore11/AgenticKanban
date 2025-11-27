"""Blocker issue resolution utilities."""

import sys
import os
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import logging
from adw_modules.data_types import ReviewIssue
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message, implement_plan

from .patch_planning import create_review_patch_plan

# Agent name constants
AGENT_REVIEW_PATCH_PLANNER = "review_patch_planner"


def resolve_blocker_issues(
    blocker_issues: List[ReviewIssue],
    issue_number: str,
    adw_id: str,
    worktree_path: str,
    logger: logging.Logger
) -> None:
    """Resolve blocker issues by creating and implementing patches.

    Args:
        blocker_issues: List of blocker issues to resolve
        issue_number: GitHub issue number
        adw_id: ADW workflow ID
        worktree_path: Path to the worktree
        logger: Logger instance
    """
    logger.info(f"Found {len(blocker_issues)} blocker issues, attempting resolution")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_REVIEW_PATCH_PLANNER,
            f"🔧 Found {len(blocker_issues)} blocker issues, creating resolution plans..."
        )
    )

    # Create and implement patches for each blocker
    for i, issue in enumerate(blocker_issues, 1):
        logger.info(f"Resolving blocker {i}/{len(blocker_issues)}: {issue.issue_description}")

        # Create patch plan
        plan_response = create_review_patch_plan(issue, i, adw_id, logger, working_dir=worktree_path)

        if not plan_response.success:
            logger.error(f"Failed to create patch plan: {plan_response.output}")
            continue

        # Extract plan file path
        plan_file = plan_response.output.strip()

        # Implement the patch
        logger.info(f"Implementing patch from plan: {plan_file}")
        impl_response = implement_plan(plan_file, adw_id, logger, working_dir=worktree_path)

        if not impl_response.success:
            logger.error(f"Failed to implement patch: {impl_response.output}")
            continue

        logger.info(f"Successfully resolved blocker {i}")
