# Markup

> 高性能 macOS Markdown 编辑器 — Typora 风格的开源克隆。

[![CI](https://github.com/oratis/Markup/actions/workflows/ci.yml/badge.svg)](https://github.com/oratis/Markup/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/oratis/Markup?label=release)](https://github.com/oratis/Markup/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

设计与决策见 [docs/README.md](./docs/README.md)。

## 特性

**编辑**
- WYSIWYG（Milkdown / ProseMirror）↔ Source mode（CodeMirror 6），`⌘/` 切换
- Focus / Typewriter 模式，CSS 变量驱动主题
- KaTeX 数学公式、Mermaid 图表、Shiki 代码高亮、GFM 表格 / 任务列表

**文件管理**
- Vault（任意 Markdown 文件夹）+ 虚拟滚动文件树 + 右键 rename / Move to Trash
- 多 tab，Welcome 自动让位
- Quick Open（`⌘P` 模糊匹配）
- 全文搜索（`⌘⇧F`，Tantivy 索引）
- 文件监听 + 外部修改 reload 提示
- 自动保存（300ms debounce）+ 原子写入 + mtime 防覆盖

**心流**
- Outline 面板（`⌘⌥O`）
- Command Palette（`⌘⇧P`，~17 条命令）
- Wikilinks `[[file]]` 点击跳转
- Copy Link to Paragraph → `[[file#heading]]` 入剪贴板
- Find in File（`⌘F`）
- 三主题：Light / Dark / Sepia
- Settings 面板（字号 / 行宽 / 自动保存延迟 / 图片目录 / 语言）
- 中英文 UI（auto / en / zh）
- 图片粘贴自动入库（vault/assets/）
- Save As…（`⌘⇧S`）+ 导出 HTML / 打印 PDF

**性能**（Spike 0.3 实测）
- 10,000 文件 vault：扫描 15ms / 索引 1.09s / 搜索 2.4ms
- 主 chunk 356KB（gzipped 102KB），Mermaid / KaTeX / Milkdown / CodeMirror 各自独立 lazy chunk
- Idle RSS ~88MB（约为 Electron baseline 的 1/3）

## 截图

> 占位 — v1.0 公开发布前替换。
> 当前推荐看 https://github.com/oratis/Markup/releases/tag/v0.1.1。

## 安装

下载 [最新 release](https://github.com/oratis/Markup/releases/latest) 的 `Markup_*_x64.dmg`。

DMG 当前**未签名**（签名公证 pipeline 在 [scripts/sign-and-notarize.sh](./scripts/sign-and-notarize.sh)，需要 Apple Developer 凭据才能跑）。第一次打开时 macOS Gatekeeper 会拦截 — 在 **System Settings → Privacy & Security** 里点 "Open Anyway"。

## 开发

### 环境
- macOS 12+（开发 / 运行）
- [Node 18+](https://nodejs.org/) + pnpm 8+
- [Rust 1.77+](https://rustup.rs/)
- Xcode Command Line Tools (`xcode-select --install`)

```bash
git clone https://github.com/oratis/Markup
cd Markup
. "$HOME/.cargo/env"
pnpm install
pnpm tauri:dev
```

首次 `tauri dev` 会编译大量 Rust 依赖，5–10 分钟。

### 测试 / 验证

```bash
pnpm tsc --noEmit          # 类型检查
pnpm lint                  # Biome
pnpm test                  # Vitest（46 个 React 测试）
pnpm test:rust             # Cargo dev tests
pnpm bench:spike03         # 10k 文件 Tantivy 索引 benchmark
pnpm build                 # Vite 前端构建
pnpm tauri:build           # 完整 macOS bundle
```

### 出 Release

```bash
git tag -a vX.Y.Z -m "release notes"
git push origin vX.Y.Z
# Release workflow 自动跑 build + 上传 unsigned DMG + SHA256SUMS
```

签名版（需要 [docs/decisions/ADR-002](./docs/decisions/ADR-002-distribution.md) 描述的 keychain credentials）：

```bash
./scripts/sign-and-notarize.sh
```

## 技术栈

```
┌─ Tauri 2 (Rust) ──────────────────────────────┐
│   commands  · vault scanner · notify watcher  │
│   Tantivy index · comrak · tokio              │
└────────────────────────────────────────────────┘
                  │ IPC
┌─ React + Vite ────────────────────────────────┐
│   Milkdown WYSIWYG · CodeMirror 6 source mode │
│   Zustand store · Tailwind                    │
│   Mermaid · KaTeX · Shiki                     │
└────────────────────────────────────────────────┘
```

完整说明：[docs/decisions/ADR-001-tech-stack.md](./docs/decisions/ADR-001-tech-stack.md)

## 仓库结构

```
Markup/
├── docs/                # 调研报告、ADR、设计文档、状态文档
├── scripts/             # 占位图标生成、测试 fixture、签名脚本
├── src/                 # React 前端
│   ├── components/      # 30+ 组件
│   ├── lib/             # i18n / wikilink / fuzzy / tauri 包装 / 等
│   └── store.ts         # Zustand 全局状态
├── src-tauri/           # Rust 后端
│   ├── src/             # commands · vault · index · scanner · watcher
│   └── tests/           # Spike 0.3 benchmark
├── .github/
│   ├── workflows/       # ci.yml + release.yml
│   ├── ISSUE_TEMPLATE/  # bug + feature + config
│   └── PULL_REQUEST_TEMPLATE.md
└── README.md
```

## 路线图

详见 [docs/STATUS.md](./docs/STATUS.md) 和 [docs/design/03-roadmap.md](./docs/design/03-roadmap.md)。当前位置：M2 polish 完成，向 V1.0 推进。

## License

[MIT](./LICENSE) © 2026 Oratis

由 Claude Code 协助开发。
