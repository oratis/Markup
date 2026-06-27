# AlternativeTo listing — Markup (paste-ready)

> GTM-SCALE-PLAN.md §6 (复利渠道) + §10 item 5. **High-intent, evergreen traffic**:
> people searching "Typora alternative" / "Obsidian alternative for Mac" land here.
> 🔵 **Outward action — owner submits.** This file is the staged copy only.
> Submit at <https://alternativeto.net/manage/submit-software/> (needs an account).

## Core fields

| Field | Value |
|---|---|
| **Name** | Markup |
| **Website** | https://github.com/oratis/Markup |
| **License** | Free · Open Source (MIT) |
| **Platforms** | Mac · iPhone · iPad *(add Windows + Linux once the cross-platform builds ship — see GTM §3 unlock 2)* |
| **Category** | Office & Productivity → Text & Document Editors / Markdown |

## Tagline (short)

> A fast, native, open-source Markdown editor. Read your notes *and any GitHub repo* like a beautiful web page; edit when you want.

## Description (long)

```
Markup is a free, open-source (MIT), native Markdown editor. It's reader-first:
it renders your Markdown like a polished web page — syntax-highlighted code,
LaTeX math, Mermaid diagrams, tables, task lists, GitHub-style callouts — and
lets you edit on demand.

Point it at any folder of .md files (iCloud, Files, or a local vault) — nothing
to import, no proprietary format, your notes stay plain Markdown on disk. Or open
any GitHub repo as a vault and read the whole thing offline, with two-way
round-trip back to GitHub.

• Vault with wikilinks, backlinks, graph view, and tags
• Tantivy full-text search across thousands of files in ~1 second
• Obsidian-compatible Canvas
• High-fidelity HTML / PDF export
• Light / Dark / Sepia themes, custom CSS
• English and 简体中文
• Private by default: no account, no telemetry, no tracking

Built with Tauri + Rust, so it's small and fast and native — not an Electron wrapper.
Available on macOS (direct download + Mac App Store) and iOS/iPadOS.
```

## "Alternative to" links (the whole point — high search intent)

Tag Markup as an alternative to:

- **Typora** — the primary target ("free, open-source Typora"; Typora went paid/closed)
- **Obsidian** — "Obsidian alternative for macOS" is a high-volume query; Markup is open-source + plain-files
- **MacDown** — the unmaintained macOS-only incumbent
- **Mark Text** — the closest "free WYSIWYG" comparable (now unmaintained)
- *(secondary)* Marked 2, Bear, iA Writer

## Feature tags to check on the form

`markdown` · `open-source` · `wysiwyg` · `note-taking` · `vault` · `wikilinks` ·
`backlinks` · `graph-view` · `full-text-search` · `latex` · `mermaid` ·
`github` · `offline` · `privacy` · `pdf-export` · `html-export` · `canvas`

## Notes for the submitter

- Honest framing: on macOS, Tauri renders via the system WebView (WKWebView) — it's
  native, not Electron. Say "native (Tauri/Rust)", don't claim "no webview".
- Add a screenshot or two from `marketing/MarkupScreenshots-mac/` during submission.
- Re-list platforms to include Windows/Linux the day those builds ship. CI already
  compile-checks both via the `cross-platform` job in `.github/workflows/ci.yml`;
  the remaining shipping gates (bundling/signing) are tracked in
  `docs/CROSS-PLATFORM-HARDENING.md`.
