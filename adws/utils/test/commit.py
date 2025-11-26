"""Test commit utilities."""

import sys
import logging
from datetime import datetime

sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.state import ADWState
from adw_modules.data_types import GitHubIssue
from adw_modules.github import make_issue_comment, fetch_issue_safe
from adw_modules.git_ops import commit_changes
from adw_modules.workflow_ops import format_issue_message, create_commit, classify_issue

from .types import TestIssueContext

# Agent name constant
AGENT_TESTER = "test_runner"


def fetch_issue_for_test_commit(
    issue_number: str,
    adw_id: str,
    state: ADWState,
    logger: logging.Logger
) -> TestIssueContext:
    """Fetch issue data and classification for commit message generation.

    Args:
        issue_number: Issue number to fetch
        adw_id: ADW identifier
        state: ADW state object
        logger: Logger instance

    Returns:
        TestIssueContext with issue and classification
    """
    logger.info("Fetching issue data for commit message")
    issue = fetch_issue_safe(issue_number, state)

    if issue is None:
        logger.warning(f"Could not fetch issue #{issue_number} - continuing with fallback")
        now = datetime.now().isoformat()
        issue = GitHubIssue(
            number=int(issue_number),
            title=f"Issue #{issue_number}",
            body="Issue data unavailable - test mode",
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
            issue_command = "/feature"
            logger.warning("Defaulting to /feature after classification error")
        else:
            state.update(issue_class=issue_command)
            state.save("adw_test_iso")

    return TestIssueContext(
        issue=issue,
        issue_command=issue_command
    )


def create_test_commit(
    issue: GitHubIssue,
    issue_command: str,
    adw_id: str,
    worktree_path: str,
    issue_number: str,
    logger: logging.Logger
) -> None:
    """Create and execute test results commit.

    Args:
        issue: GitHub issue object
        issue_command: Issue classification command
        adw_id: ADW identifier
        worktree_path: Path to worktree
        issue_number: Issue number for comments
        logger: Logger instance

    Raises:
        SystemExit: If commit creation or execution fails
    """
    logger.info("Creating test commit")
    commit_msg, error = create_commit(
        AGENT_TESTER, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_TESTER, f"❌ Error creating commit message: {error}")
        )
        sys.exit(1)

    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing test results: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, AGENT_TESTER, f"❌ Error committing test results: {error}")
        )
        sys.exit(1)

    logger.info(f"Committed test results: {commit_msg}")
    make_issue_comment(
        issue_number, format_issue_message(adw_id, AGENT_TESTER, "✅ Test results committed")
    )
