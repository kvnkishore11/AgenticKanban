#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pydantic"]
# ///
"""Unit tests for the ADW Orchestrator Event System.

Tests cover:
- StageEventType enum (events.py)
- StageEventPayload dataclass (events.py)
- StageEventEmitter class (event_emitter.py)
- Integration with ADWOrchestrator event emission
"""

import unittest
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.events import StageEventType, StageEventPayload
from orchestrator.event_emitter import StageEventEmitter


class TestStageEventType(unittest.TestCase):
    """Test StageEventType enum."""

    def test_event_type_values(self):
        """Test that all expected event type values exist."""
        self.assertEqual(StageEventType.STAGE_STARTED.value, "stage_started")
        self.assertEqual(StageEventType.STAGE_COMPLETED.value, "stage_completed")
        self.assertEqual(StageEventType.STAGE_FAILED.value, "stage_failed")
        self.assertEqual(StageEventType.STAGE_SKIPPED.value, "stage_skipped")
        self.assertEqual(StageEventType.WORKFLOW_STARTED.value, "workflow_started")
        self.assertEqual(StageEventType.WORKFLOW_COMPLETED.value, "workflow_completed")
        self.assertEqual(StageEventType.WORKFLOW_FAILED.value, "workflow_failed")

    def test_event_type_is_string_enum(self):
        """Test that event types are string enum values."""
        self.assertIsInstance(StageEventType.STAGE_STARTED.value, str)
        # Event types can be used as strings
        self.assertEqual(f"{StageEventType.STAGE_STARTED.value}", "stage_started")


class TestStageEventPayload(unittest.TestCase):
    """Test StageEventPayload dataclass."""

    def test_create_basic_payload(self):
        """Test creating a basic event payload."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Starting build stage",
        )

        self.assertEqual(payload.event_type, StageEventType.STAGE_STARTED)
        self.assertEqual(payload.workflow_name, "sdlc")
        self.assertEqual(payload.adw_id, "ADW-12345678")
        self.assertEqual(payload.stage_name, "build")
        self.assertEqual(payload.previous_stage, "plan")
        self.assertEqual(payload.next_stage, "test")
        self.assertEqual(payload.message, "Starting build stage")

    def test_payload_with_null_stages(self):
        """Test payload with null previous/next stages."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="plan",
            previous_stage=None,  # First stage has no previous
            next_stage="build",
            message="Starting plan stage",
        )

        self.assertIsNone(payload.previous_stage)

    def test_payload_with_duration(self):
        """Test payload with duration_ms."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
            duration_ms=30000,
        )

        self.assertEqual(payload.duration_ms, 30000)

    def test_payload_with_error(self):
        """Test payload with error information."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_FAILED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="test",
            previous_stage="build",
            next_stage="review",
            message="Test stage failed",
            error="Test execution timeout",
            duration_ms=60000,
        )

        self.assertEqual(payload.error, "Test execution timeout")

    def test_payload_with_skip_reason(self):
        """Test payload with skip reason."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_SKIPPED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="test",
            previous_stage="build",
            next_stage="review",
            message="Stage skipped",
            skip_reason="No test files found in worktree",
        )

        self.assertEqual(payload.skip_reason, "No test files found in worktree")

    def test_payload_progress_percent_calculation(self):
        """Test progress percentage calculation."""
        # Stage 0 of 3 (STARTED) = 0%
        payload1 = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="plan",
            previous_stage=None,
            next_stage="build",
            message="Starting",
            stage_index=0,
            total_stages=3,
        )
        self.assertEqual(payload1.progress_percent, 0)

        # Stage 1 of 3 (COMPLETED) = 66% (stage_index + 1) / total
        payload2 = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Completed",
            stage_index=1,
            total_stages=3,
        )
        self.assertEqual(payload2.progress_percent, 66)

        # Stage 2 of 3 (SKIPPED) = 100%
        payload3 = StageEventPayload(
            event_type=StageEventType.STAGE_SKIPPED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="test",
            previous_stage="build",
            next_stage=None,
            message="Skipped",
            stage_index=2,
            total_stages=3,
        )
        self.assertEqual(payload3.progress_percent, 100)

    def test_payload_progress_percent_zero_stages(self):
        """Test progress percentage with zero stages."""
        payload = StageEventPayload(
            event_type=StageEventType.WORKFLOW_STARTED,
            workflow_name="empty",
            adw_id="ADW-12345678",
            stage_name="none",
            previous_stage=None,
            next_stage=None,
            message="Starting",
            stage_index=0,
            total_stages=0,  # Edge case
        )
        self.assertEqual(payload.progress_percent, 0)

    def test_payload_with_completed_stages_list(self):
        """Test payload with completed stages list."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="test",
            previous_stage="build",
            next_stage="review",
            message="Starting test",
            completed_stages=["plan", "build"],
            pending_stages=["test", "review", "merge"],
        )

        self.assertEqual(payload.completed_stages, ["plan", "build"])
        self.assertEqual(payload.pending_stages, ["test", "review", "merge"])

    def test_payload_to_dict(self):
        """Test converting payload to dictionary."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
            duration_ms=30000,
            stage_index=1,
            total_stages=5,
            completed_stages=["plan", "build"],
            pending_stages=["test", "review", "merge"],
        )

        data = payload.to_dict()

        self.assertEqual(data["event_type"], "stage_completed")
        self.assertEqual(data["workflow_name"], "sdlc")
        self.assertEqual(data["adw_id"], "ADW-12345678")
        self.assertEqual(data["stage_name"], "build")
        self.assertEqual(data["previous_stage"], "plan")
        self.assertEqual(data["next_stage"], "test")
        self.assertEqual(data["message"], "Build completed")
        self.assertEqual(data["duration_ms"], 30000)
        self.assertEqual(data["stage_index"], 1)
        self.assertEqual(data["total_stages"], 5)
        self.assertEqual(data["completed_stages"], ["plan", "build"])
        self.assertEqual(data["pending_stages"], ["test", "review", "merge"])
        self.assertEqual(data["progress_percent"], 40)  # (1+1)/5 * 100
        self.assertIn("timestamp", data)
        self.assertTrue(data["timestamp"].endswith("Z"))

    def test_payload_to_dict_with_nulls(self):
        """Test to_dict with null values."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="plan",
            previous_stage=None,
            next_stage="build",
            message="Starting",
        )

        data = payload.to_dict()

        self.assertIsNone(data["previous_stage"])
        self.assertIsNone(data["duration_ms"])
        self.assertIsNone(data["error"])
        self.assertIsNone(data["skip_reason"])

    def test_payload_metadata(self):
        """Test payload with custom metadata."""
        payload = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="sdlc",
            adw_id="ADW-12345678",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
            metadata={"files_changed": 5, "tests_passed": 10},
        )

        self.assertEqual(payload.metadata["files_changed"], 5)
        self.assertEqual(payload.metadata["tests_passed"], 10)

        data = payload.to_dict()
        self.assertEqual(data["metadata"]["files_changed"], 5)


class TestStageEventEmitter(unittest.TestCase):
    """Test StageEventEmitter class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a fresh emitter for each test
        self.emitter = StageEventEmitter()

    def test_create_emitter(self):
        """Test creating an event emitter."""
        emitter = StageEventEmitter()
        self.assertIsNotNone(emitter)
        self.assertEqual(emitter.handler_count(), 0)

    def test_register_handler_for_specific_event(self):
        """Test registering a handler for a specific event type."""
        handler = MagicMock()
        self.emitter.on(StageEventType.STAGE_COMPLETED, handler)

        self.assertEqual(self.emitter.handler_count(StageEventType.STAGE_COMPLETED), 1)

    def test_register_global_handler(self):
        """Test registering a global handler."""
        handler = MagicMock()
        self.emitter.on_all(handler)

        # Global handlers are counted in total
        self.assertEqual(self.emitter.handler_count(), 1)

    def test_emit_to_specific_handler(self):
        """Test emitting to a specific handler."""
        handler = MagicMock()
        self.emitter.on(StageEventType.STAGE_COMPLETED, handler)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
        )

        self.emitter.emit(event)

        handler.assert_called_once_with(event)

    def test_emit_to_global_handler(self):
        """Test emitting to a global handler."""
        handler = MagicMock()
        self.emitter.on_all(handler)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="plan",
            previous_stage=None,
            next_stage="build",
            message="Starting plan",
        )

        self.emitter.emit(event)

        handler.assert_called_once_with(event)

    def test_emit_calls_both_specific_and_global_handlers(self):
        """Test that emit calls both specific and global handlers."""
        specific_handler = MagicMock()
        global_handler = MagicMock()

        self.emitter.on(StageEventType.STAGE_COMPLETED, specific_handler)
        self.emitter.on_all(global_handler)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
        )

        self.emitter.emit(event)

        specific_handler.assert_called_once_with(event)
        global_handler.assert_called_once_with(event)

    def test_emit_does_not_call_handler_for_different_event(self):
        """Test that emit doesn't call handler for different event type."""
        handler = MagicMock()
        self.emitter.on(StageEventType.STAGE_COMPLETED, handler)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_FAILED,  # Different type
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build failed",
        )

        self.emitter.emit(event)

        handler.assert_not_called()

    def test_emit_handles_handler_exception(self):
        """Test that emit handles exceptions in handlers gracefully."""
        failing_handler = MagicMock(side_effect=Exception("Handler error"))
        success_handler = MagicMock()

        self.emitter.on_all(failing_handler)
        self.emitter.on_all(success_handler)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_STARTED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="plan",
            previous_stage=None,
            next_stage="build",
            message="Starting",
        )

        # Should not raise
        self.emitter.emit(event)

        # Both handlers should be called (exception doesn't stop other handlers)
        failing_handler.assert_called_once()
        success_handler.assert_called_once()

    def test_off_removes_handler(self):
        """Test removing a handler."""
        handler = MagicMock()
        self.emitter.on(StageEventType.STAGE_COMPLETED, handler)

        # Remove handler
        result = self.emitter.off(StageEventType.STAGE_COMPLETED, handler)
        self.assertTrue(result)

        # Handler should not be called
        event = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
        )

        self.emitter.emit(event)
        handler.assert_not_called()

    def test_off_returns_false_for_unknown_handler(self):
        """Test that off returns False for unknown handler."""
        handler = MagicMock()
        result = self.emitter.off(StageEventType.STAGE_COMPLETED, handler)
        self.assertFalse(result)

    def test_clear_removes_all_handlers(self):
        """Test clearing all handlers."""
        handler1 = MagicMock()
        handler2 = MagicMock()

        self.emitter.on(StageEventType.STAGE_COMPLETED, handler1)
        self.emitter.on_all(handler2)

        self.emitter.clear()

        self.assertEqual(self.emitter.handler_count(), 0)

    def test_multiple_handlers_for_same_event(self):
        """Test multiple handlers for the same event type."""
        handler1 = MagicMock()
        handler2 = MagicMock()

        self.emitter.on(StageEventType.STAGE_COMPLETED, handler1)
        self.emitter.on(StageEventType.STAGE_COMPLETED, handler2)

        event = StageEventPayload(
            event_type=StageEventType.STAGE_COMPLETED,
            workflow_name="test",
            adw_id="ADW-123",
            stage_name="build",
            previous_stage="plan",
            next_stage="test",
            message="Build completed",
        )

        self.emitter.emit(event)

        handler1.assert_called_once_with(event)
        handler2.assert_called_once_with(event)


class TestStageContextEnhancements(unittest.TestCase):
    """Test enhancements to StageContext for event system."""

    def test_stage_context_has_progression_fields(self):
        """Test that StageContext has the new progression fields."""
        from orchestrator.stage_interface import StageContext

        mock_state = MagicMock()
        mock_logger = MagicMock()
        mock_notifier = MagicMock()

        ctx = StageContext(
            adw_id="ADW-12345678",
            issue_number="123",
            state=mock_state,
            worktree_path="/path/to/worktree",
            logger=mock_logger,
            notifier=mock_notifier,
            previous_stage="plan",
            stage_index=1,
            total_stages=5,
            completed_stages=["plan"],
            skipped_stages=[],
        )

        self.assertEqual(ctx.previous_stage, "plan")
        self.assertEqual(ctx.stage_index, 1)
        self.assertEqual(ctx.total_stages, 5)
        self.assertEqual(ctx.completed_stages, ["plan"])
        self.assertEqual(ctx.skipped_stages, [])

    def test_stage_context_default_values(self):
        """Test StageContext default values for progression fields."""
        from orchestrator.stage_interface import StageContext

        mock_state = MagicMock()
        mock_logger = MagicMock()
        mock_notifier = MagicMock()

        ctx = StageContext(
            adw_id="ADW-12345678",
            issue_number="123",
            state=mock_state,
            worktree_path="/path/to/worktree",
            logger=mock_logger,
            notifier=mock_notifier,
        )

        self.assertIsNone(ctx.previous_stage)
        self.assertEqual(ctx.stage_index, 0)
        self.assertEqual(ctx.total_stages, 0)
        self.assertEqual(ctx.completed_stages, [])
        self.assertEqual(ctx.skipped_stages, [])


class TestOrchestratorEventIntegration(unittest.TestCase):
    """Integration tests for orchestrator event emission."""

    def test_orchestrator_has_event_emitter(self):
        """Test that ADWOrchestrator has an event emitter."""
        # Mock dependencies
        with patch('adw_orchestrator.ADWState') as mock_state_class, \
             patch('adw_orchestrator.WebSocketNotifier') as mock_notifier_class, \
             patch('adw_orchestrator.setup_logger') as mock_logger:

            mock_state = MagicMock()
            mock_state.get.return_value = None
            mock_state.data = {}
            mock_state_class.load.return_value = None
            mock_state_class.return_value = mock_state

            from adw_orchestrator import ADWOrchestrator
            from orchestrator.config_loader import WorkflowConfig, StageConfig

            config = WorkflowConfig(
                name="test",
                display_name="Test Workflow",
                description="Test",
                stages=[StageConfig(name="plan")],
            )

            orchestrator = ADWOrchestrator(
                adw_id="ADW-12345678",
                issue_number="123",
                config=config,
            )

            self.assertIsNotNone(orchestrator.event_emitter)
            self.assertIsInstance(orchestrator.event_emitter, StageEventEmitter)

    def test_get_previous_completed_stage(self):
        """Test _get_previous_completed_stage helper method."""
        with patch('adw_orchestrator.ADWState') as mock_state_class, \
             patch('adw_orchestrator.WebSocketNotifier') as mock_notifier_class, \
             patch('adw_orchestrator.setup_logger') as mock_logger:

            mock_state = MagicMock()
            mock_state.get.return_value = None
            mock_state.data = {}
            mock_state_class.load.return_value = None
            mock_state_class.return_value = mock_state

            from adw_orchestrator import ADWOrchestrator
            from orchestrator.config_loader import WorkflowConfig, StageConfig
            from orchestrator.stage_interface import StageStatus

            config = WorkflowConfig(
                name="test",
                display_name="Test Workflow",
                description="Test",
                stages=[
                    StageConfig(name="plan"),
                    StageConfig(name="build"),
                    StageConfig(name="test"),
                ],
            )

            orchestrator = ADWOrchestrator(
                adw_id="ADW-12345678",
                issue_number="123",
                config=config,
            )

            # Mark plan as completed
            orchestrator.execution.stages[0].status = StageStatus.COMPLETED

            # For build stage, previous completed is plan
            prev = orchestrator._get_previous_completed_stage("build")
            self.assertEqual(prev, "plan")

            # For plan stage, no previous
            prev = orchestrator._get_previous_completed_stage("plan")
            self.assertIsNone(prev)

    def test_get_next_stage(self):
        """Test _get_next_stage helper method."""
        with patch('adw_orchestrator.ADWState') as mock_state_class, \
             patch('adw_orchestrator.WebSocketNotifier') as mock_notifier_class, \
             patch('adw_orchestrator.setup_logger') as mock_logger:

            mock_state = MagicMock()
            mock_state.get.return_value = None
            mock_state.data = {}
            mock_state_class.load.return_value = None
            mock_state_class.return_value = mock_state

            from adw_orchestrator import ADWOrchestrator
            from orchestrator.config_loader import WorkflowConfig, StageConfig

            config = WorkflowConfig(
                name="test",
                display_name="Test Workflow",
                description="Test",
                stages=[
                    StageConfig(name="plan"),
                    StageConfig(name="build"),
                    StageConfig(name="test"),
                ],
            )

            orchestrator = ADWOrchestrator(
                adw_id="ADW-12345678",
                issue_number="123",
                config=config,
            )

            # Next after plan is build
            next_stage = orchestrator._get_next_stage("plan")
            self.assertEqual(next_stage, "build")

            # Next after build is test
            next_stage = orchestrator._get_next_stage("build")
            self.assertEqual(next_stage, "test")

            # No next after test
            next_stage = orchestrator._get_next_stage("test")
            self.assertIsNone(next_stage)


def run_tests():
    """Run the test suite."""
    print("Running Orchestrator Event System Unit Tests...")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestStageEventType))
    suite.addTests(loader.loadTestsFromTestCase(TestStageEventPayload))
    suite.addTests(loader.loadTestsFromTestCase(TestStageEventEmitter))
    suite.addTests(loader.loadTestsFromTestCase(TestStageContextEnhancements))
    suite.addTests(loader.loadTestsFromTestCase(TestOrchestratorEventIntegration))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\nTest Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\nAll orchestrator event system tests passed!")
        return True
    else:
        print("\nSome tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
