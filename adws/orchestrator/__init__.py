"""
ADW Orchestrator Package

Extensible workflow orchestration with pluggable stages.
"""

from orchestrator.stage_interface import Stage, StageContext, StageResult, StageStatus
from orchestrator.registry import StageRegistry
from orchestrator.state_machine import WorkflowExecution, StageExecution, WorkflowStatus
from orchestrator.config_loader import ConfigLoader, WorkflowConfig, StageConfig, OrchestratorConfig

__all__ = [
    # Stage interface
    "Stage",
    "StageContext",
    "StageResult",
    "StageStatus",
    # Registry
    "StageRegistry",
    # State machine
    "WorkflowExecution",
    "StageExecution",
    "WorkflowStatus",
    # Config
    "ConfigLoader",
    "WorkflowConfig",
    "StageConfig",
    "OrchestratorConfig",
]
