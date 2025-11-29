#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest"]
# ///

"""
Unit tests for parse_jsonl_logs function in trigger_websocket.py.

Tests the JSONL parsing logic that extracts and derives subtypes from
Claude Code agent output content blocks.
"""

import sys
import os
import json
import tempfile
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trigger_websocket import parse_jsonl_logs


class TestParseJsonlLogs:
    """Test cases for parse_jsonl_logs function."""

    def create_temp_jsonl(self, entries):
        """Create a temporary JSONL file with given entries."""
        fd, path = tempfile.mkstemp(suffix='.jsonl')
        with os.fdopen(fd, 'w') as f:
            for entry in entries:
                f.write(json.dumps(entry) + '\n')
        return Path(path)

    def test_empty_file(self):
        """Test parsing an empty file returns empty list."""
        temp_file = self.create_temp_jsonl([])
        try:
            logs = parse_jsonl_logs(temp_file)
            assert logs == []
        finally:
            temp_file.unlink()

    def test_basic_entry_parsing(self):
        """Test parsing basic log entries with explicit subtypes."""
        entries = [
            {"type": "assistant", "subtype": "text", "message": "Hello world"}
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'assistant'
            assert logs[0]['subtype'] == 'text'
        finally:
            temp_file.unlink()

    def test_derive_subtype_from_text_content_block(self):
        """Test deriving 'text' subtype from message content blocks."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "text", "text": "This is a text response."}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'assistant'
            assert logs[0]['subtype'] == 'text'
            assert 'This is a text response.' in logs[0]['message']
        finally:
            temp_file.unlink()

    def test_derive_subtype_from_tool_use_content_block(self):
        """Test deriving 'tool_use' subtype from message content blocks."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Read", "input": {"file_path": "/test.py"}}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'assistant'
            assert logs[0]['subtype'] == 'tool_use'
            assert logs[0]['tool_name'] == 'Read'
        finally:
            temp_file.unlink()

    def test_derive_subtype_from_thinking_content_block(self):
        """Test deriving 'thinking' subtype from message content blocks."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "thinking", "thinking": "Let me analyze this..."}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'assistant'
            assert logs[0]['subtype'] == 'thinking'
            assert 'Let me analyze this...' in logs[0]['message']
        finally:
            temp_file.unlink()

    def test_derive_subtype_from_tool_result_content_block(self):
        """Test deriving 'tool_result' subtype from message content blocks."""
        entries = [
            {
                "type": "user",
                "message": {
                    "content": [
                        {"type": "tool_result", "content": "File contents here"}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'user'
            assert logs[0]['subtype'] == 'tool_result'
        finally:
            temp_file.unlink()

    def test_subtype_priority_thinking_over_tool_use(self):
        """Test that 'thinking' subtype takes priority over 'tool_use'."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "thinking", "thinking": "Let me think..."},
                        {"type": "tool_use", "name": "Read", "input": {}}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            # Thinking should take priority
            assert logs[0]['subtype'] == 'thinking'
        finally:
            temp_file.unlink()

    def test_subtype_priority_tool_use_over_text(self):
        """Test that 'tool_use' subtype takes priority over 'text'."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "text", "text": "I'll read the file."},
                        {"type": "tool_use", "name": "Read", "input": {}}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            # Tool use should take priority over text
            assert logs[0]['subtype'] == 'tool_use'
        finally:
            temp_file.unlink()

    def test_explicit_subtype_not_overridden(self):
        """Test that explicit subtype is not overridden by content blocks."""
        entries = [
            {
                "type": "assistant",
                "subtype": "file_changed",
                "message": {
                    "content": [
                        {"type": "text", "text": "File modified."}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            # Explicit subtype should be preserved
            assert logs[0]['subtype'] == 'file_changed'
        finally:
            temp_file.unlink()

    def test_multiple_entries(self):
        """Test parsing multiple log entries."""
        entries = [
            {
                "type": "system",
                "subtype": "init",
                "message": "Agent initialized"
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "thinking", "thinking": "Analyzing..."}
                    ]
                }
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Edit", "input": {"file_path": "/test.py"}}
                    ]
                }
            },
            {
                "type": "user",
                "message": {
                    "content": [
                        {"type": "tool_result", "content": "Edit successful"}
                    ]
                }
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "text", "text": "Done editing."}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 5

            # Check each entry's derived subtype
            assert logs[0]['subtype'] == 'init'
            assert logs[1]['subtype'] == 'thinking'
            assert logs[2]['subtype'] == 'tool_use'
            assert logs[3]['subtype'] == 'tool_result'
            assert logs[4]['subtype'] == 'text'
        finally:
            temp_file.unlink()

    def test_tool_name_extraction(self):
        """Test that tool_name is extracted correctly from tool_use blocks."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Bash", "input": {"command": "ls -la"}}
                    ]
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['tool_name'] == 'Bash'
            assert logs[0]['tool_input'] == {"command": "ls -la"}
        finally:
            temp_file.unlink()

    def test_missing_message_field(self):
        """Test handling entries without message field."""
        entries = [
            {"type": "assistant"}
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['entry_type'] == 'assistant'
        finally:
            temp_file.unlink()

    def test_string_message(self):
        """Test handling entries with string message (not dict)."""
        entries = [
            {"type": "assistant", "message": "Simple text message"}
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['message'] == "Simple text message"
        finally:
            temp_file.unlink()

    def test_invalid_json_lines_included_with_error(self):
        """Test that invalid JSON lines are included with parse error info."""
        fd, path = tempfile.mkstemp(suffix='.jsonl')
        with os.fdopen(fd, 'w') as f:
            f.write('{"type": "assistant", "subtype": "text", "message": "valid"}\n')
            f.write('this is not valid json\n')
            f.write('{"type": "user", "subtype": "tool_result", "message": "also valid"}\n')

        temp_file = Path(path)
        try:
            logs = parse_jsonl_logs(temp_file)
            # All 3 entries should be included (including parse error)
            assert len(logs) == 3
            # Second entry should contain parse error info
            assert 'parse_error' in logs[1]['raw_data']
        finally:
            temp_file.unlink()

    def test_empty_content_list(self):
        """Test handling empty content list in message."""
        entries = [
            {
                "type": "assistant",
                "message": {
                    "content": []
                }
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            # No subtype derived since content is empty
            assert logs[0]['subtype'] is None
        finally:
            temp_file.unlink()

    def test_file_not_found(self):
        """Test handling non-existent file raises FileNotFoundError."""
        import pytest
        with pytest.raises(FileNotFoundError):
            parse_jsonl_logs(Path('/non/existent/file.jsonl'))

    def test_timestamp_preservation(self):
        """Test that timestamps from entries are preserved."""
        entries = [
            {
                "type": "assistant",
                "timestamp": "2024-01-01T12:00:00Z",
                "message": "Test message"
            }
        ]
        temp_file = self.create_temp_jsonl(entries)
        try:
            logs = parse_jsonl_logs(temp_file)
            assert len(logs) == 1
            assert logs[0]['timestamp'] == "2024-01-01T12:00:00Z"
        finally:
            temp_file.unlink()


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])
