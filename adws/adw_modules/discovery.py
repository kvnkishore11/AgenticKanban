"""ADW discovery module for listing and retrieving ADW metadata.

Provides functions to discover all ADW IDs from the agents/ directory
and retrieve metadata from their adw_state.json files.
"""

import os
import logging
from typing import List, Dict, Optional, Any
from adw_modules.state import ADWState


logger = logging.getLogger(__name__)


def get_agents_directory() -> str:
    """Get the path to the agents directory."""
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return os.path.join(project_root, "agents")


def discover_all_adws() -> List[Dict[str, Any]]:
    """Scan agents/ directory and return list of all ADW IDs with metadata.

    Returns:
        List of dictionaries containing ADW metadata. Each dict includes:
        - adw_id: str
        - issue_number: Optional[str]
        - issue_class: Optional[str]
        - branch_name: Optional[str]
        - plan_file: Optional[str]
        - model_set: Optional[str]
        - backend_port: Optional[int]
        - frontend_port: Optional[int]
        - data_source: Optional[str]
        - issue_title: Optional[str] (extracted from issue_json if available)
    """
    agents_dir = get_agents_directory()

    if not os.path.exists(agents_dir):
        logger.warning(f"Agents directory does not exist: {agents_dir}")
        return []

    adw_list = []

    # Scan all subdirectories in agents/
    try:
        for entry in os.scandir(agents_dir):
            if entry.is_dir():
                adw_id = entry.name

                # Try to load state for this ADW ID
                state = ADWState.load(adw_id, logger=logger)

                if state is not None:
                    # Format and add to list
                    adw_metadata = format_adw_response(state.data)
                    adw_list.append(adw_metadata)
                else:
                    # State file doesn't exist or is invalid
                    logger.debug(f"Skipping {adw_id}: no valid state file")

    except Exception as e:
        logger.error(f"Error scanning agents directory: {e}")

    # Sort by ADW ID (most recent first, assuming alphanumeric IDs)
    adw_list.sort(key=lambda x: x.get('adw_id', ''), reverse=True)

    return adw_list


def get_adw_metadata(adw_id: str) -> Optional[Dict[str, Any]]:
    """Get metadata for a specific ADW ID.

    Args:
        adw_id: The ADW ID to retrieve metadata for

    Returns:
        Dictionary with ADW metadata, or None if not found/invalid
    """
    if not adw_id:
        return None

    try:
        state = ADWState.load(adw_id, logger=logger)

        if state is None:
            return None

        return format_adw_response(state.data)

    except Exception as e:
        logger.error(f"Error retrieving metadata for {adw_id}: {e}")
        return None


def format_adw_response(state_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format ADW state data for API response.

    Args:
        state_data: Raw state data dictionary from ADWState

    Returns:
        Formatted dictionary with relevant fields for API response
    """
    # Extract issue title from issue_json if available
    issue_title = None
    issue_body = None
    if state_data.get("issue_json"):
        issue_json = state_data["issue_json"]
        issue_title = issue_json.get("title")
        issue_body = issue_json.get("body")

    # Extract orchestrator execution data for stage synchronization
    current_stage = None
    workflow_status = None
    workflow_stages = []

    orchestrator_data = state_data.get("orchestrator", {})
    execution_data = orchestrator_data.get("execution", {})

    if execution_data:
        workflow_status = execution_data.get("status")  # completed, running, failed
        stages = execution_data.get("stages", [])

        if stages:
            workflow_stages = stages

            # Find the current or last completed stage
            if workflow_status == "completed":
                # Workflow is complete - use the last stage or ready-to-merge
                last_stage = stages[-1] if stages else None
                if last_stage and last_stage.get("status") == "completed":
                    current_stage = "ready-to-merge"
                else:
                    current_stage = last_stage.get("stage_name") if last_stage else None
            elif workflow_status == "failed":
                # Find the failed stage
                for stage in stages:
                    if stage.get("status") == "failed":
                        current_stage = "errored"
                        break
                    elif stage.get("status") == "running":
                        current_stage = stage.get("stage_name")
                        break
            else:
                # Running or pending - find the current running stage
                for stage in stages:
                    if stage.get("status") == "running":
                        current_stage = stage.get("stage_name")
                        break
                    elif stage.get("status") == "pending":
                        # If no running stage, use the first pending stage
                        if current_stage is None:
                            current_stage = stage.get("stage_name")
                        break
                    elif stage.get("status") == "completed":
                        # Track the last completed stage
                        current_stage = stage.get("stage_name")

    return {
        "adw_id": state_data.get("adw_id"),
        "issue_number": state_data.get("issue_number"),
        "issue_class": state_data.get("issue_class"),
        "issue_title": issue_title,
        "issue_body": issue_body,
        "branch_name": state_data.get("branch_name"),
        "plan_file": state_data.get("plan_file"),
        "model_set": state_data.get("model_set", "base"),
        "backend_port": state_data.get("backend_port"),  # Deprecated
        "websocket_port": state_data.get("websocket_port"),
        "frontend_port": state_data.get("frontend_port"),
        "data_source": state_data.get("data_source", "github"),
        "worktree_path": state_data.get("worktree_path"),
        "all_adws": state_data.get("all_adws", []),
        # New fields for stage synchronization
        "current_stage": current_stage,
        "workflow_status": workflow_status,
        "workflow_stages": workflow_stages,
        "completed": state_data.get("completed", False),
    }
