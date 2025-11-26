"""Tests for planning module."""

import pytest
from unittest.mock import Mock, patch
import os

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestBuildPlan:
    """Tests for build_plan function."""

    @patch('utils.plan.planning.workflow_build_plan')
    @patch('utils.plan.planning.make_issue_comment_safe')
    @patch('os.path.exists')
    def test_builds_and_validates_plan(self, mock_exists, mock_comment, mock_build):
        """Should build plan and validate file exists."""
        from utils.plan.planning import build_plan
        from utils.plan.types import PlanContext

        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-999-plan.md"
        mock_build.return_value = mock_response
        mock_exists.return_value = True  # Plan file exists

        mock_issue = Mock()
        mock_state = Mock()
        mock_state.update = Mock()
        mock_state.save = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute
        ctx = build_plan(
            mock_issue, "/feature", "test1234", "/path/to/worktree",
            mock_state, mock_notifier, "999", mock_logger
        )

        # Assert
        assert isinstance(ctx, PlanContext)
        assert ctx.plan_file_path == "specs/issue-999-plan.md"
        mock_state.update.assert_called_with(plan_file="specs/issue-999-plan.md")

    @patch('utils.plan.planning.workflow_build_plan')
    @patch('utils.plan.planning.make_issue_comment_safe')
    def test_exits_on_plan_build_failure(self, mock_comment, mock_build):
        """Should exit when plan building fails."""
        from utils.plan.planning import build_plan

        # Setup mocks - build fails
        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Agent failed to create plan"
        mock_build.return_value = mock_response

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            build_plan(
                mock_issue, "/feature", "test1234", "/path/to/worktree",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
        mock_notifier.notify_error.assert_called()

    @patch('utils.plan.planning.workflow_build_plan')
    @patch('utils.plan.planning.make_issue_comment_safe')
    @patch('os.path.exists')
    def test_exits_when_plan_file_not_found(self, mock_exists, mock_comment, mock_build):
        """Should exit when plan file doesn't exist."""
        from utils.plan.planning import build_plan

        # Setup mocks - build succeeds but file doesn't exist
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-999-plan.md"
        mock_build.return_value = mock_response
        mock_exists.return_value = False  # Plan file doesn't exist

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            build_plan(
                mock_issue, "/feature", "test1234", "/path/to/worktree",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()

    @patch('utils.plan.planning.workflow_build_plan')
    @patch('utils.plan.planning.make_issue_comment_safe')
    def test_exits_when_no_plan_path_returned(self, mock_comment, mock_build):
        """Should exit when agent returns empty plan path."""
        from utils.plan.planning import build_plan

        # Setup mocks - build succeeds but returns empty path
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "   "  # Empty/whitespace
        mock_build.return_value = mock_response

        mock_issue = Mock()
        mock_state = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()

        # Execute and expect exit
        with pytest.raises(SystemExit) as exc_info:
            build_plan(
                mock_issue, "/feature", "test1234", "/path/to/worktree",
                mock_state, mock_notifier, "999", mock_logger
            )

        assert exc_info.value.code == 1
