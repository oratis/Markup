# Markup 视觉改版与产品重定位计划

> 状态：草案 v0.1 · 2026-05-27
> 配套高保真原型：[`mockup-obsidian-redesign.html`](./mockup-obsidian-redesign.html)
> 参考视觉：Obsidian 0.15+ 的深色 chrome（详见原型与本文 §3）

---

## 0. TL;DR

Markup 从 **Typora 风格的 WYSIWYG 编辑器** 重定位为 **"用 HTML 的形态来看 MD" 的阅读优先文档工具**：

- **默认进入 Read 模式**，把 `.md` 渲染成排版讲究、可分享、可导航的 HTML 文档
- **编辑是次级动作**（按 `E` / 点编辑按钮才进入），不再是默认状态
- **视觉壳层全面对齐 Obsidian**：活动栏 / 文件树 / 标签条 / 反向链接面板 / 状态栏，深色为主、克制留白、统一图标语言
- **CSS 变量驱动**，不动 React 组件树的 props，可分阶段迁移

---

## 1. 背景

### 1.1 现状
当前 Markup 已有完整功能矩阵（见 README）：Milkdown WYSIWYG + CodeMirror source、Vault、Quick Open、全文搜索、反向链接、Outline、Canvas、Graph、Settings 等。

视觉层面的问题：
- chrome 较"裸"，缺乏识别度，三种主题（light / dark / sepia）的差异主要在背景色，没有形成统一的视觉语言
- 与 Typora 高度相似，定位上没有差异化
- 文件树、Tab、状态栏等次要 UI 没有统一的图标 / 间距 / 颜色规范
- "看 MD" 这件事的体验和"编辑 MD"没有明确分层

### 1.2 重定位
> **Markup is the nicest way to *read* a Markdown vault.**
> *"用 HTML 的形态来看 MD"*

| | 旧定位 | 新定位 |
|---|---|---|
| 默认模式 | WYSIWYG 编辑 | Reader（HTML 渲染） |
| 主用户动作 | 写 | 看 / 找 / 跳 |
| 与 Typora 关系 | 开源克隆 | 阅读优先的差异化 |
| 与 Obsidian 关系 | 功能子集 | 视觉同源，更轻量、更聚焦阅读 |
| 卖点 | 跨平台 / 性能 | 排版美、反向链接强、零配置 |

编辑能力**完整保留**：`E` 切到 Edit 模式（Milkdown），`⌘/` 切到 Source 模式（CodeMirror）。但默认状态、icon 优先级、新用户引导都围绕"读"。

---

## 2. 设计目标 & 原则

### 2.1 目标
1. **认得出**：截图能在 5 秒内被识别为"像 Obsidian 那一类的工具"，但不抄到混淆
2. **看得清**：正文区域排版严谨，无关 chrome 在视觉上让位
3. **找得到**：反向链接 / Outline / 全文搜索是显性入口，不是隐藏功能
4. **改得动**：CSS 变量 + 组件级 slot，不动核心数据流就能换主题

### 2.2 原则
- **Read first, edit on demand** — 阅读路径最短，编辑路径明确但不打扰
- **Chrome quiets, content speaks** — 边栏 / 工具栏使用降饱和的中性色，正文区域获得 100% 注意力
- **Tokens, not magic numbers** — 所有颜色 / 间距 / 字号通过 CSS 变量定义，禁止组件内硬编码
- **Density: comfortable** — 介于 VS Code 的紧凑和 Notion 的稀疏之间，对齐 Obsidian 当前密度
- **Keyboard-equal** — 每一个鼠标可达的动作都有键位

---

## 3. 视觉系统

### 3.1 色彩 Token

深色为旗舰主题（默认推荐），浅色为对等支持。Sepia 暂保留但不作为主推。

```css
/* Dark — 默认 */
--mk-bg-app:        #1e1e1e;   /* 主背景 */
--mk-bg-sidebar:    #1a1a1a;   /* 活动栏 + 文件树 + 右侧反链 */
--mk-bg-elevated:   #242424;   /* tab、hover、菜单 */
--mk-bg-selected:   rgba(255,255,255,0.08);
--mk-bg-hover:      rgba(255,255,255,0.05);

--mk-fg-default:    #dcddde;   /* 正文 */
--mk-fg-strong:     #e6e6e6;   /* 标题、active tab */
--mk-fg-muted:      #808080;   /* 次要文字、icon idle */
--mk-fg-faint:      #5a5a5a;   /* 分隔、placeholder */

--mk-border:        rgba(255,255,255,0.06);
--mk-border-strong: rgba(255,255,255,0.12);

--mk-accent:        #58a6ff;   /* 沿用现有蓝色 — 活动 tab 顶边、链接、focus ring */
--mk-accent-soft:   rgba(88,166,255,0.18);
--mk-highlight:     #fcd34d;   /* 搜索 / mark 高亮背景 */
--mk-highlight-fg:  #1f1300;

--mk-danger:        #ef4444;
--mk-success:       #34d399;
```

浅色对应：`--mk-bg-app: #ffffff`, `--mk-bg-sidebar: #f7f7f5`, `--mk-fg-default: #2e2e2e`, `--mk-accent: #0969da`（沿用现有），其余按 luminance 翻转。

> **迁移**：现有的 `--markup-bg / --markup-fg / --markup-muted / --markup-border / --markup-accent` 保留为 alias，新代码用 `--mk-*`。详见 §8。

### 3.2 字体

```css
--mk-font-ui:   -apple-system, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", Inter, system-ui, sans-serif;
--mk-font-prose: "SF Pro Text", "Source Han Serif", "PingFang SC", Georgia, serif;  /* 可在 Settings 切回 sans */
--mk-font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
```

字号阶梯（UI 层）：11 / 12 / 13 / 14。正文（prose）：默认 16，可在 Settings 调到 14 / 18 / 20。

### 3.3 间距 & 圆角

8 倍数 + 4 半阶：`--mk-sp-1: 4px; --mk-sp-2: 8px; --mk-sp-3: 12px; --mk-sp-4: 16px; --mk-sp-6: 24px; --mk-sp-8: 32px`。
圆角：`--mk-radius-sm: 4px`（icon 按钮、tag）/ `--mk-radius-md: 6px`（卡片、对话框）/ `--mk-radius-lg: 10px`（modal）。

### 3.4 图标

- 风格统一为 **Lucide line icons**（已普遍用于 Obsidian / Tauri 生态），1.5px stroke，20×20
- 活动栏图标 idle 用 `--mk-fg-muted`，hover/active 用 `--mk-fg-strong`，active 加 2px 左侧高亮条
- 所有点击区最小 28×28，符合 macOS HIG

---

## 4. 信息架构 & 布局规范

```
┌────────────────────────────────────────────────────────────────┐
│  Title bar (drag region · 36px)                                │  ← 含 traffic lights、tab 横向滚动、右上 utility icons
├──┬───────────────┬─────────────────────────────┬───────────────┤
│  │ Sidebar tools │ Tab bar (32px)              │ Right rail    │
│R │  ─────────────│─────────────────────────────│ tools         │
│i │               │ Breadcrumb (24px)           │ ─────────────│
│b │  File tree    │                             │ Linked        │
│b │  (vertical    │  Main content               │ mentions      │
│o │   scroll)     │  (reader-first)             │  (vertical    │
│n │               │                             │   scroll)     │
│  │               │                             │               │
│44│               │                             │               │
│  ├───────────────┤                             │               │
│  │ Vault footer  │                             │               │
├──┴───────────────┴─────────────────────────────┴───────────────┤
│  Status bar (22px · word count · cursor · sync · theme)        │
└────────────────────────────────────────────────────────────────┘
```

- **Ribbon**（44px，固定）：8 个一级动作图标 — File / Search / Bookmark / Graph / Canvas / Tags / Outline（折叠态）/ Settings（底部）
- **Sidebar**（默认 260px，可拖拽 200–420）：文件树 + 顶部 4 个文件操作 + 底部 vault meta
- **Main**：自适应；最小 480px；正文最大宽度 `--mk-prose-width: 760px` 居中
- **Right rail**（默认 300px，可折叠）：反向链接 / Outline / Properties 三选一 tab
- **Status bar**：22px，单行，靠右是 mode pill（READ / EDIT / SOURCE）+ 主题切换

折叠规则：
- 窗口 < 1100px：右栏自动折叠为 icon-only
- 窗口 < 820px：左侧 Sidebar 也折叠，仅留 Ribbon

---

## 5. 组件清单

| 组件 | 现有文件 | 改造方向 |
|---|---|---|
| Activity Ribbon | *新增* | 新组件 `src/components/Ribbon.tsx`，纯展示 + 派发 store action |
| File Tree | `FileTree.tsx` | 颜色 / hover / 缩进线对齐新 token，chevron 用 Lucide |
| Tab Bar | `TabBar.tsx` | 活动 tab 加 2px 顶部 accent 边、悬浮显 close X、+ 按钮右移 |
| Breadcrumb | *新增* | 新组件 `src/components/Breadcrumb.tsx`，从 active file path 推导 |
| Editor (read) | `Editor.tsx` | 增加 read-only 渲染分支；保留 Milkdown 仅在 Edit 模式实例化 |
| Toolbar | `Toolbar.tsx` | 缩为 icon-only floating，移到正文右上角 |
| Backlinks | `BacklinksPanel.tsx` | 右栏 tab 化（Linked / Unlinked），加 count badge |
| Outline | `Outline.tsx` | 右栏 tab 之一，与 Backlinks 切换 |
| Status Bar | `StatusBar.tsx` | 重排：左 word/char/cursor，中 toast slot，右 mode/theme |
| Settings | `SettingsDialog.tsx` | 加 "Appearance" 分组，theme + prose font + prose width |
| Command Palette | `CommandPalette.tsx` | 视觉对齐新 token；行为不动 |

---

## 6. 模式与交互

### 6.1 三态切换
```
Read  ──E──>  Edit  ──⌘/──>  Source
  ^                            │
  └────────────Esc─────────────┘
```

- 默认 **Read**：HTML 渲染（沿用 Milkdown 的 read-only 实例或直接 `marked` + 自定义 CSS）
- `E` / 点 ✎ → **Edit**：Milkdown WYSIWYG
- `⌘/` → **Source**：CodeMirror
- 任意状态 `Esc` 回到 Read

### 6.2 关键键位

| Key | Action |
|---|---|
| `⌘P` | Quick Open |
| `⌘⇧P` | Command Palette |
| `⌘⇧F` | Vault 全文搜索 |
| `⌘F` | 本文搜索 |
| `⌘B` | 切换左 sidebar |
| `⌘⌥B` | 切换右 sidebar |
| `⌘⌥O` | Outline 右栏 |
| `E` | 进入 Edit 模式 |
| `⌘/` | 切换 Source 模式 |
| `Esc` | 回到 Read |
| `⌘⇧S` | Save As |

### 6.3 反向链接面板

- 顶部 segmented control：`Linked (N)` / `Unlinked (N)` / `Outline`
- 每条反链卡片：来源文件名（粗体）→ 段落 snippet（高亮匹配关键字）→ 点击跳转
- 折叠记忆每文件状态（localStorage）

---

## 7. 排版（正文 HTML）

正文是 Markup 的核心展示面，规范如下：

- 最大宽度 `--mk-prose-width: 760px`，居中，左右 padding 8%
- 字号默认 16px，行高 1.7，段间距 1em
- H1: 1.85em, weight 700, 上 margin 0；H2: 1.5em, 上 margin 1.6em + 1px 底边；H3: 1.25em
- 行内代码：`--mk-bg-elevated` 底，2px padding，圆角 3px，等宽字体 0.92em
- 代码块：圆角 6px，左侧 3px accent 条（按 language），上方右侧"Copy"按钮
- 表格：斑马纹底（5% white）、边框 hairline、表头粘性
- 引用块：4px accent 左边、`--mk-fg-muted` 文字
- Wikilink：当前已有 `.wikilink` 样式 — 对齐 `--mk-accent-soft` 底色
- Tag：`#tag` 圆角 chip，`--mk-bg-elevated` 底
- KaTeX / Mermaid：占整行，居中，可点放大

---

## 8. 迁移计划

按"低风险、可独立 merge"原则切分。每个 milestone 一个 PR。

### M0 · Tokens 落地（0.5d）
- 在 `index.css` 新增 `--mk-*` 变量、保留 `--markup-*` alias
- 不改任何组件
- 验收：`pnpm tsc --noEmit && pnpm test` 全绿

### M1 · Ribbon + 新 Sidebar chrome（1.5d）
- 新增 `Ribbon.tsx`，从 Toolbar 拆出导航类按钮
- `FileTree.tsx` 套新 token，hover/selected 样式对齐
- 验收：截图对比原型 §Activity ribbon 区域

### M2 · Tab + Breadcrumb（1d）
- `TabBar.tsx` accent 顶边 + close hover
- 新增 `Breadcrumb.tsx`
- 验收：键盘 Ctrl+Tab 行为不变

### M3 · Right rail 重组（1.5d）
- `BacklinksPanel.tsx` + `Outline.tsx` 合并为 `RightRail.tsx` 带 segmented control
- 折叠 / 拖拽宽度持久化
- 验收：现有 `BacklinksPanel.test.tsx` / `Outline.test.tsx` 通过

### M4 · Read mode 默认化（2d）★ 重定位关键
- 新增 `ReaderView.tsx`，基于 `marked` + 自定义 CSS（不上 Milkdown）
- `store.ts` 加 `viewMode: 'read' | 'edit' | 'source'`，默认 'read'
- `E` 进入 Edit，复用现有 Milkdown 路径
- Welcome 文案 / Onboarding 围绕"看 MD"重写
- 验收：冷启动到首字符渲染 < 200ms（vs Milkdown 实例化 ~500ms）

### M5 · Status bar + Settings appearance（1d）
- StatusBar 重排
- Settings 新增 Appearance 分组（theme / prose font / prose width / line height）
- 验收：所有设置持久化、即时生效

### M6 · Polish（1d）
- 全量 dark / light 截图对照
- Sepia 主题转 token 后保留
- 更新 README 截图与 tagline

**总工期估算：8.5 工日**，可由单人在 2 周内交付。

---

## 9. 风险与取舍

| 风险 | 缓解 |
|---|---|
| Read mode 用 `marked` 与 Milkdown 渲染不一致 | 共用一份 KaTeX / Mermaid / Shiki 配置；在 ReaderView 写一组对比快照测试 |
| 默认 Read 让重度编辑用户感觉退步 | Settings 加 "Default mode: Read / Edit"，老用户可切回 |
| 视觉抄得太像 Obsidian 引发争议 | 保留 Markup 自有蓝色 accent (`#58a6ff` / `#0969da`)，与 Obsidian 紫形成识别差异；文档明确"布局同源、配色独立" |
| `--markup-*` → `--mk-*` 双轨过渡期 | M0 保留 alias，M6 才删除旧变量 |
| Tauri webview 字体回退在不同 macOS 版本不一致 | 在 index.css 固定 fallback 链，CI 加 visual regression（M6 之后） |

---

## 10. 验收标准

- [ ] 默认启动进入 Read 模式，首屏可阅读
- [ ] Ribbon / Sidebar / Tab / Right rail / Status bar 全部使用 `--mk-*` token
- [ ] 深色 + 浅色 主题都能在原型 §3 的色板验证下通过对齐检查
- [ ] `pnpm test` / `pnpm test:rust` 全部通过
- [ ] README 截图、tagline、产品描述同步更新
- [ ] Settings 提供 "Default mode" / "Theme" / "Prose font" / "Prose width" 四项
- [ ] 键位表（§6.2）全部生效，与 Command Palette 一致

---

## 附录 A · 与现有 ADR 的关系

- 与 [ADR-001 Tech stack](../decisions/ADR-001-tech-stack.md) 兼容：不引入新依赖（`marked` 已在 `package.json`）
- 不影响 [ADR-002 Distribution](../decisions/ADR-002-distribution.md)：签名 / 公证流程无变动
- 与 [03-roadmap](./03-roadmap.md) 中 V1.0 polish 阶段对齐，可并入

## 附录 B · 参考

- 高保真原型：[`mockup-obsidian-redesign.html`](./mockup-obsidian-redesign.html)
- Obsidian 截图（用户提供，本计划主要视觉参考）
- Lucide Icons：https://lucide.dev/
