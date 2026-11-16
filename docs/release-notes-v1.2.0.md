# Markup v1.2.0 — Finder 打开文件修复与标签页批量管理

## Finder 打开新文件后，保持显示新文档

修复从 Finder 双击或「打开方式」打开 Markdown 文件时，新文档可能被上次会话中的旧文档覆盖的问题。现在恢复旧标签页会保留新打开文件的焦点，启动期间收到的文件打开请求也不会因监听尚未就绪而遗漏。

新增回归测试覆盖冷启动、会话延迟恢复、运行中连续打开文件、标签页切换，以及监听注册期间收到文件的情况。已在 macOS 上实际验证安装版的 Finder 连续双击和中文、空格文件名。

## 更方便地关闭多个标签页

- 使用 ⌘ 点击选择多个标签页、⇧ 点击选择连续范围，再用 ⌘W 关闭选中的一批。
- 标签页菜单新增「关闭左侧标签页」，⌘⌥W 可关闭其他标签页。
- 批量关闭前会检查未保存的改动并提示确认；固定标签页保留。

## 其他更新

- 更新编辑器、Tauri 和相关依赖。
- 加强 Windows / Linux 的 Rust 测试，以及浏览器回归测试的稳定性。

## 下载与更新

- Apple Silicon Mac：`Markup_1.2.0_apple-silicon.dmg`
- Intel Mac：`Markup_1.2.0_intel.dmg`
- macOS 自动更新通过 `latest.json` 与对应架构的 `.app.tar.gz` 提供。
- Windows / Linux 安装包仍为未签名版本，更新需手动下载。
- `SHA256SUMS` 和 `SHA256SUMS-desktop` 提供下载文件的校验值。

修复详情：[PR #264](https://github.com/oratis/Markup/pull/264)。
