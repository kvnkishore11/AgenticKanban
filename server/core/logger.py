"""
Centralized logging configuration for AgenticKanban backend.

Provides structured logging with optional JSON format, request context tracking,
and environment-aware log levels. Supports both development (human-readable)
and production (JSON structured) formats.

Example:
    Basic usage:
        from core.logger import setup_logging, get_logger

        setup_logging(level=logging.INFO)
        logger = get_logger(__name__)
        logger.info("Server started", extra={"port": 8001})

    With request context:
        logger.info("Processing request", extra={
            "request_id": request_id,
            "method": "POST",
            "path": "/api/tasks"
        })
"""

import logging
import json
import sys
from datetime import datetime
from typing import Optional, Dict, Any


class JSONFormatter(logging.Formatter):
    """
    Format logs as JSON for structured logging.

    Produces JSON-formatted log records suitable for log aggregation systems
    like ELK, Splunk, or CloudWatch. Includes timestamp, level, logger name,
    message, and any extra fields passed via the extra parameter.
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Format a log record as JSON.

        Args:
            record: LogRecord instance to format

        Returns:
            JSON-formatted string containing log data
        """
        log_data: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # Add request context if available
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'adw_id'):
            log_data['adw_id'] = record.adw_id

        # Add exception information if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }

        # Add any extra fields passed via extra parameter
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName',
                          'levelname', 'levelno', 'lineno', 'module', 'msecs',
                          'message', 'pathname', 'process', 'processName',
                          'relativeCreated', 'thread', 'threadName', 'exc_info',
                          'exc_text', 'stack_info', 'request_id', 'user_id', 'adw_id']:
                try:
                    # Only include JSON-serializable values
                    json.dumps(value)
                    log_data[key] = value
                except (TypeError, ValueError):
                    log_data[key] = str(value)

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """
    Format logs with colors for better readability in development.

    Uses ANSI color codes to highlight different log levels:
    - DEBUG: Gray
    - INFO: Blue
    - WARNING: Yellow
    - ERROR: Red
    - CRITICAL: Red + Bold
    """

    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[90m',      # Gray
        'INFO': '\033[94m',       # Blue
        'WARNING': '\033[93m',    # Yellow
        'ERROR': '\033[91m',      # Red
        'CRITICAL': '\033[91m\033[1m',  # Red + Bold
    }
    RESET = '\033[0m'

    def format(self, record: logging.LogRecord) -> str:
        """
        Format a log record with color codes.

        Args:
            record: LogRecord instance to format

        Returns:
            Colored formatted string
        """
        color = self.COLORS.get(record.levelname, '')
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(
    level: int = logging.INFO,
    json_format: bool = False,
    log_file: Optional[str] = None
) -> None:
    """
    Configure application logging.

    Sets up logging with either JSON or colored human-readable format,
    and optionally writes logs to a file in addition to stdout.

    Args:
        level: Logging level (logging.DEBUG, logging.INFO, etc.)
        json_format: If True, use JSON formatter; if False, use colored formatter
        log_file: Optional path to log file for persistent logging

    Example:
        # Development (colored output)
        setup_logging(level=logging.DEBUG, json_format=False)

        # Production (JSON for log aggregation)
        setup_logging(level=logging.INFO, json_format=True, log_file='/var/log/app.log')
    """
    # Create formatter based on format type
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = ColoredFormatter(
            '%(asctime)s - %(levelname)s - [%(name)s] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    handlers = [console_handler]

    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        # Always use JSON format for file logging
        file_handler.setFormatter(JSONFormatter())
        handlers.append(file_handler)

    # Configure root logger
    logging.basicConfig(
        level=level,
        handlers=handlers,
        force=True  # Override any existing configuration
    )

    # Suppress noisy third-party loggers
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.

    Args:
        name: Logger name (typically __name__ of the module)

    Returns:
        Configured logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("Processing workflow", extra={"adw_id": "a1b2c3d4"})
    """
    return logging.getLogger(name)


class LogContext:
    """
    Context manager for adding contextual information to logs.

    Useful for adding request IDs, user IDs, or ADW IDs to all logs
    within a specific context.

    Example:
        with LogContext(request_id="abc123", user_id="user456"):
            logger.info("Processing request")
            # Log will include request_id and user_id
    """

    def __init__(self, **kwargs):
        """
        Initialize log context with key-value pairs.

        Args:
            **kwargs: Context fields to add to logs (e.g., request_id, user_id, adw_id)
        """
        self.context = kwargs
        self.old_factory = None

    def __enter__(self):
        """Enter context and add fields to log records."""
        old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record

        self.old_factory = old_factory
        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context and restore original log record factory."""
        if self.old_factory:
            logging.setLogRecordFactory(self.old_factory)


# Convenience function for workflow logging
def log_workflow_event(
    logger: logging.Logger,
    adw_id: str,
    event: str,
    phase: Optional[str] = None,
    **kwargs
) -> None:
    """
    Log a workflow-related event with consistent formatting.

    Args:
        logger: Logger instance to use
        adw_id: ADW workflow identifier
        event: Event description
        phase: Optional workflow phase (plan, build, test, review, document, ship)
        **kwargs: Additional fields to include in log

    Example:
        log_workflow_event(
            logger,
            adw_id="a1b2c3d4",
            event="Workflow started",
            phase="plan",
            issue_number=123
        )
    """
    extra = {'adw_id': adw_id, **kwargs}
    if phase:
        extra['phase'] = phase

    message = f"[{adw_id}] {event}"
    if phase:
        message = f"[{adw_id}:{phase}] {event}"

    logger.info(message, extra=extra)


def log_structured_event(
    logger: logging.Logger,
    adw_id: str,
    event_category: str,
    event_type: str,
    message: str,
    level: str = 'INFO',
    current_step: Optional[str] = None,
    summary: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    **kwargs
) -> None:
    """
    Log a structured event with all enriched fields for real-time streaming.

    Args:
        logger: Logger instance to use
        adw_id: ADW workflow identifier
        event_category: Category (hook, response, status)
        event_type: Type (PreToolUse, ToolUseBlock, TextBlock, ThinkingBlock)
        message: Event message
        level: Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG)
        current_step: Optional current workflow step
        summary: Optional 15-word summary
        payload: Optional event metadata
        **kwargs: Additional fields

    Example:
        log_structured_event(
            logger,
            adw_id="a1b2c3d4",
            event_category="hook",
            event_type="PreToolUse",
            message="Preparing to execute tool: Read",
            level="INFO",
            current_step="Stage: Build",
            summary="Reading configuration file before proceeding with build",
            payload={"tool": "Read", "file": "config.json"}
        )
    """
    extra = {
        'adw_id': adw_id,
        'event_category': event_category,
        'event_type': event_type,
        'current_step': current_step,
        'summary': summary,
        'payload': payload or {},
        **kwargs
    }

    log_method = getattr(logger, level.lower(), logger.info)
    log_method(message, extra=extra)
