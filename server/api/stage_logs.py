"""
Stage-specific logs API endpoint for ADW workflows.
Fetches logs from agents/{adw_id}/{stage_folder} directories.
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Stage name to folder name mapping
STAGE_TO_FOLDERS = {
    "plan": ["sdlc_planner", "adw_plan_iso", "planner"],
    "build": ["sdlc_implementor", "adw_build_iso", "implementor", "sdlc_implementor_committer"],
    "test": ["tester", "adw_test_iso"],
    "review": ["reviewer", "adw_review_iso"],
    "document": ["documenter", "adw_document_iso", "ops"],
}

class LogEntry(BaseModel):
    """Individual log entry from JSONL file with structured fields"""
    timestamp: Optional[str] = None
    level: Optional[str] = None
    message: Optional[str] = None
    current_step: Optional[str] = None
    details: Optional[str] = None
    event_category: Optional[str] = None  # hook, response, status
    event_type: Optional[str] = None  # PreToolUse, ToolUseBlock, TextBlock, ThinkingBlock
    summary: Optional[str] = None  # 15-word AI-generated summary (future enhancement)
    payload: Optional[Dict[str, Any]] = None  # Event metadata (tool names, params, file changes)
    raw_data: Optional[Dict[str, Any]] = None

class StageLogsResponse(BaseModel):
    """Response format for stage logs endpoint"""
    adw_id: str
    stage: str
    logs: List[LogEntry]
    result: Optional[Dict[str, Any]] = None
    stage_folder: Optional[str] = None
    has_streaming_logs: bool = False
    has_result: bool = False
    error: Optional[str] = None

def get_agents_directory() -> Path:
    """
    Get the path to the agents directory.
    Handles both main project and worktree environments.
    """
    current_file = Path(__file__).resolve()
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

def find_stage_folder(adw_dir: Path, stage: str) -> Optional[Path]:
    """
    Find the folder for a given stage in the ADW directory.
    Returns the first matching folder based on STAGE_TO_FOLDERS mapping.

    Args:
        adw_dir: Path to the ADW directory (agents/{adw_id})
        stage: Stage name (plan, build, test, review, document)

    Returns:
        Path to the stage folder, or None if not found
    """
    possible_folders = STAGE_TO_FOLDERS.get(stage.lower(), [])

    for folder_name in possible_folders:
        folder_path = adw_dir / folder_name
        if folder_path.exists() and folder_path.is_dir():
            logger.info(f"Found stage folder: {folder_path}")
            return folder_path

    # Also check for pattern-based folders (e.g., e2e_test_runner_*, test_resolver_*)
    if stage.lower() == "test":
        for item in adw_dir.iterdir():
            if item.is_dir() and (item.name.startswith("e2e_test_runner_") or item.name.startswith("test_resolver_")):
                logger.info(f"Found test folder (pattern match): {item}")
                return item

    if stage.lower() == "review":
        for item in adw_dir.iterdir():
            if item.is_dir() and item.name.startswith("in_loop_review_"):
                logger.info(f"Found review folder (pattern match): {item}")
                return item

    logger.warning(f"No folder found for stage '{stage}' in {adw_dir}")
    return None

def parse_jsonl_logs(jsonl_file: Path) -> List[LogEntry]:
    """
    Parse JSONL file and extract log entries.

    Args:
        jsonl_file: Path to the raw_output.jsonl file

    Returns:
        List of LogEntry objects
    """
    logs = []

    try:
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    data = json.loads(line)

                    # Extract relevant fields for log entry with structured event data
                    log_entry = LogEntry(
                        timestamp=data.get('timestamp'),
                        level=data.get('level', 'INFO'),
                        message=data.get('message') or data.get('content') or str(data),
                        current_step=data.get('current_step'),
                        details=data.get('details'),
                        event_category=data.get('event_category'),  # hook, response, status
                        event_type=data.get('event_type'),  # PreToolUse, ToolUseBlock, etc.
                        summary=data.get('summary'),  # AI-generated summary if available
                        payload=data.get('payload'),  # Event metadata
                        raw_data=data
                    )
                    logs.append(log_entry)

                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse line {line_num} in {jsonl_file}: {e}")
                    # Add as plain text entry
                    logs.append(LogEntry(
                        message=line,
                        level="INFO",
                        raw_data={"parse_error": str(e), "raw_line": line}
                    ))

    except Exception as e:
        logger.error(f"Error reading JSONL file {jsonl_file}: {e}")
        raise

    return logs

def parse_result_json(json_file: Path) -> Optional[Dict[str, Any]]:
    """
    Parse the final result JSON file.

    Args:
        json_file: Path to the raw_output.json file

    Returns:
        Dictionary containing the result, or None if file doesn't exist or is invalid
    """
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            result_data = json.load(f)
        return result_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON file {json_file}: {e}")
        return {"error": f"Failed to parse JSON: {e}"}
    except Exception as e:
        logger.error(f"Error reading JSON file {json_file}: {e}")
        return None

@router.get("/api/stage-logs/{adw_id}/{stage}", response_model=StageLogsResponse)
async def get_stage_logs(adw_id: str, stage: str) -> StageLogsResponse:
    """
    Get stage-specific logs for an ADW workflow.

    Args:
        adw_id: Unique workflow identifier (8-character string)
        stage: Stage name (plan, build, test, review, document)

    Returns:
        StageLogsResponse containing logs and result data

    Raises:
        HTTPException: If ADW ID or stage is invalid, or logs cannot be found
    """
    # Validate adw_id format (should be 8 characters)
    if not adw_id or len(adw_id) != 8:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Expected 8-character identifier."
        )

    # Validate stage name
    valid_stages = list(STAGE_TO_FOLDERS.keys())
    if stage.lower() not in valid_stages:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage: {stage}. Must be one of {valid_stages}"
        )

    # Get agents directory
    agents_dir = get_agents_directory()

    if not agents_dir.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Agents directory not found at {agents_dir}"
        )

    # Get ADW directory
    adw_dir = agents_dir / adw_id

    if not adw_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"ADW directory not found: {adw_id}"
        )

    # Find stage folder
    stage_folder = find_stage_folder(adw_dir, stage)

    if not stage_folder:
        # Return empty response if stage folder doesn't exist (stage not executed yet)
        return StageLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=[],
            result=None,
            stage_folder=None,
            has_streaming_logs=False,
            has_result=False,
            error=f"Stage '{stage}' not found or not executed yet"
        )

    # Read streaming logs (raw_output.jsonl)
    jsonl_file = stage_folder / "raw_output.jsonl"
    logs = []
    has_streaming_logs = False

    if jsonl_file.exists():
        try:
            logs = parse_jsonl_logs(jsonl_file)
            has_streaming_logs = True
            logger.info(f"Parsed {len(logs)} log entries from {jsonl_file}")
        except Exception as e:
            logger.error(f"Failed to parse JSONL logs: {e}")
            # Don't fail the request, just log the error

    # Read final result (raw_output.json)
    json_file = stage_folder / "raw_output.json"
    result = None
    has_result = False

    if json_file.exists():
        result = parse_result_json(json_file)
        has_result = result is not None

    return StageLogsResponse(
        adw_id=adw_id,
        stage=stage,
        logs=logs,
        result=result,
        stage_folder=stage_folder.name,
        has_streaming_logs=has_streaming_logs,
        has_result=has_result,
        error=None
    )

@router.get("/api/stage-logs/{adw_id}")
async def get_all_stage_logs(adw_id: str) -> Dict[str, StageLogsResponse]:
    """
    Get logs for all stages of an ADW workflow.

    Args:
        adw_id: Unique workflow identifier (8-character string)

    Returns:
        Dictionary mapping stage names to StageLogsResponse objects
    """
    # Validate adw_id format
    if not adw_id or len(adw_id) != 8:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Expected 8-character identifier."
        )

    # Get agents directory
    agents_dir = get_agents_directory()

    if not agents_dir.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Agents directory not found at {agents_dir}"
        )

    # Get ADW directory
    adw_dir = agents_dir / adw_id

    if not adw_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"ADW directory not found: {adw_id}"
        )

    # Fetch logs for all stages
    all_logs = {}

    for stage in STAGE_TO_FOLDERS.keys():
        try:
            stage_logs = await get_stage_logs(adw_id, stage)
            all_logs[stage] = stage_logs
        except HTTPException as e:
            # Skip stages that don't exist
            if e.status_code == 404:
                all_logs[stage] = StageLogsResponse(
                    adw_id=adw_id,
                    stage=stage,
                    logs=[],
                    result=None,
                    stage_folder=None,
                    has_streaming_logs=False,
                    has_result=False,
                    error=f"Stage not found"
                )
            else:
                raise

    return all_logs
