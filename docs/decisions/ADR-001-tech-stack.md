# ADR-001: 技术栈选型

- **状态**: 已批准（2026-05-10）
- **日期**: 2026-05-10
- **决策者**: 项目所有者 + 调研代理
- **依据**: [research/01](../research/01-typora-analysis.md)、[research/02](../research/02-opensource-libraries.md)、[research/03](../research/03-mac-framework-comparison.md)、[research/04](../research/04-performance-strategies.md)

## 上下文

复刻 Typora 风格的 Markdown 编辑器（取名 markup），首要约束：

1. **Mac 自用**，Apple Developer 账号已具备
2. **高性能 MD 查看与管理**——大文件不卡、启动快、内存克制、vault 索引秒级
3. 用户提到可用 Xcode 或 Expo

## 选项

| 维度 | A: Tauri 2 | B: Electron | C: SwiftUI 原生 | D: Expo / RN macOS |
|------|------------|-------------|-----------------|---------------------|
| 安装包 | ~12MB | ~180MB | ~5MB | ~80MB |
| 内存基线 | 30–50MB | 200–300MB | 20–30MB | 150MB+ |
| 冷启动 | 300–500ms | 1–2s | <300ms | 1s+ |
| WYSIWYG 内核生态 | ✅ Milkdown 直接复用 | ✅ Milkdown 直接复用 | ⚠️ 需嵌 WKWebView 跑 Milkdown | ⚠️ RN 不适合复杂富文本 |
| Mac 集成成熟度 | 🟡 进步中（v2） | ✅ 最成熟 | ✅ 完全原生 | ❌ 二等公民 |
| 开发速度（MVP） | 中 | 快 | 慢 | 慢 |
| 与"高性能"的契合度 | ✅ | ❌ 内存项不达标 | ✅ | ⚠️ |
| 学习曲线 | 中（需 Rust 基础） | 低 | 高 | 中 |
| 是 Mac 桌面框架？ | ✅ | ✅ | ✅ | ❌（Expo 是移动端工具链） |

## 决策

### 桌面外壳：Tauri 2.x（Rust + WKWebView）

**理由**：
- 唯一同时满足"<300MB 内存"与"Milkdown 生态可复用"两个约束的方案
- 安装包小一个数量级，启动快 4×，符合"非常高性能"的字面承诺
- macOS 自带 WKWebView，无需打包 Chromium，与 Apple 平台原生气质一致
- Rust 后端可以原生跑 comrak / Tantivy / notify，不必把 IO/索引塞进 JS 线程

**已知坑（来自报告 03）**：
- WKWebView 60fps 锁、文本选中卡顿（issue #11822）→ 用 GPU compositing 缓解
- production sandbox 网络拦截（#13878）→ MVP 不开 Sandbox（自用即可）
- Markdown 编辑器赛道缺少 Tauri 明星案例 → 我们做第一个

### 编辑器内核：Milkdown（ProseMirror + Remark）

- 11.4k stars / MIT / 2026-03 仍活跃
- 唯一明确"受 Typora 启发"的 WYSIWYG 框架
- 插件化架构，math/mermaid/code-block 都有官方插件
- ProseMirror 文档模型即真相源，编辑→AST→渲染零延迟

**备选**：原始 ProseMirror。如果 Milkdown 的插件 API 限制太多，下沉到裸 ProseMirror。

### 源码模式：CodeMirror 6

- 内置虚拟视口，处理百万行级文档
- 当文件超过 5MB 时回退到纯 CM6 模式（参考 VSCode 的策略，见报告 04）

### 后端解析（导出 / 索引）：comrak（Rust）

- 比 markdown-it 快 2–3×
- GFM 完整支持（表格、任务列表、删除线、URL 自动识别）
- 给前端编辑器留 Remark（与 Milkdown 已绑定），不强求统一解析器

### 全文搜索：Tantivy（Rust）

- Tauri 生态原生
- 1 万文件索引 1–5 秒，查询单位毫秒
- 索引持久化到 `~/Library/Application Support/markup/index/`，避免冷启重建

### 文件监听：notify crate

- 跨平台抽象，macOS 走 FSEvents
- 与 Tantivy 结合做增量索引

### 渲染插件
| 能力 | 选型 | 备注 |
|------|------|------|
| 代码高亮 | **Shiki** | 与 VSCode 同源，TextMate 语法 |
| 数学公式 | **KaTeX** | 比 MathJax 快 3–5×，Typora 用的是 MathJax，我们升级 |
| 图表 | **Mermaid** | 流程图 / 时序图 / 甘特 / 状态机 |
| Diff / Git | 后置 | M2 再考虑 |

### 前端 UI 框架：**SolidJS**（首选）/ React（兜底）

- SolidJS 编译期响应式，无 VDOM，bundle 小、运行时快，符合性能定位
- Milkdown 同时支持 SolidJS 和 React 适配器
- 如果团队对 React 更熟悉就用 React，重要的不是哪个，而是不是 Vue（Vue 在 Tauri Markdown 编辑器场景缺案例）
- **建议默认 React**——生态、AI 协作友好度、Milkdown 文档完备度都更好；性能差距对单文档应用可忽略

### 状态管理：Zustand（React）/ Solid Store（SolidJS）
### 样式：Tailwind CSS + CSS Variables（主题切换）
### 包管理：pnpm
### 构建：Vite

## 拒绝的选项

- **Electron**：内存目标不达标（报告 04 实测 200–300MB baseline），且与"高性能"叙事冲突
- **SwiftUI 原生（一阶段）**：开发速度太慢，会拖慢 MVP；保留为 V2 重写选项
- **Expo / React Native macOS**：Expo 不支持桌面应用，RN macOS 不适合富文本编辑器，已劝退

## 后果

### 正向
- 满足全部量化性能目标
- 单一二进制 ~15MB DMG，分发友好
- Rust 后端为后续"知识图谱、批量重命名、Git 集成"等管理类功能预留扩展空间

### 负向 / 风险
- 团队需要 Rust 基础（比纯 JS 多一门语言）→ MVP 阶段 Rust 代码量可控（< 1500 行）
- Tauri WKWebView 与 Chromium 行为有差异，需要早期跨视图测试
- Milkdown 在某些边缘情况（巨型表格、嵌套引用）可能需要打补丁

### 早期验证（spike）
ADR 通过后第一周需要做 4 个 spike，逐项关掉假设：
1. **Tauri 2 + Milkdown**：能否打开 5MB 真实笔记不掉帧
2. **Tantivy + notify**：1 万空文件 vault 的索引时间
3. **WKWebView IME**：中文输入是否流畅（Tauri 在 macOS 上 IME 历史上有过坑）
4. **签名 + 公证**：用 Developer ID 签一个空壳 Tauri app，跑通 notarytool

四个 spike 任一失败 → 重开 ADR。

## 用户确认结果（2026-05-10）

1. ☑ Tauri 2 + Milkdown 主路线 — 同意
2. ☑ 前端 — **React**
3. ☑ M0 spike 即包含数学（KaTeX）与 Mermaid 验证（不是推迟到 M2）
4. ☑ Bundle ID — `com.appkon.markup`
5. ☑ 构建 target — **`x86_64-apple-darwin`**（开发机为 Intel Mac），不构建 universal binary。如果未来需要 Apple Silicon 支持，再考虑 universal

> 备注：M0 spike 把数学/Mermaid 提前后，Spike 0.2（大文件性能）需要同时验证含数学/Mermaid 的 5MB 文档，难度上升。如果性能不达标，触发降级方案：渲染层走"块级懒渲染"——视口外的数学/Mermaid 块不计算。
