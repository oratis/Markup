# site/ — Markup product landing page

The product site for GTM-SCALE-PLAN.md §7 ("真正的产品站"): a single
self-contained `index.html` (inline CSS, no build step) plus `assets/`.

Replaces the weak status quo where `homepageUrl` points at the releases page —
this is a real landing surface (hero, download matrix, feature grid, honest
comparison table, the GitHub-docs-reader wedge) tuned for conversion + SEO.

## Honesty rules (keep these true)

- **Platform truth:** macOS available; iOS/iPadOS "in review"; Windows/Linux
  "coming soon" (CI-validated, not released). Update the day the beta ships.
- **Respectful comparison** (GTM §9): the table names where Typora/Obsidian are
  stronger. Don't turn it into a hit piece.
- **No invented numbers / no fake social proof.**

## Preview locally

```bash
python3 -m http.server 8765 --directory site
# open http://localhost:8765
```

## Publish (owner, one-time)

GitHub Pages serves this via [`.github/workflows/pages.yml`](../.github/workflows/pages.yml):

1. Repo → **Settings → Pages → Source: "GitHub Actions"**.
2. **Actions → "Deploy site" → Run workflow.**
3. Point `package.json` `homepageUrl` (and the repo "Website" field) at the
   Pages URL.

Going live is intentionally manual — publishing the public homepage is the
owner's call. After the first deploy, add a `push:` trigger scoped to
`paths: [site/**]` to auto-deploy on content changes.

## Assets

`hero.gif`, `screenshot-*.png`, `social-card.png`, `128x128@2x.png` are copied
from `docs/assets/` and `src-tauri/icons/`. If those originals change, refresh
the copies here.
