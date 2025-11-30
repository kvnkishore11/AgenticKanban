"""Test workflow initialization utilities."""

import sys
import json
from typing import List, Tuple

sys.path.insert(0, __file__.rsplit('/', 3)[0])

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.github import make_issue_comment

from .types import TestInitContext


def parse_cli_arguments(argv: List[str]) -> Tuple[str, str, bool]:
    """Parse command line arguments for test workflow.

    Args:
        argv: Command line arguments (sys.argv)

    Returns:
        Tuple of (issue_number, adw_id, skip_e2e)

    Raises:
        SystemExit: If required arguments are missing
    """
    # Check for --skip-e2e flag
    skip_e2e = "--skip-e2e" in argv
    args = [arg for arg in argv if arg != "--skip-e2e"]

    if len(args) < 3:
        print("Usage: uv run adw_test_iso.py <issue-number> <adw-id> [--skip-e2e]")
        print("\nError: adw-id is required to locate the worktree")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree")
        sys.exit(1)

    return args[1], args[2], skip_e2e


def initialize_test_workflow(
    argv: List[str],
    workflow_name: str = "adw_test_iso"
) -> TestInitContext:
    """Initialize the test workflow with state and logging.

    Args:
        argv: Command line arguments
        workflow_name: Name of the workflow for logging

    Returns:
        TestInitContext with all initialized components

    Raises:
        SystemExit: If state not found or initialization fails
    """
    issue_number, adw_id, skip_e2e = parse_cli_arguments(argv)

    # Try to load existing state
    temp_logger = setup_logger(adw_id, workflow_name)
    state = ADWState.load(adw_id, temp_logger)

    if not state:
        logger = setup_logger(adw_id, workflow_name)
        logger.error(f"No state found for ADW ID: {adw_id}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state")
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state")
        sys.exit(1)

    # Use issue number from state if available
    issue_number = state.get("issue_number", issue_number)

    # Post initial state to issue
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: 🔍 Found existing state - starting isolated testing\n```json\n{json.dumps(state.data, indent=2)}\n```"
    )

    # Track that this ADW workflow has run
    state.append_adw_id(workflow_name)

    # Set up logger
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"ADW Test Iso starting - ID: {adw_id}, Issue: {issue_number}, Skip E2E: {skip_e2e}")

    # Initialize WebSocket notifier
    notifier = WebSocketNotifier(adw_id)

    return TestInitContext(
        adw_id=adw_id,
        issue_number=issue_number,
        skip_e2e=skip_e2e,
        state=state,
        logger=logger,
        notifier=notifier
    )
