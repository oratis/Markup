# Markup v0.5.2 — DMG installer layout

A packaging-polish release. No app behavior changes.

## 🎨 DMG installer: large, centered icons
The installer window now shows **large (128px) icons, centered**, with Markup on the left and the Applications drop target on the right — instead of small icons stuck in the top-left corner.

Why it was broken: the release CI assembled the DMG with a tool whose icon-layout step relies on Finder automation, which silently does nothing on a headless CI runner. Switched to **dmgbuild**, which writes the disk-image layout directly (no Finder), so the intended layout is reproduced on CI.

## 📦 Files
- `Markup_0.5.2_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.2_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending). First open: **System Settings → Privacy & Security → Open Anyway**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
