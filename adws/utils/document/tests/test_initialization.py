"""Tests for document workflow initialization."""

import pytest
import sys
from unittest.mock import Mock, patch, MagicMock

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.document.initialization import parse_cli_arguments, initialize_document_workflow
from utils.document.types import DocumentInitContext


class TestParseCliArguments:
    """Test parse_cli_arguments function."""

    def test_parse_with_all_args(self):
        """Test parsing with all required arguments."""
        args = ["script.py", "123", "adw123"]
        issue_number, adw_id = parse_cli_arguments(args)

        assert issue_number == "123"
        assert adw_id == "adw123"

    def test_parse_missing_args_exits(self):
        """Test that missing arguments causes exit."""
        args = ["script.py", "123"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1

    def test_parse_no_args_exits(self):
        """Test that no arguments causes exit."""
        args = ["script.py"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1


class TestInitializeDocumentWorkflow:
    """Test initialize_document_workflow function."""

    @patch('utils.document.initialization.setup_logger')
    @patch('utils.document.initialization.ADWState')
    @patch('utils.document.initialization.check_env_vars')
    @patch('utils.document.initialization.validate_worktree')
    @patch('utils.document.initialization.WebSocketNotifier')
    @patch('utils.document.initialization.make_issue_comment')
    def test_successful_initialization(
        self,
        mock_comment,
        mock_notifier_class,
        mock_validate,
        mock_check_env,
        mock_state_class,
        mock_logger,
    ):
        """Test successful workflow initialization."""
        # Setup mocks
        mock_state = Mock()
        mock_state.data = {"issue_number": "999", "worktree_path": "/tmp/test"}
        mock_state.get.side_effect = lambda key, default=None: mock_state.data.get(key, default)
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (True, None)

        mock_notifier = Mock()
        mock_notifier_class.return_value = mock_notifier

        logger = Mock()
        mock_logger.return_value = logger

        # Execute
        args = ["script.py", "123", "adw123"]
        ctx = initialize_document_workflow(args, "test_workflow")

        # Assertions
        assert isinstance(ctx, DocumentInitContext)
        assert ctx.issue_number == "999"  # From state
        assert ctx.adw_id == "adw123"
        assert ctx.state == mock_state
        assert ctx.logger == logger
        assert ctx.notifier == mock_notifier
        assert ctx.worktree_path == "/tmp/test"

        # Verify state tracking
        mock_state.append_adw_id.assert_called_once_with("test_workflow")

        # Verify environment check
        mock_check_env.assert_called_once_with(logger)

        # Verify worktree validation
        mock_validate.assert_called_once_with("adw123", mock_state)

    @patch('utils.document.initialization.setup_logger')
    @patch('utils.document.initialization.ADWState')
    def test_initialization_no_state_exits(self, mock_state_class, mock_logger):
        """Test that missing state causes exit."""
        # Setup mocks
        mock_state_class.load.return_value = None
        logger = Mock()
        mock_logger.return_value = logger

        # Execute
        args = ["script.py", "123", "adw123"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_document_workflow(args, "test_workflow")

        assert exc_info.value.code == 1

    @patch('utils.document.initialization.setup_logger')
    @patch('utils.document.initialization.ADWState')
    @patch('utils.document.initialization.check_env_vars')
    @patch('utils.document.initialization.validate_worktree')
    @patch('utils.document.initialization.make_issue_comment')
    def test_initialization_worktree_validation_fails(
        self,
        mock_comment,
        mock_validate,
        mock_check_env,
        mock_state_class,
        mock_logger,
    ):
        """Test that worktree validation failure causes exit."""
        # Setup mocks
        mock_state = Mock()
        mock_state.data = {"issue_number": "999"}
        mock_state.get.side_effect = lambda key, default=None: mock_state.data.get(key, default)
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (False, "Worktree not found")

        logger = Mock()
        mock_logger.return_value = logger

        # Execute
        args = ["script.py", "123", "adw123"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_document_workflow(args, "test_workflow")

        assert exc_info.value.code == 1
        logger.error.assert_called()

    @patch('utils.document.initialization.setup_logger')
    @patch('utils.document.initialization.ADWState')
    @patch('utils.document.initialization.check_env_vars')
    @patch('utils.document.initialization.validate_worktree')
    @patch('utils.document.initialization.WebSocketNotifier')
    @patch('utils.document.initialization.make_issue_comment')
    def test_initialization_uses_state_issue_number(
        self,
        mock_comment,
        mock_notifier_class,
        mock_validate,
        mock_check_env,
        mock_state_class,
        mock_logger,
    ):
        """Test that issue number from state takes precedence."""
        # Setup mocks
        mock_state = Mock()
        mock_state.data = {
            "issue_number": "456",  # Different from command line
            "worktree_path": "/tmp/test",
        }
        mock_state.get.side_effect = lambda key, default=None: mock_state.data.get(key, default)
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (True, None)
        mock_notifier_class.return_value = Mock()
        mock_logger.return_value = Mock()

        # Execute
        args = ["script.py", "123", "adw123"]  # Issue 123 from CLI
        ctx = initialize_document_workflow(args, "test_workflow")

        # Assertion - should use state's issue number
        assert ctx.issue_number == "456"
