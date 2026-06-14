# Markup v0.8.0 — open GitHub repos as vaults

## 📦 Open a GitHub repository as a vault
Point Markup at a GitHub repo and read/edit the whole thing locally. **File →
Open from GitHub** (or paste `owner/repo`): sign in for private repos, pick from
**Your repositories**, and **Open as vault** in one click — the repo downloads to
a local working copy that search, the file tree, wikilinks, and the index all use
offline. Browse a repo first if you'd rather grab a single file.

- **Open as vault is the primary action** — from the repos list or a pasted
  `owner/repo`, no hunting for a hidden button. Esc closes the dialog.
- **Pull latest from GitHub** refreshes the vault incrementally (downloads only
  what changed) — and now **warns before overwriting files you've edited locally**.
- The title bar shows a GitHub vault as `⎇ owner/repo@branch`, so it's never
  confused with a local folder; the branch is pinned so a refresh always follows
  the branch you opened.
- Browser niceties: clickable **breadcrumbs**, a **Markdown-only** filter, a
  filter box for long repo lists, an inline **Sign in** on private-repo / rate-limit
  errors, and a one-retry on transient rate limits.

## 🧭 Site-style navigation
Read a folder of docs like a small website: **prev/next document pager**, a
**Section** rail listing the docs in the current folder, **in-page `#heading`
links** that scroll to the heading, and cross-document link following.

## ✍️ Callouts in the editor
`> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]` now render as styled
callouts inline in the WYSIWYG editor, matching the export and the iOS reader.

## 📦 Files
- `Markup_0.8.0_apple-silicon.dmg` / `Markup_0.8.0_intel.dmg`
- `latest.json` + `.app.tar.gz` (auto-updater)
- `SHA256SUMS`

Signed + notarized; updates automatically from v0.6.1+.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
