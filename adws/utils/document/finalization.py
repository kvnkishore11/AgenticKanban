"""Finalization utilities for document workflow."""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import (
    fetch_issue_safe,
    make_issue_comment,
    get_repo_url,
    extract_repo_path,
)
from adw_modules.workflow_ops import create_commit, format_issue_message
from adw_modules.data_types import GitHubIssue, GitHubUser

from .types import DocumentInitContext, DocumentResultContext


# Agent name constant
AGENT_DOCUMENTER = "documenter"


def finalize_document(
    ctx: DocumentInitContext,
    doc_ctx: DocumentResultContext
) -> None:
    """Finalize documentation workflow with commit and git operations.

    Args:
        ctx: Document initialization context
        doc_ctx: Documentation result context

    Raises:
        SystemExit: If finalization fails
    """
    # Get repo information
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
    except ValueError as e:
        ctx.logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Fetch issue data for commit message generation
    from datetime import datetime

    ctx.logger.info("Fetching issue data for commit message")
    issue = fetch_issue_safe(ctx.issue_number, ctx.state)
    if issue is None:
        ctx.logger.warning(f"Could not fetch issue #{ctx.issue_number} - continuing with fallback")
        # Create a fallback issue object for documentation commit message
        issue = GitHubIssue(
            number=int(ctx.issue_number),
            title=f"Issue #{ctx.issue_number}",
            body="Issue data unavailable - documentation mode",
            state="open",
            author=GitHubUser(login="unknown"),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            url=f"https://github.com/unknown/repo/issues/{ctx.issue_number}"
        )

    # Get issue classification from state
    issue_command = ctx.state.get("issue_class", "/feature")

    # Create commit message
    ctx.logger.info("Creating documentation commit")
    commit_msg, error = create_commit(
        AGENT_DOCUMENTER, issue, issue_command, ctx.adw_id, ctx.logger, ctx.worktree_path
    )

    if error:
        ctx.logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(
                ctx.adw_id, AGENT_DOCUMENTER, f"❌ Error creating commit message: {error}"
            ),
        )
        sys.exit(1)

    # Commit the documentation (in worktree)
    success, error = commit_changes(commit_msg, cwd=ctx.worktree_path)

    if not success:
        ctx.logger.error(f"Error committing documentation: {error}")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(
                ctx.adw_id,
                AGENT_DOCUMENTER,
                f"❌ Error committing documentation: {error}",
            ),
        )
        sys.exit(1)

    ctx.logger.info(f"Committed documentation: {commit_msg}")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(ctx.adw_id, AGENT_DOCUMENTER, "✅ Documentation committed"),
    )

    # Finalize git operations (push and PR)
    # Note: This will work from the worktree context
    finalize_git_operations(ctx.state, ctx.logger, cwd=ctx.worktree_path)

    ctx.logger.info("Isolated documentation phase completed successfully")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(
            ctx.adw_id, "ops", "✅ Isolated documentation phase completed"
        ),
    )

    # Save final state
    ctx.state.save("adw_document_iso")

    # Post final state summary to issue
    make_issue_comment(
        ctx.issue_number,
        f"{ctx.adw_id}_ops: 📋 Final documentation state:\n```json\n{json.dumps(ctx.state.data, indent=2)}\n```",
    )
