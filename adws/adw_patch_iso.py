#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Patch Isolated - AI Developer Workflow for single-issue patches with worktree isolation

Usage:
  uv run adw_patch_iso.py <issue-number> [adw-id]

Workflow:
1. Create/validate isolated worktree
2. Allocate dedicated ports (9100-9114 backend, 9200-9214 frontend)
3. Fetch issue details (GitHub or Kanban)
4. Extract patch content based on mode:
   - GitHub mode: Requires 'adw_patch' keyword in comments or issue body
   - Kanban mode: Uses task description and metadata
5. Create patch plan based on extracted content
6. Implement the patch plan
7. Commit changes
8. Push and create/update PR

Dual-mode operation:
- GitHub mode: Requires 'adw_patch' keyword in comment or issue body
- Kanban mode: Uses task data from state (no keyword required)

Key features:
- Runs in isolated git worktree under trees/<adw_id>/
- Uses dedicated ports to avoid conflicts
- Passes working_dir to all agent and git operations
- Enables parallel execution of multiple patches
- Supports both GitHub and Kanban data sources
"""

import sys
from dotenv import load_dotenv

from utils.patch import (
    initialize_patch_workflow,
    validate_patch_environment,
    fetch_issue_with_fallback,
    resolve_branch_name,
    setup_patch_worktree,
    extract_patch_content,
    implement_patch,
    create_patch_commit,
    finalize_patch,
)


def main():
    """Main entry point - high-level workflow orchestration."""
    load_dotenv()

    # 1. Initialize workflow (env, state, logger, notifier)
    ctx = initialize_patch_workflow(sys.argv, "adw_patch_iso")

    # 2. Validate environment and get repo info
    validate_patch_environment(ctx.logger)

    # 3. Fetch issue with fallback
    issue_ctx = fetch_issue_with_fallback(
        ctx.issue_number, ctx.adw_id, ctx.state, ctx.notifier, ctx.logger
    )

    # 4. Resolve or generate branch name
    branch_ctx = resolve_branch_name(
        issue_ctx.issue, ctx.issue_number, ctx.adw_id,
        ctx.state, ctx.notifier, ctx.logger
    )

    # 5. Setup worktree (create or validate existing)
    worktree_ctx = setup_patch_worktree(
        ctx.adw_id, branch_ctx.branch_name, ctx.issue_number,
        ctx.state, ctx.notifier, ctx.logger
    )

    # 6. Extract patch content (GitHub or Kanban mode)
    content_ctx = extract_patch_content(
        issue_ctx.issue, ctx.issue_number, ctx.adw_id,
        ctx.state, ctx.notifier, ctx.logger
    )

    # 7. Implement the patch
    patch_result = implement_patch(
        content_ctx.patch_content, content_ctx.source_description,
        worktree_ctx.worktree_path, ctx.issue_number, ctx.adw_id,
        ctx.state, ctx.notifier, ctx.logger
    )

    # 8. Create commit for patch changes
    create_patch_commit(
        issue_ctx.issue, worktree_ctx.worktree_path, ctx.issue_number,
        ctx.adw_id, ctx.state, ctx.notifier, ctx.logger
    )

    # 9. Finalize (push, PR, state save, patch history)
    finalize_patch(
        patch_result, worktree_ctx.worktree_path, ctx.issue_number,
        ctx.adw_id, ctx.state, ctx.notifier, ctx.logger
    )


if __name__ == "__main__":
    main()
