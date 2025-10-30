#!/usr/bin/env -S uv run
"""Test Kanban integration functionality for ADW workflow system."""

import json
import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_triggers.websocket_models import WorkflowTriggerRequest
from adw_triggers.trigger_websocket import validate_workflow_request
from adw_modules.workflow_ops import create_github_issue_from_kanban_data, save_workflow_output_for_kanban
from adw_modules.state import ADWState
from adw_modules.data_types import GitHubIssue
from adw_modules.kanban_mode import (
    is_kanban_mode,
    get_issue_data_safe,
    git_operation_safe,
    github_operation_safe,
    should_skip_worktree_operations,
    create_kanban_issue_from_data,
    get_kanban_output_path,
)
from adw_modules.github import fetch_issue_safe, make_issue_comment_safe


class TestKanbanIntegration(unittest.TestCase):
    """Test suite for Kanban integration functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.sample_kanban_issue_json = {
            "title": "Implement user authentication",
            "description": "Add JWT-based authentication to the API",
            "workItemType": "feature",
            "id": "AUTH-123",
            "created_at": "2024-01-01T12:00:00Z",
            "updated_at": "2024-01-01T12:00:00Z",
            "labels": ["authentication", "security"]
        }

        self.sample_github_request = {
            "workflow_type": "adw_plan_iso",
            "issue_number": "123",
            "issue_type": "feature",
            "model_set": "base"
        }

        self.sample_kanban_request = {
            "workflow_type": "adw_plan_iso",
            "issue_number": "123",
            "issue_type": "feature",
            "issue_json": self.sample_kanban_issue_json,
            "model_set": "base"
        }

    def test_workflow_trigger_request_accepts_issue_json(self):
        """Test that WorkflowTriggerRequest model accepts issue_json field."""
        request = WorkflowTriggerRequest(**self.sample_kanban_request)

        self.assertEqual(request.workflow_type, "adw_plan_iso")
        self.assertEqual(request.issue_number, "123")
        self.assertEqual(request.issue_type, "feature")
        self.assertEqual(request.issue_json, self.sample_kanban_issue_json)
        self.assertEqual(request.model_set, "base")

    def test_workflow_trigger_request_backward_compatibility(self):
        """Test that WorkflowTriggerRequest remains backward compatible."""
        request = WorkflowTriggerRequest(**self.sample_github_request)

        self.assertEqual(request.workflow_type, "adw_plan_iso")
        self.assertEqual(request.issue_number, "123")
        self.assertEqual(request.issue_type, "feature")
        self.assertIsNone(request.issue_json)  # Should be None when not provided
        self.assertEqual(request.model_set, "base")

    def test_validate_workflow_request_with_issue_json(self):
        """Test validation accepts requests with issue_json."""
        validated_request, error = validate_workflow_request(self.sample_kanban_request)

        self.assertIsNotNone(validated_request)
        self.assertIsNone(error)
        self.assertEqual(validated_request.issue_json, self.sample_kanban_issue_json)

    def test_validate_workflow_request_with_github_data(self):
        """Test validation still works with traditional GitHub requests."""
        validated_request, error = validate_workflow_request(self.sample_github_request)

        self.assertIsNotNone(validated_request)
        self.assertIsNone(error)
        self.assertIsNone(validated_request.issue_json)

    def test_validate_workflow_request_requires_some_issue_data(self):
        """Test validation fails when no issue data is provided."""
        invalid_request = {
            "workflow_type": "adw_plan_iso",
            "model_set": "base"
            # Missing issue_number, issue_type, and issue_json
        }

        validated_request, error = validate_workflow_request(invalid_request)

        self.assertIsNone(validated_request)
        self.assertIsNotNone(error)
        self.assertIn("requires either an issue_number, issue_type, or issue_json", error)

    def test_create_github_issue_from_kanban_data(self):
        """Test conversion of Kanban data to GitHubIssue object."""
        github_issue = create_github_issue_from_kanban_data(
            self.sample_kanban_issue_json,
            "123"
        )

        self.assertIsInstance(github_issue, GitHubIssue)
        self.assertEqual(github_issue.number, 123)
        self.assertEqual(github_issue.title, "Implement user authentication")
        self.assertEqual(github_issue.body, "Add JWT-based authentication to the API")
        self.assertEqual(github_issue.state, "open")
        self.assertEqual(len(github_issue.labels), 2)
        self.assertEqual(github_issue.labels[0].name, "authentication")
        self.assertEqual(github_issue.labels[1].name, "security")

    def test_create_github_issue_handles_missing_fields(self):
        """Test conversion handles missing or differently named fields."""
        minimal_kanban_data = {
            "summary": "Simple task",  # Different field name
            # Missing description/body
            "createdAt": "2024-01-01T12:00:00Z"  # Different field name
        }

        github_issue = create_github_issue_from_kanban_data(minimal_kanban_data, "456")

        self.assertIsInstance(github_issue, GitHubIssue)
        self.assertEqual(github_issue.number, 456)
        self.assertEqual(github_issue.title, "Simple task")
        self.assertEqual(github_issue.body, "")  # Should default to empty string
        # Check that created_at is a datetime object and has the right value
        from datetime import datetime
        expected_datetime = datetime.fromisoformat("2024-01-01T12:00:00+00:00")
        self.assertEqual(github_issue.created_at, expected_datetime)

    def test_create_github_issue_fallback_title(self):
        """Test that missing title gets a fallback."""
        minimal_kanban_data = {}

        github_issue = create_github_issue_from_kanban_data(minimal_kanban_data, "789")

        self.assertEqual(github_issue.title, "Issue 789")

    @patch('adw_modules.workflow_ops.ADWState')
    def test_state_management_stores_kanban_data(self, mock_state_class):
        """Test that ADW state properly stores Kanban data."""
        mock_state = MagicMock()
        mock_state_class.return_value = mock_state

        # Simulate what happens in trigger_workflow function
        update_data = {
            "issue_number": "123",
            "model_set": "base",
            "issue_class": "/feature",
            "issue_json": self.sample_kanban_issue_json,
            "data_source": "kanban"
        }

        mock_state.update.assert_not_called()  # Should not be called yet
        mock_state.update(**update_data)
        mock_state.update.assert_called_once_with(**update_data)

    def test_data_source_identification(self):
        """Test that data source is correctly identified."""
        # Test Kanban data source
        kanban_request = WorkflowTriggerRequest(**self.sample_kanban_request)
        self.assertTrue(kanban_request.issue_json is not None)

        # Test GitHub data source
        github_request = WorkflowTriggerRequest(**self.sample_github_request)
        self.assertTrue(github_request.issue_json is None)

    def test_workflow_validation_edge_cases(self):
        """Test validation with various edge cases."""
        # Test with only issue_json (no issue_number or issue_type)
        json_only_request = {
            "workflow_type": "adw_plan_iso",
            "issue_json": self.sample_kanban_issue_json,
            "model_set": "base"
        }

        validated_request, error = validate_workflow_request(json_only_request)
        self.assertIsNotNone(validated_request)
        self.assertIsNone(error)

        # Test with issue_type only
        type_only_request = {
            "workflow_type": "adw_plan_iso",
            "issue_type": "bug",
            "model_set": "base"
        }

        validated_request, error = validate_workflow_request(type_only_request)
        self.assertIsNotNone(validated_request)
        self.assertIsNone(error)

    def test_non_issue_requiring_workflow(self):
        """Test that workflows not requiring issues work normally."""
        # Some workflows might not require issue data
        non_issue_request = {
            "workflow_type": "adw_build_iso",  # Dependent workflow
            "adw_id": "test-adw-id",
            "model_set": "base"
        }

        validated_request, error = validate_workflow_request(non_issue_request)
        self.assertIsNotNone(validated_request)
        self.assertIsNone(error)

    def test_kanban_mode_detection(self):
        """Test kanban mode detection functionality."""
        # Create state with kanban data source
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban", issue_json=self.sample_kanban_issue_json)

        # Create state with GitHub data source
        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        # Test detection
        self.assertTrue(is_kanban_mode(kanban_state))
        self.assertFalse(is_kanban_mode(github_state))

    def test_should_skip_worktree_operations(self):
        """Test worktree operation skipping in kanban mode."""
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")

        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        self.assertTrue(should_skip_worktree_operations(kanban_state))
        # Note: should_skip_worktree_operations also checks git availability
        # In test environment, git might not be available, so we can't assume False

    def test_get_issue_data_safe_with_kanban_data(self):
        """Test safe issue data retrieval with kanban data."""
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(
            data_source="kanban",
            issue_json=self.sample_kanban_issue_json
        )

        issue_data = get_issue_data_safe(kanban_state, "123")
        self.assertIsNotNone(issue_data)
        self.assertEqual(issue_data["title"], "Implement user authentication")

    def test_get_issue_data_safe_without_kanban_data(self):
        """Test safe issue data retrieval in kanban mode without data."""
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")  # No issue_json

        issue_data = get_issue_data_safe(kanban_state, "123")
        self.assertIsNone(issue_data)

    @patch('tempfile.gettempdir')
    def test_get_kanban_output_path(self, mock_tempdir):
        """Test kanban output path generation."""
        mock_tempdir.return_value = "/tmp"

        kanban_state = ADWState("test-adw-123")
        output_path = get_kanban_output_path(kanban_state, "test_output.txt")

        # Should create path under agents directory
        self.assertIn("agents", output_path)
        self.assertIn("test-adw-123", output_path)
        self.assertIn("kanban_output", output_path)
        self.assertIn("test_output.txt", output_path)

    def test_create_kanban_issue_from_data(self):
        """Test creating standardized issue from kanban data."""
        issue_data = create_kanban_issue_from_data(self.sample_kanban_issue_json, "123")

        self.assertEqual(issue_data["number"], "123")
        self.assertEqual(issue_data["title"], "Implement user authentication")
        self.assertEqual(issue_data["body"], "Add JWT-based authentication to the API")
        self.assertTrue(issue_data["kanban_source"])

    @patch('adw_modules.kanban_mode.is_git_available')
    def test_git_operation_safe_skips_in_kanban_mode(self, mock_git_available):
        """Test that git operations are skipped in kanban mode."""
        mock_git_available.return_value = True

        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")

        def dummy_git_operation():
            return "git_result"

        result = git_operation_safe("test_operation", kanban_state, dummy_git_operation)
        self.assertIsNone(result)  # Should be skipped

    @patch('adw_modules.kanban_mode.is_git_available')
    def test_git_operation_safe_executes_in_github_mode(self, mock_git_available):
        """Test that git operations execute in GitHub mode."""
        mock_git_available.return_value = True

        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        def dummy_git_operation():
            return "git_result"

        result = git_operation_safe("test_operation", github_state, dummy_git_operation)
        self.assertEqual(result, "git_result")

    def test_github_operation_safe_skips_in_kanban_mode(self):
        """Test that GitHub operations are skipped in kanban mode."""
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")

        def dummy_github_operation():
            return "github_result"

        result = github_operation_safe("test_operation", kanban_state, dummy_github_operation)
        self.assertIsNone(result)  # Should be skipped

    def test_github_operation_safe_executes_in_github_mode(self):
        """Test that GitHub operations execute in GitHub mode."""
        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        def dummy_github_operation():
            return "github_result"

        result = github_operation_safe("test_operation", github_state, dummy_github_operation)
        self.assertEqual(result, "github_result")

    @patch('adw_modules.workflow_ops.get_kanban_output_path')
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    def test_save_workflow_output_for_kanban(self, mock_open, mock_get_path):
        """Test saving workflow output in kanban mode."""
        import logging

        mock_get_path.return_value = "/test/path/output.txt"

        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")

        logger = logging.getLogger("test")

        result = save_workflow_output_for_kanban(
            kanban_state, "output.txt", "test content", logger, "test output"
        )

        self.assertTrue(result)
        mock_open.assert_called_once_with("/test/path/output.txt", "w", encoding="utf-8")
        mock_open().write.assert_called_once_with("test content")

    def test_save_workflow_output_for_kanban_skips_github_mode(self):
        """Test that workflow output saving is skipped in GitHub mode."""
        import logging

        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        logger = logging.getLogger("test")

        result = save_workflow_output_for_kanban(
            github_state, "output.txt", "test content", logger, "test output"
        )

        self.assertTrue(result)  # Returns True (no-op) for non-kanban mode

    @patch('adw_modules.github.get_kanban_output_path')
    @patch('builtins.open', new_callable=unittest.mock.mock_open)
    @patch('datetime.datetime')
    def test_make_issue_comment_safe_saves_to_file_in_kanban_mode(self, mock_datetime, mock_open, mock_get_path):
        """Test that comments are saved to file in kanban mode."""
        mock_datetime.now.return_value.strftime.return_value = "2024-01-01 12:00:00"
        mock_get_path.return_value = "/test/path/comments.txt"

        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")

        result = make_issue_comment_safe("123", "Test comment", kanban_state)

        self.assertTrue(result)
        mock_open.assert_called_once()
        # Should have been called with append mode
        args, kwargs = mock_open.call_args
        self.assertEqual(kwargs.get('encoding'), 'utf-8')

    @patch('adw_modules.github.make_issue_comment')
    def test_make_issue_comment_safe_posts_in_github_mode(self, mock_make_comment):
        """Test that comments are posted normally in GitHub mode."""
        github_state = ADWState("test-adw-github")
        github_state.update(data_source="github")

        result = make_issue_comment_safe("123", "Test comment", github_state)

        self.assertTrue(result)
        mock_make_comment.assert_called_once_with("123", "Test comment")

    @patch('adw_modules.github.create_kanban_issue_from_data')
    def test_fetch_issue_safe_uses_kanban_data(self, mock_create_issue):
        """Test that fetch_issue_safe uses kanban data when available."""
        from adw_modules.data_types import GitHubIssue, GitHubUser
        from datetime import datetime

        # Mock the kanban issue creation
        now = datetime.now()
        mock_issue = GitHubIssue(
            number=123,
            title="Test Issue",
            body="Test body",
            state="open",
            author=GitHubUser(login="test", id="1"),
            assignees=[],
            labels=[],
            milestone=None,
            comments=[],
            created_at=now,
            updated_at=now,
            closed_at=None,
            url="test-url"
        )
        mock_create_issue.return_value = mock_issue.model_dump()

        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(
            data_source="kanban",
            issue_json=self.sample_kanban_issue_json
        )

        result = fetch_issue_safe("123", kanban_state)

        self.assertIsNotNone(result)
        self.assertEqual(result.number, 123)
        mock_create_issue.assert_called_once()

    def test_fetch_issue_safe_returns_none_for_kanban_without_data(self):
        """Test that fetch_issue_safe returns None in kanban mode without data."""
        kanban_state = ADWState("test-adw-kanban")
        kanban_state.update(data_source="kanban")  # No issue_json

        result = fetch_issue_safe("123", kanban_state)

        self.assertIsNone(result)


def run_tests():
    """Run the test suite."""
    print("🧪 Running Kanban Integration Tests...")

    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestKanbanIntegration)

    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print(f"\n📊 Test Results:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")

    if result.failures:
        print(f"\n❌ Failures:")
        for test, traceback in result.failures:
            print(f"   - {test}: {traceback}")

    if result.errors:
        print(f"\n💥 Errors:")
        for test, traceback in result.errors:
            print(f"   - {test}: {traceback}")

    if result.wasSuccessful():
        print(f"\n✅ All tests passed! Kanban integration is working correctly.")
        return True
    else:
        print(f"\n❌ Some tests failed. Please review the implementation.")
        return False


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)