#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pydantic"]
# ///
"""Unit tests for the ADW Orchestrator package.

Tests cover:
- StageContext, StageResult, StageStatus (stage_interface.py)
- StageRegistry with auto-discovery (registry.py)
- WorkflowExecution, StageExecution state machine (state_machine.py)
- OrchestratorConfig, WorkflowConfig, ConfigLoader (config_loader.py)
"""

import unittest
from unittest.mock import MagicMock
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.stage_interface import (
    StageContext,
    StageResult,
    StageStatus,
)
from orchestrator.registry import StageRegistry
from orchestrator.state_machine import (
    WorkflowExecution,
    StageExecution,
    WorkflowStatus,
)
from orchestrator.config_loader import (
    OrchestratorConfig,
    StageConfig,
    WorkflowConfig,
    ConfigLoader,
)


class TestStageStatus(unittest.TestCase):
    """Test StageStatus enum."""

    def test_status_values(self):
        """Test that all expected status values exist."""
        self.assertEqual(StageStatus.PENDING.value, "pending")
        self.assertEqual(StageStatus.RUNNING.value, "running")
        self.assertEqual(StageStatus.COMPLETED.value, "completed")
        self.assertEqual(StageStatus.FAILED.value, "failed")
        self.assertEqual(StageStatus.SKIPPED.value, "skipped")

    def test_status_comparison(self):
        """Test status enum comparison."""
        self.assertEqual(StageStatus.PENDING, StageStatus.PENDING)
        self.assertNotEqual(StageStatus.PENDING, StageStatus.COMPLETED)


class TestStageResult(unittest.TestCase):
    """Test StageResult dataclass."""

    def test_create_success_result(self):
        """Test creating a successful result."""
        result = StageResult(
            status=StageStatus.COMPLETED,
            message="Stage completed successfully",
        )
        self.assertEqual(result.status, StageStatus.COMPLETED)
        self.assertEqual(result.message, "Stage completed successfully")
        self.assertIsNone(result.error)
        self.assertEqual(result.artifacts, {})

    def test_create_failed_result(self):
        """Test creating a failed result."""
        result = StageResult(
            status=StageStatus.FAILED,
            message="Stage failed",
            error="Connection timeout",
        )
        self.assertEqual(result.status, StageStatus.FAILED)
        self.assertEqual(result.error, "Connection timeout")

    def test_result_with_artifacts(self):
        """Test result with artifacts."""
        result = StageResult(
            status=StageStatus.COMPLETED,
            message="Build complete",
            artifacts={"output_path": "/path/to/build", "files_changed": 5},
        )
        self.assertEqual(result.artifacts["output_path"], "/path/to/build")
        self.assertEqual(result.artifacts["files_changed"], 5)

    def test_result_with_duration(self):
        """Test result with duration."""
        result = StageResult(
            status=StageStatus.COMPLETED,
            message="Done",
            duration_ms=5000,
        )
        self.assertEqual(result.duration_ms, 5000)


class TestStageContext(unittest.TestCase):
    """Test StageContext dataclass."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_state = MagicMock()
        self.mock_logger = MagicMock()
        self.mock_notifier = MagicMock()

    def test_create_context(self):
        """Test creating a stage context."""
        ctx = StageContext(
            adw_id="ADW-12345678",
            issue_number="123",
            state=self.mock_state,
            worktree_path="/path/to/worktree",
            logger=self.mock_logger,
            notifier=self.mock_notifier,
        )

        self.assertEqual(ctx.adw_id, "ADW-12345678")
        self.assertEqual(ctx.issue_number, "123")
        self.assertEqual(ctx.worktree_path, "/path/to/worktree")
        self.assertIsNotNone(ctx.notifier)
        self.assertEqual(ctx.config, {})

    def test_context_with_notifier(self):
        """Test context with notifier."""
        ctx = StageContext(
            adw_id="ADW-12345678",
            issue_number="123",
            state=self.mock_state,
            worktree_path="/path/to/worktree",
            logger=self.mock_logger,
            notifier=self.mock_notifier,
        )

        self.assertIsNotNone(ctx.notifier)

    def test_context_with_config(self):
        """Test context with custom config."""
        ctx = StageContext(
            adw_id="ADW-12345678",
            issue_number="123",
            state=self.mock_state,
            worktree_path="/path/to/worktree",
            logger=self.mock_logger,
            notifier=self.mock_notifier,
            config={"skip_resolution": True, "timeout": 300},
        )

        self.assertEqual(ctx.config["skip_resolution"], True)
        self.assertEqual(ctx.config["timeout"], 300)


class TestStageRegistry(unittest.TestCase):
    """Test StageRegistry singleton and stage discovery."""

    def test_singleton_pattern(self):
        """Test that registry is a singleton."""
        registry1 = StageRegistry()
        registry2 = StageRegistry()
        self.assertIs(registry1, registry2)

    def test_discover_stages(self):
        """Test stage discovery."""
        registry = StageRegistry()
        registry.discover_stages()

        # Should have discovered all built-in stages
        expected_stages = ["plan", "build", "test", "review", "document", "merge"]
        discovered = registry.list_stages()

        for stage_name in expected_stages:
            self.assertIn(stage_name, discovered)

    def test_create_stage(self):
        """Test creating a stage instance."""
        registry = StageRegistry()
        registry.discover_stages()

        stage = registry.create("plan")
        self.assertIsNotNone(stage)
        self.assertEqual(stage.name, "plan")

    def test_create_unknown_stage_returns_none(self):
        """Test creating unknown stage returns None."""
        registry = StageRegistry()
        stage = registry.create("unknown_stage")
        self.assertIsNone(stage)

    def test_list_stages_returns_only_valid_stages(self):
        """Test that list_stages returns valid stage names."""
        registry = StageRegistry()
        registry.discover_stages()

        stages = registry.list_stages()
        # Each stage should be creatable
        for stage_name in stages:
            stage = registry.create(stage_name)
            self.assertIsNotNone(stage)


class TestStageExecution(unittest.TestCase):
    """Test StageExecution state tracking."""

    def test_create_stage_execution(self):
        """Test creating stage execution."""
        exec = StageExecution(stage_name="plan")

        self.assertEqual(exec.stage_name, "plan")
        self.assertEqual(exec.status, StageStatus.PENDING)
        self.assertEqual(exec.attempts, 0)
        self.assertIsNone(exec.started_at)
        self.assertIsNone(exec.completed_at)
        self.assertIsNone(exec.error)

    def test_stage_execution_to_dict(self):
        """Test serializing stage execution to dict."""
        exec = StageExecution(stage_name="build")
        exec.status = StageStatus.RUNNING
        exec.started_at = datetime(2024, 1, 1, 12, 0, 0)
        exec.attempts = 1

        data = exec.to_dict()

        self.assertEqual(data["stage_name"], "build")
        self.assertEqual(data["status"], "running")
        self.assertEqual(data["attempts"], 1)
        self.assertIsNotNone(data["started_at"])

    def test_stage_execution_from_dict(self):
        """Test deserializing stage execution from dict."""
        data = {
            "stage_name": "test",
            "status": "completed",
            "attempts": 2,
            "started_at": "2024-01-01T12:00:00",
            "completed_at": "2024-01-01T12:05:00",
            "error": None,
        }

        exec = StageExecution.from_dict(data)

        self.assertEqual(exec.stage_name, "test")
        self.assertEqual(exec.status, StageStatus.COMPLETED)
        self.assertEqual(exec.attempts, 2)


class TestWorkflowExecution(unittest.TestCase):
    """Test WorkflowExecution state tracking."""

    def test_create_workflow_execution(self):
        """Test creating workflow execution."""
        stages = [
            StageExecution(stage_name="plan"),
            StageExecution(stage_name="build"),
        ]
        exec = WorkflowExecution(
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stages=stages,
        )

        self.assertEqual(exec.workflow_name, "sdlc")
        self.assertEqual(exec.adw_id, "ADW-12345678")
        self.assertEqual(exec.status, WorkflowStatus.PENDING)
        self.assertEqual(len(exec.stages), 2)
        self.assertEqual(exec.current_stage_index, 0)

    def test_workflow_execution_to_dict(self):
        """Test serializing workflow execution."""
        stages = [StageExecution(stage_name="plan")]
        exec = WorkflowExecution(
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stages=stages,
        )
        exec.status = WorkflowStatus.RUNNING
        exec.started_at = datetime(2024, 1, 1, 12, 0, 0)

        data = exec.to_dict()

        self.assertEqual(data["workflow_name"], "sdlc")
        self.assertEqual(data["adw_id"], "ADW-12345678")
        self.assertEqual(data["status"], "running")
        self.assertEqual(len(data["stages"]), 1)

    def test_workflow_execution_from_dict(self):
        """Test deserializing workflow execution."""
        data = {
            "workflow_name": "plan_build",
            "adw_id": "ADW-87654321",
            "status": "completed",
            "current_stage_index": 2,
            "started_at": "2024-01-01T12:00:00",
            "completed_at": "2024-01-01T12:30:00",
            "error": None,
            "stages": [
                {"stage_name": "plan", "status": "completed", "attempts": 1},
                {"stage_name": "build", "status": "completed", "attempts": 1},
            ],
        }

        exec = WorkflowExecution.from_dict(data)

        self.assertEqual(exec.workflow_name, "plan_build")
        self.assertEqual(exec.status, WorkflowStatus.COMPLETED)
        self.assertEqual(len(exec.stages), 2)

    def test_is_resumable_for_failed(self):
        """Test workflow resumable check for failed status."""
        stages = [
            StageExecution(stage_name="plan"),
            StageExecution(stage_name="build"),
        ]

        exec = WorkflowExecution(
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stages=stages,
        )

        # Pending workflow is not resumable
        self.assertFalse(exec.is_resumable())

        # Running workflow is NOT resumable (only FAILED/PAUSED are)
        exec.status = WorkflowStatus.RUNNING
        self.assertFalse(exec.is_resumable())

        # Failed workflow IS resumable
        exec.status = WorkflowStatus.FAILED
        self.assertTrue(exec.is_resumable())

        # Paused workflow IS resumable
        exec.status = WorkflowStatus.PAUSED
        self.assertTrue(exec.is_resumable())

        # Completed workflow is not resumable
        exec.status = WorkflowStatus.COMPLETED
        self.assertFalse(exec.is_resumable())


class TestOrchestratorConfig(unittest.TestCase):
    """Test OrchestratorConfig dataclass."""

    def test_default_config(self):
        """Test default configuration values."""
        config = OrchestratorConfig()

        self.assertEqual(config.stages, [])
        self.assertEqual(config.max_instances, 1)
        self.assertEqual(config.max_retries, 0)
        self.assertFalse(config.continue_on_failure)
        self.assertIsNone(config.on_stage_start)
        self.assertIsNone(config.on_stage_complete)
        self.assertIsNone(config.on_workflow_complete)
        self.assertEqual(config.timeout_minutes, 60)

    def test_config_with_stages(self):
        """Test configuration with stages."""
        config = OrchestratorConfig(stages=["plan", "build", "test"])

        self.assertEqual(config.stages, ["plan", "build", "test"])

    def test_config_with_extensible_options(self):
        """Test configuration with extensible options."""
        config = OrchestratorConfig(
            stages=["plan", "build"],
            max_instances=3,
            max_retries=2,
            continue_on_failure=True,
            on_workflow_complete="https://webhook.example.com/complete",
        )

        self.assertEqual(config.max_instances, 3)
        self.assertEqual(config.max_retries, 2)
        self.assertTrue(config.continue_on_failure)
        self.assertEqual(config.on_workflow_complete, "https://webhook.example.com/complete")

    def test_from_dict(self):
        """Test creating config from dict."""
        data = {
            "stages": ["plan", "build", "test"],
            "max_instances": 2,
            "continue_on_failure": True,
        }

        config = OrchestratorConfig.from_dict(data)

        self.assertEqual(config.stages, ["plan", "build", "test"])
        self.assertEqual(config.max_instances, 2)
        self.assertTrue(config.continue_on_failure)

    def test_from_dict_ignores_unknown_fields(self):
        """Test that unknown fields are ignored."""
        data = {
            "stages": ["plan"],
            "unknown_field": "value",
            "another_unknown": 123,
        }

        config = OrchestratorConfig.from_dict(data)
        self.assertEqual(config.stages, ["plan"])

    def test_get_stage_config(self):
        """Test getting stage-specific config."""
        config = OrchestratorConfig(stages=["plan", "build"])

        # Returns default config for unknown stage
        stage_cfg = config.get_stage_config("plan")
        self.assertEqual(stage_cfg.name, "plan")
        self.assertTrue(stage_cfg.enabled)


class TestStageConfig(unittest.TestCase):
    """Test StageConfig dataclass."""

    def test_default_stage_config(self):
        """Test default stage config."""
        config = StageConfig(name="plan")

        self.assertEqual(config.name, "plan")
        self.assertTrue(config.enabled)
        self.assertTrue(config.required)
        self.assertEqual(config.custom_args, {})
        self.assertEqual(config.depends_on, [])

    def test_disabled_stage(self):
        """Test disabled stage config."""
        config = StageConfig(name="test", enabled=False)

        self.assertFalse(config.enabled)

    def test_stage_with_custom_args(self):
        """Test stage with custom arguments."""
        config = StageConfig(
            name="review",
            custom_args={"skip_resolution": True, "timeout": 600},
        )

        self.assertEqual(config.custom_args["skip_resolution"], True)
        self.assertEqual(config.custom_args["timeout"], 600)


class TestWorkflowConfig(unittest.TestCase):
    """Test WorkflowConfig dataclass."""

    def test_create_workflow_config(self):
        """Test creating workflow config."""
        stages = [
            StageConfig(name="plan"),
            StageConfig(name="build"),
        ]
        config = WorkflowConfig(
            name="plan_build",
            display_name="Plan and Build",
            description="A workflow that plans and builds",
            stages=stages,
        )

        self.assertEqual(config.name, "plan_build")
        self.assertEqual(config.display_name, "Plan and Build")
        self.assertEqual(config.description, "A workflow that plans and builds")
        self.assertEqual(len(config.stages), 2)

    def test_workflow_config_with_failure_handling(self):
        """Test workflow config with failure handling."""
        config = WorkflowConfig(
            name="sdlc",
            display_name="Full SDLC",
            description="Full SDLC workflow",
            stages=[StageConfig(name="plan")],
            on_failure={"strategy": "continue", "notify": True},
        )

        self.assertEqual(config.on_failure["strategy"], "continue")


class TestConfigLoader(unittest.TestCase):
    """Test ConfigLoader functionality."""

    def test_load_from_stages(self):
        """Test loading config from stage list."""
        loader = ConfigLoader()
        config = loader.load_from_stages(["plan", "build", "test"])

        # Name should be dynamic_*
        self.assertTrue(config.name.startswith("dynamic_"))
        self.assertEqual(len(config.stages), 3)
        self.assertEqual(config.stages[0].name, "plan")
        self.assertEqual(config.stages[1].name, "build")
        self.assertEqual(config.stages[2].name, "test")

    def test_load_from_orchestrator_config(self):
        """Test loading from OrchestratorConfig."""
        loader = ConfigLoader()
        orch_config = OrchestratorConfig(stages=["plan", "build"])
        config = loader.load_from_orchestrator_config(orch_config)

        self.assertEqual(len(config.stages), 2)
        self.assertEqual(config.stages[0].name, "plan")
        self.assertEqual(config.stages[1].name, "build")

    def test_load_unknown_workflow_raises(self):
        """Test that loading unknown workflow raises ValueError."""
        loader = ConfigLoader()

        with self.assertRaises(ValueError):
            loader.load("unknown_workflow")
        # Just verify it raises ValueError - message format may vary

    def test_stage_dependencies_created(self):
        """Test that stage dependencies are created correctly."""
        loader = ConfigLoader()
        config = loader.load_from_stages(["plan", "build", "test"])

        # First stage has no dependencies
        self.assertEqual(config.stages[0].depends_on, [])

        # Second stage depends on first
        self.assertEqual(config.stages[1].depends_on, ["plan"])

        # Third stage depends on second
        self.assertEqual(config.stages[2].depends_on, ["build"])


def run_tests():
    """Run the test suite."""
    print("Running Orchestrator Package Unit Tests...")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestStageStatus))
    suite.addTests(loader.loadTestsFromTestCase(TestStageResult))
    suite.addTests(loader.loadTestsFromTestCase(TestStageContext))
    suite.addTests(loader.loadTestsFromTestCase(TestStageRegistry))
    suite.addTests(loader.loadTestsFromTestCase(TestStageExecution))
    suite.addTests(loader.loadTestsFromTestCase(TestWorkflowExecution))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestStageConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestWorkflowConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestConfigLoader))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\nTest Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\nAll orchestrator package tests passed!")
        return True
    else:
        print("\nSome tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
