"""Plan workflow utilities.

This module provides high-level functions for the adw_plan_iso.py workflow.
Each function encapsulates a logical phase of the planning workflow.

Usage:
    from utils.plan import (
        initialize_workflow,
        validate_environment,
        setup_worktree,
        fetch_and_classify,
        generate_branch,
        create_worktree_env,
        build_plan,
        create_plan_commit,
        finalize,
    )
"""

# Re-export types
from .types import (
    InitContext,
    EnvContext,
    WorktreeContext,
    IssueContext,
    PlanContext,
)

# Re-export functions
from .initialization import initialize_workflow, parse_cli_arguments
from .environment import validate_environment
from .worktree import setup_worktree, create_worktree_env
from .issue import fetch_and_classify
from .branching import generate_branch
from .planning import build_plan
from .commit import create_plan_commit
from .finalization import finalize

__all__ = [
    # Types
    "InitContext",
    "EnvContext",
    "WorktreeContext",
    "IssueContext",
    "PlanContext",
    # Functions
    "initialize_workflow",
    "parse_cli_arguments",
    "validate_environment",
    "setup_worktree",
    "create_worktree_env",
    "fetch_and_classify",
    "generate_branch",
    "build_plan",
    "create_plan_commit",
    "finalize",
]
