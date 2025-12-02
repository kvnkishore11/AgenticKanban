"""
File Operations API

Provides endpoints for IDE integration and file-related operations.
Enables click-to-open functionality in VS Code/Cursor from the UI.
"""

import os
import subprocess
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


class OpenFileRequest(BaseModel):
    """Request model for opening a file in IDE"""
    file_path: str = Field(..., description="Absolute path to the file")
    line_number: int = Field(default=1, ge=1, description="Line number to navigate to")
    ide_preference: Optional[str] = Field(
        default=None,
        description="IDE to use ('code' for VS Code, 'cursor' for Cursor)"
    )


class OpenFileResponse(BaseModel):
    """Response model for file opening"""
    success: bool
    message: str
    ide_used: Optional[str] = None


@router.post("/api/open-file", response_model=OpenFileResponse)
async def open_file_in_ide(request: OpenFileRequest):
    """
    Open a file in the user's IDE at a specific line number.

    This endpoint enables click-to-open functionality from the UI. It detects
    the available IDE (VS Code or Cursor) and opens the file at the specified
    line number.

    Args:
        request: OpenFileRequest with file_path, line_number, and optional ide_preference

    Returns:
        OpenFileResponse with success status and message

    Raises:
        HTTPException: If file not found, IDE not installed, or other errors
    """
    file_path = request.file_path
    line_number = request.line_number
    ide_preference = request.ide_preference

    logger.info(f"Opening file: {file_path}:{line_number}")

    # Validate file exists
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {file_path}"
        )

    # Determine IDE to use
    ide = ide_preference or os.getenv("IDE_PREFERENCE", "code")

    # Construct command
    if ide == "cursor":
        command = ["cursor", "--goto", f"{file_path}:{line_number}"]
        ide_name = "Cursor"
    else:
        command = ["code", "--goto", f"{file_path}:{line_number}"]
        ide_name = "VS Code"

    try:
        # Execute command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            logger.info(f"Successfully opened {file_path} in {ide_name}")
            return OpenFileResponse(
                success=True,
                message=f"Opened {os.path.basename(file_path)} in {ide_name}",
                ide_used=ide
            )
        else:
            # IDE command failed
            error_msg = result.stderr.strip() if result.stderr else "Unknown error"
            logger.error(f"IDE command failed: {error_msg}")

            # Try fallback to other IDE
            if ide == "cursor":
                fallback_command = ["code", "--goto", f"{file_path}:{line_number}"]
                fallback_ide = "VS Code"
            else:
                fallback_command = ["cursor", "--goto", f"{file_path}:{line_number}"]
                fallback_ide = "Cursor"

            try:
                fallback_result = subprocess.run(
                    fallback_command,
                    capture_output=True,
                    text=True,
                    timeout=5
                )

                if fallback_result.returncode == 0:
                    logger.info(f"Fallback: Successfully opened {file_path} in {fallback_ide}")
                    return OpenFileResponse(
                        success=True,
                        message=f"Opened {os.path.basename(file_path)} in {fallback_ide} (fallback)",
                        ide_used=fallback_ide.lower().replace(" ", "")
                    )
            except FileNotFoundError:
                pass

            # Both IDEs failed
            raise HTTPException(
                status_code=500,
                detail=f"Failed to open file in {ide_name}: {error_msg}"
            )

    except FileNotFoundError:
        logger.error(f"IDE '{ide}' not found in PATH")
        raise HTTPException(
            status_code=404,
            detail=(
                f"IDE '{ide_name}' not found. Please install {ide_name} or "
                "set IDE_PREFERENCE environment variable."
            )
        )

    except subprocess.TimeoutExpired:
        logger.error(f"IDE command timed out for {file_path}")
        raise HTTPException(
            status_code=504,
            detail="IDE command timed out"
        )

    except Exception as e:
        logger.error(f"Unexpected error opening file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error opening file: {str(e)}"
        )


@router.get("/api/ide-status")
async def get_ide_status():
    """
    Check which IDEs are available in the system.

    Returns:
        Dictionary with availability status for each IDE
    """
    status = {}

    # Check VS Code
    try:
        result = subprocess.run(
            ["code", "--version"],
            capture_output=True,
            text=True,
            timeout=2
        )
        status["vscode"] = {
            "available": result.returncode == 0,
            "version": result.stdout.split("\n")[0] if result.returncode == 0 else None
        }
    except FileNotFoundError:
        status["vscode"] = {"available": False, "version": None}
    except Exception:
        status["vscode"] = {"available": False, "version": None}

    # Check Cursor
    try:
        result = subprocess.run(
            ["cursor", "--version"],
            capture_output=True,
            text=True,
            timeout=2
        )
        status["cursor"] = {
            "available": result.returncode == 0,
            "version": result.stdout.split("\n")[0] if result.returncode == 0 else None
        }
    except FileNotFoundError:
        status["cursor"] = {"available": False, "version": None}
    except Exception:
        status["cursor"] = {"available": False, "version": None}

    # Determine preferred IDE
    preferred = os.getenv("IDE_PREFERENCE", "code")
    if status["cursor"]["available"] and preferred == "cursor":
        status["preferred"] = "cursor"
    elif status["vscode"]["available"]:
        status["preferred"] = "vscode"
    elif status["cursor"]["available"]:
        status["preferred"] = "cursor"
    else:
        status["preferred"] = None

    return status


@router.post("/api/validate-file-path")
async def validate_file_path(file_path: str):
    """
    Validate that a file path exists and is accessible.

    Args:
        file_path: Path to validate

    Returns:
        Dictionary with validation result
    """
    exists = os.path.exists(file_path)
    is_file = os.path.isfile(file_path) if exists else False
    is_readable = os.access(file_path, os.R_OK) if exists else False

    return {
        "file_path": file_path,
        "exists": exists,
        "is_file": is_file,
        "is_readable": is_readable,
        "absolute_path": os.path.abspath(file_path) if exists else None
    }


class SelectDirectoryResponse(BaseModel):
    """Response model for directory selection"""
    path: Optional[str] = Field(None, description="Absolute path to selected directory")
    name: Optional[str] = Field(None, description="Name of selected directory")


@router.post("/api/select-directory", response_model=SelectDirectoryResponse)
async def select_directory():
    """
    Open a native directory picker dialog and return the selected directory.

    This endpoint uses tkinter to show a native OS directory picker dialog
    with a "Select" button (not "Upload"). Returns the absolute path and
    directory name for populating the project form.

    Returns:
        SelectDirectoryResponse with path and name, or empty if cancelled

    Raises:
        HTTPException: If there's an error showing the dialog
    """
    try:
        # Import tkinter for native directory picker
        # We import here to avoid requiring tkinter at module load time
        import tkinter as tk
        from tkinter import filedialog

        logger.info("Opening native directory picker dialog")

        # Create root window (hidden)
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', True)  # Bring dialog to front

        # Show directory picker dialog
        selected_path = filedialog.askdirectory(
            title="Select Project Directory",
            mustexist=True
        )

        # Clean up tkinter
        root.destroy()

        # User cancelled
        if not selected_path:
            logger.info("Directory selection cancelled by user")
            return SelectDirectoryResponse(path=None, name=None)

        # Extract directory name from path
        dir_name = os.path.basename(selected_path)

        logger.info(f"Directory selected: {selected_path} (name: {dir_name})")

        return SelectDirectoryResponse(
            path=selected_path,
            name=dir_name
        )

    except ImportError as e:
        logger.error(f"tkinter not available: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=(
                "Native directory picker not available. "
                "Please ensure tkinter is installed (python3-tk on Linux, "
                "included by default on macOS/Windows)."
            )
        )
    except Exception as e:
        logger.error(f"Error opening directory picker: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error opening directory picker: {str(e)}"
        )
