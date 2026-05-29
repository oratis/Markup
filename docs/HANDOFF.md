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
- **Five external awesome-list PRs opened** (track / respond to review — full table in `docs/awesome-list-pr.md`):
  - awesome-tauri **#724** (`tauri-apps/awesome-tauri`), awesome-mac **#2109** (`jaywcjlove/awesome-mac`).
  - awesome-markdown **#122** (`BubuAnabelas/awesome-markdown`), open-source-mac-os-apps **#1133** (`serhii-londar`, 49k★, edited `applications.json`), awesome-macOS **#839** (`iCHAIT`, 19k★, merges by endorsement votes).
- **Social-preview card produced**: `docs/assets/social-card.png` (1280×640) + reproducible generator + `docs/SOCIAL-PREVIEW.md`. **User still needs to upload it** (Settings → Social preview).
- **One-click MD→HTML export now highlighted** across README (EN+中文), LAUNCH-POSTS (all channels), GTM plan, and the social card (`.md → .html` badge). Feature is real: Rust `render_html` (comrak + inlined theme CSS → self-contained .html) via toolbar "Preview as HTML" + "Export as HTML…".
- **Repo description + topics** optimized (added `obsidian`/`wysiwyg`/`note-taking`/`open-source`).
- **v0.6.0 signing pipeline is code-complete**: `release.yml` auto-signs + notarizes + staples when the 6 Apple secrets exist, else falls back to unsigned. Runbook: `docs/app-store/signing-setup.md`. Release notes pre-written: `docs/release-notes-v0.6.0.md`. `CONTRIBUTING.md` added.

## Working rules (must follow)
- Land code via **PR + merge**, never push feature work directly to `main`. `main` is branch-protected; needs **two CI checks** (Frontend + Rust) green. (Docs-only commits have been pushed to `main` directly, following repo history.)
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Report progress in Chinese** (user preference).
- Keep version in sync across three files: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `cargo update -p markup --offline`).

## Blocked on the user (don't try to brute-force)
- **A — user's machine**: record the Hero GIF + screenshots (script/storyboard in `docs/HERO-GIF.md`); **upload the social-preview image** — it's already produced at `docs/assets/social-card.png`, just needs uploading via Settings → Social preview (`docs/SOCIAL-PREVIEW.md`).
- **B — user's Apple account**: follow `docs/app-store/signing-setup.md` to create the Developer ID cert, set the 6 GitHub secrets, tag `v0.6.0` → CI auto-produces the signed build. This is the hard gate before GTM **Phase B** (Show HN / PH / 少数派 main push).

## First steps when you pick up
1. `cd /Users/oratis/Documents/Claude/Markup && git status && git log --oneline -8` — confirm it matches this doc.
2. `gh pr view 724 -R tauri-apps/awesome-tauri` and `gh pr view 2109 -R jaywcjlove/awesome-mac` — check for review to address.
3. Read `docs/GTM-LAUNCH-PLAN.md` §0 (preconditions) and §6 (channel sequencing) for the big picture. Then **ask the user** which GTM item to push next (e.g., social-preview image design, more Phase-A awesome-list PRs) — **don't kick off a big action before confirming.**

## Only known open bug
**Task #11**: a single **cosmetic** blank line appears below the caret during Chinese IME composition. It is NOT written to the file (content is correct) — diagnosed as WebKit contenteditable native IME rendering. A speculative CSS mitigation shipped in v0.5.2; awaiting user confirmation whether to dig further.

## Reference
Full transcripts: `/Users/oratis/.claude/projects/-Users-oratis-Documents-Claude-Markup/`.
Key docs: `docs/RELEASE-PLAN.md` (engineering release process/roadmap) · `docs/app-store/MAS-publishing-plan.md` (Mac App Store track) · `docs/design/04-obsidian-redesign-plan.md` (UI redesign).
