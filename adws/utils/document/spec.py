"""Spec file validation utilities for document workflow."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.workflow_ops import format_issue_message, find_spec_file
from adw_modules.github import make_issue_comment

from .types import DocumentInitContext, DocumentSpecContext


def find_and_validate_spec(ctx: DocumentInitContext) -> DocumentSpecContext:
    """Find and validate spec file from worktree.

    Args:
        ctx: Document initialization context

    Returns:
        DocumentSpecContext with spec file information

    Raises:
        SystemExit: If spec file cannot be found
    """
    # Find spec file from current branch (in worktree)
    ctx.logger.info("Looking for spec file in worktree")
    spec_file = find_spec_file(ctx.state, ctx.logger)

    if not spec_file:
        error_msg = "Could not find spec file for documentation"
        ctx.logger.error(error_msg)
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(ctx.adw_id, "ops", f"❌ {error_msg}")
        )
        sys.exit(1)

    ctx.logger.info(f"Found spec file: {spec_file}")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(ctx.adw_id, "ops", f"📋 Found spec file: {spec_file}"),
    )

    return DocumentSpecContext(
        spec_file=spec_file,
        has_changes=True
    )
