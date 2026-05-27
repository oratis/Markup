# Markup v0.3.0 — Read first, Obsidian-style shell

> **Repositioning**: Markup is now positioned as **"the nicest way to read a Markdown vault"** — `用 HTML 的形态来看 MD`. The default mode is now **Read**; editing is one keystroke away (`E`) but no longer the front door.

This release ships a top-to-bottom visual redesign aligned with the Obsidian layout language (left ribbon · file tree · tab bar · main · right rail · status bar), plus the new Read / Edit / Source tri-state and a handful of real bugfixes that were lurking in the previous WYSIWYG-first path.

Full design plan: [docs/design/04-obsidian-redesign-plan.md](https://github.com/oratis/Markup/blob/main/docs/design/04-obsidian-redesign-plan.md)
High-fidelity HTML prototype: [docs/design/mockup-obsidian-redesign.html](https://github.com/oratis/Markup/blob/main/docs/design/mockup-obsidian-redesign.html)

---

## ✨ Shell redesign

- **Activity Ribbon** (new, leftmost 44px column). Six primary actions stacked vertically: Files · Quick Open · Vault Search · Command Palette · Graph · Settings (anchored to the bottom). Active state shows a 2px accent rail on the left.
- **Two-row title bar**. Row 1 = `◆ Markup / <vault> / <file>` breadcrumb identity (drag region, with a dirty dot when unsaved). Row 2 = format buttons + mode pill.
- **Right rail as segmented tabs**. Outline / Backlinks / Tags / Bookmarks are now a single resizable panel with a tab switcher instead of four stacked sub-panels eating each other's vertical space.
- **Typography pass** on the prose surface — larger headings, H2 bottom rule, inline code with a subtle elevated background + border, code blocks with a 3px accent rail and copy slot, blockquote with accent-soft background, table zebra + hover.
- **Token system**: all chrome reads from `--mk-*` CSS variables (`--mk-bg-app/sidebar/elevated`, `--mk-fg-default/strong/muted/faint`, `--mk-border`, `--mk-accent`, etc.) with the existing `--markup-*` kept as alias. Themes light / dark / sepia all updated.

## 🆕 Read / Edit / Source mode

- App defaults to **Read** (Milkdown rendered, `editable: false`). The surface reads as a static HTML document — no caret, no editing chrome.
- Press `E` to enter **Edit** (Milkdown WYSIWYG).
- Press `⌘/` to enter **Source** (CodeMirror).
- Press `Esc` from Edit/Source to return to **Read**.
- Mode pill in the top-right reflects current mode and is clickable to cycle.

## 🐛 Cursor jump in WYSIWYG editor (long-standing bug)

The Milkdown editor used to re-dispatch a full document REPLACE on every keystroke, because `initialValue` round-tripped through the store on every change. Press Enter → type → cursor would snap to the end of the previous line. Fix: the editor now treats itself as the single source of truth within a single file; only `fileKey` (tab switch) forces a content reload.

## 🐛 Graph view overhaul

Previous graph rendered all 300 node labels every frame, producing an unreadable horizontal text smear. New behaviour:
- Labels render only for the **top 24 hubs by degree** plus the active file; everything else is a dot. Hover any dot to see its filename.
- **Viewport-sized canvas** — claims ~90% of the window instead of a fixed 900×600.
- **Force parameters scale with node count** — repulsion `6000 + N·30`, edge length grows with `√N`, iterations up to 220. 300-node vaults actually spread out now instead of crushing into the centre.
- **Helpful empty state** when 0 edges — tells you to add `[[wikilinks]]` or run "Rebuild Link Index" from the command palette.
- Close button (×) in the header.

## 🐛 Container overflow + right-rail width

- Old default `outlineWidth` (220px) couldn't fit the new four-tab segmented control. Default bumped to **320px**; clamp minimum from 160 → 240. Existing users with stored value < 280 are auto-migrated to 320 on settings load.
- Root `<div>`, `<main>`, both `<aside>` elements now constrain overflow (`overflow-hidden` + `min-h-0` + `min-w-0`). Previously a too-narrow right rail could push a horizontal scrollbar onto the whole app.
- Outline's H1–H6 row tightened — `"all levels"` label → `"all"`, `"level cap N"` → `≤Hn`; full strings preserved as tooltips.

## 🐛 Format buttons no longer act in Read mode

The B / I / `<>` / 🔗 / — buttons used to fall back to `window.getSelection()` when no editor was focused, which in Read mode would `insertNode(textNode)` into the rendered DOM — producing visible `***` / `---` junk at the top of the document. Fixed by hiding the format cluster entirely when `readMode = true`. The row instead shows a hint: `Read mode · press [E] to edit`.

## 🧹 Other polish

- Onboarding copy refreshed to reflect the new "read first" positioning. English subtitle: *"The nicest way to read a Markdown vault."* / 中文: *"用 HTML 的形态来看 Markdown。"*
- Tab bar active indicator moved from `bottom-0` → `top-0`, colour driven by `--mk-accent`.
- Sidebar toggle deduplicated — Ribbon's Files icon (true leftmost x=0 of the window) is now the canonical handle; the in-title-bar duplicate is gone.
- Format toolbar buttons sit flush at the left edge of their row.
- Sidebar / right rail aside elements no longer leak content beyond their fixed width.

## 📦 Files

- `Markup_0.3.0_apple-silicon.dmg` — Apple Silicon Macs (M1 / M2 / M3 / M4)
- `Markup_0.3.0_intel.dmg` — Intel Macs
- `SHA256SUMS`

Both DMGs remain **unsigned** (signing pipeline requires Apple Developer credentials — see [ADR-002](https://github.com/oratis/Markup/blob/main/docs/decisions/ADR-002-distribution.md)). On first launch macOS Gatekeeper will block; open *System Settings → Privacy & Security → Open Anyway*.

## ⚙️ Migration notes

- The `--markup-*` CSS variables are preserved as aliases of `--mk-*` — themes / userscripts that depended on the old token names continue to work.
- The `readMode` setting defaults to `true`. If you want WYSIWYG-on-launch like 0.2.0, the next minor will surface this as a Settings toggle; for now you can pin the app open in Edit mode by pressing `E` after each launch (we'll add a default-mode toggle in 0.3.x).
- External file reload (mtime change → ReloadPrompt) is functionally unchanged but the Milkdown editor now ignores prop-driven content updates within the same tab — the reload still works through the store-level content replacement path.

---

**Full commit since v0.2.0**: see auto-generated notes below.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
