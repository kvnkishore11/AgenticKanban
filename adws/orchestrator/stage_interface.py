"""
Stage Interface - Abstract base class for workflow stages.

Provides the contract that all stages must implement.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum
import logging


class StageStatus(str, Enum):
    """Status of a stage execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class StageResult:
    """Result from executing a stage."""
    status: StageStatus
    message: str
    artifacts: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    duration_ms: Optional[int] = None


@dataclass
class StageContext:
    """Context passed to each stage during execution."""
    adw_id: str
    issue_number: str
    state: Any  # ADWState instance
    worktree_path: str
    logger: logging.Logger
    notifier: Any  # WebSocketNotifier instance
    config: Dict[str, Any] = field(default_factory=dict)  # Stage-specific config


class Stage(ABC):
    """Abstract base class for all workflow stages.

    Implement this interface to create new stages that can be
    registered with the orchestrator.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this stage (e.g., 'plan', 'build').

        This is used to register the stage and reference it in workflows.
        """
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name for this stage (e.g., 'Planning', 'Building').

        Used in logs and UI displays.
        """
        pass

    @property
    def dependencies(self) -> List[str]:
        """List of stage names that must complete before this stage.

        By default, stages depend on the previous stage in workflow order.
        Override to specify custom dependencies.
        """
        return []

    def preconditions(self, ctx: StageContext) -> tuple[bool, Optional[str]]:
        """Check if stage can run.

        Args:
            ctx: Stage execution context

        Returns:
            Tuple of (can_run, error_message)
            - can_run: True if preconditions are met
            - error_message: Reason for failure if can_run is False
        """
        return True, None

    def should_skip(self, ctx: StageContext) -> tuple[bool, Optional[str]]:
        """Check if stage should be skipped.

        Override to implement conditional skip logic based on
        issue type, worktree state, or other conditions.

        Args:
            ctx: Stage execution context

        Returns:
            Tuple of (should_skip, reason)
            - should_skip: True if stage should be skipped
            - reason: Human-readable reason for skipping
        """
        return False, None

    @abstractmethod
    def execute(self, ctx: StageContext) -> StageResult:
        """Execute the stage.

        This is the main entry point for stage execution.
        Must be implemented by all stages.

        Args:
            ctx: Stage execution context

        Returns:
            StageResult with status and any artifacts
        """
        pass

    def on_failure(self, ctx: StageContext, error: Exception) -> None:
        """Handle stage failure.

        Override to implement custom error handling, cleanup,
        or recovery logic when the stage fails.

        Args:
            ctx: Stage execution context
            error: The exception that caused the failure
        """
        ctx.logger.error(f"Stage {self.name} failed: {error}")

    def cleanup(self, ctx: StageContext) -> None:
        """Cleanup after stage execution.

        Called after execute() completes (whether success or failure).
        Override to release resources or perform cleanup.

        Args:
            ctx: Stage execution context
        """
        pass
