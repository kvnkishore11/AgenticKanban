"""Tests for patch initialization module."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.patch.initialization import parse_cli_arguments, initialize_patch_workflow
from utils.patch.types import PatchInitContext


class TestParseCliArguments:
    """Tests for parse_cli_arguments function."""

    def test_parse_with_issue_number_only(self):
        """Test parsing with just issue number."""
        args = ["adw_patch_iso.py", "123"]
        issue_number, adw_id = parse_cli_arguments(args)
        assert issue_number == "123"
        assert adw_id is None

    def test_parse_with_issue_number_and_adw_id(self):
        """Test parsing with issue number and ADW ID."""
        args = ["adw_patch_iso.py", "456", "abc12345"]
        issue_number, adw_id = parse_cli_arguments(args)
        assert issue_number == "456"
        assert adw_id == "abc12345"

    def test_parse_missing_issue_number_exits(self):
        """Test that missing issue number causes exit."""
        args = ["adw_patch_iso.py"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1


class TestInitializePatchWorkflow:
    """Tests for initialize_patch_workflow function."""

    @patch('utils.patch.initialization.setup_logger')
    @patch('utils.patch.initialization.ensure_adw_id')
    @patch('utils.patch.initialization.ADWState')
    @patch('utils.patch.initialization.check_env_vars')
    @patch('utils.patch.initialization.WebSocketNotifier')
    @patch('utils.patch.initialization.is_kanban_mode')
    def test_initialize_workflow_success(
        self, mock_is_kanban, mock_notifier_class, mock_check_env,
        mock_state_class, mock_ensure_adw_id, mock_setup_logger
    ):
        """Test successful workflow initialization."""
        # Setup mocks
        mock_ensure_adw_id.return_value = "test1234"
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier
        mock_is_kanban.return_value = False

        # Call function
        args = ["adw_patch_iso.py", "999"]
        ctx = initialize_patch_workflow(args, "adw_patch_iso")

        # Verify result
        assert isinstance(ctx, PatchInitContext)
        assert ctx.issue_number == "999"
        assert ctx.adw_id == "test1234"
        assert ctx.state == mock_state
        assert ctx.logger == mock_logger
        assert ctx.notifier == mock_notifier

    @patch('utils.patch.initialization.setup_logger')
    @patch('utils.patch.initialization.ensure_adw_id')
    @patch('utils.patch.initialization.ADWState')
    @patch('utils.patch.initialization.check_env_vars')
    @patch('utils.patch.initialization.WebSocketNotifier')
    @patch('utils.patch.initialization.is_kanban_mode')
    def test_initialize_workflow_kanban_mode(
        self, mock_is_kanban, mock_notifier_class, mock_check_env,
        mock_state_class, mock_ensure_adw_id, mock_setup_logger
    ):
        """Test workflow initialization in kanban mode."""
        mock_ensure_adw_id.return_value = "kanban123"
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier
        mock_is_kanban.return_value = True

        args = ["adw_patch_iso.py", "888", "kanban123"]
        ctx = initialize_patch_workflow(args, "adw_patch_iso")

        assert ctx.adw_id == "kanban123"
        mock_logger.info.assert_any_call("Operating in kanban mode")

    @patch('utils.patch.initialization.setup_logger')
    @patch('utils.patch.initialization.ensure_adw_id')
    @patch('utils.patch.initialization.ADWState')
    @patch('utils.patch.initialization.check_env_vars')
    @patch('utils.patch.initialization.WebSocketNotifier')
    @patch('utils.patch.initialization.is_kanban_mode')
    def test_initialize_workflow_sets_adw_id_in_state(
        self, mock_is_kanban, mock_notifier_class, mock_check_env,
        mock_state_class, mock_ensure_adw_id, mock_setup_logger
    ):
        """Test that ADW ID is set in state if missing."""
        mock_ensure_adw_id.return_value = "new1234"
        mock_setup_logger.return_value = Mock()

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)  # No adw_id in state
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_notifier_class.return_value = Mock()
        mock_is_kanban.return_value = False

        args = ["adw_patch_iso.py", "777"]
        initialize_patch_workflow(args, "adw_patch_iso")

        mock_state.update.assert_called_with(adw_id="new1234")
