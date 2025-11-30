"""Test discovery for ADW-specific tests.

This module handles discovering tests in agents/{adw_id}/tests/ directories,
supporting both backend (pytest) and frontend (vitest) test discovery.
"""

import os
import glob
import logging
from dataclasses import dataclass
from typing import Optional


@dataclass
class DiscoveredTests:
    """Container for discovered test files."""
    backend_tests: list[str]  # Python test files
    frontend_tests: list[str]  # JS/TS test files
    e2e_tests: list[str]  # E2E test markdown files


def discover_adw_tests(
    adw_id: str,
    worktree_path: Optional[str] = None,
    logger: Optional[logging.Logger] = None
) -> DiscoveredTests:
    """Discover tests in agents/{adw_id}/tests/ directory.

    Args:
        adw_id: The ADW identifier
        worktree_path: Optional path to worktree (uses cwd if not provided)
        logger: Optional logger for debug output

    Returns:
        DiscoveredTests with lists of discovered test files
    """
    base_path = worktree_path or os.getcwd()
    tests_dir = os.path.join(base_path, "agents", adw_id, "tests")

    result = DiscoveredTests(
        backend_tests=[],
        frontend_tests=[],
        e2e_tests=[]
    )

    if not os.path.exists(tests_dir):
        if logger:
            logger.debug(f"No tests directory found at {tests_dir}")
        return result

    # Discover backend tests (Python)
    backend_dir = os.path.join(tests_dir, "unit_test", "backend")
    if os.path.exists(backend_dir):
        backend_pattern = os.path.join(backend_dir, "test_*.py")
        result.backend_tests = glob.glob(backend_pattern)
        if logger:
            logger.debug(f"Found {len(result.backend_tests)} backend tests")

    # Discover frontend tests (JavaScript/TypeScript)
    frontend_dir = os.path.join(tests_dir, "unit_test", "frontend")
    if os.path.exists(frontend_dir):
        js_pattern = os.path.join(frontend_dir, "*.test.js")
        jsx_pattern = os.path.join(frontend_dir, "*.test.jsx")
        ts_pattern = os.path.join(frontend_dir, "*.test.ts")
        tsx_pattern = os.path.join(frontend_dir, "*.test.tsx")

        result.frontend_tests = (
            glob.glob(js_pattern) +
            glob.glob(jsx_pattern) +
            glob.glob(ts_pattern) +
            glob.glob(tsx_pattern)
        )
        if logger:
            logger.debug(f"Found {len(result.frontend_tests)} frontend tests")

    # Discover E2E tests (Markdown)
    e2e_dir = os.path.join(tests_dir, "e2e")
    if os.path.exists(e2e_dir):
        e2e_pattern = os.path.join(e2e_dir, "test_*.md")
        result.e2e_tests = glob.glob(e2e_pattern)
        if logger:
            logger.debug(f"Found {len(result.e2e_tests)} E2E tests")

    return result


def get_adw_test_paths(adw_id: str, worktree_path: Optional[str] = None) -> dict[str, str]:
    """Get the paths for ADW test directories.

    Args:
        adw_id: The ADW identifier
        worktree_path: Optional path to worktree (uses cwd if not provided)

    Returns:
        Dictionary with paths for backend_tests, frontend_tests, and e2e_tests
    """
    base_path = worktree_path or os.getcwd()
    tests_base = os.path.join(base_path, "agents", adw_id, "tests")

    return {
        "backend_tests": os.path.join(tests_base, "unit_test", "backend"),
        "frontend_tests": os.path.join(tests_base, "unit_test", "frontend"),
        "e2e_tests": os.path.join(tests_base, "e2e"),
    }


def ensure_adw_test_dirs(adw_id: str, worktree_path: Optional[str] = None) -> dict[str, str]:
    """Ensure ADW test directories exist and return their paths.

    Args:
        adw_id: The ADW identifier
        worktree_path: Optional path to worktree (uses cwd if not provided)

    Returns:
        Dictionary with paths for backend_tests, frontend_tests, and e2e_tests
    """
    paths = get_adw_test_paths(adw_id, worktree_path)

    for path in paths.values():
        os.makedirs(path, exist_ok=True)

    return paths


def has_adw_tests(adw_id: str, worktree_path: Optional[str] = None) -> bool:
    """Check if an ADW has any tests defined.

    Args:
        adw_id: The ADW identifier
        worktree_path: Optional path to worktree (uses cwd if not provided)

    Returns:
        True if any tests are found, False otherwise
    """
    tests = discover_adw_tests(adw_id, worktree_path)
    return bool(tests.backend_tests or tests.frontend_tests or tests.e2e_tests)


def discover_issue_e2e_tests(
    issue_number: str,
    adw_id: str,
    worktree_path: Optional[str] = None,
    logger: Optional[logging.Logger] = None
) -> list[str]:
    """Discover E2E test files for a specific issue and ADW.

    Searches in src/test/e2e/ for files matching the pattern:
    issue-{issue_number}-adw-{adw_id}-e2e-*.md

    Args:
        issue_number: The GitHub issue number
        adw_id: The ADW identifier
        worktree_path: Optional path to worktree (uses cwd if not provided)
        logger: Optional logger for debug output

    Returns:
        List of discovered E2E test file paths
    """
    base_path = worktree_path or os.getcwd()
    e2e_dir = os.path.join(base_path, "src", "test", "e2e")

    if not os.path.exists(e2e_dir):
        if logger:
            logger.debug(f"No E2E test directory found at {e2e_dir}")
        return []

    # Pattern: issue-{issue_number}-adw-{adw_id}-e2e-*.md
    pattern = os.path.join(e2e_dir, f"issue-{issue_number}-adw-{adw_id}-e2e-*.md")
    tests = glob.glob(pattern)

    if logger:
        logger.debug(f"Found {len(tests)} issue-specific E2E tests matching pattern")

    return tests


def discover_all_e2e_tests(
    adw_id: str,
    issue_number: Optional[str] = None,
    worktree_path: Optional[str] = None,
    logger: Optional[logging.Logger] = None
) -> list[str]:
    """Discover all E2E tests from multiple locations.

    Searches in:
    1. agents/{adw_id}/tests/e2e/ - ADW-specific tests
    2. src/test/e2e/ - Issue-specific tests (if issue_number provided)

    Args:
        adw_id: The ADW identifier
        issue_number: Optional GitHub issue number for issue-specific tests
        worktree_path: Optional path to worktree (uses cwd if not provided)
        logger: Optional logger for debug output

    Returns:
        List of all discovered E2E test file paths
    """
    all_tests = []

    # Discover ADW-specific tests
    adw_tests = discover_adw_tests(adw_id, worktree_path, logger)
    all_tests.extend(adw_tests.e2e_tests)

    # Discover issue-specific tests if issue_number provided
    if issue_number:
        issue_tests = discover_issue_e2e_tests(
            issue_number, adw_id, worktree_path, logger
        )
        all_tests.extend(issue_tests)

    if logger:
        logger.debug(f"Total E2E tests discovered: {len(all_tests)}")

    return all_tests
