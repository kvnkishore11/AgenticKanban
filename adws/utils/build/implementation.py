"""Build implementation utilities."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.github import make_issue_comment, fetch_issue_safe
from adw_modules.workflow_ops import implement_plan, format_issue_message, classify_issue, AGENT_IMPLEMENTOR
from adw_modules.data_types import GitHubIssue

from .types import BuildIssueContext


def execute_implementation(
    plan_file: str,
    adw_id: str,
    worktree_path: str,
    issue_number: str,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> None:
    """Execute the implementation based on the plan.

    Args:
        plan_file: Path to plan file
        adw_id: ADW identifier
        worktree_path: Path to worktree
        issue_number: Issue number for comments
        notifier: WebSocket notifier
        logger: Logger instance

    Raises:
        SystemExit: If implementation fails
    """
    logger.info("Implementing solution in worktree")
    notifier.notify_progress("adw_build_iso", 50, "Implementing", "Building solution based on implementation plan")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_IMPLEMENTOR, "Implementing solution in isolated environment")
    )

    implement_response = implement_plan(plan_file, adw_id, logger, working_dir=worktree_path)

    if not implement_response.success:
        logger.error(f"Error implementing solution: {implement_response.output}")
        notifier.notify_error("adw_build_iso", f"Error implementing solution: {implement_response.output}", "Implementing")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_IMPLEMENTOR, f"Error implementing solution: {implement_response.output}")
        )
        sys.exit(1)

    logger.debug(f"Implementation response: {implement_response.output}")
    notifier.notify_log("adw_build_iso", "Solution implemented successfully", "SUCCESS")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_IMPLEMENTOR, "Solution implemented")
    )


def fetch_issue_for_commit(
    issue_number: str,
    adw_id: str,
    state: ADWState,
    logger: logging.Logger
) -> BuildIssueContext:
    """Fetch issue data and classification for commit message generation.

    Args:
        issue_number: Issue number to fetch
        adw_id: ADW identifier
        state: ADW state object
        logger: Logger instance

    Returns:
        BuildIssueContext with issue and classification
    """
    logger.info("Fetching issue data for commit message")
    issue = fetch_issue_safe(issue_number, state)

    if issue is None:
        logger.warning(f"Could not fetch issue #{issue_number} - continuing with fallback")
        # Create a fallback issue object for commit message generation
        from datetime import datetime
        now = datetime.now().isoformat()
        issue = GitHubIssue(
            number=int(issue_number),
            title=f"Issue #{issue_number}",
            body="Issue data unavailable",
            state="open",
            author={"login": "unknown"},
            assignees=[],
            labels=[],
            milestone=None,
            comments=[],
            created_at=now,
            updated_at=now,
            closed_at=None,
            url=f"https://github.com/unknown/repo/issues/{issue_number}"
        )

    # Get issue classification from state or classify if needed
    issue_command = state.get("issue_class")
    if not issue_command:
        logger.info("No issue classification in state, running classify_issue")
        issue_command, error = classify_issue(issue, adw_id, logger)
        if error:
            logger.error(f"Error classifying issue: {error}")
            # Default to feature if classification fails
            issue_command = "/feature"
            logger.warning("Defaulting to /feature after classification error")
        else:
            # Save the classification for future use
            state.update(issue_class=issue_command)
            state.save("adw_build_iso")

    return BuildIssueContext(
        issue=issue,
        issue_command=issue_command
    )
