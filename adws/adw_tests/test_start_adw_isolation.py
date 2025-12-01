#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest"]
# ///

"""
Test to verify start_adw.sh maintains worktree isolation.

This test ensures the start script doesn't contain global pkill commands
that would kill trigger_websocket.py processes from other worktrees.
"""

import os
import re
from pathlib import Path


def get_project_root() -> Path:
    """Get the project root directory."""
    current = Path(__file__).resolve()
    # Navigate up from adws/adw_tests/ to project root
    return current.parent.parent.parent


def test_start_adw_no_global_pkill():
    """
    Verify start_adw.sh doesn't use global pkill for trigger_websocket.py.

    A global pkill command like `pkill -f "trigger_websocket.py"` would kill
    ALL trigger_websocket.py processes across all worktrees, breaking worktree
    isolation. Each worktree should only manage its own processes based on its
    specific port configuration.
    """
    project_root = get_project_root()
    start_adw_path = project_root / "scripts" / "start_adw.sh"

    assert start_adw_path.exists(), f"start_adw.sh not found at {start_adw_path}"

    content = start_adw_path.read_text()

    # Process line by line, skipping comments
    problematic_lines = []
    for line in content.split('\n'):
        stripped = line.strip()
        # Skip comment lines
        if stripped.startswith('#'):
            continue

        # Check for problematic patterns that would kill all trigger_websocket processes
        problematic_patterns = [
            r'pkill\s+-f\s+["\']?trigger_websocket',
            r'pkill\s+.*trigger_websocket',
            r'killall\s+.*trigger_websocket',
        ]

        for pattern in problematic_patterns:
            if re.search(pattern, stripped):
                problematic_lines.append(stripped)

    assert not problematic_lines, (
        f"Found global process kill command in start_adw.sh: {problematic_lines}\n"
        f"This breaks worktree isolation! Each worktree should only kill "
        f"processes on its own port, not all trigger_websocket.py processes.\n"
        f"Use port-based killing instead: lsof -ti:$ADW_PORT | xargs kill"
    )


def test_start_adw_uses_port_based_cleanup():
    """
    Verify start_adw.sh uses port-based process cleanup.

    Port-based cleanup (using lsof -ti:$PORT) is the correct approach because
    each worktree has its own port configuration in .ports.env, allowing
    multiple worktrees to run simultaneously without interference.
    """
    project_root = get_project_root()
    start_adw_path = project_root / "scripts" / "start_adw.sh"

    content = start_adw_path.read_text()

    # Should use port-based process killing
    assert "lsof -ti:$ADW_PORT" in content, (
        "start_adw.sh should use port-based process cleanup (lsof -ti:$ADW_PORT) "
        "to maintain worktree isolation"
    )

    # Should load port from .ports.env
    assert ".ports.env" in content, (
        "start_adw.sh should load port configuration from .ports.env"
    )


def test_ports_env_has_unique_port():
    """
    Verify the main .ports.env has ADW_PORT configured.
    """
    project_root = get_project_root()
    ports_env_path = project_root / ".ports.env"

    assert ports_env_path.exists(), f".ports.env not found at {ports_env_path}"

    content = ports_env_path.read_text()

    # Should have ADW_PORT or WEBSOCKET_PORT defined
    has_adw_port = "ADW_PORT=" in content
    has_websocket_port = "WEBSOCKET_PORT=" in content

    assert has_adw_port or has_websocket_port, (
        ".ports.env should define ADW_PORT or WEBSOCKET_PORT for the websocket server"
    )


if __name__ == "__main__":
    print("Testing start_adw.sh worktree isolation...")
    print()

    try:
        test_start_adw_no_global_pkill()
        print("PASS: No global pkill commands found")
    except AssertionError as e:
        print(f"FAIL: {e}")

    try:
        test_start_adw_uses_port_based_cleanup()
        print("PASS: Uses port-based cleanup")
    except AssertionError as e:
        print(f"FAIL: {e}")

    try:
        test_ports_env_has_unique_port()
        print("PASS: .ports.env has port configured")
    except AssertionError as e:
        print(f"FAIL: {e}")

    print()
    print("All tests completed!")
