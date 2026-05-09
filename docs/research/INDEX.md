# 调研报告索引

四份并行调研，覆盖 Typora 本身、可借用开源生态、桌面框架、性能策略。**结论高度一致**：Tauri 2 + Milkdown(ProseMirror) + Rust comrak + Tantivy。

| # | 报告 | 范围 | 关键结论 |
|---|------|------|----------|
| 01 | [Typora 功能与架构](./01-typora-analysis.md) | Typora 1.x 全部功能、技术栈推断、用户口碑 | Electron + 自研渲染管线；用户痛点是大文件性能 |
| 02 | [开源库与生态](./02-opensource-libraries.md) | 同类应用、编辑器内核、解析器、桌面框架 | 无可直接 fork 的项目；Milkdown 是唯一活跃的 Typora 风格 WYSIWYG 框架 |
| 03 | [Mac 框架对比](./03-mac-framework-comparison.md) | Tauri / Electron / SwiftUI / RN macOS 四方案 | Tauri 2 全面胜出；Expo 已劝退；签名走 Developer ID + notarytool |
| 04 | [性能策略](./04-performance-strategies.md) | 大文件、增量解析、搜索、启动、内存 | 每条性能目标在 Tauri 路线下都能达到；Electron 仅在内存这一项无法达标 |

## 共识技术栈

```
┌─────────────────────────────────────────────┐
│  Shell: Tauri 2 (Rust)                      │
│  ├─ FS / Watch / Index: Rust + notify       │
│  ├─ Search: Tantivy                         │
│  ├─ Markdown 后端解析（导出）: comrak       │
│  └─ IPC: Tauri commands + events            │
├─────────────────────────────────────────────┤
│  WebView: WKWebView (macOS)                 │
│  ├─ 编辑器内核: Milkdown / ProseMirror      │
│  ├─ 源码模式: CodeMirror 6                  │
│  ├─ 解析（编辑时）: Remark                  │
│  ├─ 代码高亮: Shiki                         │
│  ├─ 数学: KaTeX                             │
│  ├─ 图表: Mermaid                           │
│  └─ UI 框架: React 或 SolidJS（待定）       │
└─────────────────────────────────────────────┘
```

## 关键性能目标（来自报告 04）

| 目标 | 数值 | Tauri 可达？ |
|------|------|--------------|
| 冷启动 | < 1.5s | ✅ ~300–500ms |
| 打开 5MB 文档 | < 500ms | ✅ |
| 输入延迟 | < 16ms | ✅ |
| 1 万文件 vault 索引 | < 5s | ✅ Tantivy |
| 常驻内存 | < 300MB | ✅ ~30–50MB baseline |

## 后续决策入口

- 技术栈整合: [decisions/ADR-001-tech-stack.md](../decisions/ADR-001-tech-stack.md)
- 分发与签名: [decisions/ADR-002-distribution.md](../decisions/ADR-002-distribution.md)
- 系统架构: [design/01-architecture.md](../design/01-architecture.md)
- MVP 范围: [design/02-mvp-features.md](../design/02-mvp-features.md)
- 路线图: [design/03-roadmap.md](../design/03-roadmap.md)
