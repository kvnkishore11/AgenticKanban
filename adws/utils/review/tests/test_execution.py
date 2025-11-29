"""Tests for review execution module."""

from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.execution import run_review, execute_review_with_retry
from utils.review.types import ReviewInitContext, ReviewSpecContext, ReviewExecutionContext
from adw_modules.data_types import ReviewResult, ReviewIssue


class TestRunReview:
    """Tests for run_review function."""

    @patch('utils.review.execution.execute_template')
    @patch('utils.review.execution.parse_json')
    def test_run_review_success(self, mock_parse, mock_execute, mock_logger):
        """Test successful review execution."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = '{"success": true, "review_summary": "All good"}'
        mock_execute.return_value = mock_response

        mock_result = ReviewResult(
            success=True,
            review_summary="All good",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[]
        )
        mock_parse.return_value = mock_result

        # Call function
        result = run_review("/tmp/spec.md", "review1234", mock_logger, "/tmp/worktree")

        # Verify
        assert result.success is True
        assert result.review_summary == "All good"
        assert len(result.review_issues) == 0

    @patch('utils.review.execution.execute_template')
    def test_run_review_template_failure(self, mock_execute, mock_logger):
        """Test review when template execution fails."""
        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Template execution failed"
        mock_execute.return_value = mock_response

        result = run_review("/tmp/spec.md", "review1234", mock_logger, "/tmp/worktree")

        assert result.success is False
        assert "Review failed" in result.review_summary

    @patch('utils.review.execution.execute_template')
    @patch('utils.review.execution.parse_json')
    def test_run_review_parse_error(self, mock_parse, mock_execute, mock_logger):
        """Test review when JSON parsing fails."""
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "invalid json"
        mock_execute.return_value = mock_response

        mock_parse.side_effect = Exception("Invalid JSON")

        result = run_review("/tmp/spec.md", "review1234", mock_logger, "/tmp/worktree")

        assert result.success is False
        assert "Error parsing review result" in result.review_summary


class TestExecuteReviewWithRetry:
    """Tests for execute_review_with_retry function."""

    @patch('utils.review.execution.run_review')
    @patch('utils.review.execution.make_issue_comment')
    def test_execute_review_no_blockers(self, mock_comment, mock_run_review, mock_logger, mock_state):
        """Test review execution with no blocker issues."""
        # Setup - review succeeds with no blockers
        mock_result = ReviewResult(
            success=True,
            review_summary="All good",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[]
        )
        mock_run_review.return_value = mock_result

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        spec_ctx = ReviewSpecContext(
            spec_file="/tmp/spec.md",
            worktree_path="/tmp/worktree"
        )

        review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

        assert isinstance(review_ctx, ReviewExecutionContext)
        assert review_ctx.review_result.success is True
        assert review_ctx.blocker_count == 0
        assert review_ctx.attempt_number == 1

    @patch('utils.review.execution.run_review')
    @patch('utils.review.execution.make_issue_comment')
    def test_execute_review_with_blockers_skip_resolution(
        self, mock_comment, mock_run_review, mock_logger, mock_state
    ):
        """Test review with blockers when skip_resolution is True."""
        # Setup - review has blockers
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        mock_result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[blocker],
            screenshots=[],
            screenshot_urls=[]
        )
        mock_run_review.return_value = mock_result

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=True  # Skip resolution
        )

        spec_ctx = ReviewSpecContext(
            spec_file="/tmp/spec.md",
            worktree_path="/tmp/worktree"
        )

        review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

        assert review_ctx.blocker_count == 1
        assert review_ctx.attempt_number == 1
        # Should not retry since skip_resolution is True

    @patch('utils.review.resolution.resolve_blocker_issues')
    @patch('utils.review.execution.run_review')
    @patch('utils.review.execution.make_issue_comment')
    def test_execute_review_with_blockers_and_resolution(
        self, mock_comment, mock_run_review, mock_resolve, mock_logger, mock_state
    ):
        """Test review with blockers that get resolved."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # First attempt has blocker, second attempt is clean
        result_with_blocker = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[blocker],
            screenshots=[],
            screenshot_urls=[]
        )

        result_clean = ReviewResult(
            success=True,
            review_summary="All good",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[]
        )

        mock_run_review.side_effect = [result_with_blocker, result_clean]

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        spec_ctx = ReviewSpecContext(
            spec_file="/tmp/spec.md",
            worktree_path="/tmp/worktree"
        )

        review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

        # Should have retried once
        assert review_ctx.attempt_number == 2
        assert review_ctx.blocker_count == 0
        mock_resolve.assert_called_once()

    @patch('utils.review.resolution.resolve_blocker_issues')
    @patch('utils.review.execution.run_review')
    @patch('utils.review.execution.make_issue_comment')
    def test_execute_review_max_retries(
        self, mock_comment, mock_run_review, mock_resolve, mock_logger, mock_state
    ):
        """Test review respects max retry attempts."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        # Always return result with blocker
        result_with_blocker = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[blocker],
            screenshots=[],
            screenshot_urls=[]
        )

        mock_run_review.return_value = result_with_blocker

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        spec_ctx = ReviewSpecContext(
            spec_file="/tmp/spec.md",
            worktree_path="/tmp/worktree"
        )

        review_ctx = execute_review_with_retry(init_ctx, spec_ctx)

        # Should stop at max attempts
        assert review_ctx.attempt_number == 3
        assert review_ctx.blocker_count == 1
        # Should have tried to resolve twice (not on the last attempt)
        assert mock_resolve.call_count == 2
