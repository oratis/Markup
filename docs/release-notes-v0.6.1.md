# Markup v0.6.1 — automatic updates

Markup can now **update itself**.

## 🔄 In-app auto-update
- On launch, Markup checks for a newer signed release and installs it in place — no manual re-download.
- Updates are delivered as a **signed + notarized** `.app` and verified with an Ed25519 signature before installing, so an update can't be tampered with.
- This is the first release that publishes the update feed (`latest.json`). **From v0.6.1 onward updates are automatic;** if you're on an older build, grab v0.6.1 from Releases once and you're set.

## 📦 Files
- `Markup_0.6.1_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.6.1_intel.dmg` — Intel Macs
- `Markup_0.6.1_*.app.tar.gz` + `latest.json` — used by the auto-updater (you don't download these manually)
- `SHA256SUMS`

Signed with an Apple Developer ID and notarized — opens with no Gatekeeper prompt.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
