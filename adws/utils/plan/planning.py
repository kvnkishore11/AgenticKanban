"""Plan building and validation utilities for plan workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand
from adw_modules.workflow_ops import build_plan as workflow_build_plan, format_issue_message, AGENT_PLANNER
from adw_modules.github import make_issue_comment_safe

from .types import PlanContext


def build_plan(
    issue: GitHubIssue,
    issue_command: IssueClassSlashCommand,
    adw_id: str,
    worktree_path: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    issue_number: str,
    logger: logging.Logger
) -> PlanContext:
    """Build implementation plan and validate it exists.

    Args:
        issue: GitHub issue object
        issue_command: Issue classification command (/feature, /bug, /chore)
        adw_id: ADW identifier
        worktree_path: Path to worktree
        state: ADW state object
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        logger: Logger instance

    Returns:
        PlanContext with plan file paths

    Raises:
        SystemExit: If plan building or validation fails
    """
    # Build the implementation plan (now executing in worktree)
    notifier.notify_progress("adw_plan_iso", 60, "Creating plan", "Building implementation plan using AI agent")
    logger.info("Building implementation plan in worktree")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, AGENT_PLANNER, "Building implementation plan in isolated environment"),
        state
    )

    plan_response = workflow_build_plan(issue, issue_command, adw_id, logger, working_dir=worktree_path, state=state)

    if not plan_response.success:
        logger.error(f"Error building plan: {plan_response.output}")
        notifier.notify_error("adw_plan_iso", f"Error building plan: {plan_response.output}", "Creating plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"Error building plan: {plan_response.output}"
            ),
            state
        )
        sys.exit(1)

    logger.debug(f"Plan response: {plan_response.output}")
    notifier.notify_log("adw_plan_iso", "Implementation plan created successfully", "SUCCESS")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, AGENT_PLANNER, "Implementation plan created"),
        state
    )

    # Get the plan file path directly from response
    logger.info("Getting plan file path")
    plan_file_path = plan_response.output.strip()

    # Validate the path exists (within worktree)
    if not plan_file_path:
        error = "No plan file path returned from planning agent"
        logger.error(error)
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"{error}"),
            state
        )
        sys.exit(1)

    # Check if file exists in worktree
    worktree_plan_path = os.path.join(worktree_path, plan_file_path) if worktree_path else plan_file_path
    if not os.path.exists(worktree_plan_path):
        error = f"Plan file does not exist in worktree: {plan_file_path}"
        logger.error(error)
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"{error}"),
            state
        )
        sys.exit(1)

    state.update(plan_file=plan_file_path)
    state.save("adw_plan_iso")
    logger.info(f"Plan file created: {plan_file_path}")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, "ops", f"Plan file created: {plan_file_path}"),
        state
    )

    return PlanContext(plan_file_path=plan_file_path)
