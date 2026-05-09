# Markup

> 高性能 macOS Markdown 编辑器 — Typora 风格的开源克隆。

设计与决策见 [docs/README.md](./docs/README.md)。

## 技术栈

- **Tauri 2** (Rust + WKWebView shell)
- **Milkdown** / ProseMirror (WYSIWYG editor)
- **React + Tailwind**
- 后端：comrak、Tantivy、notify
- 渲染：Shiki、KaTeX、Mermaid

## 开发环境要求

- macOS 12+
- Xcode Command Line Tools (`xcode-select --install`)
- Node 18+ + pnpm 8+
- Rust 1.77+ via [rustup](https://rustup.rs)

确认环境：

```bash
. "$HOME/.cargo/env"  # 把 ~/.cargo/bin 加进 PATH
pnpm tauri info
```

应该看到 rustup ✓ / rustc 1.95+ / Tauri 2.x。

## 启动

```bash
. "$HOME/.cargo/env"
pnpm install        # 首次
pnpm tauri:dev      # 启动开发窗口（首次会编译几分钟）
```

## 打包

```bash
. "$HOME/.cargo/env"
pnpm tauri:build    # → src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/
```

打包目标固定 `x86_64-apple-darwin`（开发机为 Intel Mac）。

## 测试性能（spike 0.2 后启用）

```bash
python3 scripts/gen-test-doc.py 5 test-fixtures/big.md
```

会生成一份 5MB 的合成 markdown，含混合内容（段落、列表、表格、代码、数学、Mermaid）。

## 项目结构

```
markup/
├── docs/              # 设计文档、ADR、调研、spike 记录
├── scripts/           # 工具脚本（图标生成、测试文件生成）
├── src/               # React 前端
│   ├── components/    # Editor、Toolbar
│   ├── lib/           # 类型化 invoke 包装
│   └── store.ts       # Zustand store
├── src-tauri/         # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands.rs   # IPC commands
│   │   └── error.rs
│   ├── capabilities/  # Tauri 2 权限模型
│   ├── icons/         # 应用图标
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 状态

**M0 阶段（spike 验证）**。当前 spike 0.1 在跑。
跟进：[docs/research/05-spike-results.md](./docs/research/05-spike-results.md)。

## License

私人项目，license 待定（候选：MIT 或 Apache-2.0）。
