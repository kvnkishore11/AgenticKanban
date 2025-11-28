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
3. Run external tools review (Bearer, Semgrep, ESLint, Ruff)
4. Review implementation against specification in worktree (AI review)
5. Capture screenshots of critical functionality
6. If issues found and --skip-resolution not set:
   - Create patch plans for issues
   - Implement resolutions
7. Post results as commit message
8. Commit review results in worktree
9. Push and update PR

Review is NEVER skipped by default. To skip review:
- Set skip_review: true in task metadata
- Or set skip_review in orchestrator config

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
    # New external tools review
    run_external_tools_review_sync,
    format_external_review_comment,
    load_review_config_from_metadata,
)
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Initialize workflow (parse args, load state, validate worktree)
    init_ctx = initialize_review_workflow(sys.argv, "adw_review_iso")

    # Find and validate spec file
    spec_ctx = find_and_validate_spec(init_ctx)

    # Load review configuration
    review_config = load_review_config_from_metadata(init_ctx)

    # Phase 1: External tools review (security + code quality)
    init_ctx.logger.info("=== Phase 1: External Tools Review ===")
    make_issue_comment(
        init_ctx.issue_number,
        format_issue_message(
            init_ctx.adw_id,
            "reviewer",
            "🔧 Running external tools review (security & code quality)..."
        )
    )

    external_result = run_external_tools_review_sync(init_ctx, spec_ctx, review_config)

    if external_result.mode_results:
        # Post external review results
        external_comment = format_external_review_comment(external_result)
        make_issue_comment(init_ctx.issue_number, external_comment)

    # Phase 2: AI review (existing implementation review)
    init_ctx.logger.info("=== Phase 2: AI Review ===")
    review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

    # Add external review findings count to review context if there were issues
    if external_result.has_blockers:
        init_ctx.logger.warning(f"External tools found {external_result.total_finding_counts.get('critical', 0)} critical and {external_result.total_finding_counts.get('high', 0)} high severity issues")

    # Upload screenshots and post summary
    upload_screenshots(init_ctx, review_ctx)

    # Finalize (commit, push, update state)
    finalize_review(init_ctx, review_ctx)


if __name__ == "__main__":
    main()
