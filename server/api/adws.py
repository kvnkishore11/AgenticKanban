"""
ADW (Agent-Driven Workflow) management API endpoints.

Database-Only Mode (ADW_DB_ONLY=true, default):
- List and get operations use SQLite database
- No JSON file scanning for state

File Operations (always):
- Plan file reading from specs/
- Worktree deletion
"""
import os
import json
import logging
import shutil
import subprocess
import signal
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request

# Database imports
try:
    import sqlite3
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_agents_directory() -> Path:
    """
    Get the path to the agents directory.
    Handles both main project and worktree environments.
    - If running from a worktree (trees/<adw_id>/server), goes up to main project
    - If running from main project (server), uses relative path
    """
    # Get the directory where this script is located
    current_file = Path(__file__).resolve()
    logger.info(f"Resolving agents directory from: {current_file}")

    # Navigate from server/api/adws.py
    # Current path could be:
    # - trees/<adw_id>/server/api/adws.py (worktree)
    # - server/api/adws.py (main project)

    # Go up 3 levels to reach the current repository root (worktree or main project)
    # From server/api/adws.py -> server/api -> server -> (root)
    current_root = current_file.parent.parent.parent
    logger.info(f"Current root (3 levels up): {current_root}")

    # Check if we're in a worktree by checking if 'trees/' is in the path
    path_parts = current_root.parts
    if 'trees' in path_parts:
        # We're in a worktree (trees/<adw_id>/)
        # Find the index of 'trees' and go up to the main project root
        trees_index = path_parts.index('trees')
        # Reconstruct path up to (but not including) 'trees'
        main_project_root = Path(*path_parts[:trees_index])
        agents_dir = main_project_root / "agents"
        logger.info(f"Detected worktree. Main project root: {main_project_root}")
    else:
        # We're in the main project
        agents_dir = current_root / "agents"
        logger.info(f"Detected main project. Using root: {current_root}")

    logger.info(f"Agents directory resolved to: {agents_dir}")

    if not agents_dir.exists():
        logger.warning(f"Agents directory not found at {agents_dir}")
    else:
        logger.info(f"Agents directory exists and is accessible")

    return agents_dir

def _get_db_path() -> Optional[Path]:
    """Get path to the database file."""
    if not DB_AVAILABLE:
        return None

    try:
        current_file = Path(__file__).resolve()
        current_root = current_file.parent.parent.parent

        # Check if we're in a worktree
        path_parts = current_root.parts
        if 'trees' in path_parts:
            trees_index = path_parts.index('trees')
            main_project_root = Path(*path_parts[:trees_index])
            db_path = main_project_root / "adws" / "database" / "agentickanban.db"
        else:
            db_path = current_root / "adws" / "database" / "agentickanban.db"

        return db_path if db_path.exists() else None
    except Exception as e:
        logger.debug(f"Error getting database path: {e}")
        return None


def _list_adws_from_database() -> List[Dict[str, Any]]:
    """List all ADWs from database."""
    db_path = _get_db_path()
    if not db_path:
        return []

    try:
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT adw_id, issue_number, issue_class, issue_title,
                   branch_name, status, current_stage, workflow_name,
                   CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END as completed
            FROM adw_states
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        adws = []
        for row in rows:
            row_dict = dict(row)
            # Format issue_class without leading slash
            issue_class = row_dict.get("issue_class", "")
            if issue_class and issue_class.startswith("/"):
                issue_class = issue_class[1:]

            adws.append({
                "adw_id": row_dict.get("adw_id", ""),
                "issue_class": issue_class,
                "issue_number": row_dict.get("issue_number"),
                "issue_title": row_dict.get("issue_title", ""),
                "branch_name": row_dict.get("branch_name", ""),
                "workflow_name": row_dict.get("workflow_name"),
                "current_stage": row_dict.get("current_stage"),
                "completed": bool(row_dict.get("completed", 0))
            })

        return adws

    except Exception as e:
        logger.error(f"Error listing ADWs from database: {e}")
        return []


def _get_adw_from_database(adw_id: str) -> Optional[Dict[str, Any]]:
    """Get single ADW from database."""
    db_path = _get_db_path()
    if not db_path:
        return None

    try:
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM adw_states
            WHERE adw_id = ? AND deleted_at IS NULL
        """, (adw_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        row_dict = dict(row)

        # Parse JSON fields
        issue_json = None
        if row_dict.get("issue_json"):
            try:
                issue_json = json.loads(row_dict["issue_json"])
            except json.JSONDecodeError:
                pass

        # Build response similar to file-based state
        return {
            "adw_id": row_dict.get("adw_id"),
            "issue_number": row_dict.get("issue_number"),
            "issue_title": row_dict.get("issue_title"),
            "issue_body": row_dict.get("issue_body"),
            "issue_class": row_dict.get("issue_class"),
            "branch_name": row_dict.get("branch_name"),
            "worktree_path": row_dict.get("worktree_path"),
            "plan_file": row_dict.get("plan_file"),
            "model_set": row_dict.get("model_set", "base"),
            "data_source": row_dict.get("data_source", "kanban"),
            "backend_port": row_dict.get("backend_port"),
            "websocket_port": row_dict.get("websocket_port"),
            "frontend_port": row_dict.get("frontend_port"),
            "completed": row_dict.get("completed_at") is not None,
            "issue_json": issue_json,
            "current_stage": row_dict.get("current_stage"),
            "status": row_dict.get("status"),
            "workflow_name": row_dict.get("workflow_name"),
        }

    except Exception as e:
        logger.error(f"Error getting ADW {adw_id} from database: {e}")
        return None


def get_specs_directory() -> Path:
    """
    Get the path to the specs directory.
    Handles both main project and worktree environments.
    - If running from a worktree (trees/<adw_id>/server), goes up to main project
    - If running from main project (server), uses relative path
    """
    # Get the directory where this script is located
    current_file = Path(__file__).resolve()

    # Go up 3 levels to reach the current repository root (worktree or main project)
    # From server/api/adws.py -> server/api -> server -> (root)
    current_root = current_file.parent.parent.parent

    # Check if we're in a worktree by checking if 'trees/' is in the path
    path_parts = current_root.parts
    if 'trees' in path_parts:
        # We're in a worktree (trees/<adw_id>/)
        # Find the index of 'trees' and go up to the main project root
        trees_index = path_parts.index('trees')
        # Reconstruct path up to (but not including) 'trees'
        main_project_root = Path(*path_parts[:trees_index])
        specs_dir = main_project_root / "specs"
        logger.info(f"Detected worktree. Specs directory: {specs_dir}")
    else:
        # We're in the main project
        specs_dir = current_root / "specs"
        logger.info(f"Detected main project. Specs directory: {specs_dir}")

    return specs_dir

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
        "branch_name": state_data.get("branch_name", ""),
        "completed": state_data.get("completed", False)
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

    Uses database as primary source (ADW_DB_ONLY=true, default).
    Falls back to filesystem scanning if database unavailable.

    Returns:
        JSON response with array of ADW objects containing:
        - adw_id: The ADW identifier
        - issue_class: Type of issue (feature, bug, chore)
        - issue_number: Issue number
        - issue_title: Title of the issue
        - branch_name: Git branch name for this ADW
    """
    db_only_mode = os.getenv("ADW_DB_ONLY", "true").lower() == "true" and DB_AVAILABLE

    try:
        # Try database first (primary source)
        adws = _list_adws_from_database()
        if adws:
            logger.info(f"Listed {len(adws)} ADWs from database")
            return {"adws": adws}

        # In database-only mode, return empty if database fails
        if db_only_mode:
            logger.warning("Database listing failed in db-only mode")
            return {"adws": []}

        # Fallback to filesystem (dual-write mode only)
        logger.info("Falling back to filesystem scanning")
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

    Uses database as primary source (ADW_DB_ONLY=true, default).
    Falls back to filesystem if database unavailable.

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

    db_only_mode = os.getenv("ADW_DB_ONLY", "true").lower() == "true" and DB_AVAILABLE

    try:
        # Try database first (primary source)
        state_data = _get_adw_from_database(adw_id)
        if state_data:
            logger.info(f"Got ADW {adw_id} from database")
            return state_data

        # In database-only mode, return 404 if not in database
        if db_only_mode:
            raise HTTPException(
                status_code=404,
                detail=f"ADW ID '{adw_id}' not found in database"
            )

        # Fallback to filesystem (dual-write mode only)
        logger.info(f"Falling back to filesystem for ADW {adw_id}")
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
        logger.info(f"Fetching plan for ADW ID: {adw_id}")

        # Get current file path to determine if we're in a worktree
        current_file = Path(__file__).resolve()
        current_root = current_file.parent.parent.parent

        # Build list of directories to search
        specs_directories = []

        # Add main project specs directory
        main_specs_dir = get_specs_directory()
        specs_directories.append(main_specs_dir)

        # If we're in a worktree, also check the worktree's local specs directory
        path_parts = current_root.parts
        if 'trees' in path_parts:
            worktree_specs_dir = current_root / "specs"
            if worktree_specs_dir.exists():
                specs_directories.append(worktree_specs_dir)
                logger.info(f"Also searching worktree specs directory: {worktree_specs_dir}")

        logger.info(f"Searching for plan files in {len(specs_directories)} directories")

        # Search for plan files matching the pattern: issue-*-adw-{adw_id}-sdlc_planner-*.md
        pattern = f"issue-*-adw-{adw_id}-sdlc_planner-*.md"
        matching_files = []

        for specs_dir in specs_directories:
            if specs_dir.exists():
                logger.info(f"Searching in: {specs_dir}")
                files = list(specs_dir.glob(pattern))
                matching_files.extend(files)
                logger.info(f"Found {len(files)} files in {specs_dir}")

        logger.info(f"Total files found matching pattern '{pattern}': {len(matching_files)}")

        # If multiple files found, use the most recently modified one
        plan_file = None
        if matching_files:
            # Sort by modification time (most recent first)
            matching_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            plan_file = matching_files[0]
            if len(matching_files) > 1:
                logger.warning(f"Multiple plan files found for ADW ID {adw_id}, using most recent: {plan_file.name}")
            else:
                logger.info(f"Found plan file: {plan_file.name}")

        # Fallback: If no plan file found by ADW ID, try to find by checking ADW state
        if not plan_file:
            logger.info(f"No plan file found by ADW ID pattern, attempting fallback search")

            # Try to get issue number from ADW state
            agents_dir = get_agents_directory()
            adw_dir = agents_dir / adw_id

            if adw_dir.exists():
                adw_state = read_adw_state(adw_dir)
                if adw_state and 'issue_number' in adw_state:
                    issue_number = adw_state['issue_number']
                    logger.info(f"Found issue number {issue_number} from ADW state, searching for plan files")

                    # Search by issue number pattern
                    fallback_pattern = f"issue-{issue_number}-adw-*-sdlc_planner-*.md"
                    fallback_files = list(specs_dir.glob(fallback_pattern))

                    if fallback_files:
                        # Sort by modification time and use most recent
                        fallback_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                        plan_file = fallback_files[0]
                        logger.info(f"Found plan file via fallback search: {plan_file.name}")

        # If still no plan file found, return 404
        if not plan_file:
            logger.error(f"No plan file found for ADW ID '{adw_id}'")
            # List available plan files for debugging
            all_plan_files = list(specs_dir.glob("issue-*-sdlc_planner-*.md"))
            if all_plan_files:
                logger.info(f"Available plan files in specs directory: {[f.name for f in all_plan_files[:5]]}")
            raise HTTPException(
                status_code=404,
                detail=f"Plan file not found for ADW ID '{adw_id}'. No matching files in specs directory."
            )

        # Read plan file content
        try:
            with open(plan_file, 'r', encoding='utf-8') as f:
                plan_content = f.read()
            logger.info(f"Successfully read plan file for {adw_id}, size: {len(plan_content)} bytes")
        except Exception as e:
            logger.error(f"Error reading plan file for {adw_id}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error reading plan file: {str(e)}"
            )

        # Return plan content and relative path
        relative_plan_path = f"specs/{plan_file.name}"
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

def kill_process_on_port(port: int, logger: logging.Logger) -> bool:
    """
    Kill any process running on the specified port.

    Args:
        port: Port number to check and kill process on
        logger: Logger instance

    Returns:
        True if a process was killed, False otherwise
    """
    try:
        # Use lsof to find process on port
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True,
            text=True
        )

        if result.returncode == 0 and result.stdout.strip():
            pid = int(result.stdout.strip())
            logger.info(f"Found process {pid} on port {port}, killing it")

            try:
                os.kill(pid, signal.SIGTERM)
                logger.info(f"Killed process {pid} on port {port}")
                return True
            except ProcessLookupError:
                logger.warning(f"Process {pid} already terminated")
                return False
        else:
            logger.info(f"No process found on port {port}")
            return False

    except Exception as e:
        logger.error(f"Error killing process on port {port}: {e}")
        return False

@router.delete("/adws/{adw_id}")
async def delete_adw(adw_id: str, request: Request):
    """
    Delete a worktree and all associated files for a specific ADW ID.

    This endpoint performs the following cleanup operations:
    1. Validates the ADW ID format
    2. Checks if the ADW exists
    3. Kills any processes running on the worktree's allocated ports
    4. Removes the git worktree
    5. Deletes the agents/{adw_id} directory
    6. Soft-deletes the database record (sets deleted_at timestamp)
    7. Broadcasts WebSocket notification on success/failure

    Args:
        adw_id: The ADW identifier (8-character alphanumeric string)
        request: FastAPI request object to access app state

    Returns:
        JSON response confirming deletion with fields:
        - success: bool
        - adw_id: str
        - worktree_removed: bool
        - killed_ports: list
        - db_updated: bool (whether database soft-delete was successful)
        - message: str
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

        # Check if ADW directory exists
        if not adw_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"ADW ID '{adw_id}' not found"
            )

        # Read adw_state.json to get port and worktree information
        state_data = read_adw_state(adw_dir)
        if state_data is None:
            logger.warning(f"adw_state.json not found for {adw_id}, proceeding with deletion anyway")
            state_data = {}

        worktree_path = state_data.get("worktree_path")
        websocket_port = state_data.get("websocket_port")
        frontend_port = state_data.get("frontend_port")

        logger.info(f"Starting deletion of ADW {adw_id}")
        logger.info(f"  Worktree path: {worktree_path}")
        logger.info(f"  WebSocket port: {websocket_port}")
        logger.info(f"  Frontend port: {frontend_port}")

        # Step 1: Kill processes on allocated ports
        killed_ports = []
        if websocket_port:
            if kill_process_on_port(websocket_port, logger):
                killed_ports.append(websocket_port)
        if frontend_port:
            if kill_process_on_port(frontend_port, logger):
                killed_ports.append(frontend_port)

        # Step 2: Remove git worktree
        worktree_removed = False
        if worktree_path and os.path.exists(worktree_path):
            try:
                # First try git worktree remove
                result = subprocess.run(
                    ["git", "worktree", "remove", worktree_path, "--force"],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    logger.info(f"Successfully removed worktree via git: {worktree_path}")
                    worktree_removed = True
                else:
                    logger.warning(f"Git worktree remove failed: {result.stderr}")
                    # Try manual cleanup
                    if os.path.exists(worktree_path):
                        shutil.rmtree(worktree_path)
                        logger.info(f"Manually removed worktree directory: {worktree_path}")
                        worktree_removed = True

                    # Prune stale worktree entries
                    subprocess.run(["git", "worktree", "prune"], capture_output=True)

            except Exception as e:
                logger.error(f"Error removing worktree: {e}")
                # Continue with deletion even if worktree removal fails
        elif worktree_path:
            logger.warning(f"Worktree path {worktree_path} does not exist, skipping worktree removal")

        # Step 3: Delete agents/{adw_id} directory
        try:
            shutil.rmtree(adw_dir)
            logger.info(f"Successfully deleted agents directory: {adw_dir}")
        except Exception as e:
            error_msg = f"Failed to delete agents directory {adw_dir}: {e}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )

        # Step 4: Update database to soft-delete the ADW record
        db_updated = False
        db_path = _get_db_path()
        if db_path and DB_AVAILABLE:
            try:
                conn = sqlite3.connect(str(db_path), timeout=5.0)
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE adw_states
                    SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE adw_id = ? AND deleted_at IS NULL
                """, (adw_id,))
                rows_affected = cursor.rowcount
                conn.commit()
                conn.close()

                if rows_affected > 0:
                    logger.info(f"Successfully soft-deleted ADW {adw_id} in database")
                    db_updated = True
                else:
                    logger.warning(f"No database record found for ADW {adw_id} (may already be deleted)")
            except Exception as db_error:
                logger.error(f"Failed to update database for ADW {adw_id}: {db_error}")
                # Continue with deletion - filesystem cleanup was successful
        else:
            logger.warning(f"Database not available, skipping soft-delete for ADW {adw_id}")

        # Step 5: Broadcast WebSocket notification
        ws_manager = getattr(request.app.state, "ws_manager", None)
        if ws_manager:
            try:
                await ws_manager.broadcast_system_log(
                    message=f"Worktree {adw_id} deleted successfully",
                    level="SUCCESS",
                    context={
                        "adw_id": adw_id,
                        "worktree_removed": worktree_removed,
                        "killed_ports": killed_ports,
                        "db_updated": db_updated,
                        "event_type": "worktree_deleted"
                    }
                )
                logger.info(f"Broadcasted worktree_deleted event for {adw_id}")
            except Exception as e:
                logger.error(f"Error broadcasting WebSocket notification: {e}")

        logger.info(f"Successfully deleted ADW {adw_id} (db_updated={db_updated})")

        return {
            "success": True,
            "adw_id": adw_id,
            "worktree_removed": worktree_removed,
            "killed_ports": killed_ports,
            "db_updated": db_updated,
            "message": f"ADW {adw_id} deleted successfully"
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error deleting ADW {adw_id}: {e}", exc_info=True)

        # Broadcast error notification
        ws_manager = getattr(request.app.state, "ws_manager", None)
        if ws_manager:
            try:
                await ws_manager.broadcast_system_log(
                    message=f"Failed to delete worktree {adw_id}",
                    level="ERROR",
                    details=str(e),
                    context={
                        "adw_id": adw_id,
                        "event_type": "worktree_delete_failed"
                    }
                )
            except Exception as broadcast_error:
                logger.error(f"Error broadcasting error notification: {broadcast_error}")

        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while deleting ADW: {str(e)}"
        )


def get_main_project_root() -> Path:
    """
    Get the path to the main project root directory.
    Handles both main project and worktree environments.
    """
    current_file = Path(__file__).resolve()
    current_root = current_file.parent.parent.parent

    path_parts = current_root.parts
    if 'trees' in path_parts:
        trees_index = path_parts.index('trees')
        main_project_root = Path(*path_parts[:trees_index])
        return main_project_root
    else:
        return current_root


@router.post("/codebase/open/{adw_id}")
async def open_codebase(adw_id: str):
    """
    Open the codebase in neovim within a tmux session.

    Creates or attaches to an AgenticKanban tmux session and opens neovim
    at the worktree path for the specified ADW.

    Args:
        adw_id: The ADW identifier (8-character alphanumeric string)

    Returns:
        JSON response with success status and details
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

        worktree_path = state_data.get("worktree_path")
        if not worktree_path:
            raise HTTPException(
                status_code=404,
                detail=f"Worktree path not found for ADW ID '{adw_id}'"
            )

        if not os.path.exists(worktree_path):
            raise HTTPException(
                status_code=404,
                detail=f"Worktree not found at path: {worktree_path}"
            )

        logger.info(f"Opening codebase for ADW {adw_id} at {worktree_path}")

        # Tmux session name for AgenticKanban
        tmux_session = "AgenticKanban"
        window_name = f"nvim-{adw_id}"

        # Check if tmux session exists
        check_session = subprocess.run(
            ["tmux", "has-session", "-t", tmux_session],
            capture_output=True
        )

        if check_session.returncode != 0:
            # Create new tmux session with neovim
            result = subprocess.run(
                ["tmux", "new-session", "-d", "-s", tmux_session, "-n", window_name,
                 "-c", worktree_path, "nvim", "."],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create tmux session: {result.stderr}"
                )
            logger.info(f"Created new tmux session '{tmux_session}' with neovim")
        else:
            # Session exists, create new window with neovim
            result = subprocess.run(
                ["tmux", "new-window", "-t", tmux_session, "-n", window_name,
                 "-c", worktree_path, "nvim", "."],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create tmux window: {result.stderr}"
                )
            logger.info(f"Created new window '{window_name}' in session '{tmux_session}'")

        return {
            "success": True,
            "adw_id": adw_id,
            "worktree_path": worktree_path,
            "tmux_session": tmux_session,
            "window_name": window_name,
            "message": f"Opened neovim in tmux session '{tmux_session}' window '{window_name}'"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening codebase for {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open codebase: {str(e)}"
        )


@router.post("/worktree/open/{adw_id}")
async def open_worktree(adw_id: str):
    """
    Open the worktree in WezTerm with a tmux session.

    Creates or attaches to an AgenticKanban tmux session and opens a terminal
    at the worktree path for the specified ADW.

    Args:
        adw_id: The ADW identifier (8-character alphanumeric string)

    Returns:
        JSON response with success status and details
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

        worktree_path = state_data.get("worktree_path")
        if not worktree_path:
            raise HTTPException(
                status_code=404,
                detail=f"Worktree path not found for ADW ID '{adw_id}'"
            )

        if not os.path.exists(worktree_path):
            raise HTTPException(
                status_code=404,
                detail=f"Worktree not found at path: {worktree_path}"
            )

        logger.info(f"Opening worktree for ADW {adw_id} at {worktree_path}")

        # Tmux session name for AgenticKanban
        tmux_session = "AgenticKanban"
        window_name = f"term-{adw_id}"

        # Check if tmux session exists
        check_session = subprocess.run(
            ["tmux", "has-session", "-t", tmux_session],
            capture_output=True
        )

        if check_session.returncode != 0:
            # Create new tmux session with shell at worktree path
            result = subprocess.run(
                ["tmux", "new-session", "-d", "-s", tmux_session, "-n", window_name,
                 "-c", worktree_path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create tmux session: {result.stderr}"
                )
            logger.info(f"Created new tmux session '{tmux_session}' at {worktree_path}")
        else:
            # Session exists, create new window
            result = subprocess.run(
                ["tmux", "new-window", "-t", tmux_session, "-n", window_name,
                 "-c", worktree_path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create tmux window: {result.stderr}"
                )
            logger.info(f"Created new window '{window_name}' in session '{tmux_session}'")

        # Open WezTerm and attach to the tmux session
        try:
            # Use WezTerm to attach to the tmux session
            # The 'wezterm start' command opens a new WezTerm window
            result = subprocess.Popen(
                ["wezterm", "start", "--", "tmux", "attach-session", "-t", tmux_session],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            logger.info(f"Started WezTerm attached to tmux session '{tmux_session}'")
        except FileNotFoundError:
            # WezTerm not found, log warning but don't fail
            # The tmux session is still created
            logger.warning("WezTerm not found, tmux session created but terminal not opened")

        return {
            "success": True,
            "adw_id": adw_id,
            "worktree_path": worktree_path,
            "tmux_session": tmux_session,
            "window_name": window_name,
            "message": f"Opened terminal in tmux session '{tmux_session}' window '{window_name}'"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening worktree for {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open worktree: {str(e)}"
        )
