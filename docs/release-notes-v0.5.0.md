# Markup v0.5.0 — Images, Chinese input fix, open-with, browser preview

A feature + fix release. Headline: WYSIWYG images actually work now, Chinese (IME) typing no longer corrupts lines, double-clicking a `.md` opens it in Markup, and the Preview-in-browser button works. Also lays the groundwork for a future Mac App Store build.

## ✨ WYSIWYG images
Vault images never rendered in the editor before (no asset-protocol conversion) and pasting an image inserted raw `![](…)` text. Now:
- Pasted / dragged images become **real image nodes** and **render inline** (paths resolved to `asset://` URLs; the markdown on disk stays a clean relative path).
- Pre-existing images in a document render too.
- Paste with no vault open shows a hint instead of silently doing nothing.
- Images are left-aligned and no longer yank the caret to centre after a paste.

## 🐛 Chinese / CJK input fix (中文换行)
Typing Chinese via an IME used to jump the caret and mangle line breaks — both mid-composition and in the result. Root cause: editor decorations were recomputed (and React state updated) *during* the IME composition, which aborts it. Fixed by deferring all of that to `compositionend`. Latin typing is unaffected.

## 📂 Open `.md` with Markup
- Double-clicking a `.md` in Finder (or `open file.md`, or "Open With → Markup") now actually **opens the file** — the app handles the macOS open-document event (cold start *and* while already running).
- Markup registers as an `Owner`-rank handler for `.md` / `.markdown` / `.mdx` / `.mkd`, so it can be set as your default Markdown app.

## 🖥 Preview as HTML in browser
The Preview button (next to the mode pill) now works — it renders the current note to a temp `.html` and opens it in your default browser. (Previously failed with a path-permission error.)

## 🧱 Under the hood / MAS groundwork
- New `@tauri-apps/plugin-opener` (open URLs / files) and `tauri-plugin-persisted-scope`.
- Sandbox entitlements, a MAS build config + signing script, and an `IS_MAS_BUILD` flag that compiles the GitHub update banner out of any future App Store build (App Review compliance). None of this changes the direct-download build's behaviour.
- Full plan in `docs/app-store/MAS-publishing-plan.md`.

## 📦 Files
- `Markup_0.5.0_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.0_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending). First open: **System Settings → Privacy & Security → Open Anyway**.

## 🆙 Upgrading
Drag-and-replace. No data-format changes — vaults, settings, recents, bookmarks, shortcuts all carry over.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
