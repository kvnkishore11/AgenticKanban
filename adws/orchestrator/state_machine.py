"""
State Machine - Workflow execution tracking.

Tracks the state of workflow execution including which stages
have run, their status, and timing information.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

from orchestrator.stage_interface import StageStatus, StageResult


class WorkflowStatus(str, Enum):
    """Overall status of a workflow execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


@dataclass
class StageExecution:
    """Track execution state of a single stage."""
    stage_name: str
    status: StageStatus = StageStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    attempts: int = 0
    result: Optional[StageResult] = None

    def to_dict(self) -> dict:
        """Serialize for persistence."""
        return {
            "stage_name": self.stage_name,
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "attempts": self.attempts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "StageExecution":
        """Deserialize from persistence."""
        return cls(
            stage_name=data["stage_name"],
            status=StageStatus(data["status"]),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            error=data.get("error"),
            attempts=data.get("attempts", 0),
        )


@dataclass
class WorkflowExecution:
    """Track execution state of an entire workflow."""
    workflow_name: str
    adw_id: str
    stages: List[StageExecution] = field(default_factory=list)
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_stage_index: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialize for persistence."""
        return {
            "workflow_name": self.workflow_name,
            "adw_id": self.adw_id,
            "status": self.status.value,
            "current_stage_index": self.current_stage_index,
            "stages": [s.to_dict() for s in self.stages],
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "WorkflowExecution":
        """Deserialize from persistence.

        Used for resuming workflows from saved state.
        """
        return cls(
            workflow_name=data["workflow_name"],
            adw_id=data["adw_id"],
            status=WorkflowStatus(data["status"]),
            current_stage_index=data.get("current_stage_index", 0),
            stages=[StageExecution.from_dict(s) for s in data.get("stages", [])],
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            error=data.get("error"),
            metadata=data.get("metadata", {}),
        )

    def get_current_stage(self) -> Optional[StageExecution]:
        """Get the current stage being executed."""
        if 0 <= self.current_stage_index < len(self.stages):
            return self.stages[self.current_stage_index]
        return None

    def get_stage_by_name(self, name: str) -> Optional[StageExecution]:
        """Get a stage execution by name."""
        for stage in self.stages:
            if stage.stage_name == name:
                return stage
        return None

    def mark_stage_started(self, stage_name: str) -> None:
        """Mark a stage as started."""
        stage = self.get_stage_by_name(stage_name)
        if stage:
            stage.status = StageStatus.RUNNING
            stage.started_at = datetime.utcnow()
            stage.attempts += 1

    def mark_stage_completed(self, stage_name: str, result: StageResult) -> None:
        """Mark a stage as completed."""
        stage = self.get_stage_by_name(stage_name)
        if stage:
            stage.status = result.status
            stage.completed_at = datetime.utcnow()
            stage.result = result
            if result.error:
                stage.error = result.error

    def is_resumable(self) -> bool:
        """Check if workflow can be resumed."""
        return self.status in (WorkflowStatus.FAILED, WorkflowStatus.PAUSED)

    def get_completed_stages(self) -> List[str]:
        """Get list of completed stage names."""
        return [s.stage_name for s in self.stages if s.status == StageStatus.COMPLETED]

    def get_pending_stages(self) -> List[str]:
        """Get list of pending stage names."""
        return [s.stage_name for s in self.stages if s.status == StageStatus.PENDING]
