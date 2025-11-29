"""Tests for blocker issue resolution module."""

from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.resolution import resolve_blocker_issues
from adw_modules.data_types import ReviewIssue


class TestResolveBlockerIssues:
    """Tests for resolve_blocker_issues function."""

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_single_blocker_success(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test successful resolution of a single blocker."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # Mock successful plan creation
        plan_response = Mock()
        plan_response.success = True
        plan_response.output = "/tmp/plans/patch_plan_1.md"
        mock_create_plan.return_value = plan_response

        # Mock successful implementation
        impl_response = Mock()
        impl_response.success = True
        impl_response.output = "Patch applied successfully"
        mock_implement.return_value = impl_response

        resolve_blocker_issues(
            [blocker],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Verify plan was created and implemented
        mock_create_plan.assert_called_once()
        mock_implement.assert_called_once_with(
            "/tmp/plans/patch_plan_1.md",
            "review1234",
            mock_logger,
            working_dir="/tmp/worktree"
        )

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_multiple_blockers(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test resolution of multiple blockers."""
        blocker1 = ReviewIssue(
            review_issue_number=1,
            issue_description="Error 1",
            issue_resolution="Fix 1",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        blocker2 = ReviewIssue(
            review_issue_number=2,
            issue_description="Error 2",
            issue_resolution="Fix 2",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # Mock successful plan creation
        plan_response = Mock()
        plan_response.success = True
        plan_response.output = "/tmp/plans/patch_plan.md"
        mock_create_plan.return_value = plan_response

        # Mock successful implementation
        impl_response = Mock()
        impl_response.success = True
        impl_response.output = "Patch applied successfully"
        mock_implement.return_value = impl_response

        resolve_blocker_issues(
            [blocker1, blocker2],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Should create and implement plans for both blockers
        assert mock_create_plan.call_count == 2
        assert mock_implement.call_count == 2

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_blocker_plan_creation_fails(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test when patch plan creation fails."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # Mock failed plan creation
        plan_response = Mock()
        plan_response.success = False
        plan_response.output = "Plan creation failed"
        mock_create_plan.return_value = plan_response

        resolve_blocker_issues(
            [blocker],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Should log error and not attempt implementation
        mock_logger.error.assert_called()
        mock_implement.assert_not_called()

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_blocker_implementation_fails(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test when patch implementation fails."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # Mock successful plan creation
        plan_response = Mock()
        plan_response.success = True
        plan_response.output = "/tmp/plans/patch_plan_1.md"
        mock_create_plan.return_value = plan_response

        # Mock failed implementation
        impl_response = Mock()
        impl_response.success = False
        impl_response.output = "Implementation failed"
        mock_implement.return_value = impl_response

        resolve_blocker_issues(
            [blocker],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Should log error
        assert mock_logger.error.call_count >= 1

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_empty_blocker_list(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test resolution with empty blocker list."""
        resolve_blocker_issues(
            [],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Should log but not create any plans
        mock_logger.info.assert_called()
        mock_create_plan.assert_not_called()
        mock_implement.assert_not_called()

    @patch('utils.review.resolution.implement_plan')
    @patch('utils.review.resolution.create_review_patch_plan')
    @patch('utils.review.resolution.make_issue_comment')
    def test_resolve_blockers_partial_success(
        self, mock_comment, mock_create_plan, mock_implement, mock_logger
    ):
        """Test when some blockers resolve successfully and others fail."""
        blocker1 = ReviewIssue(
            review_issue_number=1,
            issue_description="Error 1",
            issue_resolution="Fix 1",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        blocker2 = ReviewIssue(
            review_issue_number=2,
            issue_description="Error 2",
            issue_resolution="Fix 2",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # First plan succeeds, second fails
        plan_response_success = Mock(success=True, output="/tmp/plans/patch_plan_1.md")
        plan_response_fail = Mock(success=False, output="Failed")
        mock_create_plan.side_effect = [plan_response_success, plan_response_fail]

        impl_response = Mock(success=True, output="Success")
        mock_implement.return_value = impl_response

        resolve_blocker_issues(
            [blocker1, blocker2],
            "888",
            "review1234",
            "/tmp/worktree",
            mock_logger
        )

        # Should implement only the first one
        assert mock_create_plan.call_count == 2
        assert mock_implement.call_count == 1
