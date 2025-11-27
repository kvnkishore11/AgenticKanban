"""Patch workflow utilities.

This module provides high-level functions for the adw_patch_iso.py workflow.
Each function encapsulates a logical phase of the patching workflow.

Usage:
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
"""

# Re-export types
from .types import (
    PatchInitContext,
    PatchEnvContext,
    PatchIssueContext,
    PatchBranchContext,
    PatchWorktreeContext,
    PatchContentContext,
    PatchResultContext,
)

# Re-export functions
from .initialization import initialize_patch_workflow, parse_cli_arguments
from .environment import validate_patch_environment
from .issue import fetch_issue_with_fallback
from .branching import resolve_branch_name
from .worktree import setup_patch_worktree
from .content import extract_patch_content
from .implementation import implement_patch
from .commit import create_patch_commit
from .finalization import finalize_patch

__all__ = [
    # Types
    "PatchInitContext",
    "PatchEnvContext",
    "PatchIssueContext",
    "PatchBranchContext",
    "PatchWorktreeContext",
    "PatchContentContext",
    "PatchResultContext",
    # Functions
    "initialize_patch_workflow",
    "parse_cli_arguments",
    "validate_patch_environment",
    "fetch_issue_with_fallback",
    "resolve_branch_name",
    "setup_patch_worktree",
    "extract_patch_content",
    "implement_patch",
    "create_patch_commit",
    "finalize_patch",
]
