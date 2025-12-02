"""Tests for stage_logs API endpoint functionality."""

import pytest
import tempfile
import json
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

from server.api.stage_logs import (
    parse_execution_log,
    parse_jsonl_logs,
    parse_result_json,
    find_stage_folder,
    get_agents_directory,
    ExecutionLogEntry,
    LogEntry,
    STAGE_TO_FOLDERS,
    STAGE_TO_ISO_FOLDER,
)


class TestParseExecutionLog:
    """Test cases for parse_execution_log function."""

    def test_parse_standard_log_format(self, tmp_path):
        """Test parsing standard execution.log format."""
        log_content = """2025-11-28 21:49:19 - INFO - Starting stage execution
2025-11-28 21:49:20 - DEBUG - Loading configuration
2025-11-28 21:49:21 - ERROR - Failed to connect
2025-11-28 21:49:22 - WARNING - Retrying connection
"""
        log_file = tmp_path / "execution.log"
        log_file.write_text(log_content)

        logs = parse_execution_log(log_file)

        assert len(logs) == 4
        assert logs[0].timestamp == "2025-11-28 21:49:19"
        assert logs[0].level == "INFO"
        assert logs[0].message == "Starting stage execution"

        assert logs[1].level == "DEBUG"
        assert logs[2].level == "ERROR"
        assert logs[3].level == "WARNING"

    def test_parse_empty_log_file(self, tmp_path):
        """Test parsing empty log file."""
        log_file = tmp_path / "execution.log"
        log_file.write_text("")

        logs = parse_execution_log(log_file)
        assert len(logs) == 0

    def test_parse_log_with_blank_lines(self, tmp_path):
        """Test parsing log file with blank lines."""
        log_content = """2025-11-28 21:49:19 - INFO - First message

2025-11-28 21:49:20 - INFO - Second message
"""
        log_file = tmp_path / "execution.log"
        log_file.write_text(log_content)

        logs = parse_execution_log(log_file)
        assert len(logs) == 2

    def test_parse_log_with_multiline_messages(self, tmp_path):
        """Test parsing log with lines that don't match pattern."""
        log_content = """2025-11-28 21:49:19 - INFO - Starting execution
This is a continuation line without timestamp
2025-11-28 21:49:20 - INFO - Next message
"""
        log_file = tmp_path / "execution.log"
        log_file.write_text(log_content)

        logs = parse_execution_log(log_file)
        assert len(logs) == 3
        # Non-matching line should be added with INFO level
        assert logs[1].message == "This is a continuation line without timestamp"
        assert logs[1].level == "INFO"
        assert logs[1].timestamp is None

    def test_parse_log_preserves_raw_line(self, tmp_path):
        """Test that raw_line is preserved in log entries."""
        log_content = "2025-11-28 21:49:19 - INFO - Test message"
        log_file = tmp_path / "execution.log"
        log_file.write_text(log_content)

        logs = parse_execution_log(log_file)
        assert logs[0].raw_line == log_content


class TestParseJsonlLogs:
    """Test cases for parse_jsonl_logs function."""

    def test_parse_system_message(self, tmp_path):
        """Test parsing system type messages."""
        jsonl_content = '{"type": "system", "subtype": "init", "message": "Agent initialized"}\n'
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(jsonl_content)

        logs = parse_jsonl_logs(jsonl_file)
        assert len(logs) == 1
        assert logs[0].entry_type == "system"
        assert logs[0].subtype == "init"
        assert logs[0].message == "Agent initialized"
        assert logs[0].level == "INFO"

    def test_parse_assistant_message_with_tool_use(self, tmp_path):
        """Test parsing assistant message with tool_use block."""
        # Real structure from raw_output.jsonl files
        assistant_msg = {
            "type": "assistant",
            "message": {
                "model": "claude-sonnet-4-5-20250929",
                "id": "msg_test123",
                "type": "message",
                "role": "assistant",
                "content": [
                    {"type": "tool_use", "id": "toolu_test", "name": "Read", "input": {"file_path": "/test.txt"}}
                ],
                "stop_reason": "tool_use",
                "usage": {"input_tokens": 100, "output_tokens": 50}
            },
            "session_id": "test-session-id"
        }
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(json.dumps(assistant_msg) + "\n")

        logs = parse_jsonl_logs(jsonl_file)
        assert len(logs) == 1
        assert logs[0].entry_type == "assistant"
        assert logs[0].tool_name == "Read"
        assert logs[0].tool_input == {"file_path": "/test.txt"}
        assert logs[0].model == "claude-sonnet-4-5-20250929"
        assert logs[0].stop_reason == "tool_use"
        assert logs[0].session_id == "test-session-id"
        # Message should be extracted from tool_use block
        assert "[Tool: Read]" in logs[0].message

    def test_parse_result_success(self, tmp_path):
        """Test parsing result type with success subtype."""
        result_msg = {"type": "result", "subtype": "success", "result": "Task completed"}
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(json.dumps(result_msg) + "\n")

        logs = parse_jsonl_logs(jsonl_file)
        assert len(logs) == 1
        assert logs[0].entry_type == "result"
        assert logs[0].subtype == "success"
        assert logs[0].level == "SUCCESS"

    def test_parse_result_error(self, tmp_path):
        """Test parsing result type with error subtype."""
        result_msg = {"type": "result", "subtype": "error", "result": "Task failed"}
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(json.dumps(result_msg) + "\n")

        logs = parse_jsonl_logs(jsonl_file)
        assert len(logs) == 1
        assert logs[0].level == "ERROR"

    def test_parse_malformed_json_line(self, tmp_path):
        """Test handling of malformed JSON lines."""
        jsonl_content = '{"valid": "json"}\nnot valid json\n{"another": "valid"}\n'
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(jsonl_content)

        logs = parse_jsonl_logs(jsonl_file)
        # Should have 3 entries - 2 valid + 1 error entry for malformed line
        assert len(logs) == 3
        # Check that malformed line was captured
        assert "not valid json" in logs[1].message

    def test_parse_empty_jsonl_file(self, tmp_path):
        """Test parsing empty JSONL file."""
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text("")

        logs = parse_jsonl_logs(jsonl_file)
        assert len(logs) == 0

    def test_parse_message_with_timestamp(self, tmp_path):
        """Test parsing message with timestamp field."""
        msg = {"type": "system", "message": "Test", "timestamp": "2025-11-28T21:49:19Z"}
        jsonl_file = tmp_path / "raw_output.jsonl"
        jsonl_file.write_text(json.dumps(msg) + "\n")

        logs = parse_jsonl_logs(jsonl_file)
        assert logs[0].timestamp == "2025-11-28T21:49:19Z"


class TestParseResultJson:
    """Test cases for parse_result_json function."""

    def test_parse_valid_json_result(self, tmp_path):
        """Test parsing valid JSON result file."""
        result = {"status": "success", "data": {"key": "value"}}
        json_file = tmp_path / "raw_output.json"
        json_file.write_text(json.dumps(result))

        parsed = parse_result_json(json_file)
        assert parsed == result

    def test_parse_invalid_json_result(self, tmp_path):
        """Test parsing invalid JSON returns error dict."""
        json_file = tmp_path / "raw_output.json"
        json_file.write_text("not valid json")

        parsed = parse_result_json(json_file)
        assert "error" in parsed

    def test_parse_nonexistent_file(self, tmp_path):
        """Test parsing nonexistent file returns None."""
        json_file = tmp_path / "nonexistent.json"

        parsed = parse_result_json(json_file)
        assert parsed is None


class TestFindStageFolder:
    """Test cases for find_stage_folder function."""

    def test_find_plan_stage_folder(self, tmp_path):
        """Test finding plan stage folder."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()
        (adw_dir / "sdlc_planner").mkdir()

        result = find_stage_folder(adw_dir, "plan")
        assert result is not None
        assert result.name == "sdlc_planner"

    def test_find_build_stage_folder(self, tmp_path):
        """Test finding build stage folder."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()
        (adw_dir / "sdlc_implementor").mkdir()

        result = find_stage_folder(adw_dir, "build")
        assert result is not None
        assert result.name == "sdlc_implementor"

    def test_find_test_stage_folder_with_pattern(self, tmp_path):
        """Test finding test stage folder with pattern match."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()
        (adw_dir / "e2e_test_runner_abc123").mkdir()

        result = find_stage_folder(adw_dir, "test")
        assert result is not None
        assert result.name.startswith("e2e_test_runner_")

    def test_find_review_stage_folder_with_pattern(self, tmp_path):
        """Test finding review stage folder with pattern match."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()
        (adw_dir / "in_loop_review_xyz789").mkdir()

        result = find_stage_folder(adw_dir, "review")
        assert result is not None
        assert result.name.startswith("in_loop_review_")

    def test_find_stage_folder_not_found(self, tmp_path):
        """Test when stage folder doesn't exist."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()

        result = find_stage_folder(adw_dir, "plan")
        assert result is None

    def test_find_stage_folder_case_insensitive(self, tmp_path):
        """Test stage name is case insensitive."""
        adw_dir = tmp_path / "test_adw"
        adw_dir.mkdir()
        (adw_dir / "sdlc_planner").mkdir()

        result = find_stage_folder(adw_dir, "PLAN")
        assert result is not None
        assert result.name == "sdlc_planner"


class TestStageMappings:
    """Test cases for stage mapping constants."""

    def test_stage_to_folders_has_all_stages(self):
        """Test STAGE_TO_FOLDERS has all required stages."""
        expected_stages = ["plan", "build", "test", "review", "document"]
        for stage in expected_stages:
            assert stage in STAGE_TO_FOLDERS

    def test_stage_to_iso_folder_has_all_stages(self):
        """Test STAGE_TO_ISO_FOLDER has all required stages."""
        expected_stages = ["plan", "build", "test", "review", "document"]
        for stage in expected_stages:
            assert stage in STAGE_TO_ISO_FOLDER

    def test_iso_folders_follow_naming_convention(self):
        """Test ISO folders follow adw_{stage}_iso naming."""
        for stage, folder in STAGE_TO_ISO_FOLDER.items():
            assert folder == f"adw_{stage}_iso"


class TestExecutionLogEntry:
    """Test cases for ExecutionLogEntry model."""

    def test_default_values(self):
        """Test ExecutionLogEntry default values."""
        entry = ExecutionLogEntry()
        assert entry.timestamp is None
        assert entry.level == "INFO"
        assert entry.message == ""
        assert entry.raw_line is None

    def test_with_all_fields(self):
        """Test ExecutionLogEntry with all fields populated."""
        entry = ExecutionLogEntry(
            timestamp="2025-11-28 21:49:19",
            level="ERROR",
            message="Test error message",
            raw_line="2025-11-28 21:49:19 - ERROR - Test error message"
        )
        assert entry.timestamp == "2025-11-28 21:49:19"
        assert entry.level == "ERROR"
        assert entry.message == "Test error message"


class TestLogEntry:
    """Test cases for LogEntry model."""

    def test_default_values(self):
        """Test LogEntry default values."""
        entry = LogEntry()
        assert entry.timestamp is None
        assert entry.level is None
        assert entry.message is None
        assert entry.entry_type is None
        assert entry.subtype is None
        assert entry.tool_name is None

    def test_with_tool_use_fields(self):
        """Test LogEntry with tool use fields."""
        entry = LogEntry(
            entry_type="assistant",
            subtype="tool_use",
            tool_name="Read",
            tool_input={"file_path": "/test.txt"},
            model="claude-3-opus"
        )
        assert entry.tool_name == "Read"
        assert entry.tool_input == {"file_path": "/test.txt"}
        assert entry.model == "claude-3-opus"
