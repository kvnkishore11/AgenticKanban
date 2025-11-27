"""ADW initialization utilities for patch workflow."""

import sys
import os
from typing import Optional, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.workflow_ops import ensure_adw_id
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.kanban_mode import is_kanban_mode

from .types import PatchInitContext


def parse_cli_arguments(args: List[str]) -> tuple[str, Optional[str]]:
    """Parse command line arguments for patch workflow.

    Args:
        args: Command line arguments (sys.argv)

    Returns:
        Tuple of (issue_number, optional_adw_id)

    Raises:
        SystemExit: If required arguments are missing
    """
    if len(args) < 2:
        print("Usage: uv run adw_patch_iso.py <issue-number> [adw-id]")
        sys.exit(1)

    issue_number = args[1]
    adw_id = args[2] if len(args) > 2 else None

    return issue_number, adw_id


def initialize_patch_workflow(
    args: List[str],
    workflow_name: str = "adw_patch_iso"
) -> PatchInitContext:
    """Initialize patch workflow with environment, state, logger, and notifier.

    Handles:
    - Command line argument parsing
    - ADW ID creation/lookup via ensure_adw_id()
    - State loading and initialization
    - Logger setup
    - WebSocket notifier initialization
    - Tracking workflow in all_adws
    - Environment variable validation

    Args:
        args: Command line arguments (sys.argv)
        workflow_name: Name of workflow for logging

    Returns:
        PatchInitContext with all initialized components

    Raises:
        SystemExit: If required arguments are missing
    """
    # Parse arguments
    issue_number, adw_id_arg = parse_cli_arguments(args)

    # Setup temp logger for ensure_adw_id
    temp_logger = setup_logger(adw_id_arg, workflow_name) if adw_id_arg else None

    # Get or create ADW ID
    adw_id = ensure_adw_id(issue_number, adw_id_arg, temp_logger)

    # Load state
    state = ADWState.load(adw_id, temp_logger)

    # Ensure state has the adw_id field
    if not state.get("adw_id"):
        state.update(adw_id=adw_id)

    # Track workflow in all_adws
    state.append_adw_id(workflow_name)

    # Setup logger with ADW ID
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"{workflow_name} starting - ID: {adw_id}, Issue: {issue_number}")

    # Validate environment
    check_env_vars(logger)

    # Initialize WebSocket notifier for real-time updates
    notifier = WebSocketNotifier(adw_id)
    notifier.notify_start(workflow_name, f"Starting isolated patch workflow for issue #{issue_number}")

    # Log mode status
    in_kanban_mode = is_kanban_mode(state)
    if in_kanban_mode:
        logger.info("Operating in kanban mode")
    else:
        logger.info("Operating in GitHub mode")

    return PatchInitContext(
        issue_number=issue_number,
        adw_id=adw_id,
        state=state,
        logger=logger,
        notifier=notifier
    )
