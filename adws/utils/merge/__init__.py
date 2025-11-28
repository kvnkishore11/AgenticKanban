"""Merge workflow utilities.

This module provides high-level functions for the adw_merge_iso.py workflow.
Each function encapsulates a logical phase of the merge workflow.

Usage:
    from utils.merge import (
        initialize_merge_workflow,
        validate_merge_worktree,
        execute_merge,
        cleanup_worktree_and_branch,
        finalize_merge,
    )
"""

# Re-export types
from .types import (
    MergeInitContext,
    MergeValidationContext,
    MergeConflictContext,
    MergeConfigContext,
    MergeTestContext,
    MergeResultContext,
    MergeCleanupContext,
)

# Re-export functions
from .initialization import (
    initialize_merge_workflow,
    parse_cli_arguments,
    get_main_repo_root,
    AGENT_MERGER,
)
from .validation import validate_merge_worktree
from .conflicts import (
    check_merge_conflicts,
    invoke_claude_for_conflicts,
    detect_and_resolve_conflicts,
)
from .config import restore_config_files
from .testing import run_validation_tests
from .merge import execute_merge
from .cleanup import cleanup_worktree_and_branch
from .finalization import (
    post_merge_status,
    post_validation_status,
    post_merge_start_status,
    post_cleanup_status,
    finalize_merge,
    post_error_status,
)

__all__ = [
    # Types
    "MergeInitContext",
    "MergeValidationContext",
    "MergeConflictContext",
    "MergeConfigContext",
    "MergeTestContext",
    "MergeResultContext",
    "MergeCleanupContext",
    # Constants
    "AGENT_MERGER",
    # Functions - initialization
    "initialize_merge_workflow",
    "parse_cli_arguments",
    "get_main_repo_root",
    # Functions - validation
    "validate_merge_worktree",
    # Functions - conflicts
    "check_merge_conflicts",
    "invoke_claude_for_conflicts",
    "detect_and_resolve_conflicts",
    # Functions - config
    "restore_config_files",
    # Functions - testing
    "run_validation_tests",
    # Functions - merge
    "execute_merge",
    # Functions - cleanup
    "cleanup_worktree_and_branch",
    # Functions - finalization
    "post_merge_status",
    "post_validation_status",
    "post_merge_start_status",
    "post_cleanup_status",
    "finalize_merge",
    "post_error_status",
]
