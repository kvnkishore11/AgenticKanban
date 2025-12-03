#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "python-dotenv", "pydantic", "requests"]
# ///

"""
Comprehensive tests for ADW build and test workflows.

Tests cover:
- adw_build_iso.py: Build phase implementation
- adw_test_iso.py: Test phase with retry/resolution logic
- adw_plan_build_test_iso.py: Composite workflow orchestration
"""

import sys
import os
import json
import pytest
from unittest.mock import Mock, patch

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_modules.state import ADWState
from adw_modules.data_types import (
    AgentPromptResponse,
    TestResult,
    E2ETestResult,
    GitHubIssue,
)

# Import test workflow utilities from utils.test module
from utils.test import (
    parse_test_results,
    format_test_results_comment,
    parse_e2e_test_results,
    run_e2e_tests,
    post_comprehensive_test_summary,
    run_unit_tests_with_resolution,
)


@pytest.fixture
def mock_adw_id():
    """Return a test ADW ID."""
    return "12345678"


@pytest.fixture
def mock_issue_number():
    """Return a test issue number."""
    return "42"


@pytest.fixture
def mock_state(mock_adw_id, tmp_path):
    """Create a mock ADWState with test data."""
    state = ADWState(mock_adw_id)
    state.update(
        issue_number="42",
        branch_name="test-branch",
        plan_file="specs/test-plan.md",
        issue_class="/feature",
        worktree_path=str(tmp_path / "worktree"),
        backend_port=9000,
        websocket_port=9100,
        frontend_port=9200,
    )
    return state


@pytest.fixture
def mock_issue():
    """Create a mock GitHub issue."""
    return GitHubIssue(
        number=42,
        title="Test issue for build/test workflow",
        body="This is a test issue body",
        state="open",
        author={"login": "testuser"},
        assignees=[],
        labels=[],
        milestone=None,
        comments=[],
        created_at="2025-01-01T00:00:00Z",
        updated_at="2025-01-01T00:00:00Z",
        closed_at=None,
        url="https://github.com/test/repo/issues/42"
    )


@pytest.fixture
def mock_test_results():
    """Create mock test results."""
    return [
        TestResult(
            test_name="Python Syntax Validation",
            passed=True,
            execution_command="uv run python -m py_compile adws/*.py",
            test_purpose="Validate Python syntax",
            error=None,
        ),
        TestResult(
            test_name="Backend Linting",
            passed=True,
            execution_command="uv run ruff check adws/",
            test_purpose="Validate Python code quality",
            error=None,
        ),
        TestResult(
            test_name="TypeScript Type Checking",
            passed=True,
            execution_command="npm run typecheck",
            test_purpose="Validate TypeScript types",
            error=None,
        ),
    ]


@pytest.fixture
def mock_failed_test_results():
    """Create mock failed test results."""
    return [
        TestResult(
            test_name="Python Syntax Validation",
            passed=False,
            execution_command="uv run python -m py_compile adws/*.py",
            test_purpose="Validate Python syntax",
            error="Syntax error in test.py",
        ),
    ]


@pytest.fixture
def mock_e2e_test_results():
    """Create mock E2E test results."""
    return [
        E2ETestResult(
            test_name="Kanban Board Navigation",
            status="passed",
            test_path=".claude/commands/e2e/kanban_navigation.md",
            screenshots=["screenshot1.png"],
            error=None,
        ),
    ]


class TestBuildWorkflowComponents:
    """Tests for build workflow components."""

    def test_state_has_required_fields(self, mock_state):
        """Test that state contains required fields for build workflow."""
        assert mock_state.get("branch_name") is not None
        assert mock_state.get("plan_file") is not None
        assert mock_state.get("worktree_path") is not None
        assert mock_state.get("issue_class") is not None

    def test_state_persistence(self, mock_adw_id, tmp_path):
        """Test that state is correctly saved and loaded."""
        # Create state
        state = ADWState(mock_adw_id)
        state.update(
            issue_number="42",
            branch_name="test-branch",
            plan_file="specs/test.md",
        )

        # Save state (to database)
        state.save("test_phase")

        try:
            # Verify state was persisted by loading it from the database
            loaded_state = ADWState.load(mock_adw_id)

            # Verify the loaded state exists and has the saved data
            assert loaded_state is not None
            assert loaded_state.get("issue_number") == 42  # Database stores as integer
            assert loaded_state.get("branch_name") is not None
            assert loaded_state.get("plan_file") == "specs/test.md"
        finally:
            # Clean up test data from database
            try:
                import sqlite3
                from pathlib import Path
                project_root = Path(__file__).parent.parent.parent
                if 'trees' in project_root.parts:
                    trees_index = project_root.parts.index('trees')
                    main_root = Path(*project_root.parts[:trees_index])
                    db_path = main_root / "adws" / "database" / "agentickanban.db"
                else:
                    db_path = project_root / "adws" / "database" / "agentickanban.db"
                if db_path.exists():
                    conn = sqlite3.connect(str(db_path))
                    conn.execute("DELETE FROM adw_states WHERE adw_id = ?", (mock_adw_id,))
                    conn.commit()
                    conn.close()
            except Exception:
                pass  # Best effort cleanup

    def test_state_append_adw_id(self, mock_adw_id):
        """Test appending ADW IDs to track workflow execution."""
        state = ADWState(mock_adw_id)

        # Append workflow IDs
        state.append_adw_id("adw_plan_iso")
        state.append_adw_id("adw_build_iso")
        state.append_adw_id("adw_test_iso")

        # Verify
        all_adws = state.get("all_adws", [])
        assert "adw_plan_iso" in all_adws
        assert "adw_build_iso" in all_adws
        assert "adw_test_iso" in all_adws

        # Verify no duplicates
        state.append_adw_id("adw_plan_iso")
        all_adws = state.get("all_adws", [])
        assert all_adws.count("adw_plan_iso") == 1


class TestTestWorkflowComponents:
    """Tests for test workflow helper functions."""

    def test_parse_test_results_valid_json(self, mock_test_results):
        """Test parsing valid test results JSON."""
        # Create JSON output
        output = json.dumps([r.model_dump() for r in mock_test_results])

        results, passed, failed = parse_test_results(output, Mock())

        assert len(results) == 3
        assert passed == 3
        assert failed == 0

    def test_parse_test_results_with_failures(self, mock_failed_test_results):
        """Test parsing test results with failures."""
        output = json.dumps([r.model_dump() for r in mock_failed_test_results])

        results, passed, failed = parse_test_results(output, Mock())

        assert len(results) == 1
        assert passed == 0
        assert failed == 1

    def test_format_test_results_comment(self, mock_test_results):
        """Test formatting test results for GitHub comment."""
        comment = format_test_results_comment(mock_test_results, 3, 0)

        assert "✅ Passed Tests" in comment
        assert "Summary" in comment
        assert "Passed**: 3" in comment
        assert "Failed**: 0" in comment

    def test_format_test_results_comment_with_failures(self, mock_failed_test_results):
        """Test formatting test results with failures."""
        comment = format_test_results_comment(mock_failed_test_results, 0, 1)

        assert "❌ Failed Tests" in comment
        assert "Summary" in comment
        assert "Passed**: 0" in comment
        assert "Failed**: 1" in comment


class TestE2ETestComponents:
    """Tests for E2E test functionality."""

    def test_parse_e2e_test_results(self, mock_e2e_test_results):
        """Test parsing E2E test results."""
        output = json.dumps([r.model_dump() for r in mock_e2e_test_results])

        results, passed, failed = parse_e2e_test_results(output, Mock())

        assert len(results) == 1
        assert passed == 1
        assert failed == 0
        assert results[0].screenshots == ["screenshot1.png"]
        assert results[0].passed is True

    @patch('utils.test.e2e_tests.execute_template')
    def test_run_e2e_tests(self, mock_execute, mock_adw_id):
        """Test running E2E tests."""
        # Mock E2E test execution
        mock_execute.return_value = AgentPromptResponse(
            success=True,
            output="E2E tests completed",
            session_id="e2e-session",
        )

        response = run_e2e_tests(mock_adw_id, Mock(), "/tmp/worktree")

        assert response.success
        assert mock_execute.called

        # Verify the agent request
        call_args = mock_execute.call_args[0][0]
        assert call_args.slash_command == "/test_e2e"
        assert call_args.adw_id == mock_adw_id
        assert call_args.working_dir == "/tmp/worktree"

    @patch('utils.test.summary.make_issue_comment')
    def test_comprehensive_test_summary(
        self, mock_comment, mock_test_results, mock_e2e_test_results, mock_adw_id
    ):
        """Test comprehensive test summary generation."""
        post_comprehensive_test_summary(
            "42", mock_adw_id, mock_test_results, mock_e2e_test_results, Mock()
        )

        # Verify comment was posted
        assert mock_comment.called
        comment_text = mock_comment.call_args[0][1]

        assert "Comprehensive Test Results" in comment_text
        assert "Unit Tests" in comment_text
        assert "E2E Tests" in comment_text
        assert "Overall Status: PASSED" in comment_text


class TestTestRetryResolution:
    """Tests for test retry and resolution logic."""

    @patch('utils.test.unit_tests.run_tests')
    @patch('utils.test.unit_tests.make_issue_comment')
    def test_run_tests_with_resolution_success_first_try(
        self,
        mock_comment,
        mock_run_tests,
        mock_test_results,
        mock_adw_id,
    ):
        """Test test workflow with all tests passing on first try."""
        # First run: tests pass
        test_response = AgentPromptResponse(
            success=True,
            output=json.dumps([r.model_dump() for r in mock_test_results]),
            session_id="test-session",
        )
        mock_run_tests.return_value = test_response

        # Mock resolve function
        mock_resolve = Mock(return_value=(0, 0))

        ctx = run_unit_tests_with_resolution(
            mock_adw_id, "42", Mock(), "/tmp/worktree", mock_resolve, max_attempts=2
        )

        # Verify results
        assert ctx.passed_count == 3
        assert ctx.failed_count == 0
        assert mock_run_tests.call_count == 1
        assert mock_resolve.call_count == 0  # No resolution needed

    @patch('utils.test.unit_tests.run_tests')
    @patch('utils.test.unit_tests.make_issue_comment')
    def test_run_tests_with_resolution_retry_and_pass(
        self,
        mock_comment,
        mock_run_tests,
        mock_test_results,
        mock_failed_test_results,
        mock_adw_id,
    ):
        """Test test workflow with failed tests that get resolved."""
        # First run: tests fail
        first_response = AgentPromptResponse(
            success=True,
            output=json.dumps([r.model_dump() for r in mock_failed_test_results]),
            session_id="test-session-1",
        )
        # Second run: tests pass after resolution
        second_response = AgentPromptResponse(
            success=True,
            output=json.dumps([r.model_dump() for r in mock_test_results]),
            session_id="test-session-2",
        )

        mock_run_tests.side_effect = [first_response, second_response]

        # Mock resolve function
        mock_resolve = Mock(return_value=(1, 0))  # 1 resolved, 0 unresolved

        ctx = run_unit_tests_with_resolution(
            mock_adw_id, "42", Mock(), "/tmp/worktree", mock_resolve, max_attempts=2
        )

        # Verify resolution was attempted
        assert mock_run_tests.call_count == 2
        assert mock_resolve.call_count == 1
        assert ctx.failed_count == 0  # All tests should pass after resolution

    @patch('utils.test.unit_tests.run_tests')
    @patch('utils.test.unit_tests.make_issue_comment')
    def test_run_tests_with_resolution_max_attempts(
        self,
        mock_comment,
        mock_run_tests,
        mock_failed_test_results,
        mock_adw_id,
    ):
        """Test test workflow when resolution doesn't fix failures."""
        # All runs fail
        failed_response = AgentPromptResponse(
            success=True,
            output=json.dumps([r.model_dump() for r in mock_failed_test_results]),
            session_id="test-session",
        )
        mock_run_tests.return_value = failed_response

        # Mock resolve function
        mock_resolve = Mock(return_value=(0, 1))  # 0 resolved, 1 unresolved

        ctx = run_unit_tests_with_resolution(
            mock_adw_id, "42", Mock(), "/tmp/worktree", mock_resolve, max_attempts=2
        )

        # When no tests are resolved, the loop stops early (doesn't retry)
        # This is the expected behavior - no point in retrying if resolution didn't help
        assert mock_run_tests.call_count == 1
        assert mock_resolve.call_count == 1  # Tried to resolve after first failure
        assert ctx.failed_count == 1


class TestCompositeWorkflow:
    """Tests for composite workflow orchestration."""

    @patch('subprocess.run')
    @patch('adw_plan_build_test_iso.ensure_adw_id')
    def test_composite_workflow_skip_e2e_flag(self, mock_ensure_adw, mock_subprocess, mock_adw_id):
        """Test that --skip-e2e flag is passed to test phase."""
        mock_ensure_adw.return_value = mock_adw_id
        mock_subprocess.return_value = Mock(returncode=0)

        # Import and run with --skip-e2e
        with patch('sys.argv', ['adw_plan_build_test_iso.py', '42', '--skip-e2e']):
            import adw_plan_build_test_iso
            adw_plan_build_test_iso.main()

        # Verify --skip-e2e was passed to test phase
        test_call = mock_subprocess.call_args_list[2][0][0]
        assert '--skip-e2e' in test_call

    @patch('subprocess.run')
    @patch('adw_plan_build_test_iso.ensure_adw_id')
    def test_composite_workflow_plan_fails(self, mock_ensure_adw, mock_subprocess, mock_adw_id):
        """Test composite workflow when plan phase fails."""
        mock_ensure_adw.return_value = mock_adw_id

        # Plan phase fails
        mock_subprocess.return_value = Mock(returncode=1)

        # Import and run
        with patch('sys.argv', ['adw_plan_build_test_iso.py', '42']):
            import adw_plan_build_test_iso
            with pytest.raises(SystemExit) as exc_info:
                adw_plan_build_test_iso.main()

            # Should exit with 1
            assert exc_info.value.code == 1

        # Only plan phase should be called
        assert mock_subprocess.call_count == 1


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
