"""
Stage-specific logs API endpoint for ADW workflows.
Fetches logs from agents/{adw_id}/{stage_folder} directories.
"""
import os
import re
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

# Stage to ISO folder mapping for execution.log
STAGE_TO_ISO_FOLDER = {
    "plan": "adw_plan_iso",
    "build": "adw_build_iso",
    "test": "adw_test_iso",
    "review": "adw_review_iso",
    "document": "adw_document_iso",
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
    # New fields for detailed logs
    entry_type: Optional[str] = None  # system, assistant, user
    subtype: Optional[str] = None  # init, tool_use, tool_result, etc.
    tool_name: Optional[str] = None  # Name of tool being called
    tool_input: Optional[Dict[str, Any]] = None  # Tool call parameters
    usage: Optional[Dict[str, Any]] = None  # Token usage statistics
    session_id: Optional[str] = None  # Agent session identifier
    model: Optional[str] = None  # Model used
    stop_reason: Optional[str] = None  # Stop reason for assistant messages

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


class ExecutionLogEntry(BaseModel):
    """Individual execution log entry parsed from execution.log"""
    timestamp: Optional[str] = None
    level: str = "INFO"
    message: str = ""
    raw_line: Optional[str] = None


class ExecutionLogsResponse(BaseModel):
    """Response format for execution logs endpoint"""
    adw_id: str
    stage: str
    logs: List[ExecutionLogEntry]
    stage_folder: Optional[str] = None
    has_logs: bool = False
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
    Parse JSONL file and extract log entries with full JSONL structure.

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

                    # Extract type and subtype
                    entry_type = data.get('type')  # system, assistant, user, result
                    subtype = data.get('subtype')  # init, tool_use, tool_result, success, error

                    # Extract message/content
                    message = data.get('message', '')

                    # Handle case where message is a dict (assistant messages)
                    if isinstance(message, dict):
                        msg_content = message.get('content', [])
                        if isinstance(msg_content, list):
                            text_parts = []
                            for block in msg_content:
                                if isinstance(block, dict):
                                    if block.get('type') == 'text':
                                        text_parts.append(block.get('text', ''))
                                    elif block.get('type') == 'tool_use':
                                        text_parts.append(f"[Tool: {block.get('name', 'unknown')}]")
                            message = ' '.join(text_parts) if text_parts else ''
                        else:
                            message = ''

                    if not message and 'content' in data:
                        content = data['content']
                        if isinstance(content, str):
                            message = content
                        elif isinstance(content, list):
                            # For assistant messages with content blocks
                            message = ' '.join([
                                block.get('text', '') if isinstance(block, dict) and block.get('type') == 'text'
                                else str(block)
                                for block in content
                            ])

                    # If still no message, use result or type as message
                    if not message:
                        if 'result' in data:
                            message = str(data.get('result'))
                        elif entry_type:
                            message = f"[{entry_type}]" + (f" - {subtype}" if subtype else "")

                    # Extract tool call information
                    tool_name = None
                    tool_input = None

                    if entry_type == 'assistant' and 'message' in data and isinstance(data['message'], dict):
                        msg = data['message']
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for block in content:
                                if isinstance(block, dict) and block.get('type') == 'tool_use':
                                    tool_name = block.get('name')
                                    tool_input = block.get('input', {})
                                    break

                    # Extract usage statistics
                    usage = None
                    if 'usage' in data:
                        usage = data['usage']
                    elif entry_type == 'assistant' and 'message' in data and isinstance(data['message'], dict):
                        usage = data['message'].get('usage')

                    # Extract session_id
                    session_id = data.get('session_id')

                    # Extract model
                    model = data.get('model')
                    if not model and entry_type == 'assistant' and 'message' in data and isinstance(data['message'], dict):
                        model = data['message'].get('model')

                    # Extract stop_reason
                    stop_reason = None
                    if entry_type == 'assistant' and 'message' in data and isinstance(data['message'], dict):
                        stop_reason = data['message'].get('stop_reason')

                    # Determine log level
                    level = data.get('level', 'INFO')
                    if subtype == 'error' or data.get('is_error'):
                        level = 'ERROR'
                    elif entry_type == 'result':
                        level = 'SUCCESS' if subtype == 'success' else 'ERROR'
                    elif entry_type == 'system':
                        level = 'INFO'

                    # Create log entry with all fields
                    log_entry = LogEntry(
                        timestamp=data.get('timestamp'),
                        level=level,
                        message=message,
                        current_step=data.get('current_step'),
                        details=data.get('details'),
                        raw_data=data,
                        entry_type=entry_type,
                        subtype=subtype,
                        tool_name=tool_name,
                        tool_input=tool_input,
                        usage=usage,
                        session_id=session_id,
                        model=model,
                        stop_reason=stop_reason
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

@router.get("/api/agent-state/{adw_id}")
async def get_agent_state(adw_id: str) -> Dict[str, Any]:
    """
    Get the adw_state.json file for an ADW workflow.

    Args:
        adw_id: Unique workflow identifier (8-character string)

    Returns:
        Dictionary containing the agent state metadata

    Raises:
        HTTPException: If ADW ID is invalid or state file cannot be found
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

    # Read adw_state.json
    state_file = adw_dir / "adw_state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Agent state file not found for ADW: {adw_id}"
        )

    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            state_data = json.load(f)
        return state_data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse agent state file {state_file}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse agent state file: {e}"
        )
    except Exception as e:
        logger.error(f"Error reading agent state file {state_file}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error reading agent state file: {e}"
        )


def parse_execution_log(log_file: Path) -> List[ExecutionLogEntry]:
    """
    Parse execution.log file and extract log entries.

    Format: "2025-11-28 21:49:19 - INFO - message"

    Args:
        log_file: Path to the execution.log file

    Returns:
        List of ExecutionLogEntry objects
    """
    logs = []

    # Pattern to match: timestamp - LEVEL - message
    log_pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+-\s+(\w+)\s+-\s+(.*)$'
    )

    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.rstrip('\n')
                if not line:
                    continue

                match = log_pattern.match(line)
                if match:
                    timestamp, level, message = match.groups()
                    logs.append(ExecutionLogEntry(
                        timestamp=timestamp,
                        level=level.upper(),
                        message=message,
                        raw_line=line
                    ))
                else:
                    # Line doesn't match expected format, add as raw message
                    logs.append(ExecutionLogEntry(
                        message=line,
                        level="INFO",
                        raw_line=line
                    ))

    except Exception as e:
        logger.error(f"Error reading execution log file {log_file}: {e}")
        raise

    return logs


@router.get("/api/execution-logs/{adw_id}/{stage}", response_model=ExecutionLogsResponse)
async def get_execution_logs(adw_id: str, stage: str) -> ExecutionLogsResponse:
    """
    Get execution.log content for a specific stage.

    Args:
        adw_id: Unique workflow identifier (8-character string)
        stage: Stage name (plan, build, test, review, document)

    Returns:
        ExecutionLogsResponse containing parsed execution logs

    Raises:
        HTTPException: If ADW ID or stage is invalid
    """
    # Validate adw_id format (should be 8 characters)
    if not adw_id or len(adw_id) != 8:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Expected 8-character identifier."
        )

    # Validate stage name
    valid_stages = list(STAGE_TO_ISO_FOLDER.keys())
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

    # Get the ISO folder for this stage
    iso_folder_name = STAGE_TO_ISO_FOLDER.get(stage.lower())
    if not iso_folder_name:
        return ExecutionLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=[],
            stage_folder=None,
            has_logs=False,
            error=f"No ISO folder mapping for stage: {stage}"
        )

    iso_folder = adw_dir / iso_folder_name

    if not iso_folder.exists():
        return ExecutionLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=[],
            stage_folder=iso_folder_name,
            has_logs=False,
            error=f"ISO folder not found: {iso_folder_name}"
        )

    # Read execution.log
    log_file = iso_folder / "execution.log"

    if not log_file.exists():
        return ExecutionLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=[],
            stage_folder=iso_folder_name,
            has_logs=False,
            error=f"Execution log not found in {iso_folder_name}"
        )

    try:
        logs = parse_execution_log(log_file)
        logger.info(f"Parsed {len(logs)} execution log entries from {log_file}")
        return ExecutionLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=logs,
            stage_folder=iso_folder_name,
            has_logs=True,
            error=None
        )
    except Exception as e:
        logger.error(f"Failed to parse execution logs: {e}")
        return ExecutionLogsResponse(
            adw_id=adw_id,
            stage=stage,
            logs=[],
            stage_folder=iso_folder_name,
            has_logs=False,
            error=f"Failed to parse execution log: {e}"
        )
