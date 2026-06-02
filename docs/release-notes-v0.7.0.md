# Markup v0.7.0 — drag files in, tidier Dock icon

## ✨ Drag Markdown / HTML / Canvas onto the window to open it
Drop a `.md` / `.markdown` / `.mdx` / `.mkd` / `.canvas` / `.html` file anywhere
on the Markup window and it opens as a tab — **with or without a vault open**.
Non-document files are ignored. (Previously Tauri swallowed OS file drops, so
dragging a file did nothing.)

## 🎨 App icon sized to match other apps
The Dock icon was a full-bleed square and looked larger than neighbouring apps.
It's now inset to Apple's standard icon grid (~82% with a transparent margin),
so it matches the rest of your Dock.

## 🛡️ Rolls up v0.6.2
Includes the v0.6.2 fix: a malformed `$…$` equation renders as an inline error
instead of blank-screening the app (plus a top-level error boundary).

## 📦 Files
- `Markup_0.7.0_apple-silicon.dmg` / `Markup_0.7.0_intel.dmg`
- `latest.json` + `.app.tar.gz` (auto-updater)
- `SHA256SUMS`

Signed + notarized; updates automatically from v0.6.1+.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
