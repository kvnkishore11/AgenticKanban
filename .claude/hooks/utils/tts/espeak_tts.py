#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = []
# ///

import sys
import subprocess
import platform

def main():
    """
    eSpeak-ng TTS Script

    Uses eSpeak-ng for fast, lightweight text-to-speech synthesis.
    Accepts optional text prompt as command-line argument.

    Usage:
    - ./espeak_tts.py                    # Uses default text
    - ./espeak_tts.py "Your custom text" # Uses provided text

    Features:
    - Open-source TTS (no API key required)
    - Very lightweight and fast
    - Available on all major platforms
    - No model downloads needed
    - Supports 100+ languages
    """

    print("🎙️  eSpeak-ng TTS")
    print("=" * 15)

    # Get text from command line argument or use default
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        text = "Your agent needs your input"

    print(f"🎯 Text: {text}")

    # Check if espeak-ng is installed
    system = platform.system()
    espeak_cmd = "espeak-ng"

    # Try to find espeak-ng
    try:
        result = subprocess.run(
            ["which", espeak_cmd],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("⚠️  eSpeak-ng not found. Please install it:")
            if system == "Darwin":  # macOS
                print("   brew install espeak-ng")
            elif system == "Linux":
                print("   sudo apt-get install espeak-ng")
                print("   # OR")
                print("   sudo yum install espeak-ng")
            elif system == "Windows":
                print("   Download from: https://github.com/espeak-ng/espeak-ng/releases")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ 'which' command not available")
        # Continue anyway, espeak might still work

    print("🔊 Speaking...")

    try:
        # Run espeak-ng with optimized parameters
        subprocess.run([
            espeak_cmd,
            "-v", "en-us+f3",  # US English, female voice variant 3
            "-s", "160",        # Speed: 160 words per minute (slightly faster)
            "-p", "50",         # Pitch: 50 (default is 50, range 0-99)
            "-a", "150",        # Amplitude/volume: 150 (0-200)
            text
        ], check=True)

        print("✅ Playback complete!")

    except subprocess.CalledProcessError as e:
        print(f"❌ Error running espeak-ng: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ Error: espeak-ng not found")
        print("\nInstallation instructions:")
        if system == "Darwin":  # macOS
            print("   brew install espeak-ng")
        elif system == "Linux":
            print("   sudo apt-get install espeak-ng")
        elif system == "Windows":
            print("   Download from: https://github.com/espeak-ng/espeak-ng/releases")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
