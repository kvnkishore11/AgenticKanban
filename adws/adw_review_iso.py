#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "boto3>=1.26.0", "requests"]
# ///

"""
ADW Review Iso - AI Developer Workflow for agentic review in isolated worktrees

Usage:
  uv run adw_review_iso.py <issue-number> <adw-id> [--skip-resolution]

Workflow:
1. Load state and validate worktree exists
2. Find spec file from worktree
3. Review implementation against specification in worktree
4. Capture screenshots of critical functionality
5. If issues found and --skip-resolution not set:
   - Create patch plans for issues
   - Implement resolutions
6. Post results as commit message
7. Commit review results in worktree
8. Push and update PR

This workflow REQUIRES that adw_plan_iso.py or adw_patch_iso.py has been run first
to create the worktree. It cannot create worktrees itself.
"""

import sys
from dotenv import load_dotenv

from utils.review import (
    initialize_review_workflow,
    find_and_validate_spec,
    execute_review_with_retry,
    upload_screenshots,
    finalize_review,
)


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Initialize workflow (parse args, load state, validate worktree)
    init_ctx = initialize_review_workflow(sys.argv, "adw_review_iso")

    # Find and validate spec file
    spec_ctx = find_and_validate_spec(init_ctx)

    # Execute review with retry logic for blocker resolution
    review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

    # Upload screenshots and post summary
    upload_screenshots(init_ctx, review_ctx)

    # Finalize (commit, push, update state)
    finalize_review(init_ctx, review_ctx)


if __name__ == "__main__":
    main()
