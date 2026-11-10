#!/usr/bin/env python3
"""story.json -> voice + word timings + timeline -> props.json for the Remotion template.

Usage: python3 build.py <run_dir>

Reads  <run_dir>/story.json (written by the agent from site.json).
Writes <run_dir>/public/voice.wav, public/sfx/*, public/music/*, and <run_dir>/props.json.
Voice lines are cached in <run_dir>/work/ by text hash, so re-running after visual-only edits is instant.
"""
import difflib, hashlib, json, os, re, shutil, subprocess, sys

FPS = 30
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for _l in open(os.path.join(SKILL, ".env")) if os.path.exists(os.path.join(SKILL, ".env")) else []:  # skill .env (WHISPER_PYTHON, keys)
    _k, _, _v = _l.strip().partition("=")
    if _k and not _k.startswith("#") and _v.strip(): os.environ.setdefault(_k.strip(), _v.strip().strip("\"'"))
LEAD = 0.18   # seconds between a scene's cut and its first word
GAP = 0.32    # seconds after a line before the next cut
TAIL = 1.6    # extra hold on the last scene
MIN = {"search": 2.6, "end": 2.2}  # minimum seconds per scene type (typing needs time)

def sh(*a, **k): return subprocess.run(a, check=True, capture_output=True, text=True, **k)
def dur(p): return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p).stdout)
def norm(w): return re.sub(r"[^a-z0-9]", "", w.lower())

def tts(text, out, v):
    """One line of voice -> trimmed mono 48 kHz wav. Cached by text+voice settings."""
    key = hashlib.sha1(json.dumps([text, v], sort_keys=True).encode()).hexdigest()[:10]
    wav = f"{out}_{key}.wav"
    if os.path.exists(wav): return wav
    txt = f"{out}_{key}.txt"; open(txt, "w").write(text)
    cmd = [sys.executable, os.path.join(SKILL, "scripts", "tts.py"), txt, "--out", f"{out}_{key}.mp3"]
    for k in ("provider", "voice", "model"):
        if v.get(k): cmd += [f"--{k}", v[k]]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: sys.exit(f"TTS failed for {text!r}:\n{r.stdout}{r.stderr}")
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    tempo = f",atempo={v['speed']}" if v.get("speed") and v["speed"] != 1 else ""
    sh("ffmpeg", "-v", "error", "-y", "-i", f"{out}_{key}.mp3", "-af", trim + tempo, "-ac", "1", "-ar", "48000", wav)
    return wav

_model = None
def whisper_words(wav):
    global _model
    try:
        from faster_whisper import WhisperModel
    except ImportError:  # this python lacks it: use the one named in .env, else estimate (and say so)
        py = os.environ.get("WHISPER_PYTHON")
        code = ("import sys,json;from faster_whisper import WhisperModel as M;"
                "s,_=M('base.en',compute_type='int8').transcribe(sys.argv[1],word_timestamps=True);"
                "print(json.dumps([(w.word.strip(),w.start) for x in s for w in x.words]))")
        r = subprocess.run([py, "-c", code, wav], capture_output=True, text=True) if py else None
        if r and r.returncode == 0: return json.loads(r.stdout.strip().splitlines()[-1])
        print("  ! faster-whisper unavailable: word timings estimated (set WHISPER_PYTHON in .env)")
        return None
    _model = _model or WhisperModel("base.en", compute_type="int8")
    segs, _ = _model.transcribe(wav, word_timestamps=True)
    return [(w.word.strip(), w.start) for s in segs for w in s.words]

def word_times(say, wav, length):
    """Start time (s, within the clip) of every word in `say`: whisper-aligned, else spread by characters."""
    words = say.split()
    pos, c = [], 0
    for w in words: pos.append(c / max(1, len(say))); c += len(w) + 1
    est = [p * length for p in pos]                      # fallback: proportional to character offset
    heard = whisper_words(wav)
    if not heard: return est
    sm = difflib.SequenceMatcher(None, [norm(w) for w in words], [norm(w) for w, _ in heard], autojunk=False)
    got = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): got[a + k] = heard[b + k][1]
    out = []
    for i in range(len(words)):                          # unmatched words: interpolate between matched neighbours
        if i in got: out.append(got[i]); continue
        lo = max([j for j in got if j < i], default=None); hi = min([j for j in got if j > i], default=None)
        if lo is not None and hi is not None: out.append(got[lo] + (got[hi] - got[lo]) * (i - lo) / (hi - lo))
        else: out.append(est[i])
    return out

def main(run):
    story = json.load(open(os.path.join(run, "story.json")))
    pub, work = os.path.join(run, "public"), os.path.join(run, "work")
    os.makedirs(work, exist_ok=True)
    shutil.copytree(os.path.join(SKILL, "assets", "sfx"), os.path.join(pub, "sfx"), dirs_exist_ok=True)
    v = story.get("voice", {})
    pron = v.get("pronounce", {})

    # Avatar rule: the site's Apple touch icon when it has one (its own square logo), else the story's avatar.
    site = os.path.join(run, "site.json")
    touch = json.load(open(site)).get("appleTouchIcon") if os.path.exists(site) else None
    if touch and os.path.exists(os.path.join(pub, touch)):
        for s in story["scenes"]:
            if s["type"] in ("meet", "end") and not s.get("keepAvatar"): s["avatar"] = touch  # keepAvatar: scene belongs to someone else (e.g. the maker of a case study)
        print(f"avatar: {touch} (apple touch icon)")

    t, scenes, speech, clips = 0.0, [], [], []
    for i, s in enumerate(story["scenes"]):
        say = s.get("say", "").strip()
        start = t
        if say:
            spoken = say
            for a, b in pron.items(): spoken = re.sub(re.escape(a), b, spoken, flags=re.I)
            wav = tts(spoken, os.path.join(work, f"line{i:02d}"), v)
            L = dur(wav)
            vstart = start + LEAD
            clips.append((wav, vstart))
            wt = word_times(say, wav, L)
            words = [{"w": w, "f": round((LEAD + x) * FPS)} for w, x in zip(say.split(), wt)]
            length = LEAD + L + GAP
            speech.append([round(vstart * FPS), round((vstart + L) * FPS)])
        else:
            words, length = [], 2.0
        length = max(length, MIN.get(s["type"], 0)) + s.get("hold", 0) + (TAIL if i == len(story["scenes"]) - 1 else 0)
        props = {k: val for k, val in s.items() if k not in ("type", "say", "enter", "hold", "keepAvatar")}
        scenes.append({"type": s["type"], "start": round(start * FPS), "dur": round(length * FPS), "enter": s.get("enter", "cut"), "words": words, "props": props})
        t += length
    # fix rounding so scenes tile exactly
    for a, b in zip(scenes, scenes[1:]): a["dur"] = b["start"] - a["start"]
    total = scenes[-1]["start"] + scenes[-1]["dur"]

    # one voice track, each line at its slot
    if clips:
        ins = sum((["-i", w] for w, _ in clips), [])
        fc = ";".join(f"[{k}]adelay={int(st * 1000)}:all=1[a{k}]" for k, (_, st) in enumerate(clips))
        fc += ";" + "".join(f"[a{k}]" for k in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0,apad=whole_dur={total / FPS}[v]"
        sh("ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-ar", "48000", "-ac", "1", os.path.join(pub, "voice.wav"))

    music = None
    m = story.get("music", {"track": "happy-beats-business-moves-vol-11-by-ende-dot-app.mp3", "volume": 0.24})
    if m:
        os.makedirs(os.path.join(pub, "music"), exist_ok=True)
        shutil.copy(os.path.join(SKILL, "assets", "music", m["track"]), os.path.join(pub, "music", m["track"]))
        music = {"src": f"music/{m['track']}", "volume": m.get("volume", 0.24)}

    props = {"brand": story["brand"], "scenes": scenes, "voice": "voice.wav" if clips else None, "music": music, "speech": speech, "durationInFrames": total}
    json.dump(props, open(os.path.join(run, "props.json"), "w"), indent=1, ensure_ascii=False)
    print(f"{total} frames = {total / FPS:.1f}s")
    for s, src in zip(scenes, story["scenes"]):
        print(f"  f{s['start']:4d}-{s['start'] + s['dur']:4d}  {s['type']:8s} {src.get('say', '')}")

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1])
