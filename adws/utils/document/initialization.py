"""ADW initialization utilities for document workflow."""

import sys
import os
import json
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.worktree_ops import validate_worktree
from adw_modules.workflow_ops import format_issue_message
from adw_modules.github import make_issue_comment

from .types import DocumentInitContext


def parse_cli_arguments(args: List[str]) -> tuple[str, str]:
    """Parse command line arguments for document workflow.

    Args:
        args: Command line arguments (sys.argv)

    Returns:
        Tuple of (issue_number, adw_id)

    Raises:
        SystemExit: If required arguments are missing
    """
    if len(args) < 3:
        print("Usage: uv run adw_document_iso.py <issue-number> <adw-id>")
        print("\nError: adw-id is required to locate the worktree")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree")
        sys.exit(1)

    issue_number = args[1]
    adw_id = args[2]

    return issue_number, adw_id


def initialize_document_workflow(
    args: List[str],
    workflow_name: str = "adw_document_iso"
) -> DocumentInitContext:
    """Initialize document workflow with environment, state, logger, and notifier.

    Handles:
    - Command line argument parsing
    - State loading and validation
    - Worktree validation
    - Logger setup
    - WebSocket notifier initialization
    - Tracking workflow in all_adws
    - Environment variable validation

    Args:
        args: Command line arguments (sys.argv)
        workflow_name: Name of workflow for logging

    Returns:
        DocumentInitContext with all initialized components

    Raises:
        SystemExit: If required arguments are missing or worktree is invalid
    """
    # Parse arguments
    issue_number, adw_id = parse_cli_arguments(args)

    # Try to load existing state
    temp_logger = setup_logger(adw_id, workflow_name)
    state = ADWState.load(adw_id, temp_logger)

    if state:
        # Found existing state - use the issue number from state if available
        issue_number = state.get("issue_number", issue_number)
        make_issue_comment(
            issue_number,
            f"{adw_id}_ops: 🔍 Found existing state - starting isolated documentation\n```json\n{json.dumps(state.data, indent=2)}\n```",
        )
    else:
        # No existing state found
        logger = setup_logger(adw_id, workflow_name)
        logger.error(f"No state found for ADW ID: {adw_id}")
        logger.error(
            "Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state"
        )
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print(
            "Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state"
        )
        sys.exit(1)

    # Track that this ADW workflow has run
    state.append_adw_id(workflow_name)

    # Set up logger with ADW ID from command line
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"ADW Document Iso starting - ID: {adw_id}, Issue: {issue_number}")

    # Validate environment
    check_env_vars(logger)

    # Validate worktree exists
    valid, error = validate_worktree(adw_id, state)
    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"❌ Worktree validation failed: {error}\n"
                "Run adw_plan_iso.py or adw_patch_iso.py first",
            ),
        )
        sys.exit(1)

    # Get worktree path for explicit context
    worktree_path = state.get("worktree_path")
    logger.info(f"Using worktree at: {worktree_path}")

    # Get port information for display
    websocket_port = state.get("websocket_port", "9100")
    frontend_port = state.get("frontend_port", "9200")

    # Initialize WebSocket notifier for real-time updates
    notifier = WebSocketNotifier(adw_id)
    notifier.notify_start(
        workflow_name,
        f"Starting isolated documentation phase for issue #{issue_number}"
    )

    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            "ops",
            f"✅ Starting isolated documentation phase\n"
            f"🏠 Worktree: {worktree_path}\n"
            f"🔌 Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}",
        ),
    )

    return DocumentInitContext(
        issue_number=issue_number,
        adw_id=adw_id,
        state=state,
        logger=logger,
        notifier=notifier,
        worktree_path=worktree_path
    )
