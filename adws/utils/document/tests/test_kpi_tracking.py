"""Tests for document workflow KPI tracking."""

from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.kpi_tracking import track_kpis


class TestTrackKpis:
    """Test track_kpis function."""

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.create_commit')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_successful_kpi_tracking(
        self,
        mock_comment,
        mock_create_commit,
        mock_execute,
        mock_doc_context,
    ):
        """Test successful KPI tracking."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        mock_create_commit.return_value = ("chore: update KPIs", None)

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions
        mock_execute.assert_called_once()
        mock_create_commit.assert_called_once()
        mock_comment.assert_called()

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_kpi_tracking_failure_does_not_exit(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
    ):
        """Test that KPI tracking failure does not exit workflow."""
        # Setup mocks - KPI tracking fails
        mock_response = Mock()
        mock_response.success = False
        mock_execute.return_value = mock_response

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions - should log warning but not fail
        mock_doc_context.logger.warning.assert_called()
        # Should post warning comment
        assert any("⚠️" in str(call) for call in mock_comment.call_args_list)

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_kpi_exception_does_not_exit(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
    ):
        """Test that KPI tracking exception does not exit workflow."""
        # Setup mocks - raise exception
        mock_execute.side_effect = Exception("Template error")

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions - should log warning but not fail
        mock_doc_context.logger.warning.assert_called()

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.create_commit')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_commit_creation_error_does_not_exit(
        self,
        mock_comment,
        mock_create_commit,
        mock_execute,
        mock_doc_context,
    ):
        """Test that commit creation error does not exit workflow."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        # Commit creation fails
        mock_create_commit.return_value = (None, "Commit error")

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions - should log warning but not fail
        mock_doc_context.logger.warning.assert_called()

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.create_commit')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_commit_exception_does_not_exit(
        self,
        mock_comment,
        mock_create_commit,
        mock_execute,
        mock_doc_context,
    ):
        """Test that commit exception does not exit workflow."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_execute.return_value = mock_response

        # Commit raises exception
        mock_create_commit.side_effect = Exception("Git error")

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions - should log warning but not fail
        mock_doc_context.logger.warning.assert_called()

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_top_level_exception_does_not_exit(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
    ):
        """Test that top-level exception does not exit workflow."""
        # Setup mocks - raise exception at top level
        mock_execute.side_effect = Exception("Unexpected error")

        # Execute - should not raise
        track_kpis(mock_doc_context)

        # Assertions - should log warning but not fail
        mock_doc_context.logger.warning.assert_called()

    @patch('utils.document.kpi_tracking.execute_template')
    @patch('utils.document.kpi_tracking.make_issue_comment')
    def test_uses_correct_worktree_path(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
    ):
        """Test that KPI tracking uses correct worktree path."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = False
        mock_execute.return_value = mock_response

        # Execute
        track_kpis(mock_doc_context)

        # Assertions
        call_args = mock_execute.call_args
        request = call_args[0][0]
        assert request.working_dir == mock_doc_context.worktree_path
