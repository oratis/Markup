# Typora 调研报告

> 目的：为在 Mac 上构建一款功能近似的开源 Markdown 编辑器（项目代号 **markup**）做产品与技术铺垫。
> 范围：Typora 1.x（截至 2026 年 5 月，最新公开稳定线为 1.10.x）。
> 来源：Typora 官网 / 官方 Support 文档、Theme Gallery、GitHub `typora/typora-issues`、`typora/electron`、Hacker News、Reddit、知乎、Product Hunt、G2 等公开资料。
> 原则：**只做产品形态参考，不逆向、不破解、不复用 Typora 私有代码**。

---

## 1. 核心功能特性（Typora 1.x）

### 1.1 编辑核心：实时所见即所得

Typora 最核心、也是最具差异化的能力是**单视图实时渲染**：用户在同一个编辑面板里输入 Markdown 语法，渲染结果立即就地替换原文，不存在传统的"左源码 / 右预览"双窗格。

- **WYSIWYG (官方称之为 "What You See Is What You Mean")**：输入 `## 标题` 时，前缀符号被即时折叠为视觉化标题样式；移动光标进入该行时再展开成可编辑的源码状态。
- **Source Mode（源码模式）**：可通过 `View → Source Code Mode` 切换为纯源码视图，方便排查脏字符或粘贴整段 Markdown。
- **Focus Mode（聚焦模式）**：除当前行 / 当前块外，其他段落整体褪色（fade out），减少视觉噪音。
- **Typewriter Mode（打字机模式）**：编辑时始终把当前行滚动到屏幕垂直中线。可在偏好设置中关闭"在选择光标时也自动居中"，仅在键入时居中。

### 1.2 支持的 Markdown 扩展

Typora 把"Markdown 是 GFM 的严格超集，GFM 是 CommonMark 的严格超集"作为兼容承诺。社区开发者 PegasisForever 在为 Typora 写第三方解析器时也确认了这一点。具体支持范围：

| 类别 | 内容 |
|---|---|
| 基础语法 | CommonMark 全部、强调 / 加粗、超链接、自动链接（与 CommonMark 略有差异） |
| GFM 扩展 | 任务列表 `- [ ]`、删除线、表格、围栏代码块 |
| 数学公式 | LaTeX 行内 `$...$` 与块级 `$$...$$`，渲染引擎为 **MathJax**（1.0 起升级到 MathJax 3.x，1.10 升级到 MathJax 4.x），内置 `mhchem`、AMSmath、BBox 等扩展 |
| 图表 | **Mermaid**（1.9 升级到 v10、1.10 升级到 v11，新增多种图）、**flowchart.js**（流程图）、序列图、甘特图 |
| HTML 嵌入 | 允许内嵌任意 HTML 片段 |
| Emoji | `:smile:` 形式短码 + 内嵌选择面板 |
| 文档结构 | `[TOC]` 自动目录、自动编号标题与公式 |
| YAML Front Matter | 三短横线包裹，元数据可影响导出（`title` / `author` / `cover-image` / `append-head` / `append-body` 等） |
| 引用 / 脚注 | 标准块引用、行内引用语法 `^[]`、脚注 `[^1]` |
| CJK 排版 | 中日韩字符与拉丁字符之间的智能空格 |

注：Typora **不使用 KaTeX**，全部数学渲染由 MathJax 完成。

### 1.3 文件管理

- **File Tree（文件树）侧栏**：把任意文件夹挂到左侧，作为"工作区"。
- **Articles 面板**：仅列出当前文件夹下的 Markdown 文件 + 标题预览。
- **Open Quickly**（`⇧⌘P` / Mac）：模糊搜索 + 全文检索，类似 VS Code 的 Quick Open。
- **Recent Files**：最近打开的文件列表。
- **全局搜索**：跨文件搜索，并可在结果列表里跳转。

### 1.4 大纲、字数与目录

- **Outline 面板**：自动从 H1–H6 生成树状大纲，点击跳转。
- **Word Count**：底部状态栏实时显示字数 / 字符数 / 行数 / 阅读时长（区分中英文，CJK 按字符计数）。
- **`[TOC]`**：在文档任意位置插入即时渲染的目录。

### 1.5 主题系统

- 主题为单个 `.css` 文件，置于 Typora 的 `themes/` 目录下，重启即可在 `Themes` 菜单中看到。
- 文件命名约定：小写 + 连字符 → 菜单标签自动美化（`my-first-typora-theme.css` → "My First Typora Theme"）。
- 支持 `prefers-color-scheme` 媒体查询，一个主题文件可同时适配明暗模式；也可在偏好设置中分别为 Light / Dark 指定不同主题。
- **官方 Theme Gallery**（theme.typora.io）汇集 Dracula、GitHub、Nord、Solarized、Panda、JetBrains Dark 等几十款社区主题。

### 1.6 表格、任务列表、脚注

- **表格**：内置可视化表格编辑器（右键 / 浮动工具栏），支持插入行列、对齐方式、拖拽列宽，比手写 `|---|` 友好得多。
- **任务列表**：原生 GFM `- [ ]`，复选框可直接点击切换状态。
- **脚注**：`[^id]` 引用 + 末尾定义，渲染时自动生成跳转链接。

### 1.7 图片管理

- **多种插入方式**：粘贴、拖拽、`![](path)` 写法、菜单选择文件。
- **路径策略**：支持绝对路径、相对路径、`file://`、`http(s)`、Base64。
- **Auto-copy 到指定文件夹**：`Preferences → Image` 中开启 "Allow copy images to given folder"，例如把 `_posts/x.md` 内的图片自动复制到 `_media/`，并自动改写 Markdown 引用。
- **图床上传**：内建对 **PicGo / iPic / uPic / Picsee / 自定义命令** 的调用，支持 Imgur、GitHub、SM.MS、Aliyun OSS、S3、Cloudflare R2 等几十个图床（具体数量取决于上传器）。
- Typora 1.x 还提供了一份**预编译的 PicGo-Core 二进制**（用 `nexe` 打包成单文件），可由 Typora 直接安装到其支持目录，免去单独装 Node。

### 1.8 导出

| 格式 | 实现 | 备注 |
|---|---|---|
| HTML | 内置 | 可附 `append-head` / `append-body` 注入资源 |
| PDF | 内置 (Chromium 打印) | 支持书签、页眉页脚、YAML 元数据写入 |
| 图片（PNG） | 内置 | 整页或选区 |
| docx / odt / rtf / epub / LaTeX / MediaWiki | **Pandoc**（≥ 2.0） | 用户需自行安装 Pandoc 二进制 |
| 自定义模板 | YAML + 自定义 CSS / Pandoc 模板 | EPUB 可通过 `cover-image:` 指定封面 |

### 1.9 自动保存与文件监听

- **Auto Save**：可在偏好里开启，所有修改实时回写磁盘；macOS 未命名草稿存到 `~/Library/Autosave Information`。
- **File Watching**：编辑器外修改文件后会刷新视图（带冲突提示）。
- **崩溃恢复**：未保存内容定期序列化到 Autosave 目录。

### 1.10 快捷键体系

`Preferences → Open Advanced Settings → conf.user.json` 与系统 `System Settings → Keyboard → App Shortcuts`（macOS）允许重映射所有菜单命令。文档将快捷键分为：

1. **File**：New / Open / Save / Save As / Export / Open Quickly
2. **Edit**：Cut / Copy / Paste / Find / Replace / Undo / Redo
3. **Format（行内）**：Bold ⌘B / Italic ⌘I / Underline ⌘U / Code `⌘⇧``` / Strikethrough
4. **Paragraph（块级）**：H1–H6 (`⌘1`…`⌘6`) / Quote / List / Table / Code Fence / Math Block
5. **View**：Toggle Sidebar / Outline / Source Mode / Focus Mode / Typewriter Mode / Zoom
6. **Autocomplete**：`Esc` 触发行内数学预览、emoji、引用补全等

### 1.11 拼写检查

- **macOS**：直接复用系统 `Spelling and Grammar`，无需额外配置。
- **Windows / Linux**：Typora 自带词典 + 状态栏拼写图标，可切换语言或关闭。

### 1.12 代码块

- 围栏代码块 `​`​`​`​`lang`，内嵌 **CodeMirror** 作为代码块编辑器（这是 Typora 唯一公开承认使用 CodeMirror 的部分，详见技术架构章节）。
- 使用 **highlight.js** 进行语法高亮（约 100 种语言），通过把 highlight.js 的类名映射到 CodeMirror 的样式系统，让"非编辑态"和"编辑态"视觉一致。
- **不内置代码运行**（Typora 不是 Notebook 类工具）。

### 1.13 段落定位

光标跨段移动时滚动有平滑动画，配合 Typewriter Mode 让长文写作"焦点不丢失"。这一点是用户最常被打动的细节。

---

## 2. 技术架构推断

### 2.1 是 Electron 还是原生？

**结论：Electron**，且基于 Typora 自维护的 fork。证据：

- GitHub 上存在公开仓库 `typora/electron`，是 `electron/electron` 的 fork。
- macOS 安装包内包含 `app.asar`、`lib.asar`、`node_modules` 等典型 Electron 目录结构。
- 1.4.7 起 Typora 支持以"外部 Electron"方式启动（issue #5463 / #6154），印证它本质是一个标准 Electron 应用。
- 渲染层全部是 Web 技术（HTML + CSS + JS），主题通过 `.css` 即可改变 UI。

注：作者 Abner Lee 早期博客与 README 中也间接确认了 Web 技术栈选型。

### 2.2 Markdown 解析器

**官方未直接公开**使用的解析器名称，但有三个可推断的事实：

1. **不是 marked、不是 markdown-it 直接拿来用**：Typora 行为偏离了这两个库的默认能力。第三方解析器作者 PegasisForever 明确表示，marked.js 的扩展系统粒度不够，无法处理 Typora 的"允许连续空段落、TOC 仅显示顶级标题、重复标题 ID 处理"等差异点。
2. **是 GFM 的严格超集**：Typora 在 issue 369 中声明自己的 Markdown 必须是 GFM 的严格超集，意味着至少在前端做了 GFM 兼容层（无论是基于 marked / markdown-it 改造，还是自研）。
3. **代码块的局部使用 CodeMirror**：仅 fenced code block 的"编辑态"使用 CodeMirror，行内文本的渲染并非由 CodeMirror 接管。

最合理的推断：**Typora 自研了 Markdown 解析与渲染管线**（或基于某个 CommonMark 实现深度改造），并把 CodeMirror、MathJax、Mermaid、flowchart.js、highlight.js 作为子模块挂接到自己的 AST / DOM 上。它的 WYSIWYG 关键技巧是"不重绘整个 DOM，而是按块（block）做局部 patch"，所以小修改很流畅；但当文档长度超过几万字时，某些跨块操作（搜索、目录刷新、math 重排）会引发性能塌陷（见 §3）。

### 2.3 编辑器内核与渲染层

| 层 | 选型 |
|---|---|
| 桌面壳 | Electron（自维护 fork） |
| UI / 渲染 | Chromium 原生 DOM + CSS（主题就是 CSS） |
| 编辑模型 | 自研的 contenteditable 块级编辑器 + 块级 AST |
| 代码块编辑 | CodeMirror（仅围栏代码内部） |
| 代码高亮 | highlight.js（类名映射到 CodeMirror 样式） |
| 数学 | MathJax 3.x → 4.x |
| 图表 | Mermaid v11、flowchart.js |
| 导出（高级） | 调用本地 Pandoc 二进制 |
| 图片上传 | 子进程调用 PicGo / iPic / uPic / 自定义命令 |
| 拼写 | macOS 系统服务 / 自带 Hunspell 词典 |

---

## 3. 用户最爱 vs 最常吐槽

### 3.1 最受好评的功能（按出现频次排序）

1. **真·所见即所得，无双窗格** — Hacker News、Reddit、知乎几乎一致的"the best WYSIWYG Markdown experience at this price"。
2. **极简 UI / 零干扰写作** — 没有顶部工具栏轰炸，长文写作专注度极高。
3. **Focus + Typewriter 双模式** — 长篇博客 / 论文写作者强烈依赖。
4. **可视化表格编辑** — 比 VS Code、Obsidian 等手写表格友好。
5. **大纲面板 + Quick Open** — 跨文档跳转效率高。
6. **PDF 导出质量** — 直接出书级别的排版，元数据可控。
7. **主题生态丰富** — Theme Gallery 上百款，纯 CSS 即可定制。
8. **一次性付费 ($14.99 / 3 设备)** — 在订阅泛滥的市场是稀缺正面卖点。

### 3.2 最常被吐槽的痛点

1. **大文件性能塌陷**（issue #68 / #303 / #1285 / #1719 / #1800 / #3474）
   - 数万字以上文档键入延迟可达几百毫秒到秒级。
   - 含大量 LaTeX 公式时，3000 字就开始卡。
   - 全文搜索在 ~800KB 文件上几乎不可用。
   - 推断根因：每次编辑触发的"块级重渲 + 公式重排 + 段落重排"未做有效虚拟化与去抖。
2. **没有 iPad / iOS 版本** — 移动端写作者直接放弃。
3. **辅助功能差**：VoiceOver 几乎读不到内容（Allison @ Podfeet 等用户反馈）。
4. **无云同步 / 无版本历史** — 必须靠 iCloud / Dropbox / Git 等外部工具。
5. **多光标 / 同名词同时编辑等高级编辑能力缺失** — 知乎用户最高频吐槽之一。
6. **闭源 + Beta 转付费引发情绪反弹** — 长期免费 Beta 后突然商业化，部分老用户不满。
7. **代码块功能弱** — 无运行能力、无 Notebook、无 LSP，仅高亮。
8. **EPUB 导出体验粗糙**（issue #2833）— 样式 / 媒体处理与实际阅读器差异大。
9. **Pandoc 配置门槛**（导出 docx 必须用户自己装 Pandoc）。
10. **快捷键体系不够开放** — 自定义需手改 macOS 系统快捷键或 conf.user.json。

### 3.3 对 markup 的启示

构建 markup 时，**第一性原则**应是把"无双窗格 + Focus/Typewriter + 极简 UI + 富主题"这套体验保留，同时**优先解决性能塌陷**：

- 用现代编辑器内核（CodeMirror 6 / ProseMirror / Lexical / Tiptap）取代自研 contenteditable，天然带块级虚拟化。
- 公式 / 图表使用 KaTeX 替代 MathJax（更快、纯前端），Mermaid 按需懒加载。
- 增量解析（`markdown-it` + 自定义 plugin，或基于 CodeMirror Lezer 增量语法树）。
- 文件搜索用 Web Worker / SQLite FTS5，避免阻塞主线程。
- 多光标、键盘宏、命令面板这些 Typora 缺的能力，是差异化抓手。

---

## 4. 现行版本的定价 / 许可模式

| 项 | 内容 |
|---|---|
| 价格 | **$14.99 USD（一次性）** |
| 试用期 | 15 天免费 |
| 设备数 | 1 个许可证可激活 **最多 3 台设备** |
| 平台 | macOS / Windows (10/11, x64 + ARM) / Linux |
| 续费 | **无**，永久许可、含全部未来更新与支持 |
| 许可类型 | 单用户许可（"per user"），不可团队共享 |

定价对一个独立开发者团队（Abner Lee + 极少数协作者）维护跨平台工具来说是合理的。本项目（markup）不打算复用其商业模型，仅用于个人自用 / 开源贡献。

---

## 5. 参考资料（Sources）

- 官方
  - [Typora 官网](https://typora.io/)
  - [Focus and Typewriter Mode](https://support.typora.io/Focus-and-Typewriter-Mode/)
  - [Math and Academic Functions](https://support.typora.io/Math/)
  - [Draw Diagrams With Markdown](https://support.typora.io/Draw-Diagrams-With-Markdown/)
  - [Export](https://support.typora.io/Export/)
  - [YAML Front Matter](https://support.typora.io/YAML/)
  - [Install and Use Pandoc](https://support.typora.io/Install-and-Use-Pandoc/)
  - [Upload Images](https://support.typora.io/Upload-Image/)
  - [Images in Typora](https://support.typora.io/Images/)
  - [About Themes](https://support.typora.io/About-Themes/)
  - [Add Custom CSS](https://support.typora.io/Add-Custom-CSS/)
  - [Dark Mode](https://support.typora.io/Dark-Mode/)
  - [Shortcut Keys](https://support.typora.io/Shortcut-Keys/)
  - [Spellcheck](https://support.typora.io/Spellcheck/)
  - [What's New 1.0](https://support.typora.io/What%27s-New-1.0/)
  - [What's New 1.13](https://support.typora.io/What's-New-1.13/)
  - [Theme Gallery](https://theme.typora.io/)
  - [Purchase / EULA](https://support.typora.io/purchase/)
- GitHub
  - [typora/electron (fork)](https://github.com/typora/electron)
  - [typora-issues #68 — 性能问题](https://github.com/typora/typora-issues/issues/68)
  - [typora-issues #303 — 大文件性能](https://github.com/typora/typora-issues/issues/303)
  - [typora-issues #315 — 用何种 markdown 引擎](https://github.com/typora/typora-issues/issues/315)
  - [typora-issues #369 — Markdown 兼容承诺](https://github.com/typora/typora-issues/issues/369)
  - [typora-issues #1285 / #1719 / #1800 / #3474 — 性能 / 搜索](https://github.com/typora/typora-issues/issues/1285)
  - [typora-issues #2476 — PicGo 支持](https://github.com/typora/typora-issues/issues/2476)
  - [typora-issues #2833 — EPUB 导出问题](https://github.com/typora/typora-issues/issues/2833)
  - [PegasisForever/typora-parser 讨论 #2](https://github.com/PegasisForever/typora-parser/discussions/2)
  - [Molunerfinn/PicGo](https://github.com/Molunerfinn/PicGo)
- 社区评测
  - [Hacker News — Typora 1.0](https://news.ycombinator.com/item?id=29360720)
  - [Hacker News — Typora minimal markdown editor](https://news.ycombinator.com/item?id=21458977)
  - [Product Hunt Reviews](https://www.producthunt.com/products/typora/reviews)
  - [G2 Reviews](https://www.g2.com/products/typora/reviews)
  - [PäksTech Review](https://pakstech.com/blog/typora-review/)
  - [Podfeet — Allison's review](https://www.podfeet.com/blog/2024/06/typora-allison/)
  - [知乎：如何评价 Typora](https://www.zhihu.com/question/266527676)
  - [知乎：Typora 沉浸式生产力](https://zhuanlan.zhihu.com/p/667326649)
  - [知乎：Typora 收费替代品](https://zhuanlan.zhihu.com/p/450104097)
