"""Tests for screenshot upload module."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.screenshots import upload_review_screenshots
from adw_modules.data_types import ReviewResult, ReviewIssue


class TestUploadReviewScreenshots:
    """Tests for upload_review_screenshots function."""

    @patch('utils.review.screenshots.R2Uploader')
    def test_upload_no_screenshots(self, mock_uploader_class, mock_logger, mock_worktree_path):
        """Test upload when there are no screenshots."""
        result = ReviewResult(
            success=True,
            review_summary="All good",
            review_issues=[],
            screenshots=[],  # No screenshots
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        # Should not create uploader if no screenshots
        mock_uploader_class.assert_not_called()

    @patch('utils.review.screenshots.R2Uploader')
    @patch('os.path.exists')
    def test_upload_screenshots_success(
        self, mock_exists, mock_uploader_class, mock_logger, mock_worktree_path
    ):
        """Test successful screenshot upload."""
        mock_exists.return_value = True

        mock_uploader = Mock()
        mock_uploader.upload_file = Mock(side_effect=[
            "https://r2.example.com/screenshot1.png",
            "https://r2.example.com/screenshot2.png"
        ])
        mock_uploader_class.return_value = mock_uploader

        result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[],
            screenshots=["screenshots/issue1.png", "screenshots/general.png"],
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        assert len(result.screenshot_urls) == 2
        assert result.screenshot_urls[0] == "https://r2.example.com/screenshot1.png"
        assert result.screenshot_urls[1] == "https://r2.example.com/screenshot2.png"
        assert mock_uploader.upload_file.call_count == 2

    @patch('utils.review.screenshots.R2Uploader')
    @patch('os.path.exists')
    def test_upload_screenshots_file_not_found(
        self, mock_exists, mock_uploader_class, mock_logger, mock_worktree_path
    ):
        """Test upload when screenshot file doesn't exist."""
        mock_exists.return_value = False

        mock_uploader = Mock()
        mock_uploader_class.return_value = mock_uploader

        result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[],
            screenshots=["screenshots/missing.png"],
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        # Should warn about missing file
        mock_logger.warning.assert_called()
        assert len(result.screenshot_urls) == 0

    @patch('utils.review.screenshots.R2Uploader')
    @patch('os.path.exists')
    def test_upload_screenshots_upload_fails(
        self, mock_exists, mock_uploader_class, mock_logger, mock_worktree_path
    ):
        """Test upload when R2 upload fails."""
        mock_exists.return_value = True

        mock_uploader = Mock()
        mock_uploader.upload_file = Mock(return_value=None)  # Upload fails
        mock_uploader_class.return_value = mock_uploader

        result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[],
            screenshots=["screenshots/issue1.png"],
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        # Should log error and use local path as fallback
        mock_logger.error.assert_called()
        assert len(result.screenshot_urls) == 1
        assert result.screenshot_urls[0] == "screenshots/issue1.png"

    @patch('utils.review.screenshots.R2Uploader')
    @patch('os.path.exists')
    def test_upload_screenshots_updates_issue_urls(
        self, mock_exists, mock_uploader_class, mock_logger, mock_worktree_path
    ):
        """Test that issue screenshot URLs are updated."""
        mock_exists.return_value = True

        mock_uploader = Mock()
        mock_uploader.upload_file = Mock(return_value="https://r2.example.com/screenshot1.png")
        mock_uploader_class.return_value = mock_uploader

        issue = ReviewIssue(
            review_issue_number=1,
            issue_description="Test",
            issue_resolution="Fix",
            issue_severity="blocker",
            screenshot_path="screenshots/issue1.png",
            screenshot_url=""
        )

        result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[issue],
            screenshots=["screenshots/issue1.png"],
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        # Issue should have URL updated
        assert issue.screenshot_url == "https://r2.example.com/screenshot1.png"

    @patch('utils.review.screenshots.R2Uploader')
    @patch('os.path.exists')
    @patch('os.path.join')
    def test_upload_screenshots_correct_paths(
        self, mock_join, mock_exists, mock_uploader_class, mock_logger, mock_worktree_path
    ):
        """Test that screenshot paths are correctly joined with worktree path."""
        mock_exists.return_value = True
        mock_join.return_value = f"{mock_worktree_path}/screenshots/issue1.png"

        mock_uploader = Mock()
        mock_uploader.upload_file = Mock(return_value="https://r2.example.com/screenshot1.png")
        mock_uploader_class.return_value = mock_uploader

        result = ReviewResult(
            success=True,
            review_summary="Found issues",
            review_issues=[],
            screenshots=["screenshots/issue1.png"],
            screenshot_urls=[]
        )

        upload_review_screenshots(result, "review1234", mock_worktree_path, mock_logger)

        # Verify path was joined correctly
        mock_join.assert_called_with(mock_worktree_path, "screenshots/issue1.png")
