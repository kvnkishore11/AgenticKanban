# 🔊 Open-Source TTS Setup for Claude Code

Your Claude Code setup now includes **open-source Text-to-Speech (TTS)** for voice notifications! The system automatically selects the best available TTS engine.

## ✅ What's Already Working

Your setup includes **7 TTS engines** with automatic fallback:

1. **eSpeak-ng** ⭐ (recommended) - Lightweight, fast, installed and ready!
2. **pyttsx3** ✅ - Offline fallback (always works, no setup needed)
3. **Kokoro TTS** - High quality, CPU-efficient, Apache-licensed
4. **ChatTTS** - Conversational, natural-sounding
5. **Piper TTS** - Fast and lightweight
6. **ElevenLabs** - Commercial (optional, requires API key)
7. **OpenAI TTS** - Commercial (optional, requires API key)

**eSpeak-ng is now your default TTS engine - installed and working!**

---

## 🚀 Quick Start (3 Options)

### Option 1: It's Already Working! ⭐✅

**eSpeak-ng is now installed and active!** Your notifications will use it automatically.

```bash
# Test it now
uv run .claude/hooks/utils/tts/espeak_tts.py "Your agent needs your input"
```

**Done!** You're now using open-source TTS. No ElevenLabs needed!

---

### Option 2: Use Commercial TTS (ElevenLabs/OpenAI)

If you have API keys and want the best quality:

```bash
# Add to your .env file
ELEVENLABS_API_KEY=your_key_here
# OR
OPENAI_API_KEY=your_key_here
```

---

## 🔧 How It Works

When Claude needs your input, the notification hook automatically:

1. Uses eSpeak-ng → Installed and ready! (lightweight, fast)
2. Falls back to pyttsx3 → Always available (offline)
3. Looks for Kokoro TTS → If you want neural quality (requires download)
4. Looks for ChatTTS → If you want conversational (requires download)
5. Looks for Piper TTS → If you want fast neural TTS (requires setup)
6. Uses ElevenLabs → Only if API key is set
7. Uses OpenAI TTS → Only if API key is set

**You don't need to do anything - it just works!**

---

## 🎯 Testing Your Setup

Test each TTS engine:

```bash
# Test eSpeak-ng (now your default - already working!)
uv run .claude/hooks/utils/tts/espeak_tts.py "Testing eSpeak TTS"

# Test pyttsx3 (fallback - always works)
uv run .claude/hooks/utils/tts/pyttsx3_tts.py "Testing pyttsx3 TTS"

# Test Kokoro (neural quality - requires download)
uv run .claude/hooks/utils/tts/kokoro_tts.py "Testing Kokoro TTS"

# Test ChatTTS (conversational - requires download)
uv run .claude/hooks/utils/tts/chattts_tts.py "Testing Chat TTS"

# Test Piper (requires voice model download first)
uv run .claude/hooks/utils/tts/piper_tts.py "Testing Piper TTS"
```

---

## 🎨 Customization

### Force a Specific TTS Engine

Add to your `.env` file:

```bash
TTS_ENGINE=espeak      # Force eSpeak-ng (default)
TTS_ENGINE=pyttsx3     # Force pyttsx3
TTS_ENGINE=kokoro      # Force Kokoro
TTS_ENGINE=chattts     # Force ChatTTS
TTS_ENGINE=piper       # Force Piper
```

### Disable TTS Completely

To disable voice notifications, edit `.claude/settings.json` and remove the `Notification` hook.

---

## 📚 Full Documentation

For detailed information about each TTS engine, installation, troubleshooting, and customization:

👉 **[Read the full TTS documentation](.claude/hooks/utils/tts/README.md)**

---

## 🆚 Comparison

| Engine | Quality | Speed | Setup | Cost | License |
|--------|---------|-------|-------|------|---------|
| **eSpeak-ng** ⭐✅ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Installed! | Free | GPL-3.0 |
| **pyttsx3** ✅ | ⭐⭐ | ⭐⭐⭐⭐ | None | Free | MPL-2.0 |
| **Kokoro** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Auto | Free | Apache 2.0 |
| **ChatTTS** | ⭐⭐⭐⭐ | ⭐⭐⭐ | Auto | Free | Open |
| **Piper** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Manual | Free | MIT |
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | API Key | ~$1/1K | Commercial |
| **OpenAI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | API Key | ~$15/1M | Commercial |

---

## 💡 Recommendations

**You're all set!** eSpeak-ng is now active - lightweight, fast, and 100% open-source.

**Want better quality?** Try Kokoro TTS (neural network, sounds great).

**For production:** ElevenLabs has the best overall quality if you need commercial-grade TTS.

---

## 🐛 Troubleshooting

**No sound?**
- Check system volume
- eSpeak-ng is now installed and active
- pyttsx3 fallback always works if eSpeak fails

**Want neural voice quality?**
- Try Kokoro: `uv run .claude/hooks/utils/tts/kokoro_tts.py "test"`
- First run downloads models, then works forever

**Need help?**
- Read full docs: `.claude/hooks/utils/tts/README.md`
- Test individual engines with commands above

---

## 📁 Files Created

```
.claude/
├── TTS_SETUP.md                          # This file (quick start)
└── hooks/
    ├── notification.py                   # Updated with TTS priority
    └── utils/tts/
        ├── README.md                     # Full documentation
        ├── espeak_tts.py                 # eSpeak-ng (default, installed!)
        ├── pyttsx3_tts.py                # pyttsx3 (fallback)
        ├── kokoro_tts.py                 # Kokoro TTS (neural quality)
        ├── chattts_tts.py                # ChatTTS
        ├── piper_tts.py                  # Piper TTS
        ├── elevenlabs_tts.py             # ElevenLabs
        └── openai_tts.py                 # OpenAI TTS
```

---

**Setup Date**: 2025-11-20
**Status**: ✅ **ACTIVE** - eSpeak-ng installed and ready!
