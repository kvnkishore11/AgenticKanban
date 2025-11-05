"""
Server Modules Package

This package contains specialized modules for workflow execution enhancement:
- file_tracker: Track file read/write operations and generate git diffs
- hook_system: Hook infrastructure for pre/post tool execution
- summarization_service: AI summarization for file changes and events
"""

from .file_tracker import FileTracker
from .hook_system import HookSystem, HookType, HookPriority, Hook, with_hooks
from .summarization_service import SummarizationService

__all__ = [
    "FileTracker",
    "HookSystem",
    "HookType",
    "HookPriority",
    "Hook",
    "with_hooks",
    "SummarizationService"
]
