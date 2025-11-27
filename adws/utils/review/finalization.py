"""Review finalization utilities."""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import fetch_issue_safe, make_issue_comment, get_repo_url, extract_repo_path
from adw_modules.workflow_ops import create_commit, format_issue_message
from adw_modules.data_types import GitHubIssue

from .types import ReviewInitContext, ReviewExecutionContext
from .summary import build_review_summary
from .screenshots import upload_review_screenshots

# Agent name constants
AGENT_REVIEWER = "reviewer"


def upload_screenshots(
    init_ctx: ReviewInitContext,
    review_ctx: ReviewExecutionContext
) -> None:
    """Upload review screenshots to R2 storage.

    Args:
        init_ctx: Review initialization context
        review_ctx: Review execution context
    """
    if review_ctx.review_result:
        worktree_path = init_ctx.state.get("worktree_path")
        upload_review_screenshots(
            review_ctx.review_result,
            init_ctx.adw_id,
            worktree_path,
            init_ctx.logger
        )

        # Build and post the summary comment
        summary = build_review_summary(review_ctx.review_result)
        make_issue_comment(
            init_ctx.issue_number,
            format_issue_message(init_ctx.adw_id, AGENT_REVIEWER, summary)
        )


def finalize_review(
    init_ctx: ReviewInitContext,
    review_ctx: ReviewExecutionContext
) -> None:
    """Finalize review by creating commit, pushing, and updating state.

    Args:
        init_ctx: Review initialization context
        review_ctx: Review execution context

    Raises:
        SystemExit: If commit or git operations fail
    """
    worktree_path = init_ctx.state.get("worktree_path")

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
    except ValueError as e:
        init_ctx.logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Fetch issue data for commit message generation
    init_ctx.logger.info("Fetching issue data for commit message")
    issue = fetch_issue_safe(init_ctx.issue_number, init_ctx.state)
    if issue is None:
        init_ctx.logger.warning(f"Could not fetch issue #{init_ctx.issue_number} - continuing with fallback")
        # Create a fallback issue object for review commit message
        from adw_modules.data_types import GitHubUser
        from datetime import datetime

        issue = GitHubIssue(
            number=int(init_ctx.issue_number),
            title=f"Issue #{init_ctx.issue_number}",
            body="Issue data unavailable - review mode",
            state="open",
            author=GitHubUser(login="unknown", email="", name=""),
            assignees=[],
            labels=[],
            milestone=None,
            comments=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            closed_at=None,
            url=f"https://github.com/unknown/repo/issues/{init_ctx.issue_number}"
        )

    # Get issue classification from state
    issue_command = init_ctx.state.get("issue_class", "/feature")

    # Create commit message
    init_ctx.logger.info("Creating review commit")
    commit_msg, error = create_commit(
        AGENT_REVIEWER,
        issue,
        issue_command,
        init_ctx.adw_id,
        init_ctx.logger,
        worktree_path
    )

    if error:
        init_ctx.logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            init_ctx.issue_number,
            format_issue_message(init_ctx.adw_id, AGENT_REVIEWER, f"❌ Error creating commit message: {error}")
        )
        sys.exit(1)

    # Commit the review results (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        init_ctx.logger.error(f"Error committing review: {error}")
        make_issue_comment(
            init_ctx.issue_number,
            format_issue_message(init_ctx.adw_id, AGENT_REVIEWER, f"❌ Error committing review: {error}")
        )
        sys.exit(1)

    init_ctx.logger.info(f"Committed review: {commit_msg}")
    make_issue_comment(
        init_ctx.issue_number,
        format_issue_message(init_ctx.adw_id, AGENT_REVIEWER, "✅ Review committed")
    )

    # Finalize git operations (push and PR)
    # Note: This will work from the worktree context
    finalize_git_operations(init_ctx.state, init_ctx.logger, cwd=worktree_path)

    init_ctx.logger.info("Isolated review phase completed successfully")
    make_issue_comment(
        init_ctx.issue_number,
        format_issue_message(init_ctx.adw_id, "ops", "✅ Isolated review phase completed")
    )

    # Save final state
    init_ctx.state.save("adw_review_iso")

    # Post final state summary to issue
    make_issue_comment(
        init_ctx.issue_number,
        f"{init_ctx.adw_id}_ops: 📋 Final review state:\n```json\n{json.dumps(init_ctx.state.data, indent=2)}\n```"
    )
