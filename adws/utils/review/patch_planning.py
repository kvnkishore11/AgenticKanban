"""Review patch planning utilities."""

import sys
import os
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import logging
from adw_modules.data_types import AgentTemplateRequest, AgentPromptResponse, ReviewIssue
from adw_modules.agent import execute_template

# Agent name constants
AGENT_REVIEW_PATCH_PLANNER = "review_patch_planner"


def create_review_patch_plan(
    issue: ReviewIssue,
    issue_num: int,
    adw_id: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None,
) -> AgentPromptResponse:
    """Create a patch plan for a review issue.

    Args:
        issue: Review issue to create patch plan for
        issue_num: Issue number for reference
        adw_id: ADW workflow ID
        logger: Logger instance
        working_dir: Working directory for patch plan creation

    Returns:
        AgentPromptResponse with patch plan details
    """
    # Build patch command with issue details
    patch_args = [
        f"Issue #{issue_num}: {issue.issue_description}",
        f"Resolution: {issue.issue_resolution}",
        f"Severity: {issue.issue_severity}",
    ]

    request = AgentTemplateRequest(
        agent_name=AGENT_REVIEW_PATCH_PLANNER,
        slash_command="/patch",
        args=patch_args,
        adw_id=adw_id,
        working_dir=working_dir,
    )

    return execute_template(request)
