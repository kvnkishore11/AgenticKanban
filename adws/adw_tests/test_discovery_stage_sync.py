"""Tests for ADW discovery module - stage synchronization functionality.

These tests verify that the format_adw_response function correctly extracts
current_stage, workflow_status, and workflow_stages from orchestrator data.
"""

import os
import sys
import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_modules.discovery import format_adw_response


class TestFormatAdwResponseStageSync:
    """Tests for stage synchronization fields in format_adw_response."""

    def test_returns_ready_to_merge_when_workflow_completed(self):
        """Should return 'ready-to-merge' as current_stage when workflow is completed."""
        state_data = {
            "adw_id": "test123",
            "issue_number": "42",
            "orchestrator": {
                "execution": {
                    "status": "completed",
                    "current_stage_index": 4,
                    "stages": [
                        {"stage_name": "plan", "status": "completed"},
                        {"stage_name": "build", "status": "completed"},
                        {"stage_name": "test", "status": "completed"},
                        {"stage_name": "review", "status": "completed"},
                        {"stage_name": "document", "status": "completed"},
                    ]
                }
            }
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] == "ready-to-merge"
        assert result["workflow_status"] == "completed"
        assert len(result["workflow_stages"]) == 5

    def test_returns_current_running_stage(self):
        """Should return the currently running stage."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {
                "execution": {
                    "status": "running",
                    "stages": [
                        {"stage_name": "plan", "status": "completed"},
                        {"stage_name": "build", "status": "running"},
                        {"stage_name": "test", "status": "pending"},
                    ]
                }
            }
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] == "build"
        assert result["workflow_status"] == "running"

    def test_returns_errored_when_stage_failed(self):
        """Should return 'errored' as current_stage when a stage failed."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {
                "execution": {
                    "status": "failed",
                    "stages": [
                        {"stage_name": "plan", "status": "completed"},
                        {"stage_name": "build", "status": "failed"},
                        {"stage_name": "test", "status": "pending"},
                    ]
                }
            }
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] == "errored"
        assert result["workflow_status"] == "failed"

    def test_returns_last_completed_stage_when_no_running(self):
        """Should return the last completed stage when no stage is currently running."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {
                "execution": {
                    "status": "running",
                    "stages": [
                        {"stage_name": "plan", "status": "completed"},
                        {"stage_name": "build", "status": "completed"},
                        {"stage_name": "test", "status": "pending"},
                    ]
                }
            }
        }

        result = format_adw_response(state_data)

        # Should return build as the last completed stage before hitting pending
        assert result["current_stage"] == "build"

    def test_returns_none_when_no_orchestrator_data(self):
        """Should return None for current_stage when no orchestrator data."""
        state_data = {
            "adw_id": "test123",
            "issue_number": "42",
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] is None
        assert result["workflow_status"] is None
        assert result["workflow_stages"] == []

    def test_returns_completed_flag(self):
        """Should include the completed flag from state data."""
        state_data = {
            "adw_id": "test123",
            "completed": True,
        }

        result = format_adw_response(state_data)

        assert result["completed"] is True

    def test_includes_all_required_fields(self):
        """Should include all required fields for API response."""
        state_data = {
            "adw_id": "test123",
            "issue_number": "42",
            "issue_class": "feature",
            "branch_name": "feat-test",
            "plan_file": "specs/test.md",
            "model_set": "base",
            "worktree_path": "/path/to/worktree",
            "issue_json": {
                "title": "Test Issue",
                "body": "Test body"
            },
            "orchestrator": {
                "execution": {
                    "status": "completed",
                    "stages": [{"stage_name": "plan", "status": "completed"}]
                }
            }
        }

        result = format_adw_response(state_data)

        # Check all required fields are present
        required_fields = [
            "adw_id", "issue_number", "issue_class", "issue_title", "issue_body",
            "branch_name", "plan_file", "model_set", "worktree_path",
            "current_stage", "workflow_status", "workflow_stages", "completed"
        ]
        for field in required_fields:
            assert field in result, f"Missing required field: {field}"


class TestFormatAdwResponseEdgeCases:
    """Edge case tests for format_adw_response."""

    def test_handles_empty_stages_array(self):
        """Should handle empty stages array gracefully."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {
                "execution": {
                    "status": "running",
                    "stages": []
                }
            }
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] is None
        assert result["workflow_stages"] == []

    def test_handles_missing_execution_data(self):
        """Should handle missing execution data."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {}
        }

        result = format_adw_response(state_data)

        assert result["current_stage"] is None
        assert result["workflow_status"] is None

    def test_handles_partial_stage_data(self):
        """Should handle stages with missing status fields."""
        state_data = {
            "adw_id": "test123",
            "orchestrator": {
                "execution": {
                    "status": "running",
                    "stages": [
                        {"stage_name": "plan"},  # Missing status
                        {"stage_name": "build", "status": "running"},
                    ]
                }
            }
        }

        result = format_adw_response(state_data)

        # Should still work and find the running stage
        assert result["current_stage"] == "build"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
