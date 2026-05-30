# Markup — GTM TODO (hand-off)

> Living checklist for whoever picks up the GTM / "grow GitHub stars" work.
> Goal = stars, not new features. Read `docs/HANDOFF.md` first for full context, then `docs/GTM-LAUNCH-PLAN.md` (§0 preconditions, §6 sequencing).
> Last updated end of the social-card + awesome-list + MD→HTML-copy session.

---

## 🔴 Blocked on the user (only they can do these — don't brute-force)

- [ ] **Record the Hero GIF + 3–4 screenshots.** The #1 README blocker (10-sec "wow"). Storyboard + capture script: `docs/HERO-GIF.md`. After recording: drop `docs/assets/hero.gif`, then **uncomment the hero `<img>` block** in `README.md` (top of file). Add the stills to the `## Screenshots` section.
- [ ] **v0.6.0 signing + notarization.** Hard gate before Phase B (Show HN / PH / 少数派 main push). Follow `docs/app-store/signing-setup.md`: create the Developer ID cert + set the 6 GitHub secrets, then tag `v0.6.0` → CI auto-produces a signed/notarized DMG. Release notes pre-written: `docs/release-notes-v0.6.0.md`. **After it ships: delete the "unsigned / Open Anyway" sentence from every post in `docs/LAUNCH-POSTS.md` and the status note in `README.md`.**
- [x] **Upload the social-preview image.** ✅ Done — verified live (`usesCustomOpenGraphImage: true`). Asset committed at `docs/assets/social-card.png`; regen steps in `docs/SOCIAL-PREVIEW.md`.
- [ ] **Bootstrap initial stars (real, not vote-rings).** Currently ~1★. Matters for two reasons: (a) awesome-list maintainers weigh popularity; (b) it unblocks `rust-unofficial/awesome-rust` (hard ≥50★ gate). Share with friends/network/relevant communities.

---

## 🟡 Phase A — in flight (monitor; a session CAN do these)

### Open awesome-list PRs — 10 total, all submitted, awaiting review/merge
Full table + format notes: `docs/awesome-list-pr.md`. Monitor with `gh pr view <n> -R <repo> --json state,comments,reviews,statusCheckRollup`.

| List | PR | Watch for |
|---|---|---|
| tauri-apps/awesome-tauri | [#724](https://github.com/tauri-apps/awesome-tauri/pull/724) | strict lint (≤24-word desc, no parens, **signed commits**) |
| jaywcjlove/awesome-mac | [#2109](https://github.com/jaywcjlove/awesome-mac/pull/2109) | may want 4-language README sync |
| BubuAnabelas/awesome-markdown | [#122](https://github.com/BubuAnabelas/awesome-markdown/pull/122) | Danger ≤1 insertion (satisfied) |
| serhii-londar/open-source-mac-os-apps | [#1133](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1133) | edited `applications.json` (not README) |
| iCHAIT/awesome-macOS | [#839](https://github.com/iCHAIT/awesome-macOS/pull/839) | **vote-gated** — needs 👍/endorsements to merge |
| mundimark/awesome-markdown-editors | [#168](https://github.com/mundimark/awesome-markdown-editors/pull/168) | entry is in `UPCOMING.md` per 2026 policy |
| tehtbl/awesome-note-taking | [#82](https://github.com/tehtbl/awesome-note-taking/pull/82) | — |
| phmullins/awesome-macos | [#194](https://github.com/phmullins/awesome-macos/pull/194) | maintainer slow (last active Jan 2025) |
| linsa-io/macos-apps | [#49](https://github.com/linsa-io/macos-apps/pull/49) | — |
| open-saas-directory/awesome-native-macosx-apps | [#80](https://github.com/open-saas-directory/awesome-native-macosx-apps/pull/80) | excludes "web wrappers" — framed as "Rust + WKWebView" like their `Writer`; **some rejection risk** |

- [ ] **Respond to any PR review/change requests.** A session can edit the relevant fork branch (`add-markup`) and push. Fork branches live under `oratis/<list-repo>`.
- [ ] **(optional) Nudge iCHAIT #839** — ask people to 👍 / comment so it clears the endorsement gate.

### Deferred awesome-list
- [ ] **`rust-unofficial/awesome-rust`** (~58k★) — perfect fit (Applications → Text editors), but hard **>50★ OR >2000-downloads** gate. **Resubmit once Markup passes 50★.** Entry: `* [oratis/Markup](https://github.com/oratis/Markup) - ...` under `### Text editors`, alphabetical, signed commits.

---

## 🔵 Phase B — main launch (do ONLY after signed build + Hero GIF)

Copy is paste-ready in `docs/LAUNCH-POSTS.md` (all channels, MD→HTML hook already woven in). Sequence (see GTM plan §9):

- [ ] **Show HN** — weekday ~8–10am US Eastern; be in-thread first 3–4h.
- [ ] **Product Hunt** — Tue–Thu; gallery = hero GIF + 4 stills.
- [ ] **少数派 (sspai)** — long-form review; China, high intent.
- [ ] **V2EX 分享创造**, then cross-post HN/PH results to X / 即刻.
- [ ] Pin the release; respond to every issue fast in week 1.
- [ ] **Remember:** strip the "unsigned / Open Anyway" line from all posts once v0.6.0 is signed.

---

## 🟢 Sustain (ongoing)

- [ ] Post each visible release (signed DMG, MAS) as a short update (Reddit/X/即刻).
- [ ] "Build in public" dev posts (掘金 / dev.to): the Obsidian-redesign, Tauri-sandbox-for-MAS, and Chinese-IME-in-WebView war stories — they attract devs + stars.
- [ ] Track stars over time (star-history badge already in README), download counts, GitHub Insights → Traffic referrers.

---

## ✅ Done this session (context — do NOT redo)

- **Social-preview card** produced (`docs/assets/social-card.png`, 1280×640) + reproducible generator (`docs/assets/make-social-card.py`, render via `sharp`) + `docs/SOCIAL-PREVIEW.md`. Uploaded & verified live.
- **5 new awesome-list PRs** opened (#168, #82, #194, #49, #80) → 10 total. Tracking table in `docs/awesome-list-pr.md`.
- **MD→HTML export highlighted** across README (EN+中文), all launch posts, GTM hook, and the social card (`.md → .html` badge). Copy upgraded after v0.5.3–v0.5.5 made export **high-fidelity** (syntax highlighting + KaTeX + Mermaid + heading anchors + theme-aware HTML/PDF). **Honesty caveat kept everywhere:** ordinary docs export self-contained/offline; math/diagram docs load those renderers from a CDN — keep that caveat if you touch the copy.

## Working rules (must follow)
- Land **code** via PR + 2 green CI checks (Frontend + Rust); never push features to `main`. **Docs-only commits go directly to `main`** (repo history precedent).
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Report progress in Chinese** (user preference).
- Keep version synced across `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `cargo update -p markup --offline`).
- Don't kick off a big outward-facing action (new external PRs, posting) before confirming with the user.
