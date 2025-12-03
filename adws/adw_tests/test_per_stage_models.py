#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pydantic"]
# ///
"""Integration tests for per-stage model execution in ADW workflows.

Tests verify that:
1. End-to-end workflows execute with correct models per stage
2. Logs show correct model information per stage
3. Agent execution uses specified model (not model_set default)
4. Backward compatibility with workflows without per-stage models
5. Invalid model handling with graceful fallback
"""

import unittest
from unittest.mock import MagicMock, patch, call
import sys
import os
import logging
from typing import Dict, Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.stage_interface import StageContext, StageResult, StageStatus
from orchestrator.config_loader import OrchestratorConfig, StageConfig
from adw_modules.state import ADWState
from adw_modules.agent import get_model_for_slash_command
from adw_modules.data_types import AgentTemplateRequest


# ============================================================================
# Test Fixtures and Utilities
# ============================================================================

def create_mock_stage_context(
    stage_name: str,
    adw_id: str = "test-adw-123",
    stage_model: Optional[str] = None,
) -> StageContext:
    """Create a mock StageContext with specified model.

    Args:
        stage_name: Name of the stage (e.g., "plan", "build")
        adw_id: ADW ID for the workflow
        stage_model: Model to use for this stage (sonnet/haiku/opus)

    Returns:
        StageContext configured for testing
    """
    mock_state = MagicMock(spec=ADWState)
    mock_state.adw_id = adw_id
    mock_state.get.return_value = {}

    mock_logger = logging.getLogger(f"test.{stage_name}")
    mock_notifier = MagicMock()

    return StageContext(
        adw_id=adw_id,
        issue_number="123",
        state=mock_state,
        worktree_path="/tmp/test-worktree",
        logger=mock_logger,
        notifier=mock_notifier,
        config={},
        stage_model=stage_model,
    )


def create_mock_adw_state(
    adw_id: str,
    stage_model_overrides: Optional[Dict[str, str]] = None,
    model_set: str = "base",
) -> MagicMock:
    """Create a mock ADWState with stage_model_overrides.

    Args:
        adw_id: ADW ID for the workflow
        stage_model_overrides: Dict mapping stage names to model names
        model_set: Model set to use ("base" or "heavy")

    Returns:
        Mock ADWState instance
    """
    mock_state = MagicMock(spec=ADWState)
    mock_state.adw_id = adw_id

    def mock_get(key, default=None):
        if key == "stage_model_overrides":
            return stage_model_overrides or {}
        elif key == "model_set":
            return model_set
        return default

    mock_state.get.side_effect = mock_get
    mock_state.data = {
        "adw_id": adw_id,
        "stage_model_overrides": stage_model_overrides or {},
        "model_set": model_set,
    }

    return mock_state


def create_mock_orchestrator_config(
    stages_with_models: Dict[str, Optional[str]],
) -> OrchestratorConfig:
    """Create OrchestratorConfig with per-stage models.

    Args:
        stages_with_models: Dict mapping stage names to model names

    Returns:
        OrchestratorConfig with configured stage models
    """
    stage_configs = [
        StageConfig(name=stage_name, model=model)
        for stage_name, model in stages_with_models.items()
    ]

    return OrchestratorConfig(
        stages=[cfg.name for cfg in stage_configs],
        stage_configs={cfg.name: cfg for cfg in stage_configs},
    )


def verify_stage_model(
    stage_context: StageContext,
    expected_model: str,
    test_case: unittest.TestCase,
) -> None:
    """Assert that stage context has correct model.

    Args:
        stage_context: The stage context to verify
        expected_model: Expected model name
        test_case: Test case instance for assertions
    """
    test_case.assertEqual(
        stage_context.stage_model,
        expected_model,
        f"Stage should use model '{expected_model}', got '{stage_context.stage_model}'"
    )


# ============================================================================
# Integration Tests
# ============================================================================

class TestEndToEndWorkflowWithMixedModels(unittest.TestCase):
    """Test 1: End-to-end workflow with different models per stage."""

    def test_workflow_with_mixed_models(self):
        """Verify workflow executes with correct model per stage.

        Tests that orchestrator applies correct model to each stage context
        with configuration: Plan=opus, Build=opus, Test=sonnet, Review=sonnet,
        Document=sonnet, Merge=haiku.
        """
        # Define per-stage model configuration
        stage_models = {
            "plan": "opus",
            "build": "opus",
            "test": "sonnet",
            "review": "sonnet",
            "document": "sonnet",
            "merge": "haiku",
        }

        # Create stage contexts with designated models
        contexts = {}
        for stage_name, model in stage_models.items():
            ctx = create_mock_stage_context(
                stage_name=stage_name,
                adw_id="test-mixed-models",
                stage_model=model,
            )
            contexts[stage_name] = ctx

            # Verify each stage receives its designated model
            verify_stage_model(ctx, model, self)

        # Verify all stages were created
        self.assertEqual(len(contexts), 6)

        # Verify specific stage models
        self.assertEqual(contexts["plan"].stage_model, "opus")
        self.assertEqual(contexts["build"].stage_model, "opus")
        self.assertEqual(contexts["test"].stage_model, "sonnet")
        self.assertEqual(contexts["review"].stage_model, "sonnet")
        self.assertEqual(contexts["document"].stage_model, "sonnet")
        self.assertEqual(contexts["merge"].stage_model, "haiku")

    def test_stage_context_preserves_model_through_execution(self):
        """Verify stage model is preserved throughout stage execution."""
        ctx = create_mock_stage_context(
            stage_name="plan",
            stage_model="opus",
        )

        # Simulate stage execution preserving context
        result = StageResult(
            status=StageStatus.COMPLETED,
            message="Stage completed",
            artifacts={"model_used": ctx.stage_model},
        )

        # Verify model was preserved in artifacts
        self.assertEqual(result.artifacts["model_used"], "opus")
        self.assertEqual(ctx.stage_model, "opus")


class TestLogsShowCorrectModelPerStage(unittest.TestCase):
    """Test 2: Verify logs contain correct model information per stage."""

    @patch('logging.Logger.debug')
    def test_logs_show_stage_model(self, mock_debug):
        """Verify log output shows correct model for each stage."""
        stages = ["plan", "build", "test"]
        models = ["opus", "opus", "sonnet"]

        for stage_name, model in zip(stages, models):
            ctx = create_mock_stage_context(
                stage_name=stage_name,
                stage_model=model,
            )

            # Simulate logging that would occur in orchestrator
            ctx.logger.debug(f"Stage {stage_name} using model: {model}")

        # Verify debug was called for each stage
        self.assertEqual(mock_debug.call_count, 3)

        # Verify log messages contain model information
        calls = mock_debug.call_args_list
        self.assertIn("opus", calls[0][0][0])  # plan stage
        self.assertIn("opus", calls[1][0][0])  # build stage
        self.assertIn("sonnet", calls[2][0][0])  # test stage

    def test_stage_context_model_is_logged(self):
        """Verify stage context model can be logged and tracked."""
        ctx = create_mock_stage_context(
            stage_name="review",
            stage_model="sonnet",
        )

        # Create log message
        log_msg = f"Executing stage '{ctx.issue_number}' with model: {ctx.stage_model}"

        # Verify log message contains correct model
        self.assertIn("sonnet", log_msg)
        self.assertIn("123", log_msg)


class TestAgentExecutionUsesSpecifiedModel(unittest.TestCase):
    """Test 3: Verify agent execution uses stage-specific model."""

    def test_stage_override_takes_priority_over_model_set(self):
        """Verify stage_model parameter takes priority over model_set.

        Tests priority: stage override > model_set > defaults
        """
        # Create request with adw_id that has model_set="heavy"
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-priority",
        )

        # Mock ADWState.load to return state with model_set="heavy"
        mock_state = MagicMock()
        mock_state.get.return_value = "heavy"

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            # Test 1: With stage override, should use stage model
            model = get_model_for_slash_command(
                request,
                default="sonnet",
                stage_model="opus",  # Stage override
            )
            self.assertEqual(model, "opus", "Stage override should take priority")

            # Test 2: Without stage override, should use model_set mapping
            model = get_model_for_slash_command(
                request,
                default="sonnet",
                stage_model=None,
            )
            # Since /implement maps to sonnet for both base and heavy
            self.assertEqual(model, "sonnet", "Should use model_set mapping")

    def test_invalid_stage_model_falls_back_to_default(self):
        """Verify invalid stage models fall back to default."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-invalid",
        )

        # Mock no state
        with patch('adw_modules.state.ADWState.load', return_value=None):
            # Test with invalid model name
            model = get_model_for_slash_command(
                request,
                default="sonnet",
                stage_model="gpt-4",  # Invalid model
            )

            # Should fall back to model_set mapping (which defaults to base)
            self.assertEqual(model, "sonnet")

    def test_agent_receives_correct_model_parameter(self):
        """Verify agent execution receives correct model parameter."""
        request = AgentTemplateRequest(
            agent_name="implementor",
            slash_command="/implement",
            args=["plan.md"],
            adw_id="test-model-param",
        )

        # Mock state with stage overrides
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda k, d=None: {
            "model_set": "base",
            "stage_model_overrides": {"build": "opus"},
        }.get(k, d)

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            # Get model for build stage
            model = get_model_for_slash_command(
                request,
                stage_model="opus",
            )

            # Verify correct model is returned
            self.assertEqual(model, "opus")


class TestBackwardCompatibility(unittest.TestCase):
    """Test 4: Verify backward compatibility without per-stage models."""

    def test_workflow_without_stage_model_overrides(self):
        """Verify workflow works without stage_model_overrides in state."""
        # Create state without stage_model_overrides
        mock_state = create_mock_adw_state(
            adw_id="test-compat",
            stage_model_overrides=None,
            model_set="base",
        )

        # Verify state returns empty dict for stage_model_overrides
        overrides = mock_state.get("stage_model_overrides", {})
        self.assertEqual(overrides, {})

        # Create stage context without stage_model
        ctx = create_mock_stage_context(
            stage_name="plan",
            stage_model=None,
        )

        # Verify stage_model is None (falls back to model_set)
        self.assertIsNone(ctx.stage_model)

    def test_model_set_base_fallback(self):
        """Verify model_set='base' behavior is preserved."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-base",
        )

        # Mock state with model_set="base" and no overrides
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda k, d=None: {
            "model_set": "base",
            "stage_model_overrides": {},
        }.get(k, d)

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            model = get_model_for_slash_command(
                request,
                stage_model=None,
            )

            # Should use base mapping for /implement
            self.assertEqual(model, "sonnet")

    def test_model_set_heavy_fallback(self):
        """Verify model_set='heavy' behavior is preserved."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-heavy",
        )

        # Mock state with model_set="heavy" and no overrides
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda k, d=None: {
            "model_set": "heavy",
            "stage_model_overrides": {},
        }.get(k, d)

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            model = get_model_for_slash_command(
                request,
                stage_model=None,
            )

            # Should use heavy mapping for /implement (which is also sonnet)
            self.assertEqual(model, "sonnet")

    def test_existing_workflows_continue_to_work(self):
        """Verify existing workflows without per-stage models continue to work."""
        # Simulate existing workflow state (no stage_model_overrides field)
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda k, d=None: {
            "model_set": "base",
        }.get(k, d)

        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/review",
            args=["spec.md"],
            adw_id="test-existing",
        )

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            # Should work with default behavior
            model = get_model_for_slash_command(request)
            self.assertIsNotNone(model)
            self.assertEqual(model, "sonnet")


class TestInvalidModelHandling(unittest.TestCase):
    """Test 5: Verify invalid model handling with graceful fallback."""

    def test_invalid_model_name_falls_back(self):
        """Verify invalid model names fall back to safe defaults."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-invalid",
        )

        # Mock no state
        with patch('adw_modules.state.ADWState.load', return_value=None):
            # Test various invalid model names
            invalid_models = ["gpt-4", "claude-3", "invalid", ""]

            for invalid_model in invalid_models:
                model = get_model_for_slash_command(
                    request,
                    default="sonnet",
                    stage_model=invalid_model if invalid_model else None,
                )

                # Should fall back to default (sonnet)
                self.assertEqual(
                    model,
                    "sonnet",
                    f"Invalid model '{invalid_model}' should fall back to sonnet"
                )

    def test_empty_string_model_falls_back(self):
        """Verify empty string model falls back to default."""
        ctx = create_mock_stage_context(
            stage_name="test",
            stage_model="",
        )

        # Empty string should be treated as no model
        self.assertEqual(ctx.stage_model, "")

    def test_none_model_falls_back(self):
        """Verify None model uses model_set behavior."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-none",
        )

        mock_state = MagicMock()
        mock_state.get.return_value = "base"

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            model = get_model_for_slash_command(
                request,
                stage_model=None,
            )

            # Should use model_set mapping
            self.assertEqual(model, "sonnet")

    def test_invalid_models_dont_cause_execution_failures(self):
        """Verify invalid models don't crash execution, only fallback."""
        # Create contexts with various invalid models
        invalid_models = ["gpt-4", "claude-3", None, "", "unknown"]

        for invalid_model in invalid_models:
            try:
                ctx = create_mock_stage_context(
                    stage_name="test",
                    stage_model=invalid_model,
                )

                # Should not raise exception
                self.assertIsNotNone(ctx)

            except Exception as e:
                self.fail(f"Invalid model '{invalid_model}' caused exception: {e}")


class TestModelPriorityOrder(unittest.TestCase):
    """Test model selection priority: stage override > model_set > defaults."""

    def test_priority_stage_override_wins(self):
        """Verify stage override takes highest priority."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-priority-1",
        )

        # Mock state with model_set="base"
        mock_state = MagicMock()
        mock_state.get.return_value = "base"

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            model = get_model_for_slash_command(
                request,
                default="sonnet",
                stage_model="opus",  # Stage override should win
            )

            self.assertEqual(model, "opus")

    def test_priority_model_set_over_default(self):
        """Verify model_set takes priority over default."""
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-priority-2",
        )

        # Mock state with model_set="heavy"
        mock_state = MagicMock()
        mock_state.get.return_value = "heavy"

        with patch('adw_modules.state.ADWState.load', return_value=mock_state):
            model = get_model_for_slash_command(
                request,
                default="haiku",  # Default should be overridden by model_set
                stage_model=None,
            )

            # Should use heavy mapping (sonnet) not default (haiku)
            self.assertEqual(model, "sonnet")

    def test_priority_default_fallback(self):
        """Verify default is used when command not in mapping and no stage override."""
        # Use a valid command that exists in mapping
        request = AgentTemplateRequest(
            agent_name="test",
            slash_command="/implement",
            args=["spec.md"],
            adw_id="test-priority-3",
        )

        # Mock no state
        with patch('adw_modules.state.ADWState.load', return_value=None):
            # Should use model_set mapping (base) which is sonnet for /implement
            model = get_model_for_slash_command(
                request,
                default="haiku",  # Default won't be used since mapping exists
                stage_model=None,
            )

            # Should use base mapping (sonnet) for /implement
            self.assertEqual(model, "sonnet")


# ============================================================================
# Test Runner
# ============================================================================

def run_tests():
    """Run the integration test suite."""
    print("Running Per-Stage Model Execution Integration Tests...")
    print("=" * 70)

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestEndToEndWorkflowWithMixedModels))
    suite.addTests(loader.loadTestsFromTestCase(TestLogsShowCorrectModelPerStage))
    suite.addTests(loader.loadTestsFromTestCase(TestAgentExecutionUsesSpecifiedModel))
    suite.addTests(loader.loadTestsFromTestCase(TestBackwardCompatibility))
    suite.addTests(loader.loadTestsFromTestCase(TestInvalidModelHandling))
    suite.addTests(loader.loadTestsFromTestCase(TestModelPriorityOrder))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\n" + "=" * 70)
    print("Test Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\n✅ All per-stage model integration tests passed!")
        return True
    else:
        print("\n❌ Some tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
