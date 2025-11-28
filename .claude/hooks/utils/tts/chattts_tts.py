#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "chattts",
#     "soundfile",
#     "torch",
#     "torchaudio",
# ]
# ///

import sys
import tempfile
from pathlib import Path

def main():
    """
    ChatTTS Script

    Uses ChatTTS for conversational text-to-speech synthesis.
    Accepts optional text prompt as command-line argument.

    Usage:
    - ./chattts_tts.py                    # Uses default text
    - ./chattts_tts.py "Your custom text" # Uses provided text

    Features:
    - Local TTS optimized for dialogue (no API key required)
    - Natural conversational voice
    - Trained on 100,000+ hours of audio
    - Supports English and Chinese
    - Multiple speaker support
    """

    try:
        import ChatTTS
        import soundfile as sf
        import subprocess
        import platform

        print("🎙️  ChatTTS")
        print("=" * 15)

        # Get text from command line argument or use default
        if len(sys.argv) > 1:
            text = " ".join(sys.argv[1:])
        else:
            text = "Your agent needs your input"

        print(f"🎯 Text: {text}")
        print("🔊 Initializing ChatTTS (first run may take a moment)...")

        # Initialize ChatTTS
        chat = ChatTTS.Chat()
        chat.load()

        print("🔊 Generating speech...")

        # Generate speech
        texts = [text]
        wavs = chat.infer(texts, use_decoder=True)

        if not wavs or len(wavs) == 0 or len(wavs[0]) == 0:
            print("❌ Failed to generate audio")
            sys.exit(1)

        # Get the audio data
        audio = wavs[0][0]

        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_path = temp_wav.name
            sf.write(temp_path, audio, 24000)

        print("🔊 Playing audio...")

        # Play the audio file using system audio player
        try:
            system = platform.system()

            if system == "Darwin":  # macOS
                subprocess.run(["afplay", temp_path], check=True)
            elif system == "Linux":
                # Try different players
                for player in ["aplay", "paplay", "ffplay", "mpg123"]:
                    try:
                        subprocess.run([player, temp_path], check=True, stderr=subprocess.DEVNULL)
                        break
                    except (FileNotFoundError, subprocess.CalledProcessError):
                        continue
            elif system == "Windows":
                import winsound
                winsound.PlaySound(temp_path, winsound.SND_FILENAME)
        finally:
            # Clean up temp file
            Path(temp_path).unlink(missing_ok=True)

        print("✅ Playback complete!")

    except ImportError as e:
        print("❌ Error: Required packages not installed")
        print(f"   {e}")
        print("\nThis script uses UV to auto-install dependencies.")
        print("Install manually: pip install chattts soundfile torch torchaudio")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
