# Handoff — Markup GTM phase

> For a fresh session (or person) taking over. Last updated after v0.5.2 + the GTM doc/asset pass.
> The current goal is **GTM / growing GitHub stars** — not new features.

## What this project is
**Markup** (github.com/oratis/Markup) — a fast, native, open-source macOS Markdown editor. Reader-first: renders `.md` like a web page by default, edit on demand.
Stack: **Tauri 2** (Rust) · **Milkdown/ProseMirror** WYSIWYG · **CodeMirror 6** source · **Tantivy** full-text search · React + Zustand + Tailwind + Vite · Biome lint.
Local repo: `/Users/oratis/Documents/Claude/Markup`.

## Current state — do NOT redo
- **Shipped through v0.5.2**: dual-arch (`apple-silicon` + `intel`) DMGs via `PR → CI → tag → release.yml`; DMG uses dmgbuild for the centered-icon layout.
- **GTM docs ready** (all in `docs/`, committed + pushed to `main`):
  - `GTM-LAUNCH-PLAN.md` — master plan (positioning, comparison table, channels Phase A/B/C, 2-week sprint).
  - `LAUNCH-POSTS.md` — paste-ready Show HN / Product Hunt / 少数派 / V2EX / X / Reddit copy (worded for the unsigned pre-1.0 build).
  - `HERO-GIF.md` — 14s storyboard + macOS capture & gifski/ffmpeg encode script.
  - `awesome-list-pr.md` — list-submission entries + commands.
- **README rewritten**: English-first + 中文 section, differentiation table, corrected install (`apple-silicon`/`intel`, was wrongly `x64.dmg`), star CTA, star-history chart. The hero GIF `<img>` is a **commented placeholder block** — uncomment after recording.
- **Ten external awesome-list PRs opened** (track / respond to review — full table in `docs/awesome-list-pr.md`):
  - awesome-tauri **#724**, awesome-mac **#2109**, awesome-markdown **#122**, open-source-mac-os-apps **#1133** (49k★, `applications.json`), awesome-macOS **#839** (iCHAIT, vote-gated).
  - awesome-markdown-editors **#168** (`UPCOMING.md`), awesome-note-taking **#82** (Tauri section), phmullins/awesome-macos **#194**, linsa-io/macos-apps **#49**, awesome-native-macosx-apps **#80**.
  - **Deferred:** `rust-unofficial/awesome-rust` is a perfect fit but has a hard **>50-star gate** — **resubmit once Markup passes 50★** (see awesome-list-pr.md).
- **Social-preview card produced**: `docs/assets/social-card.png` (1280×640) + reproducible generator + `docs/SOCIAL-PREVIEW.md`. **User still needs to upload it** (Settings → Social preview).
- **One-click MD→HTML export highlighted** across README (EN+中文), LAUNCH-POSTS (all channels), GTM plan, and the social card (`.md → .html` badge). Copy was upgraded after v0.5.3–v0.5.5 made export **high-fidelity**: Rust `render_html` now emits syntax-highlighted code (inline styles), KaTeX math, Mermaid→SVG, heading anchors, theme-aware HTML/PDF (GitHub/plain/Tufte). Honesty caveat kept in all copy: ordinary docs are a single self-contained offline file; **math/diagram docs load those renderers from a CDN**. Entry points: toolbar "Preview as HTML" + "Export as HTML…".
- **Repo description + topics** optimized (added `obsidian`/`wysiwyg`/`note-taking`/`open-source`).
- **v0.6.0 signing pipeline is code-complete**: `release.yml` auto-signs + notarizes + staples when the 6 Apple secrets exist, else falls back to unsigned. Runbook: `docs/app-store/signing-setup.md`. Release notes pre-written: `docs/release-notes-v0.6.0.md`. `CONTRIBUTING.md` added.

## Working rules (must follow)
- Land **all** changes — **including docs** — via **PR + merge**; never push directly to `main`. `main` is branch-protected: needs the two CI checks (**Frontend** + **Rust**) green, branch up to date (`strict`); **no review required**, so self-merge once both checks pass. (Policy updated 2026-05 — earlier docs-only direct pushes are no longer the practice.)
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Report progress in Chinese** (user preference).
- Keep version in sync across three files: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `cargo update -p markup --offline`).

## Blocked on the user — **Phase B is now UNBLOCKED**
The old gates are cleared: **v0.6.0 is signed & notarized** ✓, **hero GIF** ✓ (in README), **social-preview image** ✓ (uploaded). What's left is the user actually launching — see **`docs/TODO.md`** for the live checklist:
- Publish the launch video (`docs/marketing/Markup-launch.mp4`) to YouTube.
- Post Phase B (Show HN / PH / 少数派 / V2EX / Reddit) — copy ready in `docs/LAUNCH-POSTS.md`.
- Bootstrap real stars (also unblocks `awesome-rust` at ≥50★); rotate the ElevenLabs key.

## First steps when you pick up
1. `cd /Users/oratis/Documents/Claude/Markup && git status && git log --oneline -8` — confirm it matches this doc.
2. `gh pr view 724 -R tauri-apps/awesome-tauri` and `gh pr view 2109 -R jaywcjlove/awesome-mac` — check for review to address.
3. Read `docs/GTM-LAUNCH-PLAN.md` §0 (preconditions) and §6 (channel sequencing) for the big picture. Then **ask the user** which GTM item to push next (e.g., social-preview image design, more Phase-A awesome-list PRs) — **don't kick off a big action before confirming.**

## Only known open bug
**Task #11**: a single **cosmetic** blank line appears below the caret during Chinese IME composition. It is NOT written to the file (content is correct) — diagnosed as WebKit contenteditable native IME rendering. A speculative CSS mitigation shipped in v0.5.2; awaiting user confirmation whether to dig further.

## Reference
Full transcripts: `/Users/oratis/.claude/projects/-Users-oratis-Documents-Claude-Markup/`.
Key docs: `docs/RELEASE-PLAN.md` (engineering release process/roadmap) · `docs/app-store/MAS-publishing-plan.md` (Mac App Store track) · `docs/design/04-obsidian-redesign-plan.md` (UI redesign).
