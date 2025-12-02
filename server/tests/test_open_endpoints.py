"""Tests for ADW open codebase and worktree endpoints."""

import pytest
from unittest.mock import patch, MagicMock

# Note: client fixture is provided by conftest.py


class TestOpenCodebaseEndpoint:
    """Tests for the POST /api/codebase/open/{adw_id} endpoint."""

    def test_open_codebase_invalid_id_format_too_short(self, client):
        """Test opening with too short ADW ID."""
        response = client.post("/api/codebase/open/short")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_open_codebase_invalid_id_format_special_chars(self, client):
        """Test opening with special characters in ADW ID."""
        response = client.post("/api/codebase/open/test@123")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_open_codebase_not_found(self, client):
        """Test opening non-existent ADW."""
        response = client.post("/api/codebase/open/zzzz9999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_open_codebase_endpoint_exists(self, client):
        """Test that the codebase open endpoint is registered and accessible."""
        response = client.post("/api/codebase/open/testtest")
        assert response.status_code in [400, 404, 200]

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    @patch('subprocess.run')
    def test_open_codebase_success_new_session(
        self, mock_run, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test successful codebase opening with new tmux session."""
        from pathlib import Path
        import tempfile

        # Create a temporary directory to act as agents dir
        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/tmp/test_worktree"
            }
            mock_exists.return_value = True

            # First call - check session (not found)
            # Second call - create session (success)
            mock_run.side_effect = [
                MagicMock(returncode=1),  # Session doesn't exist
                MagicMock(returncode=0, stderr="")  # Create session succeeds
            ]

            response = client.post("/api/codebase/open/test1234")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["adw_id"] == "test1234"
            assert "tmux_session" in data
            assert "window_name" in data

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    @patch('subprocess.run')
    def test_open_codebase_success_existing_session(
        self, mock_run, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test successful codebase opening with existing tmux session."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/tmp/test_worktree"
            }
            mock_exists.return_value = True

            # Session exists, create new window
            mock_run.side_effect = [
                MagicMock(returncode=0),  # Session exists
                MagicMock(returncode=0, stderr="")  # Create window succeeds
            ]

            response = client.post("/api/codebase/open/test1234")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    def test_open_codebase_missing_worktree_path(
        self, mock_read_state, mock_agents_dir, client
    ):
        """Test opening when worktree path is missing from state."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234"
                # No worktree_path
            }

            response = client.post("/api/codebase/open/test1234")

            assert response.status_code == 404
            assert "Worktree path not found" in response.json()["detail"]


class TestOpenWorktreeEndpoint:
    """Tests for the POST /api/worktree/open/{adw_id} endpoint."""

    def test_open_worktree_invalid_id_format_too_short(self, client):
        """Test opening with too short ADW ID."""
        response = client.post("/api/worktree/open/short")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_open_worktree_invalid_id_format_special_chars(self, client):
        """Test opening with special characters in ADW ID."""
        response = client.post("/api/worktree/open/test@123")
        assert response.status_code == 400
        assert "Invalid ADW ID format" in response.json()["detail"]

    def test_open_worktree_not_found(self, client):
        """Test opening non-existent ADW."""
        response = client.post("/api/worktree/open/zzzz9999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_open_worktree_endpoint_exists(self, client):
        """Test that the worktree open endpoint is registered and accessible."""
        response = client.post("/api/worktree/open/testtest")
        assert response.status_code in [400, 404, 200]

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    @patch('subprocess.run')
    @patch('subprocess.Popen')
    def test_open_worktree_success_new_session(
        self, mock_popen, mock_run, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test successful worktree opening with new tmux session."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/tmp/test_worktree"
            }
            mock_exists.return_value = True

            # Session doesn't exist, create new
            mock_run.side_effect = [
                MagicMock(returncode=1),  # Session doesn't exist
                MagicMock(returncode=0, stderr="")  # Create session succeeds
            ]
            mock_popen.return_value = MagicMock()

            response = client.post("/api/worktree/open/test1234")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["adw_id"] == "test1234"
            assert "tmux_session" in data
            assert "window_name" in data

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    @patch('subprocess.run')
    @patch('subprocess.Popen')
    def test_open_worktree_success_existing_session(
        self, mock_popen, mock_run, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test successful worktree opening with existing tmux session."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/tmp/test_worktree"
            }
            mock_exists.return_value = True

            # Session exists
            mock_run.side_effect = [
                MagicMock(returncode=0),  # Session exists
                MagicMock(returncode=0, stderr="")  # Create window succeeds
            ]
            mock_popen.return_value = MagicMock()

            response = client.post("/api/worktree/open/test1234")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    @patch('subprocess.run')
    @patch('subprocess.Popen')
    def test_open_worktree_wezterm_not_found(
        self, mock_popen, mock_run, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test worktree opening when WezTerm is not found."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/tmp/test_worktree"
            }
            mock_exists.return_value = True

            mock_run.side_effect = [
                MagicMock(returncode=0),  # Session exists
                MagicMock(returncode=0, stderr="")  # Create window succeeds
            ]
            mock_popen.side_effect = FileNotFoundError("wezterm not found")

            # Should still succeed even if WezTerm not found
            response = client.post("/api/worktree/open/test1234")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    @patch('api.adws.get_agents_directory')
    @patch('api.adws.read_adw_state')
    @patch('os.path.exists')
    def test_open_worktree_path_not_exists(
        self, mock_exists, mock_read_state, mock_agents_dir, client
    ):
        """Test opening when worktree directory doesn't exist."""
        from pathlib import Path
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            agents_path = Path(tmpdir)
            adw_dir = agents_path / "test1234"
            adw_dir.mkdir()

            mock_agents_dir.return_value = agents_path
            mock_read_state.return_value = {
                "adw_id": "test1234",
                "worktree_path": "/nonexistent/path"
            }
            mock_exists.return_value = False

            response = client.post("/api/worktree/open/test1234")

            assert response.status_code == 404
            assert "Worktree not found at path" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
