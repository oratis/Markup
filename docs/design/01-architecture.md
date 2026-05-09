# 系统架构

## 总览图

```
┌─────────────────────────────────────────────────────────────┐
│                    markup.app (macOS)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Tauri Shell (Rust binary)                │   │
│  │                                                      │   │
│  │  ┌──────────────┐    ┌────────────────────────┐    │   │
│  │  │ Main Process │    │  Background Workers    │    │   │
│  │  │              │    │                        │    │   │
│  │  │  Commands ───┼─▶  │  • Indexer (Tantivy)  │    │   │
│  │  │  Events  ◀───┼──  │  • FS Watcher (notify)│    │   │
│  │  │  IPC bridge  │    │  • Markdown→HTML       │    │   │
│  │  │              │    │    (comrak, 导出用)   │    │   │
│  │  └──────┬───────┘    └────────────────────────┘    │   │
│  │         │                                            │   │
│  │         │ wry / WKWebView IPC                       │   │
│  │  ┌──────▼──────────────────────────────────────┐   │   │
│  │  │           WebView (WKWebView)                │   │   │
│  │  │                                              │   │   │
│  │  │  React + Tailwind                            │   │   │
│  │  │  ├─ App Shell (sidebar, tabs, statusbar)    │   │   │
│  │  │  ├─ Editor Pane                             │   │   │
│  │  │  │  ├─ Milkdown (ProseMirror)              │   │   │
│  │  │  │  │   • Math (KaTeX)                      │   │   │
│  │  │  │  │   • Code (Shiki)                      │   │   │
│  │  │  │  │   • Mermaid                           │   │   │
│  │  │  │  └─ CodeMirror 6 (源码模式 / 大文件)    │   │   │
│  │  │  ├─ FileTree                                │   │   │
│  │  │  ├─ Outline                                 │   │   │
│  │  │  └─ Search                                  │   │   │
│  │  │                                              │   │   │
│  │  │  Web Worker: 解析 / 索引查询响应处理         │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              文件系统：用户选择的 vault 目录
              (~/Documents/Notes 等)
              + ~/Library/Application Support/markup/
                (索引、最近文件、设置、缓存)
```

## 进程 / 线程模型

| 角色 | 语言 | 职责 |
|------|------|------|
| **Main process (Tauri)** | Rust | 窗口管理、菜单、IPC 入口、生命周期 |
| **Indexer worker** | Rust（tokio task） | Tantivy 索引构建/更新；不阻塞主进程 |
| **FS watcher worker** | Rust（tokio task） | notify 监听 vault；diff → 索引更新 |
| **WebView main** | TS / React | UI 渲染、ProseMirror 状态、用户交互 |
| **Web Worker** | TS | Markdown 增量解析（备用）、长任务搬迁 |

通信总线：`tauri::Channel` + `emit/listen` 事件。

## 关键数据流

### 1. 打开文件
```
UI: 用户点文件树
  → invoke("read_file", {path})
  → Rust: tokio::fs::read_to_string
  → 返回 (content, mtime)
  → UI: Milkdown.replaceWithMarkdown(content)
  → 渲染（< 500ms 目标，5MB 内）
```

### 2. 编辑保存
```
ProseMirror 事务
  → debounce(300ms)
  → 序列化为 markdown 字符串（remark-stringify）
  → invoke("write_file", {path, content, expected_mtime})
  → Rust: 比较 mtime 防覆盖、原子写（write to .tmp + rename）
  → 成功事件 → UI 状态栏
```

### 3. 搜索
```
UI: 输入框 keystroke
  → debounce(80ms)
  → invoke("search", {query, limit: 50})
  → Rust: Tantivy 查询
  → 返回 [{path, snippet, score}]
  → UI: 列表 + 高亮
```

### 4. FS 变更
```
notify (FSEvents) 触发
  → Rust: 判断是 .md 文件
  → 增量重索引 (单文件)
  → emit("file_changed", {path})
  → UI: 如果当前打开的就是这个文件 → 提示 reload
```

## 数据存储

### 用户文件
- 任何 `.md` / `.markdown` / `.mdx` 文件，**不动用户原文**
- 不写隐藏元数据到用户目录（不像 Obsidian 那样在 vault 里塞 `.obsidian/`）

### 应用数据：`~/Library/Application Support/markup/`

```
markup/
├── settings.json           # 全局偏好
├── recent.json             # 最近打开的文件 / vault
├── index/
│   ├── tantivy/            # Tantivy 索引文件
│   └── meta.json           # 索引版本号、上次同步 mtime
├── themes/                 # 用户自定义主题
└── cache/
    └── images/             # 网络图片缓存（如有）
```

## 安全 / 权限

- **Hardened Runtime**：开
- **Sandbox**：MVP 不开（用户授权任意路径访问）
- **CSP**：`default-src 'self' tauri:; script-src 'self' 'wasm-unsafe-eval'`
- **远程 URL 白名单**：默认不加载远程脚本；图片加载走 Tauri custom protocol（避免暴露 file://）

## 可扩展性预留

| 未来能力 | 现在要预留的接口 |
|----------|------------------|
| 双向链接 / 图谱 | 解析时已经在 AST 抽 `[[wikilink]]`；存元数据表 |
| 插件系统 | Milkdown 插件 API + Tauri 命令钩子；MVP 内置 |
| 多窗口 / 多 vault | Tauri 多 window 已支持；UI 层加 vault 切换器 |
| 协作编辑 | ProseMirror 原生支持 Yjs；预留 `doc.id` |
| 导出多格式 | `comrak` AST → 各 renderer；接入 pandoc 子进程作为兜底 |

## 关键模块边界

```
src/
  app/                  # React 顶层（路由、布局）
  features/
    editor/             # Milkdown 集成、自定义 plugin
    fileTree/           # 文件树
    search/             # 搜索 UI
    outline/            # 大纲
    preview/            # 导出预览
  lib/
    tauri/              # invoke 包装、类型化命令
    markdown/           # 解析工具、AST 操作
    theme/              # 主题切换
  styles/
src-tauri/
  src/
    commands/           # 每个 IPC 命令一个文件
    fs/                 # 文件读写、原子写、watcher
    index/              # Tantivy 包装
    main.rs
  Cargo.toml
  tauri.conf.json
```

## 测试策略

| 层 | 工具 | 范围 |
|----|------|------|
| Rust 单元测试 | `cargo test` | fs、index、commands |
| 前端单元测试 | Vitest | markdown 解析、状态机 |
| 编辑器集成 | Playwright（headed） | Milkdown 真实键盘交互 |
| 端到端 | `tauri test`（V2 提供） | 启动 → 打开 → 编辑 → 保存 |
| 性能基准 | Criterion (Rust) + 自写 JS bench | 解析速度、索引时间、输入延迟 |

## 观测

MVP 阶段不接遥测。本地写 `~/Library/Logs/markup/markup.log`（rotating），方便用户报 bug 时贴日志。
