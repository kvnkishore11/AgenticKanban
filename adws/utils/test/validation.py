"""Test workflow validation utilities."""

import sys
import logging

sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.state import ADWState
from adw_modules.utils import check_env_vars
from adw_modules.worktree_ops import validate_worktree
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message

from .types import TestValidationContext


def validate_test_environment(
    state: ADWState,
    logger: logging.Logger
) -> None:
    """Validate environment variables for test workflow.

    Args:
        state: ADW state object
        logger: Logger instance

    Raises:
        SystemExit: If environment validation fails
    """
    check_env_vars(logger)


def validate_test_worktree(
    adw_id: str,
    state: ADWState,
    issue_number: str,
    logger: logging.Logger
) -> TestValidationContext:
    """Validate worktree exists and return validation context.

    Args:
        adw_id: ADW identifier
        state: ADW state object
        issue_number: Issue number for comments
        logger: Logger instance

    Returns:
        TestValidationContext with worktree info

    Raises:
        SystemExit: If worktree validation fails
    """
    valid, error = validate_worktree(adw_id, state)

    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, "ops",
                f"❌ Worktree validation failed: {error}\n"
                "Run adw_plan_iso.py or adw_patch_iso.py first"
            )
        )
        sys.exit(1)

    worktree_path = state.get("worktree_path")
    websocket_port = state.get("websocket_port", "9100")
    frontend_port = state.get("frontend_port", "9200")

    logger.info(f"Using worktree at: {worktree_path}")

    return TestValidationContext(
        worktree_path=worktree_path,
        websocket_port=websocket_port,
        frontend_port=frontend_port
    )


def post_test_start_message(
    issue_number: str,
    adw_id: str,
    worktree_path: str,
    websocket_port: str,
    frontend_port: str,
    skip_e2e: bool
) -> None:
    """Post test workflow start message to issue.

    Args:
        issue_number: Issue number
        adw_id: ADW identifier
        worktree_path: Path to worktree
        websocket_port: WebSocket port
        frontend_port: Frontend port
        skip_e2e: Whether E2E tests are skipped
    """
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id, "ops",
            f"✅ Starting isolated testing phase\n"
            f"🏠 Worktree: {worktree_path}\n"
            f"🔌 Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}\n"
            f"🧪 E2E Tests: {'Skipped' if skip_e2e else 'Enabled'}"
        )
    )
