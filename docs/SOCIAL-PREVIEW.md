# Social preview card

The GitHub **social preview** is the image that shows when the repo is shared on X / Slack / Discord / iMessage. Setting it makes every link look intentional — one of the highest-ROI, lowest-effort GTM assets (see [GTM-LAUNCH-PLAN.md](./GTM-LAUNCH-PLAN.md) §7).

## The asset
- **File:** [`docs/assets/social-card.png`](./assets/social-card.png) — **1280×640** PNG (GitHub's spec; it crops to ~1200×600 in some surfaces, so all content sits inside safe margins).
- Brand-matched: the real app icon, the indigo→purple gradient from the icon, and a parchment "rendered Markdown" panel that shows the reader-first idea at a glance (`# Markup`, `## Reader-first`, a code block with `press E to edit · ⌘/ for source`). The panel carries a `.md → .html` badge to surface the one-click HTML export.

## How to upload (≈30 seconds, user action)
1. GitHub → repo **Settings** → **General** → scroll to **Social preview**.
2. **Edit** → **Upload an image…** → pick `docs/assets/social-card.png`.
3. Save. Test by pasting `https://github.com/oratis/Markup` into a Slack/X draft.

## How to regenerate / tweak
Source is committed so it's reproducible — no design tool needed:

```bash
python3 docs/assets/make-social-card.py        # writes docs/assets/social-card.svg
node /path/to/render.js docs/assets/social-card.svg docs/assets/social-card.png
```

The renderer is a 6-line Node script using `sharp` (resvg-backed) at `density: 192`, resized to exactly 1280×640:

```js
const sharp = require('sharp'), fs = require('fs');
sharp(fs.readFileSync(process.argv[2]), { density: 192 })
  .resize(1280, 640, { fit: 'fill' }).png().toFile(process.argv[3]);
```

> `qlmanage` (Quick Look) also renders the SVG but pads to a square 1280×1280 at 2× and clips — use `sharp` for the correct aspect ratio.

Edit copy/colors/layout in [`make-social-card.py`](./assets/make-social-card.py) (palette and panel content are inline), then re-run the two commands above.
