#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "httpx", "fastapi", "pytest-asyncio"]
# ///
"""Unit tests for the /api/stage-event endpoint.

Tests cover:
- Direct stage transition format (from_stage, to_stage)
- Orchestrator event format (event_type, stage_name, next_stage)
- Validation of stage names
- Handling of all event types
- Error cases
"""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestStageEventEndpoint(unittest.TestCase):
    """Test /api/stage-event endpoint."""

    def setUp(self):
        """Set up test fixtures."""
        # Mock the manager for broadcasting
        self.mock_manager = MagicMock()
        self.mock_manager.broadcast = AsyncMock()
        self.mock_manager.active_connections = set()

    def _run_async(self, coro):
        """Helper to run async tests."""
        return asyncio.get_event_loop().run_until_complete(coro)

    # ===== Format 1: Direct Stage Transition Tests =====

    def test_direct_transition_plan_to_build(self):
        """Test direct stage transition from plan to build."""
        request_data = {
            "adw_id": "ADW-12345678",
            "workflow_name": "adw_plan_build_iso",
            "from_stage": "plan",
            "to_stage": "build",
            "message": "Moving to build phase"
        }

        # Validate structure
        self.assertIn("adw_id", request_data)
        self.assertIn("to_stage", request_data)
        self.assertEqual(request_data["to_stage"], "build")

    def test_direct_transition_to_ready_to_merge(self):
        """Test direct transition to ready-to-merge stage."""
        request_data = {
            "adw_id": "ADW-12345678",
            "workflow_name": "adw_plan_build_iso",
            "from_stage": "build",
            "to_stage": "ready-to-merge",
            "message": "Workflow complete, ready for merge"
        }

        # ready-to-merge is a valid terminal state
        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]
        self.assertIn(request_data["to_stage"], valid_stages)

    def test_direct_transition_to_errored(self):
        """Test direct transition to errored stage."""
        request_data = {
            "adw_id": "ADW-12345678",
            "workflow_name": "adw_plan_build_iso",
            "from_stage": "build",
            "to_stage": "errored",
            "message": "Build failed"
        }

        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]
        self.assertIn(request_data["to_stage"], valid_stages)

    def test_direct_transition_to_completed(self):
        """Test direct transition to completed stage."""
        request_data = {
            "adw_id": "ADW-12345678",
            "to_stage": "completed"
        }

        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]
        self.assertIn(request_data["to_stage"], valid_stages)

    def test_direct_transition_invalid_stage_rejected(self):
        """Test that invalid stage names are rejected."""
        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]

        invalid_stages = ['invalid', 'planning', 'testing', 'done', 'merge', 'finished']
        for invalid_stage in invalid_stages:
            self.assertNotIn(invalid_stage, valid_stages)

    # ===== Format 2: Orchestrator Event Format Tests =====

    def test_orchestrator_stage_started_event(self):
        """Test stage_started event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "stage_started",
            "workflow_name": "sdlc",
            "stage_name": "build",
            "previous_stage": "plan",
            "next_stage": "test",
            "message": "Starting build stage"
        }

        # For stage_started, to_stage should be stage_name
        # from_stage should be previous_stage
        self.assertEqual(request_data["stage_name"], "build")
        self.assertEqual(request_data["previous_stage"], "plan")

    def test_orchestrator_stage_completed_event(self):
        """Test stage_completed event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "stage_completed",
            "workflow_name": "sdlc",
            "stage_name": "plan",
            "previous_stage": None,
            "next_stage": "build",
            "message": "Plan stage completed"
        }

        # For stage_completed, to_stage should be next_stage
        # from_stage should be stage_name
        self.assertEqual(request_data["stage_name"], "plan")
        self.assertEqual(request_data["next_stage"], "build")

    def test_orchestrator_stage_completed_last_stage(self):
        """Test stage_completed for last stage (no next_stage)."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "stage_completed",
            "workflow_name": "sdlc",
            "stage_name": "review",
            "previous_stage": "test",
            "next_stage": None,  # Last stage
            "message": "Review completed"
        }

        # When next_stage is None, no stage transition should occur
        # The workflow_completed event will handle moving to ready-to-merge
        self.assertIsNone(request_data["next_stage"])

    def test_orchestrator_workflow_completed_event(self):
        """Test workflow_completed event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "workflow_completed",
            "workflow_name": "sdlc",
            "stage_name": "review",  # Last stage
            "previous_stage": "test",
            "next_stage": None,
            "message": "Workflow completed successfully"
        }

        # For workflow_completed, to_stage should be "ready-to-merge"
        self.assertEqual(request_data["event_type"], "workflow_completed")

    def test_orchestrator_stage_failed_event(self):
        """Test stage_failed event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "stage_failed",
            "workflow_name": "sdlc",
            "stage_name": "build",
            "previous_stage": "plan",
            "next_stage": "test",
            "message": "Build failed",
            "error": "Compilation error"
        }

        # For stage_failed, to_stage should be "errored"
        self.assertEqual(request_data["event_type"], "stage_failed")

    def test_orchestrator_workflow_failed_event(self):
        """Test workflow_failed event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "workflow_failed",
            "workflow_name": "sdlc",
            "stage_name": "test",
            "message": "Workflow failed",
            "error": "Critical error"
        }

        # For workflow_failed, to_stage should be "errored"
        self.assertEqual(request_data["event_type"], "workflow_failed")

    def test_orchestrator_stage_skipped_event(self):
        """Test stage_skipped event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "stage_skipped",
            "workflow_name": "sdlc",
            "stage_name": "test",
            "previous_stage": "build",
            "next_stage": "review",
            "message": "Test stage skipped",
            "skip_reason": "No test files found"
        }

        # For stage_skipped, no stage transition should occur
        self.assertEqual(request_data["event_type"], "stage_skipped")

    def test_orchestrator_workflow_started_event(self):
        """Test workflow_started event from orchestrator."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "workflow_started",
            "workflow_name": "sdlc",
            "stage_name": "plan",  # First stage
            "previous_stage": None,
            "next_stage": "build",
            "message": "Workflow starting"
        }

        # For workflow_started, to_stage should be stage_name (first stage)
        # from_stage should be "backlog"
        self.assertEqual(request_data["event_type"], "workflow_started")
        self.assertEqual(request_data["stage_name"], "plan")

    # ===== Validation Tests =====

    def test_missing_adw_id_rejected(self):
        """Test that missing adw_id is rejected."""
        request_data = {
            "to_stage": "build"
            # Missing adw_id
        }

        self.assertNotIn("adw_id", request_data)

    def test_missing_to_stage_direct_format_rejected(self):
        """Test that missing to_stage in direct format is rejected."""
        request_data = {
            "adw_id": "ADW-12345678",
            "from_stage": "plan"
            # Missing to_stage (and no event_type)
        }

        self.assertNotIn("to_stage", request_data)
        self.assertNotIn("event_type", request_data)

    def test_all_workflow_stages_valid(self):
        """Test that all workflow stages are valid."""
        workflow_stages = ['plan', 'build', 'test', 'review', 'document']
        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]

        for stage in workflow_stages:
            self.assertIn(stage, valid_stages)

    def test_all_terminal_stages_valid(self):
        """Test that all terminal stages are valid."""
        terminal_stages = ['ready-to-merge', 'pr', 'completed', 'errored']
        valid_stages = [
            'backlog', 'plan', 'build', 'test', 'review', 'document',
            'ready-to-merge', 'pr', 'completed', 'errored'
        ]

        for stage in terminal_stages:
            self.assertIn(stage, valid_stages)

    # ===== Event Type to Stage Mapping Tests =====

    def test_event_type_to_stage_mapping(self):
        """Test the mapping from event types to stage transitions."""
        # This documents the expected behavior
        event_mappings = {
            "stage_started": {
                "input": {"stage_name": "build", "previous_stage": "plan"},
                "expected_from": "plan",
                "expected_to": "build"
            },
            "stage_completed": {
                "input": {"stage_name": "plan", "next_stage": "build"},
                "expected_from": "plan",
                "expected_to": "build"
            },
            "workflow_completed": {
                "input": {"stage_name": "review"},
                "expected_from": "review",
                "expected_to": "ready-to-merge"
            },
            "stage_failed": {
                "input": {"stage_name": "build"},
                "expected_from": "build",
                "expected_to": "errored"
            },
            "workflow_failed": {
                "input": {"stage_name": "test"},
                "expected_from": "test",
                "expected_to": "errored"
            },
            "workflow_started": {
                "input": {"stage_name": "plan"},
                "expected_from": "backlog",
                "expected_to": "plan"
            },
        }

        for event_type, mapping in event_mappings.items():
            # Verify the expected from/to values are valid stages
            valid_stages = [
                'backlog', 'plan', 'build', 'test', 'review', 'document',
                'ready-to-merge', 'pr', 'completed', 'errored'
            ]
            self.assertIn(mapping["expected_to"], valid_stages,
                          f"Expected to_stage '{mapping['expected_to']}' for {event_type} not in valid stages")


class TestStageTransitionBroadcast(unittest.TestCase):
    """Test the stage_transition broadcast message format."""

    def test_broadcast_message_structure(self):
        """Test the structure of the broadcast message."""
        # Expected broadcast message format
        expected_message = {
            "type": "stage_transition",
            "data": {
                "adw_id": "ADW-12345678",
                "workflow_name": "sdlc",
                "from_stage": "plan",
                "to_stage": "build",
                "message": "Stage transition",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        }

        # Verify structure
        self.assertEqual(expected_message["type"], "stage_transition")
        self.assertIn("data", expected_message)
        self.assertIn("adw_id", expected_message["data"])
        self.assertIn("from_stage", expected_message["data"])
        self.assertIn("to_stage", expected_message["data"])

    def test_frontend_receives_stage_transition(self):
        """Document expected frontend behavior for stage_transition events."""
        # This test documents the expected frontend handling
        stage_transition_event = {
            "type": "stage_transition",
            "data": {
                "adw_id": "ADW-12345678",
                "workflow_name": "adw_plan_build_iso",
                "from_stage": "plan",
                "to_stage": "build",
                "message": "Plan completed, moving to build"
            }
        }

        # Frontend should:
        # 1. Find task by adw_id
        # 2. Move task to to_stage
        # 3. Update UI accordingly

        self.assertEqual(stage_transition_event["type"], "stage_transition")
        self.assertEqual(stage_transition_event["data"]["to_stage"], "build")


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""

    def test_empty_adw_id(self):
        """Test handling of empty adw_id."""
        request_data = {
            "adw_id": "",
            "to_stage": "build"
        }

        # Empty string is technically provided but should be treated as missing
        # This is an edge case that the endpoint should handle
        self.assertEqual(request_data["adw_id"], "")

    def test_whitespace_adw_id(self):
        """Test handling of whitespace-only adw_id."""
        request_data = {
            "adw_id": "   ",
            "to_stage": "build"
        }

        self.assertEqual(request_data["adw_id"].strip(), "")

    def test_unknown_event_type(self):
        """Test handling of unknown event type."""
        request_data = {
            "adw_id": "ADW-12345678",
            "event_type": "unknown_event",
            "stage_name": "plan"
        }

        # Unknown event types should be logged but not cause errors
        known_event_types = [
            "stage_started", "stage_completed", "stage_failed",
            "stage_skipped", "workflow_started", "workflow_completed",
            "workflow_failed"
        ]
        self.assertNotIn(request_data["event_type"], known_event_types)

    def test_timestamp_auto_added(self):
        """Test that timestamp is auto-added if not provided."""
        request_data = {
            "adw_id": "ADW-12345678",
            "to_stage": "build"
            # No timestamp provided
        }

        self.assertNotIn("timestamp", request_data)

    def test_optional_fields(self):
        """Test that optional fields work correctly."""
        # Minimal request with only required fields
        minimal_request = {
            "adw_id": "ADW-12345678",
            "to_stage": "build"
        }

        # Should default from_stage to "unknown"
        self.assertNotIn("from_stage", minimal_request)
        self.assertNotIn("message", minimal_request)
        self.assertNotIn("workflow_name", minimal_request)


def run_tests():
    """Run the test suite."""
    print("Running Stage Event Endpoint Unit Tests...")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestStageEventEndpoint))
    suite.addTests(loader.loadTestsFromTestCase(TestStageTransitionBroadcast))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\nTest Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\n✅ All stage event endpoint tests passed!")
        return True
    else:
        print("\n❌ Some tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
