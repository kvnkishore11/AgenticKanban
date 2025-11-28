"""
Stage Events - Event types and payloads for stage lifecycle notifications.

This module defines the event system used by the orchestrator to emit
stage lifecycle events (started, completed, failed, skipped) that can
be consumed by WebSocket handlers, loggers, and other listeners.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


class StageEventType(str, Enum):
    """Types of stage lifecycle events."""
    STAGE_STARTED = "stage_started"
    STAGE_COMPLETED = "stage_completed"
    STAGE_FAILED = "stage_failed"
    STAGE_SKIPPED = "stage_skipped"
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"


@dataclass
class StageEventPayload:
    """Payload for stage lifecycle events.

    Contains all information needed to track stage progression
    and workflow status for WebSocket clients.
    """
    event_type: StageEventType
    workflow_name: str
    adw_id: str
    stage_name: str
    previous_stage: Optional[str]
    next_stage: Optional[str]
    message: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None
    error: Optional[str] = None
    skip_reason: Optional[str] = None
    stage_index: int = 0
    total_stages: int = 0
    completed_stages: List[str] = field(default_factory=list)
    pending_stages: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def progress_percent(self) -> int:
        """Calculate workflow progress percentage."""
        if self.total_stages == 0:
            return 0
        # Use stage_index + 1 for completed stages to show proper progress
        if self.event_type in (StageEventType.STAGE_COMPLETED, StageEventType.STAGE_SKIPPED):
            return int(((self.stage_index + 1) / self.total_stages) * 100)
        return int((self.stage_index / self.total_stages) * 100)

    def to_dict(self) -> dict:
        """Convert to dictionary for WebSocket transmission."""
        return {
            "event_type": self.event_type.value,
            "workflow_name": self.workflow_name,
            "adw_id": self.adw_id,
            "stage_name": self.stage_name,
            "previous_stage": self.previous_stage,
            "next_stage": self.next_stage,
            "message": self.message,
            "timestamp": self.timestamp.isoformat() + "Z",
            "duration_ms": self.duration_ms,
            "error": self.error,
            "skip_reason": self.skip_reason,
            "stage_index": self.stage_index,
            "total_stages": self.total_stages,
            "completed_stages": self.completed_stages,
            "pending_stages": self.pending_stages,
            "progress_percent": self.progress_percent,
            "metadata": self.metadata,
        }
