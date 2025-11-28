#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
import subprocess
import random
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional


def get_tts_script_path():
    """
    Determine which TTS script to use.
    Priority order: Open-Source (Kokoro > ChatTTS > Piper) > pyttsx3 > Commercial (ElevenLabs > OpenAI)
    """
    # Get current script directory and construct utils/tts path
    script_dir = Path(__file__).parent
    tts_dir = script_dir / "utils" / "tts"

    # Check for TTS_ENGINE environment variable to force a specific engine
    forced_engine = os.getenv('TTS_ENGINE', '').lower()

    if forced_engine:
        engine_map = {
            'espeak': 'espeak_tts.py',
            'kokoro': 'kokoro_tts.py',
            'chattts': 'chattts_tts.py',
            'piper': 'piper_tts.py',
            'pyttsx3': 'pyttsx3_tts.py',
            'elevenlabs': 'elevenlabs_tts.py',
            'openai': 'openai_tts.py',
        }
        if forced_engine in engine_map:
            script = tts_dir / engine_map[forced_engine]
            if script.exists():
                return str(script)

    # Priority 1: eSpeak-ng (open-source, lightweight, fast, no downloads)
    espeak_script = tts_dir / "espeak_tts.py"
    if espeak_script.exists():
        return str(espeak_script)

    # Priority 2: pyttsx3 (offline fallback, always available)
    pyttsx3_script = tts_dir / "pyttsx3_tts.py"
    if pyttsx3_script.exists():
        return str(pyttsx3_script)

    # Priority 3: Kokoro TTS (open-source, CPU-efficient, requires model download)
    kokoro_script = tts_dir / "kokoro_tts.py"
    if kokoro_script.exists():
        return str(kokoro_script)

    # Priority 4: ChatTTS (open-source, great for conversational notifications)
    chattts_script = tts_dir / "chattts_tts.py"
    if chattts_script.exists():
        return str(chattts_script)

    # Priority 5: Piper TTS (open-source, fast and lightweight)
    piper_script = tts_dir / "piper_tts.py"
    if piper_script.exists():
        return str(piper_script)

    # Priority 6: ElevenLabs (commercial, requires API key)
    if os.getenv('ELEVENLABS_API_KEY'):
        elevenlabs_script = tts_dir / "elevenlabs_tts.py"
        if elevenlabs_script.exists():
            return str(elevenlabs_script)

    # Priority 7: OpenAI (commercial, requires API key)
    if os.getenv('OPENAI_API_KEY'):
        openai_script = tts_dir / "openai_tts.py"
        if openai_script.exists():
            return str(openai_script)

    return None


def announce_notification():
    """Announce that the agent needs user input."""
    try:
        tts_script = get_tts_script_path()
        if not tts_script:
            return  # No TTS scripts available
        
        # Get engineer name if available
        engineer_name = os.getenv('ENGINEER_NAME', '').strip()
        
        # Create notification message with 30% chance to include name
        if engineer_name and random.random() < 0.3:
            notification_message = f"{engineer_name}, your agent needs your input"
        else:
            notification_message = "Your agent needs your input"
        
        # Call the TTS script with the notification message
        subprocess.run([
            "uv", "run", tts_script, notification_message
        ], 
        capture_output=True,  # Suppress output
        timeout=10  # 10-second timeout
        )
        
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
        # Fail silently if TTS encounters issues
        pass
    except Exception:
        # Fail silently for any other errors
        pass


def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser()
        parser.add_argument('--notify', action='store_true', help='Enable TTS notifications')
        args = parser.parse_args()
        
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Ensure log directory exists
        import os
        log_dir = os.path.join(os.getcwd(), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, 'notification.json')
        
        # Read existing log data or initialize empty list
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append new data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        # Announce notification via TTS only if --notify flag is set
        # Skip TTS for the generic "Claude is waiting for your input" message
        if args.notify and input_data.get('message') != 'Claude is waiting for your input':
            announce_notification()
        
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)

if __name__ == '__main__':
    main()