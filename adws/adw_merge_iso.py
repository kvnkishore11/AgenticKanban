#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests"]
# ///

"""
ADW Merge Isolated - Agent-Based Worktree Merge

This workflow uses the agent pattern to merge an isolated ADW worktree into main.
Unlike the previous direct-execution approach, this delegates the merge to a Claude
agent that can handle errors, fix issues, and retry within the same context.

Usage:
  uv run adw_merge_iso.py <adw-id> [merge-method]

Arguments:
  adw-id: The ADW ID of the worktree to merge (required)
  merge-method: Merge strategy - "squash", "merge", or "rebase" (default: "squash")

The agent will:
1. Load ADW state and validate
2. Perform the merge
3. Handle any errors (test failures, conflicts, config issues)
4. Retry operations after fixing issues
5. Only fail if truly unable to proceed after multiple attempts
"""

import sys
import os
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.workflow_ops import execute_merge_workflow
from adw_modules.github import make_issue_comment_safe
from adw_modules.workflow_ops import format_issue_message


def parse_arguments():
    """Parse command line arguments."""
    if len(sys.argv) < 2:
        print("Usage: uv run adw_merge_iso.py <adw-id> [merge-method]")
        print("  adw-id: The ADW ID of the worktree to merge")
        print("  merge-method: squash (default), merge, or rebase")
        sys.exit(1)

    adw_id = sys.argv[1]
    merge_method = sys.argv[2] if len(sys.argv) > 2 else "squash"

    # Validate merge method
    valid_methods = ["squash", "merge", "rebase"]
    if merge_method not in valid_methods:
        print(f"Invalid merge method: {merge_method}")
        print(f"Valid options: {', '.join(valid_methods)}")
        sys.exit(1)

    return adw_id, merge_method


def main():
    """Main entry point - orchestrate agent-based merge."""
    load_dotenv()

    # Parse arguments
    adw_id, merge_method = parse_arguments()

    # Setup logger
    logger = setup_logger(adw_id)
    logger.info(f"ADW Merge ISO (Agent-Based) starting - ID: {adw_id}, Method: {merge_method}")

    # Load state
    state = ADWState.load(adw_id)
    if not state:
        logger.error(f"Failed to load state for ADW {adw_id}")
        print(f"Error: Could not find ADW state for {adw_id}")
        sys.exit(1)

    # Get issue number for notifications (optional)
    issue_number = state.get("issue_number")
    branch_name = state.get("branch_name", "unknown")

    # Setup notifier
    notifier = WebSocketNotifier(adw_id)

    # Post initial status
    logger.info(f"Starting agent-based merge for branch: {branch_name}")
    notifier.notify_progress(
        "adw_merge_iso", 10, "Starting",
        f"Starting agent-based merge of {branch_name}"
    )

    if issue_number:
        make_issue_comment_safe(
            issue_number,
            format_issue_message(
                adw_id, "merger",
                f"Starting agent-based merge of `{branch_name}` to main using `{merge_method}` strategy"
            ),
            state
        )

    # Execute merge using agent pattern
    # The agent will handle errors, fix issues, and retry within the same context
    notifier.notify_progress(
        "adw_merge_iso", 30, "Merging",
        "Agent executing merge workflow..."
    )

    try:
        response = execute_merge_workflow(
            adw_id=adw_id,
            merge_method=merge_method,
            logger=logger,
        )

        if response.success:
            logger.info("Agent-based merge completed successfully")
            notifier.notify_complete(
                "adw_merge_iso",
                f"Successfully merged {branch_name} to main"
            )

            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(
                        adw_id, "merger",
                        f"Successfully merged `{branch_name}` to main using agent-based workflow"
                    ),
                    state
                )

            # Update state
            state.update(
                merge_status="completed",
                merge_method=merge_method,
                completed=True
            )
            state.save("adw_merge_iso")

        else:
            logger.error(f"Agent-based merge failed: {response.output}")
            notifier.notify_error(
                "adw_merge_iso",
                f"Merge failed after agent attempts: {response.output[:200]}",
                "Merging"
            )

            if issue_number:
                make_issue_comment_safe(
                    issue_number,
                    format_issue_message(
                        adw_id, "merger",
                        f"Merge failed after multiple attempts:\n```\n{response.output[:500]}\n```"
                    ),
                    state
                )

            sys.exit(1)

    except Exception as e:
        logger.exception(f"Exception during agent-based merge: {e}")
        notifier.notify_error(
            "adw_merge_iso",
            f"Merge exception: {str(e)}",
            "Merging"
        )
        sys.exit(1)

    finally:
        notifier.close()


if __name__ == "__main__":
    main()
