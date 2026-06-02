# HTML support (Mac desktop)

> Shipped on `main` (PR #38, follow-ups in this PR). The Tauri desktop app now
> opens and renders `.html` / `.htm` as a first-class document type, mirroring
> the iOS app ([`ios/.../02-html-support.md`](./ios/02-html-support.md)).

## What works
- **Vault lists HTML.** `scanner::is_listable` includes `html`/`htm`, so HTML
  files appear in the file tree with a distinct ◍ sky-blue icon
  (`FileTree.tsx`). Drag-and-drop onto the window opens them too.
- **Faithful rendering.** In **read mode** the file loads through Tauri's asset
  protocol (`convertFileSrc`) inside a sandboxed `<iframe>`
  (`sandbox="allow-same-origin allow-scripts allow-popups allow-forms"`), so
  relative CSS / images / links resolve and the page renders as authored — the
  desktop analog of iOS's `loadFileURL(_:allowingReadAccessTo:)`. The CSP
  `frame-src` allows the `asset:` / `*.asset.localhost` origins
  (`tauri.conf.json`).
- **Edit the source.** The Read/Edit toggle flips the same tab between the
  rendered iframe and the CodeMirror **source editor** with **HTML syntax
  highlighting** (`@codemirror/lang-html`); wikilink autocompletion — a Markdown
  affordance — is suppressed for HTML.
- **Search & Quick Open.** HTML is full-text indexed by its **visible text**
  (`scanner::strip_html` drops `<script>` / `<style>` blocks and tags, decodes
  common entities). The document **title** comes from the HTML `<title>`
  (`scanner::html_title`), threaded through `index.upsert_file_titled`; with no
  `<title>` it falls back to the filename. Canvas JSON stays excluded from the
  body index.

## Architecture map
| Concern | Code |
| --- | --- |
| File-kind predicates | `src-tauri/src/scanner.rs` — `is_html`, `is_listable`, `is_indexable` |
| Strip-to-text for indexing | `scanner::strip_html` |
| Title extraction | `scanner::html_title` → `index::upsert_file_titled` |
| Bulk + incremental indexing | `src-tauri/src/vault.rs` — `scan_indexable_files`, `upsert_indexable` |
| Open dialog filter | `src-tauri/src/commands.rs` — `looks_like_html`, `.add_filter("HTML", …)` |
| Render vs edit | `src/components/HtmlView.tsx` (iframe ↔ `SourceEditor language="html"`) |
| Tab routing | `src/lib/canvas-path.ts` `isHtmlPath`, `src/store.ts` `TabKind`, `src/App.tsx` |
| File-tree icon | `src/components/FileTree.tsx` |

## Design choices
- HTML renders **as-authored** — no theme/font injection. HTML documents bring
  their own styles; forcing a dark background or app fonts onto an arbitrary
  page would corrupt its layout more often than it would help. (Same call as
  iOS.)
- The iframe is **sandboxed** but allows scripts so interactive HTML (e.g.
  exported reports, slide decks) works; it has same-origin only against the
  asset protocol, not the app shell.
- Indexing strips to plain text so the Markdown scans (headings, wikilinks,
  tags) see nothing to parse — no false `#anchor` tags from HTML fragments.

## Parity with iOS
| Capability | Mac desktop | iOS |
| --- | --- | --- |
| List `.html`/`.htm` in vault | ✅ | ✅ |
| Faithful render w/ relative assets | ✅ (asset iframe) | ✅ (`loadFileURL`) |
| Full-text search of visible text | ✅ (Tantivy) | ✅ (SQLite FTS5) |
| `<title>` as document title | ✅ | ✅ |
| Edit raw HTML source | ✅ (HTML highlight) | ✅ |
| Open from other apps / drop | ✅ (drag-drop, Open dialog) | ✅ (`onOpenURL`) |
| Theme injection into HTML | ❌ (by design) | ❌ (by design) |

## Not yet
- Theme-matching for HTML (forcing dark background on light pages).
- Outline / in-page anchor navigation inside HTML.
- Wikilink/backlink graph across HTML files.
