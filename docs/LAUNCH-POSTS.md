# Markup — paste-ready launch posts

> Copy blocks below as-is. The DMG is now **signed & notarized** (v0.6.0) — it opens without a Gatekeeper prompt.
> Before posting anywhere in Phase B: the **hero GIF** must be at the top of the README and the **social-preview image** set (GitHub → Settings → Social preview). See [GTM-LAUNCH-PLAN.md](./GTM-LAUNCH-PLAN.md) and [HERO-GIF.md](./HERO-GIF.md).

---

## Show HN (Hacker News)

**When:** a weekday, ~8–10am US Eastern. Be in-thread for the first 3–4 hours.

**Title** (must start with `Show HN:`):
```
Show HN: Markup – a fast, open-source, native Markdown editor for macOS
```

**URL:** `https://github.com/oratis/Markup`

**First comment** (post immediately after submitting):
```
I wanted Typora's writing feel without the closed source and price, and
Obsidian's look without the Electron weight — so I built Markup.

It's a Tauri (Rust + system WebView) macOS Markdown editor. The idea is
"reader-first": it renders your .md like a clean web page by default, and
you press E to edit (WYSIWYG via Milkdown) or ⌘/ for raw source. There's a
real vault — wikilinks, backlinks, a graph view, and full-text search via
Tantivy (a 10k-file vault indexes in ~1s). KaTeX, Mermaid, code highlight,
dark/light/sepia. Idle RAM is ~88MB. MIT licensed.

Because the reader is the product, "export" is basically free — and
high-fidelity: one click turns any note into a themed HTML page that keeps
your syntax-highlighted code, KaTeX math, and Mermaid diagrams intact.
Preview it in your browser or save a shareable .html (a single
self-contained file for ordinary docs; math/diagram docs pull those
renderers from a CDN). Print to PDF too.

Honest status: macOS-only, pre-1.0. The DMG is signed with an Apple
Developer ID and notarized, so it opens without the Gatekeeper prompt. It
was built largely with the help of Claude Code.

40-second demo: https://youtu.be/X2_MDL9v7As

Feedback very welcome — especially on the read-vs-edit model and anything
that feels off in the first five minutes.
```

---

## Product Hunt

**When:** Tue–Thu (PH days reset at 12:00am PT). Gallery = hero GIF + 4 stills.

**Name:** `Markup`

**Tagline** (≤60 chars):
```
A fast, native, open-source Markdown editor for macOS
```

**Description:**
```
Markup reads your Markdown like a beautiful web page and lets you edit on
demand. Native (Tauri, ~88MB — not Electron), open source (MIT), and built
around a real vault: wikilinks, backlinks, a graph view, and full-text
search that indexes 10,000 files in about a second. One click exports any
note to a themed, high-fidelity HTML page — code highlighting, KaTeX math,
and Mermaid diagrams intact — or to PDF. Free, no account. macOS-only,
pre-1.0.
```

**Maker's first comment:**
```
Hi PH! I made Markup because I wanted Typora's feel without the price/closed
source, and Obsidian's look without the Electron weight.

The core idea is "read first, edit on demand" — your notes render like a
clean document by default, and editing is one keystroke away (E for WYSIWYG,
⌘/ for source). And since it's already rendering your Markdown as a page,
exporting is one click and high-fidelity: a themed HTML file that keeps your
code highlighting, math, and Mermaid diagrams (or print to PDF). It's a
Tauri app, so it stays light (~88MB idle).

It's free and MIT-licensed. macOS-only and pre-1.0 today; the DMG is signed
& notarized, so it opens cleanly. Would love your feedback on the reading
experience.
```

---

## 少数派 / sspai (中文，Mac 效率向，转化高)

> 适合长图文测评。配 1 张 hero GIF + 3–4 张截图（深/浅色、图谱、真实文档）。

**标题：**
```
Markup：一款原生、开源、轻量的 macOS Markdown 阅读/编辑器
```

**正文骨架：**
```
我一直想要 Typora 的书写手感，但不想要闭源和收费；也想要 Obsidian 的观感，
但不想背 Electron 的内存。于是做了 Markup。

它的核心是「阅读优先」：打开一个文件夹，笔记会像一张干净的网页一样渲染出来，
而不是一个文本框；想改的时候按 E 进入所见即所得，⌘/ 看原始 Markdown。

- 原生：基于 Tauri（Rust + 系统 WebView），空闲内存约 88MB；
- 完整 vault：双链、反链、关系图谱，Tantivy 全文搜索，1 万个文件约 1 秒建索引；
- 一键导出 HTML（高保真）：因为本来就是把 MD 当网页渲染，所以「导出」几乎是免费的 ——
  一键把任意笔记变成一张带主题样式的 HTML 网页，代码高亮、KaTeX 公式、Mermaid 图都原样保留，
  在浏览器里预览或存成可分享的 .html，也可以打印成 PDF（纯文字文档是单文件离线自包含，
  用到公式/图表的会从 CDN 加载渲染器）；
- KaTeX 公式、Mermaid 图、代码高亮、GFM；三套主题（浅/深/微黄）；
- 中文输入顺滑；免费、开源（MIT）、无账号无遥测。

目前 macOS 专属、1.0 之前，DMG 已用 Apple Developer ID 签名并公证，拖进
「应用程序」即可正常打开。
40 秒演示：https://youtu.be/X2_MDL9v7As
GitHub：github.com/oratis/Markup
欢迎试用和反馈，觉得有用的话点个 star。
```

---

## V2EX —— `分享创造` 节点 (中文开发者)

**标题：**
```
[分享创造] Markup —— 用 HTML 形态看 MD 的原生开源 macOS 编辑器
```

**正文：**
```
做了个 macOS 上的 Markdown 编辑器 Markup，分享一下。

定位是「阅读优先」：默认把 .md 渲染成一张干净的网页来看，想改再按 E 进入
所见即所得（Milkdown），⌘/ 看源码（CodeMirror）。

技术栈：Tauri 2（Rust + WebView）+ Milkdown/ProseMirror + Tantivy 全文搜索。
空闲内存约 88MB。有 vault、双链、反链、图谱、全文搜索（1 万文件约 1 秒索引）、
KaTeX、Mermaid、三主题。中文输入这块专门花时间打磨过。

顺手的一点：一键把 MD 导出成带主题样式的 HTML 网页，代码高亮、公式（KaTeX）、Mermaid 图都
原样保留（纯文字文档是单文件离线自包含），或者打印成 PDF —— 因为编辑器本来就是把 Markdown 当网页在渲染。

免费开源（MIT）。macOS 专属、1.0 之前，DMG 已签名并公证，开箱即用。

40 秒演示：https://youtu.be/X2_MDL9v7As
GitHub：https://github.com/oratis/Markup
求 star 和反馈，尤其是「读 vs 改」这个模式好不好用。
```

---

## X / Mastodon / Bluesky

**Launch post** (attach the hero GIF):
```
Made Markup: an open-source, native macOS Markdown editor.

It reads your .md like a web page, and you edit on demand. One click exports
a high-fidelity HTML page — code highlighting, math, Mermaid intact.
Tauri-light (~88MB), vault + backlinks + graph + full-text search, MIT.

40s demo: youtu.be/X2_MDL9v7As
⭐ if you like it → github.com/oratis/Markup
```

**Thread follow-up (optional):**
```
The "build in public" bits I'll write up: redesigning the shell to feel like
Obsidian, getting a Tauri app to run sandboxed for the Mac App Store, and the
fight to make Chinese IME input feel native in a WebView.
```

Tag/与 `@tauri` 社区互动。

---

## Reddit (Phase A — soft launch)

- **r/macapps**, **r/opensource**, **r/SideProject** — don't paste identical text; lead with the screenshot/GIF, keep it short, link the repo.
- **r/tauri** + **Tauri Discord #show-and-tell** — devs love the stack story.
- **r/ObsidianMD**: only if framed respectfully as a complementary/lightweight reader — never bait "Obsidian killer."

**Short Reddit body:**
```
I built a free, open-source, native macOS Markdown editor. It renders your
notes like a web page by default and you press E to edit — reader-first.
One click exports any note to a high-fidelity HTML page (code highlighting,
math, Mermaid intact) or PDF.
Tauri (so ~88MB, not Electron), with a vault, backlinks, graph, and fast
full-text search. MIT. macOS-only, pre-1.0, signed & notarized DMG.
40s demo: youtu.be/X2_MDL9v7As · Feedback welcome: github.com/oratis/Markup
```
