#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pytest-asyncio"]
# ///
"""Tests for the Review Stage Revamp feature.

This tests the new review system that:
1. Never auto-skips review (only skips when explicitly configured)
2. Supports multiple review modes (security, code quality, UI, docs)
3. Integrates external tools (Bearer, Semgrep, ESLint, Ruff)
"""

import unittest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestReviewStageSkipLogic(unittest.TestCase):
    """Tests for the updated should_skip logic in ReviewStage."""

    def test_should_not_skip_for_chores(self):
        """Verify chores are NO LONGER auto-skipped (key change)."""
        # Import inside test to avoid module-level issues
        from stages.review_stage import ReviewStage
        from orchestrator.stage_interface import StageContext

        # Create mock context for chore issue
        ctx = MagicMock(spec=StageContext)
        ctx.state = {
            "issue_class": "/chore",
            "issue_json": {"metadata": {}}
        }
        ctx.config = {}
        ctx.logger = MagicMock()

        stage = ReviewStage()
        should_skip, reason = stage.should_skip(ctx)

        # Key assertion: chores should NOT be auto-skipped anymore
        self.assertFalse(should_skip, "Chores should NOT be auto-skipped")
        self.assertIsNone(reason)

    def test_should_not_skip_for_patches(self):
        """Verify patches are NO LONGER auto-skipped."""
        from stages.review_stage import ReviewStage
        from orchestrator.stage_interface import StageContext

        ctx = MagicMock(spec=StageContext)
        ctx.state = {
            "issue_class": "/patch",
            "issue_json": {"metadata": {}}
        }
        ctx.config = {}
        ctx.logger = MagicMock()

        stage = ReviewStage()
        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip, "Patches should NOT be auto-skipped")
        self.assertIsNone(reason)

    def test_should_skip_when_metadata_flag_set(self):
        """Verify skip works when explicitly set in metadata."""
        from stages.review_stage import ReviewStage
        from orchestrator.stage_interface import StageContext

        ctx = MagicMock(spec=StageContext)
        ctx.state = {
            "issue_class": "/feature",
            "issue_json": {
                "metadata": {
                    "skip_review": True  # Explicit skip flag
                }
            }
        }
        ctx.config = {}
        ctx.logger = MagicMock()

        stage = ReviewStage()
        should_skip, reason = stage.should_skip(ctx)

        self.assertTrue(should_skip, "Should skip when metadata flag is True")
        self.assertIn("task configuration", reason)

    def test_should_skip_when_config_flag_set(self):
        """Verify skip works when set in orchestrator config."""
        from stages.review_stage import ReviewStage
        from orchestrator.stage_interface import StageContext

        ctx = MagicMock(spec=StageContext)
        ctx.state = {
            "issue_class": "/feature",
            "issue_json": {"metadata": {}}
        }
        ctx.config = {"skip_review": True}  # Config-level skip
        ctx.logger = MagicMock()

        stage = ReviewStage()
        should_skip, reason = stage.should_skip(ctx)

        self.assertTrue(should_skip, "Should skip when config flag is True")
        self.assertIn("workflow configuration", reason)

    def test_should_not_skip_for_features(self):
        """Verify features are not skipped."""
        from stages.review_stage import ReviewStage
        from orchestrator.stage_interface import StageContext

        ctx = MagicMock(spec=StageContext)
        ctx.state = {
            "issue_class": "/feature",
            "issue_json": {"metadata": {}}
        }
        ctx.config = {}
        ctx.logger = MagicMock()

        stage = ReviewStage()
        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)
        self.assertIsNone(reason)


class TestReviewModes(unittest.TestCase):
    """Tests for ReviewMode enum and resolution."""

    def test_review_mode_values(self):
        """Verify ReviewMode enum has expected values."""
        from stages.review_modes import ReviewMode

        self.assertEqual(ReviewMode.UI_VALIDATION.value, "ui")
        self.assertEqual(ReviewMode.CODE_QUALITY.value, "code")
        self.assertEqual(ReviewMode.SECURITY.value, "security")
        self.assertEqual(ReviewMode.DOCUMENTATION.value, "docs")
        self.assertEqual(ReviewMode.COMPREHENSIVE.value, "comprehensive")

    def test_resolve_modes_comprehensive(self):
        """Verify comprehensive mode expands to all modes."""
        from stages.review_modes import resolve_modes, ReviewMode

        modes = resolve_modes(["comprehensive"])

        self.assertIn(ReviewMode.SECURITY, modes)
        self.assertIn(ReviewMode.CODE_QUALITY, modes)
        self.assertIn(ReviewMode.UI_VALIDATION, modes)
        self.assertIn(ReviewMode.DOCUMENTATION, modes)

    def test_resolve_modes_single(self):
        """Verify single mode resolution works."""
        from stages.review_modes import resolve_modes, ReviewMode

        modes = resolve_modes(["security"])
        self.assertEqual(len(modes), 1)
        self.assertIn(ReviewMode.SECURITY, modes)

    def test_resolve_modes_multiple(self):
        """Verify multiple mode resolution works."""
        from stages.review_modes import resolve_modes, ReviewMode

        modes = resolve_modes(["security", "code"])
        self.assertEqual(len(modes), 2)
        self.assertIn(ReviewMode.SECURITY, modes)
        self.assertIn(ReviewMode.CODE_QUALITY, modes)


class TestReviewConfig(unittest.TestCase):
    """Tests for ReviewConfig schema."""

    def test_default_config(self):
        """Verify default configuration values."""
        from schemas.review_config import ReviewConfig

        config = ReviewConfig()

        # Key assertion: skip_review defaults to False
        self.assertFalse(config.skip_review)
        self.assertEqual(config.modes, ["comprehensive"])
        self.assertTrue(config.fail_on_critical)
        self.assertTrue(config.fail_on_high)

    def test_minimal_config(self):
        """Verify minimal config preset."""
        from schemas.review_config import ReviewConfig

        config = ReviewConfig.minimal()

        self.assertEqual(config.modes, ["code"])
        self.assertFalse(config.ui_validation.enabled)
        self.assertFalse(config.ai_review.enabled)

    def test_security_focused_config(self):
        """Verify security-focused config preset."""
        from schemas.review_config import ReviewConfig

        config = ReviewConfig.security_focused()

        self.assertEqual(config.modes, ["security"])
        self.assertTrue(config.tools["bearer"].enabled)
        self.assertTrue(config.tools["semgrep"].enabled)
        self.assertFalse(config.tools["eslint"].enabled)
        self.assertFalse(config.tools["ruff"].enabled)

    def test_from_dict(self):
        """Verify config can be created from dictionary."""
        from schemas.review_config import ReviewConfig

        data = {
            "skip_review": False,
            "modes": ["security", "code"],
            "fail_on_critical": True,
            "tools": {
                "bearer": {"enabled": True},
                "eslint": {"enabled": False},
            }
        }

        config = ReviewConfig.from_dict(data)

        self.assertFalse(config.skip_review)
        self.assertEqual(config.modes, ["security", "code"])
        self.assertTrue(config.tools["bearer"].enabled)
        self.assertFalse(config.tools["eslint"].enabled)


class TestReviewFinding(unittest.TestCase):
    """Tests for ReviewFinding data class."""

    def test_finding_to_dict(self):
        """Verify finding serialization."""
        from stages.review_modes import ReviewFinding, IssueSeverity

        finding = ReviewFinding(
            severity=IssueSeverity.HIGH,
            category="sql_injection",
            message="Possible SQL injection vulnerability",
            file_path="src/api/users.py",
            line_number=45,
            tool="bearer",
            recommendation="Use parameterized queries",
        )

        d = finding.to_dict()

        self.assertEqual(d["severity"], "high")
        self.assertEqual(d["category"], "sql_injection")
        self.assertEqual(d["tool"], "bearer")
        self.assertEqual(d["line_number"], 45)


class TestComprehensiveReviewResult(unittest.TestCase):
    """Tests for ComprehensiveReviewResult."""

    def test_empty_result(self):
        """Verify empty result properties."""
        from stages.review_modes import ComprehensiveReviewResult

        result = ComprehensiveReviewResult(
            review_id="test-001",
            adw_id="12345678",
            success=True,
            modes_executed=[],
        )

        self.assertEqual(result.all_findings, [])
        self.assertFalse(result.has_blockers)
        self.assertIn("no issues", result.summary.lower())

    def test_result_with_blockers(self):
        """Verify result with blocking issues."""
        from stages.review_modes import (
            ComprehensiveReviewResult,
            ReviewModeResult,
            ReviewFinding,
            IssueSeverity,
            ReviewMode,
        )

        finding = ReviewFinding(
            severity=IssueSeverity.CRITICAL,
            category="security",
            message="Critical security issue",
            tool="bearer",
        )

        mode_result = ReviewModeResult(
            mode=ReviewMode.SECURITY,
            success=True,
            tool_name="bearer",
            findings=[finding],
        )

        result = ComprehensiveReviewResult(
            review_id="test-002",
            adw_id="12345678",
            success=True,
            modes_executed=[ReviewMode.SECURITY],
            mode_results=[mode_result],
        )

        self.assertTrue(result.has_blockers)
        self.assertEqual(len(result.all_findings), 1)
        self.assertIn("blocking", result.summary.lower())


def run_tests():
    """Run the test suite."""
    print("=" * 60)
    print("Review Stage Revamp Tests")
    print("=" * 60)
    print()
    print("Testing the new review system:")
    print("- should_skip logic (no auto-skip for chores/patches)")
    print("- Review modes and resolution")
    print("- Review configuration schema")
    print("- Review findings and results")
    print()

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestReviewStageSkipLogic))
    suite.addTests(loader.loadTestsFromTestCase(TestReviewModes))
    suite.addTests(loader.loadTestsFromTestCase(TestReviewConfig))
    suite.addTests(loader.loadTestsFromTestCase(TestReviewFinding))
    suite.addTests(loader.loadTestsFromTestCase(TestComprehensiveReviewResult))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print()
    print("=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print()
        print("All review revamp tests passed!")
        return True
    else:
        print()
        print("Some tests failed. Please review.")
        for failure in result.failures:
            print(f"\nFailed: {failure[0]}")
            print(failure[1])
        for error in result.errors:
            print(f"\nError: {error[0]}")
            print(error[1])
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
