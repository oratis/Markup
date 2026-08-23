# Markup v1.1.0 — 宽内容用上屏幕宽度、Mermaid 真的会画图、启动快一倍，外加首次的 Windows / Linux 安装包

## 📐 宽表格和长代码不再挤在正文列里

正文列宽是给**段落**的阅读量度，可宽内容一直被关在里面：一张 8 列的中文对比表，每格被挤成一行一两个字；屏幕两侧 60% 的空白闲着。

现在表格和代码块可以按需**出血**——对称地长出正文列，最多到窗格边缘留 32px，居中；实在放不下再横向滚动或折行。段落宽度**一点没变**。

- **表格列宽按内容分配**，不再平均分（Milkdown 默认主题给的是 `table-layout: fixed`，这才是"一字一行"的元凶）；每列有下限，中文不会再被压成一条竖线。
- **代码块**同理：1440px 窗口下，一行 380 字符的代码从 720px 折成 4 行，变成 1332px 折成 3 行。短代码块外观和以前**完全一致**。
- 引用块、列表项里的表格和代码块**不出血**——它们属于容器，不属于页面。顺带修掉一个刚发布的回归：引用块里放得下的小表格会凭空多出一条滚动条。

## 🧜 Mermaid 图现在真的会画出来

以前 README 写着 Read 模式会渲染 Mermaid，其实没有——图在应用里只是一段源码，只有导出的 HTML 才真渲染。现在补上了：

- ```mermaid 块在 **Read 和 Edit 里都渲染成 SVG**。
- 宽的图接上同一套出血系统：一张五节点的流程图在 1440px 窗口下能画到约 1000px，而不是被压进 720px。小图**不会**被拉伸，按自然尺寸居中。
- 跟随主题（Light / Dark / Sepia），切主题会重画。
- 图右上角悬停有「源码」按钮，一键看源码再切回来。改源码仍然走 ⌘/ 源码模式。
- **语法写错不会白屏**：降级显示源码加一行说明。

## ⚡ 启动时要解析的 JS 少了一半

打包配置里有一行把 mermaid 的 23 个懒加载块压成了一个 3.12 MB 的块，还被首屏静态依赖——占首屏 JS 的 63%，而它当时连图都不画。

修掉之后，加上这版真的开始渲染图：

| | 首屏 JS |
|---|---|
| v1.0.1 | 4.72 MiB |
| **v1.1.0** | **2.33 MiB** |

净减 **50.8%**。各图种（时序图、甘特图、架构图…）改成按需加载，只有真的用到才下载。

## 🪟🐧 首次提供 Windows 和 Linux 安装包

Markup 从这版开始在 Windows 和 Linux 上编译、运行、打包：

- **Windows**：`.exe`（NSIS 安装器）
- **Linux**：`.deb` 和 `.AppImage`
- 凭据存储按平台走原生后端（macOS 钥匙串 / Windows 凭据管理器 / Linux Secret Service）；无头 Linux 可以用 `MARKUP_TOKEN_FILE_FALLBACK=1` 退回到 `0600` 权限的令牌文件。
- 双击 `.md` 打开、单实例聚焦在 Win/Linux 上也接好了。

> ⚠️ **请先读这段。** 这两个平台的安装包是**未签名**的——Windows SmartScreen 会拦一下（"更多信息" → "仍要运行"），Linux 没有仓库签名。它们也**没有自动更新**：只有 macOS 版会自动升级，Win/Linux 需要手动下载新版。这是第一次发布，请当作**尝鲜版**用；macOS 版仍是主线。

## 🛠️ 其他

- 修好了 Mac App Store 用的 `.pkg` 签名脚本（`build-mas.sh` 在没有 `Frameworks` 目录时会中途退出）。
- CI 现在每个 PR 都会编译 Windows 和 Linux，防止 macOS-only 的改动再把它们弄坏。
- 新增产品站 [oratis.github.io/Markup](https://oratis.github.io/Markup)。

## 📦 Files

**macOS**（签名 + 公证，从 v0.6.1+ 自动更新）
- `Markup_1.1.0_apple-silicon.dmg` / `Markup_1.1.0_intel.dmg`
- `latest.json` + `.app.tar.gz`（自动更新用）
- `SHA256SUMS`

**Windows / Linux**（未签名，无自动更新）
- `Markup_1.1.0_x64-setup.exe`
- `Markup_1.1.0_amd64.deb` / `Markup_1.1.0_amd64.AppImage`
- `SHA256SUMS-desktop`

macOS 版签名 + 公证，从 v0.6.1+ 自动更新。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
