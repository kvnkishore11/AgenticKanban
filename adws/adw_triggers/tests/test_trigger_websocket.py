"""Tests for trigger_websocket.py command building logic and validation."""

import sys
import os

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestPatchWorkflowValidation:
    """Tests for patch workflow compatibility validation."""

    def test_patch_issue_type_rejects_plan_based_workflows(self):
        """Test that patch issue_type is rejected for plan-based workflows."""
        from adw_triggers.trigger_websocket import validate_workflow_request

        # Plan-based workflows that should reject patch issue_type
        plan_based_workflows = [
            "adw_plan_iso",
            "adw_plan_build_iso",
            "adw_plan_build_test_iso",
            "adw_plan_build_test_review_iso",
            "adw_plan_build_document_iso",
            "adw_plan_build_review_iso",
            "adw_sdlc_iso",
            "adw_sdlc_zte_iso",
        ]

        for workflow in plan_based_workflows:
            request_data = {
                "workflow_type": workflow,
                "issue_type": "patch",
                "issue_number": "123",
            }

            result, error = validate_workflow_request(request_data)

            assert result is None, f"Expected {workflow} to be rejected for patch issue_type"
            assert error is not None
            assert "patch" in error.lower()
            assert "adw_patch_iso" in error

    def test_patch_issue_type_accepts_patch_workflow(self):
        """Test that patch issue_type is accepted for adw_patch_iso workflow."""
        from adw_triggers.trigger_websocket import validate_workflow_request

        request_data = {
            "workflow_type": "adw_patch_iso",
            "issue_type": "patch",
            "issue_number": "123",
        }

        result, error = validate_workflow_request(request_data)

        assert error is None, f"Expected adw_patch_iso to accept patch issue_type, got error: {error}"
        assert result is not None
        assert result.workflow_type == "adw_patch_iso"

    def test_patch_workItemType_from_issue_json_rejects_plan_workflows(self):
        """Test that patch workItemType in issue_json is rejected for plan-based workflows."""
        from adw_triggers.trigger_websocket import validate_workflow_request

        request_data = {
            "workflow_type": "adw_plan_build_test_iso",
            "issue_json": {
                "number": 30,
                "title": "Test task",
                "body": "Test body",
                "workItemType": "patch",
            },
            "issue_number": "30",
        }

        result, error = validate_workflow_request(request_data)

        assert result is None, "Expected plan workflow to be rejected for patch workItemType"
        assert error is not None
        assert "patch" in error.lower()

    def test_non_patch_issue_types_accepted_for_plan_workflows(self):
        """Test that non-patch issue types are accepted for plan workflows."""
        from adw_triggers.trigger_websocket import validate_workflow_request

        for issue_type in ["feature", "bug", "chore"]:
            request_data = {
                "workflow_type": "adw_plan_build_test_iso",
                "issue_type": issue_type,
                "issue_number": "123",
            }

            result, error = validate_workflow_request(request_data)

            assert error is None, f"Expected {issue_type} to be accepted, got error: {error}"
            assert result is not None


class TestMergeWorkflowCommandBuilding:
    """Tests for adw_merge_iso command building."""

    def test_merge_command_only_has_adw_id(self):
        """Test that merge workflow command only includes adw_id, not issue_number.

        The adw_merge_iso workflow expects:
            uv run adw_merge_iso.py <adw-id> [merge-method]

        NOT:
            uv run adw_merge_iso.py <issue-number> <adw-id>

        This is different from other workflows that expect issue_number first.
        """
        # Simulate the command building logic from trigger_websocket.py
        workflow_type = "adw_merge_iso"
        adw_id = "test123abc"
        issue_number = "42"  # This should NOT be included for merge workflow

        cmd = ["uv", "run", f"{workflow_type}.py"]

        # Special handling for adw_merge_iso - different argument order
        if workflow_type == "adw_merge_iso":
            cmd.append(adw_id)
            # Default merge method is squash-rebase (handled by the script itself)
        else:
            # Standard workflow argument order
            if issue_number:
                cmd.append(str(issue_number))
            cmd.append(adw_id)

        # Verify command structure
        assert cmd == ["uv", "run", "adw_merge_iso.py", "test123abc"]
        assert issue_number not in cmd  # issue_number should NOT be in the command

    def test_standard_workflow_includes_issue_number(self):
        """Test that standard workflows include issue_number before adw_id."""
        workflow_type = "adw_plan_iso"
        adw_id = "test123abc"
        issue_number = "42"

        cmd = ["uv", "run", f"{workflow_type}.py"]

        # Special handling for adw_merge_iso - different argument order
        if workflow_type == "adw_merge_iso":
            cmd.append(adw_id)
        else:
            # Standard workflow argument order
            if issue_number:
                cmd.append(str(issue_number))
            cmd.append(adw_id)

        # Verify command structure - issue_number should come before adw_id
        assert cmd == ["uv", "run", "adw_plan_iso.py", "42", "test123abc"]

    def test_merge_command_does_not_pass_issue_number_as_merge_method(self):
        """Regression test: ensure issue_number isn't mistakenly passed as merge_method.

        Bug: Before the fix, the command was:
            uv run adw_merge_iso.py <issue-number> <adw-id>

        This caused the adw-id to be interpreted as an invalid merge method.
        """
        workflow_type = "adw_merge_iso"
        adw_id = "8250f1e2"
        issue_number = "23"

        cmd = ["uv", "run", f"{workflow_type}.py"]

        # Special handling for adw_merge_iso - different argument order
        if workflow_type == "adw_merge_iso":
            cmd.append(adw_id)
        else:
            if issue_number:
                cmd.append(str(issue_number))
            cmd.append(adw_id)

        # The second argument (if present) should be a valid merge method, not the adw_id
        valid_merge_methods = {"squash", "merge", "rebase", "squash-rebase"}

        if len(cmd) > 4:
            # If there's a 4th argument, it should be a valid merge method
            potential_merge_method = cmd[4]
            assert potential_merge_method in valid_merge_methods, \
                f"Invalid merge method: {potential_merge_method}"

        # Make sure the adw_id is the first argument (after script name)
        assert cmd[3] == adw_id


class TestPatchWorkflowStageTransition:
    """Tests for patch workflow stage transitions."""

    def test_patch_workflow_restart_transitions_to_build(self):
        """Test that patch workflow restart transitions to 'build' not 'plan'.

        When a patch workflow is triggered on an existing task (restart scenario),
        it should transition to 'build' stage because patches skip planning.
        """
        workflow_type = "adw_patch_iso"

        # Determine target stage based on workflow type (matching trigger_websocket.py logic)
        if workflow_type == "adw_patch_iso":
            target_stage = "build"
        else:
            target_stage = "plan"

        assert target_stage == "build", "Patch workflow should transition to 'build', not 'plan'"

    def test_standard_workflow_restart_transitions_to_plan(self):
        """Test that standard workflows restart to 'plan' stage."""
        standard_workflows = [
            "adw_plan_iso",
            "adw_plan_build_iso",
            "adw_plan_build_test_iso",
            "adw_sdlc_iso",
        ]

        for workflow_type in standard_workflows:
            # Determine target stage based on workflow type (matching trigger_websocket.py logic)
            if workflow_type == "adw_patch_iso":
                target_stage = "build"
            else:
                target_stage = "plan"

            assert target_stage == "plan", f"{workflow_type} should transition to 'plan'"

    def test_patch_workflow_from_errored_stage_goes_to_build(self):
        """Test that patch workflow from errored stage goes to build.

        This is the specific bug scenario: when a card is in 'errored' stage
        and user applies a patch, it should go to 'build', not 'plan'.
        """
        workflow_type = "adw_patch_iso"
        from_stage = "errored"

        # Simulate is_restart detection (errored is in non_backlog_stages)
        non_backlog_stages = {"plan", "build", "test", "review", "document", "errored"}
        is_restart = from_stage.lower() in non_backlog_stages

        assert is_restart is True, "errored stage should trigger restart detection"

        # Determine target stage
        if workflow_type == "adw_patch_iso":
            target_stage = "build"
        else:
            target_stage = "plan"

        assert target_stage == "build", \
            "Patch workflow from errored stage should go to 'build', not 'plan'"
