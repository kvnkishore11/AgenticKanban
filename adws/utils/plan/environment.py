"""Environment and repository validation utilities for plan workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import check_env_vars
from adw_modules.kanban_mode import is_kanban_mode, should_skip_worktree_operations
from adw_modules.github import get_repo_url, extract_repo_path

from .types import EnvContext


def validate_environment(
    state: ADWState,
    logger: logging.Logger
) -> EnvContext:
    """Validate environment and get repository information.

    Checks:
    - Environment variables (unless kanban mode)
    - Git repository availability
    - Kanban mode status
    - Whether worktree operations should be skipped

    Args:
        state: ADW state object
        logger: Logger instance

    Returns:
        EnvContext with validation results

    Raises:
        SystemExit: If validation fails critically (no git repo and not in kanban mode)
    """
    # Validate environment (skip GitHub checks if in kanban mode)
    if not is_kanban_mode(state):
        check_env_vars(logger)
    else:
        logger.info("Skipping environment validation - kanban mode enabled")

    # Get repo information (gracefully handle kanban mode)
    github_repo_url = get_repo_url()
    extract_repo_path(github_repo_url)

    if github_repo_url is None and not is_kanban_mode(state):
        logger.error("No git repository available and not in kanban mode")
        sys.exit(1)
    elif github_repo_url is None:
        logger.info("No git repository available - continuing in kanban mode")

    # Check if worktree operations should be skipped (git not available)
    skip_worktree = should_skip_worktree_operations(state)

    if skip_worktree:
        logger.info("Skipping worktree operations - git not available")

    return EnvContext(
        github_repo_url=github_repo_url,
        skip_worktree=skip_worktree
    )
