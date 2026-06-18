# Screenshots

App Store marketing screenshots, composed from the raw captures in
`../../MarkupScreenshots*/` by `marketing/scripts/make-screenshots.py` (brand
gradient + wordmark + caption + the screenshot framed with shadow/rim). iOS status
bars / TestFlight banners are cropped off.

Regenerate: `python3 marketing/scripts/make-screenshots.py`

## iPhone — `ios-6.9/` (1320×2868, "6.9-inch display")
Apple's primary iPhone size; ASC scales it down to the smaller iPhone slots.

| # | File | Headline | Source |
|---|------|----------|--------|
| 1 | `01_read.png` | Read Markdown, beautifully rendered | IMG_4042 |
| 2 | `02_github-vault.png` | Open any GitHub repo as a vault | IMG_4041 |
| 3 | `03_bring-your-own.png` | Bring your own folder or GitHub repo | IMG_4039 |
| 4 | `04_reader-first.png` | A reader-first Markdown app | IMG_4038 |
| 5 | `05_files-icloud.png` | Works with Files & iCloud Drive | IMG_4040 |

## iPad — `ipad-13/` (2752×2064, "13-inch display", landscape)
Required for the universal app. Landscape is accepted by ASC.

| # | File | Headline | Source |
|---|------|----------|--------|
| 1 | `01_split-read.png` | Read your vault on iPad | IMG_0203 |
| 2 | `02_github-vault.png` | Open any GitHub repo as a vault | IMG_0202 |
| 3 | `03_themes.png` | Light, dark & sepia | IMG_0204 |
| 4 | `04_refresh.png` | Pull the latest from GitHub | IMG_0205 |
| 5 | `05_reader-first.png` | A reader-first Markdown app | IMG_0200 |

## Mac — `mac/` (2880×1800)
For the Mac App Store listing.

| # | File | Headline | Source |
|---|------|----------|--------|
| 1 | `01_reader.png` | Your Markdown, beautifully rendered | 205806 |
| 2 | `02_markdown.png` | Plain Markdown, always | 210215 |
| 3 | `03_quick-open.png` | Jump to any file | 210532 |
| 4 | `04_commands.png` | A command for everything | 205855 |
| 5 | `05_navigate.png` | Navigate big docs with ease | 210149 (cropped) |

Notes:
- **`05_navigate`** is cropped to the app window because the raw `210149` had a
  Chrome window behind it; the crop shows the reader + outline rail (no file
  sidebar). For a cleaner shot, re-capture that view with no other window behind.
- The Mac set has **no GitHub-vault shot** (all raws were a local-folder doc).
  Optional nice-to-have: capture the Mac "Open from GitHub" flow and add it.

## Optional
- A localized **简体中文** set (re-run with 中文 captions in the script).
