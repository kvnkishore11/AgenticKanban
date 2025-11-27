"""Environment validation utilities for patch workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.github import get_repo_url, extract_repo_path

from .types import PatchEnvContext


def validate_patch_environment(logger: logging.Logger) -> PatchEnvContext:
    """Validate environment and get repository information.

    Checks:
    - Repository URL accessibility
    - GitHub repository path extraction

    Args:
        logger: Logger instance for logging

    Returns:
        PatchEnvContext with validation results

    Raises:
        SystemExit: If repository URL cannot be obtained
    """
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
        logger.debug(f"Repository URL: {github_repo_url}")
        return PatchEnvContext(
            github_repo_url=github_repo_url,
            is_valid=True
        )
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)
