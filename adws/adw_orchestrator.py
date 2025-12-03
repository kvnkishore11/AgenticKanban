#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "requests", "pyyaml"]
# ///

"""
ADW Orchestrator - Dynamic workflow orchestration with extensible stages.

Usage:
    uv run adw_orchestrator.py <issue-number> [adw-id] --stages plan,build,test
    uv run adw_orchestrator.py <issue-number> [adw-id] --workflow sdlc
    uv run adw_orchestrator.py <issue-number> [adw-id] --config '{"stages":["plan","build"],"max_retries":2}'

This orchestrator:
- Accepts dynamic stage lists from the frontend
- Runs stages sequentially with proper state management
- Supports conditional skipping based on issue type and worktree state
- Provides real-time WebSocket updates
- Tracks execution state for resume capability

Stages available:
- plan: Creates worktree and generates implementation plan
- build: Implements the plan
- test: Runs tests (skipped if no tests exist)
- review: Reviews implementation against spec (skipped for patches)
- document: Generates documentation
- merge: Merges to main branch
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adw_modules.workflow_ops import ensure_adw_id
from adw_modules.state import ADWState
from adw_modules.utils import setup_logger
from adw_modules.websocket_client import WebSocketNotifier

from orchestrator.registry import StageRegistry
from orchestrator.config_loader import ConfigLoader, OrchestratorConfig, WorkflowConfig
from orchestrator.state_machine import (
    WorkflowExecution,
    StageExecution,
    WorkflowStatus,
)
from orchestrator.stage_interface import StageContext, StageResult, StageStatus
from orchestrator.events import StageEventType, StageEventPayload
from orchestrator.event_emitter import StageEventEmitter


# Valid stage names
VALID_STAGES = {"plan", "build", "test", "review", "document", "merge"}


class ADWOrchestrator:
    """Dynamic workflow orchestrator with extensible stage support.

    The orchestrator:
    1. Loads or creates ADW state
    2. Initializes execution tracking
    3. Runs stages sequentially with skip/precondition checks
    4. Handles failures based on configuration
    5. Saves state for resume capability
    """

    def __init__(
        self,
        adw_id: str,
        issue_number: str,
        config: WorkflowConfig,
        orchestrator_config: Optional[OrchestratorConfig] = None,
    ):
        self.adw_id = adw_id
        self.issue_number = issue_number
        self.config = config
        self.orchestrator_config = orchestrator_config
        self.logger = setup_logger(adw_id, "orchestrator")

        # Initialize stage registry
        self.registry = StageRegistry()
        self.registry.discover_stages()

        # Load or create ADW state
        self.state = ADWState.load(adw_id, self.logger) or ADWState(adw_id)
        self.state.update(adw_id=adw_id, issue_number=issue_number)

        # Initialize WebSocket notifier
        self.notifier: Optional[WebSocketNotifier] = None
        try:
            self.notifier = WebSocketNotifier(adw_id=adw_id)
        except Exception as e:
            self.logger.debug(f"WebSocket notifier initialization skipped: {e}")

        # Initialize workflow execution tracking
        self.execution = self._initialize_execution()

        # Initialize event emitter for stage lifecycle notifications
        self.event_emitter = StageEventEmitter()
        self._register_default_handlers()

    def _initialize_execution(self) -> WorkflowExecution:
        """Initialize or resume workflow execution from state."""
        # Check for existing execution state (resume capability)
        existing_data = (self.state.data.get("orchestrator") or {}).get("execution")
        if existing_data:
            try:
                execution = WorkflowExecution.from_dict(existing_data)
                if execution.is_resumable():
                    self.logger.info(
                        f"Resuming workflow from stage index {execution.current_stage_index}"
                    )
                    return execution
            except Exception as e:
                self.logger.warning(f"Could not resume execution: {e}")

        # Create new execution
        stages = [
            StageExecution(stage_name=stage_cfg.name)
            for stage_cfg in self.config.stages
        ]

        return WorkflowExecution(
            workflow_name=self.config.name,
            adw_id=self.adw_id,
            stages=stages,
        )

    def _register_default_handlers(self) -> None:
        """Register default event handlers for WebSocket notifications."""
        def websocket_handler(event: StageEventPayload) -> None:
            if self.notifier:
                self.notifier.notify_stage_event(event)

        self.event_emitter.on_all(websocket_handler)

    def _get_previous_completed_stage(self, current_stage: str) -> Optional[str]:
        """Get the name of the previous stage that completed (not skipped).

        Args:
            current_stage: Name of the current stage

        Returns:
            Name of the last completed stage, or None if this is the first
        """
        completed = []
        for stage_exec in self.execution.stages:
            if stage_exec.stage_name == current_stage:
                break
            if stage_exec.status == StageStatus.COMPLETED:
                completed.append(stage_exec.stage_name)
        return completed[-1] if completed else None

    def _get_next_stage(self, current_stage: str) -> Optional[str]:
        """Get the name of the next enabled stage after current.

        Args:
            current_stage: Name of the current stage

        Returns:
            Name of the next stage, or None if this is the last
        """
        found_current = False
        for stage_cfg in self.config.stages:
            if found_current and stage_cfg.enabled:
                return stage_cfg.name
            if stage_cfg.name == current_stage:
                found_current = True
        return None

    def _emit_stage_event(
        self,
        event_type: StageEventType,
        stage_name: str,
        message: str,
        **kwargs
    ) -> None:
        """Emit a stage lifecycle event with full context.

        Args:
            event_type: Type of event to emit
            stage_name: Name of the stage
            message: Human-readable message
            **kwargs: Additional event data (duration_ms, error, skip_reason)
        """
        event = StageEventPayload(
            event_type=event_type,
            workflow_name=self.config.name,
            adw_id=self.adw_id,
            stage_name=stage_name,
            previous_stage=self._get_previous_completed_stage(stage_name),
            next_stage=self._get_next_stage(stage_name),
            message=message,
            stage_index=self.execution.current_stage_index,
            total_stages=len(self.config.stages),
            completed_stages=self.execution.get_completed_stages(),
            pending_stages=self.execution.get_pending_stages(),
            **kwargs
        )
        self.event_emitter.emit(event)

    def run(self) -> bool:
        """Execute the workflow.

        Returns:
            True if all stages completed successfully
        """
        self.execution.status = WorkflowStatus.RUNNING
        self.execution.started_at = datetime.utcnow()
        self._save_execution_state()

        self.logger.info(f"=== Starting workflow: {self.config.display_name} ===")
        self.logger.info(f"Stages: {[s.name for s in self.config.stages]}")

        # Emit WORKFLOW_STARTED event
        first_stage = self.config.stages[0].name if self.config.stages else "none"
        self._emit_stage_event(
            event_type=StageEventType.WORKFLOW_STARTED,
            stage_name=first_stage,
            message=f"Starting workflow: {self.config.display_name}",
        )

        try:
            for i, stage_cfg in enumerate(self.config.stages):
                # Skip already completed stages (resume support)
                if i < self.execution.current_stage_index:
                    self.logger.info(f"Skipping already completed stage: {stage_cfg.name}")
                    continue

                # Skip disabled stages
                if not stage_cfg.enabled:
                    self.logger.info(f"Skipping disabled stage: {stage_cfg.name}")
                    continue

                stage_exec = self.execution.stages[i]
                self.execution.current_stage_index = i
                self._save_execution_state()

                # Get stage implementation
                stage = self.registry.create(stage_cfg.name)
                if not stage:
                    self.logger.error(f"Unknown stage: {stage_cfg.name}")
                    continue

                # Determine model for this stage
                # Priority: stage config > ADW state overrides > default
                stage_model = stage_cfg.model
                if not stage_model:
                    # Check ADW state for per-stage model overrides
                    stage_model_overrides = self.state.get("stage_model_overrides", {})
                    if stage_model_overrides and stage_cfg.name in stage_model_overrides:
                        stage_model = stage_model_overrides[stage_cfg.name]

                if stage_model:
                    self.logger.debug(f"Stage {stage_cfg.name} using model: {stage_model}")

                # Create stage context with progression info
                ctx = StageContext(
                    adw_id=self.adw_id,
                    issue_number=self.issue_number,
                    state=self.state,
                    worktree_path=self.state.get("worktree_path") or "",
                    logger=self.logger,
                    notifier=self.notifier,
                    config=stage_cfg.custom_args,
                    # Stage progression context
                    previous_stage=self._get_previous_completed_stage(stage_cfg.name),
                    stage_index=i,
                    total_stages=len(self.config.stages),
                    completed_stages=self.execution.get_completed_stages(),
                    skipped_stages=[s.stage_name for s in self.execution.stages if s.status == StageStatus.SKIPPED],
                    # Per-stage model selection
                    stage_model=stage_model,
                )

                # Execute stage
                result = self._execute_stage(stage, stage_exec, ctx, stage_cfg)

                # Reload state after stage execution (stage may have updated it)
                updated_state = ADWState.load(self.adw_id, self.logger)
                if updated_state:
                    self.state = updated_state

                # Handle failure
                if result.status == StageStatus.FAILED:
                    if not self._handle_failure(stage_cfg, result):
                        return False

            # All stages completed
            self.execution.status = WorkflowStatus.COMPLETED
            self.execution.completed_at = datetime.utcnow()
            self._save_execution_state()

            self.logger.info("=== Workflow completed successfully! ===")
            self.state.mark_completed()
            self.state.save("orchestrator_complete")

            # Emit WORKFLOW_COMPLETED event
            last_stage = self.config.stages[-1].name if self.config.stages else "none"
            self._emit_stage_event(
                event_type=StageEventType.WORKFLOW_COMPLETED,
                stage_name=last_stage,
                message=f"Workflow {self.config.display_name} completed successfully",
            )

            return True

        except Exception as e:
            self.logger.error(f"Workflow failed with exception: {e}")
            self.execution.status = WorkflowStatus.FAILED
            self.execution.error = str(e)
            self._save_execution_state()
            return False

    def _execute_stage(
        self,
        stage,
        stage_exec: StageExecution,
        ctx: StageContext,
        stage_cfg,
    ) -> StageResult:
        """Execute a single stage with precondition and skip checks."""
        stage_exec.started_at = datetime.utcnow()
        stage_exec.status = StageStatus.RUNNING
        stage_exec.attempts += 1
        self._save_execution_state()

        self.logger.info(f"\n=== {stage.display_name.upper()} PHASE ===")

        # Track execution time
        import time
        start_time = time.time()

        try:
            # Check preconditions
            can_run, error_msg = stage.preconditions(ctx)
            if not can_run:
                self.logger.error(f"Precondition failed: {error_msg}")
                stage_exec.status = StageStatus.FAILED
                stage_exec.error = error_msg

                # Emit STAGE_FAILED event for precondition failure
                self._emit_stage_event(
                    event_type=StageEventType.STAGE_FAILED,
                    stage_name=stage.name,
                    message=f"Precondition failed: {error_msg}",
                    error=error_msg,
                )

                return StageResult(
                    status=StageStatus.FAILED,
                    message=f"Precondition failed: {error_msg}",
                    error=error_msg,
                )

            # Check if should skip
            should_skip, skip_reason = stage.should_skip(ctx)
            if should_skip:
                self.logger.info(f"Skipping stage: {skip_reason}")
                stage_exec.status = StageStatus.SKIPPED
                stage_exec.completed_at = datetime.utcnow()

                # Emit STAGE_SKIPPED event
                self._emit_stage_event(
                    event_type=StageEventType.STAGE_SKIPPED,
                    stage_name=stage.name,
                    message=skip_reason or "Stage skipped",
                    skip_reason=skip_reason,
                )

                return StageResult(
                    status=StageStatus.SKIPPED,
                    message=skip_reason or "Stage skipped",
                )

            # Emit STAGE_STARTED event
            self._emit_stage_event(
                event_type=StageEventType.STAGE_STARTED,
                stage_name=stage.name,
                message=f"Starting {stage.display_name}",
            )

            # Execute stage
            result = stage.execute(ctx)

            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)

            stage_exec.status = result.status
            stage_exec.result = result
            stage_exec.completed_at = datetime.utcnow()

            if result.status == StageStatus.COMPLETED:
                self.logger.info(f"Stage completed: {stage.display_name}")

                # Emit STAGE_COMPLETED event
                self._emit_stage_event(
                    event_type=StageEventType.STAGE_COMPLETED,
                    stage_name=stage.name,
                    message=f"{stage.display_name} completed successfully",
                    duration_ms=duration_ms,
                )
            else:
                self.logger.error(f"Stage failed: {result.error}")
                stage_exec.error = result.error
                stage.on_failure(ctx, Exception(result.error or "Unknown error"))

                # Emit STAGE_FAILED event
                self._emit_stage_event(
                    event_type=StageEventType.STAGE_FAILED,
                    stage_name=stage.name,
                    message=f"{stage.display_name} failed",
                    error=result.error,
                    duration_ms=duration_ms,
                )

            return result

        except Exception as e:
            # Calculate duration even on exception
            duration_ms = int((time.time() - start_time) * 1000)

            self.logger.error(f"Stage exception: {e}")
            stage_exec.status = StageStatus.FAILED
            stage_exec.error = str(e)
            stage_exec.completed_at = datetime.utcnow()
            stage.on_failure(ctx, e)

            # Emit STAGE_FAILED event for exception
            self._emit_stage_event(
                event_type=StageEventType.STAGE_FAILED,
                stage_name=stage.name,
                message=f"{stage.display_name} failed with exception",
                error=str(e),
                duration_ms=duration_ms,
            )

            return StageResult(
                status=StageStatus.FAILED,
                message=str(e),
                error=str(e),
            )
        finally:
            stage.cleanup(ctx)
            # Reload state in case stage subprocess updated it before saving execution state
            # This prevents overwriting state updates made by the stage
            updated_state = ADWState.load(self.adw_id, self.logger)
            if updated_state:
                self.state = updated_state
            self._save_execution_state()

    def _handle_failure(self, stage_cfg, result: StageResult) -> bool:
        """Handle stage failure based on configuration.

        Returns:
            True if workflow should continue, False if should stop
        """
        # Check orchestrator config for continue_on_failure
        if self.orchestrator_config and self.orchestrator_config.continue_on_failure:
            self.logger.warning(
                f"Stage {stage_cfg.name} failed but continuing (continue_on_failure=True)"
            )
            return True

        # Check workflow config
        on_failure = self.config.on_failure or {}
        strategy = on_failure.get("strategy", "stop")

        if strategy == "continue":
            self.logger.warning(f"Stage {stage_cfg.name} failed but continuing")
            return True

        self.logger.error(f"Stage {stage_cfg.name} failed, stopping workflow")
        self.execution.status = WorkflowStatus.FAILED
        self.execution.error = result.error
        return False

    def _save_execution_state(self) -> None:
        """Persist workflow execution state for resume capability."""
        orchestrator_state = {
            "workflow_name": self.config.name,
            "stages": [s.name for s in self.config.stages],
            "config": (
                {
                    "max_instances": self.orchestrator_config.max_instances,
                    "continue_on_failure": self.orchestrator_config.continue_on_failure,
                }
                if self.orchestrator_config
                else {}
            ),
            "execution": self.execution.to_dict(),
        }

        # Store in state data (will be persisted on next save)
        self.state.data["orchestrator"] = orchestrator_state
        self.state.save("orchestrator")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="ADW Dynamic Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("issue_number", help="GitHub issue number or Kanban ticket ID")
    parser.add_argument("adw_id", nargs="?", help="ADW ID (optional, will be generated)")
    parser.add_argument(
        "--stages",
        help="Comma-separated list of stages (e.g., plan,build,test)",
    )
    parser.add_argument(
        "--workflow",
        help="Named workflow configuration (e.g., sdlc, plan_build)",
    )
    parser.add_argument(
        "--config",
        help="JSON configuration object for orchestrator settings",
    )
    return parser.parse_args()


def main():
    """Main entry point."""
    load_dotenv()

    args = parse_args()

    # Validate arguments
    if not args.stages and not args.workflow and not args.config:
        print("Error: Must specify --stages, --workflow, or --config")
        sys.exit(1)

    # Ensure ADW ID
    adw_id = ensure_adw_id(args.issue_number, args.adw_id)
    print(f"Using ADW ID: {adw_id}")

    # Load configuration
    config_loader = ConfigLoader()
    orchestrator_config: Optional[OrchestratorConfig] = None
    workflow_config: WorkflowConfig

    if args.config:
        # Parse JSON config from CLI
        try:
            config_data = json.loads(args.config)
            orchestrator_config = OrchestratorConfig.from_dict(config_data)
            workflow_config = config_loader.load_from_orchestrator_config(orchestrator_config)
        except json.JSONDecodeError as e:
            print(f"Error parsing config JSON: {e}")
            sys.exit(1)

    elif args.workflow:
        # Load named workflow from YAML
        try:
            workflow_config = config_loader.load(args.workflow)
        except ValueError as e:
            print(f"Error loading workflow: {e}")
            sys.exit(1)

    else:
        # Parse stages list
        stages = [s.strip() for s in args.stages.split(",")]

        # Validate stages
        invalid = [s for s in stages if s not in VALID_STAGES]
        if invalid:
            print(f"Error: Invalid stages: {invalid}")
            print(f"Valid stages: {sorted(VALID_STAGES)}")
            sys.exit(1)

        workflow_config = config_loader.load_from_stages(stages)

    # Create and run orchestrator
    orchestrator = ADWOrchestrator(
        adw_id=adw_id,
        issue_number=args.issue_number,
        config=workflow_config,
        orchestrator_config=orchestrator_config,
    )
    success = orchestrator.run()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
