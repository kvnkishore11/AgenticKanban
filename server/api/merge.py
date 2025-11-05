"""
Merge API endpoints for completing ADW workflows.
"""
import os
import sys
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class MergeTriggerRequest(BaseModel):
    """Request body for triggering a merge."""
    adw_id: str
    issue_number: int


class MergeTriggerResponse(BaseModel):
    """Response from triggering a merge."""
    success: bool
    message: str
    adw_id: str


class MergeStatusResponse(BaseModel):
    """Response for merge status."""
    adw_id: str
    completed: bool
    branch_name: Optional[str] = None
    merge_timestamp: Optional[str] = None


def get_adws_directory() -> Path:
    """
    Get the path to the adws directory.
    Handles both main project and worktree environments.
    """
    # Get the directory where this script is located
    current_file = Path(__file__).resolve()
    # Navigate from server/api/merge.py
    # Current path: trees/<adw_id>/server/api/merge.py or server/api/merge.py
    # Target path: adws/

    # Go up to the worktree or project root
    project_or_worktree_root = current_file.parent.parent.parent

    # Check if we're in a worktree (trees/<adw_id>)
    if project_or_worktree_root.name and len(project_or_worktree_root.name) == 8:
        # We're in a worktree, go up two more levels to main project
        main_project_root = project_or_worktree_root.parent.parent
        adws_dir = main_project_root / "adws"
    else:
        # We're in the main project
        adws_dir = project_or_worktree_root / "adws"

    if not adws_dir.exists():
        logger.warning(f"adws directory not found at {adws_dir}")

    return adws_dir


def get_agents_directory() -> Path:
    """Get the path to the agents directory."""
    current_file = Path(__file__).resolve()
    project_or_worktree_root = current_file.parent.parent.parent

    # Check if we're in a worktree
    if project_or_worktree_root.name and len(project_or_worktree_root.name) == 8:
        main_project_root = project_or_worktree_root.parent.parent
        agents_dir = main_project_root / "agents"
    else:
        agents_dir = project_or_worktree_root / "agents"

    return agents_dir


def read_adw_state(adw_id: str) -> Optional[Dict[str, Any]]:
    """Read ADW state for the given adw_id."""
    import json

    agents_dir = get_agents_directory()
    state_file = agents_dir / adw_id / "adw_state.json"

    if not state_file.exists():
        logger.warning(f"adw_state.json not found for {adw_id}")
        return None

    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            state_data = json.load(f)
        return state_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse adw_state.json for {adw_id}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error reading adw_state.json for {adw_id}: {e}")
        return None


@router.post("/merge/trigger", response_model=MergeTriggerResponse)
async def trigger_merge(request: MergeTriggerRequest):
    """
    Trigger merge workflow for an ADW ID.

    This endpoint triggers the adw_merge_worktree.py workflow which:
    1. Merges the branch to main using git operations
    2. Handles merge conflicts with Claude Code assistance if needed
    3. Runs validation tests to ensure merge is clean
    4. Clears the worktree
    5. Deletes the remote branch
    6. Updates ADW state with merge status

    Args:
        request: MergeTriggerRequest containing adw_id and issue_number

    Returns:
        MergeTriggerResponse with success status and message
    """
    adw_id = request.adw_id
    issue_number = request.issue_number

    # Validate ADW ID format
    if len(adw_id) != 8 or not adw_id.isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Must be 8 alphanumeric characters."
        )

    # Check if ADW state exists
    state_data = read_adw_state(adw_id)
    if state_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"ADW state not found for ADW ID: {adw_id}"
        )

    # Check if already merged
    adw_ids = state_data.get("adw_ids", [])
    if "adw_merge_worktree" in adw_ids:
        return MergeTriggerResponse(
            success=True,
            message="Worktree already merged",
            adw_id=adw_id
        )

    # Get adws directory and script path
    adws_dir = get_adws_directory()
    script_path = adws_dir / "adw_merge_worktree.py"

    if not script_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"adw_merge_worktree.py script not found at {script_path}"
        )

    # Trigger the workflow using subprocess
    try:
        logger.info(f"Triggering merge worktree workflow for ADW {adw_id}, Issue #{issue_number}")

        # Run the script in the background
        # Note: We use Popen to run it asynchronously
        # The script uses squash merge by default
        cmd = ["uv", "run", str(script_path), adw_id, "squash"]

        # Run in background and don't wait for completion
        process = subprocess.Popen(
            cmd,
            cwd=str(adws_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        logger.info(f"Started merge worktree workflow process (PID: {process.pid})")

        return MergeTriggerResponse(
            success=True,
            message=f"Merge worktree workflow started for ADW {adw_id}",
            adw_id=adw_id
        )

    except Exception as e:
        logger.error(f"Failed to trigger merge worktree workflow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger merge worktree workflow: {str(e)}"
        )


@router.get("/merge/status/{adw_id}", response_model=MergeStatusResponse)
async def get_merge_status(adw_id: str):
    """
    Get merge/completion status for a given ADW ID.

    Args:
        adw_id: The ADW identifier

    Returns:
        MergeStatusResponse with completion status and details
    """
    # Validate ADW ID format
    if len(adw_id) != 8 or not adw_id.isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Must be 8 alphanumeric characters."
        )

    # Read ADW state
    state_data = read_adw_state(adw_id)
    if state_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"ADW state not found for ADW ID: {adw_id}"
        )

    return MergeStatusResponse(
        adw_id=adw_id,
        completed=state_data.get("completed", False),
        branch_name=state_data.get("branch_name"),
        merge_timestamp=None  # TODO: Add timestamp tracking if needed
    )
