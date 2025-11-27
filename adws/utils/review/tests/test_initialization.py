"""Tests for review initialization module."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.review.initialization import (
    parse_cli_arguments,
    initialize_review_workflow,
    find_and_validate_spec
)
from utils.review.types import ReviewInitContext, ReviewSpecContext


class TestParseCliArguments:
    """Tests for parse_cli_arguments function."""

    def test_parse_with_required_args(self):
        """Test parsing with issue number and ADW ID."""
        args = ["adw_review_iso.py", "888", "review1234"]
        issue_number, adw_id, skip_resolution = parse_cli_arguments(args)
        assert issue_number == "888"
        assert adw_id == "review1234"
        assert skip_resolution is False

    def test_parse_with_skip_resolution_flag(self):
        """Test parsing with --skip-resolution flag."""
        args = ["adw_review_iso.py", "888", "review1234", "--skip-resolution"]
        issue_number, adw_id, skip_resolution = parse_cli_arguments(args)
        assert issue_number == "888"
        assert adw_id == "review1234"
        assert skip_resolution is True

    def test_parse_with_skip_resolution_flag_in_middle(self):
        """Test parsing with --skip-resolution flag in middle."""
        args = ["adw_review_iso.py", "888", "--skip-resolution", "review1234"]
        issue_number, adw_id, skip_resolution = parse_cli_arguments(args)
        assert issue_number == "888"
        assert adw_id == "review1234"
        assert skip_resolution is True

    def test_parse_missing_args_exits(self):
        """Test that missing required args causes exit."""
        args = ["adw_review_iso.py", "888"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1

    def test_parse_no_args_exits(self):
        """Test that no args causes exit."""
        args = ["adw_review_iso.py"]
        with pytest.raises(SystemExit) as exc_info:
            parse_cli_arguments(args)
        assert exc_info.value.code == 1


class TestInitializeReviewWorkflow:
    """Tests for initialize_review_workflow function."""

    @patch('utils.review.initialization.setup_logger')
    @patch('utils.review.initialization.ADWState')
    @patch('utils.review.initialization.check_env_vars')
    @patch('utils.review.initialization.validate_worktree')
    @patch('utils.review.initialization.make_issue_comment')
    def test_initialize_workflow_success(
        self, mock_comment, mock_validate, mock_check_env,
        mock_state_class, mock_setup_logger
    ):
        """Test successful workflow initialization."""
        # Setup mocks
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "issue_number": "888",
            "worktree_path": "/tmp/trees/review1234",
            "websocket_port": "9100",
            "frontend_port": "9200"
        }.get(key, default))
        mock_state.data = {"issue_number": "888"}
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (True, None)

        # Call function
        args = ["adw_review_iso.py", "888", "review1234"]
        ctx = initialize_review_workflow(args, "adw_review_iso")

        # Verify result
        assert isinstance(ctx, ReviewInitContext)
        assert ctx.issue_number == "888"
        assert ctx.adw_id == "review1234"
        assert ctx.state == mock_state
        assert ctx.logger == mock_logger
        assert ctx.skip_resolution is False

    @patch('utils.review.initialization.setup_logger')
    @patch('utils.review.initialization.ADWState')
    @patch('utils.review.initialization.check_env_vars')
    @patch('utils.review.initialization.validate_worktree')
    @patch('utils.review.initialization.make_issue_comment')
    def test_initialize_workflow_with_skip_resolution(
        self, mock_comment, mock_validate, mock_check_env,
        mock_state_class, mock_setup_logger
    ):
        """Test workflow initialization with skip resolution flag."""
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(side_effect=lambda key, default=None: {
            "issue_number": "888",
            "worktree_path": "/tmp/trees/review1234"
        }.get(key, default))
        mock_state.data = {"issue_number": "888"}
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (True, None)

        args = ["adw_review_iso.py", "888", "review1234", "--skip-resolution"]
        ctx = initialize_review_workflow(args, "adw_review_iso")

        assert ctx.skip_resolution is True

    @patch('utils.review.initialization.setup_logger')
    @patch('utils.review.initialization.ADWState')
    def test_initialize_workflow_no_state_exits(
        self, mock_state_class, mock_setup_logger
    ):
        """Test that missing state causes exit."""
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger
        mock_state_class.load.return_value = None

        args = ["adw_review_iso.py", "888", "review1234"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_review_workflow(args, "adw_review_iso")
        assert exc_info.value.code == 1

    @patch('utils.review.initialization.setup_logger')
    @patch('utils.review.initialization.ADWState')
    @patch('utils.review.initialization.check_env_vars')
    @patch('utils.review.initialization.validate_worktree')
    @patch('utils.review.initialization.make_issue_comment')
    def test_initialize_workflow_invalid_worktree_exits(
        self, mock_comment, mock_validate, mock_check_env,
        mock_state_class, mock_setup_logger
    ):
        """Test that invalid worktree causes exit."""
        mock_logger = Mock()
        mock_setup_logger.return_value = mock_logger

        mock_state = Mock()
        mock_state.get = Mock(return_value="888")
        mock_state.data = {"issue_number": "888"}
        mock_state.append_adw_id = Mock()
        mock_state_class.load.return_value = mock_state

        mock_validate.return_value = (False, "Worktree not found")

        args = ["adw_review_iso.py", "888", "review1234"]
        with pytest.raises(SystemExit) as exc_info:
            initialize_review_workflow(args, "adw_review_iso")
        assert exc_info.value.code == 1


class TestFindAndValidateSpec:
    """Tests for find_and_validate_spec function."""

    @patch('utils.review.initialization.find_spec_file')
    @patch('utils.review.initialization.make_issue_comment')
    def test_find_spec_success(self, mock_comment, mock_find_spec, mock_logger, mock_state):
        """Test successful spec file finding."""
        mock_find_spec.return_value = "/tmp/specs/spec_888.md"
        mock_state.get.return_value = "/tmp/trees/review1234"

        ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        spec_ctx = find_and_validate_spec(ctx)

        assert isinstance(spec_ctx, ReviewSpecContext)
        assert spec_ctx.spec_file == "/tmp/specs/spec_888.md"
        assert spec_ctx.worktree_path == "/tmp/trees/review1234"

    @patch('utils.review.initialization.find_spec_file')
    @patch('utils.review.initialization.make_issue_comment')
    def test_find_spec_not_found_exits(self, mock_comment, mock_find_spec, mock_logger, mock_state):
        """Test that missing spec file causes exit."""
        mock_find_spec.return_value = None

        ctx = ReviewInitContext(
            issue_number="888",
            adw_id="review1234",
            state=mock_state,
            logger=mock_logger,
            skip_resolution=False
        )

        with pytest.raises(SystemExit) as exc_info:
            find_and_validate_spec(ctx)
        assert exc_info.value.code == 1
