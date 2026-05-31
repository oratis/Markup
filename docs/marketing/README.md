# Marketing assets

Reproducible launch-video pipeline + the raw recording. The finished GIF and
still screenshots live in [`../assets/`](../assets/) (those are committed; the
videos here are **gitignored** because they're large).

## Files
| File | Tracked? | What |
|---|---|---|
| `Markup.mp4` | no (gitignored) | the raw screen recording (source footage) |
| `Markup-launch.mp4` | no | finished launch video — VO + ducked music (for YouTube) |
| `Markup-launch-no-music.mp4` | no | same cut, voice-over only |
| `build-launch-video.sh` | ✅ | rebuilds the launch video end-to-end |
| `make-cards.py` | ✅ | generates the branded title/end cards |
| `.build/` | no | intermediates (cards, VO mp3s, music, clips) |

## Rebuild / re-cut the launch video
```bash
npm i sharp                      # once — renders the SVG cards to PNG
export EL_KEY=sk_...             # your ElevenLabs API key (never written to disk)
bash docs/marketing/build-launch-video.sh
```
Output: `docs/marketing/Markup-launch.mp4` (1280×720, ~37s).

### How it works
- **Window crop:** the recording includes desktop wallpaper; `crop=1292:852:96:130`
  isolates the app window, then it's scaled and centered on the brand gradient (16:9).
- **VO is the anchor.** Each beat in the `beats=()` array pairs a narration line with a
  **verified** footage timestamp (a segment that actually shows what's being said).
  Current recording demonstrates: reader-first rendering, the vault/file-tree, tables,
  and the outline/backlinks panel. It does **not** show edit mode, source, graph view,
  search, quick-open, or HTML export — so those aren't narrated. To feature them, record
  ~5–10s of each, drop the clip in, and add a matching beat.
- **Audio:** ElevenLabs TTS (voice "Sarah") per beat; ElevenLabs Music for the bed;
  the music is **sidechain-ducked** under the VO with fade-in/out.

## Stills
The README screenshots (`../assets/screenshot-*.png`) were extracted from `Markup.mp4`:
```bash
ffmpeg -ss 12 -i docs/marketing/Markup.mp4 -frames:v 1 -vf "crop=1292:852:96:130,scale=1100:-2" out.png
```
(timestamps used: 12s read view · 28s vault+table · 52s outline/backlinks)

> The shared ElevenLabs key should be **rotated** after use.
