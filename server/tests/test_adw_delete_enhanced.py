"""Enhanced tests for ADW deletion with comprehensive log cleanup and WebSocket verification."""

import pytest
import os
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient
from server import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def temp_agents_dir():
    """Create a temporary agents directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    # Cleanup after test
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)


@pytest.fixture
def mock_adw_with_logs(temp_agents_dir):
    """Create a mock ADW directory structure with logs."""
    adw_id = "test1234"
    adw_dir = temp_agents_dir / adw_id
    adw_dir.mkdir(parents=True)

    # Create adw_state.json
    state_file = adw_dir / "adw_state.json"
    state_data = {
        "adw_id": adw_id,
        "worktree_path": str(temp_agents_dir / "worktree" / adw_id),
        "websocket_port": 8002,
        "frontend_port": 5173
    }
    state_file.write_text(json.dumps(state_data))

    # Create multiple subdirectories with logs
    log_dirs = [
        adw_dir / "adw_plan_build",
        adw_dir / "trigger_webhook",
        adw_dir / "adw_test_iso",
        adw_dir / "adw_review_iso"
    ]

    for log_dir in log_dirs:
        log_dir.mkdir(parents=True)

        # Create execution.log
        execution_log = log_dir / "execution.log"
        execution_log.write_text("Test log content\nLine 2\nLine 3\n")

        # Create raw_output.jsonl
        raw_output = log_dir / "raw_output.jsonl"
        raw_output.write_text('{"event": "test"}\n{"event": "test2"}\n')

        # Create nested directory with logs
        nested_dir = log_dir / "nested" / "deep"
        nested_dir.mkdir(parents=True)
        nested_log = nested_dir / "nested.log"
        nested_log.write_text("Nested log content\n")

    # Create some additional state files
    (adw_dir / "workflow_state.json").write_text('{"status": "completed"}')
    (adw_dir / "metadata.json").write_text('{"created": "2025-01-01"}')

    return {
        "adw_id": adw_id,
        "adw_dir": adw_dir,
        "temp_agents_dir": temp_agents_dir,
        "log_dirs": log_dirs
    }


class TestEnhancedADWDeletion:
    """Enhanced tests for ADW deletion with comprehensive cleanup verification."""

    def test_delete_removes_all_subdirectories(self, mock_adw_with_logs):
        """Test that deletion removes all subdirectories including logs."""
        adw_id = mock_adw_with_logs["adw_id"]
        adw_dir = mock_adw_with_logs["adw_dir"]

        # Verify directory exists before deletion
        assert adw_dir.exists()
        assert (adw_dir / "adw_plan_build").exists()
        assert (adw_dir / "trigger_webhook").exists()

        # Mock the get_agents_directory to return our temp directory
        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            # Mock the WebSocket manager
            mock_ws_manager = MagicMock()
            mock_ws_manager.broadcast_system_log = AsyncMock()

            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)
                response = client.delete(f"/api/adws/{adw_id}")

        # Verify deletion succeeded
        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify directory and all subdirectories are removed
        assert not adw_dir.exists()

    def test_delete_removes_deeply_nested_logs(self, mock_adw_with_logs):
        """Test that deletion removes deeply nested log files."""
        adw_id = mock_adw_with_logs["adw_id"]
        adw_dir = mock_adw_with_logs["adw_dir"]

        # Verify nested files exist
        nested_log = adw_dir / "adw_plan_build" / "nested" / "deep" / "nested.log"
        assert nested_log.exists()

        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            mock_ws_manager = MagicMock()
            mock_ws_manager.broadcast_system_log = AsyncMock()

            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)
                response = client.delete(f"/api/adws/{adw_id}")

        assert response.status_code == 200
        assert not nested_log.exists()
        assert not adw_dir.exists()

    def test_delete_multiple_trigger_types(self, mock_adw_with_logs):
        """Test deletion with multiple trigger types and their logs."""
        adw_id = mock_adw_with_logs["adw_id"]
        log_dirs = mock_adw_with_logs["log_dirs"]

        # Verify all log directories exist
        for log_dir in log_dirs:
            assert log_dir.exists()
            assert (log_dir / "execution.log").exists()

        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            mock_ws_manager = MagicMock()
            mock_ws_manager.broadcast_system_log = AsyncMock()

            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)
                response = client.delete(f"/api/adws/{adw_id}")

        assert response.status_code == 200

        # Verify all log directories are removed
        for log_dir in log_dirs:
            assert not log_dir.exists()

    @pytest.mark.asyncio
    async def test_websocket_broadcast_on_success(self, mock_adw_with_logs):
        """Test that WebSocket broadcasts worktree_deleted event with correct payload."""
        adw_id = mock_adw_with_logs["adw_id"]

        mock_ws_manager = MagicMock()
        mock_ws_manager.broadcast_system_log = AsyncMock()

        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)
                response = client.delete(f"/api/adws/{adw_id}")

        # Verify WebSocket broadcast was called
        assert response.status_code == 200
        mock_ws_manager.broadcast_system_log.assert_called_once()

        # Verify the broadcast payload
        call_args = mock_ws_manager.broadcast_system_log.call_args
        assert call_args[1]['level'] == 'SUCCESS'
        assert call_args[1]['context']['adw_id'] == adw_id
        assert call_args[1]['context']['event_type'] == 'worktree_deleted'
        assert 'deleted successfully' in call_args[1]['message']

    def test_delete_removes_state_files(self, mock_adw_with_logs):
        """Test that deletion removes all state files (adw_state.json, metadata, etc)."""
        adw_id = mock_adw_with_logs["adw_id"]
        adw_dir = mock_adw_with_logs["adw_dir"]

        # Verify state files exist
        assert (adw_dir / "adw_state.json").exists()
        assert (adw_dir / "workflow_state.json").exists()
        assert (adw_dir / "metadata.json").exists()

        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            mock_ws_manager = MagicMock()
            mock_ws_manager.broadcast_system_log = AsyncMock()

            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)
                response = client.delete(f"/api/adws/{adw_id}")

        assert response.status_code == 200

        # Verify all state files are removed
        assert not (adw_dir / "adw_state.json").exists()
        assert not (adw_dir / "workflow_state.json").exists()
        assert not (adw_dir / "metadata.json").exists()

    def test_idempotent_deletion(self, mock_adw_with_logs):
        """Test that deleting the same ADW twice returns appropriate errors."""
        adw_id = mock_adw_with_logs["adw_id"]

        with patch('api.adws.get_agents_directory', return_value=mock_adw_with_logs["temp_agents_dir"]):
            mock_ws_manager = MagicMock()
            mock_ws_manager.broadcast_system_log = AsyncMock()

            with patch.object(app.state, 'ws_manager', mock_ws_manager):
                client = TestClient(app)

                # First deletion should succeed
                response1 = client.delete(f"/api/adws/{adw_id}")
                assert response1.status_code == 200

                # Second deletion should return 404
                response2 = client.delete(f"/api/adws/{adw_id}")
                assert response2.status_code == 404
                assert "not found" in response2.json()["detail"]

    @pytest.mark.asyncio
    async def test_websocket_broadcast_on_failure(self):
        """Test that WebSocket broadcasts worktree_delete_failed on errors."""
        adw_id = "test5678"

        # Create a temporary directory but make deletion fail by removing permissions
        temp_dir = tempfile.mkdtemp()
        adw_dir = Path(temp_dir) / adw_id
        adw_dir.mkdir(parents=True)

        # Create adw_state.json
        state_file = adw_dir / "adw_state.json"
        state_file.write_text('{"adw_id": "test5678"}')

        mock_ws_manager = MagicMock()
        mock_ws_manager.broadcast_system_log = AsyncMock()

        try:
            # Mock shutil.rmtree to raise an exception
            with patch('api.adws.get_agents_directory', return_value=Path(temp_dir)):
                with patch('shutil.rmtree', side_effect=PermissionError("Permission denied")):
                    with patch.object(app.state, 'ws_manager', mock_ws_manager):
                        client = TestClient(app)
                        response = client.delete(f"/api/adws/{adw_id}")

            # Verify error response
            assert response.status_code == 500

            # Verify error WebSocket broadcast was called
            calls = mock_ws_manager.broadcast_system_log.call_args_list
            assert any(
                call[1].get('context', {}).get('event_type') == 'worktree_delete_failed'
                for call in calls
            )
        finally:
            # Cleanup
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
