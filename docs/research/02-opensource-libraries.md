# markup 项目可借鉴的开源项目与库调研报告

> 调研日期：2026-05-10  
> 目标：为 macOS 上的 Typora 开源克隆「markup」选型可直接借用、fork 或借鉴的开源项目与库  
> 数据来源：GitHub 仓库元数据 + 多份 2026 年技术对比博文（详见每节末尾的“数据来源”链接）  
> 数值口径：stars、最近提交日期等数据为调研时的快照，可能与读者查阅时不完全一致。

---

## 0. 摘要 / TL;DR

markup 的核心问题等价于回答两个工程问题：

1. **编辑层（Editor Core）**：所见即所得（WYSIWYG / Typora 那种“即时渲染”，而不是双栏预览）该用什么内核？
2. **外壳层（Shell）**：桌面应用容器怎么选？

本报告的最终结论（详见第 7 节）是：

- **编辑内核选 Milkdown**（基于 ProseMirror + Remark，纯 WYSIWYG，MIT，是最贴合 Typora 哲学的现成框架，活跃维护）。
- **外壳选 Tauri v2**（Rust + 系统 WebView，体积/内存/启动比 Electron 好一个数量级，2026 年生态已足够成熟）。
- 解析与渲染：编辑期用 Remark（Milkdown 自带），导出/批量场景用 markdown-it 或 Rust 端的 pulldown-cmark / comrak；代码高亮用 Shiki；数学公式用 KaTeX；图表用 Mermaid。

如果你只能选一套：**Tauri v2 + Milkdown + Remark + Shiki + KaTeX + Mermaid**，理由是“在保留 macOS 原生体感的同时，把 Typora 的 WYSIWYG 体验用最少的自研代码量做出来，并且全栈都是 MIT/Apache，可商用、可闭源分发”。

---

## 1. Typora 风格的开源克隆 / 同类应用

> 这一类是“整个应用”级别的对照物，主要看：能不能 fork？架构是否值得借鉴？

| 项目 | URL | Stars | License | 技术栈 | 最近活跃 | 是否 WYSIWYG | 是否值得借用 |
|------|-----|------:|--------|--------|---------|-------------|-------------|
| **MarkText** | github.com/marktext/marktext | 55.9k | MIT | Electron + Vue + 自研 Muya 编辑器 | 最后 release 2022-03（基本停滞） | 是（Typora 风格 IR） | **借鉴架构而非 fork**：核心 Muya 引擎可读，但代码已 3+ 年没更新，依赖严重过时；其 IR 模式实现思路对 markup 是最有参考价值的活化石 |
| **Zettlr** | github.com/Zettlr/Zettlr | 13k | GPL-3.0 | Electron + Vue + CodeMirror 6 | v4.5.0 / 2026-05 活跃 | 半 WYSIWYG（CM6 标记） | **不能直接 fork**（GPL 传染），但 CM6 + 装饰器实现 IR 的思路值得借鉴 |
| **Joplin** | github.com/laurent22/joplin | 54.7k | AGPL-3.0 | Electron + React + RN，编辑器内核为 CodeMirror | 持续活跃 | 默认双栏，可启用富文本 | 笔记/同步部分价值高，编辑器部分参考意义一般；AGPL 不能商业闭源 |
| **Logseq** | github.com/logseq/logseq | 42.7k | AGPL-3.0 | ClojureScript + Electron | 2025-12 仍有 beta | 块级 outliner（与 Typora 模型不同） | 不适合做 Typora 克隆；技术栈差异过大 |
| **Obsidian** | obsidian.md | 闭源 | 私有 | Electron + CodeMirror 6 | 商业活跃 | CM6 装饰半 WYSIWYG | **只能调研架构**：其 “Live Preview” 模式（CM6 + 装饰）是 markup 想避开 ProseMirror 路线时的备选参考 |
| **SiYuan / 思源笔记** | github.com/siyuan-note/siyuan | 43.7k | AGPL-3.0 | TypeScript 前端 + Go 后端 | 持续活跃 | 块级 WYSIWYG（自研） | 块编辑模型重，AGPL；不适合 fork，可借鉴块级渲染细节 |
| **Yank Note** | github.com/purocean/yn | 6.6k | AGPL-3.0 | Electron + Vue + Monaco + markdown-it + Koa2 | v3.89.1 / 2026-05 活跃 | 不是（双栏 + Monaco） | 不符合 Typora 哲学；插件系统设计可借鉴 |
| **VNote** | github.com/vnotex/vnote | 12.8k | LGPL-3.0 | Qt + C++ | v3.20.1 / 2025-11 活跃 | 双栏 / 半 WYSIWYG | 技术栈与 macOS Web 路线不重合，借鉴价值低 |
| **Notable** | github.com/notable/notable | 23.5k | 私有（仅旧版本开源） | Electron + React | 2020-01 已停滞 | 否 | 不可借用，license 也有问题 |
| **Abricotine** | github.com/brrd/abricotine | 2.6k | GPL-3.0 | Electron + JS | 已 archive（2023-08） | 是（IR） | 可读其 IR 实现，已死项目 |
| **Awesome Typora alternatives** 类清单 | 多份社区清单 | - | - | - | - | - | 入口性质，本节已覆盖主要候选 |

**关键洞察**

- **没有任何一个能直接 fork 来当 markup 的起点**：要么 license 不友好（GPL/AGPL 系），要么已死（MarkText、Notable、Abricotine），要么模型差异太大（Logseq/SiYuan）。
- **MarkText 是最像 Typora 的开源参考实现**，但代码停在 2022 年，与其 fork 不如读它的 Muya 引擎源码、然后用 Milkdown 重新实现。
- **Zettlr 与 Obsidian 走的是 CodeMirror 6 + 装饰器路线**，这是 markup 的“路线 B”（详见第 7 节）。

数据来源：

- [marktext GitHub](https://github.com/marktext/marktext) | [Zettlr GitHub](https://github.com/Zettlr/Zettlr) | [joplin GitHub](https://github.com/laurent22/joplin) | [logseq GitHub](https://github.com/logseq/logseq) | [siyuan GitHub](https://github.com/siyuan-note/siyuan) | [yn GitHub](https://github.com/purocean/yn) | [vnote GitHub](https://github.com/vnotex/vnote) | [notable GitHub](https://github.com/notable/notable) | [abricotine GitHub](https://github.com/brrd/abricotine)
- [AlternativeTo: Mark Text alternatives](https://alternativeto.net/software/mark-text/)
- [Best Markdown Editors 2026 — Unmarkdown](https://unmarkdown.com/blog/best-markdown-editors-2026)

---

## 2. WYSIWYG Markdown 编辑器内核 / 库（markup 的编辑层）

> 这是 markup 最关键的选型——决定了开发量、用户体验上限和长期可维护性。

### 2.1 候选对比

| 候选 | URL | Stars | License | 基础 | 最近活跃 | 适合 markup？ |
|------|-----|------:|--------|------|---------|--------------|
| **Milkdown** ⭐ 强推 | github.com/Milkdown/milkdown | 11.4k | MIT | ProseMirror + Remark | v7.20.0 / 2026-03 | **是。** 唯一专门面向 “Typora 风格 WYSIWYG” 设计的活跃框架；headless、插件化、原生支持 Y.js 协同 |
| **TipTap** | github.com/ueberdosis/tiptap | 36.7k | MIT | ProseMirror | v3.23.1 / 2026-05 | 可，但偏“富文本”。Markdown 来回转换不是一等公民，需要自己写适配层；优势是生态最好、扩展最多 |
| **ProseMirror** | github.com/ProseMirror/prosemirror | 8.7k | MIT | 自身 | 主仓 2026-04 已 archive，开发迁至 code.haverbeke.berlin | 直接基于它从零写工作量大；除非要极致定制（块结构、表格交互），否则用 Milkdown/TipTap 包装 |
| **Lexical** | github.com/facebook/lexical | 23.4k | MIT | 自研 | v0.44.0 / 2026-04 | 性能好、内核小，但 Markdown 支持靠 `@lexical/markdown` 插件，能力比 Milkdown 弱；适合 RN/移动端，markup 不是 |
| **Vditor** | github.com/Vanessa219/vditor | 10.9k | MIT | 自研 | v3.11.2 / 2025-09 | 三模式（WYSIWYG / IR / SV）开箱即用，是 Typora 体验最完整的“成品级”库；但二次定制难度比 Milkdown 高，UI 偏“工具栏”而非纯净 |
| **Cherry Markdown** | github.com/Tencent/cherry-markdown | 4.7k | Apache-2.0 | 腾讯自研 | 持续维护 | 主打企业富文本、双栏；纯 WYSIWYG 不是核心场景，不推荐 |
| **CodeMirror 6 + lang-markdown** | github.com/codemirror/lang-markdown | - | MIT | CM6 | 6.5.x 活跃 | **路线 B 的核心。** 不是真 WYSIWYG，但搭配装饰器（参考 ink-mde、ixora、codemirror-rich-markdoc）可做出 Obsidian/Zettlr 那种“半即时渲染” |
| **ink-mde** | github.com/davidmyersdev/ink-mde | 中等 | MIT | CM6 | 活跃 | CM6 + 富 Markdown 的现成包，路线 B 起步 |
| **Monaco** | microsoft/monaco-editor | 大 | MIT | VS Code 内核 | 活跃 | 不适合：Monaco 是“代码编辑器”，对块结构、内联渲染、装饰可塑性弱 |
| **ByteMD** | github.com/bytedance/bytemd | 1.3k | MIT | Svelte | v1.22.0 / 2025-02，v2 重命名为 HashMD | 双栏为主，不适合 Typora 路线 |

### 2.2 三条可行路线

| 路线 | 内核 | Markdown 一等公民？ | 工作量 | 体验上限 |
|------|------|--------------------|-------|---------|
| **A. Milkdown 路线（推荐）** | Milkdown（ProseMirror + Remark） | 是 | 中（写主题 + 少量插件） | 与 Typora 几乎对齐 |
| **B. CM6 装饰器路线（备选）** | CodeMirror 6 + lang-markdown + 装饰 | 半（源文本驻留） | 中高（装饰器要自己写很多） | 接近 Obsidian Live Preview |
| **C. TipTap 自适配路线** | TipTap + 自写 markdown-serializer | 否 | 高 | 极致富文本，但 Markdown 来回转可能丢信息 |

**推荐路线 A**：Milkdown 自身就是“受 Typora 启发”的框架，模型与目标完全对齐。路线 B 的优势是“源文本始终是真 Markdown，不会有富文本回写丢失”，这是部分硬核用户在意的；可作为 markup 的 Pro 模式入口，但默认走 A。

数据来源：

- [Milkdown GitHub](https://github.com/Milkdown/milkdown) | [Milkdown 官网](https://milkdown.dev/) | [LogRocket: Comparing Milkdown](https://blog.logrocket.com/comparing-milkdown-other-wysiwyg-editors/)
- [TipTap GitHub](https://github.com/ueberdosis/tiptap) | [Lexical GitHub](https://github.com/facebook/lexical)
- [Tiptap vs Lexical vs Plate (2026)](https://trybuildpilot.com/609-tiptap-vs-lexical-vs-plate-editor-2026) | [Tiptap vs Lexical (Liveblocks)](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)
- [Vditor GitHub](https://github.com/Vanessa219/vditor) | [Cherry Markdown GitHub](https://github.com/Tencent/cherry-markdown)
- [@codemirror/lang-markdown](https://www.npmjs.com/package/@codemirror/lang-markdown) | [ink-mde](https://github.com/davidmyersdev/ink-mde) | [ixora (codeberg)](https://codeberg.org/retronav/ixora)
- [ByteMD GitHub](https://github.com/bytedance/bytemd)

---

## 3. Markdown 解析 / AST 库

> 这是“正确性 + 性能”的基础。markup 内部至少需要解析（编辑器层）、序列化（保存）、批量导出（命令行/导出 PDF）三种场景。

### 3.1 JS / TS 端

| 库 | License | 速度（小文件） | 速度（批量） | 生态 / 插件 | 是否 AST |
|----|--------|---------------|-------------|------------|---------|
| **marked** | MIT | 最快 | 中（无 AST 转换层） | 简单 | 否（直接 token→HTML） |
| **markdown-it** | MIT | 中等偏快 | 中 | **最大**（VS Code/MDX/语雀都用） | 半 AST（token 流） |
| **remark / unified** | MIT | 较慢（每次构 mdast + 插件链） | 较慢但可并行 | 大（mdast + 上百插件） | 是（mdast 标准 AST） |
| **micromark** | MIT | 中等 | 中 | remark 底层引擎 | 否 |
| **showdown** | MIT | 中 | 中 | 衰退 | 否 |

**结论**：

- **编辑层留给 Milkdown**（其内部就是 remark），不要再叠一层。
- **导出 / 批量管线**：默认 `markdown-it`（生态最大、性能稳）；如果未来想加 MDX 或自定义 AST 转换链，再切到 `unified + remark`。

### 3.2 Rust 端（如果走 Tauri）

| 库 | License | Stars | 特点 | 用途 |
|----|--------|------:|------|------|
| **pulldown-cmark** | MIT | 大（事实标准） | 流式、零分配偏向、CommonMark 0.31 | **首选**：本地解析、命令行、文件索引 |
| **comrak** | 2-Clause BSD | 1.6k（2026-04 活跃） | CommonMark + GFM + 大量扩展（脚注、wikilink、math、alerts） | 想要更全的 GFM / 扩展时选它，CLI 完整度高 |
| **swift-markdown**（Apple） | Apache-2.0 | - | cmark-gfm 包装，AST 操作友好 | 如果走 Swift / SwiftUI 路线再考虑 |

**结论**：Tauri 后端用 **pulldown-cmark** 做主解析、扩展不够时换 **comrak**；不要把这层放回 JS 端做。

数据来源：

- [marked vs remark vs markdown-it 2026 — PkgPulse](https://www.pkgpulse.com/guides/marked-vs-remark-vs-markdown-it-parsers-2026)
- [npmtrends: 4 parsers](https://npmtrends.com/markdown-it-vs-marked-vs-remark-vs-remark-parse-vs-unified)
- [pulldown-cmark GitHub](https://github.com/pulldown-cmark/pulldown-cmark) | [comrak GitHub](https://github.com/kivikakk/comrak) | [swift-markdown GitHub](https://github.com/swiftlang/swift-markdown)

---

## 4. 数学 / 图表 / 代码渲染

| 类别 | 候选 | 选哪个 | 理由 |
|------|------|-------|------|
| 数学公式 | **KaTeX** vs MathJax 3 | **KaTeX** | 同步渲染、bundle 更小（约 350 KB 量级）、对 Typora 风格的“边写边渲染”延迟体验最友好；MathJax 3 性能差距已不大但 LaTeX 兼容更全，留作高级模式可选 |
| 流程图/时序图 | **Mermaid** | **Mermaid** | MIT，bundle 200KB（gzip），74k+ stars，GitHub/GitLab 原生支持，几乎是事实标准 |
| 代码高亮 | **Shiki** vs Prism vs highlight.js | **Shiki** | 用 VS Code 同款 TextMate Grammar，质量最佳；缺点是慢（约比 Prism 慢 7×）、bundle 大（含 WASM）。markup 是桌面应用，不是高 QPS Web，质量优先于速度，Shiki 是正解；Prism 留作低端机降级 |
| 高级图表 | PlantUML / Graphviz | 可选 / V2 | 二者都需要外部工具或重 wasm，建议作为插件，主程序不内置 |

**注意**：Shiki 的 WASM 在 Tauri WebView 下需要打包好资源；如果遇到加载慢，可以考虑“开发期 Shiki 渲染、再缓存到磁盘 / 内存”的二阶段策略。

数据来源：

- [Shiki vs Prism vs highlight.js 2026](https://www.pkgpulse.com/blog/shiki-vs-prismjs-vs-highlightjs-syntax-highlighting-2026) | [chsm.dev: Comparing web code highlighters](https://chsm.dev/blog/2025/01/08/comparing-web-code-highlighters)
- [KaTeX vs MathJax 2026 — BigGo](https://biggo.com/news/202511040733_KaTeX_MathJax_Web_Rendering_Comparison)
- [Mermaid 官网](https://mermaid.js.org/) | [mermaid GitHub](https://github.com/mermaid-js/mermaid)

---

## 5. 桌面框架

| 框架 | 体积（典型） | 内存 | 启动 | 跨平台一致性 | 学习成本 | 适合 markup？ |
|------|-------------|------|------|-------------|---------|--------------|
| **Tauri v2** | 2–12 MB | 30–50 MB | 1–2 秒 | macOS=WKWebView，Win=WebView2，Linux=WebKitGTK，**有差异** | 需要会一点 Rust（前端没变化） | **首选** |
| **Electron 30+** | 80–200 MB | 200–300 MB | 8–12 秒 | 全平台一致（自带 Chromium） | 最低 | 备选；只有当 macOS WKWebView 出现关键 Bug 时考虑 |
| **原生 SwiftUI/AppKit + WKWebView** | 极小 | 最低 | 最快 | 仅 Mac | 高（需写 Swift） | **mac-only 路线**，体感最“苹果”但工作量大、跨平台无门 |
| **Expo / React Native** | n/a | n/a | n/a | 移动优先 | n/a | **不适用，必须排除** |

### 5.1 关于 Expo 的说明

> 用户在需求里提到“不要用 Expo”，这里明确说明原因：**Expo 是 React Native 生态围绕 iOS / Android 打造的工具链**（OTA 更新、Expo Go、EAS Build 等都面向移动端）。React Native macOS（由 Microsoft 维护）确实存在，但 Expo 自身对 macOS 桌面应用并非一等公民支持，并且 RN 桌面在 2026 年仍远不如 Tauri/Electron 成熟。把 Expo 用在 markup 这种“macOS 文本编辑器”上属于工具错配——文本/光标/contentEditable 这套核心交互在 RN 里需要绕一大圈，不如直接用 Web 技术 + Tauri WebView。

### 5.2 推荐：Tauri v2

- 体积/内存/启动数据：相比 Electron，bundle 约小 25×，内存低 60–75%，冷启动快约 4×。
- v2 起统一了权限模型、引入了移动端目标，主仓持续高频更新。
- 对 markup 的特殊好处：Mac 上用的是 WKWebView，与系统集成（拖拽、Quick Look、空格预览）友好，且二进制小，**符合 macOS 用户对“原生体感 + 小体积”的预期**。

### 5.3 风险

- Tauri 在不同平台用不同 WebView，需要在 Linux 上额外测 WebKitGTK 的兼容性（markup 第一阶段只做 Mac，可暂时忽略）。
- 后端是 Rust，不写 Rust 的开发者要爬一段坡；但 markup 的 Rust 端职责并不重（文件 I/O、外壳、原生菜单、Pulldown-cmark 解析），不是阻塞项。

数据来源：

- [Tauri vs Electron 2026 — pkgpulse](https://www.pkgpulse.com/blog/electron-vs-tauri-2026) | [Tauri vs Electron — gethopp](https://www.gethopp.app/blog/tauri-vs-electron) | [Tauri 2.0 vs Electron 30.0 — johal.in](https://johal.in/you-use-tauri-20-electron-300-desktop-apps/)

---

## 6. 配套生态（小项一并列出）

| 用途 | 推荐 | License | 备注 |
|------|-----|--------|------|
| 协同编辑（V2+ 可选） | Y.js | MIT | Milkdown 已原生支持 |
| 文件树 / 工作区 | Tauri fs API + 自写 | - | 不要引入 nodejs fs |
| 全文搜索 | tantivy（Rust） | MIT | 与 Tauri 后端搭配最自然 |
| 图标 | Lucide / Phosphor | ISC / MIT | 风格中性 |
| 主题系统 | CSS variables + prefers-color-scheme | - | 直接对齐 macOS 深色模式 |
| 拼写 | macOS 原生 NSSpellChecker（通过 Tauri 自定义命令） | - | 比纯 JS 拼写库准确 |

---

## 7. 推荐技术栈：A vs B 对比（二选一）

| 维度 | 方案 A（推荐） | 方案 B（备选） |
|------|---------------|--------------|
| 桌面外壳 | **Tauri v2 (Rust)** | Electron 34+ |
| 编辑内核 | **Milkdown（ProseMirror + Remark）** | CodeMirror 6 + lang-markdown + 装饰器 |
| 解析（编辑） | **Remark / mdast**（Milkdown 内置） | markdown-it |
| 解析（导出/索引） | **pulldown-cmark（Rust）** | markdown-it（Node） |
| 代码高亮 | **Shiki** | Prism（降级方案） |
| 数学 | **KaTeX** | MathJax 3（高级模式可选） |
| 图表 | **Mermaid** | Mermaid（无替代） |
| UI 框架 | **Solid 或 Vue 3**（轻量、与 Tauri 生态契合） | React 18 |
| 开发语言 | TS（前端）+ Rust（外壳） | TS + JS |
| License 总体 | 全部 MIT/Apache/BSD，可商用、可闭源分发 | 同 A，但 Electron+Chromium bundle 增加发布合规面 |
| 体积上限 | ~10–20 MB | 150 MB+ |
| 风险 | 跨平台 WebView 差异；写一点 Rust | 体积大、内存高、启动慢，但生态成熟 |

### 一句话总结

> **如果 markup 只能选一套技术栈：Tauri v2 + Milkdown + Remark + Shiki + KaTeX + Mermaid。理由是它在“Typora 哲学（纯 WYSIWYG）+ macOS 原生体感（小体积、WKWebView）+ 友好的 license（全 MIT/Apache，可商用闭源）”这三条硬约束的交集上是当前唯一一组同时达标的组合，并且每一块都还有活跃的上游维护者。**

---

## 8. 后续 TODO

- [ ] Spike：用 Milkdown 起一个最小可写 demo，验证“非常用 Markdown 语法（表格内嵌表格、脚注嵌套、数学块）”往返保真度。
- [ ] Spike：在 Tauri v2 里跑通 Milkdown + Shiki，量一下冷启动、首字延迟、内存。
- [ ] 调研 Milkdown 的协同（Y.js）能否被关掉以减少 bundle（V1 不要协同）。
- [ ] 决定 Pro 模式是否提供路线 B（CM6）作为“硬核 Markdown 工程师”视图。
- [ ] 评估是否把 PDF 导出交给系统 `cups`/`WebKit` 打印，避免引入 puppeteer/playwright。
