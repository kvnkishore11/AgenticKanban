#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Plan Iso - AI Developer Workflow for agentic planning in isolated worktrees

Usage:
  uv run adw_plan_iso.py <issue-number> [adw-id]

Workflow:
1. Fetch GitHub issue details
2. Check/create worktree for isolated execution
3. Allocate unique ports for services
4. Setup worktree environment
5. Classify issue type (/chore, /bug, /feature)
6. Create feature branch in worktree
7. Generate implementation plan in worktree
8. Commit plan in worktree
9. Push and create/update PR

This workflow creates an isolated git worktree under trees/<adw_id>/ for
parallel execution without interference.
"""

import sys
from dotenv import load_dotenv

from utils.plan import (
    initialize_workflow,
    validate_environment,
    setup_worktree,
    fetch_and_classify,
    generate_branch,
    create_worktree_env,
    build_plan,
    create_plan_commit,
    finalize,
)


def main():
    """Main entry point - high-level workflow orchestration."""
    load_dotenv()

    # 1. Initialize workflow (env, state, logger, notifier)
    ctx = initialize_workflow(sys.argv, "adw_plan_iso")

    # 2. Validate environment and get repo info
    env = validate_environment(ctx.state, ctx.logger)

    # 3. Setup worktree (ports, validation - no creation yet)
    wt = setup_worktree(ctx.adw_id, ctx.state, env.skip_worktree, ctx.logger)

    # 4. Fetch issue and determine classification
    issue_ctx = fetch_and_classify(
        ctx.issue_number, ctx.adw_id, ctx.state, ctx.notifier, ctx.logger
    )

    # 5. Generate branch name
    branch_name = generate_branch(
        issue_ctx.issue, issue_ctx.issue_command, ctx.adw_id,
        ctx.state, ctx.notifier, ctx.issue_number, ctx.logger
    )

    # 6. Create worktree if needed (with branch and environment setup)
    worktree_path = wt.worktree_path
    if not wt.is_valid:
        worktree_path = create_worktree_env(
            ctx.adw_id, branch_name, wt, ctx.state,
            ctx.notifier, ctx.issue_number, ctx.logger
        )

    # 7. Build implementation plan
    plan = build_plan(
        issue_ctx.issue, issue_ctx.issue_command, ctx.adw_id, worktree_path,
        ctx.state, ctx.notifier, ctx.issue_number, ctx.logger
    )

    # 8. Commit the plan
    create_plan_commit(
        issue_ctx.issue, issue_ctx.issue_command, ctx.adw_id, worktree_path,
        ctx.state, ctx.notifier, ctx.issue_number, ctx.logger
    )

    # 9. Finalize (push, PR, state save)
    finalize(ctx.state, worktree_path, ctx.notifier, ctx.issue_number, ctx.adw_id, ctx.logger)


if __name__ == "__main__":
    main()
