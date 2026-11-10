#!/usr/bin/env bash
# One-time setup for superbrag:  bash scripts/setup.sh
# Needs: Node.js 22+, FFmpeg, Python 3.10+ (or uv), espeak-ng (for the free Kokoro voice).
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
S="$(cd "$(dirname "$0")/.." && pwd)"

command -v node >/dev/null || { echo "✗ Node.js 22+ is required (macOS: brew install node)"; exit 1; }
command -v ffmpeg >/dev/null || { echo "✗ FFmpeg is required (macOS: brew install ffmpeg · Ubuntu: sudo apt install ffmpeg)"; exit 1; }
command -v espeak-ng >/dev/null || echo "! espeak-ng not found. Kokoro needs it for pronunciation (macOS: brew install espeak-ng · Ubuntu: sudo apt install espeak-ng)"

echo "→ Video engine (Remotion) and website capture (Playwright)"
(cd "$S/template" && npm install --no-audit --no-fund && npx remotion browser ensure && npx playwright install chromium)

echo "→ Python env: Kokoro (free local voice) + faster-whisper (word timings)"
if command -v uv >/dev/null; then
  uv venv -q --allow-existing --python 3.11 "$S/.venv"
  uv pip install -q --python "$S/.venv/bin/python" kokoro soundfile faster-whisper pip
else
  PY="$(command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3)"
  "$PY" -m venv "$S/.venv"
  "$S/.venv/bin/pip" install -q kokoro soundfile faster-whisper
fi

# point the scripts at that env (keeps anything already in .env, e.g. API keys)
touch "$S/.env"
grep -q '^KOKORO_PYTHON=' "$S/.env" || echo "KOKORO_PYTHON=$S/.venv/bin/python" >> "$S/.env"
grep -q '^WHISPER_PYTHON=' "$S/.env" || echo "WHISPER_PYTHON=$S/.venv/bin/python" >> "$S/.env"

echo "✓ superbrag is ready. Optional premium voices: add MINIMAX_API_KEY or ELEVENLABS_API_KEY to $S/.env"
