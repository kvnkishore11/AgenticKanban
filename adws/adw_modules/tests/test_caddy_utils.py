"""Tests for caddy_utils module."""

import os
import json
import sys
from unittest.mock import patch, MagicMock
from urllib.error import URLError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.caddy_utils import (
    is_caddy_running,
    get_caddy_routes,
    get_caddy_route_port,
    has_adw_route,
    get_adw_caddy_url,
    detect_server_url,
    get_adw_hostname,
    get_adw_api_url,
    get_adw_websocket_url,
    CADDY_CONFIG_ENDPOINT,
    CADDY_ROUTES_ENDPOINT,
)


class TestIsCaddyRunning:
    """Tests for is_caddy_running function."""

    def test_returns_true_when_caddy_accessible(self):
        """Should return True when Caddy API returns 200."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            assert is_caddy_running() is True

    def test_returns_false_when_caddy_not_accessible(self):
        """Should return False when Caddy API is not accessible."""
        with patch('urllib.request.urlopen', side_effect=URLError("Connection refused")):
            assert is_caddy_running() is False

    def test_returns_false_on_timeout(self):
        """Should return False when request times out."""
        with patch('urllib.request.urlopen', side_effect=TimeoutError()):
            assert is_caddy_running() is False

    def test_returns_false_on_non_200_status(self):
        """Should return False when Caddy returns non-200 status."""
        mock_response = MagicMock()
        mock_response.status = 500
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            assert is_caddy_running() is False


class TestGetCaddyRoutes:
    """Tests for get_caddy_routes function."""

    def test_returns_routes_on_success(self):
        """Should return routes list when API returns valid JSON."""
        expected_routes = [
            {"@id": "test-be", "handle": []},
            {"@id": "test-fe", "handle": []},
        ]

        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(expected_routes).encode()
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            routes = get_caddy_routes()
            assert routes == expected_routes

    def test_returns_empty_list_on_error(self):
        """Should return empty list when API is not accessible."""
        with patch('urllib.request.urlopen', side_effect=URLError("Connection refused")):
            assert get_caddy_routes() == []

    def test_returns_empty_list_on_invalid_json(self):
        """Should return empty list when API returns invalid JSON."""
        mock_response = MagicMock()
        mock_response.read.return_value = b"not valid json"
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)

        with patch('urllib.request.urlopen', return_value=mock_response):
            assert get_caddy_routes() == []


class TestGetCaddyRoutePort:
    """Tests for get_caddy_route_port function."""

    def test_extracts_port_from_valid_route(self):
        """Should extract port number from valid route configuration."""
        routes = [
            {
                "@id": "abc12345-be",
                "handle": [
                    {
                        "upstreams": [
                            {"dial": "localhost:8501"}
                        ]
                    }
                ]
            }
        ]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            port = get_caddy_route_port("abc12345", "be")
            assert port == 8501

    def test_returns_none_when_route_not_found(self):
        """Should return None when route doesn't exist."""
        routes = [{"@id": "other-be", "handle": []}]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            port = get_caddy_route_port("abc12345", "be")
            assert port is None

    def test_returns_none_when_no_routes(self):
        """Should return None when no routes exist."""
        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=[]):
            port = get_caddy_route_port("abc12345", "be")
            assert port is None

    def test_handles_malformed_route_gracefully(self):
        """Should handle malformed route without crashing."""
        routes = [
            {
                "@id": "abc12345-be",
                "handle": []  # Missing upstreams
            }
        ]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            port = get_caddy_route_port("abc12345", "be")
            assert port is None

    def test_handles_invalid_port_string(self):
        """Should handle non-numeric port gracefully."""
        routes = [
            {
                "@id": "abc12345-be",
                "handle": [
                    {
                        "upstreams": [
                            {"dial": "localhost:notaport"}
                        ]
                    }
                ]
            }
        ]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            port = get_caddy_route_port("abc12345", "be")
            assert port is None


class TestHasAdwRoute:
    """Tests for has_adw_route function."""

    def test_returns_true_when_route_exists(self):
        """Should return True when route exists."""
        routes = [{"@id": "abc12345-be"}]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            assert has_adw_route("abc12345", "be") is True

    def test_returns_false_when_route_not_exists(self):
        """Should return False when route doesn't exist."""
        routes = [{"@id": "other-be"}]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            assert has_adw_route("abc12345", "be") is False

    def test_handles_main_project_special_routes(self):
        """Should handle main project special route names."""
        routes = [{"@id": "main-backend"}]

        with patch('adw_modules.caddy_utils.get_caddy_routes', return_value=routes):
            assert has_adw_route("main", "be") is True


class TestGetAdwCaddyUrl:
    """Tests for get_adw_caddy_url function."""

    def test_returns_backend_url_when_route_exists(self):
        """Should return backend URL when route exists."""
        with patch('adw_modules.caddy_utils.has_adw_route', return_value=True):
            url = get_adw_caddy_url("abc12345", "be")
            assert url == "http://api.abc12345.localhost"

    def test_returns_frontend_url_when_route_exists(self):
        """Should return frontend URL when route exists."""
        with patch('adw_modules.caddy_utils.has_adw_route', return_value=True):
            url = get_adw_caddy_url("abc12345", "fe")
            assert url == "http://abc12345.localhost"

    def test_returns_websocket_url_when_route_exists(self):
        """Should return WebSocket URL when route exists."""
        with patch('adw_modules.caddy_utils.has_adw_route', return_value=True):
            url = get_adw_caddy_url("abc12345", "adw")
            assert url == "ws://adw.abc12345.localhost/ws/trigger"

    def test_returns_none_when_route_not_exists(self):
        """Should return None when route doesn't exist."""
        with patch('adw_modules.caddy_utils.has_adw_route', return_value=False):
            url = get_adw_caddy_url("abc12345", "be")
            assert url is None


class TestDetectServerUrl:
    """Tests for detect_server_url function."""

    def test_uses_websocket_url_env_var_first(self):
        """Should prioritize WEBSOCKET_URL environment variable."""
        with patch.dict(os.environ, {"WEBSOCKET_URL": "http://custom.example.com/"}):
            url = detect_server_url("abc12345")
            assert url == "http://custom.example.com"

    def test_uses_caddy_url_when_available(self):
        """Should use Caddy URL when WEBSOCKET_URL not set and Caddy available."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('adw_modules.caddy_utils.get_adw_caddy_url', return_value="http://api.abc12345.localhost"):
                url = detect_server_url("abc12345")
                assert url == "http://api.abc12345.localhost"

    def test_uses_websocket_port_env_var_as_fallback(self):
        """Should use WEBSOCKET_PORT when Caddy not available."""
        with patch.dict(os.environ, {"WEBSOCKET_PORT": "8505"}, clear=True):
            with patch('adw_modules.caddy_utils.get_adw_caddy_url', return_value=None):
                url = detect_server_url("abc12345")
                assert url == "http://localhost:8505"

    def test_defaults_to_port_8500(self):
        """Should default to port 8500 when no other options available."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('adw_modules.caddy_utils.get_adw_caddy_url', return_value=None):
                url = detect_server_url("abc12345")
                assert url == "http://localhost:8500"


class TestWtProtocolHostnameUtils:
    """Tests for WT protocol hostname utility functions."""

    def test_get_adw_hostname(self):
        """Should return correct hostname format."""
        assert get_adw_hostname("abc12345") == "abc12345.localhost"
        assert get_adw_hostname("main") == "main.localhost"

    def test_get_adw_api_url(self):
        """Should return correct API URL format."""
        assert get_adw_api_url("abc12345") == "http://api.abc12345.localhost"
        assert get_adw_api_url("main") == "http://api.main.localhost"

    def test_get_adw_websocket_url(self):
        """Should return correct WebSocket URL format."""
        assert get_adw_websocket_url("abc12345") == "ws://adw.abc12345.localhost/ws/trigger"
        assert get_adw_websocket_url("main") == "ws://adw.main.localhost/ws/trigger"
