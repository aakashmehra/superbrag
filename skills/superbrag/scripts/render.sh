#!/usr/bin/env bash
# Render a superbrag run:  bash render.sh <run_dir> [stills "f1,f2,..."]
#   full render  -> <run_dir>/superbrag.mp4 (-14 LUFS), superbrag.jpg poster, qa-sheet.jpg
#   stills mode  -> <run_dir>/stills/f<N>.png + stills/sheet.jpg (fast visual check before a full render)
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
RUN="$(cd "${1:?run dir}" && pwd)"; MODE="${2:-full}"
T="$(cd "$(dirname "$0")/../template" && pwd)"
[ -d "$T/node_modules/remotion" ] || (cd "$T" && npm install --no-audit --no-fund && npx remotion browser ensure)
mkdir -p "$RUN/public/sfx" && cp -R "$T/../assets/sfx/." "$RUN/public/sfx/"   # keep SFX in sync with the skill (new sounds work without a rebuild)
cd "$T"
if [ "$MODE" = "stills" ]; then
  rm -rf "$RUN/stills"; mkdir -p "$RUN/stills"; IFS=',' read -ra FR <<< "${3:?frames, e.g. 20,120,300}"
  for f in "${FR[@]}"; do npx remotion still src/index.ts SuperBrag "$RUN/stills/f$(printf %05d "$f").png" --frame="$f" --props="$RUN/props.json" --public-dir="$RUN/public" --log=error; done
  ffmpeg -v error -y -pattern_type glob -i "$RUN/stills/f*.png" -vf "scale=640:-1,tile=3x$(( (${#FR[@]} + 2) / 3 )):padding=6:color=white" -frames:v 1 "$RUN/stills/sheet.jpg"
  echo "$RUN/stills/sheet.jpg"; exit 0
fi
npx remotion render src/index.ts SuperBrag "$RUN/raw.mp4" --props="$RUN/props.json" --public-dir="$RUN/public" --crf=16 --log=error
# loudness to -14 LUFS / -1.5 dBTP (same as the reference), two-pass so it lands on target; video stream copied
M=$(ffmpeg -hide_banner -i "$RUN/raw.mp4" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | python3 -c "import sys,json,re; d=json.loads(re.search(r'\{[^{}]*\}', sys.stdin.read()).group()); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i "$RUN/raw.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:$M:linear=true" -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$RUN/superbrag.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RUN/superbrag.mp4")
ffmpeg -v error -y -ss "$(echo "$D * 0.3" | bc)" -i "$RUN/superbrag.mp4" -frames:v 1 -q:v 2 "$RUN/superbrag.jpg"
ffmpeg -v error -y -i "$RUN/superbrag.mp4" -vf "fps=1,scale=384:-1,tile=4x$(( (${D%.*} + 4) / 4 ))" -frames:v 1 "$RUN/qa-sheet.jpg"
ffmpeg -i "$RUN/superbrag.mp4" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
rm -f "$RUN/raw.mp4"; echo "$RUN/superbrag.mp4  (${D}s)"
