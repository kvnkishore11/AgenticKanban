"""State management for ADW composable architecture.

Provides persistent state management via database storage and
transient state passing between scripts via stdin/stdout.

Database-Only Mode (ADW_DB_ONLY=true):
- All state reads/writes go directly to SQLite database
- No JSON file I/O
- Single source of truth for ADW state
"""

import json
import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from adw_modules.data_types import ADWStateData
from adw_modules.websocket_client import WebSocketNotifier

# Database imports
try:
    import sqlite3
    from pathlib import Path
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


class ADWState:
    """Container for ADW workflow state with database persistence.

    Storage Modes:
    - ADW_DB_ONLY=true (default): Database-only storage, no JSON files
    - ADW_DB_ONLY=false: Dual-write mode (JSON files + database sync)
    """

    STATE_FILENAME = "adw_state.json"

    def __init__(self, adw_id: str):
        """Initialize ADWState with a required ADW ID.

        Args:
            adw_id: The ADW ID for this state (required)
        """
        if not adw_id:
            raise ValueError("adw_id is required for ADWState")

        self.adw_id = adw_id
        # Start with minimal state
        self.data: Dict[str, Any] = {"adw_id": self.adw_id}
        self.logger = logging.getLogger(__name__)

        # Initialize WebSocket notifier for real-time state updates
        self._ws_notifier: Optional[WebSocketNotifier] = None
        try:
            self._ws_notifier = WebSocketNotifier(adw_id=self.adw_id)
        except Exception as e:
            self.logger.debug(f"WebSocket notifier initialization skipped: {e}")

        # Database-only mode (default: true for single source of truth)
        self._db_only_mode = os.getenv("ADW_DB_ONLY", "true").lower() == "true" and DB_AVAILABLE

    def update(self, **kwargs):
        """Update state with new key-value pairs."""
        # Filter to only our core fields
        core_fields = {"adw_id", "issue_number", "branch_name", "plan_file", "issue_class", "worktree_path", "backend_port", "websocket_port", "frontend_port", "model_set", "all_adws", "data_source", "issue_json", "completed", "patch_file", "patch_history", "patch_source_mode", "orchestrator"}
        for key, value in kwargs.items():
            if key in core_fields:
                self.data[key] = value

    def get(self, key: str, default=None):
        """Get value from state by key."""
        return self.data.get(key, default)

    def append_adw_id(self, adw_id: str):
        """Append an ADW ID to the all_adws list if not already present."""
        all_adws = self.data.get("all_adws", [])
        if adw_id not in all_adws:
            all_adws.append(adw_id)
            self.data["all_adws"] = all_adws

    def mark_completed(self):
        """Mark the workflow as completed."""
        self.data["completed"] = True
        self.logger.info(f"Marked ADW {self.adw_id} as completed")

    def is_completed(self) -> bool:
        """Check if the workflow is completed."""
        return self.data.get("completed", False)

    def get_working_directory(self) -> str:
        """Get the working directory for this ADW instance.
        
        Returns worktree_path if set (for isolated workflows),
        otherwise returns the main repo path.
        """
        worktree_path = self.data.get("worktree_path")
        if worktree_path:
            return worktree_path
        
        # Return main repo path (parent of adws directory)
        return os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )

    def get_state_path(self) -> str:
        """Get path to state file."""
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return os.path.join(project_root, "agents", self.adw_id, self.STATE_FILENAME)

    def notify_state_change(
        self,
        workflow_step: Optional[str] = None,
        changed_fields: Optional[list] = None
    ) -> None:
        """
        Send real-time state change notification via WebSocket.

        Args:
            workflow_step: Current workflow step
            changed_fields: List of fields that changed (optional)
        """
        if not self._ws_notifier:
            return

        try:
            # Prepare state change payload
            state_snapshot = {
                "adw_id": self.adw_id,
                "issue_number": self.data.get("issue_number"),
                "issue_class": self.data.get("issue_class"),
                "branch_name": self.data.get("branch_name"),
                "completed": self.data.get("completed", False),
                "workflow_step": workflow_step,
                "changed_fields": changed_fields or []
            }

            # Determine status
            status = "completed" if self.data.get("completed") else "in_progress"

            # Send state update via WebSocket
            import requests
            from datetime import datetime

            endpoint = f"{self._ws_notifier.server_url}/api/agent-state-update"
            payload = {
                "adw_id": self.adw_id,
                "event_type": "state_change",
                "data": {
                    "status": status,
                    "workflow_name": workflow_step,
                    "current_step": workflow_step,
                    "message": f"State updated: {workflow_step}" if workflow_step else "State updated",
                    "state_snapshot": state_snapshot
                },
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }

            requests.post(endpoint, json=payload, timeout=2)
            self.logger.debug(f"Sent state change notification for {self.adw_id}")

        except Exception as e:
            # Fail silently - state notifications are optional
            self.logger.debug(f"Failed to send state change notification: {e}")

    def _get_db_path(self) -> Optional[Path]:
        """Get path to the database file."""
        if not DB_AVAILABLE:
            return None

        try:
            project_root = Path(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ))

            # Check if we're in a worktree
            path_parts = project_root.parts
            if 'trees' in path_parts:
                # Navigate to main project root
                trees_index = path_parts.index('trees')
                main_project_root = Path(*path_parts[:trees_index])
                db_path = main_project_root / "adws" / "database" / "agentickanban.db"
            else:
                db_path = project_root / "adws" / "database" / "agentickanban.db"

            return db_path if db_path.exists() else None
        except Exception as e:
            self.logger.debug(f"Error getting database path: {e}")
            return None

    def _sync_to_database(self, workflow_step: Optional[str] = None) -> None:
        """
        Sync state to database.

        This is the primary storage mechanism in database-only mode.
        """
        if not DB_AVAILABLE:
            return

        db_path = self._get_db_path()
        if not db_path:
            self.logger.debug("Database not available for sync")
            return

        try:
            conn = sqlite3.connect(str(db_path), timeout=5.0)
            cursor = conn.cursor()

            # Check if ADW exists
            cursor.execute("SELECT id FROM adw_states WHERE adw_id = ?", (self.adw_id,))
            existing = cursor.fetchone()

            # Prepare data
            completed = self.data.get("completed", False)
            current_stage = "ready-to-merge" if completed else "backlog"
            status = "completed" if completed else "in_progress"

            # Parse issue_class (remove leading slash)
            issue_class = self.data.get("issue_class", "")
            if issue_class and issue_class.startswith("/"):
                issue_class = issue_class[1:]

            # Prepare JSON fields
            issue_json_str = json.dumps(self.data.get("issue_json")) if self.data.get("issue_json") else None
            orchestrator_state_str = json.dumps(self.data.get("orchestrator")) if self.data.get("orchestrator") else None
            patch_history_str = json.dumps(self.data.get("patch_history", []))
            all_adws_str = json.dumps(self.data.get("all_adws", []))

            # Extract issue title and body from issue_json
            issue_title = None
            issue_body = None
            if self.data.get("issue_json"):
                issue_title = self.data["issue_json"].get("title")
                issue_body = self.data["issue_json"].get("body")

            if existing:
                # Update existing record
                query = """
                    UPDATE adw_states SET
                        issue_number = ?,
                        issue_title = ?,
                        issue_body = ?,
                        issue_class = ?,
                        branch_name = ?,
                        worktree_path = ?,
                        current_stage = ?,
                        status = ?,
                        model_set = ?,
                        data_source = ?,
                        issue_json = ?,
                        orchestrator_state = ?,
                        plan_file = ?,
                        all_adws = ?,
                        patch_file = ?,
                        patch_history = ?,
                        patch_source_mode = ?,
                        backend_port = ?,
                        websocket_port = ?,
                        frontend_port = ?,
                        completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE adw_id = ?
                """
                cursor.execute(query, (
                    self.data.get("issue_number"),
                    issue_title,
                    issue_body,
                    issue_class,
                    self.data.get("branch_name"),
                    self.data.get("worktree_path"),
                    current_stage,
                    status,
                    self.data.get("model_set", "base"),
                    self.data.get("data_source", "kanban"),
                    issue_json_str,
                    orchestrator_state_str,
                    self.data.get("plan_file"),
                    all_adws_str,
                    self.data.get("patch_file"),
                    patch_history_str,
                    self.data.get("patch_source_mode"),
                    self.data.get("backend_port"),
                    self.data.get("websocket_port"),
                    self.data.get("frontend_port"),
                    1 if completed else 0,
                    self.adw_id
                ))
            else:
                # Insert new record
                query = """
                    INSERT INTO adw_states (
                        adw_id, issue_number, issue_title, issue_body, issue_class,
                        branch_name, worktree_path, current_stage, status,
                        model_set, data_source, issue_json, orchestrator_state,
                        plan_file, all_adws,
                        patch_file, patch_history, patch_source_mode,
                        backend_port, websocket_port, frontend_port,
                        completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                cursor.execute(query, (
                    self.adw_id,
                    self.data.get("issue_number"),
                    issue_title,
                    issue_body,
                    issue_class,
                    self.data.get("branch_name"),
                    self.data.get("worktree_path"),
                    current_stage,
                    status,
                    self.data.get("model_set", "base"),
                    self.data.get("data_source", "kanban"),
                    issue_json_str,
                    orchestrator_state_str,
                    self.data.get("plan_file"),
                    all_adws_str,
                    self.data.get("patch_file"),
                    patch_history_str,
                    self.data.get("patch_source_mode"),
                    self.data.get("backend_port"),
                    self.data.get("websocket_port"),
                    self.data.get("frontend_port"),
                    datetime.utcnow().isoformat() if completed else None
                ))

            # Log activity if workflow_step provided
            if workflow_step:
                log_query = """
                    INSERT INTO adw_activity_logs (adw_id, event_type, workflow_step, event_data)
                    VALUES (?, ?, ?, ?)
                """
                event_data = json.dumps({"timestamp": datetime.utcnow().isoformat()})
                cursor.execute(log_query, (self.adw_id, "state_change", workflow_step, event_data))

            conn.commit()
            conn.close()

            self.logger.debug(f"Synced state to database for {self.adw_id}")

        except Exception as e:
            self.logger.warning(f"Failed to sync to database: {e}")
            # Don't raise - database sync is optional

    def save(self, workflow_step: Optional[str] = None) -> None:
        """Save state to database (and optionally to JSON file).

        In database-only mode (ADW_DB_ONLY=true, default):
        - State is saved only to the database
        - No JSON file is written

        In dual-write mode (ADW_DB_ONLY=false):
        - State is saved to both JSON file and database
        """
        # Always sync to database (primary storage)
        self._sync_to_database(workflow_step=workflow_step)

        # In dual-write mode, also save to JSON file (for backwards compatibility)
        if not self._db_only_mode:
            state_path = self.get_state_path()
            os.makedirs(os.path.dirname(state_path), exist_ok=True)

            # Create ADWStateData for validation
            state_data = ADWStateData(
                adw_id=self.data.get("adw_id"),
                issue_number=self.data.get("issue_number"),
                branch_name=self.data.get("branch_name"),
                plan_file=self.data.get("plan_file"),
                issue_class=self.data.get("issue_class"),
                worktree_path=self.data.get("worktree_path"),
                backend_port=self.data.get("backend_port"),
                websocket_port=self.data.get("websocket_port"),
                frontend_port=self.data.get("frontend_port"),
                model_set=self.data.get("model_set", "base"),
                all_adws=self.data.get("all_adws", []),
                data_source=self.data.get("data_source", "github"),
                issue_json=self.data.get("issue_json"),
                completed=self.data.get("completed", False),
                patch_file=self.data.get("patch_file"),
                patch_history=self.data.get("patch_history", []),
                patch_source_mode=self.data.get("patch_source_mode"),
                orchestrator=self.data.get("orchestrator"),
            )

            # Save as JSON
            with open(state_path, "w") as f:
                json.dump(state_data.model_dump(), f, indent=2)

            self.logger.info(f"Saved state to {state_path}")

        self.logger.info(f"Saved state to database for ADW {self.adw_id}")
        if workflow_step:
            self.logger.info(f"State updated by: {workflow_step}")

        # Trigger real-time WebSocket notification
        self.notify_state_change(workflow_step=workflow_step)

    @classmethod
    def _load_from_database(
        cls, adw_id: str, logger: Optional[logging.Logger] = None
    ) -> Optional["ADWState"]:
        """Load state from database.

        Args:
            adw_id: The ADW ID to load
            logger: Optional logger for debugging

        Returns:
            ADWState instance if found, None otherwise
        """
        if not DB_AVAILABLE:
            return None

        try:
            # Get database path
            project_root = Path(os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ))

            # Check if we're in a worktree
            path_parts = project_root.parts
            if 'trees' in path_parts:
                trees_index = path_parts.index('trees')
                main_project_root = Path(*path_parts[:trees_index])
                db_path = main_project_root / "adws" / "database" / "agentickanban.db"
            else:
                db_path = project_root / "adws" / "database" / "agentickanban.db"

            if not db_path.exists():
                if logger:
                    logger.debug(f"Database not found at {db_path}")
                return None

            conn = sqlite3.connect(str(db_path), timeout=5.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                "SELECT * FROM adw_states WHERE adw_id = ? AND deleted_at IS NULL",
                (adw_id,)
            )
            row = cursor.fetchone()
            conn.close()

            if not row:
                if logger:
                    logger.debug(f"No state found in database for ADW {adw_id}")
                return None

            # Convert row to dict
            row_dict = dict(row)

            # Parse JSON fields
            issue_json = None
            if row_dict.get("issue_json"):
                try:
                    issue_json = json.loads(row_dict["issue_json"])
                except json.JSONDecodeError:
                    pass

            orchestrator = None
            if row_dict.get("orchestrator_state"):
                try:
                    orchestrator = json.loads(row_dict["orchestrator_state"])
                except json.JSONDecodeError:
                    pass

            patch_history = []
            if row_dict.get("patch_history"):
                try:
                    patch_history = json.loads(row_dict["patch_history"])
                except json.JSONDecodeError:
                    pass

            all_adws = []
            if row_dict.get("all_adws"):
                try:
                    all_adws = json.loads(row_dict["all_adws"])
                except json.JSONDecodeError:
                    pass

            # Restore issue_class with leading slash if needed
            issue_class = row_dict.get("issue_class")
            if issue_class and not issue_class.startswith("/"):
                issue_class = f"/{issue_class}"

            # Create ADWState instance
            state = cls(adw_id)
            state.data = {
                "adw_id": adw_id,
                "issue_number": row_dict.get("issue_number"),
                "branch_name": row_dict.get("branch_name"),
                "plan_file": row_dict.get("plan_file"),
                "issue_class": issue_class,
                "worktree_path": row_dict.get("worktree_path"),
                "backend_port": row_dict.get("backend_port"),
                "websocket_port": row_dict.get("websocket_port"),
                "frontend_port": row_dict.get("frontend_port"),
                "model_set": row_dict.get("model_set", "base"),
                "all_adws": all_adws,
                "data_source": row_dict.get("data_source", "kanban"),
                "issue_json": issue_json,
                "completed": row_dict.get("completed_at") is not None,
                "patch_file": row_dict.get("patch_file"),
                "patch_history": patch_history,
                "patch_source_mode": row_dict.get("patch_source_mode"),
                "orchestrator": orchestrator,
            }

            if logger:
                logger.info(f"🔍 Loaded state from database for ADW {adw_id}")

            return state

        except Exception as e:
            if logger:
                logger.error(f"Failed to load state from database: {e}")
            return None

    @classmethod
    def load(
        cls, adw_id: str, logger: Optional[logging.Logger] = None
    ) -> Optional["ADWState"]:
        """Load state from database (primary) or file (fallback).

        In database-only mode (ADW_DB_ONLY=true, default):
        - State is loaded from the database only

        In dual-write mode (ADW_DB_ONLY=false):
        - State is loaded from database first
        - Falls back to JSON file if not in database
        """
        db_only_mode = os.getenv("ADW_DB_ONLY", "true").lower() == "true" and DB_AVAILABLE

        # Try database first (primary source)
        state = cls._load_from_database(adw_id, logger)
        if state:
            return state

        # In database-only mode, don't fallback to file
        if db_only_mode:
            if logger:
                logger.debug(f"No state found in database for ADW {adw_id} (db-only mode)")
            return None

        # Fallback to JSON file (dual-write mode only)
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        state_path = os.path.join(project_root, "agents", adw_id, cls.STATE_FILENAME)

        if not os.path.exists(state_path):
            return None

        try:
            with open(state_path, "r") as f:
                data = json.load(f)

            # Validate with ADWStateData
            state_data = ADWStateData(**data)

            # Create ADWState instance
            state = cls(state_data.adw_id)
            state.data = state_data.model_dump()

            if logger:
                logger.info(f"🔍 Found existing state from {state_path}")
                logger.info(f"State: {json.dumps(state_data.model_dump(), indent=2)}")

            return state
        except Exception as e:
            if logger:
                logger.error(f"Failed to load state from {state_path}: {e}")
            return None

    @classmethod
    def from_stdin(cls) -> Optional["ADWState"]:
        """Read state from stdin if available (for piped input).

        Returns None if no piped input is available (stdin is a tty).
        """
        if sys.stdin.isatty():
            return None
        try:
            input_data = sys.stdin.read()
            if not input_data.strip():
                return None
            data = json.loads(input_data)
            adw_id = data.get("adw_id")
            if not adw_id:
                return None  # No valid state without adw_id
            state = cls(adw_id)
            state.data = data
            return state
        except (json.JSONDecodeError, EOFError):
            return None

    def to_stdout(self):
        """Write state to stdout as JSON (for piping to next script)."""
        # Only output core fields
        output_data = {
            "adw_id": self.data.get("adw_id"),
            "issue_number": self.data.get("issue_number"),
            "branch_name": self.data.get("branch_name"),
            "plan_file": self.data.get("plan_file"),
            "issue_class": self.data.get("issue_class"),
            "worktree_path": self.data.get("worktree_path"),
            "backend_port": self.data.get("backend_port"),
            "websocket_port": self.data.get("websocket_port"),
            "frontend_port": self.data.get("frontend_port"),
            "all_adws": self.data.get("all_adws", []),
            "data_source": self.data.get("data_source", "github"),
            "issue_json": self.data.get("issue_json"),
            "completed": self.data.get("completed", False),
            "patch_file": self.data.get("patch_file"),
            "patch_history": self.data.get("patch_history", []),
            "patch_source_mode": self.data.get("patch_source_mode"),
        }
        print(json.dumps(output_data, indent=2))
