# awesome-list submissions (Phase A soft launch)

Durable, low-risk traffic. Submit **after** the rewritten README is live (reviewers click through). Signing not required.

## 1. awesome-tauri — `tauri-apps/awesome-tauri`

- **Section:** `### Office & Writing`
- **Placement:** alphabetical — between `MarkFlowy` and `MD Viewer`.
- **Badge:** `![v2]` (Markup is Tauri 2). CI runs `awesome-lint README.md`; mirror the exact existing format.

**Entry line:**
```
- [Markup](https://github.com/oratis/Markup) ![v2] - Reader-first, native macOS Markdown editor: renders notes like a web page and edits on demand, with a vault, backlinks, graph, and full-text search.
```

**Open the PR:**
```bash
gh repo fork tauri-apps/awesome-tauri --clone --fork-name awesome-tauri
cd awesome-tauri
git checkout -b add-markup
# insert the entry line in README.md between MarkFlowy and MD Viewer (alphabetical), then:
npx awesome-lint README.md          # must pass
git add README.md
git commit -m "Add Markup (Office & Writing)"
git push -u origin add-markup
gh pr create --repo tauri-apps/awesome-tauri \
  --title "Add Markup (Office & Writing)" \
  --body "Markup is a free, open-source (MIT), native macOS Markdown editor built on Tauri 2. Reader-first: renders Markdown like a web page and edits on demand; vault with wikilinks/backlinks/graph and Tantivy full-text search. https://github.com/oratis/Markup"
```

## 2. awesome-mac — `jaywcjlove/awesome-mac`

- **Section:** `### Markdown Tools`
- **Placement:** alphabetical — between `MarkText` and `MarkViewer`.
- **Icons:** open-source + freeware (reference-style, defined at bottom of their README).

**Entry line:**
```
* [Markup](https://github.com/oratis/Markup) - Reader-first, native macOS Markdown editor: renders notes like a web page and edits on demand, with vault, backlinks, graph, and full-text search. [![Open-Source Software][OSS Icon]](https://github.com/oratis/Markup) ![Freeware][Freeware Icon]
```

**Open the PR:**
```bash
gh repo fork jaywcjlove/awesome-mac --clone --fork-name awesome-mac
cd awesome-mac
git checkout -b add-markup
# insert the entry line under "### Markdown Tools", between MarkText and MarkViewer, then:
git add README.md
git commit -m "Add Markup to Markdown Tools"
git push -u origin add-markup
gh pr create --repo jaywcjlove/awesome-mac \
  --title "Add Markup to Markdown Tools" \
  --body "Markup — a free, open-source (MIT), native macOS Markdown editor. Reader-first: renders Markdown like a web page, edit on demand; vault + backlinks + graph + full-text search. https://github.com/oratis/Markup"
```

## 3. Others (same entry text, lower priority)
- `awesome-opensource-macos`, `BubuAnabelas/awesome-markdown` (Tools), any "awesome-electron-alternatives" style lists.
- Always: respect each list's section + alphabetical order; run their lint if they have one; one focused PR per list.

## Status — submitted PRs (track / respond to review)

> **Live status last verified 2026-06-27** (via `gh pr view`): **1 merged · 8 open · 1 closed**.
> Action items: re-engage the **closed** `iCHAIT/awesome-macOS` #839 (endorsement-gated — needs upvotes, may warrant a fresh PR); everything else is healthy and awaiting maintainer merge.

| List | Stars | Section | PR | Status (2026-06-27) | Notes |
|---|---|---|---|---|---|
| `tauri-apps/awesome-tauri` | — | Office & Writing | [#724](https://github.com/tauri-apps/awesome-tauri/pull/724) | 🟢 OPEN | CI green; awaiting merge |
| `jaywcjlove/awesome-mac` | — | Markdown Tools | [#2109](https://github.com/jaywcjlove/awesome-mac/pull/2109) | 🟢 OPEN | CI green; awaiting merge |
| `BubuAnabelas/awesome-markdown` | ~0.9k | Tools → Editors | [#122](https://github.com/BubuAnabelas/awesome-markdown/pull/122) | 🟢 OPEN | appended at end of Editors (list isn't strictly alphabetical; B→M pair is in order). Lint: remark + Danger (≤1 insertion — satisfied) + awesome_bot link check, all via Travis. |
| `serhii-londar/open-source-mac-os-apps` | ~49k | Editors → Markdown | [#1133](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1133) | 🟢 OPEN | **edited `applications.json` only** (README is generated — do NOT edit it). Languages: rust + typescript. |
| `iCHAIT/awesome-macOS` | ~19k | Editors | [#839](https://github.com/iCHAIT/awesome-macOS/pull/839) | 🔴 **CLOSED** | between MacVim/Nova, OSS+Freeware icons. **Merges via PR-endorsement votes** ("needs endorsement" label). **Closed without merge — re-open / resubmit + seek endorsements, or drop.** CI = awesome_bot link check only. |
| `mundimark/awesome-markdown-editors` | ~2.1k | Desktop Editors → Apple Mac OS X | [#168](https://github.com/mundimark/awesome-markdown-editors/pull/168) | ✅ **MERGED** (2026-05-29) | **2026 policy: new entries go in `UPCOMING.md`** (not README), with a source link. Prose format. Peers: Glance, Kuku, marka.md (all Tauri macOS readers). |
| `tehtbl/awesome-note-taking` | ~0.9k | Open Source → Tauri | [#82](https://github.com/tehtbl/awesome-note-taking/pull/82) | 🟢 OPEN | dedicated Tauri section; `📖 … \`MIT\` \`Tauri/Rust+TypeScript\``; alphabetical between Inkwell/Stik. |
| `phmullins/awesome-macos` | ~3.0k | Markdown Editors | [#194](https://github.com/phmullins/awesome-macos/pull/194) | 🟢 OPEN | file is `readme.md`; `![Open Source][oss]` badge. Maintainer last active Jan 2025 — may merge slowly. |
| `linsa-io/macos-apps` | ~0.8k | Write | [#49](https://github.com/linsa-io/macos-apps/pull/49) | 🟢 OPEN | bare `- [name](url) - desc.`; between Marked 2/Texpad. |
| `open-saas-directory/awesome-native-macosx-apps` | ~1.2k | Markdown Editors | [#80](https://github.com/open-saas-directory/awesome-native-macosx-apps/pull/80) | 🟢 OPEN | list excludes "web-wrapper" apps but accepts the precedent `Writer` ("Rust backend + native WKWebView") — Markup framed identically (honest: Tauri on macOS = Rust + WKWebView). Some rejection risk. |

### Blocked / deferred
- **`rust-unofficial/awesome-rust`** (~58k★) — perfect fit (Applications → Text editors, alongside other Tauri MD editors), **but CONTRIBUTING enforces a hard gate of >50 stars OR >2000 downloads**. Markup currently has ~1 star → would be rejected. **Resubmit once Markup crosses 50 stars.**

### Deliberately skipped (don't re-research)
- `mundimark/awesome-markdown` (format/spec/libraries, not apps), `BubuAnabelas/awesome-markdown` is the *one* general md list we hit; self-hosted lists (require server software), privacy lists (force-fit), zettelkasten lists (marginal), `macmdviewer/awesome-markdown-mac` (2★, run by a paid competitor — low value/bias). Unmaintained (>2yr): `webiaio`, `dvorka/awesome-markdown-repositories`, `guyzyl`, `justin-j`, `seyfeddin`, `doanhthong/awesome-pkm`.

Total awesome-list submissions: **10 PRs** (as of 2026-06-27: 1 merged · 8 open · 1 closed). Next reach only via `awesome-rust` (after 50★) or new lists that appear.
