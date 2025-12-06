"""Worktree and port management operations for isolated ADW workflows.

Provides utilities for creating and managing git worktrees under trees/<adw_id>/.

## Port Management (DEPRECATED)

The legacy port allocation functions (get_ports_for_adw, find_next_available_ports,
setup_worktree_environment) are deprecated. The WT protocol now handles port
allocation dynamically via Caddy reverse proxy.

New approach:
- Use `wt start <adw_id>` to start a worktree with random ports
- Access via hostnames: http://<adw_id>.localhost
- Backend via: http://api.<adw_id>.localhost
- WebSocket via: ws://adw.<adw_id>.localhost/ws/trigger

See ~/.claude/adw/README.md for details.
"""

import os
import subprocess
import logging
import socket
import shutil
import warnings
from typing import Tuple, Optional
from adw_modules.state import ADWState

# Import shared Caddy utilities
from adw_modules.caddy_utils import (
    is_caddy_running,
    get_caddy_route_port,
    get_adw_hostname,
    get_adw_api_url,
    get_adw_websocket_url,
)


def create_worktree(adw_id: str, branch_name: str, logger: logging.Logger) -> Tuple[str, Optional[str]]:
    """Create a git worktree for isolated ADW execution.
    
    Args:
        adw_id: The ADW ID for this worktree
        branch_name: The branch name to create the worktree from
        logger: Logger instance
        
    Returns:
        Tuple of (worktree_path, error_message)
        worktree_path is the absolute path if successful, None if error
    """
    # Get project root (parent of adws directory)
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    
    # Create trees directory if it doesn't exist
    trees_dir = os.path.join(project_root, "trees")
    os.makedirs(trees_dir, exist_ok=True)
    
    # Construct worktree path
    worktree_path = os.path.join(trees_dir, adw_id)
    
    # Check if worktree already exists
    if os.path.exists(worktree_path):
        logger.warning(f"Worktree already exists at {worktree_path}")
        return worktree_path, None
    
    # First, fetch latest changes from origin
    logger.info("Fetching latest changes from origin")
    fetch_result = subprocess.run(
        ["git", "fetch", "origin"], 
        capture_output=True, 
        text=True, 
        cwd=project_root
    )
    if fetch_result.returncode != 0:
        logger.warning(f"Failed to fetch from origin: {fetch_result.stderr}")
    
    # Create the worktree using git, branching from main
    # Use -b to create the branch as part of worktree creation
    cmd = ["git", "worktree", "add", "-b", branch_name, worktree_path, "main"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
    
    if result.returncode != 0:
        # If branch already exists, try without -b
        if "already exists" in result.stderr:
            cmd = ["git", "worktree", "add", worktree_path, branch_name]
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=project_root)
            
        if result.returncode != 0:
            error_msg = f"Failed to create worktree: {result.stderr}"
            logger.error(error_msg)
            return None, error_msg
    
    logger.info(f"Created worktree at {worktree_path} for branch {branch_name}")
    return worktree_path, None


def validate_worktree(adw_id: str, state: ADWState) -> Tuple[bool, Optional[str]]:
    """Validate worktree exists in state, filesystem, and git.
    
    Performs three-way validation to ensure consistency:
    1. State has worktree_path
    2. Directory exists on filesystem
    3. Git knows about the worktree
    
    Args:
        adw_id: The ADW ID to validate
        state: The ADW state object
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check state has worktree_path
    worktree_path = state.get("worktree_path")
    if not worktree_path:
        return False, "No worktree_path in state"
    
    # Check directory exists
    if not os.path.exists(worktree_path):
        return False, f"Worktree directory not found: {worktree_path}"
    
    # Check git knows about it
    result = subprocess.run(["git", "worktree", "list"], capture_output=True, text=True)
    if worktree_path not in result.stdout:
        return False, "Worktree not registered with git"
    
    return True, None


def get_worktree_path(adw_id: str) -> str:
    """Get absolute path to worktree.
    
    Args:
        adw_id: The ADW ID
        
    Returns:
        Absolute path to worktree directory
    """
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return os.path.join(project_root, "trees", adw_id)


def remove_worktree(adw_id: str, logger: logging.Logger) -> Tuple[bool, Optional[str]]:
    """Remove a worktree and clean up.
    
    Args:
        adw_id: The ADW ID for the worktree to remove
        logger: Logger instance
        
    Returns:
        Tuple of (success, error_message)
    """
    worktree_path = get_worktree_path(adw_id)
    
    # First remove via git
    cmd = ["git", "worktree", "remove", worktree_path, "--force"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        # Try to clean up manually if git command failed
        if os.path.exists(worktree_path):
            try:
                shutil.rmtree(worktree_path)
                logger.warning(f"Manually removed worktree directory: {worktree_path}")
            except Exception as e:
                return False, f"Failed to remove worktree: {result.stderr}, manual cleanup failed: {e}"
    
    logger.info(f"Removed worktree at {worktree_path}")
    return True, None


# -----------------------------------------------------------------------------
# Legacy Port Management (DEPRECATED - Use WT Protocol Instead)
# -----------------------------------------------------------------------------

def setup_worktree_environment(worktree_path: str, websocket_port: int, frontend_port: int, logger: logging.Logger) -> None:
    """Set up worktree environment by creating .ports.env file.

    .. deprecated::
        Use `wt start <adw_id>` instead. The WT protocol handles port allocation
        dynamically via Caddy reverse proxy.

    The actual environment setup (copying .env files, installing dependencies) is handled
    by the install_worktree.md command which runs inside the worktree.

    Args:
        worktree_path: Path to the worktree
        websocket_port: WebSocket server port number
        frontend_port: Frontend port number
        logger: Logger instance
    """
    warnings.warn(
        "setup_worktree_environment is deprecated. Use 'wt start <adw_id>' instead.",
        DeprecationWarning,
        stacklevel=2
    )

    # Create .ports.env file with port configuration
    ports_env_path = os.path.join(worktree_path, ".ports.env")

    # Derive adw_id from worktree_path for Caddy URL support
    adw_id = os.path.basename(worktree_path)

    with open(ports_env_path, "w") as f:
        f.write(f"WEBSOCKET_PORT={websocket_port}\n")
        f.write(f"FRONTEND_PORT={frontend_port}\n")
        f.write(f"ADW_PORT={websocket_port}\n")
        f.write(f"VITE_ADW_PORT={websocket_port}\n")
        # Support both legacy port-based and new Caddy-based URLs
        f.write(f"VITE_BACKEND_URL=http://localhost:{websocket_port}\n")
        f.write(f"# WT Protocol URLs (preferred when Caddy is running)\n")
        f.write(f"# VITE_BACKEND_URL=http://api.{adw_id}.localhost\n")

    logger.info(f"Created .ports.env with WebSocket: {websocket_port}, Frontend: {frontend_port}")


def get_ports_for_adw(adw_id: str) -> Tuple[int, int]:
    """Deterministically assign ports based on ADW ID.

    .. deprecated::
        Use WT protocol instead. Access worktrees via hostnames:
        - Frontend: http://<adw_id>.localhost
        - Backend: http://api.<adw_id>.localhost
        - WebSocket: ws://adw.<adw_id>.localhost/ws/trigger

    Args:
        adw_id: The ADW ID

    Returns:
        Tuple of (websocket_port, frontend_port)
    """
    warnings.warn(
        "get_ports_for_adw is deprecated. Use WT protocol hostnames instead.",
        DeprecationWarning,
        stacklevel=2
    )

    # Check if Caddy is running and has a route for this ADW
    if is_caddy_running():
        be_port = get_caddy_route_port(adw_id, "be")
        fe_port = get_caddy_route_port(adw_id, "fe")
        if be_port and fe_port:
            return be_port, fe_port

    # Legacy fallback: deterministic port assignment
    # Convert first 8 chars of ADW ID to index (0-14)
    # Using base 36 conversion and modulo to get consistent mapping
    try:
        # Take first 8 alphanumeric chars and convert from base 36
        id_chars = ''.join(c for c in adw_id[:8] if c.isalnum())
        index = int(id_chars, 36) % 15
    except ValueError:
        # Fallback to simple hash if conversion fails
        index = hash(adw_id) % 15

    websocket_port = 8500 + index  # WebSocket ports: 8500-8514
    frontend_port = 9200 + index    # Frontend ports: 9200-9214

    return websocket_port, frontend_port


def is_port_available(port: int) -> bool:
    """Check if a port is available for binding.

    Args:
        port: Port number to check

    Returns:
        True if port is available, False otherwise
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            s.bind(('localhost', port))
            return True
    except (socket.error, OSError):
        return False


def find_next_available_ports(adw_id: str, max_attempts: int = 15) -> Tuple[int, int]:
    """Find available ports starting from deterministic assignment.

    .. deprecated::
        Use WT protocol instead. Run `wt start <adw_id>` to start with random ports.

    Args:
        adw_id: The ADW ID
        max_attempts: Maximum number of attempts (default 15)

    Returns:
        Tuple of (websocket_port, frontend_port)

    Raises:
        RuntimeError: If no available ports found
    """
    warnings.warn(
        "find_next_available_ports is deprecated. Use 'wt start <adw_id>' instead.",
        DeprecationWarning,
        stacklevel=2
    )

    # Check if Caddy is running and has a route for this ADW
    if is_caddy_running():
        be_port = get_caddy_route_port(adw_id, "be")
        fe_port = get_caddy_route_port(adw_id, "fe")
        if be_port and fe_port:
            return be_port, fe_port

    # Legacy fallback - use internal function to avoid deprecation warning
    base_websocket, base_frontend = _get_legacy_ports(adw_id)
    base_index = base_websocket - 8500

    for offset in range(max_attempts):
        index = (base_index + offset) % 15
        websocket_port = 8500 + index
        frontend_port = 9200 + index

        if is_port_available(websocket_port) and is_port_available(frontend_port):
            return websocket_port, frontend_port

    raise RuntimeError("No available ports in the allocated range")


def _get_legacy_ports(adw_id: str) -> Tuple[int, int]:
    """Internal legacy port calculation without deprecation warning."""
    try:
        id_chars = ''.join(c for c in adw_id[:8] if c.isalnum())
        index = int(id_chars, 36) % 15
    except ValueError:
        index = hash(adw_id) % 15

    return 8500 + index, 9200 + index
