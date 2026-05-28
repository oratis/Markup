# Markup v0.5.1 — Chinese-input fix + vault persistence

A patch release. **If you type Chinese (or any IME), update from v0.5.0** — it had a regression that inserted a newline on every keystroke.

## 🐛 Fix: Chinese / IME input inserting newlines
v0.5.0 dispatched an editor transaction *during* IME composition handling, which made the editor re-read the DOM and insert a spurious newline on each composed keystroke. Removed — Chinese/Japanese/Korean typing is stable again.

## ✨ Reopen your last vault on launch
Markup now remembers the vault you had open and restores it on the next launch (previously the file tree always started empty). On a future Mac App Store build this rides on macOS security-scoped bookmarks; on this direct build it restores the path directly.

## 📦 Files
- `Markup_0.5.1_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.1_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending). First open: **System Settings → Privacy & Security → Open Anyway**.

## 🆙 Upgrading
Drag-and-replace. No data-format changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
