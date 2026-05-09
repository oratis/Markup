# M0 Spike 结果（进行中）

四个 spike 的验证状态。每个 spike 的"通过/失败/数字"实测在这里登记。

## Spike 0.1 — Tauri 2 + Milkdown 启动 🟡 进行中

**目的**：验证选型可行——一个能渲染 markdown、可输入的窗口跑起来。

### 已完成步骤

| 步骤 | 状态 | 备注 |
|------|------|------|
| Rust toolchain（rustup + stable 1.95） | ✅ | 用 `~/.cargo/env` 替代了 brew 的 1.71；Bash 工具调用前需要 `. ~/.cargo/env` 显式 source |
| Node 22 / pnpm 10 | ✅ | 系统已具备 |
| Xcode CLI Tools | ✅ | 全 Xcode 未装，dev mode 不需要；后续 release 公证可能要装 |
| 项目骨架（Tauri + React + Vite + Tailwind） | ✅ | `package.json`、`tauri.conf.json`、capabilities 等就位 |
| 依赖安装（pnpm install） | ✅ | 51.6s；557 个包 |
| 占位图标（PNG + ICNS） | ✅ | 实色蓝方块占位，正式发布前替换 |
| Tauri 配置校验（pnpm tauri info） | ✅ | tauri 2.11、@tauri-apps/cli 2.11.1、所有插件版本一致 |
| **首次 `pnpm tauri dev`** | 🟡 编译中 | 首次 Rust 全量编译预计 5–10 min |
| 窗口启动、welcome 文档可见 | ⏸ 待跑 | |
| 真实 .md 打开 → 编辑 → 保存回写 | ⏸ 待跑 | |
| KaTeX 数学渲染 | ⏸ 待跑 | |
| Mermaid 图表渲染 | ⏸ 待跑 | |

### 已知警告 / 需后续跟进

- `@milkdown/plugin-math@7.5.9` 与 `@milkdown/plugin-diagram@7.7.0` 在 Milkdown 7.20 时代被标 deprecated。它们仍可用，但官方推荐路径是 `@milkdown/kit/plugin/math` 和 `@milkdown/kit/plugin/diagram`（kit 把所有插件统一暴露）。**Spike 通过后，第一项重构任务是迁移到 kit 路径**。
- `@prosemirror-adapter/react@0.2.6` 有 `0.5.3` 可用 —— 等 Milkdown 7 react 适配支持后再升。
- Tauri lint 自动移除了 `macos-private-api` feature（我之前默认加了它）。它只在透明 / 振动效果窗口时才需要，移除是对的。

### 验收脚本（编译完成后逐项跑）

1. **窗口启动**：可见原生 macOS 窗口标题为 "Markup"，1100×720；标题栏自定义（无原生 chrome）。
2. **Welcome 文档渲染**：H1 / H2 / H3、加粗、斜体、列表、引用块、代码块、内联 code 都正确渲染。
3. **数学（KaTeX）**：行内 $a^2+b^2=c^2$ 与块级 ∫ 公式渲染为公式样式（不是源码）。
4. **图表（Mermaid）**：流程图块渲染为可视化图（不是源码）。
5. **WYSIWYG 编辑**：在 H1 后回车，输入内容；在段落里加粗/斜体；新增列表项；正常生效。
6. **打开真实文件**：⌘O → 选一个本地 .md → 内容显示在编辑器，标题栏更新文件名。
7. **保存回写**：编辑文件，等 300ms，状态栏从 "Unsaved changes" 变 "Saving…" 再变 "Saved"；外部读取确认改动写入。
8. **mtime 防覆盖**：（手动）外部修改文件后再保存，应该报 stale mtime。

### 性能基线 — 暂未测量

待 Spike 0.2 用大文件专项测试。

---

## Spike 0.2 — 大文件性能 ⏸ 未开始

**目的**：5MB 文档打开 < 500ms、输入延迟 < 16ms（含数学 / Mermaid 块）。

预备测试材料：
- 生成 ~5MB 长 markdown（混合代码块、表格、若干数学公式、若干 Mermaid 图）
- 用 Performance API 测 `editor.create()` → `view.dispatch` 完成的端到端时间
- 输入延迟：在中段连续打字，记录 InputEvent → 下一帧 paint 的延迟分布

---

## Spike 0.3 — Tantivy + notify ⏸ 未开始

**目的**：1 万 .md 文件 vault 索引 < 5s、FS 改动 → 增量索引 < 100ms。

后续会开一个独立的 Cargo crate 在 `src-tauri/src/index/` 下做。

---

## Spike 0.4 — 签名 + 公证 ⏸ 未开始

**目的**：用 Developer ID Application 签名 + notarytool 公证一个空壳 release build，验证全流程通。

依赖：
- 用户 Apple Developer Program 状态确认（已 ✅）
- 在 https://appleid.apple.com 生成 app-specific password
- 在 https://developer.apple.com/account 生成 / 下载 Developer ID Application 证书
- `xcrun notarytool store-credentials` 存到 keychain

放到 M0 末期跑。
