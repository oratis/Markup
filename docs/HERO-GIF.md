# Hero GIF — storyboard + capture script

The hero GIF is the single highest-ROI launch asset (see [GTM-LAUNCH-PLAN.md](./GTM-LAUNCH-PLAN.md) §0, §7). Goal: in **10–15 seconds**, a stranger understands "read your Markdown like a web page, edit on demand, with a real vault." Output goes to `docs/assets/hero.gif` and the `<img>` block at the top of [README.md](../README.md) gets uncommented.

## Before you record

- **Use a real, pretty vault.** Borrow a folder with 8–15 well-written `.md` notes (headings, a code block, a small table, maybe one Mermaid/KaTeX). Avoid lorem ipsum — real prose sells "reader-first."
- **Theme:** record in **Dark** (it reads best as a GIF and matches the dev audience). Optionally do a second take in Light for the screenshot set.
- **Window size:** make the app window ~**1100×720** (the default). Don't fullscreen — the rounded window + traffic lights look intentional.
- **Hide clutter:** clean menu bar (or crop it out), no notifications (turn on Do Not Disturb), default font sizes.
- **Slow down.** Pause ~1s on each "beat" so a viewer's eye can land. Jerky speed-runs read as confusing.

## Storyboard (≈14s)

| Beat | t | Action | Why it's in the shot |
|---|---|---|---|
| 1 | 0–2s | Vault already open in **Read** mode, a nice doc rendered. Slowly scroll one screen. | Lead with the payoff: MD looks like a clean web page. |
| 2 | 2–4s | Click another note in the file tree → it renders instantly. | Vault + speed. |
| 3 | 4–6s | Press **`E`** → the same doc becomes editable; type a few words; tweak a heading. | The "edit on demand" core idea. |
| 4 | 6–8s | Press **`Esc`** (back to Read) — show the read/edit toggle is one keystroke. | Reinforce the model. |
| 5 | 8–10s | **`⌘P`** → type 3–4 chars → jump to a file. | Quick Open / it's fast. |
| 6 | 10–13s | **`⌘⇧F`** → type a query → results across the vault → click one. | Full-text search = a real tool, not a toy. |
| 7 | 13–14s | Land back on a beautiful rendered doc; hold still 1s. | End on the payoff again. |

Optional 1s flourish if it fits: open the **graph view** for a beat. Don't let the GIF run past ~15s — file size and attention both fall off a cliff.

## Capture

macOS built-in is the cleanest source:

1. **`⌘⇧5`** → **Record Selected Portion** → drag a tight box around just the Markup window (include the rounded corners/title bar, exclude desktop clutter).
2. Record the storyboard above. Save the `.mov` to `~/Desktop/markup-hero.mov`.

> Tip: a short, deliberate take beats a long one you trim. Re-record rather than over-editing.

## Encode to an optimized GIF

GIF (not video) so it autoplays inline on GitHub/HN/PH. Two good paths — **gifski** gives the best quality/size:

### Option A — gifski (recommended)
```bash
brew install gifski ffmpeg

SRC=~/Desktop/markup-hero.mov
OUT=docs/assets/hero.gif
mkdir -p docs/assets

# downscale to ~820px wide, 18 fps, into a temp mp4 first (keeps gifski input clean)
ffmpeg -i "$SRC" -vf "fps=18,scale=820:-2:flags=lanczos" -an /tmp/hero-820.mp4 -y
gifski --fps 18 --width 820 --quality 80 -o "$OUT" /tmp/hero-820.mp4

ls -lh "$OUT"   # aim for < 5 MB; GitHub caps inline at ~10 MB but smaller = snappier
```

### Option B — ffmpeg palette (no extra deps beyond ffmpeg)
```bash
SRC=~/Desktop/markup-hero.mov
OUT=docs/assets/hero.gif
mkdir -p docs/assets

ffmpeg -i "$SRC" -vf "fps=18,scale=820:-2:flags=lanczos,palettegen=stats_mode=diff" /tmp/palette.png -y
ffmpeg -i "$SRC" -i /tmp/palette.png -lavfi "fps=18,scale=820:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" "$OUT" -y

ls -lh "$OUT"
```

**If it's too big (>~6 MB):** drop to `fps=15`, narrow to `width 720`, or trim a beat. **If colors band** (gradients in dark theme): with ffmpeg use `dither=sierra2_4a`; with gifski raise `--quality 90`.

## Wire it up

```bash
# README.md already has the block commented at the top — uncomment it:
#   <img src="docs/assets/hero.gif" alt="..." width="820">
git add docs/assets/hero.gif README.md
git commit -m "docs: add hero GIF to README"
git push origin main
```

## Stills (for PH gallery, sspai, social preview)

While the vault's set up, also grab 3–4 PNGs with **`⌘⇧4`** (or `⌘⇧5` → capture):
- a rendered doc in **Dark** + the same in **Light**,
- the **graph view**,
- **search** results across the vault.

Drop them in `docs/assets/` and reference under the README "Screenshots" section. For the **GitHub social preview** (Settings → Social preview, 1280×640), a single dark rendered-doc shot with the wordmark works well.
