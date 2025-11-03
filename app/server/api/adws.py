"""
ADW (Agent-Driven Workflow) management API endpoints.
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_agents_directory() -> Path:
    """
    Get the path to the agents directory.
    Handles both main project and worktree environments.
    - If running from a worktree (trees/<adw_id>/app/server), goes up to main project
    - If running from main project (app/server), uses relative path
    """
    # Get the directory where this script is located
    current_file = Path(__file__).resolve()
    # Navigate from app/server/api/adws.py
    # Current path: trees/<adw_id>/app/server/api/adws.py
    # Target path: agents/

    # Go up to the worktree or project root
    project_or_worktree_root = current_file.parent.parent.parent.parent

    # Check if we're in a worktree (trees/<adw_id>)
    if project_or_worktree_root.name and len(project_or_worktree_root.name) == 8:
        # We're in a worktree, go up two more levels to main project
        main_project_root = project_or_worktree_root.parent.parent
        agents_dir = main_project_root / "agents"
    else:
        # We're in the main project
        agents_dir = project_or_worktree_root / "agents"

    if not agents_dir.exists():
        logger.warning(f"Agents directory not found at {agents_dir}")

    return agents_dir

def read_adw_state(adw_dir: Path) -> Dict[str, Any]:
    """
    Read and parse the adw_state.json file from an ADW directory.

    Args:
        adw_dir: Path to the ADW directory

    Returns:
        Dictionary containing ADW state data, or None if file doesn't exist or is invalid
    """
    state_file = adw_dir / "adw_state.json"

    if not state_file.exists():
        logger.warning(f"adw_state.json not found in {adw_dir}")
        return None

    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            state_data = json.load(f)
        return state_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse adw_state.json in {adw_dir}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error reading adw_state.json in {adw_dir}: {e}")
        return None

def format_adw_for_response(state_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format ADW state data for API response.

    Args:
        state_data: Raw ADW state data from adw_state.json

    Returns:
        Formatted ADW data for API response
    """
    # Extract issue_class and remove leading slash if present
    issue_class = state_data.get("issue_class", "")
    if issue_class.startswith("/"):
        issue_class = issue_class[1:]

    # Extract issue_title from issue_json
    issue_json = state_data.get("issue_json", {})
    issue_title = issue_json.get("title", "")

    # Get issue_number (could be string or int)
    issue_number = state_data.get("issue_number")
    if isinstance(issue_number, str):
        try:
            issue_number = int(issue_number)
        except (ValueError, TypeError):
            pass

    return {
        "adw_id": state_data.get("adw_id", ""),
        "issue_class": issue_class,
        "issue_number": issue_number,
        "issue_title": issue_title,
        "branch_name": state_data.get("branch_name", "")
    }

def scan_adw_directories() -> List[Dict[str, Any]]:
    """
    Scan the agents directory for ADW folders and extract metadata.

    Returns:
        List of ADW metadata dictionaries
    """
    agents_dir = get_agents_directory()
    adws = []

    if not agents_dir.exists():
        logger.error(f"Agents directory not found: {agents_dir}")
        return adws

    # Iterate through all subdirectories in agents/
    for item in agents_dir.iterdir():
        if not item.is_dir():
            continue

        # Check if directory name looks like an ADW ID (8 alphanumeric characters)
        adw_id = item.name
        if len(adw_id) != 8:
            logger.debug(f"Skipping {adw_id} - not a valid ADW ID format")
            continue

        # Read the adw_state.json file
        state_data = read_adw_state(item)
        if state_data is None:
            logger.warning(f"Skipping {adw_id} - could not read adw_state.json")
            continue

        # Format and add to results
        try:
            adw_info = format_adw_for_response(state_data)
            adws.append(adw_info)
            logger.debug(f"Successfully loaded ADW: {adw_id}")
        except Exception as e:
            logger.error(f"Error formatting ADW data for {adw_id}: {e}")
            continue

    logger.info(f"Found {len(adws)} valid ADWs")
    return adws

@router.get("/adws/list")
async def list_adws():
    """
    Get list of all available ADW IDs with metadata.

    Returns:
        JSON response with array of ADW objects containing:
        - adw_id: The ADW identifier
        - issue_class: Type of issue (feature, bug, chore)
        - issue_number: Issue number
        - issue_title: Title of the issue
        - branch_name: Git branch name for this ADW
    """
    try:
        adws = scan_adw_directories()
        return {"adws": adws}
    except Exception as e:
        logger.error(f"Error listing ADWs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while listing ADWs: {str(e)}"
        )

@router.get("/adws/{adw_id}")
async def get_adw_details(adw_id: str):
    """
    Get detailed information for a specific ADW ID.

    Args:
        adw_id: The ADW identifier (8-character alphanumeric string)

    Returns:
        JSON response with full ADW state data
    """
    # Validate ADW ID format
    if len(adw_id) != 8 or not adw_id.isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Must be 8 alphanumeric characters."
        )

    try:
        agents_dir = get_agents_directory()
        adw_dir = agents_dir / adw_id

        if not adw_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"ADW ID '{adw_id}' not found"
            )

        state_data = read_adw_state(adw_dir)
        if state_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"adw_state.json not found or invalid for ADW ID '{adw_id}'"
            )

        return state_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ADW details for {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/adws/{adw_id}/plan")
async def get_adw_plan(adw_id: str):
    """
    Get the plan file content for a specific ADW ID.

    Args:
        adw_id: The ADW identifier (8-character alphanumeric string)

    Returns:
        JSON response with plan file content and path:
        - plan_content: The markdown content of the plan file
        - plan_file: The relative path to the plan file
    """
    # Validate ADW ID format
    if len(adw_id) != 8 or not adw_id.isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Must be 8 alphanumeric characters."
        )

    try:
        agents_dir = get_agents_directory()
        adw_dir = agents_dir / adw_id

        if not adw_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"ADW ID '{adw_id}' not found"
            )

        # Construct path to plan file
        plan_file = adw_dir / "sdlc_planner" / "plan.md"

        if not plan_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Plan file not found for ADW ID '{adw_id}'"
            )

        # Read plan file content
        try:
            with open(plan_file, 'r', encoding='utf-8') as f:
                plan_content = f.read()
        except Exception as e:
            logger.error(f"Error reading plan file for {adw_id}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error reading plan file: {str(e)}"
            )

        # Return plan content and relative path
        relative_plan_path = f"agents/{adw_id}/sdlc_planner/plan.md"
        return {
            "plan_content": plan_content,
            "plan_file": relative_plan_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plan for {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
