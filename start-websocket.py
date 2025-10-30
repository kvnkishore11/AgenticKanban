#!/usr/bin/env -S uv run
# /// script
# dependencies = ["fastapi", "uvicorn", "python-dotenv", "websockets"]
# ///

"""
Start WebSocket Server Script
Launches the ADW WebSocket trigger server from adws/adw_triggers/trigger_websocket.py
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    """Start the ADW WebSocket trigger server."""

    # Get the script directory and find the trigger_websocket.py file
    script_dir = Path(__file__).parent
    trigger_script = script_dir / "adws" / "adw_triggers" / "trigger_websocket.py"

    if not trigger_script.exists():
        print(f"Error: trigger_websocket.py not found at {trigger_script}")
        sys.exit(1)

    print(f"Starting ADW WebSocket server...")
    print(f"Script: {trigger_script}")

    try:
        # Run the trigger_websocket.py script using uv
        subprocess.run([
            "uv", "run", str(trigger_script)
        ], cwd=str(script_dir), check=True)

    except subprocess.CalledProcessError as e:
        print(f"Error starting WebSocket server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nWebSocket server stopped by user")
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()