"""Merge workflow initialization utilities."""

import sys
import os
import logging
from typing import List, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.websocket_client import WebSocketNotifier

from .types import MergeInitContext


# Agent name constant
AGENT_MERGER = "merger"


def parse_cli_arguments(args: List[str]) -> Tuple[str, str]:
    """Parse command line arguments for merge workflow.

    Args:
        args: Command line arguments (sys.argv)

    Returns:
        Tuple of (adw_id, merge_method)

    Raises:
        SystemExit: If required arguments are missing or invalid
    """
    if len(args) < 2:
        print("Usage: uv run adw_merge_iso.py <adw-id> [merge-method]")
        print("\nArguments:")
        print("  adw-id: The ADW ID of the worktree to merge (required)")
        print("  merge-method: Merge strategy (default: 'squash-rebase')")
        print("    - squash-rebase: Rebase feature branch onto main, then squash (cleanest)")
        print("    - squash: Squash all commits into one")
        print("    - merge: Regular merge with merge commit")
        print("    - rebase: Rebase commits onto main")
        print("\nExample:")
        print("  uv run adw_merge_iso.py a1b2c3d4 squash-rebase")
        sys.exit(1)

    adw_id = args[1]
    merge_method = args[2] if len(args) > 2 else "squash-rebase"

    # Validate merge method
    valid_methods = ["squash", "merge", "rebase", "squash-rebase"]
    if merge_method not in valid_methods:
        print(f"Error: Invalid merge method '{merge_method}'")
        print(f"Valid options: {', '.join(valid_methods)}")
        sys.exit(1)

    return adw_id, merge_method


def initialize_merge_workflow(
    args: List[str],
    workflow_name: str = "adw_merge_iso"
) -> MergeInitContext:
    """Initialize merge workflow with environment, state, logger, and notifier.

    Args:
        args: Command line arguments (sys.argv)
        workflow_name: Name of the workflow for logging

    Returns:
        MergeInitContext containing all initialized components

    Raises:
        SystemExit: If state not found or required data missing
    """
    # Parse CLI arguments
    adw_id, merge_method = parse_cli_arguments(args)

    # Set up logger
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"ADW Merge ISO starting - ID: {adw_id}, Method: {merge_method}")

    # Validate environment
    check_env_vars(logger)

    # Load existing state
    state = ADWState.load(adw_id, logger)
    if not state:
        logger.error(f"No state found for ADW ID: {adw_id}")
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print("The worktree must have been created by an ADW workflow")
        sys.exit(1)

    # Get branch name from state
    branch_name = state.get("branch_name")
    if not branch_name:
        logger.error("No branch name found in state")
        print("\nError: No branch name found in state")
        sys.exit(1)

    # Get worktree path from state
    worktree_path = state.get("worktree_path")

    # Get issue number if available (optional)
    issue_number = state.get("issue_number")

    # Setup WebSocket notifier
    notifier = WebSocketNotifier(adw_id)

    return MergeInitContext(
        adw_id=adw_id,
        merge_method=merge_method,
        state=state,
        logger=logger,
        notifier=notifier,
        issue_number=issue_number,
        branch_name=branch_name,
        worktree_path=worktree_path,
    )


def get_main_repo_root() -> str:
    """Get the main repository root directory (parent of adws).

    Path: utils/merge/initialization.py -> utils/merge -> utils -> adws -> repo_root
    """
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
