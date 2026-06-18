# Screenshots

Marketing screenshots for the App Store, composed from the raw device captures in
`../../MarkupScreenshots/` by `marketing/scripts/make-screenshots.py` (brand
gradient + caption + framed screenshot; iOS status bar / TestFlight banner cropped).

Regenerate: `python3 marketing/scripts/make-screenshots.py`

## iOS — `ios-6.9/` (1320×2868, "6.9-inch display")
This is Apple's current primary iPhone size; ASC scales it to the smaller iPhone
slots, so a separate 6.5″ set is optional.

| # | File | Headline | Source |
|---|------|----------|--------|
| 1 | `01_read.png` | Read Markdown, beautifully rendered | IMG_4042 (reader + code + tabs) |
| 2 | `02_github-vault.png` | Open any GitHub repo as a vault | IMG_4041 (repo file list) |
| 3 | `03_bring-your-own.png` | Bring your own folder or GitHub repo | IMG_4039 (onboarding) |
| 4 | `04_reader-first.png` | A reader-first Markdown app | IMG_4038 (onboarding) |
| 5 | `05_files-icloud.png` | Works with Files & iCloud Drive | IMG_4040 (Files picker) |

Upload at least 1–3; the first 2–3 appear in App Store search results, so lead
with `01` and `02`. `05` (the system Files picker) is the weakest — optional.

## Still needed
- **iPad 13″ (2064×2752)** — the app is universal, so Apple **requires** iPad
  screenshots. Capture a few on an iPad (or iPad simulator) — e.g. tabs + split
  live preview, the file list beside the reader — drop the raw PNGs in
  `../../MarkupScreenshots/`, add them to `SHOTS` in the generator with an
  `ipad-13` output dir, and re-run.
- **Mac (1280×800 or 2560×1600)** — for the Mac App Store listing; capture the
  desktop app (editor, GitHub vault, search, HTML export, themes).
- Optional: a localized 简体中文 set (re-run with 中文 captions).
