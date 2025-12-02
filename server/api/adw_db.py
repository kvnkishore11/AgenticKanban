"""
ADW Database API endpoints.

Provides CRUD operations for ADW states backed by SQLite database.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel

try:
    from ..core.database import get_db_manager
    from ..models.adw_db_models import (
        ADWStateCreate,
        ADWStateUpdate,
        ADWStateResponse,
        ADWListResponse,
        ADWActivityLogCreate,
        ADWActivityLogResponse,
        ADWActivityHistoryResponse,
        HealthCheckResponse,
    )
except ImportError:
    from core.database import get_db_manager
    from models.adw_db_models import (
        ADWStateCreate,
        ADWStateUpdate,
        ADWStateResponse,
        ADWListResponse,
        ADWActivityLogCreate,
        ADWActivityLogResponse,
        ADWActivityHistoryResponse,
        HealthCheckResponse,
    )

logger = logging.getLogger(__name__)

router = APIRouter()


def dict_to_adw_response(row_dict: Dict[str, Any]) -> ADWStateResponse:
    """Convert database row dict to ADWStateResponse."""
    # Parse JSON fields
    issue_json = None
    if row_dict.get('issue_json'):
        try:
            issue_json = json.loads(row_dict['issue_json'])
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse issue_json for ADW {row_dict.get('adw_id')}")

    orchestrator_state = None
    if row_dict.get('orchestrator_state'):
        try:
            orchestrator_state = json.loads(row_dict['orchestrator_state'])
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse orchestrator_state for ADW {row_dict.get('adw_id')}")

    # Parse datetime fields
    created_at = row_dict.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

    updated_at = row_dict.get('updated_at')
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))

    completed_at = row_dict.get('completed_at')
    if completed_at and isinstance(completed_at, str):
        completed_at = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))

    return ADWStateResponse(
        id=row_dict['id'],
        adw_id=row_dict['adw_id'],
        issue_number=row_dict.get('issue_number'),
        issue_title=row_dict.get('issue_title'),
        issue_class=row_dict.get('issue_class'),
        branch_name=row_dict.get('branch_name'),
        worktree_path=row_dict.get('worktree_path'),
        current_stage=row_dict['current_stage'],
        status=row_dict['status'],
        is_stuck=bool(row_dict['is_stuck']),
        workflow_name=row_dict.get('workflow_name'),
        model_set=row_dict.get('model_set', 'base'),
        data_source=row_dict.get('data_source', 'kanban'),
        issue_json=issue_json,
        orchestrator_state=orchestrator_state,
        created_at=created_at,
        updated_at=updated_at,
        completed_at=completed_at
    )


@router.post("/adws", response_model=ADWStateResponse, status_code=201)
async def create_adw(adw_data: ADWStateCreate, request: Request):
    """
    Create a new ADW state record in the database.

    Args:
        adw_data: ADW state creation data
        request: FastAPI request object

    Returns:
        Created ADW state
    """
    db_manager = get_db_manager()

    try:
        # Check if ADW ID already exists
        existing = db_manager.execute_query(
            "SELECT id FROM adw_states WHERE adw_id = ?",
            (adw_data.adw_id,)
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"ADW with ID {adw_data.adw_id} already exists"
            )

        # Validate issue_number uniqueness if provided
        if adw_data.issue_number is not None:
            # Check if issue_number already exists in issue_tracker
            existing_issue = db_manager.execute_query(
                "SELECT id FROM issue_tracker WHERE issue_number = ? AND deleted_at IS NULL",
                (adw_data.issue_number,)
            )
            if existing_issue:
                raise HTTPException(
                    status_code=409,
                    detail=f"Issue number {adw_data.issue_number} already exists in issue_tracker"
                )

        # Prepare JSON fields
        issue_json_str = json.dumps(adw_data.issue_json) if adw_data.issue_json else None
        orchestrator_state_str = json.dumps(adw_data.orchestrator_state) if adw_data.orchestrator_state else None

        # Insert ADW state
        query = """
            INSERT INTO adw_states (
                adw_id, issue_number, issue_title, issue_body, issue_class,
                branch_name, worktree_path, current_stage, status,
                workflow_name, model_set, data_source, issue_json,
                orchestrator_state, backend_port, websocket_port, frontend_port
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            adw_data.adw_id,
            adw_data.issue_number,
            adw_data.issue_title,
            adw_data.issue_body,
            adw_data.issue_class,
            adw_data.branch_name,
            adw_data.worktree_path,
            adw_data.current_stage,
            adw_data.status,
            adw_data.workflow_name,
            adw_data.model_set,
            adw_data.data_source,
            issue_json_str,
            orchestrator_state_str,
            adw_data.backend_port,
            adw_data.websocket_port,
            adw_data.frontend_port
        )

        row_id = db_manager.execute_insert(query, params)

        # Log creation activity
        log_query = """
            INSERT INTO adw_activity_logs (adw_id, event_type, event_data)
            VALUES (?, ?, ?)
        """
        log_data = json.dumps({"created_from": "api", "timestamp": datetime.utcnow().isoformat()})
        db_manager.execute_insert(log_query, (adw_data.adw_id, "workflow_started", log_data))

        # Fetch the created ADW
        created_adw = db_manager.execute_query(
            "SELECT * FROM adw_states WHERE id = ?",
            (row_id,)
        )[0]

        # Broadcast WebSocket notification
        ws_manager = getattr(request.app.state, "ws_manager", None)
        if ws_manager:
            try:
                await ws_manager.broadcast_system_log(
                    message=f"ADW {adw_data.adw_id} created",
                    level="SUCCESS",
                    context={
                        "adw_id": adw_data.adw_id,
                        "event_type": "adw_created",
                        "issue_number": adw_data.issue_number
                    }
                )
            except Exception as e:
                logger.error(f"Error broadcasting WebSocket notification: {e}")

        logger.info(f"Created ADW {adw_data.adw_id}")
        return dict_to_adw_response(created_adw)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ADW: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/adws", response_model=ADWListResponse)
async def list_adws(
    status: Optional[str] = Query(None, description="Filter by status"),
    stage: Optional[str] = Query(None, description="Filter by current stage"),
    is_stuck: Optional[bool] = Query(None, description="Filter by stuck status"),
    include_deleted: bool = Query(False, description="Include soft-deleted ADWs")
):
    """
    List all ADWs with optional filtering.

    Args:
        status: Filter by status (pending, in_progress, completed, errored, stuck)
        stage: Filter by current stage
        is_stuck: Filter by stuck status
        include_deleted: Include soft-deleted ADWs

    Returns:
        List of ADWs matching filters
    """
    db_manager = get_db_manager()

    try:
        # Build query with filters
        query = "SELECT * FROM adw_states WHERE 1=1"
        params = []

        if not include_deleted:
            query += " AND deleted_at IS NULL"

        if status:
            query += " AND status = ?"
            params.append(status)

        if stage:
            query += " AND current_stage = ?"
            params.append(stage)

        if is_stuck is not None:
            query += " AND is_stuck = ?"
            params.append(1 if is_stuck else 0)

        query += " ORDER BY created_at DESC"

        results = db_manager.execute_query(query, tuple(params))

        adws = [dict_to_adw_response(row) for row in results]

        filters_applied = {}
        if status:
            filters_applied['status'] = status
        if stage:
            filters_applied['stage'] = stage
        if is_stuck is not None:
            filters_applied['is_stuck'] = is_stuck

        return ADWListResponse(
            adws=adws,
            total_count=len(adws),
            filters_applied=filters_applied if filters_applied else None
        )

    except Exception as e:
        logger.error(f"Error listing ADWs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/adws/{adw_id}", response_model=ADWStateResponse)
async def get_adw(adw_id: str):
    """
    Get a single ADW by ID.

    Args:
        adw_id: ADW identifier

    Returns:
        ADW state
    """
    db_manager = get_db_manager()

    try:
        results = db_manager.execute_query(
            "SELECT * FROM adw_states WHERE adw_id = ? AND deleted_at IS NULL",
            (adw_id,)
        )

        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"ADW {adw_id} not found"
            )

        return dict_to_adw_response(results[0])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ADW {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.patch("/adws/{adw_id}", response_model=ADWStateResponse)
async def update_adw(adw_id: str, update_data: ADWStateUpdate, request: Request):
    """
    Update an ADW state.

    Args:
        adw_id: ADW identifier
        update_data: Fields to update
        request: FastAPI request object

    Returns:
        Updated ADW state
    """
    db_manager = get_db_manager()

    try:
        # Check if ADW exists
        existing = db_manager.execute_query(
            "SELECT * FROM adw_states WHERE adw_id = ? AND deleted_at IS NULL",
            (adw_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"ADW {adw_id} not found"
            )

        # Build update query
        update_fields = []
        params = []

        if update_data.current_stage is not None:
            update_fields.append("current_stage = ?")
            params.append(update_data.current_stage)

        if update_data.status is not None:
            update_fields.append("status = ?")
            params.append(update_data.status)

        if update_data.is_stuck is not None:
            update_fields.append("is_stuck = ?")
            params.append(1 if update_data.is_stuck else 0)

        if update_data.issue_title is not None:
            update_fields.append("issue_title = ?")
            params.append(update_data.issue_title)

        if update_data.issue_body is not None:
            update_fields.append("issue_body = ?")
            params.append(update_data.issue_body)

        if update_data.issue_class is not None:
            update_fields.append("issue_class = ?")
            params.append(update_data.issue_class)

        if update_data.branch_name is not None:
            update_fields.append("branch_name = ?")
            params.append(update_data.branch_name)

        if update_data.worktree_path is not None:
            update_fields.append("worktree_path = ?")
            params.append(update_data.worktree_path)

        if update_data.workflow_name is not None:
            update_fields.append("workflow_name = ?")
            params.append(update_data.workflow_name)

        if update_data.orchestrator_state is not None:
            update_fields.append("orchestrator_state = ?")
            params.append(json.dumps(update_data.orchestrator_state))

        if update_data.patch_file is not None:
            update_fields.append("patch_file = ?")
            params.append(update_data.patch_file)

        if update_data.patch_history is not None:
            update_fields.append("patch_history = ?")
            params.append(json.dumps(update_data.patch_history))

        if update_data.completed_at is not None:
            update_fields.append("completed_at = ?")
            params.append(update_data.completed_at.isoformat())
            # Also set status to completed
            if "status = ?" not in update_fields:
                update_fields.append("status = ?")
                params.append("completed")

        if not update_fields:
            # No fields to update, just return current state
            return dict_to_adw_response(existing[0])

        # Execute update
        query = f"UPDATE adw_states SET {', '.join(update_fields)} WHERE adw_id = ?"
        params.append(adw_id)

        db_manager.execute_update(query, tuple(params))

        # Fetch updated ADW
        updated = db_manager.execute_query(
            "SELECT * FROM adw_states WHERE adw_id = ?",
            (adw_id,)
        )[0]

        # Broadcast WebSocket notification
        ws_manager = getattr(request.app.state, "ws_manager", None)
        if ws_manager:
            try:
                await ws_manager.broadcast_system_log(
                    message=f"ADW {adw_id} updated",
                    level="INFO",
                    context={
                        "adw_id": adw_id,
                        "event_type": "adw_updated",
                        "updated_fields": list(update_data.model_dump(exclude_none=True).keys())
                    }
                )
            except Exception as e:
                logger.error(f"Error broadcasting WebSocket notification: {e}")

        logger.info(f"Updated ADW {adw_id}")
        return dict_to_adw_response(updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ADW {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/adws/{adw_id}/activity", status_code=201)
async def log_activity(adw_id: str, activity_data: ADWActivityLogCreate):
    """
    Log an activity event for an ADW.

    Args:
        adw_id: ADW identifier
        activity_data: Activity log data

    Returns:
        Created activity log entry
    """
    db_manager = get_db_manager()

    try:
        # Verify ADW exists
        existing = db_manager.execute_query(
            "SELECT id FROM adw_states WHERE adw_id = ?",
            (adw_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"ADW {adw_id} not found"
            )

        # Prepare JSON event_data
        event_data_str = json.dumps(activity_data.event_data) if activity_data.event_data else None

        # Insert activity log
        query = """
            INSERT INTO adw_activity_logs (
                adw_id, event_type, event_data, field_changed,
                old_value, new_value, user, workflow_step
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            adw_id,
            activity_data.event_type,
            event_data_str,
            activity_data.field_changed,
            activity_data.old_value,
            activity_data.new_value,
            activity_data.user,
            activity_data.workflow_step
        )

        row_id = db_manager.execute_insert(query, params)

        logger.info(f"Logged activity for ADW {adw_id}: {activity_data.event_type}")

        return {"id": row_id, "message": "Activity logged successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging activity for ADW {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/adws/{adw_id}/activity", response_model=ADWActivityHistoryResponse)
async def get_activity_history(
    adw_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    """
    Get activity history for an ADW with pagination.

    Args:
        adw_id: ADW identifier
        page: Page number (1-indexed)
        page_size: Number of items per page

    Returns:
        Paginated activity history
    """
    db_manager = get_db_manager()

    try:
        # Verify ADW exists
        existing = db_manager.execute_query(
            "SELECT id FROM adw_states WHERE adw_id = ?",
            (adw_id,)
        )
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"ADW {adw_id} not found"
            )

        # Get total count
        count_result = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM adw_activity_logs WHERE adw_id = ?",
            (adw_id,)
        )
        total_count = count_result[0]['count']

        # Get paginated activities
        offset = (page - 1) * page_size
        query = """
            SELECT * FROM adw_activity_logs
            WHERE adw_id = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        """

        results = db_manager.execute_query(query, (adw_id, page_size, offset))

        activities = []
        for row in results:
            event_data = None
            if row.get('event_data'):
                try:
                    event_data = json.loads(row['event_data'])
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse event_data for activity {row['id']}")

            timestamp = row.get('timestamp')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

            activities.append(ADWActivityLogResponse(
                id=row['id'],
                adw_id=row['adw_id'],
                event_type=row['event_type'],
                event_data=event_data,
                field_changed=row.get('field_changed'),
                old_value=row.get('old_value'),
                new_value=row.get('new_value'),
                user=row.get('user'),
                workflow_step=row.get('workflow_step'),
                timestamp=timestamp
            ))

        return ADWActivityHistoryResponse(
            adw_id=adw_id,
            activities=activities,
            total_count=total_count,
            page=page,
            page_size=page_size
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activity history for ADW {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Check database health and connectivity.

    Returns:
        Health check status
    """
    db_manager = get_db_manager()
    health_data = db_manager.health_check()

    return HealthCheckResponse(**health_data)


@router.post("/adws/{adw_id}/detect-stuck")
async def detect_stuck_workflows(adw_id: Optional[str] = None):
    """
    Detect and flag stuck workflows.

    Flags workflows as stuck if:
    - In same stage for > 30 minutes with no activity
    - Last activity shows error

    Args:
        adw_id: Optional specific ADW ID to check (if None, checks all)

    Returns:
        Count of stuck workflows detected
    """
    db_manager = get_db_manager()

    try:
        # Calculate timestamp for 30 minutes ago
        threshold_time = datetime.utcnow() - timedelta(minutes=30)

        if adw_id:
            # Check specific ADW
            query = """
                UPDATE adw_states
                SET is_stuck = 1
                WHERE adw_id = ?
                AND status = 'in_progress'
                AND updated_at < ?
                AND is_stuck = 0
            """
            params = (adw_id, threshold_time.isoformat())
        else:
            # Check all ADWs
            query = """
                UPDATE adw_states
                SET is_stuck = 1
                WHERE status = 'in_progress'
                AND updated_at < ?
                AND is_stuck = 0
            """
            params = (threshold_time.isoformat(),)

        count = db_manager.execute_update(query, params)

        logger.info(f"Detected {count} stuck workflows")

        return {"stuck_count": count, "message": f"Flagged {count} workflows as stuck"}

    except Exception as e:
        logger.error(f"Error detecting stuck workflows: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
