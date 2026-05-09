# Markup 设计文档

复刻 Typora 的高性能 macOS Markdown 编辑器。

## 阅读顺序

1. [项目总览](./design/00-project-overview.md) — 一句话定位、目标、Non-Goals
2. [调研索引](./research/INDEX.md) — 4 份并行调研报告
3. [ADR-001 技术栈](./decisions/ADR-001-tech-stack.md) — 选型与拒绝的选项
4. [ADR-002 分发签名](./decisions/ADR-002-distribution.md) — Developer ID + 公证
5. [系统架构](./design/01-architecture.md)
6. [MVP 功能清单](./design/02-mvp-features.md)
7. [路线图](./design/03-roadmap.md)

## 目录结构

```
docs/
├── README.md             # 本文件
├── research/             # 调研报告（事实 / 数据 / 来源）
│   ├── INDEX.md
│   ├── 01-typora-analysis.md
│   ├── 02-opensource-libraries.md
│   ├── 03-mac-framework-comparison.md
│   └── 04-performance-strategies.md
├── decisions/            # ADR（架构决策记录）
│   ├── ADR-001-tech-stack.md
│   └── ADR-002-distribution.md
└── design/               # 设计与规划
    ├── 00-project-overview.md
    ├── 01-architecture.md
    ├── 02-mvp-features.md
    └── 03-roadmap.md
```

## TL;DR 技术选型

**Tauri 2 + Milkdown(ProseMirror) + React + Rust comrak/Tantivy + Shiki/KaTeX/Mermaid**

理由：四份独立调研指向同一个组合，是同时满足 (a) Typora 风格 WYSIWYG、(b) macOS 原生体感、(c) <300MB 内存的高性能基线、(d) 友好的 license 这四个约束的唯一组合。

不用 Electron：内存目标无法达到。
不用 Expo / React Native：不是桌面方案。
不用纯 SwiftUI（一阶段）：开发速度太慢，留作 V2 重写选项。
