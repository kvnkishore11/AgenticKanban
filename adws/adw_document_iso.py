#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""ADW Document Iso - simplified entry point for documentation generation.

Usage:
  uv run adw_document_iso.py <issue-number> <adw-id>

Workflow:
1. Load state and validate worktree exists
2. Check for changes in worktree
3. Find and validate spec file
4. Generate feature documentation
5. Track agentic KPIs
6. Commit and finalize documentation

This workflow REQUIRES that adw_plan_iso.py or adw_patch_iso.py has been run first
to create the worktree. It cannot create worktrees itself.
"""

import sys
from dotenv import load_dotenv

from utils.document import (
    initialize_document_workflow,
    check_for_changes,
    find_and_validate_spec,
    generate_documentation,
    track_kpis,
    finalize_document,
)


def main():
    """Main entry point."""
    load_dotenv()
    ctx = initialize_document_workflow(sys.argv, "adw_document_iso")
    if not check_for_changes(ctx):
        return
    spec_ctx = find_and_validate_spec(ctx)
    doc_ctx = generate_documentation(ctx, spec_ctx)
    track_kpis(ctx)
    finalize_document(ctx, doc_ctx)


if __name__ == "__main__":
    main()
