"""
Config Loader - Workflow configuration management.

Handles loading workflow configurations from YAML files
and creating dynamic configurations from stage lists.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


@dataclass
class StageConfig:
    """Per-stage configuration overrides."""
    name: str
    enabled: bool = True
    required: bool = True
    depends_on: List[str] = field(default_factory=list)
    max_retries: Optional[int] = None
    timeout_minutes: Optional[int] = None
    skip_conditions: List[str] = field(default_factory=list)
    custom_args: Dict[str, Any] = field(default_factory=dict)


@dataclass
class OrchestratorConfig:
    """Master configuration for the orchestrator.

    Designed for extension - future features can be added
    by adding new fields with sensible defaults.
    """
    # Core settings
    stages: List[str] = field(default_factory=list)

    # Execution settings (extensible)
    max_instances: int = 1  # FUTURE: parallel instances
    max_retries: int = 0  # FUTURE: auto-retry failed stages
    retry_delay_seconds: int = 30  # FUTURE: delay between retries
    timeout_minutes: int = 60  # FUTURE: per-stage timeout

    # Failure handling
    continue_on_failure: bool = False  # Continue to next stage on failure
    rollback_on_failure: bool = False  # FUTURE: rollback changes on failure

    # Hooks (extensible)
    on_stage_start: Optional[str] = None  # FUTURE: webhook/script to call
    on_stage_complete: Optional[str] = None
    on_workflow_complete: Optional[str] = None
    on_failure: Optional[str] = None

    # Stage-specific overrides
    stage_config: Dict[str, StageConfig] = field(default_factory=dict)

    # Metadata (pass-through to stages)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "OrchestratorConfig":
        """Create config from dictionary (e.g., from frontend request)."""
        stage_configs = {}
        if "stage_config" in data:
            for name, cfg in data["stage_config"].items():
                if isinstance(cfg, dict):
                    stage_configs[name] = StageConfig(name=name, **cfg)

        return cls(
            stages=data.get("stages", []),
            max_instances=data.get("max_instances", 1),
            max_retries=data.get("max_retries", 0),
            retry_delay_seconds=data.get("retry_delay_seconds", 30),
            timeout_minutes=data.get("timeout_minutes", 60),
            continue_on_failure=data.get("continue_on_failure", False),
            rollback_on_failure=data.get("rollback_on_failure", False),
            on_stage_start=data.get("on_stage_start"),
            on_stage_complete=data.get("on_stage_complete"),
            on_workflow_complete=data.get("on_workflow_complete"),
            on_failure=data.get("on_failure"),
            stage_config=stage_configs,
            metadata=data.get("metadata", {}),
        )

    def get_stage_config(self, stage_name: str) -> StageConfig:
        """Get config for a specific stage, with defaults."""
        if stage_name in self.stage_config:
            return self.stage_config[stage_name]
        return StageConfig(name=stage_name)


@dataclass
class WorkflowConfig:
    """Complete workflow configuration."""
    name: str
    display_name: str
    description: str
    stages: List[StageConfig]
    conditions: Dict[str, Any] = field(default_factory=dict)
    on_failure: Dict[str, Any] = field(default_factory=dict)
    on_complete: Dict[str, Any] = field(default_factory=dict)


class ConfigLoader:
    """Load and manage workflow configurations."""

    # Directory where YAML workflow configs are stored
    WORKFLOWS_DIR = Path(__file__).parent.parent / "workflows"

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def load(self, workflow_name: str) -> WorkflowConfig:
        """Load workflow config from YAML file.

        Args:
            workflow_name: Name of the workflow (without extension)

        Returns:
            WorkflowConfig loaded from file

        Raises:
            ValueError: If workflow not found or YAML not available
        """
        if not YAML_AVAILABLE:
            raise ValueError("PyYAML is required for loading workflow configs")

        config_path = self.WORKFLOWS_DIR / f"{workflow_name}.yaml"
        if not config_path.exists():
            raise ValueError(f"Workflow config not found: {workflow_name}")

        with open(config_path) as f:
            data = yaml.safe_load(f)

        return self._parse_config(data)

    def load_from_stages(self, stages: List[str]) -> WorkflowConfig:
        """Create dynamic workflow config from stage list.

        This is the primary method used when frontend sends
        explicit stage lists.

        Args:
            stages: List of stage names to run in order

        Returns:
            WorkflowConfig with linear stage dependencies
        """
        stage_configs = []
        for i, stage_name in enumerate(stages):
            depends_on = [stages[i - 1]] if i > 0 else []
            stage_configs.append(StageConfig(
                name=stage_name,
                required=True,
                depends_on=depends_on,
            ))

        workflow_name = f"dynamic_{'_'.join(stages)}"

        return WorkflowConfig(
            name=workflow_name,
            display_name=f"Dynamic: {' -> '.join(stages)}",
            description="Dynamically created workflow from stage list",
            stages=stage_configs,
        )

    def load_from_orchestrator_config(self, config: OrchestratorConfig) -> WorkflowConfig:
        """Create workflow config from OrchestratorConfig.

        Applies stage-specific overrides from the orchestrator config.

        Args:
            config: OrchestratorConfig from frontend request

        Returns:
            WorkflowConfig with all settings applied
        """
        stage_configs = []
        for i, stage_name in enumerate(config.stages):
            depends_on = [config.stages[i - 1]] if i > 0 else []

            # Get stage-specific config if provided
            stage_cfg = config.get_stage_config(stage_name)

            stage_configs.append(StageConfig(
                name=stage_name,
                enabled=stage_cfg.enabled,
                required=stage_cfg.required,
                depends_on=depends_on if not stage_cfg.depends_on else stage_cfg.depends_on,
                max_retries=stage_cfg.max_retries or config.max_retries,
                timeout_minutes=stage_cfg.timeout_minutes or config.timeout_minutes,
                skip_conditions=stage_cfg.skip_conditions,
                custom_args=stage_cfg.custom_args,
            ))

        workflow_name = f"dynamic_{'_'.join(config.stages)}"

        return WorkflowConfig(
            name=workflow_name,
            display_name=f"Dynamic: {' -> '.join(config.stages)}",
            description="Dynamically created workflow",
            stages=stage_configs,
            on_failure={"strategy": "continue" if config.continue_on_failure else "stop"},
        )

    def _parse_config(self, data: dict) -> WorkflowConfig:
        """Parse YAML data into WorkflowConfig."""
        stages = []
        for stage_data in data.get("stages", []):
            stages.append(StageConfig(
                name=stage_data["name"],
                enabled=stage_data.get("enabled", True),
                required=stage_data.get("required", True),
                depends_on=stage_data.get("depends_on", []),
                max_retries=stage_data.get("max_retries"),
                timeout_minutes=stage_data.get("timeout_minutes"),
                skip_conditions=stage_data.get("skip_conditions", []),
                custom_args=stage_data.get("config", {}),
            ))

        return WorkflowConfig(
            name=data.get("name", "unknown"),
            display_name=data.get("display_name", "Unknown Workflow"),
            description=data.get("description", ""),
            stages=stages,
            conditions=data.get("conditions", {}),
            on_failure=data.get("on_failure", {}),
            on_complete=data.get("on_complete", {}),
        )

    def list_workflows(self) -> List[str]:
        """List all available workflow configs.

        Returns:
            List of workflow names (without .yaml extension)
        """
        if not self.WORKFLOWS_DIR.exists():
            return []

        return [
            f.stem for f in self.WORKFLOWS_DIR.glob("*.yaml")
            if f.is_file()
        ]
