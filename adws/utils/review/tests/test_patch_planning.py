"""Tests for review patch planning module."""

from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.patch_planning import create_review_patch_plan
from adw_modules.data_types import ReviewIssue


class TestCreateReviewPatchPlan:
    """Tests for create_review_patch_plan function."""

    @patch('utils.review.patch_planning.execute_template')
    def test_create_patch_plan_success(self, mock_execute, mock_logger, mock_review_issue):
        """Test successful patch plan creation."""
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "/tmp/plans/patch_plan_1.md"
        mock_execute.return_value = mock_response

        result = create_review_patch_plan(
            mock_review_issue,
            1,
            "review1234",
            mock_logger,
            "/tmp/worktree"
        )

        assert result.success is True
        assert result.output == "/tmp/plans/patch_plan_1.md"

    @patch('utils.review.patch_planning.execute_template')
    def test_create_patch_plan_failure(self, mock_execute, mock_logger, mock_review_issue):
        """Test patch plan creation failure."""
        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Template execution failed"
        mock_execute.return_value = mock_response

        result = create_review_patch_plan(
            mock_review_issue,
            1,
            "review1234",
            mock_logger,
            "/tmp/worktree"
        )

        assert result.success is False

    @patch('utils.review.patch_planning.execute_template')
    def test_create_patch_plan_with_correct_args(self, mock_execute, mock_logger):
        """Test that patch plan is created with correct arguments."""
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "/tmp/plans/patch_plan_1.md"
        mock_execute.return_value = mock_response

        issue = ReviewIssue(
            review_issue_number=1,
            issue_description="Test description",
            issue_resolution="Test resolution",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        create_review_patch_plan(issue, 1, "review1234", mock_logger, "/tmp/worktree")

        # Verify the execute_template was called with correct request
        call_args = mock_execute.call_args[0][0]
        assert call_args.agent_name == "review_patch_planner"
        assert call_args.slash_command == "/patch"
        assert call_args.adw_id == "review1234"
        assert call_args.working_dir == "/tmp/worktree"
        assert "Issue #1: Test description" in call_args.args
        assert "Resolution: Test resolution" in call_args.args
        assert "Severity: blocker" in call_args.args

    @patch('utils.review.patch_planning.execute_template')
    def test_create_patch_plan_without_working_dir(self, mock_execute, mock_logger, mock_review_issue):
        """Test patch plan creation without working directory."""
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "/tmp/plans/patch_plan_1.md"
        mock_execute.return_value = mock_response

        result = create_review_patch_plan(
            mock_review_issue,
            1,
            "review1234",
            mock_logger,
            None  # No working directory
        )

        assert result.success is True
        call_args = mock_execute.call_args[0][0]
        assert call_args.working_dir is None
