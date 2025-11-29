#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pydantic"]
# ///
"""Unit tests for the ADW Orchestrator Stages package.

Tests cover:
- BaseStage common functionality
- PlanStage, BuildStage, TestStage, ReviewStage, DocumentStage, MergeStage
- Skip conditions for each stage
- Precondition checks
"""

import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.stage_interface import StageContext, StageResult, StageStatus
from stages.plan_stage import PlanStage
from stages.build_stage import BuildStage
from stages.test_stage import TestStage
from stages.review_stage import ReviewStage
from stages.document_stage import DocumentStage
from stages.merge_stage import MergeStage


class MockStageContext:
    """Factory for creating mock stage contexts."""

    @staticmethod
    def create(
        adw_id="ADW-12345678",
        issue_number="123",
        worktree_path="/tmp/worktree",
        issue_class="/feature",
        branch_name="feature/test-branch",
        plan_file="/tmp/specs/plan.md",
        has_worktree=True,
        config=None,
    ):
        """Create a mock StageContext."""
        mock_state = MagicMock()
        mock_state.get.side_effect = lambda key, default=None: {
            "worktree_path": worktree_path if has_worktree else None,
            "issue_class": issue_class,
            "branch_name": branch_name,
            "plan_file": plan_file,
        }.get(key, default)

        mock_logger = MagicMock()
        mock_notifier = MagicMock()

        return StageContext(
            adw_id=adw_id,
            issue_number=issue_number,
            state=mock_state,
            worktree_path=worktree_path if has_worktree else "",
            logger=mock_logger,
            notifier=mock_notifier,
            config=config or {},
        )


class TestBaseStage(unittest.TestCase):
    """Test BaseStage common functionality."""

    def test_check_worktree_exists_when_present(self):
        """Test worktree check when worktree exists."""
        ctx = MockStageContext.create(has_worktree=True)

        # Create a concrete stage to test
        stage = BuildStage()

        with patch("os.path.exists", return_value=True):
            exists, error = stage.check_worktree_exists(ctx)

        self.assertTrue(exists)
        self.assertIsNone(error)

    def test_check_worktree_exists_when_missing_path(self):
        """Test worktree check when path is missing."""
        ctx = MockStageContext.create(has_worktree=False)

        stage = BuildStage()
        exists, error = stage.check_worktree_exists(ctx)

        self.assertFalse(exists)
        self.assertIn("No worktree path", error)

    def test_check_worktree_exists_when_directory_missing(self):
        """Test worktree check when directory doesn't exist."""
        ctx = MockStageContext.create(has_worktree=True)

        stage = BuildStage()

        with patch("os.path.exists", return_value=False):
            exists, error = stage.check_worktree_exists(ctx)

        self.assertFalse(exists)
        self.assertIn("does not exist", error)


class TestPlanStage(unittest.TestCase):
    """Test PlanStage implementation."""

    def test_stage_properties(self):
        """Test plan stage properties."""
        stage = PlanStage()

        self.assertEqual(stage.name, "plan")
        self.assertEqual(stage.display_name, "Planning")
        self.assertEqual(stage.dependencies, [])

    def test_preconditions_always_pass(self):
        """Test that plan stage preconditions always pass."""
        ctx = MockStageContext.create()
        stage = PlanStage()

        can_run, error = stage.preconditions(ctx)

        self.assertTrue(can_run)
        self.assertIsNone(error)

    def test_should_skip_returns_false(self):
        """Test that plan stage never skips."""
        ctx = MockStageContext.create()
        stage = PlanStage()

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)
        self.assertIsNone(reason)

    @patch("stages.base_stage.BaseStage.run_script")
    def test_execute_calls_plan_script(self, mock_run_script):
        """Test that execute calls the plan script."""
        ctx = MockStageContext.create()
        stage = PlanStage()
        mock_run_script.return_value = StageResult(
            status=StageStatus.COMPLETED, message="Plan complete"
        )

        stage.execute(ctx)

        mock_run_script.assert_called_once()
        args = mock_run_script.call_args[0]
        self.assertIn("adw_plan_iso.py", args[1])


class TestBuildStage(unittest.TestCase):
    """Test BuildStage implementation."""

    def test_stage_properties(self):
        """Test build stage properties."""
        stage = BuildStage()

        self.assertEqual(stage.name, "build")
        self.assertEqual(stage.display_name, "Building")
        self.assertEqual(stage.dependencies, ["plan"])

    def test_preconditions_require_worktree(self):
        """Test that build requires worktree."""
        ctx = MockStageContext.create(has_worktree=False)
        stage = BuildStage()

        can_run, error = stage.preconditions(ctx)

        self.assertFalse(can_run)
        self.assertIn("worktree", error.lower())

    def test_preconditions_require_plan_file(self):
        """Test that build requires plan file."""
        ctx = MockStageContext.create(plan_file=None)
        stage = BuildStage()

        with patch("os.path.exists", return_value=True):
            can_run, error = stage.preconditions(ctx)

        self.assertFalse(can_run)
        self.assertIn("plan", error.lower())

    @patch("stages.base_stage.BaseStage.run_script")
    @patch("os.path.exists", return_value=True)
    def test_execute_calls_build_script(self, mock_exists, mock_run_script):
        """Test that execute calls the build script."""
        ctx = MockStageContext.create()
        stage = BuildStage()
        mock_run_script.return_value = StageResult(
            status=StageStatus.COMPLETED, message="Build complete"
        )

        stage.execute(ctx)

        mock_run_script.assert_called_once()
        args = mock_run_script.call_args[0]
        self.assertIn("adw_build_iso.py", args[1])


class TestTestStage(unittest.TestCase):
    """Test TestStage implementation."""

    def test_stage_properties(self):
        """Test test stage properties."""
        stage = TestStage()

        self.assertEqual(stage.name, "test")
        self.assertEqual(stage.display_name, "Testing")
        self.assertEqual(stage.dependencies, ["build"])

    def test_preconditions_require_worktree(self):
        """Test that test requires worktree."""
        ctx = MockStageContext.create(has_worktree=False)
        stage = TestStage()

        can_run, error = stage.preconditions(ctx)

        self.assertFalse(can_run)

    @patch("os.path.exists")
    @patch("glob.glob")
    def test_should_skip_when_no_tests(self, mock_glob, mock_exists):
        """Test that test stage skips when no tests exist."""
        ctx = MockStageContext.create()
        stage = TestStage()

        # Simulate no test files found
        mock_exists.return_value = True
        mock_glob.return_value = []

        should_skip, reason = stage.should_skip(ctx)

        self.assertTrue(should_skip)
        self.assertIn("test", reason.lower())

    @patch("os.path.exists")
    @patch("glob.glob")
    def test_should_not_skip_when_tests_exist(self, mock_glob, mock_exists):
        """Test that test stage runs when tests exist."""
        ctx = MockStageContext.create()
        stage = TestStage()

        # Simulate test files found
        mock_exists.return_value = True
        mock_glob.return_value = ["/tmp/worktree/tests/test_file.py"]

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)


class TestReviewStage(unittest.TestCase):
    """Test ReviewStage implementation."""

    def test_stage_properties(self):
        """Test review stage properties."""
        stage = ReviewStage()

        self.assertEqual(stage.name, "review")
        self.assertEqual(stage.display_name, "Reviewing")
        self.assertEqual(stage.dependencies, ["build"])

    def test_should_not_skip_for_patch(self):
        """Test that review runs for patch issues (never auto-skips by type)."""
        ctx = MockStageContext.create(issue_class="/patch")
        stage = ReviewStage()

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)
        self.assertIsNone(reason)

    def test_should_not_skip_for_chore(self):
        """Test that review runs for chore issues (never auto-skips by type)."""
        ctx = MockStageContext.create(issue_class="/chore")
        stage = ReviewStage()

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)
        self.assertIsNone(reason)

    def test_should_not_skip_for_feature(self):
        """Test that review runs for feature issues."""
        ctx = MockStageContext.create(issue_class="/feature")
        stage = ReviewStage()

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)

    def test_should_not_skip_for_bug(self):
        """Test that review runs for bug issues."""
        ctx = MockStageContext.create(issue_class="/bug")
        stage = ReviewStage()

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)

    @patch("stages.base_stage.BaseStage.run_script")
    @patch("os.path.exists", return_value=True)
    def test_execute_with_skip_resolution_config(self, mock_exists, mock_run_script):
        """Test that skip_resolution config is passed to script."""
        ctx = MockStageContext.create(config={"skip_resolution": True})
        stage = ReviewStage()
        mock_run_script.return_value = StageResult(
            status=StageStatus.COMPLETED, message="Review complete"
        )

        stage.execute(ctx)

        mock_run_script.assert_called_once()
        args = mock_run_script.call_args[0]
        # Check that --skip-resolution is in args
        self.assertIn("--skip-resolution", args[2])


class TestDocumentStage(unittest.TestCase):
    """Test DocumentStage implementation."""

    def test_stage_properties(self):
        """Test document stage properties."""
        stage = DocumentStage()

        self.assertEqual(stage.name, "document")
        self.assertEqual(stage.display_name, "Documenting")
        self.assertEqual(stage.dependencies, ["build"])

    @patch("subprocess.run")
    @patch("os.path.exists", return_value=True)
    def test_should_skip_when_no_changes(self, mock_exists, mock_subprocess):
        """Test that document skips when no code changes."""
        ctx = MockStageContext.create()
        stage = DocumentStage()

        # Simulate git diff showing no changes
        mock_subprocess.return_value = MagicMock(stdout="", returncode=0)

        should_skip, reason = stage.should_skip(ctx)

        self.assertTrue(should_skip)
        self.assertIn("change", reason.lower())

    @patch("subprocess.run")
    @patch("os.path.exists", return_value=True)
    def test_should_not_skip_when_changes_exist(self, mock_exists, mock_subprocess):
        """Test that document runs when code changes exist."""
        ctx = MockStageContext.create()
        stage = DocumentStage()

        # Simulate git diff showing changes
        mock_subprocess.return_value = MagicMock(
            stdout=" src/main.py | 10 +++---\n 1 file changed", returncode=0
        )

        should_skip, reason = stage.should_skip(ctx)

        self.assertFalse(should_skip)


class TestMergeStage(unittest.TestCase):
    """Test MergeStage implementation."""

    def test_stage_properties(self):
        """Test merge stage properties."""
        stage = MergeStage()

        self.assertEqual(stage.name, "merge")
        self.assertEqual(stage.display_name, "Merging")
        self.assertEqual(stage.dependencies, ["build"])

    def test_preconditions_require_worktree(self):
        """Test that merge requires worktree."""
        ctx = MockStageContext.create(has_worktree=False)
        stage = MergeStage()

        can_run, error = stage.preconditions(ctx)

        self.assertFalse(can_run)

    def test_preconditions_require_branch_name(self):
        """Test that merge requires branch name."""
        ctx = MockStageContext.create(branch_name=None)
        stage = MergeStage()

        with patch("os.path.exists", return_value=True):
            can_run, error = stage.preconditions(ctx)

        self.assertFalse(can_run)
        self.assertIn("branch", error.lower())

    @patch("stages.base_stage.BaseStage.run_script")
    @patch("os.path.exists", return_value=True)
    def test_execute_calls_merge_script(self, mock_exists, mock_run_script):
        """Test that execute calls the merge script."""
        ctx = MockStageContext.create()
        stage = MergeStage()
        mock_run_script.return_value = StageResult(
            status=StageStatus.COMPLETED, message="Merge complete"
        )

        stage.execute(ctx)

        mock_run_script.assert_called_once()
        args = mock_run_script.call_args[0]
        self.assertIn("adw_merge_iso.py", args[1])


class TestStageIntegration(unittest.TestCase):
    """Integration tests for stage interactions."""

    def test_all_stages_have_required_properties(self):
        """Test that all stages implement required properties."""
        stages = [
            PlanStage(),
            BuildStage(),
            TestStage(),
            ReviewStage(),
            DocumentStage(),
            MergeStage(),
        ]

        for stage in stages:
            # Check required properties
            self.assertIsInstance(stage.name, str)
            self.assertIsInstance(stage.display_name, str)
            self.assertIsInstance(stage.dependencies, list)
            self.assertTrue(len(stage.name) > 0)
            self.assertTrue(len(stage.display_name) > 0)

    def test_dependency_chain_is_valid(self):
        """Test that stage dependencies form a valid chain."""
        stages = {
            "plan": PlanStage(),
            "build": BuildStage(),
            "test": TestStage(),
            "review": ReviewStage(),
            "document": DocumentStage(),
            "merge": MergeStage(),
        }

        # Check that all dependencies exist
        for name, stage in stages.items():
            for dep in stage.dependencies:
                self.assertIn(
                    dep,
                    stages.keys(),
                    f"Stage '{name}' has unknown dependency '{dep}'",
                )

    def test_all_stages_implement_execute(self):
        """Test that all stages implement execute method."""
        stages = [
            PlanStage(),
            BuildStage(),
            TestStage(),
            ReviewStage(),
            DocumentStage(),
            MergeStage(),
        ]

        for stage in stages:
            # Check that execute is callable
            self.assertTrue(callable(getattr(stage, "execute", None)))


def run_tests():
    """Run the test suite."""
    print("Running Orchestrator Stages Unit Tests...")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestBaseStage))
    suite.addTests(loader.loadTestsFromTestCase(TestPlanStage))
    suite.addTests(loader.loadTestsFromTestCase(TestBuildStage))
    suite.addTests(loader.loadTestsFromTestCase(TestTestStage))
    suite.addTests(loader.loadTestsFromTestCase(TestReviewStage))
    suite.addTests(loader.loadTestsFromTestCase(TestDocumentStage))
    suite.addTests(loader.loadTestsFromTestCase(TestMergeStage))
    suite.addTests(loader.loadTestsFromTestCase(TestStageIntegration))

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\nTest Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.wasSuccessful():
        print("\nAll orchestrator stages tests passed!")
        return True
    else:
        print("\nSome tests failed. Please review.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
