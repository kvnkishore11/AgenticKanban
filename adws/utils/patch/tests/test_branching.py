"""Tests for patch branching module."""

import pytest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.branching import resolve_branch_name
from utils.patch.types import PatchBranchContext


class TestResolveBranchName:
    """Tests for resolve_branch_name function."""

    @patch('utils.patch.branching.make_issue_comment')
    @patch('utils.patch.branching.format_issue_message')
    def test_use_branch_from_state(
        self, mock_format, mock_comment,
        mock_logger, mock_notifier, mock_issue
    ):
        """Test using branch name from state."""
        mock_state = Mock()
        mock_state.data = {"branch_name": "fix/issue-999", "issue_class": "/bug"}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.save = Mock()

        result = resolve_branch_name(
            mock_issue, "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert isinstance(result, PatchBranchContext)
        assert result.branch_name == "fix/issue-999"
        assert result.is_existing is True

    @patch('utils.patch.branching.find_existing_branch_for_issue')
    @patch('utils.patch.branching.make_issue_comment')
    @patch('utils.patch.branching.format_issue_message')
    def test_find_existing_branch(
        self, mock_format, mock_comment, mock_find_branch,
        mock_logger, mock_notifier, mock_issue
    ):
        """Test finding existing branch."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_find_branch.return_value = "feature/existing-branch"

        result = resolve_branch_name(
            mock_issue, "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert result.branch_name == "feature/existing-branch"
        assert result.is_existing is True

    @patch('utils.patch.branching.find_existing_branch_for_issue')
    @patch('utils.patch.branching.classify_issue')
    @patch('utils.patch.branching.generate_branch_name')
    @patch('utils.patch.branching.make_issue_comment')
    @patch('utils.patch.branching.format_issue_message')
    def test_generate_new_branch(
        self, mock_format, mock_comment, mock_gen_branch,
        mock_classify, mock_find_branch,
        mock_logger, mock_notifier, mock_issue
    ):
        """Test generating new branch name."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_find_branch.return_value = None
        mock_classify.return_value = ("/feature", None)
        mock_gen_branch.return_value = ("feature/new-branch", None)
        mock_format.return_value = "formatted"

        result = resolve_branch_name(
            mock_issue, "999", "test1234", mock_state, mock_notifier, mock_logger
        )

        assert result.branch_name == "feature/new-branch"
        assert result.is_existing is False
        assert result.issue_command == "/feature"

    @patch('utils.patch.branching.find_existing_branch_for_issue')
    @patch('utils.patch.branching.classify_issue')
    @patch('utils.patch.branching.make_issue_comment')
    @patch('utils.patch.branching.format_issue_message')
    def test_classification_error_exits(
        self, mock_format, mock_comment, mock_classify, mock_find_branch,
        mock_logger, mock_notifier, mock_issue
    ):
        """Test that classification error causes exit."""
        mock_state = Mock()
        mock_state.data = {}
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))

        mock_find_branch.return_value = None
        mock_classify.return_value = (None, "Classification failed")
        mock_format.return_value = "formatted"

        with pytest.raises(SystemExit) as exc_info:
            resolve_branch_name(
                mock_issue, "999", "test1234", mock_state, mock_notifier, mock_logger
            )

        assert exc_info.value.code == 1

    @patch('utils.patch.branching.find_existing_branch_for_issue')
    @patch('utils.patch.branching.make_issue_comment')
    @patch('utils.patch.branching.format_issue_message')
    def test_use_kanban_issue_class(
        self, mock_format, mock_comment, mock_find_branch,
        mock_logger, mock_notifier, mock_issue
    ):
        """Test using issue class from kanban."""
        mock_state = Mock()
        mock_state.data = {"issue_class": "/chore"}  # Provided by kanban
        mock_state.get = Mock(side_effect=lambda key, default=None: mock_state.data.get(key, default))
        mock_state.update = Mock()
        mock_state.save = Mock()

        mock_find_branch.return_value = None
        mock_format.return_value = "formatted"

        with patch('utils.patch.branching.generate_branch_name') as mock_gen:
            mock_gen.return_value = ("chore/task-999", None)

            result = resolve_branch_name(
                mock_issue, "999", "test1234", mock_state, mock_notifier, mock_logger
            )

            assert result.issue_command == "/chore"
            mock_logger.info.assert_any_call("Using kanban-provided issue type: /chore")
