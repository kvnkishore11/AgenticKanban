"""Tests for patch content extraction module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.content import extract_patch_content
from utils.patch.types import PatchContentContext


class TestExtractPatchContent:
    """Tests for extract_patch_content function."""

    @patch('utils.patch.content.is_kanban_mode')
    @patch('utils.patch.content.get_patch_content')
    @patch('utils.patch.content.make_issue_comment')
    @patch('utils.patch.content.format_issue_message')
    def test_extract_github_mode(
        self, mock_format, mock_comment, mock_get_content, mock_is_kanban,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test extracting patch content in GitHub mode."""
        mock_is_kanban.return_value = False
        mock_get_content.return_value = ("Fix the button", "GitHub comment", None)
        mock_format.return_value = "formatted"

        result = extract_patch_content(
            mock_issue, "999", "test1234",
            mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchContentContext)
        assert result.patch_content == "Fix the button"
        assert result.source_description == "GitHub comment"
        assert result.is_kanban_mode is False

    @patch('utils.patch.content.is_kanban_mode')
    @patch('utils.patch.content.get_patch_content')
    @patch('utils.patch.content.make_issue_comment')
    @patch('utils.patch.content.format_issue_message')
    def test_extract_kanban_mode(
        self, mock_format, mock_comment, mock_get_content, mock_is_kanban,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test extracting patch content in kanban mode."""
        mock_is_kanban.return_value = True
        mock_get_content.return_value = ("Update styles", "kanban task", None)
        mock_format.return_value = "formatted"

        result = extract_patch_content(
            mock_issue, "888", "kanban123",
            mock_state, mock_notifier, mock_logger
        )

        assert result.is_kanban_mode is True
        assert result.source_description == "kanban task"
        mock_logger.info.assert_any_call("Extracting patch content from kanban task data")

    @patch('utils.patch.content.is_kanban_mode')
    @patch('utils.patch.content.get_patch_content')
    @patch('utils.patch.content.make_issue_comment')
    @patch('utils.patch.content.format_issue_message')
    def test_extract_error_exits(
        self, mock_format, mock_comment, mock_get_content, mock_is_kanban,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that extraction error causes exit."""
        mock_is_kanban.return_value = False
        mock_get_content.return_value = (None, None, "No patch content found")
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            extract_patch_content(
                mock_issue, "999", "test1234",
                mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1
        mock_notifier.notify_log.assert_called()

    @patch('utils.patch.content.is_kanban_mode')
    @patch('utils.patch.content.get_patch_content')
    @patch('utils.patch.content.make_issue_comment')
    @patch('utils.patch.content.format_issue_message')
    def test_logs_extraction_source(
        self, mock_format, mock_comment, mock_get_content, mock_is_kanban,
        mock_logger, mock_notifier, mock_state, mock_issue
    ):
        """Test that extraction source is logged."""
        mock_is_kanban.return_value = False
        mock_get_content.return_value = ("content", "issue body", None)
        mock_format.return_value = "formatted"

        extract_patch_content(
            mock_issue, "999", "test1234",
            mock_state, mock_notifier, mock_logger
        )

        mock_logger.info.assert_any_call("Patch content extracted from: issue body")
