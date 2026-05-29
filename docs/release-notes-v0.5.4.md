# Markup v0.5.4 — fix "Open as HTML" preview

A bug-fix release.

## 🐞 "Open as HTML" / browser preview was blocked

Opening the current document as HTML in your browser failed with:

> Preview failed: Not allowed to open path …/markup-preview/….html

The renderer wrote the preview file correctly, but the opener was denied because the app granted the "open path" capability **without a path scope** — so every path was rejected. Added a tight scope (`$TEMP/markup-preview/*`) that allows exactly the preview files and nothing else.

## 📦 Files
- `Markup_0.5.4_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.4_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending — tracked for v0.6.0). First open: **System Settings → Privacy & Security → Open Anyway**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
