"""Build commit utilities."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand
from adw_modules.git_ops import commit_changes
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import create_commit, format_issue_message, AGENT_IMPLEMENTOR


def create_build_commit(
    issue: GitHubIssue,
    issue_command: IssueClassSlashCommand,
    adw_id: str,
    worktree_path: str,
    issue_number: str,
    logger: logging.Logger
) -> None:
    """Create and execute commit for the implementation.

    Args:
        issue: GitHub issue object
        issue_command: Issue classification command
        adw_id: ADW identifier
        worktree_path: Path to worktree
        issue_number: Issue number for comments
        logger: Logger instance

    Raises:
        SystemExit: If commit creation fails
    """
    # Create commit message
    logger.info("Creating implementation commit")
    commit_msg, error = create_commit(AGENT_IMPLEMENTOR, issue, issue_command, adw_id, logger, worktree_path)

    if error:
        logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_IMPLEMENTOR, f"Error creating commit message: {error}")
        )
        sys.exit(1)

    # Commit the implementation (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing implementation: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_IMPLEMENTOR, f"Error committing implementation: {error}")
        )
        sys.exit(1)

    logger.info(f"Committed implementation: {commit_msg}")
    make_issue_comment(
        issue_number, format_issue_message(adw_id, AGENT_IMPLEMENTOR, "Implementation committed")
    )
