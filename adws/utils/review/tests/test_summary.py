"""Tests for review summary formatting module."""

import pytest
from unittest.mock import Mock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.summary import build_review_summary
from adw_modules.data_types import ReviewResult, ReviewIssue


class TestBuildReviewSummary:
    """Tests for build_review_summary function."""

    def test_build_summary_no_issues(self):
        """Test building summary with no issues."""
        result = ReviewResult(
            success=True,
            review_summary="All tests passed. Implementation looks good.",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "## 📊 Review Summary" in summary
        assert "All tests passed. Implementation looks good." in summary
        assert "## 🔍 Issues Found" not in summary

    def test_build_summary_with_blocker_issues(self):
        """Test building summary with blocker issues."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error in login",
            issue_resolution="Fix authentication logic",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        result = ReviewResult(
            success=True,
            review_summary="Found critical issues",
            review_issues=[blocker],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "## 🔍 Issues Found" in summary
        assert "### 🚨 Blockers (1)" in summary
        assert "Critical error in login" in summary
        assert "Fix authentication logic" in summary

    def test_build_summary_with_tech_debt(self):
        """Test building summary with tech debt issues."""
        tech_debt = ReviewIssue(
            review_issue_number=1,
            issue_description="Duplicated code in handlers",
            issue_resolution="Extract common logic",
            issue_severity="tech_debt",
            screenshot_path="",
            screenshot_url=""
        )

        result = ReviewResult(
            success=True,
            review_summary="Found tech debt",
            review_issues=[tech_debt],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "### ⚠️ Tech Debt (1)" in summary
        assert "Duplicated code in handlers" in summary

    def test_build_summary_with_skippable_issues(self):
        """Test building summary with skippable issues."""
        skippable = ReviewIssue(
            review_issue_number=1,
            issue_description="Missing JSDoc comment",
            issue_resolution="Add documentation",
            issue_severity="skippable",
            screenshot_path="",
            screenshot_url=""
        )

        result = ReviewResult(
            success=True,
            review_summary="Minor issues found",
            review_issues=[skippable],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "### 💡 Skippable (1)" in summary
        assert "Missing JSDoc comment" in summary

    def test_build_summary_with_mixed_severity_issues(self):
        """Test building summary with multiple issue severities."""
        blocker = ReviewIssue(
            review_issue_number=1,
            issue_description="Critical error",
            issue_resolution="Fix it",
            issue_severity="blocker",
            screenshot_path="",
            screenshot_url=""
        )

        tech_debt = ReviewIssue(
            review_issue_number=2,
            issue_description="Code smell",
            issue_resolution="Refactor",
            issue_severity="tech_debt",
            screenshot_path="",
            screenshot_url=""
        )

        skippable = ReviewIssue(
            review_issue_number=3,
            issue_description="Minor issue",
            issue_resolution="Optional fix",
            issue_severity="skippable",
            screenshot_path="",
            screenshot_url=""
        )

        result = ReviewResult(
            success=True,
            review_summary="Multiple issues found",
            review_issues=[blocker, tech_debt, skippable],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "### 🚨 Blockers (1)" in summary
        assert "### ⚠️ Tech Debt (1)" in summary
        assert "### 💡 Skippable (1)" in summary

    def test_build_summary_with_screenshots(self):
        """Test building summary with screenshots."""
        result = ReviewResult(
            success=True,
            review_summary="Review complete",
            review_issues=[],
            screenshots=["screenshots/test1.png", "screenshots/test2.png"],
            screenshot_urls=[
                "https://r2.example.com/test1.png",
                "https://r2.example.com/test2.png"
            ]
        )

        summary = build_review_summary(result)

        assert "## 📸 Screenshots" in summary
        assert "Captured 2 screenshots" in summary
        assert "![Screenshot 1](https://r2.example.com/test1.png)" in summary
        assert "![Screenshot 2](https://r2.example.com/test2.png)" in summary

    def test_build_summary_with_issue_screenshots(self):
        """Test building summary with issue-specific screenshots."""
        issue = ReviewIssue(
            review_issue_number=1,
            issue_description="UI bug",
            issue_resolution="Fix layout",
            issue_severity="blocker",
            screenshot_path="screenshots/bug.png",
            screenshot_url="https://r2.example.com/bug.png"
        )

        result = ReviewResult(
            success=True,
            review_summary="Found UI bugs",
            review_issues=[issue],
            screenshots=["screenshots/bug.png"],
            screenshot_urls=["https://r2.example.com/bug.png"]
        )

        summary = build_review_summary(result)

        assert "![Issue Screenshot](https://r2.example.com/bug.png)" in summary

    def test_build_summary_with_local_screenshot_paths(self):
        """Test building summary with local screenshot paths (not URLs)."""
        result = ReviewResult(
            success=True,
            review_summary="Review complete",
            review_issues=[],
            screenshots=["screenshots/test1.png"],
            screenshot_urls=["screenshots/test1.png"]  # Local path, not URL
        )

        summary = build_review_summary(result)

        assert "## 📸 Screenshots" in summary
        # Should display as path, not inline image
        assert "`screenshots/test1.png`" in summary

    def test_build_summary_multiple_blockers(self):
        """Test building summary with multiple blocker issues."""
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

        result = ReviewResult(
            success=True,
            review_summary="Critical issues found",
            review_issues=[blocker1, blocker2],
            screenshots=[],
            screenshot_urls=[]
        )

        summary = build_review_summary(result)

        assert "### 🚨 Blockers (2)" in summary
        assert "Error 1" in summary
        assert "Error 2" in summary
