"""Unit tests for terminal_ops module.

Tests the TerminalOperations class that handles WezTerm and tmux operations
for opening worktrees in a development environment. Each worktree gets its
own tmux session named after the branch.
"""

from unittest.mock import patch, MagicMock
from adw_modules.terminal_ops import (
    TerminalOperations,
    OpenWorktreeResult,
    open_worktree_in_terminal,
    open_codebase_in_terminal,
    kill_worktree_session
)


class TestTerminalOperations:
    """Test suite for TerminalOperations class."""

    def test_init_no_session_name(self):
        """Test TerminalOperations initializes without session_name param."""
        ops = TerminalOperations()
        # No session_name attribute - sessions are per-branch now
        assert hasattr(ops, 'project_root')

    def test_get_project_root(self):
        """Test project root is correctly calculated."""
        ops = TerminalOperations()
        # Project root should end with AgenticKanban
        assert ops.project_root.endswith("AgenticKanban")

    @patch("subprocess.run")
    def test_run_command_success(self, mock_run):
        """Test _run_command returns correct values on success."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="success output",
            stderr=""
        )
        ops = TerminalOperations()
        code, stdout, stderr = ops._run_command(["echo", "test"])
        assert code == 0
        assert stdout == "success output"
        assert stderr == ""

    @patch("subprocess.run")
    def test_run_command_failure(self, mock_run):
        """Test _run_command returns correct values on failure."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="error message"
        )
        ops = TerminalOperations()
        code, stdout, stderr = ops._run_command(["false"])
        assert code == 1
        assert stderr == "error message"

    def test_run_command_timeout(self):
        """Test _run_command handles timeout."""
        import subprocess
        ops = TerminalOperations()
        # Mock subprocess.run to raise TimeoutExpired
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="test", timeout=30)):
            code, stdout, stderr = ops._run_command(["sleep", "100"])
            assert code == -1
            assert stderr == "Command timed out"

    @patch("subprocess.run")
    def test_get_branch_name_success(self, mock_run):
        """Test _get_branch_name returns branch name."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="feature/add-auth",
            stderr=""
        )
        ops = TerminalOperations()
        branch = ops._get_branch_name("/tmp/worktree")
        assert branch == "feature/add-auth"

    @patch("subprocess.run")
    def test_get_branch_name_failure(self, mock_run):
        """Test _get_branch_name returns None on failure."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="not a git repo"
        )
        ops = TerminalOperations()
        branch = ops._get_branch_name("/tmp/not-a-repo")
        assert branch is None

    def test_sanitize_session_name(self):
        """Test session name sanitization."""
        ops = TerminalOperations()
        # Test slash replacement
        assert ops._sanitize_session_name("feature/add-auth") == "feature-add-auth"
        # Test period replacement
        assert ops._sanitize_session_name("v1.2.3") == "v1-2-3"
        # Test colon replacement
        assert ops._sanitize_session_name("fix:bug") == "fix-bug"
        # Test mixed
        assert ops._sanitize_session_name("feature/v1.0:fix") == "feature-v1-0-fix"

    @patch("subprocess.run")
    def test_session_exists_true(self, mock_run):
        """Test _session_exists returns True when session exists."""
        mock_run.return_value = MagicMock(returncode=0)
        ops = TerminalOperations()
        assert ops._session_exists("test-session") is True

    @patch("subprocess.run")
    def test_session_exists_false(self, mock_run):
        """Test _session_exists returns False when session doesn't exist."""
        mock_run.return_value = MagicMock(returncode=1)
        ops = TerminalOperations()
        assert ops._session_exists("nonexistent") is False

    @patch("subprocess.run")
    def test_window_exists_true(self, mock_run):
        """Test _window_exists returns True when window exists."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="logs\ncode\nother",
            stderr=""
        )
        ops = TerminalOperations()
        assert ops._window_exists("test-session", "logs") is True
        assert ops._window_exists("test-session", "code") is True

    @patch("subprocess.run")
    def test_window_exists_false(self, mock_run):
        """Test _window_exists returns False when window doesn't exist."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="logs\nother",
            stderr=""
        )
        ops = TerminalOperations()
        assert ops._window_exists("test-session", "code") is False

    @patch.object(TerminalOperations, "_run_command")
    def test_create_session_success(self, mock_run):
        """Test _create_session succeeds."""
        mock_run.return_value = (0, "", "")
        ops = TerminalOperations()
        success, err = ops._create_session("test-session", "/tmp/test", "logs")
        assert success is True
        assert err == ""

    @patch.object(TerminalOperations, "_run_command")
    def test_create_session_failure(self, mock_run):
        """Test _create_session handles failure."""
        mock_run.return_value = (1, "", "duplicate session")
        ops = TerminalOperations()
        success, err = ops._create_session("test-session", "/tmp/test", "logs")
        assert success is False
        assert "duplicate session" in err

    def test_open_worktree_invalid_path(self):
        """Test open_worktree returns error for invalid path."""
        ops = TerminalOperations()
        result = ops.open_worktree(
            adw_id="testid01",
            worktree_path="/nonexistent/path"
        )
        assert result.success is False
        assert "not found" in result.message.lower()

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_create_session")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_send_keys")
    @patch.object(TerminalOperations, "_split_horizontal")
    @patch.object(TerminalOperations, "_open_wezterm")
    @patch.object(TerminalOperations, "_open_chrome")
    @patch("os.path.isdir")
    def test_open_worktree_success(
        self,
        mock_isdir,
        mock_chrome,
        mock_wezterm,
        mock_split,
        mock_send_keys,
        mock_get_branch,
        mock_create_session,
        mock_session_exists
    ):
        """Test successful worktree opening creates session named after branch."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = False
        mock_get_branch.return_value = "feature/test-branch"
        mock_create_session.return_value = (True, "")
        mock_send_keys.return_value = (True, "")
        mock_split.return_value = (True, "")
        mock_wezterm.return_value = (True, "")
        mock_chrome.return_value = (True, "")

        ops = TerminalOperations()
        result = ops.open_worktree(
            adw_id="testid01",
            worktree_path="/tmp/test",
            frontend_port=5173
        )

        assert result.success is True
        assert result.session_name == "feature-test-branch"  # Sanitized
        assert result.window_name == "logs-testid01"  # Includes ADW ID
        assert result.branch_name == "feature/test-branch"

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_window_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_select_window")
    @patch.object(TerminalOperations, "_open_wezterm")
    @patch.object(TerminalOperations, "_open_chrome")
    @patch("os.path.isdir")
    def test_open_worktree_session_exists_with_logs(
        self,
        mock_isdir,
        mock_chrome,
        mock_wezterm,
        mock_select_window,
        mock_get_branch,
        mock_window_exists,
        mock_session_exists
    ):
        """Test open_worktree switches to existing logs window."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = True
        mock_window_exists.return_value = True  # logs window exists
        mock_get_branch.return_value = "feature/existing"
        mock_select_window.return_value = (True, "")
        mock_wezterm.return_value = (True, "")
        mock_chrome.return_value = (True, "")

        ops = TerminalOperations()
        result = ops.open_worktree(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        mock_select_window.assert_called_with("feature-existing", "logs-testid01")

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_window_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_create_window")
    @patch.object(TerminalOperations, "_send_keys")
    @patch.object(TerminalOperations, "_split_horizontal")
    @patch.object(TerminalOperations, "_open_wezterm")
    @patch.object(TerminalOperations, "_open_chrome")
    @patch("os.path.isdir")
    def test_open_worktree_session_exists_adds_logs(
        self,
        mock_isdir,
        mock_chrome,
        mock_wezterm,
        mock_split,
        mock_send_keys,
        mock_create_window,
        mock_get_branch,
        mock_window_exists,
        mock_session_exists
    ):
        """Test open_worktree adds logs window when session exists but no logs."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = True
        mock_window_exists.return_value = False  # logs window doesn't exist
        mock_get_branch.return_value = "feature/existing"
        mock_create_window.return_value = (True, "")
        mock_send_keys.return_value = (True, "")
        mock_split.return_value = (True, "")
        mock_wezterm.return_value = (True, "")
        mock_chrome.return_value = (True, "")

        ops = TerminalOperations()
        result = ops.open_worktree(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        mock_create_window.assert_called_with("feature-existing", "logs-testid01", "/tmp/test")

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_create_session")
    @patch("os.path.isdir")
    def test_open_worktree_session_failure(
        self,
        mock_isdir,
        mock_create_session,
        mock_get_branch,
        mock_session_exists
    ):
        """Test worktree opening fails if session creation fails."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = False
        mock_get_branch.return_value = "feature/test"
        mock_create_session.return_value = (False, "Session creation failed")

        ops = TerminalOperations()
        result = ops.open_worktree(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is False
        assert "Failed to create session" in result.message

    def test_open_codebase_invalid_path(self):
        """Test open_codebase returns error for invalid path."""
        ops = TerminalOperations()
        result = ops.open_codebase(
            adw_id="testid01",
            worktree_path="/nonexistent/path"
        )
        assert result.success is False
        assert "not found" in result.message.lower()

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_window_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_create_window")
    @patch.object(TerminalOperations, "_send_keys")
    @patch.object(TerminalOperations, "_open_wezterm")
    @patch("os.path.isdir")
    def test_open_codebase_adds_code_window(
        self,
        mock_isdir,
        mock_wezterm,
        mock_send_keys,
        mock_create_window,
        mock_get_branch,
        mock_window_exists,
        mock_session_exists
    ):
        """Test open_codebase adds code window to existing session."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = True
        mock_window_exists.return_value = False
        mock_get_branch.return_value = "feature/code-test"
        mock_create_window.return_value = (True, "")
        mock_send_keys.return_value = (True, "")
        mock_wezterm.return_value = (True, "")

        ops = TerminalOperations()
        result = ops.open_codebase(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        assert result.window_name == "code-testid01"
        mock_create_window.assert_called_with("feature-code-test", "code-testid01", "/tmp/test")

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_window_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_select_window")
    @patch.object(TerminalOperations, "_open_wezterm")
    @patch("os.path.isdir")
    def test_open_codebase_switches_to_existing_code_window(
        self,
        mock_isdir,
        mock_wezterm,
        mock_select_window,
        mock_get_branch,
        mock_window_exists,
        mock_session_exists
    ):
        """Test open_codebase switches to existing code window."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = True
        mock_window_exists.return_value = True
        mock_get_branch.return_value = "feature/existing-code"
        mock_select_window.return_value = (True, "")
        mock_wezterm.return_value = (True, "")

        ops = TerminalOperations()
        result = ops.open_codebase(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        mock_select_window.assert_called_with("feature-existing-code", "code-testid01")

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch.object(TerminalOperations, "_run_command")
    @patch("os.path.isdir")
    def test_kill_session_success(
        self,
        mock_isdir,
        mock_run,
        mock_get_branch,
        mock_session_exists
    ):
        """Test kill_session successfully kills session."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = True
        mock_get_branch.return_value = "feature/to-delete"
        mock_run.return_value = (0, "", "")

        ops = TerminalOperations()
        result = ops.kill_session(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        assert "Killed session" in result.message

    @patch.object(TerminalOperations, "_session_exists")
    @patch.object(TerminalOperations, "_get_branch_name")
    @patch("os.path.isdir")
    def test_kill_session_not_exists(
        self,
        mock_isdir,
        mock_get_branch,
        mock_session_exists
    ):
        """Test kill_session handles non-existent session."""
        mock_isdir.return_value = True
        mock_session_exists.return_value = False
        mock_get_branch.return_value = "feature/nonexistent"

        ops = TerminalOperations()
        result = ops.kill_session(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        assert "does not exist" in result.message


class TestConvenienceFunctions:
    """Test suite for module-level convenience functions."""

    @patch.object(TerminalOperations, "open_worktree")
    def test_open_worktree_in_terminal(self, mock_open):
        """Test convenience function correctly calls the class method."""
        expected_result = OpenWorktreeResult(
            success=True,
            message="Test",
            session_name="feature-test",
            branch_name="feature/test"
        )
        mock_open.return_value = expected_result

        result = open_worktree_in_terminal(
            adw_id="testid01",
            worktree_path="/tmp/test",
            frontend_port=5173
        )

        assert result.success is True
        mock_open.assert_called_once_with(
            adw_id="testid01",
            worktree_path="/tmp/test",
            frontend_port=5173
        )

    @patch.object(TerminalOperations, "open_codebase")
    def test_open_codebase_in_terminal(self, mock_open):
        """Test convenience function correctly calls the class method."""
        expected_result = OpenWorktreeResult(
            success=True,
            message="Test",
            session_name="feature-test",
            window_name="code"
        )
        mock_open.return_value = expected_result

        result = open_codebase_in_terminal(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        mock_open.assert_called_once_with(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

    @patch.object(TerminalOperations, "kill_session")
    def test_kill_worktree_session(self, mock_kill):
        """Test convenience function correctly calls the class method."""
        expected_result = OpenWorktreeResult(
            success=True,
            message="Killed session",
            session_name="feature-test"
        )
        mock_kill.return_value = expected_result

        result = kill_worktree_session(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )

        assert result.success is True
        mock_kill.assert_called_once_with(
            adw_id="testid01",
            worktree_path="/tmp/test"
        )


class TestOpenWorktreeResult:
    """Test suite for OpenWorktreeResult dataclass."""

    def test_default_values(self):
        """Test default optional values are None."""
        result = OpenWorktreeResult(success=True, message="Test")
        assert result.session_name is None
        assert result.window_name is None
        assert result.branch_name is None
        assert result.error is None

    def test_all_values(self):
        """Test all values can be set."""
        result = OpenWorktreeResult(
            success=True,
            message="Opened successfully",
            session_name="feature-test",
            window_name="logs",
            branch_name="feature/test",
            error=None
        )
        assert result.success is True
        assert result.message == "Opened successfully"
        assert result.session_name == "feature-test"
        assert result.window_name == "logs"
        assert result.branch_name == "feature/test"
