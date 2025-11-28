"""Tests for merge workflow initialization module."""

import pytest
from unittest.mock import patch, Mock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.initialization import (
    parse_cli_arguments,
    initialize_merge_workflow,
    get_main_repo_root,
)


class TestParseCLIArguments:
    """Tests for parse_cli_arguments function."""

    def test_parse_with_adw_id_only(self):
        """Test parsing with only ADW ID provided."""
        args = ["script.py", "abc12345"]
        adw_id, merge_method = parse_cli_arguments(args)
        assert adw_id == "abc12345"
        assert merge_method == "squash"  # default

    def test_parse_with_merge_method_squash(self):
        """Test parsing with squash merge method."""
        args = ["script.py", "abc12345", "squash"]
        adw_id, merge_method = parse_cli_arguments(args)
        assert adw_id == "abc12345"
        assert merge_method == "squash"

    def test_parse_with_merge_method_merge(self):
        """Test parsing with merge method."""
        args = ["script.py", "abc12345", "merge"]
        adw_id, merge_method = parse_cli_arguments(args)
        assert adw_id == "abc12345"
        assert merge_method == "merge"

    def test_parse_with_merge_method_rebase(self):
        """Test parsing with rebase method."""
        args = ["script.py", "abc12345", "rebase"]
        adw_id, merge_method = parse_cli_arguments(args)
        assert adw_id == "abc12345"
        assert merge_method == "rebase"

    def test_parse_missing_adw_id_exits(self):
        """Test that missing ADW ID causes exit."""
        args = ["script.py"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1

    def test_parse_invalid_merge_method_exits(self):
        """Test that invalid merge method causes exit."""
        args = ["script.py", "abc12345", "invalid"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1


class TestInitializeMergeWorkflow:
    """Tests for initialize_merge_workflow function."""

    @patch('utils.merge.initialization.ADWState')
    @patch('utils.merge.initialization.WebSocketNotifier')
    @patch('utils.merge.initialization.setup_logger')
    @patch('utils.merge.initialization.check_env_vars')
    def test_initialize_success(self, mock_check_env, mock_setup_logger,
                                 mock_notifier_class, mock_state_class):
        """Test successful initialization."""
        # Setup mocks
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "branch_name": "feature/test",
            "worktree_path": "/tmp/test",
            "issue_number": "123",
        }.get(key, default))
        mock_state_class.load.return_value = mock_state

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier

        args = ["script.py", "test1234", "squash"]
        ctx = initialize_merge_workflow(args, "test_workflow")

        assert ctx.adw_id == "test1234"
        assert ctx.merge_method == "squash"
        assert ctx.branch_name == "feature/test"
        assert ctx.worktree_path == "/tmp/test"
        assert ctx.issue_number == "123"
        assert ctx.state == mock_state
        assert ctx.logger == mock_logger
        assert ctx.notifier == mock_notifier

    @patch('utils.merge.initialization.ADWState')
    @patch('utils.merge.initialization.setup_logger')
    @patch('utils.merge.initialization.check_env_vars')
    def test_initialize_missing_state_exits(self, mock_check_env,
                                            mock_setup_logger, mock_state_class):
        """Test that missing state causes exit."""
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger
        mock_state_class.load.return_value = None

        args = ["script.py", "test1234"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_merge_workflow(args)
        assert exc_info.value.code == 1

    @patch('utils.merge.initialization.ADWState')
    @patch('utils.merge.initialization.setup_logger')
    @patch('utils.merge.initialization.check_env_vars')
    def test_initialize_missing_branch_exits(self, mock_check_env,
                                             mock_setup_logger, mock_state_class):
        """Test that missing branch name causes exit."""
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state_class.load.return_value = mock_state

        args = ["script.py", "test1234"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_merge_workflow(args)
        assert exc_info.value.code == 1


class TestGetMainRepoRoot:
    """Tests for get_main_repo_root function."""

    def test_returns_parent_of_adws(self):
        """Test that it returns the parent of the adws directory."""
        result = get_main_repo_root()
        assert result.endswith("AgenticKanban") or "AgenticKanban" in result
        assert not result.endswith("adws")
