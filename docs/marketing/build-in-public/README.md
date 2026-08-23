# Build-in-public — technical article pipeline

> GTM-SCALE-PLAN.md §7. Each post is a **launch point** of its own: it lands on
> HN / Lobsters / 掘金 / dev.to, pulls in developers, and earns stars — then the
> sustaining content flywheel that bridges 3K → 10K.
>
> **Drafts — owner ratifies voice + technical depth before publishing.** Tech
> claims are written from the actual code/design docs, but you know what's safe
> to reveal. Nothing is published.

## Pipeline

| Draft | Angle / hook | Source of truth | Status |
|---|---|---|---|
| `github-roundtrip.md` | "Materialize, then it's local" — reading a GitHub repo as a vault, and proposing edits as a PR, **without a git library** (git blob SHA-1 by hand) | `github_vault.rs`, `docs/design/06-github-roundtrip.md` | **draft ready** |
| *(todo)* `chinese-ime-tauri.md` | Fixing Chinese IME in a Tauri/WebView editor — a known pain point, and a core audience (GTM §4 中文) | editor code + WebView quirks | outline |
| *(todo)* `tantivy-1s-index.md` | Full-text search over thousands of Markdown files in ~1s with Tantivy | `index.rs`, `scanner.rs` | outline |
| *(todo)* `obsidian-canvas-reverse.md` | Reverse-engineering Obsidian's `.canvas` format for compatibility | Canvas code, `docs/V2_CANVAS.md` | outline |
| *(todo)* `tauri-sandbox-notes.md` | Tauri sandbox / capability gotchas shipping a real macOS app (signing, entitlements, MAS) | `release.yml`, `Entitlements.plist`, app-store docs | outline |

## House rules

- **One post = one launch.** Don't dump them all at once; space them to sustain
  the flywheel (GTM §5/§7).
- **Accurate or omit.** Every technical claim must match the shipped code. When
  unsure, cut it.
- **Link back** to the repo + a canonical copy (the product site once live).
- **Honest platform state** (macOS/iOS today; Win/Linux coming).
