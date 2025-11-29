"""Tests for initialization module."""

import pytest
from unittest.mock import Mock, patch
import sys

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestParseCliArguments:
    """Tests for parse_cli_arguments function."""

    def test_parse_with_issue_number_only(self):
        """Should parse issue number when only that is provided."""
        from utils.plan.initialization import parse_cli_arguments

        args = ["adw_plan_iso.py", "123"]
        issue_number, adw_id = parse_cli_arguments(args)

        assert issue_number == "123"
        assert adw_id is None

    def test_parse_with_issue_and_adw_id(self):
        """Should parse both issue number and ADW ID."""
        from utils.plan.initialization import parse_cli_arguments

        args = ["adw_plan_iso.py", "456", "abc12345"]
        issue_number, adw_id = parse_cli_arguments(args)

        assert issue_number == "456"
        assert adw_id == "abc12345"

    def test_parse_exits_on_missing_args(self):
        """Should exit when required arguments are missing."""
        from utils.plan.initialization import parse_cli_arguments

        args = ["adw_plan_iso.py"]  # Missing issue number

        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)

        assert exc_info.value.code == 1


class TestInitializeWorkflow:
    """Tests for initialize_workflow function."""

    @patch('utils.plan.initialization.ensure_adw_id')
    @patch('utils.plan.initialization.setup_logger')
    @patch('utils.plan.initialization.ADWState')
    @patch('utils.plan.initialization.WebSocketNotifier')
    @patch('utils.plan.initialization.log_mode_status')
    def test_initialize_creates_context(
        self, mock_log_mode, mock_notifier_class, mock_state_class,
        mock_setup_logger, mock_ensure_adw_id
    ):
        """Should create InitContext with all required components."""
        from utils.plan.initialization import initialize_workflow
        from utils.plan.types import InitContext

        # Setup mocks
        mock_ensure_adw_id.return_value = "test1234"
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load = Mock(return_value=mock_state)

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier

        # Execute
        args = ["adw_plan_iso.py", "999"]
        ctx = initialize_workflow(args, "adw_plan_iso")

        # Assert
        assert isinstance(ctx, InitContext)
        assert ctx.issue_number == "999"
        assert ctx.adw_id == "test1234"
        assert ctx.state == mock_state
        assert ctx.logger == mock_logger
        assert ctx.notifier == mock_notifier

        # Verify notifier was started
        mock_notifier.notify_start.assert_called_once()

    @patch('utils.plan.initialization.ensure_adw_id')
    @patch('utils.plan.initialization.setup_logger')
    @patch('utils.plan.initialization.ADWState')
    @patch('utils.plan.initialization.WebSocketNotifier')
    @patch('utils.plan.initialization.log_mode_status')
    def test_initialize_tracks_workflow(
        self, mock_log_mode, mock_notifier_class, mock_state_class,
        mock_setup_logger, mock_ensure_adw_id
    ):
        """Should track workflow in state.append_adw_id."""
        from utils.plan.initialization import initialize_workflow

        # Setup mocks
        mock_ensure_adw_id.return_value = "test1234"
        mock_setup_logger.return_value = Mock()

        mock_state = Mock()
        mock_state.get = Mock(return_value=None)
        mock_state.update = Mock()
        mock_state.append_adw_id = Mock()
        mock_state_class.load = Mock(return_value=mock_state)

        mock_notifier_class.return_value = Mock()

        # Execute
        args = ["adw_plan_iso.py", "999"]
        initialize_workflow(args, "adw_plan_iso")

        # Assert workflow was tracked
        mock_state.append_adw_id.assert_called_once_with("adw_plan_iso")
