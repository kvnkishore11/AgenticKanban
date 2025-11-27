"""Tests for document workflow generation."""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.generation import generate_documentation
from utils.document.types import DocumentResultContext


class TestGenerateDocumentation:
    """Test generate_documentation function."""

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    @patch('os.path.exists')
    def test_successful_documentation_generation(
        self,
        mock_exists,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test successful documentation generation."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "app_docs/feature_999.md"
        mock_execute.return_value = mock_response
        mock_exists.return_value = True

        # Execute
        result = generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        assert isinstance(result, DocumentResultContext)
        assert result.success is True
        assert result.documentation_created is True
        assert result.documentation_path == "app_docs/feature_999.md"
        assert result.error_message is None

        mock_execute.assert_called_once()
        mock_comment.assert_called()

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    def test_documentation_generation_failure_exits(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test that generation failure causes exit."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Error: template failed"
        mock_execute.return_value = mock_response

        # Execute
        with pytest.raises(SystemExit) as exc_info:
            generate_documentation(mock_doc_context, mock_spec_context)

        assert exc_info.value.code == 1
        mock_doc_context.logger.error.assert_called()
        # Should post error comment
        assert any("❌" in str(call) for call in mock_comment.call_args_list)

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    def test_no_documentation_needed(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test when agent determines no documentation is needed."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "No documentation needed"
        mock_execute.return_value = mock_response

        # Execute
        result = generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        assert result.success is True
        assert result.documentation_created is False
        assert result.documentation_path is None
        assert result.error_message is None

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    @patch('os.path.exists')
    def test_documentation_file_not_found(
        self,
        mock_exists,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test when agent reports file but it doesn't exist."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "app_docs/feature_999.md"
        mock_execute.return_value = mock_response
        mock_exists.return_value = False

        # Execute
        result = generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        assert result.success is True
        assert result.documentation_created is False
        assert result.documentation_path is None
        assert "not found" in result.error_message

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    def test_agent_request_includes_spec_file(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test that agent request includes the spec file."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "No documentation needed"
        mock_execute.return_value = mock_response

        # Execute
        generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        call_args = mock_execute.call_args
        request = call_args[0][0]
        assert mock_spec_context.spec_file in request.args

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    def test_agent_request_uses_worktree_path(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test that agent request uses the correct worktree path."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "No documentation needed"
        mock_execute.return_value = mock_response

        # Execute
        generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        call_args = mock_execute.call_args
        request = call_args[0][0]
        assert request.working_dir == mock_doc_context.worktree_path

    @patch('utils.document.generation.execute_template')
    @patch('utils.document.generation.make_issue_comment')
    def test_empty_output_treated_as_no_documentation(
        self,
        mock_comment,
        mock_execute,
        mock_doc_context,
        mock_spec_context,
    ):
        """Test that empty output is treated as no documentation needed."""
        # Setup mocks
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = ""
        mock_execute.return_value = mock_response

        # Execute
        result = generate_documentation(mock_doc_context, mock_spec_context)

        # Assertions
        assert result.documentation_created is False
        assert result.documentation_path is None
