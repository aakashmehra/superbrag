#!/usr/bin/env python3
"""Voiceover from script text -> voice.mp3 (MiniMax, ElevenLabs, or free local Kokoro).

Usage:
  python3 tts.py script.txt [--provider minimax|elevenlabs|kokoro] [--voice ID] [--model ID] [--out voice.mp3]

Keys from env: ELEVENLABS_API_KEY, MINIMAX_API_KEY (+ MINIMAX_GROUP_ID on older MiniMax accounts,
MINIMAX_HOST=api.minimaxi.com for mainland-China accounts). Provider defaults to whichever key is set,
else Kokoro (free, local; KOKORO_PYTHON points at the venv it's installed in).
"""
import json, os, sys, urllib.error, urllib.request

# .env in the current folder, then the skill's own .env (one level up from scripts/). Real env vars win.
for env in (".env", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")):
    if not os.path.exists(env): continue
    for line in open(env):
        k, _, v = line.strip().partition("=")
        if k and not k.startswith("#") and v.strip(): os.environ.setdefault(k.strip(), v.strip().strip("\"'"))

def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

def post(url, body, headers):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode(errors='replace')[:500]}")

# ponytail: one request per script; fine for shorts (both APIs take ~5-10k chars), chunk if scripts get longer
def elevenlabs(text, voice, model):
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("set ELEVENLABS_API_KEY")
    voice = voice or "JBFqnCBsd6RMkjVDRZzb"  # "George", a stock narrator voice
    return post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                {"text": text, "model_id": model or "eleven_flash_v2_5"}, {"xi-api-key": key})  # flash = half the price of multilingual_v2

def minimax(text, voice, model):
    key = os.environ.get("MINIMAX_API_KEY") or sys.exit("set MINIMAX_API_KEY")
    g = os.environ.get("MINIMAX_GROUP_ID")
    url = f"https://{os.environ.get('MINIMAX_HOST', 'api.minimax.io')}/v1/t2a_v2" + (f"?GroupId={g}" if g else "")
    r = json.loads(post(url, {
        "model": model or "speech-02-turbo",  # turbo = cheaper than hd "text": text, "stream": False,
        "voice_setting": {"voice_id": voice or "English_expressive_narrator", "speed": 1, "vol": 1, "pitch": 0},
        "audio_setting": {"sample_rate": 44100, "bitrate": 128000, "format": "mp3", "channel": 1},
    }, {"Authorization": f"Bearer {key}"}))
    if r.get("base_resp", {}).get("status_code") != 0: sys.exit(f"minimax: {r.get('base_resp')}")
    return bytes.fromhex(r["data"]["audio"])  # MiniMax returns hex-encoded audio

def kokoro(text, voice, model):  # free, runs locally; voices: af_heart, am_michael, bf_emma, bm_george, ...
    try:
        import io, numpy as np, soundfile as sf
        from kokoro import KPipeline
    except ImportError:  # kokoro lives in its own venv (see KOKORO_PYTHON in .env); rerun this script there
        py = os.environ.get("KOKORO_PYTHON")
        if not py or os.path.abspath(sys.executable) == os.path.abspath(py): sys.exit("kokoro not installed; set KOKORO_PYTHON in .env")
        os.execv(py, [py] + sys.argv)
    # espeak-ng (Kokoro's fallback for unknown words) ignores data paths longer than ~160 chars and then
    # fails on a CI path that doesn't exist. If the venv sits deep in the filesystem, use a short copy.
    import shutil, espeakng_loader, misaki.espeak  # noqa: F401  (misaki sets the long path on import)
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    data = espeakng_loader.get_data_path()
    if len(data) > 120:
        short = os.path.join(os.path.expanduser("~"), ".cache", "superbrag-espeak")
        if not os.path.exists(os.path.join(short, "phontab")): shutil.copytree(data, short, dirs_exist_ok=True)
        EspeakWrapper.set_data_path(short)
    voice = voice or "am_michael"
    p = KPipeline(lang_code=voice[0], repo_id="hexgrad/Kokoro-82M")  # a_ = American, b_ = British
    buf = io.BytesIO()
    sf.write(buf, np.concatenate([r.audio.numpy() for r in p(text, voice=voice)]), 24000, format="MP3")
    return buf.getvalue()

if __name__ == "__main__":
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and not sys.argv[i - 1].startswith("--")]
    if not args: sys.exit(__doc__)
    text = open(args[0]).read().strip()
    default = "minimax" if os.environ.get("MINIMAX_API_KEY") else "elevenlabs" if os.environ.get("ELEVENLABS_API_KEY") else "kokoro"
    provider = arg("--provider", default)
    fn = {"elevenlabs": elevenlabs, "minimax": minimax, "kokoro": kokoro}.get(provider) or sys.exit(f"unknown provider {provider}")
    out = arg("--out", "voice.mp3")
    audio = fn(text, arg("--voice"), arg("--model"))  # generate first so a failed run never truncates an existing file
    open(out, "wb").write(audio)
    print(f"{provider} -> {out} ({os.path.getsize(out) // 1024} KB)")
