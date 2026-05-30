# Markup v0.5.5 — fix list spacing in HTML/PDF export

A bug-fix release for export layout.

## 🐞 Lists rendered badly in exports

Exporting a document with **task lists** or lists that have blank lines between items ("loose" lists) produced ugly output: checkboxes stranded on their own line above the text, and large vertical gaps between items.

Cause: a loose list wraps each item's text in a block `<p>`, whose default margins detached the bullet/checkbox from its text and ballooned the spacing.

Fixes:
- Collapse the `<p>` margins inside list items, so loose lists look as tight as normal ones.
- Emit GitHub-style task-list classes and keep the checkbox **inline** with its text.
- Tighten nested-list and list-block spacing.

## 📦 Files
- `Markup_0.5.5_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.5.5_intel.dmg` — Intel Macs
- `SHA256SUMS`

Unsigned (Apple Developer signing still pending — tracked for v0.6.0). First open: **System Settings → Privacy & Security → Open Anyway**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
