# Markup v0.5.3 — richer HTML/PDF export

Export now renders what you see in the editor: syntax-highlighted code, math, and diagrams.

## ✨ Export & "Open as HTML" improvements

- **Syntax highlighting** for code fences, with inline styles — exports stay a single self-contained file, no external CSS. The TypeScript family (`ts`/`tsx`/`jsx`) is highlighted as JavaScript so the common case looks right.
- **Math (KaTeX)** — `$inline$` and `$$display$$` now render in exports. Math is parsed at the AST level (the same rule the editor uses), so prose like "$5 and $10" is never mistaken for math.
- **Mermaid diagrams** — ` ```mermaid ` blocks render to SVG in exports.
- **Heading anchors** — headings get stable `id`s, so exported docs support in-page links / tables of contents.
- **Polished CSS** — better code blocks, tables (zebra rows, scroll on overflow), inline code, task lists, and footnotes across all three themes (GitHub / Plain / Tufte).
- **Respects your theme** — HTML and PDF export now use the export theme from Settings (previously always GitHub).
- **Better PDF print** — the print flow waits for math/diagram rendering before opening the dialog, so saved PDFs aren't captured half-rendered.

Math and Mermaid load their renderers from a CDN, and **only when a document actually uses them** — ordinary docs export as fully offline, self-contained HTML.

## 🧹 Under the hood

- Refactored `App.tsx`: 16 effects extracted into 8 focused, unit-tested hooks.
- Added Playwright end-to-end tests (app boot + WYSIWYG/source toggle) wired into CI.
- Fixed local test runs on Node 26 (in-memory `localStorage` polyfill for jsdom).

## 📦 Files
- `Markup_0.5.3_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.3_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending — tracked for v0.6.0). First open: **System Settings → Privacy & Security → Open Anyway**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
