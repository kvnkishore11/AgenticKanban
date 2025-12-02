"""Terminal operations for opening worktrees in WezTerm with tmux.

Provides utilities for opening ADW worktrees in a configured terminal environment.
Each worktree gets its own tmux session named after the branch, with two windows:
- logs-{adw_id}: Split panes running frontend and backend scripts
- code-{adw_id}: Neovim for code editing
"""

import os
import subprocess
import logging
from typing import Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OpenWorktreeResult:
    """Result of opening a worktree in terminal."""
    success: bool
    message: str
    session_name: Optional[str] = None
    window_name: Optional[str] = None
    branch_name: Optional[str] = None
    error: Optional[str] = None


class TerminalOperations:
    """Handles WezTerm and tmux operations for worktree management.

    Each worktree gets its own tmux session named after the branch.
    Sessions have two windows: 'logs-{adw_id}' and 'code-{adw_id}'.
    """

    def __init__(self):
        """Initialize terminal operations."""
        self.project_root = self._get_project_root()

    def _get_project_root(self) -> str:
        """Get the main project root directory.

        Uses git to find the common directory, which works correctly
        both in the main repo and in worktrees.
        """
        try:
            # Get the git common directory (works in worktrees)
            result = subprocess.run(
                ["git", "rev-parse", "--git-common-dir"],
                capture_output=True,
                text=True,
                check=True,
                cwd=os.path.dirname(__file__)
            )
            git_dir = result.stdout.strip()
            # The parent of .git is the project root
            return os.path.dirname(os.path.abspath(git_dir))
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fallback to file-based navigation if git fails
            current_file = os.path.abspath(__file__)
            return os.path.dirname(os.path.dirname(os.path.dirname(current_file)))

    def _run_command(
        self,
        cmd: list,
        capture_output: bool = True,
        timeout: int = 30
    ) -> Tuple[int, str, str]:
        """Run a shell command and return (returncode, stdout, stderr)."""
        try:
            result = subprocess.run(
                cmd,
                capture_output=capture_output,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except Exception as e:
            return -1, "", str(e)

    # --- Git Operations ---

    def _get_branch_name(self, worktree_path: str) -> Optional[str]:
        """Get the git branch name for a worktree."""
        returncode, stdout, _ = self._run_command([
            "git", "-C", worktree_path, "branch", "--show-current"
        ])
        return stdout.strip() if returncode == 0 and stdout else None

    def _sanitize_session_name(self, branch_name: str) -> str:
        """Sanitize branch name for use as tmux session name.

        Replaces periods, colons, and slashes with dashes.
        """
        sanitized = branch_name.replace(".", "-").replace(":", "-").replace("/", "-")
        return sanitized.strip("-")

    # --- Tmux Session Operations ---

    def _session_exists(self, session_name: str) -> bool:
        """Check if a tmux session exists."""
        returncode, _, _ = self._run_command([
            "tmux", "has-session", "-t", session_name
        ])
        return returncode == 0

    def _create_session(
        self,
        session_name: str,
        worktree_path: str,
        window_name: str
    ) -> Tuple[bool, str]:
        """Create a new tmux session with the first window."""
        returncode, _, stderr = self._run_command([
            "tmux", "new-session", "-d",
            "-s", session_name,
            "-n", window_name,
            "-c", worktree_path
        ])
        if returncode != 0:
            return False, f"Failed to create session: {stderr}"
        logger.info(f"Created tmux session: {session_name}")
        return True, ""

    def _switch_client(self, session_name: str) -> Tuple[bool, str]:
        """Switch the current tmux client to the specified session."""
        returncode, _, stderr = self._run_command([
            "tmux", "switch-client", "-t", session_name
        ])
        return returncode == 0, stderr

    # --- Tmux Window Operations ---

    def _window_exists(self, session_name: str, window_name: str) -> bool:
        """Check if a tmux window exists in the session."""
        returncode, stdout, _ = self._run_command([
            "tmux", "list-windows", "-t", session_name, "-F", "#{window_name}"
        ])
        if returncode != 0:
            return False
        return window_name in stdout.strip().split('\n')

    def _create_window(
        self,
        session_name: str,
        window_name: str,
        worktree_path: str
    ) -> Tuple[bool, str]:
        """Create a new window in an existing session."""
        returncode, _, stderr = self._run_command([
            "tmux", "new-window",
            "-t", session_name,
            "-n", window_name,
            "-c", worktree_path
        ])
        if returncode != 0:
            return False, f"Failed to create window: {stderr}"
        return True, ""

    def _select_window(self, session_name: str, window_name: str) -> Tuple[bool, str]:
        """Select/switch to a window in the session."""
        returncode, _, stderr = self._run_command([
            "tmux", "select-window", "-t", f"{session_name}:{window_name}"
        ])
        return returncode == 0, stderr

    # --- Tmux Pane Operations ---

    def _send_keys(self, target: str, keys: str) -> Tuple[bool, str]:
        """Send keys to a tmux pane."""
        returncode, _, stderr = self._run_command([
            "tmux", "send-keys", "-t", target, keys, "Enter"
        ])
        return returncode == 0, stderr

    def _split_horizontal(self, window_target: str, worktree_path: str) -> Tuple[bool, str]:
        """Split the window horizontally (side by side panes)."""
        returncode, _, stderr = self._run_command([
            "tmux", "split-window", "-h",
            "-t", window_target,
            "-c", worktree_path
        ])
        return returncode == 0, stderr

    # --- Application Operations ---

    def _open_wezterm(self, session_name: str) -> Tuple[bool, str]:
        """Open WezTerm and switch to the tmux session.

        First tries to switch existing tmux client to the session.
        If that fails (no client attached), opens new WezTerm window.
        """
        # Try to switch existing client first
        success, _ = self._switch_client(session_name)
        if success:
            self._run_command(["open", "-a", "WezTerm"])
            return True, ""

        # Open new WezTerm with tmux attach
        returncode, _, stderr = self._run_command([
            "open", "-a", "WezTerm", "--args",
            "start", "--", "tmux", "attach-session", "-t", session_name
        ])

        if returncode != 0:
            # Fallback: try wezterm CLI directly
            returncode, _, stderr = self._run_command([
                "wezterm", "start", "--",
                "tmux", "attach-session", "-t", session_name
            ])

        return returncode == 0, stderr

    def _open_chrome(self, url: str) -> Tuple[bool, str]:
        """Open Chrome with the specified URL."""
        returncode, _, stderr = self._run_command([
            "open", "-a", "Google Chrome", url
        ])
        return returncode == 0, stderr

    # --- Helper Methods ---

    def _resolve_worktree(
        self,
        adw_id: str,
        worktree_path: Optional[str]
    ) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """Resolve worktree path, branch name, and session name.

        Returns:
            (worktree_path, branch_name, session_name) or (None, None, error)
        """
        if not worktree_path:
            worktree_path = os.path.join(self.project_root, "trees", adw_id)

        if not os.path.isdir(worktree_path):
            return None, None, f"Path does not exist: {worktree_path}"

        branch_name = self._get_branch_name(worktree_path) or f"adw-{adw_id[:8]}"
        session_name = self._sanitize_session_name(branch_name)

        return worktree_path, branch_name, session_name

    def _setup_logs_window(
        self,
        session_name: str,
        window_name: str,
        worktree_path: str,
        run_scripts: bool
    ) -> None:
        """Setup the logs window with split panes and scripts."""
        if not run_scripts:
            return

        window_target = f"{session_name}:{window_name}"
        self._send_keys(f"{window_target}.0", "./scripts/start_fe.sh")

        success, _ = self._split_horizontal(window_target, worktree_path)
        if success:
            self._send_keys(f"{window_target}.1", "./scripts/start_adw.sh")

    # --- Public API ---

    def open_worktree(
        self,
        adw_id: str,
        worktree_path: Optional[str] = None,
        frontend_port: int = 5173,
        run_scripts: bool = True,
        open_browser: bool = True
    ) -> OpenWorktreeResult:
        """Open a worktree with its own tmux session.

        Creates a tmux session named after the branch with a logs window
        containing split panes for frontend and backend scripts.
        """
        # Resolve paths and names
        resolved_path, branch_name, session_name = self._resolve_worktree(adw_id, worktree_path)
        if resolved_path is None:
            return OpenWorktreeResult(
                success=False,
                message="Worktree directory not found",
                error=session_name  # Contains error message
            )
        worktree_path = resolved_path

        window_name = f"logs-{adw_id[:8]}"

        try:
            session_exists = self._session_exists(session_name)
            window_exists = session_exists and self._window_exists(session_name, window_name)

            if window_exists:
                logger.info(f"Window {window_name} exists, switching to it")
                self._select_window(session_name, window_name)
            elif session_exists:
                logger.info(f"Adding {window_name} to session {session_name}")
                success, err = self._create_window(session_name, window_name, worktree_path)
                if not success:
                    return OpenWorktreeResult(
                        success=False, message="Failed to create logs window", error=err
                    )
                self._setup_logs_window(session_name, window_name, worktree_path, run_scripts)
            else:
                logger.info(f"Creating session {session_name}")
                success, err = self._create_session(session_name, worktree_path, window_name)
                if not success:
                    return OpenWorktreeResult(
                        success=False, message="Failed to create session", error=err
                    )
                self._setup_logs_window(session_name, window_name, worktree_path, run_scripts)

            # Switch to session in WezTerm
            success, err = self._open_wezterm(session_name)
            if not success:
                logger.warning(f"WezTerm warning: {err}")

            # Open browser if requested
            if open_browser:
                self._open_chrome(f"http://localhost:{frontend_port}")

            return OpenWorktreeResult(
                success=True,
                message=f"Opened worktree in session '{session_name}'",
                session_name=session_name,
                window_name=window_name,
                branch_name=branch_name
            )

        except Exception as e:
            logger.error(f"Error opening worktree: {e}")
            return OpenWorktreeResult(
                success=False, message="Failed to open worktree", error=str(e)
            )

    def open_codebase(
        self,
        adw_id: str,
        worktree_path: Optional[str] = None
    ) -> OpenWorktreeResult:
        """Open neovim in the worktree's tmux session.

        Adds a code window to the session (or creates session if needed)
        and launches neovim.
        """
        # Resolve paths and names
        resolved_path, branch_name, session_name = self._resolve_worktree(adw_id, worktree_path)
        if resolved_path is None:
            return OpenWorktreeResult(
                success=False,
                message="Worktree directory not found",
                error=session_name
            )
        worktree_path = resolved_path

        window_name = f"code-{adw_id[:8]}"

        try:
            session_exists = self._session_exists(session_name)
            window_exists = session_exists and self._window_exists(session_name, window_name)

            if window_exists:
                logger.info(f"Window {window_name} exists, switching to it")
                self._select_window(session_name, window_name)
            elif session_exists:
                logger.info(f"Adding {window_name} to session {session_name}")
                success, err = self._create_window(session_name, window_name, worktree_path)
                if not success:
                    return OpenWorktreeResult(
                        success=False, message="Failed to create code window", error=err
                    )
                self._send_keys(f"{session_name}:{window_name}.0", "nvim .")
            else:
                logger.info(f"Creating session {session_name}")
                success, err = self._create_session(session_name, worktree_path, window_name)
                if not success:
                    return OpenWorktreeResult(
                        success=False, message="Failed to create session", error=err
                    )
                self._send_keys(f"{session_name}:{window_name}.0", "nvim .")

            # Switch to session in WezTerm
            success, err = self._open_wezterm(session_name)
            if not success:
                logger.warning(f"WezTerm warning: {err}")

            return OpenWorktreeResult(
                success=True,
                message=f"Opened codebase in session '{session_name}'",
                session_name=session_name,
                window_name=window_name,
                branch_name=branch_name
            )

        except Exception as e:
            logger.error(f"Error opening codebase: {e}")
            return OpenWorktreeResult(
                success=False, message="Failed to open codebase", error=str(e)
            )

    def kill_session(
        self,
        adw_id: str,
        worktree_path: Optional[str] = None
    ) -> OpenWorktreeResult:
        """Kill the tmux session for a worktree.

        Useful for cleanup when merging or deleting a worktree.
        """
        # Resolve paths and names
        resolved_path, branch_name, session_name = self._resolve_worktree(adw_id, worktree_path)

        # Even if path doesn't exist, try to get session name from fallback
        if resolved_path is None:
            branch_name = f"adw-{adw_id[:8]}"
            session_name = self._sanitize_session_name(branch_name)

        if not self._session_exists(session_name):
            return OpenWorktreeResult(
                success=True,
                message=f"Session '{session_name}' does not exist",
                session_name=session_name,
                branch_name=branch_name
            )

        returncode, _, stderr = self._run_command([
            "tmux", "kill-session", "-t", session_name
        ])

        if returncode != 0:
            return OpenWorktreeResult(
                success=False,
                message=f"Failed to kill session '{session_name}'",
                error=stderr
            )

        return OpenWorktreeResult(
            success=True,
            message=f"Killed session '{session_name}'",
            session_name=session_name,
            branch_name=branch_name
        )


# --- Module-level convenience functions ---

def open_worktree_in_terminal(
    adw_id: str,
    worktree_path: Optional[str] = None,
    frontend_port: int = 5173
) -> OpenWorktreeResult:
    """Open a worktree in terminal with frontend/backend scripts."""
    return TerminalOperations().open_worktree(
        adw_id=adw_id,
        worktree_path=worktree_path,
        frontend_port=frontend_port
    )


def open_codebase_in_terminal(
    adw_id: str,
    worktree_path: Optional[str] = None
) -> OpenWorktreeResult:
    """Open codebase in neovim."""
    return TerminalOperations().open_codebase(
        adw_id=adw_id,
        worktree_path=worktree_path
    )


def kill_worktree_session(
    adw_id: str,
    worktree_path: Optional[str] = None
) -> OpenWorktreeResult:
    """Kill a worktree's tmux session."""
    return TerminalOperations().kill_session(
        adw_id=adw_id,
        worktree_path=worktree_path
    )
