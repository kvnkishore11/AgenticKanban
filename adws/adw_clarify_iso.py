#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "anthropic"]
# ///

"""
ADW Clarify Iso - AI Developer Workflow for task clarification

Usage:
  uv run adw_clarify_iso.py <adw-id> <task-description> [user-feedback]

Workflow:
1. Load ADW state
2. Analyze task description using clarification analyzer
3. Return structured clarification result
4. Send WebSocket updates for real-time status

This is a lightweight workflow that doesn't require worktrees.
"""

import sys
import json
from dotenv import load_dotenv

from adw_modules.state import load_state, save_state
from adw_modules.logger import setup_logger
from adw_modules.websocket_notifier import WebSocketNotifier
from utils.clarify.clarification_analyzer import analyze_task_description
from adw_modules.data_types import ClarificationHistoryEntry


def main():
    """Main entry point for clarification workflow."""
    load_dotenv()

    # Parse arguments
    if len(sys.argv) < 3:
        print("Usage: adw_clarify_iso.py <adw-id> <task-description> [user-feedback]")
        sys.exit(1)

    adw_id = sys.argv[1]
    task_description = sys.argv[2]
    user_feedback = sys.argv[3] if len(sys.argv) > 3 else None

    # Setup logger
    logger = setup_logger(adw_id, "clarify")
    logger.info(f"Starting clarification workflow for ADW-{adw_id}")

    # Load state
    state = load_state(adw_id)

    # Setup WebSocket notifier
    notifier = WebSocketNotifier(
        adw_id=adw_id,
        websocket_port=state.websocket_port or 8500,
        logger=logger
    )

    try:
        # Send start notification
        notifier.send_status_update("clarification_started", {
            "adw_id": adw_id,
            "task_description": task_description[:100] + "..." if len(task_description) > 100 else task_description
        })

        # Analyze task description
        logger.info("Analyzing task description...")
        result = analyze_task_description(
            description=task_description,
            user_feedback=user_feedback,
            adw_id=adw_id,
        )

        # Convert result to dict for JSON serialization
        result_dict = {
            "understanding": result.understanding,
            "confidence": result.confidence.value,
            "questions": result.questions,
            "status": result.status.value,
            "timestamp": result.timestamp.isoformat()
        }

        # Save to clarification history in state
        if not hasattr(state, 'clarification_history') or state.clarification_history is None:
            state.clarification_history = []

        history_entry = ClarificationHistoryEntry(
            timestamp=result.timestamp,
            result=result,
            user_feedback=user_feedback,
            status=result.status
        )

        # Add to history
        state.clarification_history.append(history_entry.model_dump())

        # Save state
        save_state(state)

        # Send completion notification
        notifier.send_status_update("clarification_complete", {
            "adw_id": adw_id,
            "result": result_dict
        })

        # Output result as JSON for programmatic consumption
        print(json.dumps(result_dict, indent=2))

        logger.info("Clarification workflow completed successfully")

    except Exception as e:
        logger.error(f"Clarification workflow failed: {str(e)}")
        notifier.send_status_update("clarification_failed", {
            "adw_id": adw_id,
            "error": str(e)
        })
        sys.exit(1)


if __name__ == "__main__":
    main()
