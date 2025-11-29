"""ADW initialization utilities for review workflow."""

import sys
import os
import json
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.github import make_issue_comment
from adw_modules.worktree_ops import validate_worktree
from adw_modules.workflow_ops import format_issue_message, find_spec_file

from .types import ReviewInitContext, ReviewSpecContext


def parse_cli_arguments(args: List[str]) -> tuple[str, str, bool]:
    """Parse command line arguments for review workflow.

    Args:
        args: Command line arguments (sys.argv)

    Returns:
        Tuple of (issue_number, adw_id, skip_resolution)

    Raises:
        SystemExit: If required arguments are missing
    """
    # Check for --skip-resolution flag
    skip_resolution = "--skip-resolution" in args
    if skip_resolution:
        args = [arg for arg in args if arg != "--skip-resolution"]

    if len(args) < 3:
        print("Usage: uv run adw_review_iso.py <issue-number> <adw-id> [--skip-resolution]")
        print("\nError: adw-id is required to locate the worktree")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree")
        sys.exit(1)

    issue_number = args[1]
    adw_id = args[2]

    return issue_number, adw_id, skip_resolution


def initialize_review_workflow(
    args: List[str],
    workflow_name: str = "adw_review_iso"
) -> ReviewInitContext:
    """Initialize review workflow with environment, state, and logger.

    Handles:
    - Command line argument parsing
    - State loading and validation
    - Logger setup
    - Worktree validation
    - Environment variable validation
    - GitHub comment notifications

    Args:
        args: Command line arguments (sys.argv)
        workflow_name: Name of workflow for logging

    Returns:
        ReviewInitContext with all initialized components

    Raises:
        SystemExit: If required arguments are missing or state/worktree invalid
    """
    # Parse arguments
    issue_number, adw_id, skip_resolution = parse_cli_arguments(args)

    # Try to load existing state
    temp_logger = setup_logger(adw_id, workflow_name)
    state = ADWState.load(adw_id, temp_logger)

    if state:
        # Found existing state - use the issue number from state if available
        issue_number = state.get("issue_number", issue_number)
        make_issue_comment(
            issue_number,
            f"{adw_id}_ops: 🔍 Found existing state - starting isolated review\n```json\n{json.dumps(state.data, indent=2)}\n```"
        )
    else:
        # No existing state found
        logger = setup_logger(adw_id, workflow_name)
        logger.error(f"No state found for ADW ID: {adw_id}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state")
        print(f"\nError: No state found for ADW ID: {adw_id}")
        print("Run adw_plan_iso.py or adw_patch_iso.py first to create the worktree and state")
        sys.exit(1)

    # Track that this ADW workflow has run
    state.append_adw_id(workflow_name)

    # Set up logger with ADW ID from command line
    logger = setup_logger(adw_id, workflow_name)
    logger.info(f"ADW Review Iso starting - ID: {adw_id}, Issue: {issue_number}, Skip Resolution: {skip_resolution}")

    # Validate environment
    check_env_vars(logger)

    # Validate worktree exists
    valid, error = validate_worktree(adw_id, state)
    if not valid:
        logger.error(f"Worktree validation failed: {error}")
        logger.error("Run adw_plan_iso.py or adw_patch_iso.py first")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"❌ Worktree validation failed: {error}\n"
                               "Run adw_plan_iso.py or adw_patch_iso.py first")
        )
        sys.exit(1)

    # Get worktree path for explicit context
    worktree_path = state.get("worktree_path")
    logger.info(f"Using worktree at: {worktree_path}")

    # Get port information for display
    websocket_port = state.get("websocket_port", "9100")
    frontend_port = state.get("frontend_port", "9200")

    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", f"✅ Starting isolated review phase\n"
                           f"🏠 Worktree: {worktree_path}\n"
                           f"🔌 Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}\n"
                           f"🔧 Issue Resolution: {'Disabled' if skip_resolution else 'Enabled'}")
    )

    return ReviewInitContext(
        issue_number=issue_number,
        adw_id=adw_id,
        state=state,
        logger=logger,
        skip_resolution=skip_resolution
    )


def find_and_validate_spec(ctx: ReviewInitContext) -> ReviewSpecContext:
    """Find spec file from worktree and validate it exists.

    Args:
        ctx: Review initialization context

    Returns:
        ReviewSpecContext with spec file path and worktree path

    Raises:
        SystemExit: If spec file cannot be found
    """
    ctx.logger.info("Looking for spec file in worktree")
    spec_file = find_spec_file(ctx.state, ctx.logger)

    if not spec_file:
        error_msg = "Could not find spec file for review"
        ctx.logger.error(error_msg)
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(ctx.adw_id, "ops", f"❌ {error_msg}")
        )
        sys.exit(1)

    ctx.logger.info(f"Found spec file: {spec_file}")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(ctx.adw_id, "ops", f"📋 Found spec file: {spec_file}")
    )

    worktree_path = ctx.state.get("worktree_path")

    return ReviewSpecContext(
        spec_file=spec_file,
        worktree_path=worktree_path
    )
