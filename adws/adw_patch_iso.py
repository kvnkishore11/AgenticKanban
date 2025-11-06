#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Patch Isolated - AI Developer Workflow for single-issue patches with worktree isolation

Usage:
  uv run adw_patch_iso.py <issue-number> [adw-id]

Workflow:
1. Create/validate isolated worktree
2. Allocate dedicated ports (9100-9114 backend, 9200-9214 frontend)
3. Fetch issue details (GitHub or Kanban)
4. Extract patch content based on mode:
   - GitHub mode: Requires 'adw_patch' keyword in comments or issue body
   - Kanban mode: Uses task description and metadata
5. Create patch plan based on extracted content
6. Implement the patch plan
7. Commit changes
8. Push and create/update PR

Dual-mode operation:
- GitHub mode: Requires 'adw_patch' keyword in comment or issue body
- Kanban mode: Uses task data from state (no keyword required)

Key features:
- Runs in isolated git worktree under trees/<adw_id>/
- Uses dedicated ports to avoid conflicts
- Passes working_dir to all agent and git operations
- Enables parallel execution of multiple patches
- Supports both GitHub and Kanban data sources
"""

import sys
import os
import json
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import (
    fetch_issue_safe,
    make_issue_comment,
    get_repo_url,
    extract_repo_path,
)
from adw_modules.workflow_ops import (
    create_commit,
    format_issue_message,
    ensure_adw_id,
    create_and_implement_patch,
)
from adw_modules.worktree_ops import (
    create_worktree,
    get_ports_for_adw,
    is_port_available,
    find_next_available_ports,
    setup_worktree_environment,
)
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.patch_content_extractor import get_patch_content
from adw_modules.kanban_mode import (
    is_kanban_mode,
    get_next_patch_number,
    add_patch_to_history,
    get_patch_reason_from_kanban,
)

# Agent name constants
AGENT_PATCH_PLANNER = "patch_planner"
AGENT_PATCH_IMPLEMENTOR = "patch_implementor"




def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_patch_iso.py <issue-number> [adw-id]")
        sys.exit(1)

    issue_number = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else None

    # Ensure ADW ID exists with initialized state
    temp_logger = setup_logger(adw_id, "adw_patch_iso") if adw_id else None
    adw_id = ensure_adw_id(issue_number, adw_id, temp_logger)

    # Load the state that was created/found by ensure_adw_id
    state = ADWState.load(adw_id, temp_logger)

    # Ensure state has the adw_id field
    if not state.get("adw_id"):
        state.update(adw_id=adw_id)

    # Track that this ADW workflow has run
    state.append_adw_id("adw_patch_iso")

    # Set up logger with ADW ID
    logger = setup_logger(adw_id, "adw_patch_iso")
    logger.info(f"ADW Patch Isolated starting - ID: {adw_id}, Issue: {issue_number}")

    # Validate environment
    check_env_vars(logger)

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Fetch issue details
    issue = fetch_issue_safe(issue_number, state)
    if issue is None:
        logger.warning(f"Could not fetch issue #{issue_number} - continuing with fallback")
        # Create a fallback issue object for patch generation
        from adw_modules.data_types import GitHubIssue
        issue = GitHubIssue(
            number=int(issue_number),
            title=f"Issue #{issue_number}",
            body="Issue data unavailable - patch mode",
            state="open",
            author={"login": "unknown"},
            assignees=[],
            labels=[],
            milestone=None,
            comments=[],
            created_at="",
            updated_at="",
            closed_at=None,
            url=f"https://github.com/unknown/repo/issues/{issue_number}"
        )

    logger.debug(f"Fetched issue: {issue.model_dump_json(indent=2, by_alias=True)}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", "✅ Starting isolated patch workflow"),
    )

    # Determine branch name without checking out in main repo
    # 1. Check if branch name is already in state
    branch_name = state.get("branch_name")

    if not branch_name:
        # 2. Look for existing branch without checking it out
        from adw_modules.workflow_ops import find_existing_branch_for_issue

        existing_branch = find_existing_branch_for_issue(issue_number, adw_id)

        if existing_branch:
            logger.info(f"Found existing branch: {existing_branch}")
            branch_name = existing_branch
        else:
            # 3. No existing branch, need to classify and generate name
            logger.info("No existing branch found, creating new one")

            # Check if issue type is already provided from kanban (bypass GitHub classification)
            existing_issue_class = state.get("issue_class")
            if existing_issue_class:
                # Issue type was provided by kanban via WebSocket trigger
                issue_command = existing_issue_class
                logger.info(f"Using kanban-provided issue type: {issue_command}")
                make_issue_comment(
                    issue_number,
                    format_issue_message(adw_id, "ops", f"✅ Using kanban-provided issue type: {issue_command}"),
                )
            else:
                # Fallback to GitHub issue classification
                logger.info("No issue type provided by kanban, classifying GitHub issue")
                from adw_modules.workflow_ops import classify_issue

                issue_command, error = classify_issue(issue, adw_id, logger)
                if error:
                    logger.error(f"Failed to classify issue: {error}")
                    make_issue_comment(
                        issue_number,
                        format_issue_message(
                            adw_id, "ops", f"❌ Failed to classify issue: {error}"
                        ),
                    )
                    sys.exit(1)

                state.update(issue_class=issue_command)

            # Generate branch name
            from adw_modules.workflow_ops import generate_branch_name

            branch_name, error = generate_branch_name(
                issue, issue_command, adw_id, logger
            )
            if error:
                logger.error(f"Error generating branch name: {error}")
                make_issue_comment(
                    issue_number,
                    format_issue_message(
                        adw_id, "ops", f"❌ Error generating branch name: {error}"
                    ),
                )
                sys.exit(1)

    # Update state with branch name
    state.update(branch_name=branch_name)

    # Save state with branch name
    state.save("adw_patch_iso")
    logger.info(f"Working on branch: {branch_name}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", f"✅ Working on branch: {branch_name}"),
    )

    # Check if worktree already exists
    worktree_path = state.get("worktree_path")
    if worktree_path and os.path.exists(worktree_path):
        logger.info(f"Using existing worktree: {worktree_path}")
        websocket_port = state.get("websocket_port", 9100)
        frontend_port = state.get("frontend_port", 9200)
    else:
        # Create isolated worktree
        logger.info("Creating isolated worktree")
        worktree_path, error = create_worktree(adw_id, branch_name, logger)

        if error:
            logger.error(f"Error creating worktree: {error}")
            make_issue_comment(
                issue_number,
                format_issue_message(
                    adw_id, "ops", f"❌ Error creating worktree: {error}"
                ),
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

        logger.info(
            f"Allocated ports - WebSocket: {websocket_port}, Frontend: {frontend_port}"
        )

        # Set up worktree environment (copy files, create .ports.env)
        setup_worktree_environment(worktree_path, websocket_port, frontend_port, logger)

        # Update state with worktree info
        state.update(
            worktree_path=worktree_path,
            websocket_port=websocket_port,
            frontend_port=frontend_port,
        )
        state.save("adw_patch_iso")

    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            "ops",
            f"✅ Using isolated worktree\n"
            f"🏠 Path: {worktree_path}\n"
            f"🔌 Ports - WebSocket: {websocket_port}, Frontend: {frontend_port}",
        ),
    )

    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: 🔍 Using state\n```json\n{json.dumps(state.data, indent=2)}\n```",
    )

    # Get patch content using unified extractor (supports both GitHub and Kanban modes)
    in_kanban_mode = is_kanban_mode(state)
    if in_kanban_mode:
        logger.info("Extracting patch content from kanban task data")
    else:
        logger.info("Extracting patch content from GitHub (checking for 'adw_patch' keyword)")

    patch_content, source_description, error = get_patch_content(state, issue, logger)

    if error:
        logger.error(f"Failed to extract patch content: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"❌ {error}",
            ),
        )
        sys.exit(1)

    logger.info(f"Patch content extracted from: {source_description}")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_PATCH_PLANNER,
            f"✅ Creating patch plan from {source_description}",
        ),
    )

    review_change_request = patch_content

    # Use the shared method to create and implement patch
    patch_file, implement_response = create_and_implement_patch(
        adw_id=adw_id,
        review_change_request=review_change_request,
        logger=logger,
        agent_name_planner=AGENT_PATCH_PLANNER,
        agent_name_implementor=AGENT_PATCH_IMPLEMENTOR,
        spec_path=None,  # No spec file for direct issue patches
        working_dir=worktree_path,  # Pass worktree path for isolated execution
    )

    if not patch_file:
        logger.error("Failed to create patch plan")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PATCH_PLANNER, "❌ Failed to create patch plan"
            ),
        )
        sys.exit(1)

    # Get patch number for history tracking
    patch_number = get_next_patch_number(state)
    logger.info(f"Patch number: {patch_number}")

    # Determine patch reason
    if in_kanban_mode and state.get("issue_json"):
        patch_reason = get_patch_reason_from_kanban(state.get("issue_json"))
    else:
        patch_reason = "Patch requested via GitHub"

    logger.info(f"Patch reason: {patch_reason}")

    state.update(patch_file=patch_file, patch_source_mode="kanban" if in_kanban_mode else "github")
    state.save("adw_patch_iso")
    logger.info(f"Patch plan created: {patch_file}")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id, AGENT_PATCH_PLANNER, f"✅ Patch #{patch_number} plan created: {patch_file}\nReason: {patch_reason}"
        ),
    )

    if not implement_response.success:
        logger.error(f"Error implementing patch: {implement_response.output}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                AGENT_PATCH_IMPLEMENTOR,
                f"❌ Error implementing patch: {implement_response.output}",
            ),
        )
        sys.exit(1)

    logger.debug(f"Implementation response: {implement_response.output}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_PATCH_IMPLEMENTOR, "✅ Patch implemented"),
    )

    # Create commit message
    logger.info("Creating patch commit")

    issue_command = "/patch"
    commit_msg, error = create_commit(
        AGENT_PATCH_IMPLEMENTOR, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                AGENT_PATCH_IMPLEMENTOR,
                f"❌ Error creating commit message: {error}",
            ),
        )
        sys.exit(1)

    # Commit the patch (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing patch: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, AGENT_PATCH_IMPLEMENTOR, f"❌ Error committing patch: {error}"
            ),
        )
        sys.exit(1)

    logger.info(f"Committed patch: {commit_msg}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_PATCH_IMPLEMENTOR, "✅ Patch committed"),
    )

    logger.info("Finalizing git operations")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", "🔧 Finalizing git operations"),
    )

    # Finalize git operations (push and PR) - passing cwd for worktree
    finalize_git_operations(state, logger, cwd=worktree_path)

    # Add patch to history
    add_patch_to_history(
        state=state,
        patch_number=patch_number,
        patch_reason=patch_reason,
        patch_file=patch_file,
        success=True,
    )
    logger.info(f"Added patch #{patch_number} to history")

    logger.info("Isolated patch workflow completed successfully")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", f"✅ Isolated patch workflow completed (Patch #{patch_number})"),
    )

    # Save final state
    state.save("adw_patch_iso")

    # Post final state summary to issue
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: 📋 Final isolated patch state:\n```json\n{json.dumps(state.data, indent=2)}\n```",
    )


if __name__ == "__main__":
    main()
