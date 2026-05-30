# Markup — GTM / Launch Plan (goal: GitHub stars)

> Goal: turn Markup from "a repo that exists" into "a project people **star**, share, and come back to."
> This is the marketing/launch plan. Engineering release mechanics live in [RELEASE-PLAN.md](./RELEASE-PLAN.md).

---

## 0. The honest pre-condition (read first)

Two things gate a *successful* launch. Launching before they're done burns your one shot at HN/PH front pages:

1. **A 10-second "wow" at the top of the README** — a hero GIF/screenshot. Dev-tool stars are won or lost in the first scroll. Right now the README has placeholder screenshots; this is the #1 blocker.
2. **A frictionless install.** The DMG is currently **unsigned** → macOS Gatekeeper throws a scary "can't be opened" wall. A chunk of curious visitors bounce there and never star. Strongly recommend shipping **v0.6.0 (Developer ID signed + notarized)** *before* the big HN/Product Hunt push. Niche channels (Reddit, awesome-lists) are fine unsigned with clear instructions.

Everything below assumes we fix #1 first and ideally #2 before the "main launch."

---

## 1. Goals & metrics

| Horizon | Target | Signal |
|---|---|---|
| Soft launch (week 1) | 100–300 ⭐ | awesome-lists merged, niche subreddits, V2EX |
| Main launch (week 2–3) | 1k–3k ⭐ | HN front page / Product Hunt top 5 / 少数派 feature |
| Sustain (ongoing) | steady +X/week | release posts, "build in public", word of mouth |

Track: GitHub stars over time (star-history.com badge), release download counts, referrer sources (GitHub Insights → Traffic).

---

## 2. Positioning — the one-liner

Pick ONE hook and use it everywhere (repo description, HN title, PH tagline):

> **Markup — a fast, native, open-source Markdown editor for macOS. Read your Markdown like a beautiful web page; edit when you want.**

Chinese:
> **Markup — 原生 macOS 开源 Markdown 编辑器。用 HTML 的形态来看 MD，想改再改。**

Supporting hooks (for different audiences):
- *"Typora's spirit, but free and open-source."*
- *"Obsidian's look, a fraction of the weight (~88MB RAM, Tauri-native)."*
- *"Reader-first: your vault, rendered like a document — not a text box."*
- *"Markdown → HTML in one click, high-fidelity — your notes are already a web page, so exporting a themed `.html` (or PDF) that keeps code highlighting, KaTeX math, and Mermaid diagrams is free."*

---

## 3. Differentiation (the comparison that earns the click)

| | Markup | Typora | Obsidian | MacDown / iA |
|---|---|---|---|---|
| Price | **Free** | $15 | Free (closed) | Free / paid |
| Open source | **✅ MIT** | ❌ | ❌ | mixed |
| Native (not Electron) | **✅ Tauri, ~88MB** | ✅ | ❌ Electron | ✅ |
| Reader-first (MD as HTML) | **✅** | ◐ | ❌ (KB tool) | ◐ |
| Vault + backlinks + graph + full-text | **✅ (Tantivy, 10k files fast)** | ❌ | ✅ | ❌ |
| Chinese IME solid | **✅ (just hardened)** | ✅ | ◐ | varies |

The wedge: **"the open, native, lightweight one that's actually pleasant to *read* in."** Lean on free + open + fast + reader-first.

---

## 4. Pre-launch checklist (convert visitors → stars)

**Repo assets**
- [ ] **Hero GIF** at top of README (10–15s: open vault → read → press E to edit → Cmd+P quick open → search). This is the single highest-ROI asset.
- [ ] 3–4 still **screenshots** (dark + light, the Obsidian-style shell, graph view, a real doc).
- [x] **Social preview image** (1280×640) — produced at [`docs/assets/social-card.png`](./assets/social-card.png) (source + regen steps in [SOCIAL-PREVIEW.md](./SOCIAL-PREVIEW.md)). **User action left:** upload via GitHub → Settings → Social preview.
- [ ] Tighten the **repo description** + topics (`markdown`, `markdown-editor`, `macos`, `tauri`, `rust`, `obsidian`, `wysiwyg`, `note-taking`).
- [ ] README structure: hero → one-liner → GIF → "Why Markup" (the §3 table) → Features → Install → Build. English-first with a 中文 section (or a separate `README.zh.md` linked at top).
- [ ] **star-history badge** + a clear **⭐ call-to-action** line ("If Markup is useful, a star helps others find it").
- [ ] Latest release: signed if possible; if not, a crisp "first-launch: Open Anyway" note with a screenshot.
- [ ] `CONTRIBUTING.md`, issue/PR templates (mostly present), a roadmap link (this repo's docs).

**Product**
- [ ] First-run onboarding lands well (it does — "用 HTML 的形态来看 Markdown").
- [ ] No embarrassing bugs in the first 5 minutes (IME content correct ✅; cosmetic CJK line acceptable).

---

## 5. Launch assets — draft copy

### Show HN (Hacker News)
- **Title:** `Show HN: Markup – a fast, open-source, native Markdown editor for macOS`
- **Body (first comment):**
  > I wanted Typora's writing feel without the closed source / price, and Obsidian's look without the Electron weight. Markup is a Tauri (Rust + WebView) macOS Markdown editor: it renders your `.md` like a clean web page (reader-first), and you press `E` to edit (WYSIWYG via Milkdown) or `⌘/` for raw source. Vault with wikilinks/backlinks/graph, full-text search (Tantivy — 10k files index in ~1s), KaTeX/Mermaid/code highlight, dark/light/sepia. ~88MB idle RAM. MIT.
  > Honest status: macOS-only, pre-1.0, the DMG is [signed / unsigned — update before posting]. Built largely with the help of Claude Code. Feedback very welcome — especially on the read-vs-edit model.
- **Timing:** weekday, ~8–10am US Eastern. Be present in-thread for the first 3–4 hours to answer.

### Product Hunt
- **Tagline:** `A fast, native, open-source Markdown editor for macOS`
- **First comment:** maker's note — the "read first, edit on demand" idea, Tauri/lightweight, free+open. Gallery = the hero GIF + 4 screenshots. Hunt on a Tue–Thu.

### 少数派 (sspai) — China, Mac productivity audience (high intent)
- 标题：`Markup：一款原生、开源、轻量的 macOS Markdown 阅读/编辑器`
- 角度：免费开源替代 Typora；阅读优先（像看网页一样看 MD）；中文输入顺滑；Tauri 原生省内存；vault + 双链 + 全文搜索。配图 + GIF。sspai 适合长图文测评，转化高。

### V2EX (China devs) — `分享创造` node
- 标题：`[分享创造] Markup —— 用 HTML 形态看 MD 的原生开源 macOS 编辑器`
- 正文：技术栈（Tauri/Rust/Milkdown/Tantivy）、为什么造、和 Typora/Obsidian 的区别、求 star + 反馈。V2EX 对"原生 + 开源 + 中文输入"很买账。

### X / Mastodon / Bluesky
- Short: *"Made Markup: an open-source, native macOS Markdown editor. Reads your `.md` like a web page, edit on demand. Tauri-light (~88MB), MIT. [GIF] ⭐ if you like it: <repo>"*
- Tag/与 @tauri 社区互动。

---

## 6. Channels & sequencing

**Phase A — Soft launch (low-risk, builds base + social proof)**
1. Submit PRs to **awesome lists**: `awesome-tauri`, `awesome-macos`, `awesome-markdown`, `awesome-opensource-macos`. (Durable, keeps sending traffic.)
2. **Tauri Discord / Show & Tell** + r/tauri.
3. Niche subreddits: **r/macapps**, r/opensource, r/SideProject. (r/ObsidianMD only if framed respectfully as a complementary tool — don't bait.)
4. China: **V2EX 分享创造**, 即刻 (开源/效率圈), 掘金 (技术文).

**Phase B — Main launch (the spikes; do AFTER signed build + hero GIF)**
1. **Show HN** (the big one for devs).
2. **Product Hunt**.
3. **少数派** post (China; can be a featured piece — pitch the editor).
4. Coordinate same-week so cross-traffic compounds; pin the release.

**Phase C — Sustain**
- Ship visible releases (signed DMG, MAS launch) and post each as a short update (Reddit/X/即刻).
- "Build in public": share the Obsidian-redesign / Tauri-sandbox / Chinese-IME war stories as dev posts (掘金 / dev.to) — these themselves attract devs + stars.
- Respond to every issue fast in the first month; first impressions of maintainership convert lurkers → stars/contributors.

---

## 7. Conversion tactics (small things that move stars)
- The **hero GIF** does 80% of the work — invest there.
- **Social preview card** so every share looks intentional.
- A one-line **star CTA** in README + in the app's About/Help ("⭐ on GitHub").
- **star-history chart** in README (social proof flywheel).
- Make the **download dead-simple**: one obvious button to the latest release; the right DMG named `apple-silicon` / `intel` (already done ✅).
- Pin a **"Markup v0.x is out"** discussion/issue with the GIF.

---

## 8. Etiquette / risks (don't torch the launch)
- **HN**: follow Show HN rules — be the maker, be humble, disclose status (unsigned/pre-1.0/AI-assisted), engage genuinely. No vote rings.
- **Reddit**: each sub has rules; don't blast the same copy everywhere; r/ObsidianMD is sensitive about "competitors."
- **Don't oversell**: it's macOS-only, pre-1.0. Underpromise.
- **Unsigned-DMG bounce** is the biggest conversion leak — fix signing before the spikes (Phase B).
- Have the repo **ready for traffic**: issues triaged, README polished, no broken links.

---

## 9. Two-week launch sprint (suggested)

| Day | Do |
|---|---|
| 1–2 | Record hero GIF + screenshots; set social preview; polish README + 中文 section; add star CTA + star-history. |
| 3 | (Ideally) finish v0.6.0 signing/notarization so the DMG opens cleanly. |
| 4 | Submit awesome-list PRs; post to r/macapps, V2EX, Tauri Discord (Phase A). Gather early feedback, fix quick issues. |
| 5–6 | Iterate on README/copy from soft-launch feedback. Prep PH assets. |
| 8 (Tue) | **Show HN** + **Product Hunt** same morning; be present all day. |
| 9 | **少数派** post (China). Cross-post the HN/PH result to X/即刻. |
| 10+ | Respond, thank, fix; pin the release; start the sustain cadence. |

---

## 10. What I (Claude) can produce on request
- The hero GIF storyboard + the exact `gif_creator` capture script.
- Final README rewrite (EN + 中文) with the §3 table, install, star CTA.
- The social-preview image spec / a generated card.
- Ready-to-paste Show HN / PH / 少数派 / V2EX posts (filled in once signing status is decided).
- An `awesome-tauri` / `awesome-macos` PR.
