"""Data types for document workflow utilities."""

from dataclasses import dataclass
from typing import Optional
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier


@dataclass
class DocumentInitContext:
    """Result of document workflow initialization phase."""
    issue_number: str
    adw_id: str
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier
    worktree_path: str


@dataclass
class DocumentSpecContext:
    """Result of spec file validation phase."""
    spec_file: str
    has_changes: bool


@dataclass
class DocumentResultContext:
    """Result of documentation generation phase."""
    documentation_created: bool
    documentation_path: Optional[str]
    success: bool
    error_message: Optional[str] = None
