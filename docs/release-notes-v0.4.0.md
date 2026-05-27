# Markup v0.4.0 — Preview in browser + auto update notice

Two small but very tangible additions on top of [v0.3.0's Obsidian-style redesign](https://github.com/oratis/Markup/releases/tag/v0.3.0):

## ✨ Preview as HTML in browser

A new **Preview** button lives in the title bar (Row 2, just left of the mode pill). One click:

1. Renders the current `.md` through the Rust-side `renderHtml` pipeline (comrak + theme CSS — KaTeX, Mermaid, GFM tables, the lot).
2. Writes it to `<tempDir>/markup-preview/<name>.html`.
3. Opens it with your OS default browser.

It's the same render path as `Export HTML` / `Print to PDF` but skipped the save dialog — you get a live URL in your real browser in one click. Great for handing a link to a teammate over a screenshare, doing a quick "what does this actually look like in Chrome" sanity check, or zooming the rendered output to 200% without affecting the editor pane.

Re-clicking the button overwrites the same temp file, so the open browser tab can just `⌘R` to refresh.

## 🔔 Bottom-left "new version available" banner

When a newer GitHub release is published, the next time you open Markup (and every 6 hours while it stays open) it'll show a discreet pill in the bottom-left:

```
🟣  New version v0.5.0
    0.4.0 → 0.5.0 · click to download
                                       ×
```

- Click anywhere on the pill → opens the GitHub release page in your browser, where the signed-or-unsigned DMG awaits.
- Hit the `×` → dismissed for *that exact version*; you won't be nagged again until a newer one ships.
- Implementation hits `GET /repos/oratis/Markup/releases/latest` directly — no Tauri auto-updater key infrastructure required, no signed `latest.json`. The price is one extra click to download. Worth it for the simplicity.

If we ever turn on Tauri's signed auto-updater (would require provisioning the Ed25519 signing key in CI), this banner can quietly evolve into a one-click in-place install. The UI surface stays the same.

## 🧰 Under the hood

- New: `@tauri-apps/plugin-opener` + `tauri-plugin-opener` — lets us open URLs and file paths through the OS handler from JS.
- New: `src/lib/preview-html.ts` — temp-dir writer + opener.
- New: `src/lib/check-update.ts` — GitHub API client + naive semver compare + dismiss-state persistence.
- New: `src/components/UpdateBanner.tsx` — the pill itself, with a soft accent-pulse on the indicator dot.
- Capability added: `opener:default` / `opener:allow-open-url` / `opener:allow-open-path` in `src-tauri/capabilities/default.json`.

## 📦 Files

- `Markup_0.4.0_arm64.dmg` — Apple Silicon (M-series, native)
- `Markup_0.4.0_x64.dmg` — Intel
- `SHA256SUMS`

Both DMGs unsigned (same as 0.3.0 — Apple Developer credentials still pending). First open: `System Settings → Privacy & Security → Open Anyway`.

## 🆙 Upgrading from 0.3.0

Just download and drag. No data-format changes; vaults, settings, recent files, bookmarks, shortcuts all carry over.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
