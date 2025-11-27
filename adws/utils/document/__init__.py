"""Document workflow utilities.

This module provides high-level functions for the adw_document_iso.py workflow.
Each function encapsulates a logical phase of the documentation workflow.

Usage:
    from utils.document import (
        initialize_document_workflow,
        check_for_changes,
        find_and_validate_spec,
        generate_documentation,
        track_kpis,
        finalize_document,
    )
"""

# Re-export types
from .types import (
    DocumentInitContext,
    DocumentSpecContext,
    DocumentResultContext,
)

# Re-export functions
from .initialization import initialize_document_workflow, parse_cli_arguments
from .changes import check_for_changes
from .spec import find_and_validate_spec
from .generation import generate_documentation
from .kpi_tracking import track_kpis
from .finalization import finalize_document

__all__ = [
    # Types
    "DocumentInitContext",
    "DocumentSpecContext",
    "DocumentResultContext",
    # Functions
    "initialize_document_workflow",
    "parse_cli_arguments",
    "check_for_changes",
    "find_and_validate_spec",
    "generate_documentation",
    "track_kpis",
    "finalize_document",
]
