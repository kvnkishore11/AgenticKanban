"""Tests for clarification context passing to planner."""

import pytest
from unittest.mock import Mock, patch
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestClarificationContextPassing:
    """Tests for passing clarification context to the planner."""

    @patch('adw_modules.workflow_ops.execute_template')
    def test_clarification_context_passed_with_camelcase_key(self, mock_execute):
        """Should pass clarification context when state uses clarificationHistory (camelCase)."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Test feature",
            body="Test body",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        # State with clarification data nested in issue_json.metadata (from frontend via kanban)
        state = {
            "issue_json": {
                "metadata": {
                    "clarification_status": "approved",
                    "clarificationHistory": [
                        {
                            "status": "awaiting_approval",
                            "result": {
                                "understanding": "Got it! You want me to implement a test feature.",
                                "confidence": "high",
                                "questions": []
                            }
                        }
                    ]
                }
            }
        }

        mock_logger = Mock()

        # Execute
        build_plan(issue, "/feature", "test1234", mock_logger, state=state)

        # Verify clarification context was passed as 4th argument
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 4  # issue_number, adw_id, issue_json, clarification_context
        clarification_arg = json.loads(call_args.args[3])
        assert clarification_arg.get("understanding") == "Got it! You want me to implement a test feature."
        assert clarification_arg.get("confidence") == "high"

    @patch('adw_modules.workflow_ops.execute_template')
    def test_clarification_context_passed_with_snake_case_key(self, mock_execute):
        """Should pass clarification context when state uses clarification_history (snake_case)."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Test feature",
            body="Test body",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        # State with snake_case keys in metadata (Python convention)
        state = {
            "issue_json": {
                "metadata": {
                    "clarification_status": "approved",
                    "clarification_history": [
                        {
                            "status": "awaiting_approval",
                            "result": {
                                "understanding": "Got it! You want a test feature.",
                                "confidence": "high",
                                "questions": []
                            }
                        }
                    ]
                }
            }
        }

        mock_logger = Mock()

        # Execute
        build_plan(issue, "/feature", "test1234", mock_logger, state=state)

        # Verify clarification context was passed as 4th argument
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 4
        clarification_arg = json.loads(call_args.args[3])
        assert clarification_arg.get("understanding") == "Got it! You want a test feature."

    @patch('adw_modules.workflow_ops.execute_template')
    def test_no_clarification_context_when_not_approved(self, mock_execute):
        """Should not pass clarification context when status is not approved."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Test feature",
            body="Test body",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        # State with pending clarification (not approved in metadata)
        state = {
            "issue_json": {
                "metadata": {
                    "clarification_status": "pending",  # Not approved
                    "clarificationHistory": [
                        {
                            "status": "awaiting_approval",
                            "result": {
                                "understanding": "Test understanding",
                                "confidence": "high",
                                "questions": []
                            }
                        }
                    ]
                }
            }
        }

        mock_logger = Mock()

        # Execute
        build_plan(issue, "/feature", "test1234", mock_logger, state=state)

        # Verify clarification context was NOT passed (only 3 args)
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 3  # issue_number, adw_id, issue_json

    @patch('adw_modules.workflow_ops.execute_template')
    def test_no_clarification_context_when_empty_history(self, mock_execute):
        """Should not pass clarification context when history is empty."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Test feature",
            body="Test body",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        # State with empty clarification history in metadata
        state = {
            "issue_json": {
                "metadata": {
                    "clarificationHistory": []
                }
            }
        }

        mock_logger = Mock()

        # Execute
        build_plan(issue, "/feature", "test1234", mock_logger, state=state)

        # Verify clarification context was NOT passed (only 3 args)
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 3

    @patch('adw_modules.workflow_ops.execute_template')
    def test_no_clarification_context_when_no_state(self, mock_execute):
        """Should not pass clarification context when state is None."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Test feature",
            body="Test body",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        mock_logger = Mock()

        # Execute without state
        build_plan(issue, "/feature", "test1234", mock_logger, state=None)

        # Verify clarification context was NOT passed (only 3 args)
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 3

    @patch('adw_modules.workflow_ops.execute_template')
    def test_clarification_context_with_questions(self, mock_execute):
        """Should pass clarification context including questions."""
        from adw_modules.workflow_ops import build_plan
        from adw_modules.data_types import GitHubIssue, GitHubUser

        # Setup mock
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "specs/issue-5-plan.md"
        mock_execute.return_value = mock_response

        # Create test issue
        mock_user = GitHubUser(login="testuser")
        issue = GitHubIssue(
            number=5,
            title="Fix performance issues",
            body="The app is slow",
            state="open",
            author=mock_user,
            assignees=[],
            labels=[],
            comments=[],
            createdAt="2024-01-01T00:00:00Z",
            updatedAt="2024-01-01T00:00:00Z",
            url="https://github.com/test/test/issues/5"
        )

        # State with clarification with questions
        state = {
            "issue_json": {
                "metadata": {
                    "clarification_status": "approved",
                    "clarificationHistory": [
                        {
                            "status": "awaiting_approval",
                            "result": {
                                "understanding": "I understand you're experiencing performance issues.",
                                "confidence": "medium",
                                "questions": ["Is the slowness in the UI or API?", "When did this start?"]
                            }
                        }
                    ]
                }
            }
        }

        mock_logger = Mock()

        # Execute
        build_plan(issue, "/feature", "test1234", mock_logger, state=state)

        # Verify clarification context was passed
        call_args = mock_execute.call_args[0][0]
        assert len(call_args.args) == 4
        clarification_arg = json.loads(call_args.args[3])
        assert clarification_arg.get("confidence") == "medium"
        assert len(clarification_arg.get("questions", [])) == 2
