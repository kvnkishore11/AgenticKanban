"""Tests for document workflow spec validation."""

import pytest
from unittest.mock import patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.spec import find_and_validate_spec
from utils.document.types import DocumentSpecContext


class TestFindAndValidateSpec:
    """Test find_and_validate_spec function."""

    @patch('utils.document.spec.find_spec_file')
    @patch('utils.document.spec.make_issue_comment')
    def test_spec_file_found(self, mock_comment, mock_find_spec, mock_doc_context):
        """Test when spec file is found."""
        # Setup mock
        mock_find_spec.return_value = "specs/test_feature.json"

        # Execute
        result = find_and_validate_spec(mock_doc_context)

        # Assertions
        assert isinstance(result, DocumentSpecContext)
        assert result.spec_file == "specs/test_feature.json"
        assert result.has_changes is True

        mock_find_spec.assert_called_once_with(
            mock_doc_context.state,
            mock_doc_context.logger
        )
        mock_doc_context.logger.info.assert_called()
        mock_comment.assert_called()

    @patch('utils.document.spec.find_spec_file')
    @patch('utils.document.spec.make_issue_comment')
    def test_spec_file_not_found_exits(self, mock_comment, mock_find_spec, mock_doc_context):
        """Test that missing spec file causes exit."""
        # Setup mock
        mock_find_spec.return_value = None

        # Execute
        with pytest.raises(SystemExit) as exc_info:
            find_and_validate_spec(mock_doc_context)

        assert exc_info.value.code == 1
        mock_doc_context.logger.error.assert_called()
        # Should post error comment
        assert any("❌" in str(call) for call in mock_comment.call_args_list)

    @patch('utils.document.spec.find_spec_file')
    @patch('utils.document.spec.make_issue_comment')
    def test_logs_spec_file_path(self, mock_comment, mock_find_spec, mock_doc_context):
        """Test that spec file path is logged."""
        # Setup mock
        spec_path = "specs/feature_123.json"
        mock_find_spec.return_value = spec_path

        # Execute
        find_and_validate_spec(mock_doc_context)

        # Assertions
        mock_doc_context.logger.info.assert_any_call(f"Found spec file: {spec_path}")

    @patch('utils.document.spec.find_spec_file')
    @patch('utils.document.spec.make_issue_comment')
    def test_posts_spec_file_to_issue(self, mock_comment, mock_find_spec, mock_doc_context):
        """Test that spec file is posted to issue."""
        # Setup mock
        spec_path = "specs/feature_123.json"
        mock_find_spec.return_value = spec_path

        # Execute
        find_and_validate_spec(mock_doc_context)

        # Assertions
        # Check that spec file was posted to issue
        assert mock_comment.called
        call_args = mock_comment.call_args_list
        assert any(spec_path in str(call) for call in call_args)
