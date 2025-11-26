"""Tests for build initialization module."""

import pytest
from unittest.mock import Mock, patch
import sys

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestParseCliArguments:
    """Tests for parse_cli_arguments function."""

    def test_parse_with_issue_and_adw_id(self):
        """Should parse both issue number and ADW ID."""
        from utils.build.initialization import parse_cli_arguments

        args = ["adw_build_iso.py", "456", "abc12345"]
        issue_number, adw_id = parse_cli_arguments(args)

        assert issue_number == "456"
        assert adw_id == "abc12345"

    def test_parse_exits_on_missing_adw_id(self):
        """Should exit when ADW ID is missing (required for build)."""
        from utils.build.initialization import parse_cli_arguments

        args = ["adw_build_iso.py", "123"]  # Missing adw_id

        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)

        assert exc_info.value.code == 1

    def test_parse_exits_on_no_args(self):
        """Should exit when no arguments provided."""
        from utils.build.initialization import parse_cli_arguments

        args = ["adw_build_iso.py"]

        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)

        assert exc_info.value.code == 1


class TestInitializeBuildWorkflow:
    """Tests for initialize_build_workflow function."""

    @patch('utils.build.initialization.setup_logger')
    @patch('utils.build.initialization.ADWState')
    @patch('utils.build.initialization.WebSocketNotifier')
    @patch('utils.build.initialization.make_issue_comment')
    def test_initialize_with_existing_state(
        self, mock_comment, mock_notifier_class, mock_state_class, mock_setup_logger
    ):
        """Should initialize with existing state."""
        from utils.build.initialization import initialize_build_workflow
        from utils.build.types import BuildInitContext

        # Setup mocks
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {"issue_number": "999"}.get(key, default))
        mock_state.data = {"adw_id": "test1234"}
        mock_state.append_adw_id = Mock()
        mock_state_class.load = Mock(return_value=mock_state)

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier

        # Execute
        args = ["adw_build_iso.py", "999", "test1234"]
        ctx = initialize_build_workflow(args, "adw_build_iso")

        # Assert
        assert isinstance(ctx, BuildInitContext)
        assert ctx.issue_number == "999"
        assert ctx.adw_id == "test1234"
        assert ctx.state == mock_state
        mock_state.append_adw_id.assert_called_once_with("adw_build_iso")

    @patch('utils.build.initialization.setup_logger')
    @patch('utils.build.initialization.ADWState')
    def test_exits_when_no_state_found(self, mock_state_class, mock_setup_logger):
        """Should exit when no state found for ADW ID."""
        from utils.build.initialization import initialize_build_workflow

        # Setup mocks - no state found
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger
        mock_state_class.load = Mock(return_value=None)

        # Execute and expect exit
        args = ["adw_build_iso.py", "999", "nonexistent"]

        with pytest.raises(SystemExit) as exc_info:
            initialize_build_workflow(args, "adw_build_iso")

        assert exc_info.value.code == 1
        mock_logger.error.assert_called()
