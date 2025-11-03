#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Plan Iso - AI Developer Workflow for agentic planning in isolated worktrees

Usage:
  uv run adw_plan_iso.py <issue-number> [adw-id]

Workflow:
1. Fetch GitHub issue details
2. Check/create worktree for isolated execution
3. Allocate unique ports for services
4. Setup worktree environment
5. Classify issue type (/chore, /bug, /feature)
6. Create feature branch in worktree
7. Generate implementation plan in worktree
8. Commit plan in worktree
9. Push and create/update PR

This workflow creates an isolated git worktree under trees/<adw_id>/ for
parallel execution without interference.
"""

import sys
import os
import json
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import (
    fetch_issue_safe,
    make_issue_comment_safe,
    get_repo_url,
    extract_repo_path,
)
from adw_modules.kanban_mode import (
    is_kanban_mode,
    log_mode_status,
    should_skip_worktree_operations,
)
from adw_modules.workflow_ops import (
    classify_issue,
    build_plan,
    generate_branch_name,
    create_commit,
    format_issue_message,
    ensure_adw_id,
    AGENT_PLANNER,
)
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template
from adw_modules.worktree_ops import (
    create_worktree,
    validate_worktree,
    get_ports_for_adw,
    is_port_available,
    find_next_available_ports,
    setup_worktree_environment,
)
from adw_modules.websocket_client import WebSocketNotifier




def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_plan_iso.py <issue-number> [adw-id]")
        sys.exit(1)

    issue_number = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else None

    # Ensure ADW ID exists with initialized state
    temp_logger = setup_logger(adw_id, "adw_plan_iso") if adw_id else None
    adw_id = ensure_adw_id(issue_number, adw_id, temp_logger)

    # Load the state that was created/found by ensure_adw_id
    state = ADWState.load(adw_id, temp_logger)

    # Ensure state has the adw_id field
    if not state.get("adw_id"):
        state.update(adw_id=adw_id)
    
    # Track that this ADW workflow has run
    state.append_adw_id("adw_plan_iso")

    # Set up logger with ADW ID
    logger = setup_logger(adw_id, "adw_plan_iso")
    logger.info(f"ADW Plan Iso starting - ID: {adw_id}, Issue: {issue_number}")

    # Initialize WebSocket notifier for real-time updates
    notifier = WebSocketNotifier(adw_id)
    notifier.notify_start("adw_plan_iso", f"Starting planning workflow for issue #{issue_number}")

    # Log the current operation mode
    log_mode_status(state, logger)

    # Validate environment (skip GitHub checks if in kanban mode)
    if not is_kanban_mode(state):
        check_env_vars(logger)
    else:
        logger.info("Skipping environment validation - kanban mode enabled")

    # Get repo information (gracefully handle kanban mode)
    github_repo_url = get_repo_url()
    extract_repo_path(github_repo_url)

    if github_repo_url is None and not is_kanban_mode(state):
        logger.error("No git repository available and not in kanban mode")
        sys.exit(1)
    elif github_repo_url is None:
        logger.info("No git repository available - continuing in kanban mode")

    # Check if worktree operations should be skipped (git not available)
    skip_worktree = should_skip_worktree_operations(state)

    if skip_worktree:
        logger.info("Skipping worktree operations - git not available")
        # Still allocate ports for consistency
        websocket_port, frontend_port = get_ports_for_adw(adw_id)
        state.update(websocket_port=websocket_port, frontend_port=frontend_port)
        state.save("adw_plan_iso")
        worktree_path = None
    else:
        # Check if worktree already exists
        valid, error = validate_worktree(adw_id, state)
        if valid:
            logger.info(f"Using existing worktree for {adw_id}")
            worktree_path = state.get("worktree_path")
            websocket_port = state.get("websocket_port")
            frontend_port = state.get("frontend_port")
        else:
            # Allocate ports for this instance
            websocket_port, frontend_port = get_ports_for_adw(adw_id)

            # Check port availability
            if not (is_port_available(websocket_port) and is_port_available(frontend_port)):
                logger.warning(f"Deterministic ports {websocket_port}/{frontend_port} are in use, finding alternatives")
                websocket_port, frontend_port = find_next_available_ports(adw_id)

            logger.info(f"Allocated ports - WebSocket: {websocket_port}, Frontend: {frontend_port}")
            state.update(websocket_port=websocket_port, frontend_port=frontend_port)
            state.save("adw_plan_iso")

    # Fetch issue details (kanban-aware)
    notifier.notify_progress("adw_plan_iso", 10, "Fetching issue details", "Retrieving issue information from GitHub or kanban")
    issue = fetch_issue_safe(issue_number, state)
    if issue is None:
        logger.error("Could not fetch issue data from GitHub or kanban source")
        notifier.notify_error("adw_plan_iso", "Failed to fetch issue data", "Fetching issue")
        sys.exit(1)

    logger.debug(f"Fetched issue: {issue.model_dump_json(indent=2, by_alias=True)}")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, "ops", "✅ Starting isolated planning phase"), state
    )

    make_issue_comment_safe(
        issue_number,
        f"{adw_id}_ops: 🔍 Using state\n```json\n{json.dumps(state.data, indent=2)}\n```",
        state,
    )

    # Check if issue type is already provided from kanban (bypass GitHub classification)
    notifier.notify_progress("adw_plan_iso", 20, "Classifying issue", "Determining issue type (feature/bug/chore)")
    existing_issue_class = state.get("issue_class")
    if existing_issue_class:
        # Issue type was provided by kanban via WebSocket trigger
        issue_command = existing_issue_class
        logger.info(f"Using kanban-provided issue type: {issue_command}")
        notifier.notify_log("adw_plan_iso", f"Using kanban-provided issue type: {issue_command}", "INFO")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"✅ Using kanban-provided issue type: {issue_command}"),
            state,
        )
    else:
        # Fallback to GitHub issue classification
        logger.info("No issue type provided by kanban, classifying GitHub issue")
        notifier.notify_log("adw_plan_iso", "Classifying GitHub issue type", "INFO")
        issue_command, error = classify_issue(issue, adw_id, logger)

        if error:
            logger.error(f"Error classifying issue: {error}")
            notifier.notify_error("adw_plan_iso", f"Error classifying issue: {error}", "Classifying issue")
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, "ops", f"❌ Error classifying issue: {error}"),
                state,
            )
            sys.exit(1)

        state.update(issue_class=issue_command)
        state.save("adw_plan_iso")
        logger.info(f"Issue classified as: {issue_command}")
        notifier.notify_log("adw_plan_iso", f"Issue classified as: {issue_command}", "SUCCESS")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"✅ Issue classified as: {issue_command}"),
            state,
        )

    # Generate branch name
    notifier.notify_progress("adw_plan_iso", 30, "Generating branch", "Creating branch name for isolated worktree")
    branch_name, error = generate_branch_name(issue, issue_command, adw_id, logger)

    if error:
        logger.error(f"Error generating branch name: {error}")
        notifier.notify_error("adw_plan_iso", f"Error generating branch name: {error}", "Generating branch")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, "ops", f"❌ Error generating branch name: {error}"
            ),
        )
        sys.exit(1)

    # Don't create branch here - let worktree create it
    # The worktree command will create the branch when we specify -b
    state.update(branch_name=branch_name)
    state.save("adw_plan_iso")
    logger.info(f"Will create branch in worktree: {branch_name}")
    notifier.notify_log("adw_plan_iso", f"Branch: {branch_name}", "INFO")

    # Create worktree if it doesn't exist
    if not valid:
        notifier.notify_progress("adw_plan_iso", 40, "Setting up worktree", "Creating isolated worktree environment")
        logger.info(f"Creating worktree for {adw_id}")
        worktree_path, error = create_worktree(adw_id, branch_name, logger)

        if error:
            logger.error(f"Error creating worktree: {error}")
            notifier.notify_error("adw_plan_iso", f"Error creating worktree: {error}", "Setting up worktree")
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, "ops", f"❌ Error creating worktree: {error}"),
            )
            sys.exit(1)

        state.update(worktree_path=worktree_path)
        state.save("adw_plan_iso")
        logger.info(f"Created worktree at {worktree_path}")
        notifier.notify_log("adw_plan_iso", f"Worktree created at {worktree_path}", "SUCCESS")

        # Setup worktree environment (create .ports.env)
        setup_worktree_environment(worktree_path, websocket_port, frontend_port, logger)

        # Run install_worktree command to set up the isolated environment
        logger.info("Setting up isolated environment with custom ports")
        notifier.notify_log("adw_plan_iso", f"Setting up environment (ports: WebSocket {websocket_port}/Frontend {frontend_port})", "INFO")
        install_request = AgentTemplateRequest(
            agent_name="ops",
            slash_command="/install_worktree",
            args=[worktree_path, str(websocket_port), str(frontend_port)],
            adw_id=adw_id,
            working_dir=worktree_path,  # Execute in worktree
        )

        install_response = execute_template(install_request)
        if not install_response.success:
            logger.error(f"Error setting up worktree: {install_response.output}")
            notifier.notify_error("adw_plan_iso", f"Error setting up worktree: {install_response.output}", "Setting up worktree")
            make_issue_comment_safe(
                issue_number,
                format_issue_message(adw_id, "ops", f"❌ Error setting up worktree: {install_response.output}"),
            )
            sys.exit(1)

        logger.info("Worktree environment setup complete")
        notifier.notify_log("adw_plan_iso", "Worktree environment ready", "SUCCESS")

    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, "ops", f"✅ Working in isolated worktree: {worktree_path}\n"
                           f"🔌 Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}"),
    )

    # Build the implementation plan (now executing in worktree)
    notifier.notify_progress("adw_plan_iso", 60, "Creating plan", "Building implementation plan using AI agent")
    logger.info("Building implementation plan in worktree")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, AGENT_PLANNER, "✅ Building implementation plan in isolated environment"),
    )

    plan_response = build_plan(issue, issue_command, adw_id, logger, working_dir=worktree_path)

    if not plan_response.success:
        logger.error(f"Error building plan: {plan_response.output}")
        notifier.notify_error("adw_plan_iso", f"Error building plan: {plan_response.output}", "Creating plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"❌ Error building plan: {plan_response.output}"
            ),
        )
        sys.exit(1)

    logger.debug(f"Plan response: {plan_response.output}")
    notifier.notify_log("adw_plan_iso", "Implementation plan created successfully", "SUCCESS")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, AGENT_PLANNER, "✅ Implementation plan created"),
    )

    # Get the plan file path directly from response
    logger.info("Getting plan file path")
    plan_file_path = plan_response.output.strip()
    
    # Validate the path exists (within worktree)
    if not plan_file_path:
        error = "No plan file path returned from planning agent"
        logger.error(error)
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"❌ {error}"),
        )
        sys.exit(1)
    
    # Check if file exists in worktree
    worktree_plan_path = os.path.join(worktree_path, plan_file_path)
    if not os.path.exists(worktree_plan_path):
        error = f"Plan file does not exist in worktree: {plan_file_path}"
        logger.error(error)
        make_issue_comment_safe(
            issue_number,
            format_issue_message(adw_id, "ops", f"❌ {error}"),
        )
        sys.exit(1)

    state.update(plan_file=plan_file_path)
    state.save("adw_plan_iso")
    logger.info(f"Plan file created: {plan_file_path}")
    make_issue_comment_safe(
        issue_number,
        format_issue_message(adw_id, "ops", f"✅ Plan file created: {plan_file_path}"),
    )

    # Create commit message
    notifier.notify_progress("adw_plan_iso", 80, "Committing plan", "Creating git commit for implementation plan")
    logger.info("Creating plan commit")
    commit_msg, error = create_commit(
        AGENT_PLANNER, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        notifier.notify_error("adw_plan_iso", f"Error creating commit message: {error}", "Committing plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"❌ Error creating commit message: {error}"
            ),
        )
        sys.exit(1)

    # Commit the plan (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing plan: {error}")
        notifier.notify_error("adw_plan_iso", f"Error committing plan: {error}", "Committing plan")
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PLANNER, f"❌ Error committing plan: {error}"
            ),
        )
        sys.exit(1)

    logger.info(f"Committed plan: {commit_msg}")
    notifier.notify_log("adw_plan_iso", "Plan committed to git", "SUCCESS")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, AGENT_PLANNER, "✅ Plan committed")
    )

    # Finalize git operations (push and PR)
    # Note: This will work from the worktree context
    notifier.notify_progress("adw_plan_iso", 90, "Finalizing", "Pushing changes and creating/updating PR")
    finalize_git_operations(state, logger, cwd=worktree_path)

    logger.info("Isolated planning phase completed successfully")
    notifier.notify_complete("adw_plan_iso", "Planning workflow completed successfully", "Complete")
    make_issue_comment_safe(
        issue_number, format_issue_message(adw_id, "ops", "✅ Isolated planning phase completed")
    )

    # Save final state
    state.save("adw_plan_iso")
    
    # Post final state summary to issue
    make_issue_comment_safe(
        issue_number,
        f"{adw_id}_ops: 📋 Final planning state:\n```json\n{json.dumps(state.data, indent=2)}\n```"
    )


if __name__ == "__main__":
    main()