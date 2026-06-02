# Markup v0.6.2 — fix blank-screen crash on a bad equation

A reliability fix.

## 🐞 A malformed `$…$` could blank the whole app

If a document had an inline `$…$` math span that captured prose containing a
LaTeX control sequence KaTeX didn't understand (e.g. text with `\*`), KaTeX
threw a parse error **during render**. That exception was uncaught, so the
editor — and the entire window — went blank white. Because Markup reopens your
last session on launch, a single such document made the app unusable on every
start.

Fixes:
- KaTeX now renders an offending equation as an **inline error** (red) instead
  of throwing — one bad equation stays local.
- A top-level **error boundary** catches any future render error and shows a
  recoverable message with a **"Close restored tabs & reload"** button, instead
  of a blank window.

## 📦 Files
- `Markup_0.6.2_apple-silicon.dmg` / `Markup_0.6.2_intel.dmg`
- `latest.json` + `.app.tar.gz` (auto-updater)
- `SHA256SUMS`

Signed + notarized; updates automatically from v0.6.1+.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
