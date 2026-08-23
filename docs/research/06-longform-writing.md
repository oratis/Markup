# 调研 06 · 长文与书籍写作能力

- **日期**: 2026-07-30
- **动机**: 要在 Markup 里写一本书（《要有光——人工智能史话》，见 [`book/`](../../book/README.md)），先搞清楚"写作能力"到底缺什么。
- **配套**: 设计与分期规划见 [design/07-writing-mode.md](../design/07-writing-mode.md)

---

## 0. 先定义"写作能力"

"给 Markup 加写作能力"有两种读法，本轮调研**以第一种为主**：

| 读法 | 含义 | 本轮定位 |
|---|---|---|
| **A. 长文/书籍写作**（主） | 把"一堆 .md"当成"一部作品"来写：稿件树、连读、目标与节奏、结构卡片、快照修订、整书汇编导出 | **主线**，W1–W5 |
| B. AI 辅助写作 | 续写、改写、润色、事实核查 | **明确后置**，W6，默认关闭、可完全不装 |

理由：Markup 的既有资产（reader-first 渲染、vault、Outline、Canvas、Export→HTML、GitHub 往返）几乎全部是 A 的前置条件，A 的边际成本极低；而 B 会立刻撞上"无账号、无遥测、MIT、本地优先"这条产品底线，需要单独决策（见设计文档 §7）。

另一个事实：**Markup 现在能"读一整套文档"，但不能"写一整部作品"。** 差的不是编辑器，是"作品"这个层级的概念。

---

## 1. Markup 现状盘点（写作视角）

已有、可直接复用的：

| 能力 | 位置 | 对写作的价值 |
|---|---|---|
| Reader-first 渲染 | `HtmlView` / 三视图 | 随时以"成书样貌"校读，这是竞品都要额外做的 |
| Outline 面板（`⌘⌥O`） | `Outline.tsx` | 单章导航；差一层"跨章"的稿件树 |
| SectionPane / DocPager | `SectionPane.tsx` / `DocPager.tsx` | 同文件夹连读 + 上一章/下一章，已经很接近"书" |
| Canvas（V2） | `CanvasView.tsx` | **天然是 corkboard/卡片墙**，只差和稿件树打通 |
| Frontmatter 编辑 | `PropertiesEditor.tsx` | 章节元数据（状态/字数目标/人物）的现成载体 |
| 字数/字符/行统计 | `StatusBar.tsx` + `text-stats.ts` | 有统计，但只到"当前文件" |
| `wordCountGoal` | `store.ts:184`（0–100 000） | **全局单值**，不是"这本书 30 万字 / 本章 1 万字" |
| Focus / Typewriter | `focus-typewriter.ts` | 写作体感已达标 |
| Daily notes | `dailyNotes*` 设置 | 写作日志的雏形 |
| Export → HTML / Print PDF | `export.ts` | 单文件高保真；差"整书" |
| GitHub 往返 | `06-github-roundtrip.md` | 稿件可托管、可 PR，天然版本管理 |
| 全文搜索（Tantivy） | Rust 侧 | 30 万字稿件里找"这个人第一次出现在哪" |

**明确缺失**（下面竞品逐项对照）：

1. 没有"作品/项目"这一层——无有序稿件树、无跨文件连读编辑
2. 目标只有一个全局数字——无项目目标、无本章目标、无单次会话目标、无历史曲线
3. 无章节状态/标签元数据视图（哪几章还是草稿？）
4. 无快照/本地版本时间线，无与旧版对比
5. 无整书汇编（Compile）：一键把 33 个文件变成一份稿子/一本 EPUB
6. 无占位符与遗留问题索引（写史书必需：`[[待核实]]`、`??`）
7. 无旁注/批注（不污染正文的编辑意见）

---

## 2. 竞品逐项对照

### 2.1 Scrivener（长文写作的事实标准）

三个核心概念，每一个都值得抄：

- **Binder**：单一侧栏收纳每一章、每一场景、每份人物小传、每条研究笔记，可拖拽重排。"作品"是第一等公民，文件夹只是实现细节。
- **Corkboard**：把文档渲染成索引卡，显示标题 + 概要 + 标签 + 状态，鸟瞰全书结构、拖卡重构、在写崩之前看出结构漏洞。
- **Scrivenings**：一章一文件地写，但可以把它们**当成一份连续稿件**来阅读和编辑。
- **Compile**：一套导出流水线，产出 ePub / PDF / 印刷版式。

对 Markup 的启示：Binder ≈ 有序稿件树；Corkboard ≈ **Canvas 已经做好了**；Scrivenings ≈ 连读模式（SectionPane 的下一步）；Compile ≈ Export→HTML 的多文件版。**四个里有两个半是现成的。**

来源：[Scrivener 官方概览](https://www.literatureandlatte.com/scrivener/overview) · [Scrivener Review 2026](https://www.automateed.com/scrivener-review) · [Is Scrivener Worth It 2026](https://deckle.studio/is-scrivener-worth-it-2026/)

### 2.2 Obsidian Longform 插件（最贴近 Markup 的形态）

因为它就是"在 Markdown vault 上加写作项目"，几乎是本方案的参考实现：

- **项目 = 一个索引文件 + 一个 scenes 子文件夹**（如 `S01_Title__Scenes/`）。稿件与成品分开存放，互不污染。
- **场景可缩进**成父子层级（indent/unindent 命令），即多级稿件树。
- 发现 scenes 文件夹里有未登记的 `.md` 会**提示"加入还是忽略"**；被忽略的文件可以共存但不参与汇编——这条对"章节旁边放素材笔记"极重要。
- **Compile 是可组合的步骤流水线**：每步输入"全部场景"或"已合并稿件"，输出"变换后的场景"或"变换后的稿件"，其中 join 步骤负责把场景列表合成单一稿件。
- 内置字数统计、写作会话目标、项目汇编。

结论：**"索引文件 + 忽略名单 + 步骤式 compile"这三点直接采纳。** 它证明了不需要私有数据库就能做项目层。

来源：[kevboh/longform README](https://github.com/kevboh/longform/blob/main/README.md) · [COMPILE.md](https://github.com/kevboh/longform/blob/main/docs/COMPILE.md) · [MULTIPLE_SCENE_PROJECTS.md](https://github.com/kevboh/longform/blob/main/docs/MULTIPLE_SCENE_PROJECTS.md) · [社区插件页](https://community.obsidian.md/plugins/longform)

### 2.3 Ulysses（目标系统的标杆）

- 目标可以挂在**单篇**（"写 1000 字"）也可以挂在**分组**（"这个书文件夹写 8 万字"），带截止日期和进度条；支持每日目标与项目级目标。
- Typewriter 模式把当前句居中。
- 是订阅制（$5.99/月 或 $39.99/年）、闭源。

**这正是 Markup `wordCountGoal` 的升级方向：目标要能挂在"节点"上（文件或文件夹），而不是一个全局设置项。**

来源：[Ulysses Goals 帮助](https://help.ulysses.app/goals) · [Ulysses vs iA Writer](https://mariusmasalar.me/ulysses-vs-ia-writer-a-new-comparison-7015c899e883) · [Ulysses 完整指南 2026](https://jswordsmith.com/ulysses-writing-app-guide/)

### 2.4 iA Writer（克制的一极）

- Focus 模式高亮当前句；一次性买断（Mac ≈ $29.99）。
- **没有内置写作目标系统。**

启示：目标/统计这类东西必须**可以完全关掉**，否则伤害"安静地读和写"这个核心体感。iA Writer 的存在提醒我们：写作模式应当是**可选的第四种视角**，不是新的默认。

来源：[iA Writer vs Ulysses](https://www.toolify.ai/ai-news/ia-writer-vs-ulysses-choosing-the-best-writing-app-3883906) · [Best distraction-free writing apps 2026](https://ventureharbour.com/best-distraction-free-writing-apps-for-bloggers-writers-authors/)

### 2.5 输出端：Markdown → 书的工具链

- **Pandoc** 是这条链上的地基（John MacFarlane 自 2006 年维护，命令行、免费），有 EPUB3 writer，可产出 ePub 与 5×8 / 6×9 英寸印刷版 PDF。
- **mdBook**：全文搜索、语法高亮、响应式、明暗切换、打印友好 CSS、自动上一页/下一页；装上 EPUB 后端可直接产出 `book.epub`。
- **Quarto**：面向技术书，Markdown/Org 输入，XHTML5 作中间格式，经 Pandoc 输出 EPUB3。
- 事实标准流水线：**Pandoc 转换 → Calibre 精修 → EPUBCheck 校验 → KDP / Apple Books / Kobo 分发**。EPUBCheck 是 W3C 参考校验器，各商店上传时都会跑，校验不过就是拒收。

**对 Markup 的启示（重要）**：
1. **不要自己写 EPUB 生成器。** 内置"整书 → 单 HTML"（这是 Markup 的强项，已高保真），EPUB/DOCX/印刷 PDF 交给可选的 Pandoc 外挂路径。
2. mdBook 的"上一页/下一页 + 打印友好 CSS"，Markup 的 `DocPager` + Export 已经具备同类能力——**整书导出应当直接产出一个 mdBook 式的可离线站点**，这与 GTM 里"整站导出"那条正好是同一件事。

来源：[Pandoc EPUB 文档](https://pandoc.org/epub.html) · [pandoc-publish（小说导出配置）](https://github.com/mattgemmell/pandoc-publish/) · [mdBook 建书](https://www.blog.brightcoding.dev/2025/09/27/turning-markdown-files-into-online-books-with-mdbook) · [Markdown to EPUB 2026](https://mdclaudy.com/blog/markdown-to-epub)

---

## 3. 特性矩阵

| 能力 | Scrivener | Ulysses | Longform | iA Writer | **Markup 现状** | **拟做** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 有序稿件树（跨文件） | ✅ Binder | ◐ 分组 | ✅ | ❌ | ❌ | **W1** |
| 连读/连编（Scrivenings） | ✅ | ◐ | ❌ | ❌ | ◐ SectionPane | **W1** |
| 卡片墙 | ✅ Corkboard | ❌ | ❌ | ❌ | ◐ **Canvas** | **W3** |
| 节点级字数目标 | ✅ | ✅ | ✅ | ❌ | ◐ 全局单值 | **W2** |
| 写作会话统计/连续天数 | ◐ | ✅ | ✅ | ❌ | ❌ | **W2** |
| 章节状态/标签 | ✅ | ✅ 关键词 | ◐ | ❌ | ◐ frontmatter | **W3** |
| 占位符 / 遗留问题索引 | ◐ | ❌ | ❌ | ❌ | ❌ | **W3** |
| 快照 / 版本时间线 | ✅ | ✅ | ❌（靠 git） | ❌ | ❌（有 GitHub 往返） | **W4** |
| 批注（不入正文） | ✅ | ◐ | ❌ | ❌ | ❌ | W4 |
| 整书汇编导出 | ✅ | ✅ | ✅ | ◐ | ❌（单文件✅） | **W5** |
| EPUB / 印刷 PDF | ✅ | ✅ | ◐ | ◐ | ❌ | W5（走 Pandoc） |
| 纯文件、无锁定 | ❌ | ❌ | ✅ | ✅ | ✅ | **保持** |
| 开源 | ❌ | ❌ | ✅ | ❌ | ✅ MIT | **保持** |

**空白象限**：`纯 Markdown 文件 + 开源 + 原生（非 Electron） + reader-first 校读 + 完整长文写作`。Longform 占了前两项但绑在 Electron 版 Obsidian 上；Scrivener/Ulysses 有完整写作能力但闭源、私有格式。这与 [PRODUCT-DIRECTION.md](../PRODUCT-DIRECTION.md) 认定的"阅读器优先 × 知识库"象限不冲突，是它的**纵深**：能读一整套文档的工具，理应能写一整部作品。

---

## 4. 三条硬约束（从本项目既有决策继承）

1. **纯文件优先。** 项目状态必须存成 vault 里人类可读的 Markdown/YAML，删掉 Markup 之后稿子依然完整可用。不引私有数据库、不引 sidecar 二进制。
2. **写作模式是可选视角，不是新默认。** 阅读仍是默认；目标条、统计、卡片墙全部可关。参考 iA Writer 的克制。
3. **不为写作牺牲性能基线。** 连读 30 万字必须走虚拟滚动/分段渲染，不能一次性塞进 ProseMirror。`StatusBar` 里已有 `HEAVY_THRESHOLD = 100_000` 的降级思路，沿用。

---

## 5. 一句话结论

Markup 离"能写一本书"只差**"作品"这一层抽象**加**四件小事**（有序稿件树、节点级目标、快照、整书汇编）；卡片墙和高保真校读这两件最贵的，Canvas 和 reader-first 渲染**已经做完了**。分期方案见 [design/07-writing-mode.md](../design/07-writing-mode.md)。

---

## 附：来源清单

- [Scrivener 官方概览](https://www.literatureandlatte.com/scrivener/overview)
- [Scrivener Review 2026 — automateed](https://www.automateed.com/scrivener-review)
- [Is Scrivener Worth It? 2026 — Deckle](https://deckle.studio/is-scrivener-worth-it-2026/)
- [kevboh/longform（Obsidian 插件）](https://github.com/kevboh/longform/blob/main/README.md)
- [Longform COMPILE 文档](https://github.com/kevboh/longform/blob/main/docs/COMPILE.md)
- [Longform 多场景项目文档](https://github.com/kevboh/longform/blob/main/docs/MULTIPLE_SCENE_PROJECTS.md)
- [Longform 社区插件页](https://community.obsidian.md/plugins/longform)
- [Ulysses Goals 帮助文档](https://help.ulysses.app/goals)
- [Ulysses 完整指南 2026 — JSwordSmith](https://jswordsmith.com/ulysses-writing-app-guide/)
- [Ulysses vs. iA Writer — Marius Masalar](https://mariusmasalar.me/ulysses-vs-ia-writer-a-new-comparison-7015c899e883)
- [iA Writer vs. Ulysses — Toolify](https://www.toolify.ai/ai-news/ia-writer-vs-ulysses-choosing-the-best-writing-app-3883906)
- [10 Best Distraction Free Writing Apps 2026 — Venture Harbour](https://ventureharbour.com/best-distraction-free-writing-apps-for-bloggers-writers-authors/)
- [Pandoc — Creating an ebook](https://pandoc.org/epub.html)
- [mattgemmell/pandoc-publish](https://github.com/mattgemmell/pandoc-publish/)
- [Turning Markdown Files into Online Books with mdBook](https://www.blog.brightcoding.dev/2025/09/27/turning-markdown-files-into-online-books-with-mdbook)
- [Markdown to EPUB (2026)](https://mdclaudy.com/blog/markdown-to-epub)
