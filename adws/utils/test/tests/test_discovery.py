"""Tests for test discovery module."""

from unittest.mock import patch
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))


class TestDiscoverAdwTests:
    """Tests for discover_adw_tests function."""

    @patch('utils.test.discovery.os.path.exists')
    @patch('utils.test.discovery.glob.glob')
    def test_discovers_backend_tests(self, mock_glob, mock_exists):
        """Should discover Python backend tests."""
        from utils.test.discovery import discover_adw_tests

        mock_exists.return_value = True
        mock_glob.side_effect = [
            ["/path/agents/test1234/tests/unit_test/backend/test_foo.py"],  # backend
            [], [], [], [],  # frontend patterns
            []  # e2e
        ]

        result = discover_adw_tests("test1234", "/path")

        assert len(result.backend_tests) == 1
        assert "test_foo.py" in result.backend_tests[0]

    @patch('utils.test.discovery.os.path.exists')
    @patch('utils.test.discovery.glob.glob')
    def test_discovers_frontend_tests(self, mock_glob, mock_exists):
        """Should discover JavaScript/TypeScript frontend tests."""
        from utils.test.discovery import discover_adw_tests

        mock_exists.return_value = True
        mock_glob.side_effect = [
            [],  # backend
            ["/path/agents/test1234/tests/unit_test/frontend/component.test.js"],  # js
            ["/path/agents/test1234/tests/unit_test/frontend/hook.test.jsx"],  # jsx
            [],  # ts
            [],  # tsx
            []  # e2e
        ]

        result = discover_adw_tests("test1234", "/path")

        assert len(result.frontend_tests) == 2
        assert any("component.test.js" in t for t in result.frontend_tests)
        assert any("hook.test.jsx" in t for t in result.frontend_tests)

    @patch('utils.test.discovery.os.path.exists')
    @patch('utils.test.discovery.glob.glob')
    def test_discovers_e2e_tests(self, mock_glob, mock_exists):
        """Should discover E2E markdown tests."""
        from utils.test.discovery import discover_adw_tests

        mock_exists.return_value = True
        mock_glob.side_effect = [
            [],  # backend
            [], [], [], [],  # frontend patterns
            ["/path/agents/test1234/tests/e2e/test_feature.md"]  # e2e
        ]

        result = discover_adw_tests("test1234", "/path")

        assert len(result.e2e_tests) == 1
        assert "test_feature.md" in result.e2e_tests[0]

    @patch('utils.test.discovery.os.path.exists')
    def test_returns_empty_when_no_tests_dir(self, mock_exists):
        """Should return empty lists when tests directory doesn't exist."""
        from utils.test.discovery import discover_adw_tests

        mock_exists.return_value = False

        result = discover_adw_tests("test1234", "/path")

        assert result.backend_tests == []
        assert result.frontend_tests == []
        assert result.e2e_tests == []


class TestGetAdwTestPaths:
    """Tests for get_adw_test_paths function."""

    def test_returns_correct_paths(self):
        """Should return correct directory paths."""
        from utils.test.discovery import get_adw_test_paths

        paths = get_adw_test_paths("test1234", "/base")

        assert paths["backend_tests"] == "/base/agents/test1234/tests/unit_test/backend"
        assert paths["frontend_tests"] == "/base/agents/test1234/tests/unit_test/frontend"
        assert paths["e2e_tests"] == "/base/agents/test1234/tests/e2e"

    @patch('utils.test.discovery.os.getcwd')
    def test_uses_cwd_when_no_path(self, mock_getcwd):
        """Should use current working directory when no path provided."""
        from utils.test.discovery import get_adw_test_paths

        mock_getcwd.return_value = "/current"

        paths = get_adw_test_paths("test1234")

        assert "/current/agents/test1234" in paths["backend_tests"]


class TestEnsureAdwTestDirs:
    """Tests for ensure_adw_test_dirs function."""

    @patch('utils.test.discovery.os.makedirs')
    def test_creates_all_directories(self, mock_makedirs):
        """Should create all test directories."""
        from utils.test.discovery import ensure_adw_test_dirs

        ensure_adw_test_dirs("test1234", "/base")

        assert mock_makedirs.call_count == 3
        mock_makedirs.assert_any_call("/base/agents/test1234/tests/unit_test/backend", exist_ok=True)
        mock_makedirs.assert_any_call("/base/agents/test1234/tests/unit_test/frontend", exist_ok=True)
        mock_makedirs.assert_any_call("/base/agents/test1234/tests/e2e", exist_ok=True)


class TestHasAdwTests:
    """Tests for has_adw_tests function."""

    @patch('utils.test.discovery.discover_adw_tests')
    def test_returns_true_when_tests_exist(self, mock_discover):
        """Should return True when tests are found."""
        from utils.test.discovery import has_adw_tests, DiscoveredTests

        mock_discover.return_value = DiscoveredTests(
            backend_tests=["test.py"],
            frontend_tests=[],
            e2e_tests=[]
        )

        assert has_adw_tests("test1234") is True

    @patch('utils.test.discovery.discover_adw_tests')
    def test_returns_false_when_no_tests(self, mock_discover):
        """Should return False when no tests are found."""
        from utils.test.discovery import has_adw_tests, DiscoveredTests

        mock_discover.return_value = DiscoveredTests(
            backend_tests=[],
            frontend_tests=[],
            e2e_tests=[]
        )

        assert has_adw_tests("test1234") is False
