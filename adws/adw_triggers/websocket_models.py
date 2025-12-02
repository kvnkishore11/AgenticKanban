"""WebSocket message models for ADW trigger system."""

from typing import Optional, Literal, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator, validator, AliasChoices
from adw_modules.data_types import ModelSet, ADWWorkflow


class WorkflowTriggerRequest(BaseModel):
    """Request to trigger an ADW workflow via WebSocket.

    The issue_json field allows Kanban systems to provide complete issue data,
    enabling workflows to proceed without GitHub API calls for issue data extraction.
    """

    # Core workflow information
    adw_id: Optional[str] = None  # Optional ADW ID - new one will be generated if not provided
    workflow_type: ADWWorkflow  # Type of workflow to trigger
    issue_number: Optional[str] = None  # Optional issue number for GitHub integration
    model_set: ModelSet = "base"  # Model set to use (base/heavy), defaults to base

    # Kanban-provided issue classification (bypasses GitHub classification)
    issue_type: Optional[Literal["feature", "bug", "chore", "patch"]] = None  # Issue type from kanban
    issue_json: Optional[dict] = None  # Complete issue data from Kanban (bypasses GitHub API calls)

    # Orchestrator-specific parameters (used when workflow_type is "adw_orchestrator")
    stages: Optional[List[str]] = None  # Dynamic stage list (e.g., ["plan", "build", "test"])
    config: Optional[Dict[str, Any]] = None  # Extensible orchestrator config

    # Optional parameters for specific workflows
    trigger_reason: str = "WebSocket request"  # Reason for triggering this workflow


class WorkflowTriggerResponse(BaseModel):
    """Response after triggering an ADW workflow."""

    status: Literal["accepted", "error", "ignored"]
    adw_id: str  # ADW ID for the triggered workflow (generated or provided)
    workflow_name: str  # Name of the workflow that was triggered
    message: str  # Human-readable message about the trigger result
    logs_path: str  # Path where logs will be written
    error: Optional[str] = None  # Error message if status is "error"


class WorkflowStatusUpdate(BaseModel):
    """Status update message during workflow execution."""

    adw_id: str  # ADW ID of the workflow
    workflow_name: str  # Name of the workflow
    status: Literal["started", "in_progress", "completed", "failed"]
    message: str  # Human-readable status message
    timestamp: str  # ISO timestamp of the update
    progress_percent: Optional[int] = None  # Optional progress percentage (0-100)
    current_step: Optional[str] = None  # Current step being executed


class WebSocketError(BaseModel):
    """Error message for WebSocket communication."""

    error_type: Literal["validation_error", "workflow_error", "system_error"]
    message: str  # Human-readable error message
    details: Optional[str] = None  # Additional error details
    adw_id: Optional[str] = None  # ADW ID if available


class TicketNotification(BaseModel):
    """Ticket notification data sent from kanban client."""

    id: str = Field(..., validation_alias=AliasChoices('id', 'ticket_id'))  # Ticket ID - accepts both 'id' and 'ticket_id' from client
    title: str  # Ticket title
    description: Optional[str] = None  # Ticket description
    workItemType: Optional[str] = None  # Type of work item (feature, bug, chore, etc.)
    queuedStages: Optional[list] = None  # Queued pipeline stages
    stage: Optional[str] = None  # Current stage
    substage: Optional[str] = None  # Current substage
    progress: Optional[int] = 0  # Progress percentage
    createdAt: Optional[str] = None  # Creation timestamp
    images: Optional[list] = None  # Associated images
    metadata: Optional[dict] = None  # Additional metadata
    old_adw_id: Optional[str] = None  # Previous ADW ID for workflow restarts


    @validator('id', pre=True)
    def validate_and_convert_id(cls, v):
        """Convert ticket ID to string and ensure it's not empty."""
        if v is None:
            raise ValueError('Ticket ID cannot be null')

        # Convert to string (handles integers like 18)
        str_id = str(v).strip()

        if not str_id:
            raise ValueError('Ticket ID must be a non-empty string')

        return str_id

    @validator('title')
    def validate_title(cls, v):
        """Ensure ticket title is not empty or whitespace-only."""
        if not v or not str(v).strip():
            raise ValueError('Ticket title must be a non-empty string')
        return str(v).strip()


class TicketNotificationResponse(BaseModel):
    """Response after receiving a ticket notification."""

    status: Literal["received", "error"]
    ticket_id: str  # ID of the received ticket
    message: str  # Human-readable response message
    timestamp: str  # ISO timestamp when notification was processed
    error: Optional[str] = None  # Error message if status is "error"


class HealthCheckResponse(BaseModel):
    """Response from WebSocket trigger health check."""

    status: Literal["healthy", "unhealthy"]
    service: str = "adw-websocket-trigger"
    active_connections: int = 0  # Number of active WebSocket connections
    total_workflows_triggered: int = 0  # Total workflows triggered since startup
    uptime_seconds: float = 0.0  # Server uptime in seconds
    health_check: Optional[dict] = None  # Detailed health check results
    error: Optional[str] = None  # Error message if unhealthy


class ClarificationRequest(BaseModel):
    """Request model for clarification endpoint.

    Accepts task_id as either int or str (will be coerced to int).
    adw_id and description have defaults to handle edge cases gracefully.
    """
    task_id: Union[int, str]  # Task ID from kanban (accepts string, coerced to int)
    description: str = ""  # Task description to analyze (default empty)
    adw_id: str = ""  # ADW ID for the task (default empty)
    feedback: Optional[str] = None  # Optional user feedback for refinement
    previous_understanding: Optional[str] = None  # Previous understanding for fast refinement
    previous_questions: Optional[List[str]] = None  # Previous questions for refinement context

    @field_validator('task_id', mode='before')
    @classmethod
    def coerce_task_id(cls, v):
        """Coerce task_id to int if it's a valid numeric string."""
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                # Keep as string if not convertible, let endpoint handle gracefully
                return v
        return v


class ClarificationResult(BaseModel):
    """Response model for clarification endpoint.

    Conversational format:
    - understanding: "Got it! You want me to..." explanation
    - questions: Only genuine questions (can be empty)
    - confidence: high/medium/low
    """
    understanding: str  # Conversational "Got it! You want me to..." explanation
    confidence: str  # How confident the AI is (high/medium/low)
    questions: List[str] = []  # Clarifying questions (can be empty)
    status: str = "awaiting_approval"  # Status of clarification