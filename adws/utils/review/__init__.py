"""Review workflow utilities.

This module provides high-level functions for the adw_review_iso.py workflow.
Each function encapsulates a logical phase of the review workflow.

Usage:
    from utils.review import (
        initialize_review_workflow,
        find_and_validate_spec,
        execute_review_with_retry,
        upload_screenshots,
        finalize_review,
        # New external tools review
        run_external_tools_review_sync,
        format_external_review_comment,
    )
"""

# Re-export types
from .types import (
    ReviewInitContext,
    ReviewSpecContext,
    ReviewExecutionContext,
    ReviewResolutionContext,
)

# Re-export functions
from .initialization import (
    initialize_review_workflow,
    parse_cli_arguments,
    find_and_validate_spec,
)
from .execution import run_review, execute_review_with_retry
from .patch_planning import create_review_patch_plan
from .screenshots import upload_review_screenshots
from .resolution import resolve_blocker_issues
from .summary import build_review_summary
from .finalization import upload_screenshots, finalize_review

# New external tools review functions
from .external_tools import (
    run_external_tools_review_sync,
    run_external_tools_review,
    format_external_review_comment,
    load_review_config_from_metadata,
    should_fail_review,
)

__all__ = [
    # Types
    "ReviewInitContext",
    "ReviewSpecContext",
    "ReviewExecutionContext",
    "ReviewResolutionContext",
    # Functions
    "initialize_review_workflow",
    "parse_cli_arguments",
    "find_and_validate_spec",
    "run_review",
    "execute_review_with_retry",
    "create_review_patch_plan",
    "upload_review_screenshots",
    "resolve_blocker_issues",
    "build_review_summary",
    "upload_screenshots",
    "finalize_review",
    # External tools review
    "run_external_tools_review_sync",
    "run_external_tools_review",
    "format_external_review_comment",
    "load_review_config_from_metadata",
    "should_fail_review",
]
