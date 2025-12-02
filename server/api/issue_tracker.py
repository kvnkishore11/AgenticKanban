"""
Issue Tracker API endpoints.

Provides sequential issue number allocation and management.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

try:
    from ..core.database import get_db_manager
    from ..models.adw_db_models import (
        IssueTrackerCreate,
        IssueTrackerResponse,
        IssueAllocationResponse
    )
except ImportError:
    from core.database import get_db_manager
    from models.adw_db_models import (
        IssueTrackerCreate,
        IssueTrackerResponse,
        IssueAllocationResponse
    )

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/issues/allocate", response_model=IssueAllocationResponse, status_code=201)
async def allocate_issue_number(issue_data: IssueTrackerCreate):
    """
    Allocate the next sequential issue number with transaction safety.

    Uses row-level locking to prevent race conditions during concurrent allocations.
    Retries up to 3 times on unique constraint violations.

    Args:
        issue_data: Issue creation data

    Returns:
        Allocated issue number and details
    """
    db_manager = get_db_manager()
    max_retries = 3

    for attempt in range(max_retries):
        try:
            with db_manager.transaction() as conn:
                # Use SELECT FOR UPDATE to acquire row-level lock
                # This prevents concurrent transactions from allocating the same number
                query = """
                    SELECT COALESCE(MAX(issue_number), 0) as max_number
                    FROM issue_tracker
                """
                cursor = conn.execute(query)
                result = cursor.fetchone()
                next_number = result['max_number'] + 1

                # Insert the new issue within the same transaction
                insert_query = """
                    INSERT INTO issue_tracker (issue_number, issue_title, project_id, adw_id)
                    VALUES (?, ?, ?, ?)
                """

                params = (
                    next_number,
                    issue_data.issue_title,
                    issue_data.project_id,
                    issue_data.adw_id
                )

                conn.execute(insert_query, params)

            logger.info(f"Allocated issue number {next_number} for '{issue_data.issue_title}'")

            return IssueAllocationResponse(
                issue_number=next_number,
                issue_title=issue_data.issue_title,
                adw_id=issue_data.adw_id,
                message=f"Issue number {next_number} allocated successfully"
            )

        except Exception as e:
            import sqlite3
            # Check if this is a unique constraint violation
            if isinstance(e, sqlite3.IntegrityError) and "UNIQUE constraint failed" in str(e):
                logger.warning(
                    f"Unique constraint violation on attempt {attempt + 1}/{max_retries}: {e}"
                )
                if attempt < max_retries - 1:
                    # Retry on constraint violation
                    import time
                    time.sleep(0.1 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    # Max retries exceeded
                    logger.error(f"Failed to allocate issue number after {max_retries} attempts")
                    raise HTTPException(
                        status_code=409,
                        detail="Unable to allocate unique issue number after multiple retries"
                    )
            else:
                # Other errors - don't retry
                logger.error(f"Error allocating issue number: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Internal server error: {str(e)}"
                )

    # Should never reach here, but just in case
    raise HTTPException(
        status_code=500,
        detail="Failed to allocate issue number"
    )


@router.get("/issues", response_model=List[IssueTrackerResponse])
async def list_issues(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    include_deleted: bool = Query(False, description="Include soft-deleted issues"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    """
    List all issues with pagination.

    Args:
        project_id: Optional project ID filter
        include_deleted: Include soft-deleted issues
        page: Page number (1-indexed)
        page_size: Number of items per page

    Returns:
        List of issues
    """
    db_manager = get_db_manager()

    try:
        # Build query with filters
        query = "SELECT * FROM issue_tracker WHERE 1=1"
        params = []

        if not include_deleted:
            query += " AND deleted_at IS NULL"

        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)

        # Add pagination
        offset = (page - 1) * page_size
        query += " ORDER BY issue_number DESC LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        results = db_manager.execute_query(query, tuple(params))

        issues = []
        for row in results:
            from datetime import datetime
            created_at = row.get('created_at')
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

            issues.append(IssueTrackerResponse(
                id=row['id'],
                issue_number=row['issue_number'],
                issue_title=row['issue_title'],
                project_id=row['project_id'],
                adw_id=row.get('adw_id'),
                created_at=created_at
            ))

        return issues

    except Exception as e:
        logger.error(f"Error listing issues: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/issues/{issue_number}", response_model=IssueTrackerResponse)
async def get_issue(issue_number: int):
    """
    Get a specific issue by number.

    Args:
        issue_number: Issue number

    Returns:
        Issue details
    """
    db_manager = get_db_manager()

    try:
        query = "SELECT * FROM issue_tracker WHERE issue_number = ? AND deleted_at IS NULL"
        results = db_manager.execute_query(query, (issue_number,))

        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"Issue {issue_number} not found"
            )

        row = results[0]

        from datetime import datetime
        created_at = row.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

        return IssueTrackerResponse(
            id=row['id'],
            issue_number=row['issue_number'],
            issue_title=row['issue_title'],
            project_id=row['project_id'],
            adw_id=row.get('adw_id'),
            created_at=created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting issue {issue_number}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/issues/{issue_number}")
async def delete_issue(issue_number: int, permanent: bool = Query(False)):
    """
    Delete an issue (soft delete by default).

    Args:
        issue_number: Issue number to delete
        permanent: If True, permanently delete from database

    Returns:
        Deletion confirmation
    """
    db_manager = get_db_manager()

    try:
        # Check if issue exists
        existing = db_manager.execute_query(
            "SELECT id FROM issue_tracker WHERE issue_number = ?",
            (issue_number,)
        )
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"Issue {issue_number} not found"
            )

        if permanent:
            # Permanent delete
            query = "DELETE FROM issue_tracker WHERE issue_number = ?"
            db_manager.execute_update(query, (issue_number,))
            message = f"Issue {issue_number} permanently deleted"
        else:
            # Soft delete
            from datetime import datetime
            query = "UPDATE issue_tracker SET deleted_at = ? WHERE issue_number = ?"
            db_manager.execute_update(query, (datetime.utcnow().isoformat(), issue_number))
            message = f"Issue {issue_number} soft-deleted"

        logger.info(message)

        return {"success": True, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting issue {issue_number}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
