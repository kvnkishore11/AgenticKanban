"""Worktree management utilities for plan workflow."""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.worktree_ops import (
    create_worktree,
    validate_worktree,
    get_ports_for_adw,
    is_port_available,
    find_next_available_ports,
    setup_worktree_environment,
)
from adw_modules.workflow_ops import format_issue_message
from adw_modules.github import make_issue_comment_safe
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template

from .types import WorktreeContext


def setup_worktree(
    adw_id: str,
    state: ADWState,
    skip_worktree: bool,
    logger: logging.Logger
) -> WorktreeContext:
    """Check existing worktree or prepare for creation.

    Does NOT create the worktree - just validates existing and allocates ports.
    Worktree creation happens after branch name is generated via create_worktree_env().

    Args:
        adw_id: ADW identifier
        state: ADW state object
        skip_worktree: Whether to skip worktree operations (git not available)
        logger: Logger instance

    Returns:
        WorktreeContext with ports and validation status
    """
    if skip_worktree:
        # Still allocate ports for consistency
        websocket_port, frontend_port = get_ports_for_adw(adw_id)
        state.update(websocket_port=websocket_port, frontend_port=frontend_port)
        state.save("adw_plan_iso")

        return WorktreeContext(
            worktree_path=None,
            websocket_port=websocket_port,
            frontend_port=frontend_port,
            is_valid=False
        )

    # Check if worktree already exists
    valid, error = validate_worktree(adw_id, state)

    if valid:
        logger.info(f"Using existing worktree for {adw_id}")
        return WorktreeContext(
            worktree_path=state.get("worktree_path"),
            websocket_port=state.get("websocket_port"),
            frontend_port=state.get("frontend_port"),
            is_valid=True
        )

    # Allocate ports for this instance
    websocket_port, frontend_port = get_ports_for_adw(adw_id)

    # Check port availability
    if not (is_port_available(websocket_port) and is_port_available(frontend_port)):
        logger.warning(f"Deterministic ports {websocket_port}/{frontend_port} are in use, finding alternatives")
        websocket_port, frontend_port = find_next_available_ports(adw_id)

    logger.info(f"Allocated ports - WebSocket: {websocket_port}, Frontend: {frontend_port}")
    state.update(websocket_port=websocket_port, frontend_port=frontend_port)
    state.save("adw_plan_iso")

    return WorktreeContext(
        worktree_path=None,
        websocket_port=websocket_port,
        frontend_port=frontend_port,
        is_valid=False
    )


def create_worktree_env(
    adw_id: str,
    branch_name: str,
    ctx: WorktreeContext,
    state: ADWState,
    notifier: WebSocketNotifier,
    issue_number: str,
    logger: logging.Logger
) -> str:
    """Create worktree and set up environment with ports.

    Args:
        adw_id: ADW identifier
        branch_name: Branch name for the worktree
        ctx: WorktreeContext from setup_worktree()
        state: ADW state object
        notifier: WebSocket notifier
        issue_number: Issue number for comments
        logger: Logger instance

    Returns:
        Path to created worktree

    Raises:
        SystemExit: If worktree creation fails
    """
    notifier.notify_progress("adw_plan_iso", 40, "Setting up worktree", "Creating isolated worktree environment")
    logger.info(f"Creating worktree for {adw_id}")

    worktree_path, error = create_worktree(adw_id, branch_name, logger)

    if error:
        logger.error(f"Error creating worktree: {error}")
        notifier.notify_error("adw_plan_iso", f"Error creating worktree: {error}", "Setting up worktree")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"Error creating worktree: {error}"),
            state
        )
        sys.exit(1)

    state.update(worktree_path=worktree_path)
    state.save("adw_plan_iso")
    logger.info(f"Created worktree at {worktree_path}")
    notifier.notify_log("adw_plan_iso", f"Worktree created at {worktree_path}", "SUCCESS")

    # Setup worktree environment (create .ports.env)
    setup_worktree_environment(worktree_path, ctx.websocket_port, ctx.frontend_port, logger)

    # Run install_worktree command to set up the isolated environment
    logger.info("Setting up isolated environment with custom ports")
    notifier.notify_log("adw_plan_iso", f"Setting up environment (ports: WebSocket {ctx.websocket_port}/Frontend {ctx.frontend_port})", "INFO")

    install_request = AgentTemplateRequest(
        agent_name="ops",
        slash_command="/install_worktree",
        args=[worktree_path, str(ctx.websocket_port), str(ctx.frontend_port)],
        adw_id=adw_id,
        working_dir=worktree_path,
    )

    install_response = execute_template(install_request)

    if not install_response.success:
        logger.error(f"Error setting up worktree: {install_response.output}")
        notifier.notify_error("adw_plan_iso", f"Error setting up worktree: {install_response.output}", "Setting up worktree")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"Error setting up worktree: {install_response.output}"),
            state
        )
        sys.exit(1)

    logger.info("Worktree environment setup complete")
    notifier.notify_log("adw_plan_iso", "Worktree environment ready", "SUCCESS")

    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, "ops", f"Working in isolated worktree: {worktree_path}\n"
                           f"Ports - WebSocket: {ctx.websocket_port}, Frontend: {ctx.frontend_port}"),
        state
    )

    return worktree_path
