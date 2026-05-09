# 路线图

按 milestone 组织，每个 milestone 有明确退出条件。**不锁定日历日期**——这是个人项目，按精力推进。

## M0：风险关闭（4 个 spike，估 1 周）

**目的**：在写第一行业务代码前，关掉 ADR-001 列出的所有技术假设。每个 spike 失败都触发 ADR 重开。

| Spike | 验证什么 | 通过条件 | 文件位置 |
|-------|----------|----------|----------|
| **0.1 Tauri+Milkdown 启动** | 选型可行 | 一个能渲染 markdown、可输入的窗口跑起来 | `spikes/00-skeleton/` |
| **0.2 大文件性能** | Milkdown 在 5MB 下不死 | 打开 5MB 真实笔记 < 500ms，输入延迟 < 16ms | `spikes/01-big-doc/` |
| **0.3 Tantivy + notify** | 索引方案可行 | 1 万空 .md 文件索引 < 5s，FS 改动后增量更新 < 100ms | `spikes/02-indexer/` |
| **0.4 签名 + 公证** | 分发链条通 | 空壳 app 用 Developer ID 签 + notarytool 通过 | `spikes/03-signing/` |

**退出条件**：4 个 spike 都通过 + 性能数据写入 `docs/research/05-spike-results.md`。

**如果失败**：
- 0.2 失败：放弃 Milkdown，下沉到 ProseMirror 自写或考虑 Lexical
- 0.3 失败：考虑 SQLite FTS5 替代 Tantivy
- 0.4 失败：检查 Apple Developer Program 状态，必要时回到 ad-hoc 签名（仅自用）

## M1：可写可读（估 4–6 周）

**目的**：能用 markup 替代 Typora 写笔记。所有 P0 完成。

### 功能闭环
1. 单文件打开 / 编辑 / 保存
2. Vault 打开 + 文件树
3. 多 tab
4. WYSIWYG + Source Mode 切换
5. 完整 GFM
6. 标准 macOS 菜单栏 + 快捷键
7. `.md` 文件关联

### 验收
- 跑通 [02-mvp-features §验收 Demo 脚本](./02-mvp-features.md) 步骤 1–4、6
- 自己日常笔记完全切换到 markup（吃自己的狗粮 1 周不出严重问题）
- 安装包 < 20MB DMG
- 性能基线达标

## M2：完整 Typora 心流（估 3–4 周）

**目的**：补齐让 markup "感觉像 Typora" 的差异化体验。所有 P1 完成。

### 重点
1. Focus Mode + Typewriter Mode
2. 大纲面板 + 字数统计
3. **全 vault 搜索 + Quick Open + 命令面板**（这三件套是体验突破点）
4. 数学公式 + Mermaid
5. 主题切换
6. 图片粘贴 / 拖拽自动入库

### 验收
- 跑通完整 Demo 脚本
- Front-matter、脚注、表格编辑器都好用
- 主题切换无闪烁

## M3：分发就绪（估 2–3 周）

**目的**：第一个能给朋友用的版本。

### 工作项
1. P2 中的导出能力（PDF + HTML 至少要有）
2. 自动更新（Tauri updater）
3. 设置面板（字体、行宽、保存目录、图片入库目录、快捷键）
4. 错误处理 / 日志收集（让用户能贴日志）
5. 关于页 / 版本信息 / changelog
6. README + GitHub Release Notes 模板
7. Universal binary 构建脚本
8. CI（GitHub Action：Tauri build → 公证 → 签名 → 上传）

### 发布
- 第一个公开版本：`v0.1.0`
- 给 3–5 个早期用户内测
- 收一周反馈，bugfix → `v0.1.1`

## V1.0 之后的方向（不承诺时间）

- 段落锚点 / 段落引用
- [[wikilink]] 实质化（点击跳转、自动补全、未链接提示）
- 拼写检查
- 自定义 CSS 主题
- pandoc 集成（高级导出）
- 多窗口
- 大文件优化二期：Worker 解析、流式打开
- 插件 API 第一版

## 版本约定

- 用 SemVer
- 0.x 阶段允许 breaking change
- 1.0 = "我个人完全用 markup 取代了 Typora，且至少 5 个朋友也在用，没有数据丢失事故"

## 工作节奏建议

- 每个 milestone 起手画一个 sprint board（GitHub Projects）
- M0 spike 阶段强制写"通过 / 失败 / 实测数字"到 `docs/research/05-spike-results.md`
- M1 起每完成一个 P0 项打勾，定期回看是否在偏离目标
- 性能基线（启动 / 内存 / 输入延迟）做成 CI 的 `cargo bench`，回归时阻断合并

## 决策门

- **M0 完成 → 决定继续还是改栈**
- **M1 完成 → 决定 dogfood 1 周还是先去做 M2**
- **M2 完成 → 决定要不要做导出 / 上不上 GitHub**
- **M3 完成 → 决定要不要走 App Store 路线**
