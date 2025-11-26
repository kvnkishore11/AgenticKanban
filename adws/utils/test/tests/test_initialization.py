"""Tests for test initialization module."""

import pytest
from unittest.mock import Mock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestParseCliArguments:
    """Tests for parse_cli_arguments function."""

    def test_parses_basic_arguments(self):
        """Should parse issue number and adw_id."""
        from utils.test.initialization import parse_cli_arguments

        argv = ["script.py", "123", "abc12345"]
        issue_number, adw_id, skip_e2e = parse_cli_arguments(argv)

        assert issue_number == "123"
        assert adw_id == "abc12345"
        assert skip_e2e is False

    def test_parses_skip_e2e_flag(self):
        """Should detect --skip-e2e flag."""
        from utils.test.initialization import parse_cli_arguments

        argv = ["script.py", "123", "abc12345", "--skip-e2e"]
        issue_number, adw_id, skip_e2e = parse_cli_arguments(argv)

        assert issue_number == "123"
        assert adw_id == "abc12345"
        assert skip_e2e is True

    def test_exits_when_missing_arguments(self):
        """Should exit when required arguments missing."""
        from utils.test.initialization import parse_cli_arguments

        argv = ["script.py", "123"]  # Missing adw_id

        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(argv)

        assert exc_info.value.code == 1


class TestInitializeTestWorkflow:
    """Tests for initialize_test_workflow function."""

    @patch('utils.test.initialization.ADWState.load')
    @patch('utils.test.initialization.setup_logger')
    @patch('utils.test.initialization.make_issue_comment')
    @patch('utils.test.initialization.WebSocketNotifier')
    def test_initializes_workflow_with_existing_state(
        self, mock_notifier, mock_comment, mock_logger, mock_load
    ):
        """Should initialize workflow when state exists."""
        from utils.test.initialization import initialize_test_workflow
        from utils.test.types import TestInitContext

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "issue_number": "456",
            "websocket_port": "9100",
        }.get(key, default))
        mock_state.data = {"adw_id": "test1234"}
        mock_state.append_adw_id = Mock()
        mock_load.return_value = mock_state
        mock_logger.return_value = Mock()
        mock_notifier.return_value = Mock()

        argv = ["script.py", "123", "test1234"]
        ctx = initialize_test_workflow(argv, "adw_test_iso")

        assert isinstance(ctx, TestInitContext)
        assert ctx.adw_id == "test1234"
        assert ctx.issue_number == "456"  # From state
        assert ctx.skip_e2e is False
        mock_state.append_adw_id.assert_called_with("adw_test_iso")

    @patch('utils.test.initialization.ADWState.load')
    @patch('utils.test.initialization.setup_logger')
    def test_exits_when_no_state_found(self, mock_logger, mock_load):
        """Should exit when no state found for ADW ID."""
        from utils.test.initialization import initialize_test_workflow

        mock_load.return_value = None
        mock_logger.return_value = Mock()

        argv = ["script.py", "123", "nonexistent"]

        with pytest.raises(SystemExit) as exc_info:
            initialize_test_workflow(argv, "adw_test_iso")

        assert exc_info.value.code == 1
