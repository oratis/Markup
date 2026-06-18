# Markup v1.0.1 — Export HTML fixes + Check for Updates

## 🛠️ Export as HTML now exports the document you're looking at
"Export as HTML" exported a fixed *"Welcome to Markup"* page instead of the open
document (a stale-closure bug), and dumped the file into ~/Downloads with no
choice of location. Now it:

- exports the **current document**, and
- opens a **Save dialog** so you pick where it goes, with an "Exported …"
  confirmation.

(The same stale-document bug is fixed for **Export PDF** too.)

## 🔄 Check for Updates + Changelog in About
The **About Markup** window (⌘-menu → About) now has:

- **Check for Updates** — tells you if you're on the latest version, or offers a
  one-click **Get vX.Y.Z** to the download page.
- **Changelog** — opens the releases page.

## 📦 Files
- `Markup_1.0.1_apple-silicon.dmg` / `Markup_1.0.1_intel.dmg`
- `latest.json` + `.app.tar.gz` (auto-updater)
- `SHA256SUMS`

Signed + notarized; updates automatically from v0.6.1+.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
