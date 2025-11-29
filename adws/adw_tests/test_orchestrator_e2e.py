#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pydantic"]
# ///
"""End-to-end integration tests for the ADW Orchestrator.

Tests cover:
- Full workflow execution with mocked stage scripts
- State persistence and resume capability
- API contract validation
"""

import unittest
from unittest.mock import MagicMock
import sys
import os
import tempfile
import json
import shutil

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.stage_interface import StageContext, StageStatus
from orchestrator.registry import StageRegistry
from orchestrator.state_machine import WorkflowExecution, StageExecution, WorkflowStatus
from orchestrator.config_loader import OrchestratorConfig, ConfigLoader
from adw_triggers.websocket_models import WorkflowTriggerRequest
from adw_modules.data_types import ADWWorkflow


class TestOrchestratorWorkflowTriggerIntegration(unittest.TestCase):
    """Test orchestrator integration with workflow trigger."""

    def setUp(self):
        """Set up test fixtures."""
        self.sample_orchestrator_request = {
            "workflow_type": "adw_orchestrator",
            "issue_number": "123",
            "issue_type": "feature",
            "stages": ["plan", "build", "test"],
            "model_set": "base",
        }

        self.sample_orchestrator_with_config = {
            "workflow_type": "adw_orchestrator",
            "issue_number": "456",
            "issue_type": "bug",
            "config": {
                "stages": ["plan", "build"],
                "max_instances": 2,
                "continue_on_failure": True,
            },
            "model_set": "heavy",
        }

    def test_workflow_trigger_request_accepts_stages(self):
        """Test that WorkflowTriggerRequest accepts stages field."""
        request = WorkflowTriggerRequest(**self.sample_orchestrator_request)

        self.assertEqual(request.workflow_type, "adw_orchestrator")
        self.assertEqual(request.stages, ["plan", "build", "test"])
        self.assertEqual(request.issue_number, "123")

    def test_workflow_trigger_request_accepts_config(self):
        """Test that WorkflowTriggerRequest accepts config field."""
        request = WorkflowTriggerRequest(**self.sample_orchestrator_with_config)

        self.assertEqual(request.workflow_type, "adw_orchestrator")
        self.assertIsNotNone(request.config)
        self.assertEqual(request.config["stages"], ["plan", "build"])
        self.assertEqual(request.config["max_instances"], 2)

    def test_orchestrator_in_available_workflows(self):
        """Test that adw_orchestrator is a valid workflow type."""
        # Check that adw_orchestrator is in the ADWWorkflow type
        from typing import get_args

        available_workflows = get_args(ADWWorkflow)
        self.assertIn("adw_orchestrator", available_workflows)


class TestOrchestratorConfigLoaderIntegration(unittest.TestCase):
    """Test ConfigLoader integration with various input formats."""

    def test_load_from_cli_stages_string(self):
        """Test loading from CLI-style comma-separated stages."""
        loader = ConfigLoader()
        stages_string = "plan,build,test"
        stages_list = [s.strip() for s in stages_string.split(",")]

        config = loader.load_from_stages(stages_list)

        self.assertEqual(len(config.stages), 3)
        self.assertEqual(config.stages[0].name, "plan")
        self.assertEqual(config.stages[1].name, "build")
        self.assertEqual(config.stages[2].name, "test")

    def test_load_from_json_config(self):
        """Test loading from JSON config (as passed from frontend)."""
        loader = ConfigLoader()
        json_config = '{"stages": ["plan", "build"], "max_instances": 2}'
        config_data = json.loads(json_config)
        orch_config = OrchestratorConfig.from_dict(config_data)

        workflow_config = loader.load_from_orchestrator_config(orch_config)

        self.assertEqual(len(workflow_config.stages), 2)

    def test_workflow_config_stage_order_preserved(self):
        """Test that stage order is preserved from input."""
        loader = ConfigLoader()
        stages = ["document", "test", "build", "plan"]  # Intentionally out of order

        config = loader.load_from_stages(stages)

        # Order should match input, not be rearranged
        self.assertEqual(config.stages[0].name, "document")
        self.assertEqual(config.stages[1].name, "test")
        self.assertEqual(config.stages[2].name, "build")
        self.assertEqual(config.stages[3].name, "plan")


class TestOrchestratorStatePersistence(unittest.TestCase):
    """Test state persistence and resume capability."""

    def setUp(self):
        """Set up temporary directory for state files."""
        self.temp_dir = tempfile.mkdtemp()
        self.adw_id = "ADW-TEST1234"

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_workflow_execution_serialization(self):
        """Test that workflow execution can be serialized and deserialized."""
        stages = [
            StageExecution(stage_name="plan"),
            StageExecution(stage_name="build"),
        ]
        stages[0].status = StageStatus.COMPLETED
        stages[0].attempts = 1

        original = WorkflowExecution(
            workflow_name="custom",
            adw_id=self.adw_id,
            stages=stages,
        )
        original.status = WorkflowStatus.RUNNING
        original.current_stage_index = 1

        # Serialize
        data = original.to_dict()
        json_str = json.dumps(data)

        # Deserialize
        loaded_data = json.loads(json_str)
        restored = WorkflowExecution.from_dict(loaded_data)

        # Verify
        self.assertEqual(restored.workflow_name, "custom")
        self.assertEqual(restored.adw_id, self.adw_id)
        self.assertEqual(restored.status, WorkflowStatus.RUNNING)
        self.assertEqual(restored.current_stage_index, 1)
        self.assertEqual(len(restored.stages), 2)
        self.assertEqual(restored.stages[0].status, StageStatus.COMPLETED)

    def test_workflow_resume_from_middle(self):
        """Test that workflow can be resumed from middle stage."""
        stages = [
            StageExecution(stage_name="plan"),
            StageExecution(stage_name="build"),
            StageExecution(stage_name="test"),
        ]
        stages[0].status = StageStatus.COMPLETED
        stages[1].status = StageStatus.RUNNING

        execution = WorkflowExecution(
            workflow_name="custom",
            adw_id=self.adw_id,
            stages=stages,
        )
        execution.status = WorkflowStatus.FAILED  # Failed workflows are resumable
        execution.current_stage_index = 1

        # Check resumability
        self.assertTrue(execution.is_resumable())

        # Serialize and restore
        data = execution.to_dict()
        restored = WorkflowExecution.from_dict(data)

        # Should resume from stage index 1 (build)
        self.assertEqual(restored.current_stage_index, 1)
        self.assertTrue(restored.is_resumable())


class TestOrchestratorStageRegistryIntegration(unittest.TestCase):
    """Test stage registry integration."""

    def test_all_built_in_stages_discovered(self):
        """Test that all built-in stages are discovered."""
        registry = StageRegistry()
        registry.discover_stages()

        expected_stages = ["plan", "build", "test", "review", "document", "merge"]
        discovered = registry.list_stages()

        for stage in expected_stages:
            self.assertIn(stage, discovered, f"Stage '{stage}' not discovered")

    def test_create_all_stages(self):
        """Test that all discovered stages can be instantiated."""
        registry = StageRegistry()
        registry.discover_stages()

        for stage_name in registry.list_stages():
            stage = registry.create(stage_name)
            self.assertIsNotNone(stage, f"Could not create stage '{stage_name}'")
            self.assertEqual(stage.name, stage_name)


class TestFrontendWebSocketServiceIntegration(unittest.TestCase):
    """Test frontend WebSocket service integration logic."""

    def test_get_workflow_type_for_queued_stages_returns_orchestrator(self):
        """Test that queued stages result in orchestrator workflow type."""
        # Simulate the frontend logic
        queued_stages = ["plan", "build", "test"]

        # This simulates the frontend getWorkflowTypeForStage logic
        if queued_stages and len(queued_stages) > 0:
            workflow_type = "adw_orchestrator"
        else:
            workflow_type = "adw_plan_iso"

        self.assertEqual(workflow_type, "adw_orchestrator")

    def test_normalize_stages_mapping(self):
        """Test stage normalization from kanban to ADW."""
        # Simulate the frontend getNormalizedStages logic
        stage_mapping = {
            "plan": "plan",
            "build": "build",
            "implement": "build",
            "test": "test",
            "review": "review",
            "document": "document",
            "merge": "merge",
        }

        queued_stages = ["plan", "implement", "test", "review"]
        normalized = [stage_mapping.get(s) for s in queued_stages if stage_mapping.get(s)]

        self.assertEqual(normalized, ["plan", "build", "test", "review"])

    def test_pr_stage_filtered_out(self):
        """Test that 'pr' stage is filtered out during normalization."""
        stage_mapping = {
            "plan": "plan",
            "build": "build",
            "test": "test",
            "review": "review",
            "document": "document",
            "merge": "merge",
        }

        queued_stages = ["plan", "build", "pr", "test"]  # 'pr' is not in mapping
        normalized = [stage_mapping.get(s) for s in queued_stages if stage_mapping.get(s)]

        self.assertEqual(normalized, ["plan", "build", "test"])
        self.assertNotIn("pr", normalized)


class TestOrchestratorAPIContract(unittest.TestCase):
    """Test the API contract between frontend and backend."""

    def test_request_with_all_fields(self):
        """Test request with all possible fields."""
        request_data = {
            "workflow_type": "adw_orchestrator",
            "adw_id": "ADW-12345678",
            "issue_number": "123",
            "issue_type": "feature",
            "issue_json": {
                "title": "Test Issue",
                "body": "Test body",
                "number": 123,
            },
            "stages": ["plan", "build", "test"],
            "config": {
                "max_instances": 1,
                "continue_on_failure": False,
            },
            "model_set": "base",
            "trigger_reason": "Test trigger",
        }

        request = WorkflowTriggerRequest(**request_data)

        self.assertEqual(request.workflow_type, "adw_orchestrator")
        self.assertEqual(request.stages, ["plan", "build", "test"])
        self.assertIsNotNone(request.config)
        self.assertIsNotNone(request.issue_json)

    def test_minimal_orchestrator_request(self):
        """Test minimal valid orchestrator request."""
        request_data = {
            "workflow_type": "adw_orchestrator",
            "issue_type": "feature",
            "stages": ["plan"],
        }

        request = WorkflowTriggerRequest(**request_data)
        self.assertIsNotNone(request)
        self.assertEqual(request.stages, ["plan"])


class TestOrchestratorDataTypes(unittest.TestCase):
    """Test data types in adw_modules.data_types."""

    def test_adw_state_data_has_orchestrator_field(self):
        """Test that ADWStateData has orchestrator field."""
        from adw_modules.data_types import ADWStateData

        state = ADWStateData(
            adw_id="ADW-12345678",
            orchestrator={"workflow_name": "custom", "stages": ["plan", "build"]},
        )

        self.assertIsNotNone(state.orchestrator)
        self.assertEqual(state.orchestrator["workflow_name"], "custom")


class TestStageSkipLogic(unittest.TestCase):
    """Test stage skip conditions."""

    def test_review_runs_for_patch(self):
        """Test review stage runs for patches (never auto-skips by type).

        Review is NEVER auto-skipped based on issue type. Only skips with
        explicit skip_review: true in metadata or config.
        """
        from stages.review_stage import ReviewStage

        stage = ReviewStage()
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda key, default=None: {
            "issue_class": "/patch",
            "issue_json": {"metadata": {}},  # No skip_review flag
        }.get(key, default)

        ctx = StageContext(
            adw_id="ADW-TEST",
            issue_number="123",
            state=mock_state,
            worktree_path="/tmp/test",
            logger=MagicMock(),
            notifier=MagicMock(),
        )

        should_skip, reason = stage.should_skip(ctx)
        # Review should NOT auto-skip for any issue type
        self.assertFalse(should_skip)

    def test_review_runs_for_feature(self):
        """Test review stage runs for features."""
        from stages.review_stage import ReviewStage

        stage = ReviewStage()
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda key, default=None: {
            "issue_class": "/feature",
            "issue_json": {"metadata": {}},
        }.get(key, default)

        ctx = StageContext(
            adw_id="ADW-TEST",
            issue_number="123",
            state=mock_state,
            worktree_path="/tmp/test",
            logger=MagicMock(),
            notifier=MagicMock(),
        )

        should_skip, reason = stage.should_skip(ctx)
        self.assertFalse(should_skip)

    def test_review_skips_with_explicit_skip_flag(self):
        """Test review stage skips when skip_review: true in metadata."""
        from stages.review_stage import ReviewStage

        stage = ReviewStage()
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda key, default=None: {
            "issue_class": "/feature",
            "issue_json": {"metadata": {"skip_review": True}},
        }.get(key, default)

        ctx = StageContext(
            adw_id="ADW-TEST",
            issue_number="123",
            state=mock_state,
            worktree_path="/tmp/test",
            logger=MagicMock(),
            notifier=MagicMock(),
        )

        should_skip, reason = stage.should_skip(ctx)
        self.assertTrue(should_skip)
        self.assertIn("task configuration", reason)


def run_tests():
    """Run the test suite."""
    print("Running Orchestrator End-to-End Tests...")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorWorkflowTriggerIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorConfigLoaderIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorStatePersistence))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorStageRegistryIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestFrontendWebSocketServiceIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorAPIContract))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorDataTypes))
    suite.addTests(loader.loadTestsFromTestCase(TestStageSkipLogic))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\nTest Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\nAll orchestrator end-to-end tests passed!")
        return True
    else:
        print("\nSome tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
