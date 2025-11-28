"""Merge workflow test validation utilities."""

import subprocess
import os
import logging

from .types import MergeTestContext


def run_validation_tests(repo_root: str, logger: logging.Logger) -> MergeTestContext:
    """Run validation tests to ensure merge is clean.

    Args:
        repo_root: Repository root directory
        logger: Logger instance

    Returns:
        MergeTestContext with test results
    """
    logger.info("Running validation tests...")

    # Run server tests
    test_dir = os.path.join(repo_root, "app", "server")
    if not os.path.exists(test_dir):
        logger.warning("Test directory not found, skipping tests")
        return MergeTestContext(
            success=True,
            test_output=None,
            error=None
        )

    result = subprocess.run(
        ["uv", "run", "pytest"],
        capture_output=True,
        text=True,
        cwd=test_dir
    )

    if result.returncode != 0:
        error_msg = f"Tests failed:\n{result.stdout}\n{result.stderr}"
        logger.error(error_msg)
        return MergeTestContext(
            success=False,
            test_output=result.stdout,
            error=error_msg
        )

    logger.info("✅ All tests passed")
    return MergeTestContext(
        success=True,
        test_output=result.stdout,
        error=None
    )
