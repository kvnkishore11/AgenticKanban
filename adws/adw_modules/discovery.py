"""ADW discovery module for listing and retrieving ADW metadata.

Database-Only Mode (ADW_DB_ONLY=true, default):
- All discovery queries go directly to SQLite database
- No filesystem scanning

Dual-Write Mode (ADW_DB_ONLY=false):
- Falls back to filesystem scanning if database unavailable
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Any
from adw_modules.state import ADWState

# Database imports
try:
    import sqlite3
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


logger = logging.getLogger(__name__)


def get_agents_directory() -> str:
    """Get the path to the agents directory."""
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return os.path.join(project_root, "agents")


def _get_db_path() -> Optional[Path]:
    """Get path to the database file."""
    if not DB_AVAILABLE:
        return None

    try:
        project_root = Path(os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ))

        # Check if we're in a worktree
        path_parts = project_root.parts
        if 'trees' in path_parts:
            trees_index = path_parts.index('trees')
            main_project_root = Path(*path_parts[:trees_index])
            db_path = main_project_root / "adws" / "database" / "agentickanban.db"
        else:
            db_path = project_root / "adws" / "database" / "agentickanban.db"

        return db_path if db_path.exists() else None
    except Exception as e:
        logger.debug(f"Error getting database path: {e}")
        return None


def _discover_from_database() -> List[Dict[str, Any]]:
    """Discover all ADWs from database.

    Returns:
        List of ADW metadata dictionaries
    """
    db_path = _get_db_path()
    if not db_path:
        return []

    try:
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Query all non-deleted ADWs
        cursor.execute("""
            SELECT * FROM adw_states
            WHERE deleted_at IS NULL
            ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        adw_list = []
        for row in rows:
            row_dict = dict(row)

            # Parse JSON fields
            issue_json = None
            if row_dict.get("issue_json"):
                try:
                    issue_json = json.loads(row_dict["issue_json"])
                except json.JSONDecodeError:
                    pass

            all_adws = []
            if row_dict.get("all_adws"):
                try:
                    all_adws = json.loads(row_dict["all_adws"])
                except json.JSONDecodeError:
                    pass

            # Extract issue details
            issue_title = row_dict.get("issue_title")
            issue_body = row_dict.get("issue_body")
            if not issue_title and issue_json:
                issue_title = issue_json.get("title")
                issue_body = issue_json.get("body")

            adw_list.append({
                "adw_id": row_dict.get("adw_id"),
                "issue_number": row_dict.get("issue_number"),
                "issue_class": row_dict.get("issue_class"),
                "issue_title": issue_title,
                "issue_body": issue_body,
                "branch_name": row_dict.get("branch_name"),
                "plan_file": row_dict.get("plan_file"),
                "model_set": row_dict.get("model_set", "base"),
                "backend_port": row_dict.get("backend_port"),
                "websocket_port": row_dict.get("websocket_port"),
                "frontend_port": row_dict.get("frontend_port"),
                "data_source": row_dict.get("data_source", "kanban"),
                "worktree_path": row_dict.get("worktree_path"),
                "all_adws": all_adws,
                "current_stage": row_dict.get("current_stage", "backlog"),
                "status": row_dict.get("status", "pending"),
                "is_stuck": bool(row_dict.get("is_stuck", 0)),
                "created_at": row_dict.get("created_at"),
                "updated_at": row_dict.get("updated_at"),
            })

        return adw_list

    except Exception as e:
        logger.error(f"Error discovering ADWs from database: {e}")
        return []


def _discover_from_filesystem() -> List[Dict[str, Any]]:
    """Discover all ADWs from filesystem (legacy fallback).

    Returns:
        List of ADW metadata dictionaries
    """
    agents_dir = get_agents_directory()

    if not os.path.exists(agents_dir):
        logger.warning(f"Agents directory does not exist: {agents_dir}")
        return []

    adw_list = []

    try:
        for entry in os.scandir(agents_dir):
            if entry.is_dir():
                adw_id = entry.name

                # Try to load state for this ADW ID
                state = ADWState.load(adw_id, logger=logger)

                if state is not None:
                    adw_metadata = format_adw_response(state.data)
                    adw_list.append(adw_metadata)
                else:
                    logger.debug(f"Skipping {adw_id}: no valid state file")

    except Exception as e:
        logger.error(f"Error scanning agents directory: {e}")

    adw_list.sort(key=lambda x: x.get('adw_id', ''), reverse=True)
    return adw_list


def discover_all_adws() -> List[Dict[str, Any]]:
    """Discover all ADWs from database (primary) or filesystem (fallback).

    In database-only mode (ADW_DB_ONLY=true, default):
    - Queries the SQLite database directly
    - No filesystem scanning

    In dual-write mode (ADW_DB_ONLY=false):
    - Tries database first
    - Falls back to filesystem scanning if database unavailable

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
        - issue_title: Optional[str]
        - current_stage: str
        - status: str
        - is_stuck: bool
    """
    db_only_mode = os.getenv("ADW_DB_ONLY", "true").lower() == "true" and DB_AVAILABLE

    # Try database first (primary source)
    adw_list = _discover_from_database()
    if adw_list:
        logger.info(f"Discovered {len(adw_list)} ADWs from database")
        return adw_list

    # In database-only mode, return empty if database fails
    if db_only_mode:
        logger.warning("Database discovery failed in db-only mode")
        return []

    # Fallback to filesystem (dual-write mode only)
    logger.info("Falling back to filesystem discovery")
    return _discover_from_filesystem()


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
