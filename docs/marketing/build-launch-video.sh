#!/bin/bash
# Reproducible launch-video builder for Markup.
# Rebuilds docs/marketing/Markup-launch.mp4 from the raw screen recording
# (docs/marketing/Markup.mp4) + ElevenLabs voice-over + ElevenLabs music.
#
# Every VO beat is ANCHORED to a verified segment of the recording — if you
# re-record, re-check the timestamps in the `beats` array below.
#
# Prereqs:  ffmpeg, python3, node (with `sharp`: run `npm i sharp` once), and
#           an ElevenLabs API key in the environment:  export EL_KEY=sk_...
# Run from the repo root:  bash docs/marketing/build-launch-video.sh
#
# NOTE: the API key is read from $EL_KEY and is never written to disk.

set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
B="docs/marketing/.build"           # intermediates (gitignored)
SRC="docs/marketing/Markup.mp4"
OUT="docs/marketing/Markup-launch.mp4"
OUT_NM="docs/marketing/Markup-launch-no-music.mp4"
mkdir -p "$B"
: "${EL_KEY:?set EL_KEY to your ElevenLabs API key}"

VOICE="EXAVITQu4vr4xnSDxMaL"          # Sarah — clear, confident
MODEL="eleven_multilingual_v2"
CROP="crop=1292:852:96:130,scale=-2:660,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x2b2a6e,fps=30,format=yuv420p"

echo ">>> 1/5 render brand cards (SVG -> PNG via sharp)"
python3 docs/marketing/make-cards.py
node -e "const s=require('sharp'),f=require('fs');for(const n of ['title','end'])s(f.readFileSync('$B/'+n+'.svg'),{density:160}).resize(1280,720,{fit:'fill'}).png().toFile('$B/'+n+'.png');" \
  || { echo 'need sharp: run `npm i sharp`'; exit 1; }

echo ">>> 2/5 generate background music (~50s)"
curl -s -X POST "https://api.elevenlabs.io/v1/music" \
  -H "xi-api-key: $EL_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"Minimal, modern, uplifting tech product launch background music. Warm analog synth pads with a gentle steady arpeggio pulse, clean and optimistic, soft and unobtrusive under a voice-over. Instrumental only, no vocals, no heavy drums.","music_length_ms":50000}' \
  -o "$B/music.mp3"

# beat = TYPE|ASSET_or_START|VO TEXT   (footage starts are verified segments)
beats=(
"card|$B/title.png|This is Markup. A native, open-source Markdown editor for macOS."
"foot|10|Open a note, and it renders like a clean, beautiful web page. Not a plain text box."
"foot|21|Point it at a folder, and your whole vault is right there. Real documents, with headings and tables, rendered the way they are meant to be read."
"foot|49|An outline and a backlinks panel keep long notes easy to navigate, so you always see how everything connects."
"foot|33|And it is built on Tauri, so it stays genuinely native and light. Around eighty-eight megabytes, not a heavy Electron app."
"card|$B/end.png|Free, and open source. Star Markup on GitHub."
)

echo ">>> 3/5 synth VO + cut clips"
rm -f "$B"/clip_*.mp4 "$B/list.txt"; i=0
for b in "${beats[@]}"; do
  IFS='|' read -r TYPE ASSET TEXT <<< "$b"
  vo="$B/vo_$i.mp3"
  curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE?output_format=mp3_44100_128" \
    -H "xi-api-key: $EL_KEY" -H "Content-Type: application/json" \
    -d "{\"text\":$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$TEXT"),\"model_id\":\"$MODEL\",\"voice_settings\":{\"stability\":0.5,\"similarity_boost\":0.75}}" \
    -o "$vo"
  dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$vo")
  if [ "$TYPE" = "card" ]; then
    cdur=$(python3 -c "print(round($dur+0.7,2))")
    ffmpeg -loglevel error -loop 1 -i "$ASSET" -i "$vo" -t "$cdur" -r 30 \
      -vf "scale=1280:720,format=yuv420p" -af "apad" \
      -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 "$B/clip_$i.mp4" -y
  else
    cdur=$(python3 -c "print(round($dur+0.5,2))")
    ffmpeg -loglevel error -ss "$ASSET" -i "$SRC" -i "$vo" -t "$cdur" \
      -filter_complex "[0:v]$CROP[v];[1:a]apad[a]" -map "[v]" -map "[a]" \
      -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 "$B/clip_$i.mp4" -y
  fi
  echo "file 'clip_$i.mp4'" >> "$B/list.txt"
  i=$((i+1))
done

echo ">>> 4/5 concat (no-music master)"
ffmpeg -loglevel error -f concat -safe 0 -i "$B/list.txt" -c:v libx264 -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 "$OUT_NM" -y

echo ">>> 5/5 duck music under VO + fades"
VDUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_NM")
FOUT=$(python3 -c "print(round($VDUR-1.3,2))")
ffmpeg -loglevel error -i "$OUT_NM" -i "$B/music.mp3" -filter_complex "
[1:a]atrim=0:${VDUR},volume=0.24,afade=t=in:st=0:d=1.2,afade=t=out:st=${FOUT}:d=1.3[mus];
[0:a]asplit=2[voa][vosc];
[mus][vosc]sidechaincompress=threshold=0.025:ratio=8:attack=5:release=300[mduck];
[mduck][voa]amix=inputs=2:normalize=0:duration=first[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -ar 44100 -ac 2 -movflags +faststart "$OUT" -y

echo ">>> done -> $OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of default=noprint_wrappers=1 "$OUT"
