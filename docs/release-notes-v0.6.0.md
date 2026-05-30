# Markup v0.6.0 — Signed & notarized install

**Markup now opens like any other Mac app — no Gatekeeper wall.**

Previous builds were unsigned, so the first launch hit macOS's "Markup can't be opened because Apple cannot check it for malicious software" dialog, and you had to dig into System Settings to allow it. That's gone.

## ✅ What changed
- The app is **code-signed with an Apple Developer ID** and uses the **hardened runtime**.
- The DMG is **notarized by Apple and stapled**, so Gatekeeper clears it offline.
- **Install is now: open the DMG → drag to Applications → double-click. That's it.**

This release also rolls up everything since v0.5.2 — richer HTML/PDF export (syntax highlighting, math, Mermaid, tidy lists) from v0.5.3–v0.5.5 — but the headline is a trustworthy, frictionless install.

## 📦 Files
- `Markup_0.6.0_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.6.0_intel.dmg` — Intel Macs
- `SHA256SUMS`

## Verify (optional)
```bash
spctl --assess --type open --context context:primary-signature -v Markup_0.6.0_apple-silicon.dmg   # → accepted
xcrun stapler validate /Applications/Markup.app                                                     # → worked
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
