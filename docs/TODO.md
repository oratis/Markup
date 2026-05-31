# Markup — GTM TODO (hand-off)

> Living checklist for the GTM / "grow GitHub stars" work. Read `docs/HANDOFF.md` for full context.
> **Status: Phase B is UNBLOCKED** — signed build ✓, hero GIF ✓, social card ✓ all done. The main remaining work is *launching* + polish.
> Stars: **3**. Last updated after the launch-video session.

---

## ✅ Done (do NOT redo)
- **v0.6.0 signed & notarized** — DMG opens with no Gatekeeper prompt. README + all launch posts updated accordingly.
- **Social-preview image** uploaded & verified live (`usesCustomOpenGraphImage: true`). Asset: `docs/assets/social-card.png`.
- **Hero GIF** cut from the real usage recording → `docs/assets/hero.gif`, wired into the top of `README.md`.
- **Launch video** (37s, 720p, VO + ducked music) → `docs/marketing/Markup-launch.mp4` (+ `-no-music` variant). Every VO line anchored to verified footage. Built from `docs/marketing/Markup.mp4` (gitignored). Recipe in `/tmp/launchvid` (not committed — see "save the recipe" below).
- **10 awesome-list PRs** opened; **1 merged** (`mundimark/awesome-markdown-editors #168`). MD→HTML export copy upgraded to high-fidelity everywhere.

---

## 🔴 User-only — the actual launch (everything's ready)
- [ ] **Publish the launch video to YouTube** (you said you'll do this). Then drop the link into the README + the X/PH/sspai posts.
- [ ] **Phase B — post the launches.** Copy is paste-ready in `docs/LAUNCH-POSTS.md` (signed-build wording already in):
  - [ ] **Show HN** — weekday ~8–10am US Eastern; be in-thread 3–4h.
  - [ ] **Product Hunt** — Tue–Thu; gallery = hero GIF + stills + the video.
  - [ ] **少数派 (sspai)** — long-form; China, high intent.
  - [ ] **V2EX 分享创造**, then cross-post results to X / 即刻.
  - [ ] **Reddit** — r/macapps, r/opensource, r/SideProject, r/tauri (don't paste identical text).
- [ ] **Bootstrap stars** (real, no vote-rings) — also unblocks `awesome-rust` (≥50★ gate).
- [ ] **Rotate the ElevenLabs API key** (it was shared in chat).
- [ ] *(optional)* Record ~5–10s each of the features the launch video can't show — **press E to edit, ⌘P quick-open, ⌘⇧F search, graph view, one-click Export→HTML** — drop them in `docs/marketing/` and a session will splice them + matching VO into a full-feature cut.

## 🟡 Claude-can-do (polish; ask a session to pick these up)
- [x] **README "Screenshots" filled** — 3 stills extracted from the recording → `docs/assets/screenshot-{read,vault,outline}.png`, wired into README.
- [x] **Launch-video recipe saved** (key-free) → `docs/marketing/{build-launch-video.sh,make-cards.py,README.md}`; rerun with `EL_KEY=… bash docs/marketing/build-launch-video.sh`.
- [ ] *(optional)* Chinese-VO version of the launch video; a vertical 9:16 Shorts cut; burned-in subtitles.
- [ ] **Monitor the 9 open awesome-list PRs**; respond to any review. Resubmit `awesome-rust` once Markup ≥ 50★.

---

## awesome-list PRs — live status (full table/format notes: `docs/awesome-list-pr.md`)
| List | PR | Status |
|---|---|---|
| mundimark/awesome-markdown-editors | [#168](https://github.com/mundimark/awesome-markdown-editors/pull/168) | ✅ **MERGED** |
| tauri-apps/awesome-tauri | [#724](https://github.com/tauri-apps/awesome-tauri/pull/724) | open |
| jaywcjlove/awesome-mac | [#2109](https://github.com/jaywcjlove/awesome-mac/pull/2109) | open |
| BubuAnabelas/awesome-markdown | [#122](https://github.com/BubuAnabelas/awesome-markdown/pull/122) | open |
| serhii-londar/open-source-mac-os-apps | [#1133](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1133) | open |
| iCHAIT/awesome-macOS | [#839](https://github.com/iCHAIT/awesome-macOS/pull/839) | open (vote-gated) |
| tehtbl/awesome-note-taking | [#82](https://github.com/tehtbl/awesome-note-taking/pull/82) | open |
| phmullins/awesome-macos | [#194](https://github.com/phmullins/awesome-macos/pull/194) | open (slow maintainer) |
| linsa-io/macos-apps | [#49](https://github.com/linsa-io/macos-apps/pull/49) | open |
| open-saas-directory/awesome-native-macosx-apps | [#80](https://github.com/open-saas-directory/awesome-native-macosx-apps/pull/80) | open (web-wrapper rule risk) |
| **deferred:** rust-unofficial/awesome-rust | — | **resubmit at ≥50★** |

## Working rules
- **All** changes (including docs) land via **PR + merge** — never direct-push to `main`. Needs the 2 CI checks (Frontend + Rust) green; no review required, so self-merge once green.
- End commits with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Report progress in Chinese.** Don't kick off outward-facing actions (new PRs, posting) before confirming.
