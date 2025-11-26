"""Integration tests for plan workflow with kanban mode."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import uuid
import json

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestPlanWorkflowIntegration:
    """Integration tests for the complete plan workflow."""

    @pytest.fixture
    def random_adw_id(self):
        """Generate a random ADW ID for testing."""
        return uuid.uuid4().hex[:8]

    @pytest.fixture
    def sample_issue_json(self):
        """Sample issue JSON for kanban mode testing."""
        return {
            "title": "Test Feature: Add user profile page",
            "body": "As a user, I want to view my profile so that I can see my information.",
            "number": 999,
            "workItemType": "feature",
            "images": [],
        }

    @patch('utils.plan.initialization.ensure_adw_id')
    @patch('utils.plan.initialization.setup_logger')
    @patch('utils.plan.initialization.ADWState')
    @patch('utils.plan.initialization.WebSocketNotifier')
    @patch('utils.plan.initialization.log_mode_status')
    def test_initialize_workflow_creates_valid_context(
        self, mock_log_mode, mock_notifier_class, mock_state_class,
        mock_setup_logger, mock_ensure_adw_id, random_adw_id
    ):
        """Test that initialize_workflow creates a valid InitContext."""
        from utils.plan import initialize_workflow

        # Setup mocks
        mock_ensure_adw_id.return_value = random_adw_id
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load = Mock(return_value=mock_state)

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier

        # Execute
        args = ["adw_plan_iso.py", "999", random_adw_id]
        ctx = initialize_workflow(args, "adw_plan_iso")

        # Assert
        assert ctx.issue_number == "999"
        assert ctx.adw_id == random_adw_id
        assert ctx.state == mock_state
        assert ctx.logger == mock_logger
        assert ctx.notifier == mock_notifier

    @patch('utils.plan.environment.is_kanban_mode')
    @patch('utils.plan.environment.check_env_vars')
    @patch('utils.plan.environment.get_repo_url')
    @patch('utils.plan.environment.extract_repo_path')
    @patch('utils.plan.environment.should_skip_worktree_operations')
    def test_validate_environment_in_kanban_mode(
        self, mock_skip_worktree, mock_extract_repo, mock_get_repo,
        mock_check_env, mock_is_kanban
    ):
        """Test environment validation in kanban mode (no git)."""
        from utils.plan import validate_environment

        # Setup mocks for kanban mode
        mock_is_kanban.return_value = True
        mock_get_repo.return_value = None  # No git repo
        mock_skip_worktree.return_value = True

        mock_state = Mock()
        mock_logger = Mock()

        # Execute
        ctx = validate_environment(mock_state, mock_logger)

        # Assert kanban mode handled correctly
        assert ctx.github_repo_url is None
        assert ctx.skip_worktree is True
        mock_check_env.assert_not_called()  # Should skip env check in kanban mode

    def test_workflow_types_are_importable(self):
        """Test that all workflow types can be imported."""
        from utils.plan import (
            InitContext,
            EnvContext,
            WorktreeContext,
            IssueContext,
            PlanContext,
        )

        # These should all be valid dataclasses
        assert hasattr(InitContext, '__dataclass_fields__')
        assert hasattr(EnvContext, '__dataclass_fields__')
        assert hasattr(WorktreeContext, '__dataclass_fields__')
        assert hasattr(IssueContext, '__dataclass_fields__')
        assert hasattr(PlanContext, '__dataclass_fields__')

    def test_all_functions_are_importable(self):
        """Test that all workflow functions can be imported."""
        from utils.plan import (
            initialize_workflow,
            validate_environment,
            setup_worktree,
            fetch_and_classify,
            generate_branch,
            create_worktree_env,
            build_plan,
            create_plan_commit,
            finalize,
        )

        # All functions should be callable
        assert callable(initialize_workflow)
        assert callable(validate_environment)
        assert callable(setup_worktree)
        assert callable(fetch_and_classify)
        assert callable(generate_branch)
        assert callable(create_worktree_env)
        assert callable(build_plan)
        assert callable(create_plan_commit)
        assert callable(finalize)


class TestKanbanModeSimulation:
    """Tests that simulate kanban mode workflow."""

    @patch('utils.plan.issue.fetch_issue_safe')
    @patch('utils.plan.issue.make_issue_comment_safe')
    def test_kanban_mode_uses_provided_issue_class(self, mock_comment, mock_fetch):
        """Test that kanban-provided issue_class is used instead of classification."""
        from utils.plan import fetch_and_classify

        # Setup mock issue
        mock_issue = Mock()
        mock_issue.model_dump_json = Mock(return_value='{}')
        mock_fetch.return_value = mock_issue

        # Setup state with kanban-provided issue_class
        mock_state = Mock()
        mock_state.data = {"issue_class": "/feature", "data_source": "kanban"}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        ctx = fetch_and_classify("999", "test1234", mock_state, mock_notifier, mock_logger)

        # Assert kanban-provided type was used
        assert ctx.issue_command == "/feature"

    @patch('utils.plan.worktree.get_ports_for_adw')
    def test_skip_worktree_still_allocates_ports(self, mock_get_ports):
        """Test that ports are allocated even when skipping worktree."""
        from utils.plan import setup_worktree

        mock_get_ports.return_value = (8080, 3000)

        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_logger = Mock()

        # Execute with skip_worktree=True
        ctx = setup_worktree("test1234", mock_state, skip_worktree=True, logger=mock_logger)

        # Assert ports were still allocated
        assert ctx.websocket_port == 8080
        assert ctx.frontend_port == 3000
        assert ctx.worktree_path is None
        assert ctx.is_valid is False
