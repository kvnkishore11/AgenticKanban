"""Worktree setup utilities for patch workflow."""

import sys
import os
import json
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message
from adw_modules.worktree_ops import (
    create_worktree,
    get_ports_for_adw,
    is_port_available,
    find_next_available_ports,
    setup_worktree_environment,
)
from adw_modules.websocket_client import WebSocketNotifier

from .types import PatchWorktreeContext


def setup_patch_worktree(
    adw_id: str,
    branch_name: str,
    issue_number: str,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> PatchWorktreeContext:
    """Setup or validate existing worktree for patch workflow.

    Steps:
    1. Check if worktree already exists in state
    2. If not, create new worktree
    3. Allocate ports (deterministic or fallback)
    4. Setup worktree environment

    Args:
        adw_id: ADW workflow ID
        branch_name: Branch name for worktree
        issue_number: The issue number
        state: ADW state object
        notifier: WebSocket notifier for real-time updates
        logger: Logger instance

    Returns:
        PatchWorktreeContext with worktree path and ports

    Raises:
        SystemExit: If worktree creation fails
    """
    # Check if worktree already exists
    worktree_path = state.get("worktree_path")
    if worktree_path and os.path.exists(worktree_path):
        logger.info(f"Using existing worktree: {worktree_path}")
        websocket_port = state.get("websocket_port", 9100)
        frontend_port = state.get("frontend_port", 9200)

        _notify_worktree_info(
            issue_number, adw_id, worktree_path, websocket_port, frontend_port,
            state, notifier, logger
        )

        return PatchWorktreeContext(
            worktree_path=worktree_path,
            websocket_port=websocket_port,
            frontend_port=frontend_port,
            is_existing=True
        )

    # Create isolated worktree
    logger.info("Creating isolated worktree")
    worktree_path, error = create_worktree(adw_id, branch_name, logger)

    if error:
        logger.error(f"Error creating worktree: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(adw_id, "ops", f"Error creating worktree: {error}"),
        )
        sys.exit(1)

    # Get deterministic ports for this ADW ID
    websocket_port, frontend_port = get_ports_for_adw(adw_id)

    # Check if ports are available, find alternatives if not
    if not is_port_available(websocket_port) or not is_port_available(frontend_port):
        logger.warning(
            f"Preferred ports {websocket_port}/{frontend_port} not available, finding alternatives"
        )
        websocket_port, frontend_port = find_next_available_ports(adw_id)

    logger.info(f"Allocated ports - WebSocket: {websocket_port}, Frontend: {frontend_port}")

    # Set up worktree environment (copy files, create .ports.env)
    setup_worktree_environment(worktree_path, websocket_port, frontend_port, logger)

    # Update state with worktree info
    state.update(
        worktree_path=worktree_path,
        websocket_port=websocket_port,
        frontend_port=frontend_port,
    )
    state.save("adw_patch_iso")

    _notify_worktree_info(
        issue_number, adw_id, worktree_path, websocket_port, frontend_port,
        state, notifier, logger
    )

    return PatchWorktreeContext(
        worktree_path=worktree_path,
        websocket_port=websocket_port,
        frontend_port=frontend_port,
        is_existing=False
    )


def _notify_worktree_info(
    issue_number: str,
    adw_id: str,
    worktree_path: str,
    websocket_port: int,
    frontend_port: int,
    state: ADWState,
    notifier: WebSocketNotifier,
    logger: logging.Logger
) -> None:
    """Post worktree information to issue and notifier."""
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            "ops",
            f"Using isolated worktree\n"
            f"Path: {worktree_path}\n"
            f"Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}",
        ),
    )
    notifier.notify_log(
        "ops", "info",
        f"Worktree: {worktree_path}, Ports: {websocket_port}/{frontend_port}"
    )

    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: Using state\n```json\n{json.dumps(state.data, indent=2)}\n```",
    )
