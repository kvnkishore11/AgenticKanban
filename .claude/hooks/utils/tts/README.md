# Open-Source Text-to-Speech (TTS) Setup for Claude Code

This directory contains multiple TTS implementations for voice notifications in your Claude Code setup. The system automatically selects the best available TTS engine based on a priority order that favors open-source solutions.

## 🎯 Quick Start

The TTS system works automatically with **zero configuration** required! It will:
1. Try open-source TTS engines first (Kokoro → ChatTTS → Piper)
2. Fall back to pyttsx3 (offline, always works)
3. Use commercial APIs only if configured (ElevenLabs → OpenAI)

## 📊 TTS Engine Priority Order

```
1. Kokoro TTS (open-source, CPU-efficient, Apache-licensed)
   ↓ fallback if unavailable
2. ChatTTS (open-source, conversational, great for notifications)
   ↓ fallback if unavailable
3. Piper TTS (open-source, fast and lightweight)
   ↓ fallback if unavailable
4. pyttsx3 (offline, always available) ✅ WORKS OUT OF THE BOX
   ↓ fallback if unavailable
5. ElevenLabs (commercial, requires API key)
   ↓ fallback if unavailable
6. OpenAI TTS (commercial, requires API key)
```

## 🚀 TTS Engines Overview

### 1. Kokoro TTS (Recommended) ⭐

**Best for**: High-quality voice with CPU efficiency

- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Speed**: ⭐⭐⭐⭐ (Fast)
- **License**: Apache 2.0 (fully open-source)
- **Model Size**: 82M parameters
- **Requirements**: Python packages only (torch, soundfile, kokoro)
- **First Run**: Downloads models (~150MB), then fast

**Installation:**
```bash
uv run .claude/hooks/utils/tts/kokoro_tts.py "Test message"
# OR manually: pip install kokoro>=0.9.4 soundfile torch
```

**Pros:**
- CPU-efficient
- Excellent quality comparable to commercial TTS
- Multiple voices and languages
- No API keys needed

**Cons:**
- First run downloads models
- Requires ~150MB disk space

---

### 2. ChatTTS

**Best for**: Conversational notifications, natural dialogue

- **Quality**: ⭐⭐⭐⭐ (Very Good)
- **Speed**: ⭐⭐⭐ (Moderate)
- **License**: Open-source
- **Model Size**: ~350MB
- **Requirements**: Python packages (chattts, soundfile, torch)
- **First Run**: Downloads models (~350MB)

**Installation:**
```bash
uv run .claude/hooks/utils/tts/chattts_tts.py "Test message"
# OR manually: pip install chattts soundfile torch
```

**Pros:**
- Optimized for conversational/dialogue scenarios
- Natural-sounding voice
- Trained on 100,000+ hours of audio
- Supports English and Chinese

**Cons:**
- Larger model download
- Slower than Kokoro on first generation
- May have issues with very short text

---

### 3. Piper TTS

**Best for**: Lightweight, fast notifications

- **Quality**: ⭐⭐⭐ (Good)
- **Speed**: ⭐⭐⭐⭐⭐ (Very Fast)
- **License**: MIT
- **Model Size**: ~20-50MB per voice
- **Requirements**: piper-tts package + voice model file
- **First Run**: Requires manual voice model download

**Installation:**
```bash
# 1. Install package (auto via uv)
pip install piper-tts

# 2. Download voice model
mkdir -p ~/.local/share/piper/voices
cd ~/.local/share/piper/voices
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# 3. Test
uv run .claude/hooks/utils/tts/piper_tts.py "Test message"
```

**Pros:**
- Very fast generation
- Lightweight models
- Low resource usage
- Many voice options available

**Cons:**
- Requires manual voice model download
- Setup is less automated than others

---

### 4. pyttsx3 (Default Fallback) ✅

**Best for**: Guaranteed to work, no setup needed

- **Quality**: ⭐⭐ (Basic)
- **Speed**: ⭐⭐⭐⭐ (Fast)
- **License**: MPL-2.0
- **Model Size**: Uses system TTS
- **Requirements**: pyttsx3 package only
- **First Run**: Instant, no downloads

**Installation:**
```bash
# Already works! Nothing needed.
uv run .claude/hooks/utils/tts/pyttsx3_tts.py "Test message"
```

**Pros:**
- Works immediately with zero setup
- No model downloads
- Offline, no internet required
- Very reliable

**Cons:**
- Robotic voice quality
- Less natural than neural TTS

---

### 5. ElevenLabs (Commercial)

**Best for**: Professional-grade voice quality (requires API key)

- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Speed**: ⭐⭐⭐⭐⭐ (Very Fast, 75ms latency)
- **License**: Commercial
- **Cost**: ~$1 per 1000 characters
- **Requirements**: API key + elevenlabs package

**Setup:**
```bash
# Add to .env file
ELEVENLABS_API_KEY=your_api_key_here

# Test
uv run .claude/hooks/utils/tts/elevenlabs_tts.py "Test message"
```

---

### 6. OpenAI TTS (Commercial)

**Best for**: OpenAI ecosystem users (requires API key)

- **Quality**: ⭐⭐⭐⭐ (Very Good)
- **Speed**: ⭐⭐⭐⭐ (Fast)
- **License**: Commercial
- **Cost**: ~$15 per million characters
- **Requirements**: API key + openai package

**Setup:**
```bash
# Add to .env file
OPENAI_API_KEY=your_api_key_here

# Test
uv run .claude/hooks/utils/tts/openai_tts.py "Test message"
```

---

## 🔧 Configuration

### Force a Specific TTS Engine

Set the `TTS_ENGINE` environment variable to force a specific engine:

```bash
# In your .env file
TTS_ENGINE=kokoro      # Use Kokoro TTS
TTS_ENGINE=chattts     # Use ChatTTS
TTS_ENGINE=piper       # Use Piper TTS
TTS_ENGINE=pyttsx3     # Use pyttsx3
TTS_ENGINE=elevenlabs  # Use ElevenLabs
TTS_ENGINE=openai      # Use OpenAI TTS
```

### Enable/Disable TTS Notifications

The notification system is controlled by the hooks configuration in `.claude/settings.json`. TTS runs automatically when Claude needs your input.

To completely disable TTS, remove or comment out the notification hook.

---

## 🧪 Testing TTS Engines

Test each engine individually:

```bash
# Test Kokoro (recommended)
uv run .claude/hooks/utils/tts/kokoro_tts.py "Hello, this is Kokoro TTS"

# Test ChatTTS
uv run .claude/hooks/utils/tts/chattts_tts.py "Hello, this is Chat TTS"

# Test Piper (requires voice model first)
uv run .claude/hooks/utils/tts/piper_tts.py "Hello, this is Piper TTS"

# Test pyttsx3 (always works)
uv run .claude/hooks/utils/tts/pyttsx3_tts.py "Hello, this is pyttsx3"

# Test ElevenLabs (requires API key)
uv run .claude/hooks/utils/tts/elevenlabs_tts.py "Hello, this is ElevenLabs"

# Test OpenAI (requires API key)
uv run .claude/hooks/utils/tts/openai_tts.py "Hello, this is OpenAI TTS"
```

---

## 📁 File Structure

```
.claude/hooks/utils/tts/
├── README.md                  # This file
├── kokoro_tts.py             # Kokoro TTS (82M, Apache-licensed)
├── chattts_tts.py            # ChatTTS (conversational)
├── piper_tts.py              # Piper TTS (fast, lightweight)
├── pyttsx3_tts.py            # pyttsx3 (offline fallback)
├── elevenlabs_tts.py         # ElevenLabs (commercial)
└── openai_tts.py             # OpenAI TTS (commercial)
```

---

## 🐛 Troubleshooting

### "No TTS working"
- The system will automatically fall back to pyttsx3, which always works
- If you see no sound, check your system volume

### "Kokoro: narrow() length error"
- This can happen with very short text
- The system will automatically try the next TTS engine
- Try forcing ChatTTS or pyttsx3

### "Piper: No voice model found"
- Download a voice model following the Piper TTS installation instructions above
- Or let it fall back to pyttsx3

### "ChatTTS: Model download fails"
- Check internet connection
- The models are large (~350MB), ensure sufficient disk space
- Try again or let it fall back to pyttsx3

### "Permission denied"
- Make sure scripts are executable: `chmod +x .claude/hooks/utils/tts/*.py`

---

## 🎨 Customization

### Change Voice in Kokoro

Edit `kokoro_tts.py` line with `voice='af_heart'`:

Available voices:
- `af_heart` - Female, clear (default)
- `af_sky` - Female, warm
- `am_adam` - Male, deep
- `am_michael` - Male, clear

### Change Voice in ChatTTS

ChatTTS supports multiple speakers. Edit `chattts_tts.py` to customize voice parameters.

### Change Voice in pyttsx3

Edit `pyttsx3_tts.py` to set voice properties:
```python
# List available voices
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[1].id)  # Change voice index
```

---

## 📊 Recommendations

**For best experience:**
1. **Kokoro TTS** - Best balance of quality, speed, and ease of use
2. **ChatTTS** - If you prefer more conversational/natural tone
3. **pyttsx3** - Reliable fallback, always works

**For production/commercial:**
- **ElevenLabs** - Best overall quality, worth the cost
- **OpenAI TTS** - Good if already using OpenAI services

**For privacy/offline:**
- All open-source options work 100% offline after initial model download

---

## 📚 Additional Resources

- [Kokoro TTS on Hugging Face](https://huggingface.co/hexgrad/Kokoro-82M)
- [ChatTTS GitHub](https://github.com/2noise/ChatTTS)
- [Piper TTS Models](https://huggingface.co/rhasspy/piper-voices)
- [pyttsx3 Documentation](https://pyttsx3.readthedocs.io/)

---

## 🙏 Credits

- **Kokoro**: hexgrad (Apache-licensed)
- **ChatTTS**: 2noise team
- **Piper**: Rhasspy (now OHF-Voice)
- **pyttsx3**: nateshmbhat

---

**Last Updated**: 2025-11-20
