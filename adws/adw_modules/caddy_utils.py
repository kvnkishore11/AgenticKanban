"""Caddy reverse proxy utilities for ADW worktree management.

This module provides centralized utilities for interacting with Caddy's
admin API to support the WT (Worktree Manager) protocol.

The WT protocol uses Caddy to provide hostname-based routing:
- Frontend: http://<adw_id>.localhost
- Backend API: http://api.<adw_id>.localhost
- WebSocket: ws://adw.<adw_id>.localhost/ws/trigger

Usage:
    from adw_modules.caddy_utils import (
        is_caddy_running,
        get_caddy_route_port,
        get_adw_caddy_url,
    )

    if is_caddy_running():
        url = get_adw_caddy_url("abc12345")  # Returns http://api.abc12345.localhost
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Optional

# Caddy Admin API configuration
CADDY_ADMIN_HOST = "localhost"
CADDY_ADMIN_PORT = 2019
CADDY_API_BASE = f"http://{CADDY_ADMIN_HOST}:{CADDY_ADMIN_PORT}"
CADDY_CONFIG_ENDPOINT = f"{CADDY_API_BASE}/config/"
CADDY_ROUTES_ENDPOINT = f"{CADDY_API_BASE}/config/apps/http/servers/srv0/routes"

# Default timeout for Caddy API requests
CADDY_API_TIMEOUT = 2  # seconds

logger = logging.getLogger(__name__)


def is_caddy_running(timeout: float = 1.0) -> bool:
    """Check if Caddy reverse proxy is running and accessible.

    Args:
        timeout: Request timeout in seconds

    Returns:
        True if Caddy API is accessible, False otherwise
    """
    try:
        with urllib.request.urlopen(CADDY_CONFIG_ENDPOINT, timeout=timeout) as resp:
            return resp.status == 200
    except urllib.error.URLError as e:
        logger.debug(f"Caddy not accessible: {e.reason}")
        return False
    except TimeoutError:
        logger.debug("Caddy API request timed out")
        return False
    except Exception as e:
        logger.debug(f"Unexpected error checking Caddy: {e}")
        return False


def get_caddy_routes(timeout: float = CADDY_API_TIMEOUT) -> list:
    """Fetch all routes from Caddy's configuration.

    Args:
        timeout: Request timeout in seconds

    Returns:
        List of route configurations, empty list if unavailable
    """
    try:
        with urllib.request.urlopen(CADDY_ROUTES_ENDPOINT, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        logger.debug(f"Failed to fetch Caddy routes: {e.reason}")
        return []
    except json.JSONDecodeError as e:
        logger.warning(f"Invalid JSON from Caddy routes endpoint: {e}")
        return []
    except TimeoutError:
        logger.debug("Caddy routes request timed out")
        return []
    except Exception as e:
        logger.debug(f"Unexpected error fetching Caddy routes: {e}")
        return []


def get_caddy_route_port(adw_id: str, route_type: str = "be") -> Optional[int]:
    """Get the port assigned to an ADW worktree by Caddy.

    Args:
        adw_id: The ADW ID
        route_type: Route type - 'fe' for frontend, 'be' for backend, 'adw' for websocket

    Returns:
        Port number if route exists, None otherwise
    """
    routes = get_caddy_routes()
    if not routes:
        return None

    route_id = f"{adw_id}-{route_type}"

    for route in routes:
        if route.get("@id") != route_id:
            continue

        try:
            handlers = route.get("handle", [])
            if not handlers:
                continue

            upstreams = handlers[0].get("upstreams", [])
            if not upstreams:
                continue

            dial = upstreams[0].get("dial", "")
            if ":" not in dial:
                continue

            port_str = dial.rsplit(":", 1)[-1]
            return int(port_str)

        except (IndexError, ValueError, TypeError) as e:
            logger.debug(f"Failed to parse port from route {route_id}: {e}")
            continue

    return None


def has_adw_route(adw_id: str, route_type: str = "be") -> bool:
    """Check if Caddy has a route configured for an ADW.

    Args:
        adw_id: The ADW ID
        route_type: Route type - 'fe' for frontend, 'be' for backend, 'adw' for websocket

    Returns:
        True if route exists, False otherwise
    """
    routes = get_caddy_routes()
    route_id = f"{adw_id}-{route_type}"

    for route in routes:
        if route.get("@id") == route_id:
            return True

    # Also check for main project special routes
    if adw_id == "main":
        main_route_ids = [f"main-{route_type}", "main-backend" if route_type == "be" else None]
        for route in routes:
            if route.get("@id") in main_route_ids:
                return True

    return False


def get_adw_caddy_url(adw_id: str, route_type: str = "be") -> Optional[str]:
    """Get the Caddy-based URL for an ADW worktree.

    This checks if Caddy has a route for the ADW and returns the
    appropriate hostname-based URL.

    Args:
        adw_id: The ADW ID
        route_type: Route type - 'fe' for frontend, 'be' for backend, 'adw' for websocket

    Returns:
        URL string if Caddy route exists, None otherwise
    """
    if not has_adw_route(adw_id, route_type):
        return None

    if route_type == "be":
        return f"http://api.{adw_id}.localhost"
    elif route_type == "fe":
        return f"http://{adw_id}.localhost"
    elif route_type == "adw":
        return f"ws://adw.{adw_id}.localhost/ws/trigger"
    else:
        logger.warning(f"Unknown route type: {route_type}")
        return None


def detect_server_url(adw_id: str) -> str:
    """Auto-detect the best server URL for the given ADW ID.

    Priority:
    1. WEBSOCKET_URL environment variable (explicit override)
    2. Caddy-based URL if Caddy is running with routes for this ADW
    3. WEBSOCKET_PORT environment variable (legacy)
    4. Default to localhost:8500

    Args:
        adw_id: The ADW ID to find a server for

    Returns:
        Server URL to use
    """
    import os

    # 1. Explicit URL override
    explicit_url = os.getenv("WEBSOCKET_URL")
    if explicit_url:
        return explicit_url.rstrip("/")

    # 2. Try Caddy-based URL
    caddy_url = get_adw_caddy_url(adw_id, "be")
    if caddy_url:
        return caddy_url

    # 3. Legacy: WEBSOCKET_PORT environment variable
    port = os.getenv("WEBSOCKET_PORT", "8500")
    return f"http://localhost:{port}"


# WT Protocol hostname utilities (no Caddy check required)

def get_adw_hostname(adw_id: str) -> str:
    """Get the hostname for an ADW worktree (WT protocol).

    Args:
        adw_id: The ADW ID

    Returns:
        Hostname like 'abc12345.localhost' or 'main.localhost'
    """
    return f"{adw_id}.localhost"


def get_adw_api_url(adw_id: str) -> str:
    """Get the backend API URL for an ADW worktree (WT protocol).

    Note: This returns the expected URL format. Use get_adw_caddy_url()
    to check if Caddy actually has this route configured.

    Args:
        adw_id: The ADW ID

    Returns:
        URL like 'http://api.abc12345.localhost'
    """
    return f"http://api.{adw_id}.localhost"


def get_adw_websocket_url(adw_id: str) -> str:
    """Get the WebSocket URL for an ADW worktree (WT protocol).

    Note: This returns the expected URL format. Use get_adw_caddy_url()
    to check if Caddy actually has this route configured.

    Args:
        adw_id: The ADW ID

    Returns:
        URL like 'ws://adw.abc12345.localhost/ws/trigger'
    """
    return f"ws://adw.{adw_id}.localhost/ws/trigger"
