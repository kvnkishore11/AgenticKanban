"""
Pydantic models for ADW database tables.

Provides validation, serialization, and type safety for database operations.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# Enums for database fields
class ADWStatus(str, Enum):
    """ADW workflow status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERRORED = "errored"
    STUCK = "stuck"


class ADWStage(str, Enum):
    """ADW workflow stages."""
    BACKLOG = "backlog"
    PLAN = "plan"
    BUILD = "build"
    TEST = "test"
    REVIEW = "review"
    DOCUMENT = "document"
    READY_TO_MERGE = "ready-to-merge"
    COMPLETED = "completed"
    ERRORED = "errored"


class EventType(str, Enum):
    """Activity log event types."""
    STATE_CHANGE = "state_change"
    STAGE_TRANSITION = "stage_transition"
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    ERROR_OCCURRED = "error_occurred"
    USER_ACTION = "user_action"
    STUCK_DETECTED = "stuck_detected"
    STUCK_RESOLVED = "stuck_resolved"
    DELETION_REQUESTED = "deletion_requested"


class IssueClass(str, Enum):
    """Issue classification types."""
    FEATURE = "feature"
    BUG = "bug"
    CHORE = "chore"
    PATCH = "patch"


class ModelSet(str, Enum):
    """ADW model set types."""
    BASE = "base"
    HEAVY = "heavy"


class DataSource(str, Enum):
    """Data source for issues."""
    GITHUB = "github"
    KANBAN = "kanban"


# Database Models

class ADWStateDB(BaseModel):
    """ADW state database model."""

    id: Optional[int] = None
    adw_id: str = Field(..., min_length=8, max_length=8)
    issue_number: Optional[int] = Field(None, gt=0)
    issue_title: Optional[str] = None
    issue_body: Optional[str] = None
    issue_class: Optional[IssueClass] = None
    branch_name: Optional[str] = None
    worktree_path: Optional[str] = None
    current_stage: ADWStage = ADWStage.BACKLOG
    status: ADWStatus = ADWStatus.PENDING
    is_stuck: bool = False
    workflow_name: Optional[str] = None
    model_set: ModelSet = ModelSet.BASE
    data_source: DataSource = DataSource.KANBAN
    issue_json: Optional[str] = None  # JSON string
    orchestrator_state: Optional[str] = None  # JSON string
    patch_file: Optional[str] = None
    patch_history: Optional[str] = None  # JSON string
    patch_source_mode: Optional[DataSource] = None
    backend_port: Optional[int] = None
    websocket_port: Optional[int] = None
    frontend_port: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    @field_validator('adw_id')
    @classmethod
    def validate_adw_id(cls, v: str) -> str:
        """Validate ADW ID is 8 characters alphanumeric."""
        if not v or len(v) != 8:
            raise ValueError("adw_id must be exactly 8 characters")
        if not v.isalnum():
            raise ValueError("adw_id must be alphanumeric")
        return v

    class Config:
        use_enum_values = True
        from_attributes = True


class ADWStateCreate(BaseModel):
    """Model for creating a new ADW state."""

    adw_id: str = Field(..., min_length=8, max_length=8)
    issue_number: Optional[int] = Field(None, gt=0)
    issue_title: Optional[str] = None
    issue_body: Optional[str] = None
    issue_class: Optional[str] = None
    branch_name: Optional[str] = None
    worktree_path: Optional[str] = None
    current_stage: str = "backlog"
    status: str = "pending"
    workflow_name: Optional[str] = None
    model_set: str = "base"
    data_source: str = "kanban"
    issue_json: Optional[Dict[str, Any]] = None
    orchestrator_state: Optional[Dict[str, Any]] = None
    backend_port: Optional[int] = None
    websocket_port: Optional[int] = None
    frontend_port: Optional[int] = None


class ADWStateUpdate(BaseModel):
    """Model for updating an ADW state."""

    current_stage: Optional[str] = None
    status: Optional[str] = None
    is_stuck: Optional[bool] = None
    issue_title: Optional[str] = None
    issue_body: Optional[str] = None
    issue_class: Optional[str] = None
    branch_name: Optional[str] = None
    worktree_path: Optional[str] = None
    workflow_name: Optional[str] = None
    orchestrator_state: Optional[Dict[str, Any]] = None
    patch_file: Optional[str] = None
    patch_history: Optional[List[Dict[str, Any]]] = None
    completed_at: Optional[datetime] = None


class ADWStateResponse(BaseModel):
    """Model for ADW state API responses."""

    id: int
    adw_id: str
    issue_number: Optional[int] = None
    issue_title: Optional[str] = None
    issue_class: Optional[str] = None
    branch_name: Optional[str] = None
    worktree_path: Optional[str] = None
    current_stage: str
    status: str
    is_stuck: bool
    workflow_name: Optional[str] = None
    model_set: str
    data_source: str
    issue_json: Optional[Dict[str, Any]] = None
    orchestrator_state: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ADWActivityLogDB(BaseModel):
    """ADW activity log database model."""

    id: Optional[int] = None
    adw_id: str
    event_type: EventType
    event_data: Optional[str] = None  # JSON string
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user: Optional[str] = None
    workflow_step: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
        from_attributes = True


class ADWActivityLogCreate(BaseModel):
    """Model for creating an activity log entry."""

    adw_id: str
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user: Optional[str] = None
    workflow_step: Optional[str] = None


class ADWActivityLogResponse(BaseModel):
    """Model for activity log API responses."""

    id: int
    adw_id: str
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user: Optional[str] = None
    workflow_step: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class IssueTrackerDB(BaseModel):
    """Issue tracker database model."""

    id: Optional[int] = None
    issue_number: int = Field(..., gt=0)
    issue_title: str
    project_id: str = "default"
    adw_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IssueTrackerCreate(BaseModel):
    """Model for creating an issue tracker entry."""

    issue_title: str
    project_id: str = "default"
    adw_id: Optional[str] = None


class IssueTrackerResponse(BaseModel):
    """Model for issue tracker API responses."""

    id: int
    issue_number: int
    issue_title: str
    project_id: str
    adw_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ADWDeletionDB(BaseModel):
    """ADW deletion audit log database model."""

    id: Optional[int] = None
    adw_id: str
    issue_number: Optional[int] = None
    deleted_by: Optional[str] = None
    deleted_at: datetime = Field(default_factory=datetime.utcnow)
    deletion_reason: Optional[str] = None
    worktree_removed: bool = False
    agents_dir_removed: bool = False
    database_record_removed: bool = False
    metadata: Optional[str] = None  # JSON string

    class Config:
        from_attributes = True


class ADWDeletionCreate(BaseModel):
    """Model for creating a deletion audit log entry."""

    adw_id: str
    issue_number: Optional[int] = None
    deleted_by: Optional[str] = None
    deletion_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Request/Response Models for API endpoints

class ADWListResponse(BaseModel):
    """Response model for listing ADWs."""

    adws: List[ADWStateResponse]
    total_count: int
    filters_applied: Optional[Dict[str, Any]] = None


class ADWActivityHistoryResponse(BaseModel):
    """Response model for ADW activity history."""

    adw_id: str
    activities: List[ADWActivityLogResponse]
    total_count: int
    page: int = 1
    page_size: int = 100


class HealthCheckResponse(BaseModel):
    """Response model for database health check."""

    healthy: bool
    database_path: str
    database_exists: bool
    adw_count: Optional[int] = None
    error: Optional[str] = None
    message: str


class IssueAllocationResponse(BaseModel):
    """Response model for issue number allocation."""

    issue_number: int
    issue_title: str
    adw_id: Optional[str] = None
    message: str
