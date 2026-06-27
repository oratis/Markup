# SEO / comparison page drafts

> GTM-SCALE-PLAN.md §7 ("高意图对比页 SEO") + §6 复利渠道. **Evergreen, high-intent
> search traffic** — people Googling "Typora alternative" / "open-source Obsidian
> for Mac" / "read GitHub README offline" are mid-funnel and convert well.
>
> **Status: drafts.** Voice is matched to `marketing/app-store/listing.md`, but
> the owner should pass over it before publishing — positioning claims about
> Markup are the owner's to ratify. These are **not published** anywhere yet.

## What these are for

Each file is a landing page targeting one search intent. They're the body
content for either:
- a product site on GitHub Pages (GTM §7 "真正的产品站"), one page per route, or
- `dev.to` / 掘金 / Medium cross-posts (canonical back to the site).

## Honesty rules baked in (don't break these)

- **Platform truth (2026-06):** macOS ships (direct + Mac App Store) and
  iOS/iPadOS is in review. **Windows/Linux builds are validated in CI but not
  yet released** — every page says "Windows & Linux coming," never implies they
  ship today. Update these the day the beta lands.
- **Don't attack competitors** (GTM §9). Name where they're genuinely stronger
  (Obsidian's plugin ecosystem, Typora's maturity). Honesty converts; trashing
  competitors gets flagged and burns goodwill.
- **No invented numbers.** Benchmarks/claims trace to the product (reader-first,
  vault, backlinks, graph, Tantivy search, GitHub round-trip, Canvas, HTML/PDF
  export, MIT, no telemetry, Tauri/Rust native).

## Pages

| File | Target query | Angle |
|---|---|---|
| `markup-vs-typora.md` | "Typora alternative", "free Typora" | open-source + free + a vault, not just one doc |
| `obsidian-alternative-macos.md` | "Obsidian alternative macOS", "open source Obsidian" | open-source + native (not Electron) + plain files |
| `read-github-docs-offline.md` | "read GitHub README offline", "GitHub docs reader" | the unique wedge (GTM §3 unlock 3) |
