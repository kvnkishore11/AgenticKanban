#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Merge Isolated - Merge isolated ADW worktree into main branch

Usage:
  uv run adw_merge_iso.py <adw-id> [merge-method]

Arguments:
  adw-id: The ADW ID of the worktree to merge (required)
  merge-method: Merge strategy - "squash", "merge", or "rebase" (default: "squash")

Workflow:
1. Load ADW state and validate worktree exists
2. Get branch name and worktree path from state
3. Switch to main repository root (not worktree)
4. Fetch latest changes from origin
5. Checkout and pull main branch
6. Attempt to merge the feature branch
7. If conflicts occur, invoke Claude Code for resolution
8. Restore config files to main repository paths (fixes worktree-specific paths)
9. Run validation tests to ensure merge is clean
10. Push merged changes to remote main
11. Clean up worktree after successful merge
12. Optionally delete remote branch
13. Update ADW state with merge status

Config File Handling:
Worktrees often modify .mcp.json and playwright-mcp-config.json to point to
worktree-specific paths (e.g., trees/adw-id/...). After merge, these files are
automatically restored to main repository paths to prevent breaking the main repo.

This command works with or without an associated issue number, providing
flexibility for various workflows.
"""

import sys
from dotenv import load_dotenv

from utils.merge import (
    initialize_merge_workflow,
    validate_merge_worktree,
    execute_merge,
    cleanup_worktree_and_branch,
    finalize_merge,
    post_merge_status,
    post_validation_status,
    post_merge_start_status,
    post_cleanup_status,
    post_error_status,
)


def main():
    """Main entry point - high-level workflow orchestration."""
    load_dotenv()

    # 1. Initialize workflow (env, state, logger, notifier)
    ctx = initialize_merge_workflow(sys.argv, "adw_merge_iso")

    # 2. Post initial status
    post_merge_status(
        ctx.adw_id, ctx.branch_name, ctx.merge_method,
        ctx.issue_number, ctx.state, ctx.logger
    )

    # 3. Validate worktree exists
    validation_ctx = validate_merge_worktree(
        ctx.adw_id, ctx.state, ctx.issue_number, ctx.logger
    )
    if not validation_ctx.is_valid:
        post_error_status(
            ctx.adw_id, f"Worktree validation failed: {validation_ctx.error}",
            ctx.issue_number, ctx.state, ctx.logger
        )
        print(f"\nError: Worktree validation failed: {validation_ctx.error}")
        sys.exit(1)

    # 4. Post validation status
    post_validation_status(
        ctx.adw_id, ctx.branch_name,
        ctx.issue_number, ctx.state, ctx.logger
    )

    # 5. Post merge start status
    post_merge_start_status(
        ctx.adw_id, ctx.branch_name, ctx.merge_method,
        ctx.issue_number, ctx.state, ctx.logger
    )

    # 6. Execute merge (includes conflict resolution, config restoration, tests)
    merge_result = execute_merge(
        ctx.adw_id, ctx.branch_name, ctx.merge_method,
        ctx.issue_number, ctx.state, ctx.logger
    )
    if not merge_result.success:
        post_error_status(
            ctx.adw_id, f"Failed to merge: {merge_result.error}",
            ctx.issue_number, ctx.state, ctx.logger
        )
        print(f"\nError: Failed to merge: {merge_result.error}")
        sys.exit(1)

    ctx.logger.info(f"✅ Successfully merged {ctx.branch_name} to main")

    # 7. Post cleanup status and cleanup
    post_cleanup_status(ctx.adw_id, ctx.issue_number, ctx.state, ctx.logger)
    cleanup_worktree_and_branch(ctx.adw_id, ctx.branch_name, ctx.logger)

    # 8. Finalize (state update, success message)
    finalize_merge(
        ctx.adw_id, ctx.branch_name, ctx.merge_method,
        ctx.issue_number, ctx.state, ctx.logger
    )


if __name__ == "__main__":
    main()
