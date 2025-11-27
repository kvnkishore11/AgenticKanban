"""Tests for review finalization module."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.finalization import upload_screenshots, finalize_review
from utils.review.types import ReviewInitContext, ReviewExecutionContext
from adw_modules.data_types import ReviewResult, GitHubIssue


class TestUploadScreenshots:
    """Tests for upload_screenshots function."""

    @patch('utils.review.finalization.build_review_summary')
    @patch('utils.review.finalization.upload_review_screenshots')
    @patch('utils.review.finalization.make_issue_comment')
    def test_upload_screenshots_with_results(
        self, mock_comment, mock_upload, mock_build_summary,
        mock_logger, mock_state, mock_review_result
    ):
        """Test screenshot upload with review results."""
        mock_build_summary.return_value = "## Review Summary"

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        upload_screenshots(init_ctx, review_ctx)

        mock_upload.assert_called_once()
        mock_build_summary.assert_called_once_with(mock_review_result)
        mock_comment.assert_called_once()

    @patch('utils.review.finalization.build_review_summary')
    @patch('utils.review.finalization.upload_review_screenshots')
    @patch('utils.review.finalization.make_issue_comment')
    def test_upload_screenshots_no_results(
        self, mock_comment, mock_upload, mock_build_summary,
        mock_logger, mock_state
    ):
        """Test screenshot upload with no review results."""
        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=None,
            blocker_count=0,
            attempt_number=1
        )

        upload_screenshots(init_ctx, review_ctx)

        # Should not upload or comment if no results
        mock_upload.assert_not_called()
        mock_build_summary.assert_not_called()
        mock_comment.assert_not_called()


class TestFinalizeReview:
    """Tests for finalize_review function."""

    @patch('utils.review.finalization.get_repo_url')
    @patch('utils.review.finalization.extract_repo_path')
    @patch('utils.review.finalization.fetch_issue_safe')
    @patch('utils.review.finalization.create_commit')
    @patch('utils.review.finalization.commit_changes')
    @patch('utils.review.finalization.finalize_git_operations')
    @patch('utils.review.finalization.make_issue_comment')
    def test_finalize_review_success(
        self, mock_comment, mock_finalize_git, mock_commit_changes,
        mock_create_commit, mock_fetch_issue, mock_extract_repo,
        mock_get_repo, mock_logger, mock_state, mock_review_result
    ):
        """Test successful review finalization."""
        # Setup mocks
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"

        mock_issue = Mock()
        mock_issue.number = 888
        mock_fetch_issue.return_value = mock_issue

        mock_create_commit.return_value = ("feat: review commit", None)
        mock_commit_changes.return_value = (True, None)

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        finalize_review(init_ctx, review_ctx)

        # Verify all steps were executed
        mock_get_repo.assert_called_once()
        mock_fetch_issue.assert_called_once()
        mock_create_commit.assert_called_once()
        mock_commit_changes.assert_called_once()
        mock_finalize_git.assert_called_once()
        mock_state.save.assert_called_once_with("adw_review_iso")

    @patch('utils.review.finalization.get_repo_url')
    def test_finalize_review_repo_error_exits(
        self, mock_get_repo, mock_logger, mock_state, mock_review_result
    ):
        """Test that repo URL error causes exit."""
        mock_get_repo.side_effect = ValueError("Invalid repo URL")

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        with pytest.raises(SystemExit) as exc_info:
            finalize_review(init_ctx, review_ctx)
        assert exc_info.value.code == 1

    @patch('utils.review.finalization.get_repo_url')
    @patch('utils.review.finalization.extract_repo_path')
    @patch('utils.review.finalization.fetch_issue_safe')
    @patch('utils.review.finalization.create_commit')
    @patch('utils.review.finalization.make_issue_comment')
    def test_finalize_review_issue_fetch_fails_uses_fallback(
        self, mock_comment, mock_create_commit, mock_fetch_issue,
        mock_extract_repo, mock_get_repo, mock_logger, mock_state, mock_review_result
    ):
        """Test that fallback issue is created when fetch fails."""
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"
        mock_fetch_issue.return_value = None  # Fetch fails

        mock_create_commit.return_value = ("feat: review commit", None)

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        # Should create fallback issue and continue
        with patch('utils.review.finalization.commit_changes', return_value=(True, None)), \
             patch('utils.review.finalization.finalize_git_operations'):
            finalize_review(init_ctx, review_ctx)

        # Verify warning was logged
        mock_logger.warning.assert_called()

    @patch('utils.review.finalization.get_repo_url')
    @patch('utils.review.finalization.extract_repo_path')
    @patch('utils.review.finalization.fetch_issue_safe')
    @patch('utils.review.finalization.create_commit')
    @patch('utils.review.finalization.make_issue_comment')
    def test_finalize_review_commit_creation_fails_exits(
        self, mock_comment, mock_create_commit, mock_fetch_issue,
        mock_extract_repo, mock_get_repo, mock_logger, mock_state, mock_review_result
    ):
        """Test that commit creation error causes exit."""
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"
        mock_fetch_issue.return_value = Mock()
        mock_create_commit.return_value = (None, "Commit creation failed")

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        with pytest.raises(SystemExit) as exc_info:
            finalize_review(init_ctx, review_ctx)
        assert exc_info.value.code == 1

    @patch('utils.review.finalization.get_repo_url')
    @patch('utils.review.finalization.extract_repo_path')
    @patch('utils.review.finalization.fetch_issue_safe')
    @patch('utils.review.finalization.create_commit')
    @patch('utils.review.finalization.commit_changes')
    @patch('utils.review.finalization.make_issue_comment')
    def test_finalize_review_commit_changes_fails_exits(
        self, mock_comment, mock_commit_changes, mock_create_commit,
        mock_fetch_issue, mock_extract_repo, mock_get_repo,
        mock_logger, mock_state, mock_review_result
    ):
        """Test that commit changes error causes exit."""
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"
        mock_fetch_issue.return_value = Mock()
        mock_create_commit.return_value = ("feat: review commit", None)
        mock_commit_changes.return_value = (False, "Git commit failed")

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        with pytest.raises(SystemExit) as exc_info:
            finalize_review(init_ctx, review_ctx)
        assert exc_info.value.code == 1

    @patch('utils.review.finalization.get_repo_url')
    @patch('utils.review.finalization.extract_repo_path')
    @patch('utils.review.finalization.fetch_issue_safe')
    @patch('utils.review.finalization.create_commit')
    @patch('utils.review.finalization.commit_changes')
    @patch('utils.review.finalization.finalize_git_operations')
    @patch('utils.review.finalization.make_issue_comment')
    def test_finalize_review_uses_correct_worktree_path(
        self, mock_comment, mock_finalize_git, mock_commit_changes,
        mock_create_commit, mock_fetch_issue, mock_extract_repo,
        mock_get_repo, mock_logger, mock_state, mock_review_result
    ):
        """Test that finalization uses correct worktree path."""
        mock_get_repo.return_value = "https://github.com/user/repo"
        mock_extract_repo.return_value = "user/repo"
        mock_fetch_issue.return_value = Mock()
        mock_create_commit.return_value = ("feat: review commit", None)
        mock_commit_changes.return_value = (True, None)

        worktree_path = "/tmp/trees/review1234"
        mock_state.get.return_value = worktree_path

        init_ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        review_ctx = ReviewExecutionContext(
            review_result=mock_review_result,
            blocker_count=0,
            attempt_number=1
        )

        finalize_review(init_ctx, review_ctx)

        # Verify worktree path was used
        mock_commit_changes.assert_called_once()
        call_kwargs = mock_commit_changes.call_args[1]
        assert call_kwargs['cwd'] == worktree_path
