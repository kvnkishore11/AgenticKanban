"""Build workflow initialization utilities."""

import sys
import os
import json
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.github import make_issue_comment

from .types import BuildInitContext


def parse_cli_arguments(args: List[str]) -> tuple[str, str]:
    """Parse command line arguments for build workflow.

    Args:
        args: Command line arguments (sys.argv)

    Returns:
        Tuple of (issue_number, adw_id)

    Raises:
        SystemExit: If required arguments are missing
    """
    if len(args) < 3:
        print("Usage: uv run adw_build_iso.py <issue-number> <adw-id>")
        print("\nError: adw-id is required to locate the worktree and plan file")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree")
        sys.exit(1)

    issue_number = args[1]
    adw_id = args[2]

    return issue_number, adw_id


def initialize_build_workflow(
    args: List[str],
    workflow_name: str = "adw_build_iso"
) -> BuildInitContext:
    """Initialize build workflow with state, logger, and notifier.

    Build workflow REQUIRES existing state from plan phase.

    Args:
        args: Command line arguments (sys.argv)
        workflow_name: Name of workflow for logging

    Returns:
        BuildInitContext with all initialized components

    Raises:
        SystemExit: If required arguments are missing or no state found
    """
    # Parse arguments
    issue_number, adw_id = parse_cli_arguments(args)

    # Try to load existing state - REQUIRED for build
    temp_logger = setup_logger(adw_id, workflow_name)
    state = ADWState.load(adw_id, temp_logger)

    if state:
        # Found existing state - use the issue number from state if available
        issue_number = state.get("issue_number", issue_number)
        make_issue_comment(
            issue_number,
            f"{adw_id}_ops: Found existing state - resuming isolated build\n```json\n{json.dumps(state.data, indent=2)}\n```"
        )
    else:
        # No existing state found - cannot proceed
        logger = setup_logger(adw_id, workflow_name)
        logger.error(f"No state found for ADW ID: {adw_id}")
        logger.error("Run adw_plan_iso.py first to create the worktree and state")
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print("Run adw_plan_iso.py first to create the worktree and state")
        sys.exit(1)

    # Track that this ADW workflow has run
    state.append_adw_id(workflow_name)

    # Set up logger with ADW ID
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"{workflow_name} starting - ID: {adw_id}, Issue: {issue_number}")

    # Initialize WebSocket notifier for real-time updates
    notifier = WebSocketNotifier(adw_id)
    notifier.notify_start(workflow_name, f"Starting build workflow for issue #{issue_number}")

    return BuildInitContext(
        issue_number=issue_number,
        adw_id=adw_id,
        state=state,
        logger=logger,
        notifier=notifier
    )
