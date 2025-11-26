#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Build Iso - AI Developer Workflow for agentic building in isolated worktrees

Usage:
  uv run adw_build_iso.py <issue-number> <adw-id>

Workflow:
1. Load state and validate worktree exists
2. Find existing plan (from state)
3. Implement the solution based on plan in worktree
4. Commit implementation in worktree
5. Push and update PR

This workflow REQUIRES that adw_plan_iso.py or adw_patch_iso.py has been run first
to create the worktree. It cannot create worktrees itself.
"""

import sys
from dotenv import load_dotenv

from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message

from utils.build import (
    initialize_build_workflow,
    validate_build_environment,
    validate_worktree_and_state,
    checkout_branch,
    execute_implementation,
    fetch_issue_for_commit,
    create_build_commit,
    finalize_build,
)


def main():
    """Main entry point - high-level workflow orchestration."""
    load_dotenv()

    # 1. Initialize workflow (state, logger, notifier)
    ctx = initialize_build_workflow(sys.argv, "adw_build_iso")

    # 2. Validate environment
    validate_build_environment(ctx.state, ctx.logger)

    # 3. Validate worktree and state
    validation = validate_worktree_and_state(
        ctx.adw_id, ctx.state, ctx.issue_number, ctx.logger
    )

    # 4. Checkout branch in worktree
    checkout_branch(
        validation.branch_name, validation.worktree_path,
        ctx.adw_id, ctx.issue_number, ctx.logger
    )

    # Log plan and port info
    ctx.logger.info(f"Using plan file: {validation.plan_file}")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(ctx.adw_id, "ops", f"Starting isolated implementation phase\n"
                           f"Worktree: {validation.worktree_path}\n"
                           f"Ports - WebSocket: {validation.websocket_port}, Frontend: {validation.frontend_port}")
    )

    # 5. Execute implementation
    execute_implementation(
        validation.plan_file, ctx.adw_id, validation.worktree_path,
        ctx.issue_number, ctx.notifier, ctx.logger
    )

    # 6. Fetch issue and classification for commit
    issue_ctx = fetch_issue_for_commit(
        ctx.issue_number, ctx.adw_id, ctx.state, ctx.logger
    )

    # 7. Create and execute commit
    create_build_commit(
        issue_ctx.issue, issue_ctx.issue_command, ctx.adw_id,
        validation.worktree_path, ctx.issue_number, ctx.logger
    )

    # 8. Finalize (push, PR, state save)
    finalize_build(
        ctx.state, validation.worktree_path, ctx.notifier,
        ctx.issue_number, ctx.adw_id, ctx.logger
    )


if __name__ == "__main__":
    main()
