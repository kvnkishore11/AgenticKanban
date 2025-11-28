#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = [
#     "piper-tts>=1.2.0",
# ]
# ///

import sys
import tempfile
import wave
from pathlib import Path

def main():
    """
    Piper TTS Script

    Uses Piper for fast, local text-to-speech synthesis.
    Accepts optional text prompt as command-line argument.

    Usage:
    - ./piper_tts.py                    # Uses default text
    - ./piper_tts.py "Your custom text" # Uses provided text

    Features:
    - Fast local TTS (no API key required)
    - High-quality neural synthesis
    - Lightweight and efficient
    - Cross-platform compatibility
    """

    try:
        from piper.voice import PiperVoice
        import subprocess

        print("🎙️  Piper TTS")
        print("=" * 15)

        # Get text from command line argument or use default
        if len(sys.argv) > 1:
            text = " ".join(sys.argv[1:])
        else:
            text = "Your agent needs your input"

        print(f"🎯 Text: {text}")
        print("🔊 Generating speech...")

        # Piper requires a voice model file
        # Try to find a voice model in common locations
        possible_model_paths = [
            Path.home() / ".local/share/piper/voices/en_US-lessac-medium.onnx",
            Path.home() / ".local/share/piper/voices/en_US-amy-medium.onnx",
            Path("/usr/share/piper/voices/en_US-lessac-medium.onnx"),
            Path(__file__).parent.parent.parent.parent / "models/piper/en_US-lessac-medium.onnx",
        ]

        model_path = None
        for path in possible_model_paths:
            if path.exists():
                model_path = str(path)
                break

        if not model_path:
            print("⚠️  No Piper voice model found. Please download a voice model first.")
            print("📥 Download from: https://github.com/rhasspy/piper/releases")
            print("💡 Suggested location: ~/.local/share/piper/voices/")
            print("\n📝 Quick setup:")
            print("   mkdir -p ~/.local/share/piper/voices")
            print("   cd ~/.local/share/piper/voices")
            print("   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx")
            print("   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json")
            sys.exit(1)

        print(f"📦 Using model: {Path(model_path).name}")

        # Load voice model
        voice = PiperVoice.load(model_path)

        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_path = temp_wav.name

            # Open WAV file for writing
            with wave.open(temp_path, 'w') as wav_file:
                # Synthesize speech
                audio = voice.synthesize(text, wav_file)

        print("🔊 Playing audio...")

        # Play the audio file using system audio player
        try:
            # Try different audio players based on platform
            import platform
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

    except ImportError:
        print("❌ Error: piper-tts package not installed")
        print("This script uses UV to auto-install dependencies.")
        print("Install manually: pip install piper-tts")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
