# Markup v0.4.1 — DMG installer layout fix

Packaging-only patch. No app code changes — same features as [v0.4.0](https://github.com/oratis/Markup/releases/tag/v0.4.0).

## 🐛 The fix

The release CI was assembling the DMG with a raw `hdiutil create -srcfolder Markup.app`, which produced a flat disk image: just the app icon in an oversized window, **no "Applications" drop target, no layout**. Installing meant guessing you had to drag the app to your Applications folder yourself.

CI now builds the DMG through Tauri's own `bundle_dmg.sh` (`tauri build --bundles dmg`), which honours the `bundle.macOS.dmg` layout in `tauri.conf.json` — proper window size, `Markup.app` on the left, `Applications` symlink on the right, drag-to-install as intended.

The signed-build path (when Apple Developer secrets are present) still re-packages the codesigned app manually, but now stages an `/Applications` symlink so it's never layout-less either.

## 📦 Files

- `Markup_0.4.1_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.4.1_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer credentials still pending). First open: `System Settings → Privacy & Security → Open Anyway`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
