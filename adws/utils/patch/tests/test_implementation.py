"""Tests for patch implementation module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.implementation import implement_patch
from utils.patch.types import PatchResultContext


class TestImplementPatch:
    """Tests for implement_patch function."""

    @patch('utils.patch.implementation.create_and_implement_patch')
    @patch('utils.patch.implementation.get_next_patch_number')
    @patch('utils.patch.implementation.is_kanban_mode')
    @patch('utils.patch.implementation.make_issue_comment')
    @patch('utils.patch.implementation.format_issue_message')
    def test_implement_patch_success(
        self, mock_format, mock_comment, mock_is_kanban,
        mock_patch_num, mock_create_impl,
        mock_logger, mock_notifier, mock_state
    ):
        """Test successful patch implementation."""
        mock_response = Mock()
        mock_response.success = True
        mock_response.output = "Success"

        mock_create_impl.return_value = ("patch.md", mock_response)
        mock_patch_num.return_value = 1
        mock_is_kanban.return_value = False
        mock_format.return_value = "formatted"

        result = implement_patch(
            "Fix the bug", "GitHub comment", "/path/to/worktree",
            "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchResultContext)
        assert result.patch_file == "patch.md"
        assert result.patch_number == 1
        assert result.success is True

    @patch('utils.patch.implementation.create_and_implement_patch')
    @patch('utils.patch.implementation.make_issue_comment')
    @patch('utils.patch.implementation.format_issue_message')
    def test_implement_patch_plan_creation_fails(
        self, mock_format, mock_comment, mock_create_impl,
        mock_logger, mock_notifier, mock_state
    ):
        """Test that plan creation failure causes exit."""
        mock_create_impl.return_value = (None, Mock())
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            implement_patch(
                "Fix the bug", "GitHub comment", "/path/to/worktree",
                "999", "test1234", mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1

    @patch('utils.patch.implementation.create_and_implement_patch')
    @patch('utils.patch.implementation.get_next_patch_number')
    @patch('utils.patch.implementation.is_kanban_mode')
    @patch('utils.patch.implementation.make_issue_comment')
    @patch('utils.patch.implementation.format_issue_message')
    def test_implement_patch_implementation_fails(
        self, mock_format, mock_comment, mock_is_kanban,
        mock_patch_num, mock_create_impl,
        mock_logger, mock_notifier, mock_state
    ):
        """Test that implementation failure causes exit."""
        mock_response = Mock()
        mock_response.success = False
        mock_response.output = "Error occurred"

        mock_create_impl.return_value = ("patch.md", mock_response)
        mock_patch_num.return_value = 1
        mock_is_kanban.return_value = False
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            implement_patch(
                "Fix the bug", "GitHub comment", "/path/to/worktree",
                "999", "test1234", mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1

    @patch('utils.patch.implementation.create_and_implement_patch')
    @patch('utils.patch.implementation.get_next_patch_number')
    @patch('utils.patch.implementation.is_kanban_mode')
    @patch('utils.patch.implementation.get_patch_reason_from_kanban')
    @patch('utils.patch.implementation.make_issue_comment')
    @patch('utils.patch.implementation.format_issue_message')
    def test_implement_patch_kanban_reason(
        self, mock_format, mock_comment, mock_get_reason,
        mock_is_kanban, mock_patch_num, mock_create_impl,
        mock_logger, mock_notifier
    ):
        """Test patch reason from kanban mode."""
        mock_state = Mock()
        mock_state.data = {"issue_json": {"description": "Fix bug"}}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_response = Mock()
        mock_response.success = True

        mock_create_impl.return_value = ("patch.md", mock_response)
        mock_patch_num.return_value = 2
        mock_is_kanban.return_value = True
        mock_get_reason.return_value = "Kanban task: Fix bug"
        mock_format.return_value = "formatted"

        result = implement_patch(
            "Fix the bug", "kanban task", "/path/to/worktree",
            "888", "kanban123", mock_state, mock_notifier, mock_logger
        )

        assert result.patch_reason == "Kanban task: Fix bug"
