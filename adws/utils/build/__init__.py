"""Build workflow utilities.

This module provides high-level functions for the adw_build_iso.py workflow.
Each function encapsulates a logical phase of the build workflow.

Usage:
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
"""

# Re-export types
from .types import (
    BuildInitContext,
    BuildValidationContext,
    BuildIssueContext,
)

# Re-export functions
from .initialization import initialize_build_workflow, parse_cli_arguments
from .validation import validate_build_environment, validate_worktree_and_state, checkout_branch
from .implementation import execute_implementation, fetch_issue_for_commit
from .commit import create_build_commit
from .finalization import finalize_build

__all__ = [
    # Types
    "BuildInitContext",
    "BuildValidationContext",
    "BuildIssueContext",
    # Functions
    "initialize_build_workflow",
    "parse_cli_arguments",
    "validate_build_environment",
    "validate_worktree_and_state",
    "checkout_branch",
    "execute_implementation",
    "fetch_issue_for_commit",
    "create_build_commit",
    "finalize_build",
]
