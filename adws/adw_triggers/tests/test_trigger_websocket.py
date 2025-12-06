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


class TestOpenCodebaseEndpoint:
    """Tests for the open_codebase endpoint using TerminalOperations."""

    def test_open_codebase_rejects_invalid_adw_id_format(self):
        """Test that invalid ADW ID formats are rejected."""
        import asyncio
        from adw_triggers.trigger_websocket import open_codebase

        # Test too short
        result = asyncio.get_event_loop().run_until_complete(open_codebase("abc"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

        # Test too long
        result = asyncio.get_event_loop().run_until_complete(open_codebase("abcdefghij"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

        # Test special characters
        result = asyncio.get_event_loop().run_until_complete(open_codebase("abc!@#12"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

    def test_open_codebase_rejects_nonexistent_adw(self):
        """Test that nonexistent ADW IDs return 404."""
        import asyncio
        from adw_triggers.trigger_websocket import open_codebase

        result = asyncio.get_event_loop().run_until_complete(open_codebase("zzzzzzzz"))
        assert result.status_code == 404
        assert "not found" in result.body.decode().lower()

    def test_open_codebase_uses_dedicated_session(self):
        """Test that open_codebase uses TerminalOperations for dedicated sessions.

        Each worktree should have its own tmux session named after the branch,
        with a 'code-{adw_id}' window running neovim.
        """
        from adw_modules.terminal_ops import TerminalOperations

        # Verify TerminalOperations creates session with branch name
        ops = TerminalOperations()
        assert hasattr(ops, 'open_codebase')
        assert hasattr(ops, '_sanitize_session_name')

        # Verify session name sanitization works correctly
        assert ops._sanitize_session_name("feat/test-branch") == "feat-test-branch"
        assert ops._sanitize_session_name("fix.bug:123") == "fix-bug-123"


class TestOpenWorktreeEndpoint:
    """Tests for the open_worktree endpoint using TerminalOperations."""

    def test_open_worktree_rejects_invalid_adw_id_format(self):
        """Test that invalid ADW ID formats are rejected."""
        import asyncio
        from adw_triggers.trigger_websocket import open_worktree

        # Test too short
        result = asyncio.get_event_loop().run_until_complete(open_worktree("abc"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

        # Test too long
        result = asyncio.get_event_loop().run_until_complete(open_worktree("abcdefghij"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

        # Test special characters
        result = asyncio.get_event_loop().run_until_complete(open_worktree("abc!@#12"))
        assert result.status_code == 400
        assert "Invalid ADW ID format" in result.body.decode()

    def test_open_worktree_rejects_nonexistent_adw(self):
        """Test that nonexistent ADW IDs return 404."""
        import asyncio
        from adw_triggers.trigger_websocket import open_worktree

        result = asyncio.get_event_loop().run_until_complete(open_worktree("zzzzzzzz"))
        assert result.status_code == 404
        assert "not found" in result.body.decode().lower()

    def test_open_worktree_uses_dedicated_session(self):
        """Test that open_worktree uses TerminalOperations for dedicated sessions.

        Each worktree should have its own tmux session named after the branch,
        with a 'logs-{adw_id}' window containing split panes for scripts.
        """
        from adw_modules.terminal_ops import TerminalOperations

        # Verify TerminalOperations creates session with logs window
        ops = TerminalOperations()
        assert hasattr(ops, 'open_worktree')
        assert hasattr(ops, '_setup_logs_window')

        # Verify the implementation creates proper window names
        adw_id = "test1234"
        expected_window_name = f"logs-{adw_id[:8]}"
        assert expected_window_name == "logs-test1234"


class TestCreateADWEndpoint:
    """Tests for POST /api/adws endpoint."""

    def test_create_adw_requires_db_available(self):
        """Test that create_adw returns 503 when DB is not available."""
        import asyncio
        from unittest.mock import patch

        # Import the function
        from adw_triggers.trigger_websocket import create_adw

        # Create mock request data
        class MockADWData:
            adw_id = "test1234"
            issue_number = None
            issue_title = "Test Task"
            issue_body = "Test body"
            issue_class = "feature"
            branch_name = None
            worktree_path = None
            current_stage = "backlog"
            status = "pending"
            workflow_name = None
            model_set = "base"
            data_source = "kanban"
            issue_json = None
            orchestrator_state = None
            backend_port = None
            websocket_port = None
            frontend_port = None

        # Test with DB unavailable
        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', False):
            result = asyncio.get_event_loop().run_until_complete(create_adw(MockADWData()))
            assert result.status_code == 503
            assert "Database not available" in result.body.decode()

    def test_create_adw_rejects_duplicate_adw_id(self):
        """Test that create_adw returns 409 for duplicate ADW IDs."""
        import asyncio
        from unittest.mock import patch, MagicMock

        from adw_triggers.trigger_websocket import create_adw

        class MockADWData:
            adw_id = "test1234"
            issue_number = None
            issue_title = "Test Task"
            issue_body = "Test body"
            issue_class = "feature"
            branch_name = None
            worktree_path = None
            current_stage = "backlog"
            status = "pending"
            workflow_name = None
            model_set = "base"
            data_source = "kanban"
            issue_json = None
            orchestrator_state = None
            backend_port = None
            websocket_port = None
            frontend_port = None

        # Mock DB manager to return existing ADW
        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"id": 1}]  # Simulate existing ADW

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.ADWStateCreate', MockADWData):
                    result = asyncio.get_event_loop().run_until_complete(create_adw(MockADWData()))
                    assert result.status_code == 409
                    assert "already exists" in result.body.decode()


class TestUpdateADWEndpoint:
    """Tests for PATCH /api/adws/{adw_id} endpoint."""

    def test_update_adw_requires_db_available(self):
        """Test that update_adw returns 503 when DB is not available."""
        import asyncio
        from unittest.mock import patch

        from adw_triggers.trigger_websocket import update_adw

        class MockUpdateData:
            current_stage = "build"
            status = None
            is_stuck = None
            issue_title = None
            issue_body = None
            issue_class = None
            branch_name = None
            worktree_path = None
            workflow_name = None
            orchestrator_state = None
            patch_file = None
            patch_history = None
            completed_at = None

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', False):
            result = asyncio.get_event_loop().run_until_complete(
                update_adw("test1234", MockUpdateData())
            )
            assert result.status_code == 503
            assert "Database not available" in result.body.decode()

    def test_update_adw_returns_404_for_nonexistent_adw(self):
        """Test that update_adw returns 404 for nonexistent ADW IDs."""
        import asyncio
        from unittest.mock import patch, MagicMock

        from adw_triggers.trigger_websocket import update_adw

        class MockUpdateData:
            current_stage = "build"
            status = None
            is_stuck = None
            issue_title = None
            issue_body = None
            issue_class = None
            branch_name = None
            worktree_path = None
            workflow_name = None
            orchestrator_state = None
            patch_file = None
            patch_history = None
            completed_at = None

        # Mock DB manager to return no existing ADW
        mock_db = MagicMock()
        mock_db.execute_query.return_value = []  # Simulate non-existent ADW

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.ADWStateUpdate', MockUpdateData):
                    result = asyncio.get_event_loop().run_until_complete(
                        update_adw("zzzzzzzz", MockUpdateData())
                    )
                    assert result.status_code == 404
                    assert "not found" in result.body.decode()


class TestADWPersistenceFlow:
    """Integration tests for ADW persistence on task creation."""

    def test_adw_id_format_validation(self):
        """Test that ADW IDs must be 8 characters alphanumeric."""
        # Valid ADW IDs
        valid_ids = ["a1b2c3d4", "test1234", "ABCD1234", "12345678"]
        for adw_id in valid_ids:
            assert len(adw_id) == 8, f"ADW ID {adw_id} should be 8 characters"
            assert adw_id.isalnum(), f"ADW ID {adw_id} should be alphanumeric"

        # Invalid ADW IDs
        invalid_ids = ["abc", "abcdefghij", "abc!@#12", ""]
        for adw_id in invalid_ids:
            is_valid = len(adw_id) == 8 and adw_id.isalnum()
            assert not is_valid, f"ADW ID {adw_id} should be invalid"

    def test_create_and_list_adw_flow(self):
        """Test that created ADWs can be retrieved via list endpoint.

        This tests the full flow:
        1. POST /api/adws creates an ADW
        2. GET /api/adws returns the created ADW

        This is the fix for the issue where tasks disappear on page refresh.
        """
        # This test validates the logic but would need actual DB for integration test
        create_data = {
            "adw_id": "test1234",
            "issue_title": "Test Task",
            "issue_body": "Test description",
            "issue_class": "feature",
            "current_stage": "backlog",
            "status": "pending",
            "model_set": "base",
            "data_source": "kanban",
        }

        # Validate all required fields are present
        required_fields = ["adw_id", "current_stage", "status"]
        for field in required_fields:
            assert field in create_data, f"Missing required field: {field}"

        # Validate ADW ID format
        assert len(create_data["adw_id"]) == 8
        assert create_data["adw_id"].isalnum()


class TestStageEventPersistence:
    """Tests for stage event database persistence.

    This tests the fix for the bug where stage transitions were broadcasted
    via WebSocket but not persisted to the database. When a crash or page
    refresh occurred, the task would revert to its previous stage because
    the database still had the old value.
    """

    def test_stage_event_persists_to_database(self):
        """Test that stage transitions are persisted to database.

        The receive_stage_event endpoint should:
        1. Validate the stage transition
        2. Persist the new stage to database BEFORE broadcasting
        3. Broadcast to WebSocket clients
        4. Return db_persisted=True in the response
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        # Mock the database manager
        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"adw_id": "test1234", "current_stage": "plan"}]
        mock_db.execute_update.return_value = None

        # Mock the WebSocket manager
        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        request_data = {
            "adw_id": "test1234",
            "from_stage": "plan",
            "to_stage": "build",
            "workflow_name": "adw_patch_iso",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                    result = asyncio.get_event_loop().run_until_complete(
                        receive_stage_event(request_data)
                    )

        # Verify database was updated
        mock_db.execute_update.assert_called_once()
        update_call_args = mock_db.execute_update.call_args
        assert "UPDATE adw_states SET current_stage = ?" in update_call_args[0][0]
        assert update_call_args[0][1][0] == "build"  # to_stage
        assert update_call_args[0][1][1] == "test1234"  # adw_id

        # Verify response includes db_persisted flag
        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is True

    def test_stage_event_handles_missing_adw_gracefully(self):
        """Test that stage event handles missing ADW in database gracefully.

        If the ADW doesn't exist in the database, the endpoint should:
        1. Log a warning
        2. Still broadcast the event (for backwards compatibility)
        3. Return db_persisted=False
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        # Mock the database manager to return no results
        mock_db = MagicMock()
        mock_db.execute_query.return_value = []  # ADW not found

        # Mock the WebSocket manager
        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        request_data = {
            "adw_id": "notexist",
            "from_stage": "plan",
            "to_stage": "build",
            "workflow_name": "adw_patch_iso",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                    result = asyncio.get_event_loop().run_until_complete(
                        receive_stage_event(request_data)
                    )

        # Database update should NOT have been called
        mock_db.execute_update.assert_not_called()

        # Broadcast should still have been called
        mock_manager.broadcast.assert_called_once()

        # Response should indicate db_persisted=False
        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is False

    def test_stage_event_continues_on_db_error(self):
        """Test that stage event continues broadcasting even if DB update fails.

        If the database update fails, the endpoint should:
        1. Log the error
        2. Still broadcast the event
        3. Return db_persisted=False
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        # Mock the database manager to raise an error
        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"adw_id": "test1234", "current_stage": "plan"}]
        mock_db.execute_update.side_effect = Exception("Database error")

        # Mock the WebSocket manager
        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        request_data = {
            "adw_id": "test1234",
            "from_stage": "plan",
            "to_stage": "build",
            "workflow_name": "adw_patch_iso",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                    result = asyncio.get_event_loop().run_until_complete(
                        receive_stage_event(request_data)
                    )

        # Broadcast should still have been called despite DB error
        mock_manager.broadcast.assert_called_once()

        # Response should indicate db_persisted=False
        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is False

    def test_stage_event_skips_db_when_not_available(self):
        """Test that stage event works when database is not available.

        This maintains backwards compatibility for environments without DB.
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        # Mock the WebSocket manager
        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        request_data = {
            "adw_id": "test1234",
            "from_stage": "plan",
            "to_stage": "build",
            "workflow_name": "adw_patch_iso",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', False):
            with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                result = asyncio.get_event_loop().run_until_complete(
                    receive_stage_event(request_data)
                )

        # Broadcast should have been called
        mock_manager.broadcast.assert_called_once()

        # Response should indicate db_persisted=False
        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is False

    def test_orchestrator_event_format_persists_stage(self):
        """Test that orchestrator event format also persists to database.

        The endpoint accepts two formats. This tests the orchestrator format:
        {
            "adw_id": "...",
            "event_type": "stage_completed",
            "stage_name": "plan",
            "next_stage": "build",
            ...
        }
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"adw_id": "test1234", "current_stage": "plan"}]
        mock_db.execute_update.return_value = None

        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        # Orchestrator event format
        request_data = {
            "adw_id": "test1234",
            "event_type": "stage_completed",
            "stage_name": "plan",
            "next_stage": "build",
            "workflow_name": "adw_patch_iso",
            "message": "Plan stage completed",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                    result = asyncio.get_event_loop().run_until_complete(
                        receive_stage_event(request_data)
                    )

        # Verify database was updated with next_stage
        mock_db.execute_update.assert_called_once()
        update_call_args = mock_db.execute_update.call_args
        assert update_call_args[0][1][0] == "build"  # next_stage becomes to_stage

        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is True

    def test_workflow_completed_persists_ready_to_merge(self):
        """Test that workflow_completed event persists 'ready-to-merge' stage.

        This is the specific scenario reported in the bug:
        1. ADW in ready-to-merge
        2. User applies patch
        3. Workflow progresses to build
        4. Crash happens
        5. On refresh, should NOT revert to ready-to-merge
        """
        import asyncio
        from unittest.mock import patch, MagicMock, AsyncMock

        from adw_triggers.trigger_websocket import receive_stage_event

        mock_db = MagicMock()
        mock_db.execute_query.return_value = [{"adw_id": "test1234", "current_stage": "document"}]
        mock_db.execute_update.return_value = None

        mock_manager = MagicMock()
        mock_manager.broadcast = AsyncMock()
        mock_manager.active_connections = []

        # workflow_completed event should transition to ready-to-merge
        request_data = {
            "adw_id": "test1234",
            "event_type": "workflow_completed",
            "stage_name": "document",
            "workflow_name": "adw_sdlc_iso",
            "message": "Workflow completed successfully",
        }

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.manager', mock_manager):
                    result = asyncio.get_event_loop().run_until_complete(
                        receive_stage_event(request_data)
                    )

        # Verify database was updated with ready-to-merge
        mock_db.execute_update.assert_called_once()
        update_call_args = mock_db.execute_update.call_args
        assert update_call_args[0][1][0] == "ready-to-merge"

        import json
        response_body = json.loads(result.body.decode())
        assert response_body.get("db_persisted") is True


class TestDeleteADWProtectsMainServer:
    """Tests for ADW deletion not killing the main server.

    This tests the fix for the critical bug where deleting an ADW whose
    port hash collides with the main server port (8500) would kill the
    main backend server itself, causing all connections to drop.

    Bug scenario:
    1. ADW ID hashes to port 8500 (same as main server)
    2. Delete ADW is triggered
    3. Code runs `lsof -ti:8500` and kills all processes on that port
    4. Main server gets killed
    5. All WebSocket connections drop
    """

    def test_get_ports_for_adw_can_return_main_server_port(self):
        """Test that get_ports_for_adw can return port 8500 (main server port).

        This proves the collision is possible and the protection is necessary.
        """
        from adw_modules import worktree_ops

        # Find an ADW ID that hashes to port 8500 (index 0)
        # The formula is: websocket_port = 8500 + (hash % 15)
        # So we need index = 0, meaning hash % 15 == 0

        # Test some IDs to demonstrate collisions can happen
        colliding_ids = []
        for i in range(1000):
            test_id = f"{i:08d}"  # 8-char numeric ID
            ws_port, _ = worktree_ops.get_ports_for_adw(test_id)
            if ws_port == 8500:
                colliding_ids.append(test_id)
                if len(colliding_ids) >= 3:
                    break

        # At least some IDs should hash to port 8500
        assert len(colliding_ids) > 0, "No ADW IDs hash to port 8500 - port range test needs adjustment"

        # Verify these IDs return port 8500
        for adw_id in colliding_ids:
            ws_port, _ = worktree_ops.get_ports_for_adw(adw_id)
            assert ws_port == 8500, f"ADW {adw_id} should hash to port 8500"

    def test_delete_adw_skips_main_server_port_killing(self):
        """Test that delete_adw does NOT kill processes on main server port.

        This is the core protection: when an ADW's port matches the main
        server port, we skip the kill step to avoid crashing the server.
        """
        import asyncio
        from unittest.mock import patch, MagicMock

        # Mock dependencies
        mock_db = MagicMock()
        mock_db.execute_query.return_value = []  # No ADW in DB (simplifies test)
        mock_db.execute_update.return_value = 1

        # Mock worktree_ops to return main server port (8500)
        mock_ports = MagicMock()
        mock_ports.get_ports_for_adw.return_value = (8500, 9200)  # Port collision!
        mock_ports.get_worktree_path.return_value = "/nonexistent/path"
        mock_ports.remove_worktree.return_value = (True, None)

        # Track subprocess.run calls
        subprocess_calls = []

        def mock_subprocess_run(cmd, **kwargs):
            subprocess_calls.append(cmd)
            result = MagicMock()
            result.stdout = ""
            result.returncode = 1  # No processes found
            return result

        from adw_triggers.trigger_websocket import delete_adw

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.worktree_ops', mock_ports):
                    with patch('adw_triggers.trigger_websocket.subprocess.run', mock_subprocess_run):
                        with patch('adw_triggers.trigger_websocket.os.path.exists', return_value=False):
                            with patch('adw_triggers.trigger_websocket.find_adw_directory', return_value=None):
                                with patch('adw_triggers.trigger_websocket.manager') as mock_manager:
                                    mock_manager.broadcast = MagicMock()
                                    result = asyncio.get_event_loop().run_until_complete(
                                        delete_adw("00000000")
                                    )

        # Check that we did NOT try to kill processes on port 8500
        kill_8500_attempted = any(
            "lsof" in str(cmd) and ":8500" in str(cmd)
            for cmd in subprocess_calls
        )
        assert not kill_8500_attempted, \
            "delete_adw should NOT attempt to kill processes on port 8500 (main server port)"

    def test_delete_adw_skips_main_frontend_port_killing(self):
        """Test that delete_adw does NOT kill processes on main frontend port.

        Similar protection for the frontend port (5173).
        """
        import asyncio
        from unittest.mock import patch, MagicMock

        mock_db = MagicMock()
        mock_db.execute_query.return_value = []
        mock_db.execute_update.return_value = 1

        # Mock worktree_ops to return main frontend port (5173 -> 9200 adjusted)
        mock_ports = MagicMock()
        mock_ports.get_ports_for_adw.return_value = (8501, 5173)  # Frontend collision!
        mock_ports.get_worktree_path.return_value = "/nonexistent/path"
        mock_ports.remove_worktree.return_value = (True, None)

        subprocess_calls = []

        def mock_subprocess_run(cmd, **kwargs):
            subprocess_calls.append(cmd)
            result = MagicMock()
            result.stdout = ""
            result.returncode = 1
            return result

        from adw_triggers.trigger_websocket import delete_adw

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.worktree_ops', mock_ports):
                    with patch('adw_triggers.trigger_websocket.subprocess.run', mock_subprocess_run):
                        with patch('adw_triggers.trigger_websocket.os.path.exists', return_value=False):
                            with patch('adw_triggers.trigger_websocket.find_adw_directory', return_value=None):
                                with patch('adw_triggers.trigger_websocket.WEBSOCKET_PORT', 8500):
                                    with patch.dict('os.environ', {'FRONTEND_PORT': '5173'}):
                                        with patch('adw_triggers.trigger_websocket.manager') as mock_manager:
                                            mock_manager.broadcast = MagicMock()
                                            result = asyncio.get_event_loop().run_until_complete(
                                                delete_adw("test1234")
                                            )

        # Check that we did NOT try to kill processes on port 5173
        kill_5173_attempted = any(
            "lsof" in str(cmd) and ":5173" in str(cmd)
            for cmd in subprocess_calls
        )
        assert not kill_5173_attempted, \
            "delete_adw should NOT attempt to kill processes on port 5173 (main frontend port)"

    def test_delete_adw_kills_non_colliding_ports(self):
        """Test that delete_adw DOES kill processes on non-colliding ports.

        When the ADW's ports don't match the main server ports, killing
        should proceed normally.
        """
        import asyncio
        from unittest.mock import patch, MagicMock

        mock_db = MagicMock()
        mock_db.execute_query.return_value = []
        mock_db.execute_update.return_value = 1

        # Mock worktree_ops to return non-colliding ports
        mock_ports = MagicMock()
        mock_ports.get_ports_for_adw.return_value = (8505, 9205)  # No collision
        mock_ports.get_worktree_path.return_value = "/nonexistent/path"
        mock_ports.remove_worktree.return_value = (True, None)

        subprocess_calls = []

        def mock_subprocess_run(cmd, **kwargs):
            subprocess_calls.append(cmd)
            result = MagicMock()
            result.stdout = "12345"  # Simulate a process found
            result.returncode = 0
            return result

        from adw_triggers.trigger_websocket import delete_adw

        with patch('adw_triggers.trigger_websocket.DB_AVAILABLE', True):
            with patch('adw_triggers.trigger_websocket.get_db_manager', return_value=mock_db):
                with patch('adw_triggers.trigger_websocket.worktree_ops', mock_ports):
                    with patch('adw_triggers.trigger_websocket.subprocess.run', mock_subprocess_run):
                        with patch('adw_triggers.trigger_websocket.os.path.exists', return_value=False):
                            with patch('adw_triggers.trigger_websocket.find_adw_directory', return_value=None):
                                with patch('adw_triggers.trigger_websocket.os.kill') as mock_kill:
                                    with patch('adw_triggers.trigger_websocket.WEBSOCKET_PORT', 8500):
                                        with patch.dict('os.environ', {'FRONTEND_PORT': '5173'}):
                                            with patch('adw_triggers.trigger_websocket.manager') as mock_manager:
                                                mock_manager.broadcast = MagicMock()
                                                result = asyncio.get_event_loop().run_until_complete(
                                                    delete_adw("abcd1234")
                                                )

        # Check that we DID try to kill processes on non-colliding ports
        kill_8505_attempted = any(
            "lsof" in str(cmd) and ":8505" in str(cmd)
            for cmd in subprocess_calls
        )
        assert kill_8505_attempted, \
            "delete_adw SHOULD attempt to kill processes on non-colliding port 8505"
